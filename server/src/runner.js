import { spawn, execFile } from 'node:child_process';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { composeSystemPrompt, generateWorkspace, workflowDir } from './generator.js';

/**
 * Executes a workflow graph against the local `claude` CLI (subscription auth).
 * Loop support:
 *  - node.repeat = { count, until }  → self-loop: rerun node feeding its own
 *    output back, until `count` runs or output contains `until`.
 *  - edge.loop = true, edge.maxLoops, edge.until → back-edge: after the source
 *    node finishes, execution jumps back to the target and the segment reruns.
 */

const runs = new Map(); // runId -> { procs:Set, cancelled }

export function cancelRun(runId) {
  const run = runs.get(runId);
  if (!run) return false;
  run.cancelled = true;
  for (const proc of run.procs) killTree(proc.pid);
  return true;
}

function killTree(pid) {
  // /T kills the whole child tree; claude spawns helpers on Windows.
  execFile('taskkill', ['/pid', String(pid), '/T', '/F'], () => {});
}

function topoOrder(nodes, edges) {
  const forward = edges.filter((e) => !e.loop);
  const indeg = new Map(nodes.map((n) => [n.id, 0]));
  for (const e of forward) indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  const queue = nodes.filter((n) => indeg.get(n.id) === 0).map((n) => n.id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const e of forward.filter((e) => e.source === id)) {
      indeg.set(e.target, indeg.get(e.target) - 1);
      if (indeg.get(e.target) === 0) queue.push(e.target);
    }
  }
  if (order.length !== nodes.length) {
    throw new Error('Workflow has a cycle in non-loop edges. Mark back-edges as loop edges.');
  }
  return order;
}

function runClaudeOnce({ node, systemPrompt, taskPrompt, cwd, mcpConfig, run, emit }) {
  return new Promise((resolve, reject) => {
    const args = [
      '-p',
      '--output-format', 'stream-json',
      '--verbose',
      '--include-partial-messages',
      '--system-prompt', systemPrompt,
    ];
    if (node.model && node.model !== 'inherit') args.push('--model', node.model);
    if (node.tools?.length) args.push('--allowedTools', node.tools.join(','));
    if (node.permissionMode && node.permissionMode !== 'default') {
      args.push('--permission-mode', node.permissionMode);
    }
    if (node.maxTurns) args.push('--max-turns', String(node.maxTurns));
    if (mcpConfig) args.push('--mcp-config', mcpConfig);

    const proc = spawn('claude', args, { cwd, windowsHide: true });
    run.procs.add(proc);

    proc.stdin.write(taskPrompt);
    proc.stdin.end();

    let resultText = '';
    let usage = null;
    let stderr = '';
    let buffer = '';

    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        let ev;
        try {
          ev = JSON.parse(line);
        } catch {
          continue;
        }
        if (ev.type === 'stream_event') {
          const delta = ev.event?.delta;
          if (delta?.type === 'text_delta' && delta.text) {
            emit({ type: 'node_text', nodeId: node.id, text: delta.text });
          }
        } else if (ev.type === 'assistant') {
          for (const block of ev.message?.content ?? []) {
            if (block.type === 'tool_use') {
              emit({ type: 'node_tool', nodeId: node.id, tool: block.name });
            }
          }
        } else if (ev.type === 'result') {
          resultText = ev.result ?? '';
          usage = ev.usage ?? null;
          if (ev.subtype && ev.subtype !== 'success') {
            stderr += `\nresult subtype: ${ev.subtype}`;
          }
        }
      }
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    proc.on('error', (err) => {
      run.procs.delete(proc);
      reject(new Error(`Failed to spawn claude: ${err.message}`));
    });

    proc.on('close', (code) => {
      run.procs.delete(proc);
      if (run.cancelled) return reject(new Error('cancelled'));
      if (code !== 0) {
        return reject(new Error(`claude exited ${code}: ${stderr.slice(0, 2000)}`));
      }
      resolve({ result: resultText, usage });
    });
  });
}

export function startRun({ workflow, skills, prompt, emit }) {
  const runId = randomUUID();
  const run = { procs: new Set(), cancelled: false };
  runs.set(runId, run);

  (async () => {
    try {
      const { dir } = generateWorkspace(workflow, skills);
      fs.mkdirSync(dir, { recursive: true });

      const order = topoOrder(workflow.nodes, workflow.edges);
      const nodeById = new Map(workflow.nodes.map((n) => [n.id, n]));
      const outputs = new Map(); // nodeId -> last result text
      const loopEdges = workflow.edges.filter((e) => e.loop);
      const loopCounts = new Map();

      let i = 0;
      while (i < order.length) {
        if (run.cancelled) throw new Error('cancelled');
        const node = nodeById.get(order[i]);
        emit({ type: 'node_status', nodeId: node.id, status: 'running' });

        const upstream = workflow.edges
          .filter((e) => !e.loop && e.target === node.id && outputs.has(e.source))
          .map((e) => {
            const src = nodeById.get(e.source);
            return `## Output from ${src.name}\n${outputs.get(e.source)}`;
          });

        const systemPrompt = composeSystemPrompt(node, skills);
        const repeat = node.repeat || {};
        const maxRepeats = Math.max(1, Math.min(Number(repeat.count) || 1, 25));
        let result = null;

        for (let r = 0; r < maxRepeats; r++) {
          if (run.cancelled) throw new Error('cancelled');
          if (r > 0) {
            emit({
              type: 'node_status',
              nodeId: node.id,
              status: 'running',
              detail: `repeat ${r + 1}/${maxRepeats}`,
            });
          }
          const parts = [prompt];
          if (upstream.length) parts.push(upstream.join('\n\n'));
          if (r > 0 && result) {
            parts.push(`## Your previous attempt (iteration ${r})\n${result.result}\n\nImprove on it.`);
          }
          result = await runClaudeOnce({
            node,
            systemPrompt,
            taskPrompt: parts.join('\n\n'),
            cwd: dir,
            mcpConfig: workflow.mcpConfig || null,
            run,
            emit,
          });
          emit({ type: 'node_usage', nodeId: node.id, usage: result.usage });
          if (repeat.until && result.result.includes(repeat.until)) break;
        }

        outputs.set(node.id, result.result);
        emit({ type: 'node_status', nodeId: node.id, status: 'done' });
        emit({ type: 'node_result', nodeId: node.id, result: result.result });

        // Back-edge: jump execution back to an earlier node in the order.
        const back = loopEdges.find((e) => e.source === node.id);
        if (back) {
          const used = loopCounts.get(back.id) ?? 0;
          const max = Math.max(1, Math.min(Number(back.maxLoops) || 1, 25));
          const untilHit = back.until && outputs.get(node.id)?.includes(back.until);
          const targetIdx = order.indexOf(back.target);
          if (!untilHit && used < max && targetIdx >= 0) {
            loopCounts.set(back.id, used + 1);
            emit({
              type: 'loop',
              edgeId: back.id,
              iteration: used + 1,
              max,
            });
            i = targetIdx;
            continue;
          }
        }
        i++;
      }

      emit({ type: 'run_done', runId });
    } catch (err) {
      if (err.message === 'cancelled') {
        for (const node of workflow.nodes) {
          emit({ type: 'node_status', nodeId: node.id, status: 'idle' });
        }
        emit({ type: 'run_cancelled', runId });
      } else {
        emit({ type: 'run_error', runId, error: err.message });
      }
    } finally {
      runs.delete(runId);
    }
  })();

  return runId;
}

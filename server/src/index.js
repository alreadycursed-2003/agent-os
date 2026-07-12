import express from 'express';
import cors from 'cors';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { store } from './store.js';
import { generateWorkspace, WORKSPACE_ROOT } from './generator.js';
import { startRun, cancelRun } from './runner.js';
import { claude } from './cli.js';

const PORT = 4001;
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(event) {
  const msg = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

// ---- skills ----
app.get('/api/skills', (_req, res) => res.json(store.listSkills()));

app.post('/api/skills', (req, res) => {
  const { name, description = '', instructions = '' } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name required' });
  res.json(store.upsertSkill({ name, description, instructions }));
});

app.delete('/api/skills/:name', (req, res) => {
  store.deleteSkill(req.params.name);
  res.json({ ok: true });
});

// ---- workflows ----
app.get('/api/workflows', (_req, res) => res.json(store.listWorkflows()));

app.get('/api/workflows/:id', (req, res) => {
  const w = store.getWorkflow(req.params.id);
  if (!w) return res.status(404).json({ error: 'not found' });
  res.json(w);
});

app.post('/api/workflows', (req, res) => {
  const w = req.body;
  if (!w?.id) return res.status(400).json({ error: 'id required' });
  w.nodes ??= [];
  w.edges ??= [];
  res.json(store.upsertWorkflow(w));
});

app.delete('/api/workflows/:id', (req, res) => {
  store.deleteWorkflow(req.params.id);
  res.json({ ok: true });
});

app.post('/api/workflows/:id/generate', (req, res) => {
  const w = store.getWorkflow(req.params.id);
  if (!w) return res.status(404).json({ error: 'not found' });
  try {
    res.json(generateWorkspace(w, store.listSkills()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- runs ----
app.post('/api/workflows/:id/run', (req, res) => {
  const w = store.getWorkflow(req.params.id);
  if (!w) return res.status(404).json({ error: 'not found' });
  if (!w.nodes.length) return res.status(400).json({ error: 'workflow has no agents' });
  const prompt = req.body?.prompt || 'Do your job.';
  try {
    const runId = startRun({
      workflow: w,
      skills: store.listSkills(),
      prompt,
      emit: (ev) => {
        if (ev.type === 'node_usage' && ev.usage) {
          store.appendUsage({
            ts: Date.now(),
            workflowId: w.id,
            node: ev.name ?? ev.nodeId,
            model: ev.model ?? 'inherit',
            input: ev.usage.input_tokens ?? 0,
            output: ev.usage.output_tokens ?? 0,
          });
        }
        broadcast({ ...ev, workflowId: w.id });
      },
    });
    res.json({ runId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/runs/:runId/cancel', (req, res) => {
  res.json({ cancelled: cancelRun(req.params.runId) });
});

// ---- usage ----
app.get('/api/usage', (_req, res) => res.json(store.listUsage()));

// ---- claude CLI bridges (user's own machine + login) ----
app.get('/api/status', async (_req, res) => {
  const v = await claude(['--version'], 20000);
  res.json({
    claude: (v.stdout || v.stderr).trim() || 'claude CLI not found on PATH',
    claudeOk: v.ok,
    node: process.version,
    platform: `${process.platform} ${os.release()}`,
    settingsPath: path.join(os.homedir(), '.claude', 'settings.json'),
    workspace: WORKSPACE_ROOT,
  });
});

app.get('/api/mcp', async (_req, res) => {
  const r = await claude(['mcp', 'list']);
  res.json(r);
});

app.post('/api/mcp/add', async (req, res) => {
  const { name, transport = 'stdio', target = '', args = [] } = req.body ?? {};
  if (!name || !target) return res.status(400).json({ error: 'name and target required' });
  const cmd =
    transport === 'stdio'
      ? ['mcp', 'add', name, '--', target, ...args]
      : ['mcp', 'add', '--transport', transport, name, target];
  res.json(await claude(cmd));
});

app.delete('/api/mcp/:name', async (req, res) => {
  res.json(await claude(['mcp', 'remove', req.params.name]));
});

app.get('/api/plugins', async (_req, res) => {
  const plugins = await claude(['plugin', 'list']);
  const marketplaces = await claude(['plugin', 'marketplace', 'list']);
  res.json({ plugins, marketplaces });
});

app.post('/api/plugins/marketplace', async (req, res) => {
  const { repo } = req.body ?? {};
  if (!repo) return res.status(400).json({ error: 'repo required' });
  res.json(await claude(['plugin', 'marketplace', 'add', repo], 120000));
});

app.post('/api/plugins/install', async (req, res) => {
  const { plugin } = req.body ?? {};
  if (!plugin) return res.status(400).json({ error: 'plugin required' });
  res.json(await claude(['plugin', 'install', plugin], 120000));
});

app.post('/api/plugins/uninstall', async (req, res) => {
  const { plugin } = req.body ?? {};
  if (!plugin) return res.status(400).json({ error: 'plugin required' });
  res.json(await claude(['plugin', 'uninstall', plugin], 120000));
});

// ---- agent definitions on disk ----
function readAgentDir(dir, scope) {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => ({
        scope,
        name: f.replace(/\.md$/, ''),
        file: path.join(dir, f),
        content: fs.readFileSync(path.join(dir, f), 'utf8'),
      }));
  } catch {
    return [];
  }
}

app.get('/api/claude-agents', (_req, res) => {
  const global = readAgentDir(path.join(os.homedir(), '.claude', 'agents'), 'global');
  const generated = [];
  try {
    for (const wf of fs.readdirSync(WORKSPACE_ROOT)) {
      generated.push(
        ...readAgentDir(path.join(WORKSPACE_ROOT, wf, '.claude', 'agents'), `workspace/${wf}`)
      );
    }
  } catch {
    /* no workspace yet */
  }
  res.json([...global, ...generated]);
});

// ---- global settings.json ----
const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

app.get('/api/settings', (_req, res) => {
  try {
    res.json({ path: SETTINGS_PATH, content: fs.readFileSync(SETTINGS_PATH, 'utf8') });
  } catch {
    res.json({ path: SETTINGS_PATH, content: '' });
  }
});

app.put('/api/settings', (req, res) => {
  const { content } = req.body ?? {};
  try {
    JSON.parse(content);
  } catch (err) {
    return res.status(400).json({ error: `Invalid JSON: ${err.message}` });
  }
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      fs.copyFileSync(SETTINGS_PATH, SETTINGS_PATH + '.bak');
    }
    fs.writeFileSync(SETTINGS_PATH, content, 'utf8');
    res.json({ ok: true, backup: SETTINGS_PATH + '.bak' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Agent OS server on http://localhost:${PORT}`);
});

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const WORKSPACE_ROOT = path.join(__dirname, '..', '..', 'workspace');

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'agent';

export function workflowDir(workflowId) {
  return path.join(WORKSPACE_ROOT, slug(workflowId));
}

/**
 * Materialize a workflow into a Claude Code project directory:
 *   workspace/<id>/.claude/agents/<agent>.md
 *   workspace/<id>/.claude/skills/<skill>/SKILL.md
 * Returns list of written file paths.
 */
export function generateWorkspace(workflow, skills) {
  const dir = workflowDir(workflow.id);
  const agentsDir = path.join(dir, '.claude', 'agents');
  const skillsDir = path.join(dir, '.claude', 'skills');
  fs.rmSync(agentsDir, { recursive: true, force: true });
  fs.rmSync(skillsDir, { recursive: true, force: true });
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });

  const written = [];
  const skillMap = new Map(skills.map((s) => [s.name, s]));

  for (const node of workflow.nodes) {
    const front = [
      '---',
      `name: ${slug(node.name)}`,
      `description: ${node.description || node.name}`,
      node.model && node.model !== 'inherit' ? `model: ${node.model}` : null,
      node.tools?.length ? `tools: ${node.tools.join(', ')}` : null,
      '---',
    ].filter(Boolean);
    const body = [node.prompt || 'You are a helpful agent.'];
    const attached = (node.skills || []).map((n) => skillMap.get(n)).filter(Boolean);
    if (attached.length) {
      body.push('\n## Skills\n');
      for (const s of attached) {
        body.push(`### ${s.name}\n${s.instructions}\n`);
      }
    }
    const file = path.join(agentsDir, `${slug(node.name)}.md`);
    fs.writeFileSync(file, `${front.join('\n')}\n\n${body.join('\n')}`, 'utf8');
    written.push(file);
  }

  for (const s of skills) {
    const sDir = path.join(skillsDir, slug(s.name));
    fs.mkdirSync(sDir, { recursive: true });
    const file = path.join(sDir, 'SKILL.md');
    fs.writeFileSync(
      file,
      `---\nname: ${slug(s.name)}\ndescription: ${s.description || s.name}\n---\n\n${s.instructions}\n`,
      'utf8'
    );
    written.push(file);
  }

  return { dir, written };
}

/** Compose the system prompt actually sent to claude for one node. */
export function composeSystemPrompt(node, skills) {
  const skillMap = new Map(skills.map((s) => [s.name, s]));
  const parts = [node.prompt || 'You are a helpful agent.'];
  const attached = (node.skills || []).map((n) => skillMap.get(n)).filter(Boolean);
  if (attached.length) {
    parts.push('\nYou have the following skills. Apply them when relevant:');
    for (const s of attached) {
      parts.push(`\n## Skill: ${s.name}\n${s.instructions}`);
    }
  }
  return parts.join('\n');
}

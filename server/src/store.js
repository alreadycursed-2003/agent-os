import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const FILES = {
  workflows: path.join(DATA_DIR, 'workflows.json'),
  skills: path.join(DATA_DIR, 'skills.json'),
  usage: path.join(DATA_DIR, 'usage.json'),
};

fs.mkdirSync(DATA_DIR, { recursive: true });

function load(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(`Failed to read ${file}:`, err.message);
    return fallback;
  }
}

function save(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

export const store = {
  listWorkflows() {
    return load(FILES.workflows, []);
  },
  getWorkflow(id) {
    return this.listWorkflows().find((w) => w.id === id) ?? null;
  },
  upsertWorkflow(workflow) {
    const all = this.listWorkflows();
    const i = all.findIndex((w) => w.id === workflow.id);
    if (i >= 0) all[i] = workflow;
    else all.push(workflow);
    save(FILES.workflows, all);
    return workflow;
  },
  deleteWorkflow(id) {
    save(FILES.workflows, this.listWorkflows().filter((w) => w.id !== id));
  },

  listSkills() {
    return load(FILES.skills, []);
  },
  upsertSkill(skill) {
    const all = this.listSkills();
    const i = all.findIndex((s) => s.name === skill.name);
    if (i >= 0) all[i] = skill;
    else all.push(skill);
    save(FILES.skills, all);
    return skill;
  },
  deleteSkill(name) {
    save(FILES.skills, this.listSkills().filter((s) => s.name !== name));
  },

  listUsage() {
    return load(FILES.usage, []);
  },
  appendUsage(record) {
    const all = load(FILES.usage, []);
    all.push(record);
    save(FILES.usage, all.slice(-1000));
  },
};

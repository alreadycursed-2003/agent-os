import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { store } from './store.js';
import { generateWorkspace } from './generator.js';
import { startRun, cancelRun } from './runner.js';

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
      emit: (ev) => broadcast({ ...ev, workflowId: w.id }),
    });
    res.json({ runId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/runs/:runId/cancel', (req, res) => {
  res.json({ cancelled: cancelRun(req.params.runId) });
});

server.listen(PORT, () => {
  console.log(`Agent OS server on http://localhost:${PORT}`);
});

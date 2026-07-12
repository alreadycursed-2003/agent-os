// End-to-end smoke test: seed skill + 2-node chain workflow, run it,
// collect WebSocket events, assert both nodes stream and finish in order.
import WebSocket from 'ws';

const BASE = 'http://localhost:4001';
const post = (p, body) =>
  fetch(BASE + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(async (r) => {
    if (!r.ok) throw new Error(`${p} -> ${r.status}: ${await r.text()}`);
    return r.json();
  });

await post('/api/skills', {
  name: 'brevity',
  description: 'Answer in as few words as possible',
  instructions: 'Always answer in a single short sentence. No preamble.',
});

await post('/api/workflows', {
  id: 'smoke',
  name: 'Smoke',
  nodes: [
    {
      id: 'n1',
      name: 'SCOUT',
      avatar: '🛰️',
      description: 'finds a fact',
      prompt: 'You state one interesting fact about the given topic. Text only, no tools.',
      model: 'haiku',
      tools: [],
      permissionMode: 'default',
      skills: ['brevity'],
      repeat: { count: 1, until: '' },
      position: { x: 0, y: 0 },
    },
    {
      id: 'n2',
      name: 'POET',
      avatar: '🧙',
      description: 'writes verse',
      prompt: 'You turn the input fact into a two-line rhyme. Text only, no tools.',
      model: 'haiku',
      tools: [],
      permissionMode: 'default',
      skills: [],
      repeat: { count: 1, until: '' },
      position: { x: 300, y: 0 },
    },
  ],
  edges: [{ id: 'e1', source: 'n1', target: 'n2', loop: false }],
});

const events = [];
const ws = new WebSocket('ws://localhost:4001/ws');
await new Promise((res, rej) => {
  ws.on('open', res);
  ws.on('error', rej);
});
ws.on('message', (m) => events.push(JSON.parse(m.toString())));

const { runId } = await post('/api/workflows/smoke/run', { prompt: 'Topic: the Moon.' });
console.log('runId', runId);

await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('timeout waiting for run_done')), 300000);
  ws.on('message', (m) => {
    const ev = JSON.parse(m.toString());
    if (ev.type === 'run_done') { clearTimeout(t); res(); }
    if (ev.type === 'run_error') { clearTimeout(t); rej(new Error('run_error: ' + ev.error)); }
  });
});

const statuses = events.filter((e) => e.type === 'node_status').map((e) => `${e.nodeId}:${e.status}`);
const results = events.filter((e) => e.type === 'node_result');
const textEvents = events.filter((e) => e.type === 'node_text').length;
console.log('status sequence:', statuses.join(' -> '));
console.log('text stream events:', textEvents);
for (const r of results) console.log(`\n=== ${r.nodeId} result ===\n${r.result}`);

const ok =
  statuses.join(',').includes('n1:running') &&
  statuses.join(',').includes('n2:running') &&
  results.length === 2 &&
  statuses.indexOf('n1:done') < statuses.indexOf('n2:running');
console.log(ok ? '\nSMOKE PASS' : '\nSMOKE FAIL');
ws.close();
process.exit(ok ? 0 : 1);

# ⬢ Agent OS — Squad Builder

Drag-and-drop GUI for building and running multi-agent workflows on **Claude Code with a Pro subscription — no API key**. Every agent is a card on a game-style canvas: give it a prompt, a model, tools, skills, loops — wire cards together and hit **▶ RUN**.

## Status

**Working end-to-end** (smoke-tested: 2-agent chain ran live through the `claude` CLI on subscription auth).

Done:
- 🎮 Game-style canvas UI (React Flow): recruit agents, drag skill chips onto agent cards, wire edges
- 🤖 Per-agent config: system prompt, model (auto/sonnet/opus/haiku), allowed tools, permission mode, max turns
- ⚡ Skill forge: create/edit skills, equip per agent (inlined into system prompt + exported as `.claude/skills/`)
- 🔁 Loops: self-loop per agent (repeat ×N, stop-when-output-contains) and loop-back edges between agents (max loops + until-condition)
- 🛰️ MCP config (JSON) passed to every agent run
- ▤ Mission Log: live token streaming per agent, tool-use events, usage stats, abort button
- ⚒ Forge Files: exports the canvas as a real Claude Code project (`workspace/<id>/.claude/agents/*.md` + `.claude/skills/*/SKILL.md`)
- 💾 Autosave: canvas persists to `server/data/` (gitignored)

Not yet:
- Multiple workflows in the UI (server supports it; UI pins workflow `main`)
- Parallel branch execution (sequential by design — Pro usage window)
- Session resume per agent, hooks editor

## Requirements

- Node.js 20+
- [Claude Code CLI](https://code.claude.com) installed and logged in with your Pro/Max subscription (`claude` on PATH — run `claude login` once)

## Run it

```bash
# terminal 1 — backend (port 4001)
cd server
npm install
npm start

# terminal 2 — UI (port 5173)
cd web
npm install
npm run dev
```

Open http://localhost:5173

1. **+ RECRUIT AGENT** → type its system prompt on the card, click the avatar/model badge to cycle
2. **+ Forge Skill** in the right dock → drag the chip onto an agent card to equip
3. Drag from an agent's right handle to another's left handle to chain them (downstream agents receive upstream output)
4. Select a card/edge for advanced config (tools, permission mode, loops)
5. Type the mission in the top bar → **▶ RUN** → watch the Mission Log stream

## Smoke test

With the backend running:

```bash
cd server
node smoke.mjs   # seeds a 2-agent chain, runs it live, asserts order + streaming
```

## How it works

```
Browser (React + React Flow)
   │ REST + WebSocket
Node backend (Express + ws)
   │ spawns per agent-node
claude -p --output-format stream-json --system-prompt … --allowedTools … --model …
   (your Pro subscription login — no API key anywhere)
```

The executor walks the graph topologically, runs each agent as a headless Claude Code call in the workflow's workspace dir, pipes results downstream, and honors self-loops and loop-back edges (capped at 25 iterations).

> **Note:** personal tool for your own machine/account. Subscription auth must not back a multi-user or resold service. Runs consume your Pro usage window — agents execute sequentially for that reason.

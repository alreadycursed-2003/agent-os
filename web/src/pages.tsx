import { useCallback, useEffect, useState } from 'react'
import type { SquadTemplate } from './templates'

interface CliResult {
  ok: boolean
  code: number
  stdout: string
  stderr: string
}

const j = async (r: Response) => {
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? `${r.status}`)
  return r.json()
}
const get = (p: string) => fetch(p).then(j)
const send = (p: string, method: string, body?: unknown) =>
  fetch(p, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).then(j)

function CliOut({ r }: { r: CliResult | null }) {
  if (!r) return null
  const text = [r.stdout, r.stderr].filter(Boolean).join('\n').trim()
  return <pre className="console">{text || (r.ok ? 'Done.' : `exit code ${r.code}`)}</pre>
}

// ---------------- Usage ----------------

interface UsageRow {
  ts: number
  workflowId: string
  node: string
  model: string
  input: number
  output: number
}

export function UsagePage() {
  const [rows, setRows] = useState<UsageRow[]>([])
  const load = useCallback(() => {
    get('/api/usage').then(setRows).catch(() => {})
  }, [])
  useEffect(load, [load])

  const dayStart = new Date().setHours(0, 0, 0, 0)
  const today = rows.filter((r) => r.ts >= dayStart)
  const sum = (xs: UsageRow[], k: 'input' | 'output') => xs.reduce((a, r) => a + r[k], 0)

  return (
    <div className="page">
      <h1>Usage</h1>
      <p className="sub">
        Tokens recorded from missions run through this app. Your Pro plan shares one usage window
        across everything Claude Code does — check <code>/usage</code> inside the Claude Code
        terminal for the official meter.
      </p>
      <div className="stat-row">
        <div className="stat">
          <div className="v">{today.length}</div>
          <div className="k">agent runs today</div>
        </div>
        <div className="stat">
          <div className="v">{sum(today, 'input').toLocaleString()}</div>
          <div className="k">input tokens today</div>
        </div>
        <div className="stat">
          <div className="v">{sum(today, 'output').toLocaleString()}</div>
          <div className="k">output tokens today</div>
        </div>
        <div className="stat">
          <div className="v">{(sum(rows, 'input') + sum(rows, 'output')).toLocaleString()}</div>
          <div className="k">total tokens (all time)</div>
        </div>
      </div>
      <button className="btn" onClick={load}>Refresh</button>
      <section style={{ marginTop: 18 }}>
        {rows.length === 0 ? (
          <div className="empty-hint">
            <strong>No runs recorded yet.</strong> Launch a mission from the Canvas tab and each
            agent's token usage will land here.
          </div>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>When</th>
                <th>Workflow</th>
                <th>Agent</th>
                <th>Model</th>
                <th className="num">In</th>
                <th className="num">Out</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().slice(0, 50).map((r, i) => (
                <tr key={i}>
                  <td>{new Date(r.ts).toLocaleString()}</td>
                  <td>{r.workflowId}</td>
                  <td>{r.node}</td>
                  <td>{r.model}</td>
                  <td className="num">{r.input.toLocaleString()}</td>
                  <td className="num">{r.output.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

// ---------------- MCP ----------------

export function McpPage() {
  const [list, setList] = useState<CliResult | null>(null)
  const [action, setAction] = useState<CliResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [transport, setTransport] = useState('stdio')
  const [target, setTarget] = useState('')

  const load = useCallback(() => {
    get('/api/mcp').then(setList).catch(() => {})
  }, [])
  useEffect(load, [load])

  const run = async (fn: () => Promise<CliResult>) => {
    setBusy(true)
    try {
      setAction(await fn())
      load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <h1>MCP servers</h1>
      <p className="sub">
        Manage the MCP servers registered with your local Claude Code (runs <code>claude mcp</code>{' '}
        on this machine). Servers added here are available to every agent.
      </p>
      <section>
        <h3>Registered servers</h3>
        <CliOut r={list} />
        <button className="btn" style={{ marginTop: 8 }} onClick={load}>Refresh</button>
      </section>
      <section>
        <h3>Add a server</h3>
        <div className="form-row">
          <div>
            <label>Name</label>
            <input value={name} placeholder="github" onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label>Transport</label>
            <select value={transport} onChange={(e) => setTransport(e.target.value)}>
              <option value="stdio">stdio (command)</option>
              <option value="http">http (url)</option>
              <option value="sse">sse (url)</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>{transport === 'stdio' ? 'Command (with args)' : 'URL'}</label>
            <input
              value={target}
              style={{ width: '100%' }}
              placeholder={transport === 'stdio' ? 'npx -y @some/mcp-server' : 'https://…/mcp'}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
          <button
            className="btn btn-run"
            disabled={busy || !name || !target}
            onClick={() => {
              const parts = target.trim().split(/\s+/)
              return run(() =>
                send('/api/mcp/add', 'POST', {
                  name,
                  transport,
                  target: transport === 'stdio' ? parts[0] : target.trim(),
                  args: transport === 'stdio' ? parts.slice(1) : [],
                })
              )
            }}
          >
            Add
          </button>
          <button
            className="btn btn-stop"
            disabled={busy || !name}
            onClick={() => run(() => send(`/api/mcp/${encodeURIComponent(name)}`, 'DELETE'))}
          >
            Remove
          </button>
        </div>
        <CliOut r={action} />
      </section>
    </div>
  )
}

// ---------------- Plugins ----------------

interface Preset {
  repo: string
  name: string
  title: string
  blurb: string
  added: boolean
}

interface CatalogPlugin {
  name: string
  description: string
  category: string
}

function MarketplaceCard({
  m,
  onAction,
  refresh,
}: {
  m: Preset
  onAction: (r: CliResult) => void
  refresh: () => void
}) {
  const [open, setOpen] = useState(false)
  const [plugins, setPlugins] = useState<CatalogPlugin[] | null>(null)
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const toggle = () => {
    setOpen(!open)
    if (!plugins) {
      get(`/api/marketplaces/catalog?repo=${encodeURIComponent(m.repo)}`)
        .then((c) => setPlugins(c.plugins))
        .catch(() => setPlugins([]))
    }
  }

  const install = async (p: CatalogPlugin) => {
    setBusy(p.name)
    try {
      onAction(
        await send('/api/plugins/install', 'POST', {
          plugin: `${p.name}@${m.name}`,
          ensureRepo: m.repo,
        })
      )
      refresh()
    } finally {
      setBusy(null)
    }
  }

  const q = filter.toLowerCase()
  const visible = (plugins ?? []).filter(
    (p) => !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
  )

  return (
    <div className="mkt-card">
      <div className="mkt-head" onClick={toggle}>
        <div>
          <div className="mkt-title">
            {m.title} {m.added && <span className="note-ok">● added</span>}
          </div>
          <div className="mkt-blurb">
            {m.blurb} · <code>{m.repo}</code>
          </div>
        </div>
        <span className="mkt-caret">{open ? '▾' : '▸'}</span>
      </div>
      {open && (
        <div className="mkt-body">
          {plugins === null && <div className="dock-empty">Loading catalog…</div>}
          {plugins?.length === 0 && <div className="dock-empty">Could not load this catalog.</div>}
          {plugins && plugins.length > 0 && (
            <>
              <input
                className="mkt-search"
                placeholder={`Search ${plugins.length} plugins…`}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <div className="mkt-list">
                {visible.slice(0, 60).map((p) => (
                  <div key={p.name} className="mkt-plugin">
                    <div style={{ minWidth: 0 }}>
                      <div className="p-name">
                        {p.name} {p.category && <span className="p-cat">{p.category}</span>}
                      </div>
                      <div className="p-desc">{p.description || '—'}</div>
                    </div>
                    <button
                      className="btn"
                      disabled={busy !== null}
                      onClick={() => install(p)}
                    >
                      {busy === p.name ? 'Installing…' : 'Install'}
                    </button>
                  </div>
                ))}
                {visible.length > 60 && (
                  <div className="dock-empty" style={{ padding: 8 }}>
                    {visible.length - 60} more — refine the search.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function PluginsPage() {
  const [presets, setPresets] = useState<Preset[]>([])
  const [installed, setInstalled] = useState<CliResult | null>(null)
  const [action, setAction] = useState<CliResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [repo, setRepo] = useState('')
  const [plugin, setPlugin] = useState('')

  const load = useCallback(() => {
    get('/api/marketplaces').then((r) => setPresets(r.presets)).catch(() => {})
    get('/api/plugins').then((r) => setInstalled(r.plugins)).catch(() => {})
  }, [])
  useEffect(load, [load])

  const run = async (fn: () => Promise<CliResult>) => {
    setBusy(true)
    try {
      setAction(await fn())
      load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <h1>Plugins</h1>
      <p className="sub">
        Browse marketplaces, see every plugin and skill pack they carry, and install with one
        click — same as <code>/plugin</code> inside Claude Code, applied to your whole machine.
      </p>

      <section>
        <h3>Marketplace catalog</h3>
        {presets.map((m) => (
          <MarketplaceCard key={m.repo} m={m} onAction={setAction} refresh={load} />
        ))}
        <CliOut r={action} />
      </section>

      <section>
        <h3>Installed plugins</h3>
        <CliOut r={installed} />
        <button className="btn" style={{ marginTop: 8 }} onClick={load}>Refresh</button>
      </section>

      <section>
        <h3>Manual</h3>
        <div className="form-row">
          <div style={{ flex: 1 }}>
            <label>Add marketplace (GitHub repo or URL)</label>
            <input
              value={repo}
              style={{ width: '100%' }}
              placeholder="owner/repo"
              onChange={(e) => setRepo(e.target.value)}
            />
          </div>
          <button
            className="btn btn-run"
            disabled={busy || !repo}
            onClick={() => run(() => send('/api/plugins/marketplace', 'POST', { repo }))}
          >
            Add
          </button>
        </div>
        <div className="form-row">
          <div style={{ flex: 1 }}>
            <label>Install / uninstall by name (name@marketplace)</label>
            <input
              value={plugin}
              style={{ width: '100%' }}
              placeholder="my-plugin@marketplace-name"
              onChange={(e) => setPlugin(e.target.value)}
            />
          </div>
          <button
            className="btn btn-run"
            disabled={busy || !plugin}
            onClick={() => run(() => send('/api/plugins/install', 'POST', { plugin }))}
          >
            Install
          </button>
          <button
            className="btn btn-stop"
            disabled={busy || !plugin}
            onClick={() => run(() => send('/api/plugins/uninstall', 'POST', { plugin }))}
          >
            Uninstall
          </button>
        </div>
      </section>
    </div>
  )
}

// ---------------- Agents on disk ----------------

interface AgentDef {
  scope: string
  name: string
  file: string
  content: string
}

export function AgentsPage() {
  const [agents, setAgents] = useState<AgentDef[]>([])
  useEffect(() => {
    get('/api/claude-agents').then(setAgents).catch(() => {})
  }, [])

  const groups = new Map<string, AgentDef[]>()
  for (const a of agents) {
    groups.set(a.scope, [...(groups.get(a.scope) ?? []), a])
  }

  return (
    <div className="page">
      <h1>Agent definitions</h1>
      <p className="sub">
        Subagent files Claude Code can see: your global <code>~/.claude/agents</code> plus the
        files this app generates from the canvas (Forge Files / Run).
      </p>
      {agents.length === 0 && (
        <div className="empty-hint">
          <strong>Nothing here yet.</strong> Hit ⚒ Forge Files on the Canvas tab to export your
          squad as real <code>.claude/agents/*.md</code> definitions, or drop files into{' '}
          <code>~/.claude/agents</code>.
        </div>
      )}
      {[...groups.entries()].map(([scope, defs]) => (
        <section key={scope}>
          <h3>{scope}</h3>
          {defs.map((a) => (
            <details key={a.file} className="agent-def">
              <summary>
                {a.name} <span className="scope">{a.file}</span>
              </summary>
              <pre className="console">{a.content}</pre>
            </details>
          ))}
        </section>
      ))}
    </div>
  )
}

// ---------------- Squad templates (Council / Org) ----------------

export function TemplatePage({
  t,
  onDeploy,
}: {
  t: SquadTemplate
  onDeploy: (t: SquadTemplate) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  const deploy = async () => {
    setBusy(true)
    try {
      await onDeploy(t)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <h1>{t.title}</h1>
      <p className="sub">{t.tagline}</p>
      <div className="tmpl-actions">
        <button className="btn btn-run" disabled={busy} onClick={deploy}>
          {busy ? 'Deploying…' : `Deploy ${t.title} to canvas`}
        </button>
        <span className="dock-empty">
          Creates the “{t.id}” workflow (overwrites it if it exists) and opens it on the Canvas —
          every member stays fully editable there.
        </span>
      </div>
      <section>
        <h3>How it runs</h3>
        <p className="sub" style={{ marginBottom: 0 }}>{t.how}</p>
      </section>
      <section>
        <h3>Members</h3>
        <div className="tmpl-grid">
          {t.nodes.map((n) => (
            <div key={n.id} className="tmpl-card">
              <div className="tmpl-head">
                <span className="tmpl-avatar">{n.data.avatar}</span>
                <div>
                  <div className="tmpl-name">{n.data.name}</div>
                  <div className="tmpl-role">{n.role}</div>
                </div>
              </div>
              <p className="tmpl-prompt">{n.data.prompt}</p>
              <div className="tmpl-meta">
                {n.data.tools.length ? `tools: ${n.data.tools.join(', ')}` : 'no tools — pure reasoning'}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3>Chain of command</h3>
        <pre className="console">
          {t.edges
            .map((e) => {
              const s = t.nodes.find((n) => n.id === e.source)?.data.name
              const d = t.nodes.find((n) => n.id === e.target)?.data.name
              return e.loop ? `${s} ⟲ ${d}  (loop ×${e.maxLoops}${e.until ? ` until "${e.until}"` : ''})` : `${s} → ${d}`
            })
            .join('\n')}
        </pre>
      </section>
    </div>
  )
}

// ---------------- Settings ----------------

/* eslint-disable @typescript-eslint/no-explicit-any */
export function SettingsPage() {
  const [path, setPath] = useState('')
  const [obj, setObj] = useState<any>(null)
  const [raw, setRaw] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    get('/api/settings').then((r) => {
      setPath(r.path)
      let parsed: any = {}
      try {
        parsed = JSON.parse(r.content || '{}')
      } catch {
        setMsg({ ok: false, text: 'Existing file is not valid JSON — fix it in Advanced below.' })
      }
      setObj(parsed)
      setRaw(JSON.stringify(parsed, null, 2))
    })
  }, [])

  const patch = (fn: (o: any) => void) => {
    setMsg(null)
    setObj((prev: any) => {
      const next = structuredClone(prev ?? {})
      fn(next)
      setRaw(JSON.stringify(next, null, 2))
      return next
    })
  }

  const save = async (content: string) => {
    try {
      const r = await send('/api/settings', 'PUT', { content })
      setMsg({ ok: true, text: `Saved. Backup at ${r.backup}` })
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message })
    }
  }

  if (obj === null) return <div className="page"><h1>Settings</h1></div>

  const perms = obj.permissions ?? {}
  const linesToArr = (v: string) => v.split('\n').map((x) => x.trim()).filter(Boolean)
  const envLines = Object.entries(obj.env ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  return (
    <div className="page">
      <h1>Settings</h1>
      <p className="sub">
        Global Claude Code settings — <code>{path}</code>. Applies to every Claude Code session on
        this machine. A <code>.bak</code> backup is written before each save.
      </p>

      <section className="set-form">
        <div className="form-row">
          <div>
            <label>Default model</label>
            <select
              value={obj.model ?? ''}
              onChange={(e) =>
                patch((o) => {
                  if (e.target.value) o.model = e.target.value
                  else delete o.model
                })
              }
            >
              <option value="">auto (recommended)</option>
              <option value="sonnet">sonnet</option>
              <option value="opus">opus</option>
              <option value="haiku">haiku</option>
            </select>
          </div>
          <div>
            <label>Default permission mode</label>
            <select
              value={perms.defaultMode ?? ''}
              onChange={(e) =>
                patch((o) => {
                  o.permissions ??= {}
                  if (e.target.value) o.permissions.defaultMode = e.target.value
                  else delete o.permissions.defaultMode
                })
              }
            >
              <option value="">default (ask)</option>
              <option value="acceptEdits">acceptEdits</option>
              <option value="plan">plan</option>
              <option value="bypassPermissions">bypassPermissions</option>
            </select>
          </div>
          <div>
            <label>Chat cleanup (days)</label>
            <input
              type="number"
              min={1}
              value={obj.cleanupPeriodDays ?? ''}
              placeholder="30"
              onChange={(e) =>
                patch((o) => {
                  if (e.target.value) o.cleanupPeriodDays = Number(e.target.value)
                  else delete o.cleanupPeriodDays
                })
              }
            />
          </div>
        </div>

        <div className="form-row set-toggles">
          <label>
            <input
              type="checkbox"
              checked={obj.includeCoAuthoredBy !== false}
              onChange={(e) =>
                patch((o) => {
                  if (e.target.checked) delete o.includeCoAuthoredBy
                  else o.includeCoAuthoredBy = false
                })
              }
            />
            Co-authored-by on commits
          </label>
          <label>
            <input
              type="checkbox"
              checked={obj.autoUpdates !== false}
              onChange={(e) =>
                patch((o) => {
                  if (e.target.checked) delete o.autoUpdates
                  else o.autoUpdates = false
                })
              }
            />
            Auto-updates
          </label>
          <label>
            <input
              type="checkbox"
              checked={obj.alwaysThinkingEnabled === true}
              onChange={(e) =>
                patch((o) => {
                  if (e.target.checked) o.alwaysThinkingEnabled = true
                  else delete o.alwaysThinkingEnabled
                })
              }
            />
            Extended thinking by default
          </label>
        </div>

        <div className="form-row" style={{ alignItems: 'stretch' }}>
          <div style={{ flex: 1 }}>
            <label>Always-allowed tools (one rule per line, e.g. Bash(npm run test:*))</label>
            <textarea
              className="raw set-lines"
              value={(perms.allow ?? []).join('\n')}
              spellCheck={false}
              onChange={(e) =>
                patch((o) => {
                  o.permissions ??= {}
                  const arr = linesToArr(e.target.value)
                  if (arr.length) o.permissions.allow = arr
                  else delete o.permissions.allow
                })
              }
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Always-denied tools (one rule per line)</label>
            <textarea
              className="raw set-lines"
              value={(perms.deny ?? []).join('\n')}
              spellCheck={false}
              onChange={(e) =>
                patch((o) => {
                  o.permissions ??= {}
                  const arr = linesToArr(e.target.value)
                  if (arr.length) o.permissions.deny = arr
                  else delete o.permissions.deny
                })
              }
            />
          </div>
        </div>

        <div className="form-row" style={{ alignItems: 'stretch' }}>
          <div style={{ flex: 1 }}>
            <label>Environment variables (KEY=value per line)</label>
            <textarea
              className="raw set-lines"
              value={envLines}
              spellCheck={false}
              onChange={(e) =>
                patch((o) => {
                  const env: Record<string, string> = {}
                  for (const line of e.target.value.split('\n')) {
                    const i = line.indexOf('=')
                    if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
                  }
                  if (Object.keys(env).length) o.env = env
                  else delete o.env
                })
              }
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Status line command (blank = none)</label>
            <input
              style={{ width: '100%' }}
              value={obj.statusLine?.command ?? ''}
              onChange={(e) =>
                patch((o) => {
                  if (e.target.value) o.statusLine = { type: 'command', command: e.target.value }
                  else delete o.statusLine
                })
              }
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
          <button className="btn btn-run" onClick={() => save(JSON.stringify(obj, null, 2))}>
            Save settings
          </button>
          {msg && <span className={msg.ok ? 'note-ok' : 'note-err'}>{msg.text}</span>}
        </div>
      </section>

      <section>
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 700, marginBottom: 8 }}>
            Advanced: raw JSON (full file, including keys not shown above)
          </summary>
          <textarea
            className="raw"
            value={raw}
            spellCheck={false}
            onChange={(e) => {
              setRaw(e.target.value)
              setMsg(null)
            }}
          />
          <div style={{ marginTop: 8 }}>
            <button
              className="btn"
              onClick={() => {
                try {
                  const parsed = JSON.parse(raw)
                  setObj(parsed)
                  save(JSON.stringify(parsed, null, 2))
                } catch (err) {
                  setMsg({ ok: false, text: `Invalid JSON: ${(err as Error).message}` })
                }
              }}
            >
              Save raw JSON
            </button>
          </div>
        </details>
      </section>
    </div>
  )
}

// ---------------- Status ----------------

interface StatusInfo {
  claude: string
  claudeOk: boolean
  node: string
  platform: string
  settingsPath: string
  workspace: string
}

export function StatusPage() {
  const [s, setS] = useState<StatusInfo | null>(null)
  const [err, setErr] = useState('')
  const [loginMsg, setLoginMsg] = useState('')
  const load = useCallback(() => {
    get('/api/status').then(setS).catch((e) => setErr(e.message))
  }, [])
  useEffect(load, [load])

  const connect = async () => {
    try {
      await send('/api/auth/login', 'POST')
      setLoginMsg(
        'A terminal opened running the Claude Code login. It redirects you to claude.ai — sign in with your Claude account, finish the flow, then come back and hit Re-check.'
      )
    } catch (e) {
      setLoginMsg(`Could not launch login: ${(e as Error).message}`)
    }
  }

  return (
    <div className="page">
      <h1>Status</h1>
      <p className="sub">Environment this app is driving.</p>
      {err && <p className="note-err">Backend unreachable: {err}</p>}
      {s && (
        <table className="data" style={{ maxWidth: 720 }}>
          <tbody>
            <tr>
              <td>Claude Code CLI</td>
              <td>
                {s.claude} {s.claudeOk ? <span className="note-ok">● ok</span> : <span className="note-err">● problem</span>}
              </td>
            </tr>
            <tr>
              <td>Account</td>
              <td>
                Runs on whichever Claude account is connected on this machine — no API key.
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn" onClick={connect}>Connect Claude account</button>
                  <button className="btn btn-ghost" onClick={load}>Re-check</button>
                </div>
                {loginMsg && <p style={{ marginBottom: 0 }} className="note-ok">{loginMsg}</p>}
              </td>
            </tr>
            <tr><td>Node (backend)</td><td>{s.node}</td></tr>
            <tr><td>Platform</td><td>{s.platform}</td></tr>
            <tr><td>Settings file</td><td>{s.settingsPath}</td></tr>
            <tr><td>Generated workspaces</td><td>{s.workspace}</td></tr>
          </tbody>
        </table>
      )}
    </div>
  )
}

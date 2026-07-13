import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import type { AgentData, EdgeConfig, RunEvent, Skill } from './types'
import { AVATARS } from './types'
import { api, connectEvents } from './api'
import { BoardCtx } from './ctx'
import { AgentNode } from './components/AgentNode'
import { SkillDock } from './components/SkillDock'
import { SkillEditor } from './components/SkillEditor'
import { MissionLog, type NodeLog } from './components/MissionLog'
import { AgentConfig, EdgeConfigPanel, HarnessConfig } from './components/ConfigPanel'
import { UsagePage, McpPage, PluginsPage, AgentsPage, SettingsPage, StatusPage, TemplatePage } from './pages'
import { TEMPLATES, type SquadTemplate } from './templates'

const nodeTypes = { agent: AgentNode }

const TABS = [
  ['canvas', 'Canvas'],
  ['council', 'Council'],
  ['org', 'Org'],
  ['usage', 'Usage'],
  ['mcp', 'MCP'],
  ['plugins', 'Plugins'],
  ['agents', 'Agents'],
  ['settings', 'Settings'],
  ['status', 'Status'],
] as const
type Tab = (typeof TABS)[number][0]

let agentSeq = 0
const freshAgent = (): AgentData => ({
  name: `AGENT-${String(++agentSeq).padStart(2, '0')}`,
  avatar: AVATARS[agentSeq % AVATARS.length],
  description: '',
  prompt: '',
  model: 'inherit',
  tools: ['Read', 'Glob', 'Grep'],
  permissionMode: 'default',
  maxTurns: null,
  skills: [],
  repeat: { count: 1, until: '' },
  status: 'idle',
})

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AgentData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [editing, setEditing] = useState<Skill | null | 'new'>(null)
  const [mission, setMission] = useState('')
  const [runId, setRunId] = useState<string | null>(null)
  const [runState, setRunState] = useState('STANDBY')
  const [logs, setLogs] = useState<Map<string, NodeLog>>(new Map())
  const [mcpConfig, setMcpConfig] = useState('')
  const [selNode, setSelNode] = useState<string | null>(null)
  const [selEdge, setSelEdge] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('canvas')
  const [wfId, setWfId] = useState('main')
  const [wfList, setWfList] = useState<string[]>(['main'])
  const loaded = useRef(false)

  // edges glow with motion only while a mission is actually running
  useEffect(() => {
    setEdges((es) => es.map((e) => ({ ...e, animated: !!runId })))
  }, [runId, setEdges])

  const refreshWfList = useCallback(() => {
    api
      .listWorkflows()
      .then((ws: { id: string }[]) => {
        const ids = ws.map((w) => w.id)
        for (const t of TEMPLATES) if (!ids.includes(t.id)) ids.push(t.id)
        if (!ids.includes('main')) ids.unshift('main')
        setWfList(ids)
      })
      .catch(() => {})
  }, [])

  const loadWorkflow = useCallback(
    async (id: string) => {
      loaded.current = false
      const wf = await api.getWorkflow(id)
      setMcpConfig(wf?.mcpConfig ?? '')
      setNodes(
        (wf?.nodes ?? []).map((n: Record<string, unknown>) => ({
          id: n.id as string,
          type: 'agent',
          position: (n.position as { x: number; y: number }) ?? { x: 100, y: 100 },
          data: { ...freshAgent(), ...n, status: 'idle', detail: undefined } as AgentData,
        }))
      )
      setEdges(
        (wf?.edges ?? []).map(
          (e: EdgeConfig & { id: string; source: string; target: string }) =>
            decorateEdge({
              id: e.id,
              source: e.source,
              target: e.target,
              data: { loop: e.loop, maxLoops: e.maxLoops, until: e.until },
            })
        )
      )
      agentSeq = wf?.nodes?.length ?? 0
      setSelNode(null)
      setSelEdge(null)
      setLogs(new Map())
      loaded.current = true
    },
    [setNodes, setEdges]
  )

  useEffect(() => {
    api.listSkills().then(setSkills).catch(() => {})
    refreshWfList()
  }, [refreshWfList])

  useEffect(() => {
    loadWorkflow(wfId).catch((err) => setRunState(`SERVER OFFLINE — ${err.message}`))
  }, [wfId, loadWorkflow])

  // ---- persist (debounced) ----
  useEffect(() => {
    if (!loaded.current) return
    const t = setTimeout(() => {
      api
        .saveWorkflow({
          id: wfId,
          name: wfId,
          mcpConfig,
          nodes: nodes.map((n) => {
            const { status: _s, detail: _d, ...rest } = n.data
            return { id: n.id, position: n.position, ...rest }
          }),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            loop: (e.data as EdgeConfig)?.loop ?? false,
            maxLoops: (e.data as EdgeConfig)?.maxLoops ?? 3,
            until: (e.data as EdgeConfig)?.until ?? '',
          })),
        })
        .catch(() => {})
    }, 700)
    return () => clearTimeout(t)
  }, [nodes, edges, mcpConfig, wfId])

  // ---- live events ----
  useEffect(() => {
    return connectEvents((ev: RunEvent) => {
      if (ev.nodeId) {
        if (ev.type === 'node_status') {
          setNodes((ns) =>
            ns.map((n) =>
              n.id === ev.nodeId
                ? { ...n, data: { ...n.data, status: ev.status ?? 'idle', detail: ev.detail } }
                : n
            )
          )
        }
        setLogs((prev) => {
          const next = new Map(prev)
          const log = next.get(ev.nodeId!) ?? { name: ev.nodeId!, status: 'idle', lines: [] }
          const l = { ...log, lines: [...log.lines] }
          if (ev.type === 'node_status') {
            l.status = ev.status ?? 'idle'
            if (ev.detail) l.lines.push({ kind: 'sys', text: `\n◈ ${ev.detail}\n` })
          } else if (ev.type === 'node_text' && ev.text) {
            l.lines.push({ kind: 'text', text: ev.text })
          } else if (ev.type === 'node_tool') {
            l.lines.push({ kind: 'tool', text: `\n⚙ [${ev.tool}]\n` })
          } else if (ev.type === 'node_usage' && ev.usage) {
            l.lines.push({
              kind: 'sys',
              text: `\n◈ tokens in:${ev.usage.input_tokens ?? '?'} out:${ev.usage.output_tokens ?? '?'}\n`,
            })
          }
          next.set(ev.nodeId!, l)
          return next
        })
      }
      if (ev.type === 'loop') setRunState(`RUNNING — LOOP ${ev.iteration}/${ev.max}`)
      if (ev.type === 'run_done') {
        setRunState('MISSION COMPLETE ✔')
        setRunId(null)
      }
      if (ev.type === 'run_cancelled') {
        setRunState('ABORTED')
        setRunId(null)
      }
      if (ev.type === 'run_error') {
        setRunState(`ERROR — ${ev.error}`)
        setRunId(null)
        setNodes((ns) =>
          ns.map((n) =>
            n.data.status === 'running' ? { ...n, data: { ...n.data, status: 'error' } } : n
          )
        )
      }
    })
  }, [setNodes])

  // ---- board api for nodes ----
  const boardApi = useMemo(
    () => ({
      updateAgent: (id: string, patch: Partial<AgentData>) =>
        setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))),
      removeAgent: (id: string) => {
        setNodes((ns) => ns.filter((n) => n.id !== id))
        setEdges((es) => es.filter((e) => e.source !== id && e.target !== id))
        setSelNode(null)
      },
    }),
    [setNodes, setEdges]
  )

  const addAgent = () => {
    const id = `agent-${Date.now().toString(36)}`
    setNodes((ns) => [
      ...ns,
      {
        id,
        type: 'agent',
        position: { x: 120 + ns.length * 60, y: 120 + (ns.length % 4) * 90 },
        data: freshAgent(),
      },
    ])
  }

  const onConnect = useCallback(
    (c: Connection) =>
      setEdges((es) =>
        addEdge(decorateEdge({ ...c, id: `e-${Date.now().toString(36)}`, data: {} }), es)
      ),
    [setEdges]
  )

  const updateEdge = (id: string, patch: EdgeConfig) =>
    setEdges((es) =>
      es.map((e) => (e.id === id ? decorateEdge({ ...e, data: { ...e.data, ...patch } }) : e))
    )

  // ---- run controls ----
  const launch = async () => {
    setLogs(
      new Map(nodes.map((n) => [n.id, { name: n.data.name, status: 'idle', lines: [] } as NodeLog]))
    )
    setNodes((ns) =>
      ns.map((n) => ({ ...n, data: { ...n.data, status: 'idle', detail: undefined } }))
    )
    setRunState('RUNNING')
    try {
      const { runId } = await api.run(wfId, mission || 'Do your job.')
      setRunId(runId)
    } catch (err) {
      setRunState(`LAUNCH FAILED — ${(err as Error).message}`)
    }
  }

  const abort = () => runId && api.cancel(runId).catch(() => {})

  const generateFiles = async () => {
    try {
      const r = await api.generate(wfId)
      setRunState(`FILES FORGED → ${r.written.length} in ${r.dir}`)
    } catch (err) {
      setRunState(`GENERATE FAILED — ${(err as Error).message}`)
    }
  }

  const saveSkill = async (s: Skill) => {
    await api.saveSkill(s)
    setSkills(await api.listSkills())
    setEditing(null)
  }

  const deleteSkill = async (name: string) => {
    await api.deleteSkill(name)
    setSkills(await api.listSkills())
    setNodes((ns) =>
      ns.map((n) =>
        n.data.skills.includes(name)
          ? { ...n, data: { ...n.data, skills: n.data.skills.filter((x) => x !== name) } }
          : n
      )
    )
  }

  const equipSkill = (name: string) => {
    if (!selNode) {
      setRunState('Select an agent first, then click a skill to equip it.')
      return
    }
    const node = nodes.find((n) => n.id === selNode)
    if (node && !node.data.skills.includes(name)) {
      boardApi.updateAgent(selNode, { skills: [...node.data.skills, name] })
    }
  }

  const deployTemplate = async (t: SquadTemplate) => {
    await api.saveWorkflow({
      id: t.id,
      name: t.title,
      mcpConfig: '',
      nodes: t.nodes.map((n) => ({ id: n.id, position: n.position, ...n.data })),
      edges: t.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        loop: e.loop ?? false,
        maxLoops: e.maxLoops ?? 3,
        until: e.until ?? '',
      })),
    })
    refreshWfList()
    if (wfId === t.id) await loadWorkflow(t.id)
    else setWfId(t.id)
    setTab('canvas')
  }

  const selectedNode = nodes.find((n) => n.id === selNode) ?? null
  const selectedEdge = edges.find((e) => e.id === selEdge) ?? null

  return (
    <BoardCtx.Provider value={boardApi}>
      <div className="shell">
        <header className="hud">
          <div className="logo">
            ⬢ AGENT <em>OS</em>
          </div>
          <nav className="nav-tabs">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                className={`nav-tab ${tab === id ? 'active' : ''}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        <div className="stage">
          {tab !== 'canvas' &&
            {
              council: <TemplatePage t={TEMPLATES[0]} onDeploy={deployTemplate} />,
              org: <TemplatePage t={TEMPLATES[1]} onDeploy={deployTemplate} />,
              usage: <UsagePage />,
              mcp: <McpPage />,
              plugins: <PluginsPage />,
              agents: <AgentsPage />,
              settings: <SettingsPage />,
              status: <StatusPage />,
            }[tab]}

          <div className="canvas-tab" style={{ display: tab === 'canvas' ? 'flex' : 'none' }}>
            <div className="toolbar">
              <select
                className="wf-select"
                value={wfId}
                title="Workflow"
                onChange={(e) => setWfId(e.target.value)}
              >
                {wfList.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
              <button className="btn" onClick={addAgent}>
                + Add agent
              </button>
              <input
                className="mission-input"
                placeholder="Mission for the squad, e.g. “Research X and write a summary”"
                value={mission}
                onChange={(e) => setMission(e.target.value)}
              />
              <div className="spacer" />
              <button
                className="btn btn-ghost"
                onClick={generateFiles}
                title="Export .claude/agents + skills"
              >
                Forge files
              </button>
              {runId ? (
                <button className="btn btn-stop" onClick={abort}>
                  ■ Abort
                </button>
              ) : (
                <button className="btn btn-run" disabled={!nodes.length} onClick={launch}>
                  ▶ Run
                </button>
              )}
            </div>

            <div className="work">
              <aside className="panel panel-left">
                <SkillDock
                  skills={skills}
                  onForge={() => setEditing('new')}
                  onEdit={(s) => setEditing(s)}
                  onDelete={deleteSkill}
                  onEquip={equipSkill}
                />
              </aside>

              <div className="board">
                {nodes.length === 0 && (
                  <div className="board-empty">
                    <div className="empty-card">
                      <strong>Build your squad</strong>
                      <p>
                        Add an agent, give it a prompt, equip skills from the left, wire agents
                        together, then run the mission. Or deploy a ready squad from the Council or
                        Org tab.
                      </p>
                      <button className="btn btn-run" onClick={addAgent}>
                        + Add your first agent
                      </button>
                    </div>
                  </div>
                )}
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onSelectionChange={({ nodes: sn, edges: se }) => {
                    setSelNode(sn[0]?.id ?? null)
                    setSelEdge(se[0]?.id ?? null)
                  }}
                  fitView
                  deleteKeyCode={['Delete', 'Backspace']}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background
                    variant={BackgroundVariant.Dots}
                    gap={24}
                    size={1.5}
                    color="oklch(0.32 0.02 252)"
                  />
                  <Controls position="bottom-right" />
                </ReactFlow>
              </div>

              <aside className="panel panel-right">
                {selectedNode ? (
                  <AgentConfig node={selectedNode} allSkills={skills.map((s) => s.name)} />
                ) : selectedEdge ? (
                  <EdgeConfigPanel edge={selectedEdge} onChange={updateEdge} />
                ) : (
                  <>
                    <h2>Inspector</h2>
                    <div className="dock-empty" style={{ padding: '0 14px' }}>
                      Select an agent to edit its model, tools, skills, permissions and loops.
                      Select a connection to make it a loop.
                    </div>
                    <HarnessConfig mcpConfig={mcpConfig} onMcp={setMcpConfig} />
                  </>
                )}
              </aside>
            </div>
          </div>
        </div>

        <MissionLog logs={logs} runState={runState} running={!!runId} />
      </div>

      {editing !== null && (
        <SkillEditor
          initial={editing === 'new' ? null : editing}
          onSave={saveSkill}
          onClose={() => setEditing(null)}
        />
      )}
    </BoardCtx.Provider>
  )
}

function decorateEdge(e: Omit<Edge, 'className'> & { data?: EdgeConfig }): Edge {
  const loop = !!e.data?.loop
  return {
    ...e,
    className: loop ? 'edge-loop' : '',
    label: loop ? `🔁 ×${e.data?.maxLoops ?? 3}` : undefined,
  }
}

import type { Edge, Node } from '@xyflow/react'
import type { AgentData, EdgeConfig } from '../types'
import { ALL_TOOLS, MODELS, PERMISSION_MODES } from '../types'
import { useBoard } from '../ctx'

export function AgentConfig({ node }: { node: Node<AgentData> }) {
  const { updateAgent, removeAgent } = useBoard()
  const d = node.data
  const toggleTool = (t: string) =>
    updateAgent(node.id, {
      tools: d.tools.includes(t) ? d.tools.filter((x) => x !== t) : [...d.tools, t],
    })

  return (
    <div className="cfg dock-scroll" style={{ flex: 1 }}>
      <h2>{d.avatar} Agent config</h2>
      <label>Description (for subagent routing)</label>
      <input
        type="text"
        value={d.description}
        onChange={(e) => updateAgent(node.id, { description: e.target.value })}
      />
      <label>Model</label>
      <select
        value={d.model}
        onChange={(e) => updateAgent(node.id, { model: e.target.value as AgentData['model'] })}
      >
        {MODELS.map((m) => (
          <option key={m} value={m}>
            {m === 'inherit' ? 'auto (inherit)' : m}
          </option>
        ))}
      </select>
      <label>Allowed tools</label>
      <div className="tool-grid">
        {ALL_TOOLS.map((t) => (
          <label key={t}>
            <input type="checkbox" checked={d.tools.includes(t)} onChange={() => toggleTool(t)} />
            {t}
          </label>
        ))}
      </div>
      <label>Permission mode</label>
      <select
        value={d.permissionMode}
        onChange={(e) =>
          updateAgent(node.id, { permissionMode: e.target.value as AgentData['permissionMode'] })
        }
      >
        {PERMISSION_MODES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      {d.permissionMode === 'bypassPermissions' && (
        <div className="danger-note">⚠ bypass = agent acts without any permission gate</div>
      )}
      <div className="row">
        <div>
          <label>Max turns</label>
          <input
            type="number"
            min={1}
            value={d.maxTurns ?? ''}
            placeholder="∞"
            onChange={(e) =>
              updateAgent(node.id, { maxTurns: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
        <div>
          <label>Self-loop ×</label>
          <input
            type="number"
            min={1}
            max={25}
            value={d.repeat.count}
            onChange={(e) =>
              updateAgent(node.id, {
                repeat: { ...d.repeat, count: Math.max(1, Number(e.target.value) || 1) },
              })
            }
          />
        </div>
      </div>
      <label>Stop self-loop when output contains</label>
      <input
        type="text"
        value={d.repeat.until}
        placeholder="e.g. DONE"
        onChange={(e) => updateAgent(node.id, { repeat: { ...d.repeat, until: e.target.value } })}
      />
      <div style={{ marginTop: 14 }}>
        <button className="btn btn-stop" onClick={() => removeAgent(node.id)}>
          Dismiss agent
        </button>
      </div>
    </div>
  )
}

export function EdgeConfigPanel({
  edge,
  onChange,
}: {
  edge: Edge
  onChange: (id: string, patch: EdgeConfig) => void
}) {
  const d = (edge.data ?? {}) as EdgeConfig
  return (
    <div className="cfg dock-scroll">
      <h2>Link config</h2>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none' }}>
        <input
          type="checkbox"
          checked={!!d.loop}
          onChange={(e) => onChange(edge.id, { loop: e.target.checked })}
        />
        Loop-back edge (repeats the segment)
      </label>
      {d.loop && (
        <>
          <div className="row">
            <div>
              <label>Max loops</label>
              <input
                type="number"
                min={1}
                max={25}
                value={d.maxLoops ?? 3}
                onChange={(e) => onChange(edge.id, { maxLoops: Number(e.target.value) || 1 })}
              />
            </div>
          </div>
          <label>Stop looping when output contains</label>
          <input
            type="text"
            value={d.until ?? ''}
            placeholder="e.g. APPROVED"
            onChange={(e) => onChange(edge.id, { until: e.target.value })}
          />
        </>
      )}
    </div>
  )
}

export function HarnessConfig({
  mcpConfig,
  onMcp,
}: {
  mcpConfig: string
  onMcp: (v: string) => void
}) {
  return (
    <div className="cfg" style={{ padding: '0 14px 12px' }}>
      <h2 style={{ margin: '12px 0 4px' }}>Harness</h2>
      <label>MCP config (JSON, passed to every agent)</label>
      <textarea
        rows={4}
        value={mcpConfig}
        placeholder='{"mcpServers":{...}}'
        onChange={(e) => onMcp(e.target.value)}
      />
    </div>
  )
}

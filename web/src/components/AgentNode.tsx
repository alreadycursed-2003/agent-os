import { useState } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { AgentData } from '../types'
import { AVATARS, MODELS } from '../types'
import { useBoard } from '../ctx'

export function AgentNode({ id, data, selected }: NodeProps<Node<AgentData>>) {
  const { updateAgent } = useBoard()
  const [dropHint, setDropHint] = useState(false)

  const cycleAvatar = () => {
    const i = AVATARS.indexOf(data.avatar)
    updateAgent(id, { avatar: AVATARS[(i + 1) % AVATARS.length] })
  }

  const cycleModel = () => {
    const i = MODELS.indexOf(data.model)
    updateAgent(id, { model: MODELS[(i + 1) % MODELS.length] })
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDropHint(false)
    const skill =
      e.dataTransfer.getData('application/x-skill') || e.dataTransfer.getData('text/plain')
    if (skill && !data.skills.includes(skill)) {
      updateAgent(id, { skills: [...data.skills, skill] })
    }
  }

  return (
    <div
      className={`agent-card ${data.status} ${selected ? 'selected' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'copy'
        setDropHint(true)
      }}
      onDragLeave={() => setDropHint(false)}
      onDrop={onDrop}
    >
      <Handle type="target" position={Position.Left} className="handle-dot" />
      <div className="agent-head">
        <div className="avatar" onClick={cycleAvatar} title="Change avatar">
          {data.avatar}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            className="agent-name nodrag"
            value={data.name}
            onChange={(e) => updateAgent(id, { name: e.target.value })}
          />
          <span className="model-badge" onClick={cycleModel} title="Cycle model">
            {data.model === 'inherit' ? 'AUTO' : data.model.toUpperCase()}
          </span>
        </div>
        <div className="status-lamp" />
      </div>

      <textarea
        className="agent-prompt nodrag nowheel"
        placeholder="System prompt — who is this agent?"
        value={data.prompt}
        onChange={(e) => updateAgent(id, { prompt: e.target.value })}
      />

      <div className="slot-row">
        {data.skills.map((s) => (
          <span key={s} className="slot filled">
            ⚡ {s}
            <button
              title="Unequip"
              onClick={() => updateAgent(id, { skills: data.skills.filter((x) => x !== s) })}
            >
              ×
            </button>
          </span>
        ))}
        <span className={`slot ${dropHint ? 'drop-hint' : ''}`}>
          {dropHint ? '⤓ equip' : '+ skill slot'}
        </span>
      </div>

      <div className="agent-foot">
        <span>🛠 {data.tools.length ? data.tools.length : 'no'} tools</span>
        {data.repeat.count > 1 && <span>🔁 ×{data.repeat.count}</span>}
        {data.detail && <span className="detail">{data.detail}</span>}
      </div>

      <Handle type="source" position={Position.Right} className="handle-dot" />
    </div>
  )
}

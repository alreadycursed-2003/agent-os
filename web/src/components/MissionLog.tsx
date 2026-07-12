import { useEffect, useRef, useState } from 'react'
import type { NodeStatus } from '../types'

export interface NodeLog {
  name: string
  status: NodeStatus
  lines: { kind: 'text' | 'tool' | 'sys' | 'err'; text: string }[]
}

export function MissionLog({
  logs,
  runState,
  running,
}: {
  logs: Map<string, NodeLog>
  runState: string
  running: boolean
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (running) setOpen(true)
  }, [running])
  const [active, setActive] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const ids = [...logs.keys()]
  const activeId = active && logs.has(active) ? active : ids[0] ?? null
  const activeLog = activeId ? logs.get(activeId) : null

  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [activeLog?.lines.length])

  return (
    <div className={`mission-log ${open ? '' : 'collapsed'}`}>
      <div className="log-bar" onClick={() => setOpen(!open)}>
        <span className="title">Mission log</span>
        <span className="run-state">{runState}</span>
        <div className="log-tabs" onClick={(e) => e.stopPropagation()}>
          {ids.map((id) => {
            const l = logs.get(id)!
            return (
              <button
                key={id}
                className={`log-tab ${id === activeId ? 'active' : ''}`}
                onClick={() => {
                  setActive(id)
                  setOpen(true)
                }}
              >
                <span className={`lamp ${l.status}`} />
                {l.name}
              </button>
            )
          })}
        </div>
        <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{open ? '▼' : '▲'}</span>
      </div>
      {open && (
        <div className="log-body" ref={bodyRef}>
          {!activeLog && 'Standing by. Hit ▶ RUN to launch the mission.'}
          {activeLog?.lines.map((l, i) => (
            <span key={i} className={l.kind === 'text' ? '' : `${l.kind}-evt`}>
              {l.text}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

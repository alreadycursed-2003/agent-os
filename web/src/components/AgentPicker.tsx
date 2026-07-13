import { useState } from 'react'
import type { RoleDef } from '../templates'

export function AgentPicker({
  roles,
  onPick,
  onClose,
}: {
  roles: RoleDef[]
  onPick: (r: RoleDef | null) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const query = q.toLowerCase()
  const visible = roles.filter(
    (r) =>
      !query ||
      r.data.name.toLowerCase().includes(query) ||
      r.role.toLowerCase().includes(query) ||
      r.category.toLowerCase().includes(query)
  )
  const cats = [...new Set(visible.map((r) => r.category))]

  return (
    <div className="modal-veil" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal picker">
        <h3>Add an agent</h3>
        <input
          className="mkt-search"
          autoFocus
          placeholder="Search roles… (frontend, sales, QA)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="picker-list">
          <button className="picker-row" onClick={() => onPick(null)}>
            <span className="tmpl-avatar">✨</span>
            <span>
              <span className="p-name">Blank agent</span>
              <span className="p-desc">Empty card — write your own prompt</span>
            </span>
          </button>
          {cats.map((cat) => (
            <div key={cat}>
              <div className="picker-cat">{cat}</div>
              {visible
                .filter((r) => r.category === cat)
                .map((r) => (
                  <button key={cat + r.data.name} className="picker-row" onClick={() => onPick(r)}>
                    <span className="tmpl-avatar">{r.data.avatar}</span>
                    <span>
                      <span className="p-name">{r.data.name}</span>
                      <span className="p-desc">{r.role} — {r.data.description}</span>
                    </span>
                  </button>
                ))}
            </div>
          ))}
          {visible.length === 0 && <div className="dock-empty">No role matches “{q}”.</div>}
        </div>
      </div>
    </div>
  )
}

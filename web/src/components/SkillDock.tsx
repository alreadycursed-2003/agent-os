import type { Skill } from '../types'

export function SkillDock({
  skills,
  onForge,
  onEdit,
  onDelete,
}: {
  skills: Skill[]
  onForge: () => void
  onEdit: (s: Skill) => void
  onDelete: (name: string) => void
}) {
  return (
    <>
      <h2>
        <span>⚡</span> SKILL INVENTORY
      </h2>
      <button className="btn forge-btn" onClick={onForge}>
        + Forge Skill
      </button>
      <div className="dock-scroll">
        {skills.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            No skills yet. Forge one, then drag it onto an agent card to equip.
          </div>
        )}
        {skills.map((s) => (
          <div
            key={s.name}
            className="skill-chip"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/x-skill', s.name)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            title="Drag onto an agent to equip"
          >
            <span style={{ fontSize: 18 }}>⚡</span>
            <div style={{ minWidth: 0 }}>
              <div className="s-name">{s.name}</div>
              <div className="s-desc">{s.description || '—'}</div>
            </div>
            <div className="s-actions">
              <button title="Edit" onClick={() => onEdit(s)}>
                ✏️
              </button>
              <button title="Delete" onClick={() => onDelete(s.name)}>
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

import type { Skill } from '../types'

export function SkillDock({
  skills,
  onForge,
  onEdit,
  onDelete,
  onEquip,
}: {
  skills: Skill[]
  onForge: () => void
  onEdit: (s: Skill) => void
  onDelete: (name: string) => void
  onEquip: (name: string) => void
}) {
  return (
    <>
      <h2>Skill inventory</h2>
      <button className="btn forge-btn" onClick={onForge}>
        + Forge skill
      </button>
      <div className="dock-scroll">
        {skills.length === 0 && (
          <div className="dock-empty">
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
              e.dataTransfer.setData('text/plain', s.name)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            onClick={() => onEquip(s.name)}
            title="Drag onto an agent card, or select an agent and click to equip"
          >
            <span className="s-dot" />
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

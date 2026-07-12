import { useState } from 'react'
import type { Skill } from '../types'

export function SkillEditor({
  initial,
  onSave,
  onClose,
}: {
  initial: Skill | null
  onSave: (s: Skill) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [instructions, setInstructions] = useState(initial?.instructions ?? '')

  return (
    <div className="modal-veil" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal cfg">
        <h3>⚡ FORGE SKILL</h3>
        <label>Name</label>
        <input
          type="text"
          value={name}
          disabled={!!initial}
          placeholder="pdf-summarizer"
          onChange={(e) => setName(e.target.value)}
        />
        <label>Description</label>
        <input
          type="text"
          value={description}
          placeholder="When to use this skill"
          onChange={(e) => setDescription(e.target.value)}
        />
        <label>Instructions (markdown)</label>
        <textarea
          rows={8}
          value={instructions}
          placeholder="Step-by-step instructions the agent follows when using this skill…"
          onChange={(e) => setInstructions(e.target.value)}
        />
        <div className="actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn"
            disabled={!name.trim() || !instructions.trim()}
            onClick={() => onSave({ name: name.trim(), description, instructions })}
          >
            Save Skill
          </button>
        </div>
      </div>
    </div>
  )
}

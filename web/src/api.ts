import type { Skill, RunEvent } from './types'

const j = (r: Response) => {
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return r.json()
}

export const api = {
  listSkills: (): Promise<Skill[]> => fetch('/api/skills').then(j),
  saveSkill: (s: Skill): Promise<Skill> =>
    fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    }).then(j),
  deleteSkill: (name: string) =>
    fetch(`/api/skills/${encodeURIComponent(name)}`, { method: 'DELETE' }).then(j),

  getWorkflow: (id: string) =>
    fetch(`/api/workflows/${encodeURIComponent(id)}`).then((r) =>
      r.status === 404 ? null : j(r)
    ),
  saveWorkflow: (w: unknown) =>
    fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(w),
    }).then(j),
  generate: (id: string) =>
    fetch(`/api/workflows/${encodeURIComponent(id)}/generate`, { method: 'POST' }).then(j),
  run: (id: string, prompt: string): Promise<{ runId: string }> =>
    fetch(`/api/workflows/${encodeURIComponent(id)}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    }).then(j),
  cancel: (runId: string) =>
    fetch(`/api/runs/${encodeURIComponent(runId)}/cancel`, { method: 'POST' }).then(j),
}

export function connectEvents(onEvent: (ev: RunEvent) => void): () => void {
  let ws: WebSocket | null = null
  let closed = false

  const open = () => {
    if (closed) return
    ws = new WebSocket(`ws://${location.host}/ws`)
    ws.onmessage = (m) => {
      try {
        onEvent(JSON.parse(m.data))
      } catch {
        /* malformed event — ignore */
      }
    }
    ws.onclose = () => {
      if (!closed) setTimeout(open, 1500)
    }
  }
  open()

  return () => {
    closed = true
    ws?.close()
  }
}

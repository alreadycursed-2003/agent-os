import { createContext, useContext } from 'react'
import type { AgentData } from './types'

export interface BoardApi {
  updateAgent: (id: string, patch: Partial<AgentData>) => void
  removeAgent: (id: string) => void
}

export const BoardCtx = createContext<BoardApi | null>(null)

export function useBoard(): BoardApi {
  const ctx = useContext(BoardCtx)
  if (!ctx) throw new Error('BoardCtx missing')
  return ctx
}

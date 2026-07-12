export type NodeStatus = 'idle' | 'running' | 'done' | 'error'

export interface AgentData {
  name: string
  avatar: string
  description: string
  prompt: string
  model: 'inherit' | 'sonnet' | 'opus' | 'haiku'
  tools: string[]
  permissionMode: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan'
  maxTurns: number | null
  skills: string[]
  repeat: { count: number; until: string }
  status: NodeStatus
  detail?: string
  [key: string]: unknown
}

export interface EdgeConfig {
  loop?: boolean
  maxLoops?: number
  until?: string
  [key: string]: unknown
}

export interface Skill {
  name: string
  description: string
  instructions: string
}

export interface RunEvent {
  type: string
  workflowId?: string
  runId?: string
  nodeId?: string
  status?: NodeStatus
  detail?: string
  text?: string
  tool?: string
  result?: string
  error?: string
  usage?: { input_tokens?: number; output_tokens?: number } | null
  iteration?: number
  max?: number
  edgeId?: string
}

export const ALL_TOOLS = [
  'Read',
  'Write',
  'Edit',
  'Bash',
  'Glob',
  'Grep',
  'WebSearch',
  'WebFetch',
  'Task',
] as const

export const MODELS = ['inherit', 'sonnet', 'opus', 'haiku'] as const

export const PERMISSION_MODES = [
  'default',
  'acceptEdits',
  'bypassPermissions',
  'plan',
] as const

export const AVATARS = ['🤖', '🦾', '🧠', '🛰️', '🐉', '⚔️', '🧙', '🦉', '🔥', '🌊', '🕹️', '👾']

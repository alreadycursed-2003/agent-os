import type { AgentData } from './types'

export interface AgentSpec {
  name: string
  avatar: string
  description: string
  prompt: string
  model: AgentData['model']
  tools: string[]
  permissionMode: AgentData['permissionMode']
  maxTurns: number | null
  skills: string[]
  repeat: { count: number; until: string }
}

export interface TemplateNode {
  id: string
  role: string
  data: AgentSpec
  position: { x: number; y: number }
}

export interface TemplateEdge {
  id: string
  source: string
  target: string
  loop?: boolean
  maxLoops?: number
  until?: string
}

export interface SquadTemplate {
  id: string
  title: string
  tagline: string
  how: string
  nodes: TemplateNode[]
  edges: TemplateEdge[]
}

const base = {
  model: 'inherit' as const,
  permissionMode: 'default' as const,
  maxTurns: null,
  skills: [] as string[],
  repeat: { count: 1, until: '' },
}

export const COUNCIL: SquadTemplate = {
  id: 'council',
  title: 'The Council',
  tagline: 'Five advisors deliberate, one chair rules.',
  how: 'Every member receives the mission and answers from their own seat. The Chair reads all five briefs, weighs the conflicts, and delivers a final ruling with rationale. Good for decisions, reviews, and anything with trade-offs.',
  nodes: [
    {
      id: 'c-sage',
      role: 'Evidence & facts',
      position: { x: 60, y: 0 },
      data: {
        ...base,
        name: 'THE SAGE',
        avatar: '🦉',
        description: 'gathers evidence and prior art',
        tools: ['WebSearch', 'WebFetch', 'Read', 'Glob', 'Grep'],
        prompt:
          'You are the Council\'s Sage. Research the mission and report only verifiable facts, data, and prior art. Cite sources. No opinions — evidence only.',
      },
    },
    {
      id: 'c-strategist',
      role: 'Long-term strategy',
      position: { x: 60, y: 130 },
      data: {
        ...base,
        name: 'THE STRATEGIST',
        avatar: '🧠',
        description: 'maps long-term consequences and options',
        tools: [],
        prompt:
          'You are the Council\'s Strategist. Lay out 2-3 strategic options for the mission, with second-order consequences, leverage points, and what winning looks like in a year.',
      },
    },
    {
      id: 'c-skeptic',
      role: "Devil's advocate",
      position: { x: 60, y: 260 },
      data: {
        ...base,
        name: 'THE SKEPTIC',
        avatar: '🐉',
        description: 'attacks the plan, finds failure modes',
        tools: [],
        prompt:
          'You are the Council\'s Skeptic. Attack the mission premise and every obvious approach. List the ways this fails, hidden costs, and what everyone is conveniently ignoring. Be ruthless, not contrarian for sport.',
      },
    },
    {
      id: 'c-pragmatist',
      role: 'Feasibility & cost',
      position: { x: 60, y: 390 },
      data: {
        ...base,
        name: 'THE PRAGMATIST',
        avatar: '⚔️',
        description: 'judges effort, cost, and the shortest path',
        tools: [],
        prompt:
          'You are the Council\'s Pragmatist. Judge what is actually doable with real constraints: time, money, skill, energy. Propose the minimum viable path and name what to cut.',
      },
    },
    {
      id: 'c-advocate',
      role: 'People & ethics',
      position: { x: 60, y: 520 },
      data: {
        ...base,
        name: 'THE ADVOCATE',
        avatar: '🌊',
        description: 'speaks for the people affected',
        tools: [],
        prompt:
          'You are the Council\'s Advocate. Speak for everyone the mission touches: users, teammates, bystanders. Surface harms, unfairness, and trust risks the others will miss.',
      },
    },
    {
      id: 'c-chair',
      role: 'Final ruling',
      position: { x: 520, y: 260 },
      data: {
        ...base,
        name: 'THE CHAIR',
        avatar: '🧙',
        description: 'synthesizes the council and rules',
        tools: [],
        prompt:
          'You chair the Council. You receive five briefs: Sage (evidence), Strategist (options), Skeptic (risks), Pragmatist (feasibility), Advocate (people). Weigh them, resolve conflicts explicitly, then deliver: THE RULING (one paragraph), WHY (key trade-offs), FIRST THREE MOVES.',
      },
    },
  ],
  edges: [
    { id: 'ce-1', source: 'c-sage', target: 'c-chair' },
    { id: 'ce-2', source: 'c-strategist', target: 'c-chair' },
    { id: 'ce-3', source: 'c-skeptic', target: 'c-chair' },
    { id: 'ce-4', source: 'c-pragmatist', target: 'c-chair' },
    { id: 'ce-5', source: 'c-advocate', target: 'c-chair' },
  ],
}

export const ORG: SquadTemplate = {
  id: 'org',
  title: 'The Org',
  tagline: 'A company in miniature: direction → spec → design → build → review.',
  how: 'The CEO turns your mission into a directive, the PM writes the spec, the Architect designs, the Engineer builds (with file and shell tools), and QA reviews. QA loops work back to the Engineer up to 2 times until it stamps APPROVED.',
  nodes: [
    {
      id: 'o-ceo',
      role: 'Direction',
      position: { x: 0, y: 160 },
      data: {
        ...base,
        name: 'CEO',
        avatar: '👾',
        description: 'sets direction and success criteria',
        tools: [],
        prompt:
          'You are the CEO. Turn the mission into a one-page directive: the goal, why now, success criteria, non-goals, and constraints. Be decisive; no hedging.',
      },
    },
    {
      id: 'o-pm',
      role: 'Spec',
      position: { x: 330, y: 160 },
      data: {
        ...base,
        name: 'PRODUCT MGR',
        avatar: '🛰️',
        description: 'turns the directive into requirements',
        tools: ['Read', 'Glob', 'Grep'],
        prompt:
          'You are the Product Manager. Turn the CEO directive into a concrete spec: user stories, acceptance criteria, edge cases, and priority order. Everything testable.',
      },
    },
    {
      id: 'o-architect',
      role: 'Design',
      position: { x: 660, y: 160 },
      data: {
        ...base,
        name: 'ARCHITECT',
        avatar: '🦾',
        description: 'designs the technical approach',
        tools: ['Read', 'Glob', 'Grep'],
        prompt:
          'You are the Architect. Design the implementation for the spec: components, data flow, file layout, key decisions with one-line rationale. Prefer the simplest design that ships.',
      },
    },
    {
      id: 'o-engineer',
      role: 'Build',
      position: { x: 990, y: 160 },
      data: {
        ...base,
        name: 'ENGINEER',
        avatar: '🤖',
        description: 'implements the design',
        tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        permissionMode: 'acceptEdits',
        prompt:
          'You are the Engineer. Implement the Architect\'s design in the working directory. Write real, complete code — no stubs. If QA feedback is included, fix every item it raises.',
      },
    },
    {
      id: 'o-qa',
      role: 'Review gate',
      position: { x: 1320, y: 160 },
      data: {
        ...base,
        name: 'QA',
        avatar: '🔥',
        description: 'reviews the build against the spec',
        tools: ['Read', 'Bash', 'Glob', 'Grep'],
        prompt:
          'You are QA. Review the Engineer\'s work against the spec: correctness, edge cases, missing pieces. Run what you can. End with exactly APPROVED if it ships, or REJECTED plus a numbered fix list.',
      },
    },
  ],
  edges: [
    { id: 'oe-1', source: 'o-ceo', target: 'o-pm' },
    { id: 'oe-2', source: 'o-pm', target: 'o-architect' },
    { id: 'oe-3', source: 'o-architect', target: 'o-engineer' },
    { id: 'oe-4', source: 'o-engineer', target: 'o-qa' },
    { id: 'oe-5', source: 'o-qa', target: 'o-engineer', loop: true, maxLoops: 2, until: 'APPROVED' },
  ],
}

export const TEMPLATES = [COUNCIL, ORG]

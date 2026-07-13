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
  tagline: 'A full development organization: leadership → planning → design → build → review.',
  how: 'Leadership cascades your mission down the chain: CEO sets direction, the Director shapes strategy, the Senior Manager plans delivery, the PM writes the spec, the Architect designs. Then the build fans out — Backend and Frontend engineers implement their halves, the Senior Engineer integrates and reviews their work, the Junior Engineer adds tests and docs — and QA gates the release, looping work back to the Senior Engineer up to 2 times until it stamps APPROVED. Ten agents run per mission, so expect a heavier bite out of your Pro usage window.',
  nodes: [
    {
      id: 'o-ceo',
      role: 'Direction',
      position: { x: 0, y: 200 },
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
      id: 'o-director',
      role: 'Strategy',
      position: { x: 330, y: 200 },
      data: {
        ...base,
        name: 'DIRECTOR',
        avatar: '🎯',
        description: 'turns the directive into strategy and priorities',
        tools: [],
        prompt:
          'You are the Director of Engineering. Turn the CEO directive into an execution strategy: scope boundaries, phasing, what to build vs buy vs skip, key risks with mitigations, and the single most important priority. Keep the org honest about trade-offs.',
      },
    },
    {
      id: 'o-srmanager',
      role: 'Delivery plan',
      position: { x: 660, y: 200 },
      data: {
        ...base,
        name: 'SENIOR MGR',
        avatar: '📋',
        description: 'plans delivery, milestones, and ownership',
        tools: [],
        prompt:
          'You are the Senior Engineering Manager. Turn the Director\'s strategy into a delivery plan: milestones in order, what each role owns (PM, Architect, Backend, Frontend, Senior, Junior, QA), definition of done per milestone, and where the schedule is most likely to slip.',
      },
    },
    {
      id: 'o-pm',
      role: 'Spec',
      position: { x: 990, y: 200 },
      data: {
        ...base,
        name: 'PRODUCT MGR',
        avatar: '🛰️',
        description: 'turns the plan into requirements',
        tools: ['Read', 'Glob', 'Grep'],
        prompt:
          'You are the Product Manager. Turn the delivery plan into a concrete spec: user stories, acceptance criteria, edge cases, and priority order. Everything testable.',
      },
    },
    {
      id: 'o-architect',
      role: 'Design',
      position: { x: 1320, y: 200 },
      data: {
        ...base,
        name: 'ARCHITECT',
        avatar: '🦾',
        description: 'designs the technical approach and splits the work',
        tools: ['Read', 'Glob', 'Grep'],
        prompt:
          'You are the Architect. Design the implementation for the spec: components, data flow, file layout, API contract between backend and frontend, key decisions with one-line rationale. End with two clearly separated work orders: BACKEND WORK ORDER and FRONTEND WORK ORDER.',
      },
    },
    {
      id: 'o-backend',
      role: 'Build — server side',
      position: { x: 1650, y: 40 },
      data: {
        ...base,
        name: 'BACKEND ENG',
        avatar: '🗄️',
        description: 'implements the backend work order',
        tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        permissionMode: 'acceptEdits',
        prompt:
          'You are the Backend Engineer. Implement the BACKEND WORK ORDER from the Architect in the working directory: APIs, data layer, business logic. Real, complete, runnable code — no stubs. Honor the API contract exactly; the frontend depends on it.',
      },
    },
    {
      id: 'o-frontend',
      role: 'Build — client side',
      position: { x: 1650, y: 380 },
      data: {
        ...base,
        name: 'FRONTEND ENG',
        avatar: '🎨',
        description: 'implements the frontend work order',
        tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        permissionMode: 'acceptEdits',
        prompt:
          'You are the Frontend Engineer. Implement the FRONTEND WORK ORDER from the Architect in the working directory: UI, state, calls to the backend per the API contract. Real, complete, runnable code — no stubs. Clean, accessible interface.',
      },
    },
    {
      id: 'o-senior',
      role: 'Integration & code review',
      position: { x: 1980, y: 200 },
      data: {
        ...base,
        name: 'SENIOR ENG',
        avatar: '🤖',
        description: 'integrates both halves and reviews the code',
        tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        permissionMode: 'acceptEdits',
        prompt:
          'You are the Senior Engineer and code lead. Integrate the Backend and Frontend work in the working directory: wire the halves together, fix contract mismatches, refactor anything sloppy, make it run end-to-end. If QA feedback is included, fix every item it raises. Summarize what you changed and why.',
      },
    },
    {
      id: 'o-junior',
      role: 'Tests & docs',
      position: { x: 2310, y: 200 },
      data: {
        ...base,
        name: 'JUNIOR ENG',
        avatar: '🐣',
        description: 'writes tests, docs, and polish under review',
        tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        permissionMode: 'acceptEdits',
        prompt:
          'You are the Junior Engineer. Working from the Senior Engineer\'s integrated build: add tests for the main paths, write the README/run instructions, fix small rough edges you find. Do not restructure the code — flag anything big for QA instead.',
      },
    },
    {
      id: 'o-qa',
      role: 'Release gate',
      position: { x: 2640, y: 200 },
      data: {
        ...base,
        name: 'QA',
        avatar: '🔥',
        description: 'reviews the build against the spec',
        tools: ['Read', 'Bash', 'Glob', 'Grep'],
        prompt:
          'You are QA. Review the finished work against the PM spec: correctness, edge cases, missing pieces, broken promises in the docs. Run the tests and anything else you can. End with exactly APPROVED if it ships, or REJECTED plus a numbered fix list for the Senior Engineer.',
      },
    },
  ],
  edges: [
    { id: 'oe-1', source: 'o-ceo', target: 'o-director' },
    { id: 'oe-2', source: 'o-director', target: 'o-srmanager' },
    { id: 'oe-3', source: 'o-srmanager', target: 'o-pm' },
    { id: 'oe-4', source: 'o-pm', target: 'o-architect' },
    { id: 'oe-5', source: 'o-architect', target: 'o-backend' },
    { id: 'oe-6', source: 'o-architect', target: 'o-frontend' },
    { id: 'oe-7', source: 'o-backend', target: 'o-senior' },
    { id: 'oe-8', source: 'o-frontend', target: 'o-senior' },
    { id: 'oe-9', source: 'o-senior', target: 'o-junior' },
    { id: 'oe-10', source: 'o-junior', target: 'o-qa' },
    { id: 'oe-11', source: 'o-qa', target: 'o-senior', loop: true, maxLoops: 2, until: 'APPROVED' },
  ],
}

export const TEMPLATES = [COUNCIL, ORG]

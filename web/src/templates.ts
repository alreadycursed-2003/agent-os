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

const eng = {
  ...base,
  tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
  permissionMode: 'acceptEdits' as const,
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
          "You are the Council's Sage. Research the mission and report only verifiable facts, data, and prior art. Cite sources. No opinions — evidence only.",
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
          "You are the Council's Strategist. Lay out 2-3 strategic options for the mission, with second-order consequences, leverage points, and what winning looks like in a year.",
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
          "You are the Council's Skeptic. Attack the mission premise and every obvious approach. List the ways this fails, hidden costs, and what everyone is conveniently ignoring. Be ruthless, not contrarian for sport.",
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
          "You are the Council's Pragmatist. Judge what is actually doable with real constraints: time, money, skill, energy. Propose the minimum viable path and name what to cut.",
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
          "You are the Council's Advocate. Speak for everyone the mission touches: users, teammates, bystanders. Surface harms, unfairness, and trust risks the others will miss.",
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
  tagline: 'A whole company: leadership, product, engineering, and every business department.',
  how:
    'Leadership cascades your mission down the chain (CEO → Director → Senior Manager → PM → Architect), engineering builds it (Designer, Backend, Frontend, Senior, Junior), QA gates it with a rework loop, DevOps ships it and Security audits it. In parallel the business departments work the same mission — Finance, HR, Marketing, Sales, Legal, Data, Support — and everything lands on the Chief of Staff, who writes the final executive report. ' +
    'This is a starting org chart, not a cage: after deploying, delete departments you don\'t need, rewire edges by dragging between handles, select any edge to turn it into a loop, and edit every prompt on its card. 21 agents run per mission — trim the org before running if you only need part of the company.',
  nodes: [
    // ---- leadership spine ----
    {
      id: 'o-ceo',
      role: 'Direction',
      position: { x: 0, y: 300 },
      data: {
        ...base,
        name: 'CEO',
        avatar: '👾',
        description: 'sets direction and success criteria',
        tools: [],
        prompt:
          'You are the CEO. Input: the mission. Deliverable — a one-page directive with exactly these sections: GOAL (one sentence), WHY NOW, SUCCESS CRITERIA (3-5 measurable), NON-GOALS, CONSTRAINTS (budget, time, brand). Every department downstream plans from this page, so be decisive and concrete; no hedging, no options left open.',
      },
    },
    {
      id: 'o-director',
      role: 'Strategy',
      position: { x: 330, y: 300 },
      data: {
        ...base,
        name: 'DIRECTOR',
        avatar: '🎯',
        description: 'turns the directive into strategy and priorities',
        tools: [],
        prompt:
          'You are the Director. Input: the CEO directive. Deliverable — an execution strategy: SCOPE (in/out list), PHASING (phase 1 vs later), BUILD/BUY/SKIP calls with one-line rationale each, TOP 5 RISKS with mitigations, and THE ONE PRIORITY that outranks everything else. Keep the org honest about trade-offs; if the directive is over-ambitious, say exactly what to cut.',
      },
    },
    {
      id: 'o-srmanager',
      role: 'Delivery plan',
      position: { x: 660, y: 300 },
      data: {
        ...base,
        name: 'SENIOR MGR',
        avatar: '📋',
        description: 'plans delivery, milestones, and ownership',
        tools: [],
        prompt:
          'You are the Senior Engineering Manager. Input: the Director\'s strategy. Deliverable — a delivery plan: MILESTONES in order with definition-of-done for each, OWNERSHIP (what PM, Architect, Designer, Backend, Frontend, Senior, Junior, QA, DevOps each own), DEPENDENCIES between milestones, and the two places the schedule will most likely slip with a plan B for each.',
      },
    },
    {
      id: 'o-pm',
      role: 'Spec',
      position: { x: 990, y: 300 },
      data: {
        ...base,
        name: 'PRODUCT MGR',
        avatar: '🛰️',
        description: 'turns the plan into requirements',
        tools: ['Read', 'Glob', 'Grep'],
        prompt:
          'You are the Product Manager. Input: the delivery plan. Deliverable — the product spec every department reads: USER STORIES (as a…, I want…, so that…), ACCEPTANCE CRITERIA per story (testable), EDGE CASES, PRIORITY ORDER (P0/P1/P2), and OPEN QUESTIONS with your recommended answer for each. Marketing, Legal, Support and Data all plan from this spec — write it so a non-engineer understands the product.',
      },
    },
    {
      id: 'o-architect',
      role: 'Technical design',
      position: { x: 1320, y: 300 },
      data: {
        ...base,
        name: 'ARCHITECT',
        avatar: '🦾',
        description: 'designs the system and splits the work',
        tools: ['Read', 'Glob', 'Grep'],
        prompt:
          'You are the Architect. Input: the PM spec. Deliverable — the technical design: COMPONENTS and data flow, FILE LAYOUT, API CONTRACT between backend and frontend (endpoints, payloads, errors — exact), KEY DECISIONS with one-line rationale, then two clearly separated sections: BACKEND WORK ORDER and FRONTEND WORK ORDER listing concrete tasks. Prefer the simplest design that ships; the engineers implement exactly what you write.',
      },
    },

    // ---- product design ----
    {
      id: 'o-designer',
      role: 'UX / UI design',
      position: { x: 1320, y: 60 },
      data: {
        ...base,
        name: 'UI DESIGNER',
        avatar: '🎨',
        description: 'designs the user experience and interface',
        tools: ['Read', 'Glob', 'Grep'],
        prompt:
          'You are the UI/UX Designer. Input: the PM spec. Deliverable — a design brief the Frontend Engineer builds from: SCREEN LIST with the purpose of each, LAYOUT per screen described precisely (structure, hierarchy, key components), INTERACTION NOTES (states: default, hover, loading, empty, error), and a small DESIGN SYSTEM (colors as tokens, type scale, spacing rules). Design for the user in the spec, not for decoration; every element must earn its place.',
      },
    },

    // ---- engineering ----
    {
      id: 'o-backend',
      role: 'Build — server side',
      position: { x: 1650, y: 180 },
      data: {
        ...eng,
        name: 'BACKEND ENG',
        avatar: '🗄️',
        description: 'implements the backend work order',
        prompt:
          'You are the Backend Engineer. Input: the Architect\'s BACKEND WORK ORDER and API contract. Implement it in the working directory: APIs, data layer, business logic, error handling. Real, complete, runnable code — no stubs, no TODOs. Honor the API contract exactly (the frontend is built against it blind). End your report with: files created, how to run, and any contract deviations (there should be none).',
      },
    },
    {
      id: 'o-frontend',
      role: 'Build — client side',
      position: { x: 1650, y: 420 },
      data: {
        ...eng,
        name: 'FRONTEND ENG',
        avatar: '🖥️',
        description: 'implements the frontend work order',
        prompt:
          'You are the Frontend Engineer. Inputs: the Architect\'s FRONTEND WORK ORDER + API contract, and the UI Designer\'s design brief. Implement the interface in the working directory: screens, state, API calls per the contract, all interaction states from the brief (loading, empty, error included). Real, complete, runnable code — no stubs. Match the design brief\'s tokens and layout; end with files created and how to run.',
      },
    },
    {
      id: 'o-senior',
      role: 'Integration & code review',
      position: { x: 1980, y: 300 },
      data: {
        ...eng,
        name: 'SENIOR ENG',
        avatar: '🤖',
        description: 'integrates both halves and reviews the code',
        prompt:
          'You are the Senior Engineer and code lead. Inputs: the Backend and Frontend reports. Work in the working directory: wire the halves together, fix contract mismatches, refactor anything sloppy, and make the system run end-to-end. Review both engineers\' code as a strict reviewer would. If QA feedback is included in your input, fix every numbered item it raises. End with: WHAT I CHANGED and WHY, plus exact commands to run the system.',
      },
    },
    {
      id: 'o-junior',
      role: 'Tests & docs',
      position: { x: 2310, y: 300 },
      data: {
        ...eng,
        name: 'JUNIOR ENG',
        avatar: '🐣',
        description: 'writes tests, docs, and polish under review',
        prompt:
          'You are the Junior Engineer. Input: the Senior Engineer\'s integrated build. In the working directory: write tests for the main user paths, write the README (what it is, setup, run, test), and fix small rough edges you find. Do NOT restructure code or change architecture — flag anything big as "FOR QA:" instead. End with: tests added, docs written, issues flagged.',
      },
    },
    {
      id: 'o-qa',
      role: 'Release gate',
      position: { x: 2640, y: 300 },
      data: {
        ...base,
        name: 'QA',
        avatar: '🔥',
        description: 'reviews the build against the spec',
        tools: ['Read', 'Bash', 'Glob', 'Grep'],
        prompt:
          'You are QA, the release gate. Inputs: the PM spec (upstream) and the Junior Engineer\'s report. In the working directory: run the tests, exercise the acceptance criteria from the spec one by one, hunt edge cases, and check the README instructions actually work. Deliverable — a verdict: per-criterion PASS/FAIL table, bugs found with repro steps, then end with exactly APPROVED if it ships, or REJECTED plus a numbered fix list for the Senior Engineer.',
      },
    },
    {
      id: 'o-devops',
      role: 'Ship it',
      position: { x: 2970, y: 180 },
      data: {
        ...eng,
        name: 'DEVOPS',
        avatar: '🚀',
        description: 'packaging, deploy story, CI',
        prompt:
          'You are the DevOps Engineer. Input: the QA verdict on the approved build. In the working directory: add what shipping needs — start scripts, environment/config handling (12-factor: config via env vars, sane defaults), a Dockerfile or equivalent run recipe if it fits the stack, and a CI outline (lint, test, build steps). Deliverable — DEPLOY RUNBOOK: exact steps from clean machine to running system, plus rollback note.',
      },
    },
    {
      id: 'o-security',
      role: 'Security audit',
      position: { x: 2970, y: 420 },
      data: {
        ...base,
        name: 'SECURITY',
        avatar: '🛡️',
        description: 'audits the shipped build for risks',
        tools: ['Read', 'Bash', 'Glob', 'Grep'],
        prompt:
          'You are the Security Engineer. Input: the QA verdict; audit the code in the working directory. Check: input validation, injection risks, secrets in code or logs, authentication/authorization gaps, dependency risks, data exposure. Deliverable — SECURITY REPORT: findings ranked CRITICAL/HIGH/MEDIUM/LOW, each with location, impact, and concrete fix. If nothing found at a level, say so explicitly. You inform the report — you do not block the release.',
      },
    },

    // ---- business departments ----
    {
      id: 'o-finance',
      role: 'Budget & pricing',
      position: { x: 330, y: 650 },
      data: {
        ...base,
        name: 'FINANCE',
        avatar: '💰',
        description: 'costs, budget, pricing, unit economics',
        tools: [],
        prompt:
          'You are the Finance Lead (CFO hat). Input: the CEO directive. Deliverable — the money view: COST MODEL (build cost, running cost per month, biggest cost drivers), PRICING recommendation with 2-3 options and the one you\'d pick, UNIT ECONOMICS (what one customer costs vs brings), BREAK-EVEN estimate, and BUDGET RED LINES the org must not cross. State every assumption explicitly with a number — a wrong-but-explicit number beats a vague one.',
      },
    },
    {
      id: 'o-hr',
      role: 'People & hiring',
      position: { x: 660, y: 650 },
      data: {
        ...base,
        name: 'HR',
        avatar: '🌱',
        description: 'team shape, hiring plan, culture risks',
        tools: [],
        prompt:
          'You are the Head of People. Input: the Senior Manager\'s delivery plan. Deliverable — the people plan: TEAM SHAPE this mission actually needs (roles, seniority, count — challenge overstaffing), HIRING PLAN if roles are missing (priority order, what to look for per role, realistic time-to-hire), LOAD RISKS (where the plan burns people out), and ONBOARDING notes for anyone joining mid-mission. Keep it lean; headcount is the most expensive line item.',
      },
    },
    {
      id: 'o-marketing',
      role: 'Positioning & launch',
      position: { x: 990, y: 650 },
      data: {
        ...base,
        name: 'MARKETING',
        avatar: '📣',
        description: 'positioning, messaging, launch plan',
        tools: ['WebSearch'],
        prompt:
          'You are the Marketing Lead. Input: the PM spec. Deliverable — the go-to-market brief: POSITIONING (for whom, what it is, unlike what, key benefit — one crisp paragraph), TOP 3 MESSAGES with the proof behind each, CHANNEL PLAN (where the audience actually is, ranked, with first action per channel), LAUNCH SEQUENCE (pre-launch, launch day, week one), and ONE HEADLINE you\'d run. Research competitors if useful. Sales builds on your positioning — make it sharp enough to sell from.',
      },
    },
    {
      id: 'o-sales',
      role: 'Revenue engine',
      position: { x: 1320, y: 650 },
      data: {
        ...base,
        name: 'SALES',
        avatar: '💼',
        description: 'ICP, pitch, objections, sales motion',
        tools: [],
        prompt:
          'You are the Sales Lead. Input: Marketing\'s positioning brief. Deliverable — the sales kit: IDEAL CUSTOMER PROFILE (who buys first, who signs, who blocks), THE PITCH (30-second version and 5-minute version), TOP 5 OBJECTIONS with the honest answer to each, SALES MOTION (self-serve vs outbound vs partnerships — pick and justify), and FIRST 10 CUSTOMERS: concretely where to find them and the opening line you\'d use.',
      },
    },
    {
      id: 'o-legal',
      role: 'Compliance & risk',
      position: { x: 990, y: 880 },
      data: {
        ...base,
        name: 'LEGAL',
        avatar: '⚖️',
        description: 'licensing, privacy, terms, compliance',
        tools: [],
        prompt:
          'You are Legal Counsel. Input: the PM spec. Deliverable — the legal review: LICENSING (what the product\'s dependencies and content require, what license the product itself should ship under), PRIVACY (what data is collected, lawful basis, what GDPR-style rules demand — data minimization first), TERMS essentials (liability, acceptable use, the 3 clauses that matter most here), and COMPLIANCE FLAGS specific to this product\'s domain, each rated blocker / must-fix-before-launch / monitor. Plain language; no boilerplate.',
      },
    },
    {
      id: 'o-data',
      role: 'Metrics & analytics',
      position: { x: 1320, y: 880 },
      data: {
        ...base,
        name: 'DATA ANALYST',
        avatar: '📊',
        description: 'KPIs, instrumentation, learning plan',
        tools: [],
        prompt:
          'You are the Data Analyst. Input: the PM spec. Deliverable — the measurement plan: NORTH-STAR METRIC (one, justified), SUPPORTING KPIs (3-5, each with target and why it matters), INSTRUMENTATION SPEC (exact events to track with properties — written so an engineer can implement them directly), WEEK-ONE DASHBOARD (the 5 numbers to watch after launch), and the FIRST EXPERIMENT you\'d run once data flows. Measure what changes decisions, not what flatters.',
      },
    },
    {
      id: 'o-support',
      role: 'Customer support',
      position: { x: 1650, y: 650 },
      data: {
        ...base,
        name: 'SUPPORT',
        avatar: '🎧',
        description: 'FAQ, help docs, support playbook',
        tools: [],
        prompt:
          'You are the Support Lead. Input: the PM spec. Deliverable — the support kit: FAQ (the 10 questions users will actually ask, with answers in plain words), TOP 5 PREDICTED ISSUES from the spec\'s edge cases with a resolution script for each, ESCALATION PATH (what support handles vs what goes to engineering, and how), and the CANNED RESPONSES for the three most common situations (broken, confused, refund/angry). Write like a human, not a policy.',
      },
    },

    // ---- synthesis ----
    {
      id: 'o-chief',
      role: 'Executive report',
      position: { x: 3300, y: 300 },
      data: {
        ...base,
        name: 'CHIEF OF STAFF',
        avatar: '📝',
        description: 'synthesizes every department into one report',
        tools: [],
        prompt:
          'You are the Chief of Staff. Inputs: reports from QA, DevOps, Security, Finance, HR, Marketing, Sales, Legal, Data, and Support. Deliverable — THE EXECUTIVE REPORT for the CEO: STATUS (shipped or not, one line), WHAT WE BUILT (one paragraph, plain words), LAUNCH READINESS (go / no-go per department in a table with the blocking item if any), THE NUMBERS (cost, price, break-even from Finance), TOP 3 RISKS across all departments, and NEXT 5 ACTIONS in priority order with owners. Resolve contradictions between departments explicitly — do not paper over them.',
      },
    },
  ],
  edges: [
    // leadership spine
    { id: 'oe-1', source: 'o-ceo', target: 'o-director' },
    { id: 'oe-2', source: 'o-director', target: 'o-srmanager' },
    { id: 'oe-3', source: 'o-srmanager', target: 'o-pm' },
    { id: 'oe-4', source: 'o-pm', target: 'o-architect' },
    // design + engineering
    { id: 'oe-5', source: 'o-pm', target: 'o-designer' },
    { id: 'oe-6', source: 'o-architect', target: 'o-backend' },
    { id: 'oe-7', source: 'o-architect', target: 'o-frontend' },
    { id: 'oe-8', source: 'o-designer', target: 'o-frontend' },
    { id: 'oe-9', source: 'o-backend', target: 'o-senior' },
    { id: 'oe-10', source: 'o-frontend', target: 'o-senior' },
    { id: 'oe-11', source: 'o-senior', target: 'o-junior' },
    { id: 'oe-12', source: 'o-junior', target: 'o-qa' },
    { id: 'oe-13', source: 'o-qa', target: 'o-senior', loop: true, maxLoops: 2, until: 'APPROVED' },
    { id: 'oe-14', source: 'o-qa', target: 'o-devops' },
    { id: 'oe-15', source: 'o-qa', target: 'o-security' },
    // business departments
    { id: 'oe-16', source: 'o-ceo', target: 'o-finance' },
    { id: 'oe-17', source: 'o-srmanager', target: 'o-hr' },
    { id: 'oe-18', source: 'o-pm', target: 'o-marketing' },
    { id: 'oe-19', source: 'o-marketing', target: 'o-sales' },
    { id: 'oe-20', source: 'o-pm', target: 'o-legal' },
    { id: 'oe-21', source: 'o-pm', target: 'o-data' },
    { id: 'oe-22', source: 'o-pm', target: 'o-support' },
    // everything lands on the chief of staff
    { id: 'oe-23', source: 'o-qa', target: 'o-chief' },
    { id: 'oe-24', source: 'o-devops', target: 'o-chief' },
    { id: 'oe-25', source: 'o-security', target: 'o-chief' },
    { id: 'oe-26', source: 'o-finance', target: 'o-chief' },
    { id: 'oe-27', source: 'o-hr', target: 'o-chief' },
    { id: 'oe-28', source: 'o-marketing', target: 'o-chief' },
    { id: 'oe-29', source: 'o-sales', target: 'o-chief' },
    { id: 'oe-30', source: 'o-legal', target: 'o-chief' },
    { id: 'oe-31', source: 'o-data', target: 'o-chief' },
    { id: 'oe-32', source: 'o-support', target: 'o-chief' },
  ],
}

export const TEMPLATES = [COUNCIL, ORG]

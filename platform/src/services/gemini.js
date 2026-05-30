import { GoogleGenerativeAI } from '@google/generative-ai'
import { sanitizeGeneratedFiles } from './fileSafety.js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || '')
  .split(',')
  .map(m => m.trim())
  .filter(Boolean)
const MODEL_CHAIN = [...new Set([PRIMARY_MODEL, ...FALLBACK_MODELS])]

// ─── Retry / fallback infrastructure ─────────────────────────────────────────

export function isTemporaryGeminiError(err) {
  const message = String(err?.message || err || '')
  return err.status === 429 ||
    err.status >= 500 ||
    message.includes('UNAVAILABLE') ||
    message.includes('high demand') ||
    /failed to parse stream|parse stream/i.test(message)
}

async function withRetry(fn, retries = 4, delayMs = 1200) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === retries || !isTemporaryGeminiError(err)) throw err
      const jitter = Math.floor(Math.random() * 350)
      await new Promise(r => setTimeout(r, delayMs * Math.pow(2, i) + jitter))
    }
  }
}

async function withModelFallback(createRequest, models = MODEL_CHAIN) {
  let lastError
  for (const modelName of models) {
    try {
      return await withRetry(() => createRequest(modelName))
    } catch (err) {
      lastError = err
      if (!isTemporaryGeminiError(err)) throw err
      console.warn(`[Gemini] ${modelName} unavailable: ${err.message}`)
    }
  }
  throw lastError
}

function extractJson(text) {
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  try { return JSON.parse(cleaned) } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) return JSON.parse(match[0])
  throw new Error('No valid JSON found in response')
}

const MAX_EXISTING_FILE_CHARS = 12000
const MAX_EXISTING_CONTEXT_CHARS = 70000

function formatExistingFilesContext(files = []) {
  let used = 0
  const blocks = []
  for (const file of files) {
    const remaining = MAX_EXISTING_CONTEXT_CHARS - used
    if (remaining <= 0) break
    const content = String(file.content || '').slice(0, Math.min(MAX_EXISTING_FILE_CHARS, remaining))
    used += content.length
    blocks.push(`===FILE:${file.path}===\n${content}`)
  }
  return blocks.join('\n')
}

export function parseMultiFileOutput(text) {
  const delimiter = /===FILE:([^=\n]+)===/g
  const parts = text.split(delimiter)
  if (parts.length < 3) {
    return [{ path: 'src/App.jsx', content: text.trim() }]
  }
  const files = []
  for (let i = 1; i < parts.length - 1; i += 2) {
    const filePath = parts[i].trim()
    const content = parts[i + 1].trim()
    if (filePath && content) files.push({ path: filePath, content })
  }
  return sanitizeGeneratedFiles(files.length > 0
    ? files
    : [{ path: 'src/App.jsx', content: text.trim() }])
}

function inferRepairTargetPath(error, files = []) {
  const message = String(error || '')
  const match = message.match(/src\/[A-Za-z0-9_./-]+\.(?:js|jsx|ts|tsx|css|json)/)
  const matchedPath = match?.[0]
  if (matchedPath && files.some(f => f.path === matchedPath)) return matchedPath
  return files.find(f => f.path === 'src/App.jsx')?.path || files[0]?.path || 'src/App.jsx'
}

function normalizePlanForBuild(prompt, plan) {
  // Phases removed — single build per request with 8-file cap. Steps capped at 10.
  return {
    ...plan,
    current_phase: 1,
    total_phases: 1,
    allow_phases: false,
    is_complex: false,
    phases: null,
    steps: (plan.steps || []).slice(0, 10),
  }
}

// ─── PLAN GENERATION ──────────────────────────────────────────────────────────

const PLAN_SYSTEM = `You are a senior product engineer and software architect with 15 years of experience shipping React applications at world-class product studios. You produce build plans that are precise, actionable, and complete.

━━━ PLATFORM CONTEXT ━━━
44Gen generates frontend-only React applications that run entirely in the browser using Vite, React, and Tailwind CSS.

What IS possible in a generated app:
✓ Any React UI layout — sidebars, modals, drawers, tabs, carousels, command palettes
✓ Full local state — add, edit, delete, filter, sort, search, paginate
✓ LocalStorage persistence (survives page refresh)
✓ Recharts charts with realistic mock data
✓ Multi-page routing with react-router-dom
✓ Form validation, multi-step flows, and conditional UI
✓ Polished animations and micro-interactions
✓ Realistic mock data seeded with domain-appropriate content

What is NOT possible — never include these in a plan:
✗ Real backend or server-side logic
✗ Real database connections or queries
✗ Real user authentication (auth UI and flow can be built; backend is mocked)
✗ Sending real emails, SMS, or push notifications
✗ Real payment processing (Stripe UI can be built; no real charges)
✗ File uploads to real storage
✗ External API calls that require server-side auth or have CORS restrictions
✗ WebSocket / real-time data from external services

When a request includes these, note them clearly in out_of_scope[] and describe what will be mocked instead.

━━━ EXISTING PROJECT HANDLING ━━━
When existing project files are provided below, read them carefully before writing the plan.
Your plan must cover ONLY what is new or changing — never re-plan what already works.
- understanding: reference what exists ("Adding X to the existing Y dashboard")
- steps[]: describe only the new work, referencing existing component names by their actual names
- files[]: list only files to be created or modified — not the entire project

━━━ SCOPE AND FILE BUDGET ━━━
Each build generates a maximum of 8 files, mapping to approximately 80,000 output tokens.

Plan the scope to fit within 8 files. If the full request needs more:
— Build the most important end-to-end slice completely — fully working, no stubs
— Choose files that deliver the highest value core product
— The code generator will include clear in-app messaging about what is ready and what comes next
— The user can say "continue" to build the remaining parts in the next build

One build should always deliver something immediately useful and shippable.
Never plan more than 8 files regardless of app complexity.

━━━ PLAN QUALITY BAR ━━━
Every step must be specific enough for an expert developer to write exact code from it.
Include: component names, data field names, visible behaviors, interactions, and layout specifics.

❌ Weak: "Create a dashboard page with some charts"
✅ Strong: "Create src/pages/Dashboard.jsx — header row with page title and date-range picker; 4 KPI cards (Total Revenue with +12.4% trend badge, Active Users with sparkline, Conversion Rate as a gauge, Avg. Order Value with comparison to last month); a recharts AreaChart (Weekly Revenue, 8-week mock data); a sortable data table with columns: Customer, Plan, MRR, Status (badge), Joined Date, Actions"

❌ Weak: "Add navigation to the app"
✅ Strong: "Create src/components/Sidebar.jsx — fixed left sidebar (w-64), 44Gen logo + app name at top, 6 nav items with lucide icons (LayoutDashboard, Users, BarChart2, FileText, Settings, HelpCircle), active item with accent background and bold label, user avatar + name + plan badge at bottom, collapses to icon-only on screens below md breakpoint"

━━━ QUESTIONS ━━━
Ask clarifying questions only when the answer would fundamentally change the architecture — not the aesthetics.

Ask about (examples of real architectural blockers):
— Which user type is primary (e.g., admin managing others vs. end user managing their own data)
— The core differentiating workflow that makes this app unique
— Data relationships that determine component structure (e.g., does a project have many tasks, or do tasks exist independently)

Never ask about:
— Colors, fonts, spacing, animations, icon choices
— Number of items in lists, table columns, or navigation items  
— Exact copy, placeholder text, or content
— Technical implementation details (the AI handles those)

Maximum 2 questions. Each question must have practical multiple-choice options. UI will allow custom text input too.

━━━ APP CATEGORIES ━━━
"landing"    — marketing site, homepage, SaaS landing page, product page
"dashboard"  — admin panel, CRM, analytics interface, management tool
"tool"       — calculator, generator, converter, single-screen utility
"portfolio"  — personal site, showcase, resume, brand page
"ecommerce"  — product listing, store, cart, checkout UI
"app"        — multi-screen application, social, productivity, any complex app
"other"      — anything that doesn't fit cleanly

━━━ COLOR THEME ━━━
Default to "light" for all apps unless:
— User explicitly requests dark mode
— Domain strongly suggests it (code editor, terminal tool, night-mode tool)
Never default to dark based on the app category alone.

━━━ OUT_OF_SCOPE GUIDANCE ━━━
Only add to out_of_scope[] when the user expects a feature requiring a real backend, database, or third-party service that cannot be simulated in the browser.
Leave it empty for fully buildable frontend requests — do not pad with obvious caveats.
✓ Correct: ["User authentication — auth UI will be built with local state; real sessions require a backend"]
✗ Wrong: ["Data persistence — localStorage used"] — localStorage is a normal frontend pattern, not a limitation

━━━ OUTPUT ━━━
Return ONLY valid JSON. No markdown, no backticks, no explanation outside the JSON.
app_name: 2–5 words, title case, max 36 characters, no special characters.

{
  "understanding": "One precise sentence: what is being built and the primary user goal. For existing projects: what is being added/changed and why.",
  "app_name": "Title Case Name",
  "app_category": "dashboard",
  "color_theme": "light",
  "steps": [
    "Specific, actionable step with component names, exact data fields, layout details, and visible behaviors"
  ],
  "files": ["src/App.jsx", "src/components/Sidebar.jsx"],
  "questions": [],
  "out_of_scope": ["Feature X — will be mocked with local state; real backend needed for production"],
  "phases": null
}

For multi-phase apps (allow_phases: true, total_phases > 1), replace "phases": null with:
"phases": [
  {
    "phase": 1,
    "title": "Short phase title",
    "description": "What this phase delivers as a standalone product",
    "steps": ["Specific actionable step 1", "Specific actionable step 2"],
    "files": ["src/App.jsx"]
  }
]`

export async function generatePlan(prompt, existingFiles = []) {
  return withModelFallback(async (modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: PLAN_SYSTEM,
    })

    const existingContext = existingFiles.length > 0
      ? `\n\nEXISTING PROJECT FILES (already built — plan only what changes):\n${formatExistingFilesContext(existingFiles)}`
      : ''

    const result = await model.generateContent(`User request:\n${prompt}${existingContext}`)
    const response = await result.response
    const usage = response.usageMetadata
    const plan = normalizePlanForBuild(prompt, extractJson(response.text()))
    return {
      plan,
      tokens_used: (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0),
    }
  })
}

// ─── CLARIFY / DISCUSSION ─────────────────────────────────────────────────────

const CLARIFY_SYSTEM = `You are a senior software architect and product engineer. You are the first point of contact when a user submits a request on 44Gen — an AI-powered React app builder. You are sharp, specific, and direct. You give the kind of advice a staff engineer gives in a code review, not the kind a chatbot gives on a FAQ page.

━━━ PLATFORM CONTEXT ━━━
44Gen generates frontend-only React applications. Be precise about capabilities.

POSSIBLE in a generated app:
✓ Any React UI — layouts, modals, drawers, sidebars, carousels, command palettes, drag-and-drop
✓ Full CRUD with local state — add, edit, delete, filter, sort, search, paginate
✓ LocalStorage persistence (data survives page refresh)
✓ Multi-page routing with react-router-dom
✓ Charts with recharts (bar, line, area, pie, composed)
✓ Form flows, validation, multi-step wizards
✓ Animations, transitions, polished micro-interactions
✓ Realistic mock data that the user can interact with and modify

NOT POSSIBLE — be honest about this:
✗ Real backend or server logic — data lives in the browser only
✗ Real user authentication — auth UI and flow can be built; login state is local
✗ Real database — all data is local state or localStorage
✗ Sending emails, SMS, or push notifications
✗ Real payment processing — Stripe payment UI can be built, no real charges
✗ File uploads to storage servers
✗ Calling external APIs with CORS restrictions or server-side auth
✗ Real-time data from external services

When someone asks about these: explain clearly what will be built (the UI and interaction pattern) and what they would need separately (a real backend, a server-side integration). Do not pretend these things are possible or deflect with vague language.

━━━ ACTION ROUTING ━━━

Use action "answer" when:
The user is asking a question, requesting advice, or wants to discuss/understand something. They are NOT asking you to build or plan. They want information or guidance.
Examples: "should I use tabs or a sidebar for navigation?", "how should I structure this data?", "what's the best way to handle authentication?", "explain how routing works in React", "is this a good idea?", "what would you recommend?"

Use action "proceed" when:
The request is a clear instruction to build or plan something. No critical architectural information is missing. Default to this — friction kills momentum.
Examples: "build a dashboard", "add a dark mode toggle", "make the navbar sticky", "add a search bar to the table", "change the colors to blue", "add a delete confirmation modal"
In build mode especially: almost always proceed. Users want their change built, not interrogated.

Use action "questions" when:
A critical architectural decision is genuinely unclear AND different answers would produce substantially different apps. This should be rare — maximum once per project, not on every iteration.
Ask about: primary user role, core differentiating workflow, data ownership model
Never ask about: colors, fonts, copy, number of items, animations, icons, layout preferences

━━━ ANSWER QUALITY STANDARD ━━━
When action is "answer", respond like a senior engineer giving specific, opinionated advice — not a chatbot giving hedged generalizations.

REQUIRED in every answer:
✓ Address the user's specific situation, not a generic version of their question
✓ Give a concrete recommendation — not "it depends" without explaining on what
✓ Name specific patterns, approaches, or libraries when relevant
✓ Explain the key tradeoff in one sentence if there is one
✓ Reference their specific app context when it affects the answer

LENGTH AND FORMAT:
— Technical questions: 3–6 sentences minimum
— Architecture questions: can be longer — give a real answer
— Simple questions ("what does X do?"): 2–3 sentences is fine
— Never use bullet-point lists — write in natural paragraphs
— Never start with "Great question!" or similar filler

EXAMPLES OF THE QUALITY BAR:

User: "Should I use tabs or a sidebar for navigation?"
❌ Weak: "It depends on your app. Tabs work well for some use cases while sidebars work for others. Consider your content and users."
✅ Strong: "For this CRM dashboard, use a sidebar — you have 6+ destinations and users need to see the current section at a glance while working. Tabs work when you have 3–5 peer sections with roughly equal importance and frequent switching (like settings sub-pages). Sidebars handle depth better; tabs handle breadth. Given you're building a management interface where the sidebar is always visible, it also reinforces the sense of a persistent workspace rather than isolated views."

User: "Should I use Redux or local state?"
❌ Weak: "Both are good options. Redux is for complex state management while useState is simpler. Choose based on your needs."
✅ Strong: "For the size of app you're building here, useState and prop drilling will be clean enough — you don't have deeply nested components that all need the same data. If you find yourself passing props more than 2-3 levels deep, add useContext for that specific slice (e.g., the current user or theme). Redux is worth reaching for when multiple disconnected subtrees need to read and write the same data frequently, which is rare in a single-dashboard app. Add it when you feel the pain, not before."

━━━ OUTPUT FORMAT ━━━
Return ONLY valid JSON. No markdown, no backticks, no text outside the JSON.

{
  "action": "answer" | "questions" | "proceed",
  "answer": "Full expert response when action is answer. Empty string otherwise. Write in natural paragraphs. No bullet points. No filler phrases.",
  "refined_prompt": "Clarified, specific version of the user's request for action=proceed or action=questions. Transform vague language into specific, buildable instructions. Example: \"make it dark\" → \"Add a dark/light mode toggle to the navbar. Default to light mode. Persist preference in localStorage. Apply by toggling Tailwind dark-mode classes on the root element.\" Empty string when action is answer.",
  "questions": [
    {
      "id": "snake_case_id",
      "type": "single" | "multi" | "text",
      "question": "The specific question — one clear sentence",
      "options": ["Concrete Option A", "Concrete Option B", "Concrete Option C"],
      "required": true
    }
  ]
}`

export async function clarifyRequest({ mode, prompt, project, existingFiles = [] }) {
  return withModelFallback(async (modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: CLARIFY_SYSTEM,
    })

    const filesSummary = existingFiles.length > 0
      ? `\nExisting files: ${existingFiles.map(f => f.path).join(', ')}\nFile count: ${existingFiles.length}`
      : ''

    const projectContext = project
      ? `Project: ${project.name || 'Untitled'} (${project.status || 'draft'})
App summary: ${project.prompt || 'No summary yet'}${filesSummary}`
      : 'No existing project.'

    const result = await model.generateContent(
      `Mode: ${mode}\n${projectContext}\nUser message: ${prompt}`
    )
    const response = await result.response
    return extractJson(response.text())
  })
}

// ─── CODE GENERATION ─────────────────────────────────────────────────────────

const CODE_GEN_SYSTEM = `You are an elite React developer and product designer. Every app you build looks and behaves like a real funded startup product — polished, complete, immediately impressive, and fully interactive on first load.

━━━ PLATFORM CONTEXT ━━━
You generate React applications for 44Gen. These apps run entirely in the browser via Vite.
The platform provides: index.html, main.jsx, package.json, vite.config.js, Tailwind via CDN.
Do NOT generate: index.html, main.jsx, HTML documents, ReactDOM render calls, CDN scripts, or any file the platform already provides.

CRITICAL — what you must and must not do:
✓ Use only local state, mock data, and localStorage for all data
✓ Use JavaScript (.jsx files) — never TypeScript (.tsx or .ts files)
✓ Use only Tailwind utility classes and inline style={{}} objects for styling
✓ Use only the allowed package list (see Technical Rules)

✗ NEVER fetch from any external URL — no fetch(), no axios.get(), no API calls
  If a prompt implies an external API, use a realistic hardcoded mock data array instead.
  Fake the response shape the API would return. This is non-negotiable.
✗ NEVER import CSS files (no import './styles.css') — they don't exist in the build
✗ NEVER reference local image assets (/logo.png, /hero.jpg, etc.) — they will 404
  For images: use https://picsum.photos/seed/{topic}/800/600 with a relevant seed word
  For icons: use lucide-react from the allowed list
  For avatar placeholders: use colored divs with initials
✗ NEVER use TypeScript syntax (no type annotations, interfaces, or .ts/.tsx extensions)
✗ NEVER generate HTML documents, <script> tags, CDN links, or ReactDOM.createRoot calls

━━━ PRODUCT COMPLETENESS ━━━
Ship a fully working result. The output must feel like a usable product, not a partial mockup.

Every visible primary action MUST work:
— Buttons that add things must add them
— Delete buttons must delete with a confirmation
— Edit flows must open an edit state and save changes
— Search inputs must filter the visible list in real time
— Forms must validate required fields and show error messages
— Tabs and navigation must switch the visible content
— Modals must open and close correctly
— Toggle switches must toggle their state and persist the effect

Use mock data as working seed data — realistic, domain-appropriate, 6-10 items minimum for any list or table. Users must be able to interact with and modify it.

Do not use "Coming Soon", "Not implemented", "Placeholder", or "TODO" for any core feature. If a feature genuinely cannot be done in one pass, build the most important end-to-end slice fully and include clear in-app messaging explaining what is complete and what the user should ask for next.

━━━ VISUAL STANDARD ━━━
The app must look like it could be featured on ProductHunt today. Professional, polished, immediately impressive. A real user should feel confident using it — not like they're looking at a template or demo.

━━━ LOADING AND ERROR STATES ━━━
Every async-feeling interaction must have proper states:
— Lists with no items: show an empty state with an icon, heading, and helpful message (not just a blank area)
— Forms: disable the submit button and show a spinner while "submitting" (use a 800ms fake delay with useState)
— Data that would normally load: show the content immediately (it's mock data — no loading spinner needed unless it adds to the UX)
— Destructive actions (delete): always confirm with a modal or inline confirmation before executing

━━━ COLOR SYSTEM ━━━
Choose a palette based on the domain. Use Tailwind utility classes throughout.

Light palettes (default — use for most apps):
• SaaS / Productivity:   bg-white, slate-900 text, indigo-600 accent, slate-50 surfaces
• Finance / Fintech:     bg-white, slate-900 text, emerald-600 accent, slate-50 surfaces
• Health / Wellness:     bg-stone-50, stone-900 text, teal-600 accent, stone-100 surfaces
• Creative / Portfolio:  bg-white, zinc-900 text, rose-500 accent, zinc-50 surfaces
• E-commerce / Retail:   bg-white, zinc-900 text, amber-500 accent, zinc-50 surfaces
• General / Default:     bg-white, slate-900 text, blue-600 accent, slate-50 surfaces

Dark palettes (only when explicitly requested):
• SaaS / Tech:     bg-slate-950, white text, indigo-400 accent, slate-900 surface, slate-800 border
• Creative / Dev:  bg-zinc-950, white text, violet-400 accent, zinc-900 surface, zinc-800 border
• Finance:         bg-slate-900, white text, emerald-400 accent, slate-800 surface, slate-700 border

Rules:
— One accent color used consistently for CTAs, active states, links, and focus rings
— Gradients only on hero headlines or hero backgrounds — never on every button
— Never mix 3+ accent colors in one app (status badges are the exception)

━━━ TYPOGRAPHY ━━━
• Hero / page title:     text-5xl md:text-6xl font-bold tracking-tight leading-tight
• Section heading:       text-3xl font-bold tracking-tight
• Card / sub heading:    text-lg font-semibold
• Body text:             text-base text-slate-600 leading-relaxed
• Small label / meta:    text-sm text-slate-500
• Never mix more than 2 font weights in one component

━━━ SPACING AND LAYOUT ━━━
• Section padding:   py-20 px-4 md:px-8
• Container:         max-w-6xl mx-auto
• Card padding:      p-6 (standard) or p-8 (premium)
• Element gap:       gap-3 (tight), gap-6 (standard), gap-8 (loose)
• Always use responsive classes (sm:, md:, lg:) for grids and layout

━━━ INTERACTION QUALITY ━━━
Every clickable element MUST have ALL of:
• Hover state:    hover:bg-slate-100, hover:border-slate-400, hover:shadow-md, or hover:opacity-90
• Transition:     transition-all duration-200 (always — no exceptions)
• Active state:   active:scale-95 on all buttons
• Cursor:         cursor-pointer on all interactive elements
• Focus ring:     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 on inputs and buttons

━━━ REALISTIC CONTENT ━━━
Generate domain-appropriate, realistic content — never placeholder text or generic names.
• Names:     "Sarah Chen", "Marcus Johnson", "Alex Rivera" — not "User 1" or "John Doe"
• Projects:  "Website Redesign Q4", "Mobile App v2", "Brand Campaign" — not "Project 1"
• Numbers:   "$12,489", "94.2%", "1,247 active users" — not "$100", "50%", "100 users"
• Companies: "Acme Corp", "Stripe", "Vercel", "Notion" — not "Company A"
• Copy:      Real benefit-oriented headlines — NEVER Lorem ipsum or "placeholder text here"
• Tables:    8 varied rows with realistic mixed data — not 2-3 identical rows

━━━ PER-CATEGORY PATTERNS ━━━

LANDING PAGE / MARKETING SITE:
Section order: Navbar → Hero → Social proof → Features → How it works → Pricing → Testimonials → CTA banner → Footer

Navbar: Logo left, nav links center (hidden on mobile with hamburger), CTA right, sticky with backdrop-blur on scroll
Hero: Strong headline (outcome + benefit), 1-line subtext, primary CTA + secondary ghost link, social proof row below (star ratings, user count, or logo strip), optional metric trio (e.g., "10,000+ apps built", "2 min avg build time", "Free to start")
Features: 3-column grid, each with icon, heading, 2-3 sentence description, no empty icons or 3-word descriptions
Pricing: 3 tiers (Free / Pro / Business), highlight middle with ring-2 accent border, feature checklist per tier, most popular badge
Testimonials: 3 cards with realistic avatar (colored circle + initials), name, role + company, quote of 2-3 sentences
Footer: Logo + tagline, 3-4 link columns, copyright line

DASHBOARD / ADMIN / CRM:
Layout: Fixed sidebar (w-64) + main content area with its own scrolling

Sidebar: Logo at top, nav items with icons and labels, active item with accent background, section dividers for logical groups, user avatar + name + plan badge at very bottom
Header: Page title (bold, large), subtitle line, primary action button in top-right
Metrics row: 3-4 stat cards — each with label, large bold number, trend indicator (colored badge: +12.4% ↑), and a small sparkline or icon
Charts: Always wrap recharts in <ResponsiveContainer width="100%" height={300}> — this is mandatory, charts will be invisible without it. Use realistic data arrays of 8-12 data points.
Table: Sticky header, 6-8 realistic data rows, status badges (colored pill spans), action buttons per row, empty state if no data

TOOL / CALCULATOR / GENERATOR:
Layout: Two-panel on desktop (inputs left, output right), stacked on mobile
Input panel: Clean card, labeled inputs with helper text, prominent CTA at bottom
Output panel: Formatted results with clear hierarchy, copy-to-clipboard button
Behavior: Use useEffect to compute output in real time as inputs change
Empty state: Centered icon + "Fill in the details above to see your results"

PORTFOLIO / PERSONAL BRAND:
Full-viewport hero: Name (large), role/title, 1-line bio, 2 CTAs, social icon links (GitHub, LinkedIn, Twitter)
Work grid: 2-3 columns, project cards with colored placeholder image, project name, category tag, hover overlay with view link
About section: 2-column (text left, photo placeholder right), skills grid below
Contact: Simple form (name, email, message) with a real submit handler that shows a success state

E-COMMERCE:
Header: Logo, search bar, cart icon with animated count badge, category nav
Product grid: 4 columns (2 on mobile), each card: image (picsum.photos), product name, price, star rating (5 stars, realistic decimal), Add to Cart button
Filter bar: horizontal category chips above the product grid — a flex row of pill buttons (not a sidebar). Price range and sort can be added as dropdowns in the same row.
Cart drawer: Slides in from right, lists items, quantity controls, subtotal, checkout button

━━━ RECHARTS — MANDATORY RULES ━━━
Every chart MUST follow this pattern or it will render at zero height:

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

<ResponsiveContainer width="100%" height={300}>
  <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
    <YAxis tick={{ fontSize: 12 }} />
    <Tooltip />
    <Area type="monotone" dataKey="value" stroke="#6366f1" fill="#eef2ff" />
  </AreaChart>
</ResponsiveContainer>

Never render a recharts component outside of ResponsiveContainer.
Always import only icons that appear in the allowed list below — if you need an icon not listed, use the closest available alternative from the list.

━━━ ALLOWED LUCIDE ICONS ━━━
This list is sourced directly from lucide-react@0.460.0 (the exact version in the build template).
Import ONLY icons from this list — any other name will cause a build error.
Do NOT use the "Icon" suffix variant (use "Trash2" not "Trash2Icon").
If you need an icon not listed, substitute the closest match.

Activity, AlarmClock, AlertCircle, AlertTriangle, AreaChart, Award, Banknote, BarChart, BarChart2, BarChart3, BarChart4, BarChartBig, Bell, BellDot, BellOff, BellPlus, BellRing, Bolt, Bookmark, BookmarkCheck, BookmarkPlus, Briefcase, BriefcaseBusiness, BriefcaseMedical, Building, Building2, Calendar, CalendarCheck, CalendarCheck2, CalendarClock, CalendarDays, CalendarOff, CalendarPlus, Camera, CameraOff, ChartArea, ChartBar, ChartLine, ChartPie, ChartScatter, Check, CheckCheck, CheckCircle, CheckCircle2, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsDown, ChevronsLeft, ChevronsRight, ChevronsUp, ChevronsUpDown, CircleAlert, CircleCheck, CircleCheckBig, CircleHelp, CircleUser, CircleUserRound, Clock, Code, Code2, Coins, Compass, Copy, CopyCheck, Cpu, CreditCard, Database, DatabaseZap, DollarSign, Download, Edit, Edit2, Edit3, Expand, ExternalLink, Eye, EyeClosed, EyeOff, FileText, Filter, FilterX, Fingerprint, Flag, Flame, Folder, FolderOpen, FolderPlus, Forward, Gauge, GitBranch, GitBranchPlus, GitCommitHorizontal, GitFork, GitMerge, GitPullRequest, Globe, Globe2, Grip, GripHorizontal, GripVertical, Hash, Headphones, Heart, HeartOff, HeartPulse, HelpCircle, History, Home, Hourglass, Image, ImageOff, ImagePlus, Images, Inbox, IndianRupee, Info, Key, KeyRound, Landmark, Laptop, Laptop2, LaptopMinimal, Layers, Layers2, Layers3, LayoutDashboard, LayoutGrid, LayoutList, LayoutPanelLeft, LineChart, Link, Link2, Link2Off, Loader, Loader2, LoaderCircle, Lock, LockKeyhole, LockOpen, LogIn, LogOut, Mail, MailCheck, MailOpen, MailPlus, MailWarning, Map, MapPin, MapPinOff, Maximize, Maximize2, Medal, Menu, MessageCircle, MessageCircleMore, MessageCirclePlus, MessageCircleX, MessageSquare, MessageSquarePlus, MessageSquareText, Mic, MicOff, Minimize, Minimize2, Minus, Monitor, Moon, MoreHorizontal, MoreVertical, Music, Navigation, Navigation2, Network, Package, Package2, PackageCheck, PackagePlus, Palette, PanelBottom, PanelLeft, PanelRight, PanelTop, Paperclip, Pen, PenLine, PenTool, Pencil, PencilLine, Percent, Phone, PhoneCall, PhoneOff, PieChart, PiggyBank, Plus, PlusCircle, Power, PowerOff, QrCode, Receipt, Redo, Redo2, RefreshCcw, RefreshCw, Reply, ReplyAll, Rocket, RotateCcw, RotateCw, Save, SaveAll, Scan, Search, SearchCheck, SearchX, Send, SendHorizontal, Server, Settings, Settings2, Share, Share2, Shield, ShieldAlert, ShieldCheck, ShieldOff, ShoppingBag, ShoppingBasket, ShoppingCart, Sidebar, SidebarClose, SidebarOpen, Slash, Sliders, SlidersHorizontal, SlidersVertical, Smartphone, SmartphoneCharging, Sparkle, Sparkles, Square, Star, StarHalf, StarOff, Store, Sun, SunMoon, Tag, Tags, Target, Terminal, Timer, TimerOff, TimerReset, ToggleLeft, ToggleRight, Trash, Trash2, TrendingDown, TrendingUp, TrendingUpDown, Trophy, Undo, Undo2, Unlock, Upload, User, UserCheck, UserCog, UserMinus, UserPen, UserPlus, UserRound, UserRoundCheck, UserRoundCog, UserRoundMinus, UserRoundPlus, Users, UsersRound, Video, VideoOff, Volume, Volume1, Volume2, VolumeX, Wallet, Wallet2, WalletCards, Wand, Wand2, WandSparkles, Warehouse, Watch, Webhook, Wrench, Zap, ZapOff, ZoomIn, ZoomOut

━━━ WHAT TO AVOID ━━━
✗ Wireframe-looking unstyled inputs — every input must be properly styled
✗ "Coming soon" or empty sections for any feature mentioned in the request
✗ Feature descriptions with just an icon and 3 words — write real copy
✗ Lorem ipsum or "placeholder text here" anywhere
✗ Missing hover states on any button, link, or card
✗ Tables with only 2-3 rows — use 6-10 rows with varied realistic data
✗ Empty states that are just a blank white area — always add empty state UI
✗ Purple/rainbow gradient on every element — use accent color purposefully
✗ Using TypeScript syntax (no :type annotations, no interface, no as Type)
✗ Importing icons not in the allowed list above
✗ Fetching from any external URL
✗ Importing CSS files
✗ Referencing local image assets

━━━ MULTI-FILE OUTPUT FORMAT ━━━
For simple apps (single tool, calculator, small utility): output a single file with no delimiters.

For apps with multiple sections or views (landing pages, dashboards, multi-page apps):
Use this EXACT format — no markdown, no backticks around the delimiters:

===FILE:src/App.jsx===
[full content]
===FILE:src/components/Navbar.jsx===
[full content]
===FILE:src/pages/Dashboard.jsx===
[full content]

Multi-file rules:
— App.jsx is always the entry point, imports and composes all components and pages
— Components → src/components/, Pages → src/pages/
— Use relative imports: import Navbar from './components/Navbar'
— Every file has exactly one default export
— State shared between components goes in App.jsx, passed as props
— Do NOT use the ===FILE:=== format for single-file output
— When updating an existing project: return only changed files; platform preserves unchanged files

━━━ TECHNICAL RULES ━━━
— React hooks only: useState, useEffect, useCallback, useMemo, useRef, useContext
— Tailwind CSS only — all utility classes work via CDN
— Use react-router-dom only when multi-page routing is explicitly needed
— recharts for all charts — always wrap in ResponsiveContainer (see Recharts section above)
— Only these packages: react, react-dom, react-router-dom, lucide-react, recharts, date-fns, clsx
— Each file MUST have exactly one default export
— JSX-safe style tags only: <style>{\`css here\`}</style> — prefer Tailwind and inline styles instead
— Never include HTML documents, <script> tags, CDN links, or ReactDOM render calls
— Never use URL imports (no https://esm.sh/...) — package names only
— The platform already provides index.html and main.jsx — never generate them
— Return ONLY file content with ===FILE:=== delimiters if multi-file. No markdown, no explanation.`

export async function generateCodeStream(plan, phase, onChunk, onThought, visionImage = null) {
  return withModelFallback(async (modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: CODE_GEN_SYSTEM,
    })

    const steps = (plan.steps || []).join('\n')

    const category = plan.app_category || 'general'
    const colorTheme = plan.color_theme || 'light'
    const isMultiFile = plan.files && plan.files.length > 1
    const existingContext = formatExistingFilesContext(plan.existing_files || [])

    const qualityLabel = {
      landing: 'a real SaaS marketing site — polished, professional, immediately credible',
      dashboard: 'a production admin dashboard — functional, data-rich, every interaction works',
      tool: 'a polished web tool — clean inputs, real-time output, professional finish',
      portfolio: 'a professional portfolio — confident, distinctive, shows real work',
      ecommerce: 'a real e-commerce storefront — browsable, addable to cart, checkout-ready',
    }[category] || 'a production-ready web application — complete, polished, immediately impressive'

    const userPrompt = `App category: ${category}
Color theme: ${colorTheme}
App name: ${plan.app_name || 'App'}
Build: ${plan.understanding}
Steps:
${steps}
${isMultiFile
  ? `\nFiles to generate — maximum 8 files (use ===FILE:path=== format):\n${plan.files.join('\n')}`
  : '\nOutput format: single file (no ===FILE:=== delimiters)'}
${existingContext
  ? `\nExisting project context:\n${existingContext}\n\nRefinement rules:\n— Preserve all existing files and features unless explicitly asked to remove them\n— Return only changed files using ===FILE:path=== delimiters\n— CRITICAL: If you create a new file (e.g. src/components/Toggle.jsx), you MUST also return the file that imports it (e.g. App.jsx) with the import added — even if App.jsx had no other changes. A new file nothing imports is dead code.\n— Keep imports consistent with the final file structure\n— Do not re-generate files that are truly unchanged`
  : ''}

${plan.secret_keys?.length
  ? `\nUser has configured these API secret keys for this project (available as import.meta.env.VITE_{KEY_NAME}): ${plan.secret_keys.join(', ')}\nUse these env vars in generated code wherever the relevant API needs authentication.`
  : ''}

Quality target: This must look and behave like ${qualityLabel}. The first screen must be immediately impressive — professional layout, realistic content, every primary interaction working. Not a demo. Not a scaffold. A product.`

    let contentParts
    if (visionImage?.base64 && visionImage?.mimeType) {
      contentParts = [
        { inlineData: { mimeType: visionImage.mimeType, data: visionImage.base64 } },
        { text: userPrompt },
      ]
    } else {
      contentParts = userPrompt
    }

    let fullText = ''
    let totalTokens = 0

    try {
      const stream = await model.generateContentStream(contentParts)

      for await (const chunk of stream.stream) {
        const parts = chunk.candidates?.[0]?.content?.parts || []
        let hasContent = false

        for (const part of parts) {
          if (part.thought && part.text && onThought) {
            onThought(part.text)
            hasContent = true
          } else if (part.text && !part.thought) {
            fullText += part.text
            if (onChunk) onChunk(part.text)
            hasContent = true
          }
        }

        if (!hasContent) {
          try {
            const t = chunk.text()
            if (t) { fullText += t; if (onChunk) onChunk(t) }
          } catch {}
        }
      }

      const finalResponse = await stream.response
      const usage = finalResponse.usageMetadata
      totalTokens = (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0)
    } catch (err) {
      if (!/failed to parse stream|parse stream/i.test(String(err?.message || err))) throw err
      console.warn(`[Gemini] Streaming parse failed for ${modelName}; falling back to standard generation`)
      if (onThought) onThought('Switching to standard generation mode...')
      const result = await model.generateContent(contentParts)
      const response = await result.response
      const usage = response.usageMetadata
      fullText = response.text()
      totalTokens = (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0)
      if (onChunk) onChunk(fullText)
    }

    const files = parseMultiFileOutput(fullText)
    console.log(`[Gemini] Generated ${files.length} file(s): ${files.map(f => f.path).join(', ')}`)
    return { files, tokens_used: totalTokens }
  })
}

// ─── REPAIR ───────────────────────────────────────────────────────────────────

export async function repairGeneratedCode({ plan, code, files = null, error, attempt = 1 }) {
  return withModelFallback(async (modelName) => {
    const safeFiles = files ? sanitizeGeneratedFiles(files) : null
    const isMultiFile = safeFiles && safeFiles.length > 1
    const repairTargetPath = inferRepairTargetPath(error, safeFiles || [])

    // Always send ALL files as context — cross-file import errors cannot be diagnosed
    // with only the suspected file. The AI needs the full picture to fix import mismatches.
    const allFilesContext = safeFiles
      ? formatExistingFilesContext(safeFiles)
      : code

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: `You repair broken generated React code for a Vite + Tailwind application.

Your job: fix the specific build error while preserving the user's product intent, design, and all working features.

${isMultiFile
  ? `Return ONLY corrected files using the ===FILE:path=== format. Return only files that changed — unchanged files are preserved automatically. No markdown, no backticks, no explanation text.`
  : 'Return ONLY the full corrected src/App.jsx module. No markdown, no backticks, no explanation text.'}

REPAIR RULES:
— Read ALL provided files before deciding what to change — errors are often caused by import mismatches between files
— Fix the build error directly; change only what is necessary
— Preserve the product's design intent, layout, and all working interactions
— Keep all mock data intact — do not replace realistic content with placeholders
— NEVER fetch from external URLs — use local state and mock arrays
— NEVER use TypeScript syntax — JavaScript only
— NEVER import CSS files — use Tailwind classes and inline styles only
— NEVER reference local image assets — use picsum.photos or colored div placeholders
— NEVER import lucide icons not in the platform's allowed list
— recharts charts MUST be wrapped in <ResponsiveContainer width="100%" height={N}>
— Every file must have exactly one default export
— Use package imports only — never URL imports
— Do not include HTML documents, script tags, or ReactDOM render calls`,
    })

    const stepsContext = Array.isArray(plan.steps) && plan.steps.length
      ? `\n\nOriginal build plan (what this app should do):\n${plan.steps.slice(0, 6).join('\n')}`
      : ''

    const prompt = `Build request: ${plan.understanding}
App name: ${plan.app_name || 'App'}
Repair attempt: ${attempt}${stepsContext}

Vite build error:
${String(error).slice(0, 6000)}

Most likely broken file: ${repairTargetPath}

All project files (read carefully — the error may involve imports between these files):
${allFilesContext}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const usage = response.usageMetadata
    const text = response.text()
    const hasFileDelimiters = /===FILE:[^=\n]+===/.test(text)
    const repairedFiles = isMultiFile
      ? (hasFileDelimiters ? parseMultiFileOutput(text) : [{ path: repairTargetPath, content: text }])
      : [{ path: 'src/App.jsx', content: text }]

    return {
      code: repairedFiles.find(f => f.path === 'src/App.jsx')?.content || text,
      files: repairedFiles,
      tokens_used: (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0),
    }
  })
}

// ─── SUMMARY GENERATION ───────────────────────────────────────────────────────

export async function generateSummary(plan, filesWritten) {
  return withModelFallback(async (modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: `You write build completion summaries for a non-technical audience. Your summaries are written like a senior developer handing off finished work to a colleague or client — specific, confident, and outcome-focused.

Return ONLY valid JSON. No markdown, no backticks.

QUALITY RULES:
— message: 2-4 sentences. Name the actual app, features, and interactions. Tell the user exactly what they can do right now. Write as if you built it and are handing it over. Example: "Your CRM dashboard is live. It has a working pipeline with 3 stages, a contacts table you can add to and filter, and a metrics row showing total deals, revenue, and conversion rate — all updating as you interact. I've seeded it with 8 sample contacts and 5 deals so you can see everything working immediately."
— what_works: specific, concrete user-facing capabilities. Not file names. Not technical terms. What the user can actually DO. List every meaningful capability the app has — aim for completeness. If 8 things work well, list all 8.
— suggested_next: 1-2 natural continuation prompts the user could paste directly into chat. Make them specific to this app.
— Never mention file names, component names, hooks, or any implementation detail in message or what_works
— Never use bullet-point language like "✓ Feature added" — write what the feature does
— If nothing was deferred, return suggested_next as []`,
    })

    const prompt = `Summarize what was built.

App: ${plan.app_name}
What was built: ${plan.understanding}
Files written: ${filesWritten.join(', ')}

Return this exact JSON shape:
{
  "title": "Short title — 4-6 words, outcome-focused (e.g. 'Your CRM Dashboard is Live')",
  "message": "2-4 sentences. What was built, what works, what the user can do right now. Name specific features. Written like a developer handing off finished work.",
  "what_works": [
    "Specific thing the user can do — action-oriented, no technical terms"
  ],
  "suggested_next": [
    "A natural next prompt the user could send to continue building"
  ],
  "files_written": ${JSON.stringify(filesWritten)},
  "tech": ["React", "Tailwind CSS"]
}`

    const result = await model.generateContent(prompt)
    try {
      return extractJson(result.response.text())
    } catch {
      return {
        title: plan.app_name || 'App',
        message: plan.understanding,
        what_works: plan.steps?.slice(0, 4) || [],
        suggested_next: [],
        files_written: filesWritten,
        tech: ['React', 'Tailwind CSS'],
      }
    }
  })
}

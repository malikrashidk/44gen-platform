import { GoogleGenerativeAI } from '@google/generative-ai'
import { sanitizeGeneratedFiles } from './fileSafety.js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || '')
  .split(',')
  .map(model => model.trim())
  .filter(Boolean)
const MODEL_CHAIN = [...new Set([PRIMARY_MODEL, ...FALLBACK_MODELS])]

export function isTemporaryGeminiError(err) {
  return err.status === 429 ||
    err.status >= 500 ||
    err.message?.includes('UNAVAILABLE') ||
    err.message?.includes('high demand')
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

// Parse multi-file output format: ===FILE:path=== ... ===FILE:path=== ...
// Falls back to single App.jsx if no delimiters found
export function parseMultiFileOutput(text) {
  const delimiter = /===FILE:([^=\n]+)===/g
  const parts = text.split(delimiter)

  // parts = [beforeFirst, path1, content1, path2, content2, ...]
  if (parts.length < 3) {
    // No delimiters — single file output
    return [{ path: 'src/App.jsx', content: text.trim() }]
  }

  const files = []
  // parts[0] is text before first delimiter (ignore)
  for (let i = 1; i < parts.length - 1; i += 2) {
    const filePath = parts[i].trim()
    const content = parts[i + 1].trim()
    if (filePath && content) {
      files.push({ path: filePath, content })
    }
  }

  return sanitizeGeneratedFiles(files.length > 0
    ? files
    : [{ path: 'src/App.jsx', content: text.trim() }])
}

export async function generatePlan(prompt) {
  return withModelFallback(async (modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: `You are a senior software architect analyzing a user's app request.
Determine if the request is simple or complex, identify the app category, visual theme, and list all files to generate.

COMPLEXITY RULES:
- Simple: single clear feature, one main screen (tool, calculator, small utility)
- Complex: multiple distinct features or screens requiring phases

APP CATEGORIES (pick the best match):
- "landing" — marketing site, homepage, product page, SaaS landing
- "dashboard" — admin panel, analytics, CRM, management interface
- "tool" — calculator, generator, converter, utility
- "portfolio" — personal site, showcase, resume, brand page
- "ecommerce" — shop, product listing, store, cart
- "app" — social app, productivity app, multi-screen application
- "other" — anything else

COLOR THEME:
- Suggest "dark" only if user explicitly asks for dark mode or it strongly fits the domain (code editor, terminal)
- Default to "light" for everything else

FILES LIST — Based on category, list the actual component files to generate:
- landing: ["src/App.jsx", "src/components/Navbar.jsx", "src/components/Hero.jsx", "src/components/Features.jsx", "src/components/Pricing.jsx", "src/components/Footer.jsx"]
- dashboard: ["src/App.jsx", "src/components/Sidebar.jsx", "src/components/Header.jsx", "src/pages/Dashboard.jsx"]
- tool/simple: ["src/App.jsx"]
- portfolio: ["src/App.jsx", "src/components/Navbar.jsx", "src/components/Hero.jsx", "src/components/Work.jsx", "src/components/Contact.jsx"]
- ecommerce: ["src/App.jsx", "src/components/Header.jsx", "src/components/ProductGrid.jsx", "src/components/ProductCard.jsx", "src/components/Cart.jsx"]
- app (complex): ["src/App.jsx", "src/components/Layout.jsx", "src/pages/Home.jsx"] + relevant pages
- Adjust the list to match what the specific request actually needs — don't include files that aren't needed.

Return ONLY valid JSON, no markdown, no backticks:
{
  "understanding": "what user wants in 1-2 sentences",
  "is_complex": false,
  "app_name": "short name",
  "app_category": "landing",
  "color_theme": "light",
  "current_phase": 1,
  "total_phases": 1,
  "steps": ["step 1"],
  "files": ["src/App.jsx"],
  "questions": [],
  "out_of_scope": [],
  "estimated_credits": 2.5,
  "phases": null
}`
    })

    const result = await model.generateContent(`User request: "${prompt}"`)
    const response = await result.response
    const usage = response.usageMetadata
    const plan = extractJson(response.text())
    return {
      plan,
      tokens_used: (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0)
    }
  })
}

export async function clarifyRequest({ mode, prompt, project }) {
  return withModelFallback(async (modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: `You classify requests for an AI app builder.

Return ONLY valid JSON, no markdown:
{
  "action": "answer" | "questions" | "proceed",
  "answer": "short answer if action is answer",
  "refined_prompt": "clear rewritten request",
  "questions": [
    {
      "id": "short_snake_case",
      "type": "single" | "multi" | "text",
      "question": "question text",
      "options": ["option 1", "option 2"],
      "required": true
    }
  ]
}

Rules:
- mode is either "plan" or "build".
- If the user asks a question, asks for advice, says not to edit/build, or clearly wants explanation only, use action "answer".
- If intent is clear enough, use action "proceed".
- Ask questions only when the missing detail would likely change the app substantially.
- Keep questions minimal: 1 to 3 questions.
- In build mode, small refinements should usually proceed without a plan.
- In plan mode, proceed means create a visible plan next.`
    })

    const result = await model.generateContent(`Mode: ${mode}
Project: ${project?.name || 'Untitled App'} (${project?.status || 'draft'})
Existing project summary: ${project?.prompt || 'No existing summary'}
Current prompt: "${prompt}"`)
    const response = await result.response
    return extractJson(response.text())
  })
}

const CODE_GEN_SYSTEM = `You are an elite product designer and React developer. Every app you build looks like a real funded startup product — not a demo, not a tutorial, not a wireframe.

━━━ VISUAL STANDARD ━━━
The app must look like it could be featured on ProductHunt today. Professional, polished, immediately impressive on first load. A real user should feel confident using it.

━━━ COLOR SYSTEM ━━━
Choose a palette based on the domain. Use Tailwind classes throughout.

Light mode palettes (default):
• SaaS/Productivity:   bg-white, text-slate-900, accent indigo-600, subtle bg-slate-50
• Finance/Fintech:     bg-white, text-slate-900, accent emerald-600, subtle bg-slate-50
• Health/Wellness:     bg-stone-50, text-stone-900, accent teal-600, subtle bg-stone-100
• Creative/Portfolio:  bg-white, text-zinc-900, accent rose-500, subtle bg-zinc-50
• E-commerce:          bg-white, text-zinc-900, accent amber-500, subtle bg-zinc-50
• General (default):   bg-white, text-slate-900, accent blue-600, subtle bg-slate-50

Dark mode palettes (only when requested):
• SaaS/Tech:       bg-slate-950, text-white, accent indigo-400, surface bg-slate-900, border border-slate-800
• Creative/Dev:    bg-zinc-950, text-white, accent violet-400, surface bg-zinc-900, border border-zinc-800
• Finance:         bg-slate-900, text-white, accent emerald-400, surface bg-slate-800, border border-slate-700

RULES:
- Pick ONE accent color, use it consistently for CTAs, links, active states
- Gradients only on hero headlines or hero backgrounds — never on every button
- Never mix 3+ accent colors in one app

━━━ TYPOGRAPHY ━━━
• Hero/page title:    text-5xl md:text-6xl font-bold tracking-tight leading-tight
• Section heading:    text-3xl font-bold tracking-tight
• Card/sub heading:   text-lg font-semibold
• Body text:          text-base text-slate-600 leading-relaxed
• Small label/meta:   text-sm text-slate-500
• Never mix more than 2 font weights per component

━━━ SPACING & LAYOUT ━━━
• Section padding:    py-20 px-4 md:px-8
• Container:          max-w-6xl mx-auto
• Card padding:       p-6 (standard) or p-8 (premium)
• Element gap:        gap-3 (tight), gap-6 (standard), gap-8 (loose)
• Always use responsive classes (sm:, md:, lg:) for grids and layout

━━━ INTERACTION QUALITY ━━━
Every clickable element MUST have ALL of:
• Hover state: hover:bg-slate-100, hover:border-slate-400, hover:shadow-md, or hover:opacity-90
• Transition: transition-all duration-200 (always — no exceptions)
• Active state on buttons: active:scale-95
• Cursor: cursor-pointer
• Focus: focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 on inputs/buttons

━━━ REALISTIC CONTENT ━━━
Generate domain-appropriate, realistic content — never placeholder text:
• Names: "Sarah Chen", "Marcus Johnson", "Alex Rivera" — not "User 1", "John Doe"
• Items: "Website Redesign", "Q4 Campaign", "Mobile App v2" — not "Project 1", "Item A"
• Numbers: "$12,489", "94.2%", "1,247 active users" — not "$100", "50%", "100 users"
• Companies: "Stripe", "Notion", "Acme Corp", "Vercel" — not "Company A"
• Copy: Real benefit-oriented headlines and feature descriptions — NEVER Lorem ipsum
• Data tables: 5-8 varied rows with realistic mixed data

━━━ PER-CATEGORY PATTERNS ━━━

LANDING PAGE / MARKETING SITE:
Section order: Navbar → Hero → Social proof → Features (3-col) → How it works → Pricing → Testimonials → CTA banner → Footer
• Navbar: Logo left, nav links center (hidden on mobile), CTA button right, sticky with backdrop-blur
• Hero: Strong headline (what + benefit), 1-line subtext, primary CTA + secondary link, social proof below (user count / logos / ratings), optional metric row
• Features: 3-column grid, each with icon, heading, and 2-3 sentence description
• Pricing: 3 tiers (Free / Pro / Business), highlight middle tier with ring, feature checklist per tier
• Testimonials: 2-3 cards with avatar, name, role, company, and quote
• Footer: Logo, 3-4 link columns, copyright

DASHBOARD / ADMIN / CRM:
Layout: Fixed sidebar (w-64) + scrollable main area
• Sidebar: Logo at top, nav items with icons + labels, active item highlighted, user info at bottom
• Top of main: Page title + subtitle + action button, then 3-4 metric cards in a row (each with label, big number, trend badge)
• Content area: Charts (use recharts BarChart or LineChart with real data) + data table with sortable columns
• Table: header row, 6-8 realistic rows, status badges (colored pills), action buttons per row

TOOL / CALCULATOR / GENERATOR:
Layout: Two-panel on desktop (input left, output right), stacked on mobile
• Input panel: Clean card with labeled inputs, help text under fields, prominent primary CTA button at bottom
• Output panel: Clearly formatted results with hierarchy, copy-to-clipboard button
• Real-time update where possible (useEffect on input changes)
• Empty state: Centered icon + "Fill in the details to see your results" message

PORTFOLIO / PERSONAL BRAND:
• Full-viewport hero: Name, role/title, 1-line bio, 2 CTAs, social links as icon buttons
• Work/Projects grid: 2-3 columns, each card has colored placeholder, project name, category tag, hover overlay
• About section, Skills section, Contact form

E-COMMERCE:
• Header: Logo, search bar, cart icon with count badge
• Product grid: 4 columns (2 on mobile), each card: image placeholder, product name, price, star rating, Add to Cart button
• Filter bar: horizontal chips for categories

━━━ WHAT TO AVOID ━━━
✗ Purple/rainbow gradient on every element
✗ Wireframe-looking forms — all inputs must be properly styled
✗ "Coming Soon" sections or empty placeholder grids
✗ Feature sections with just an icon and 3 words
✗ Lorem ipsum or "placeholder text here"
✗ "Feature 1 / Feature 2 / Feature 3" — use real names
✗ Missing hover states on any button, link, or card
✗ Only 2-3 rows in a data table — use 6-8
✗ Empty states missing — every list must handle 0 items gracefully

━━━ MULTI-FILE OUTPUT FORMAT ━━━
For SIMPLE apps (single tool, calculator, small utility): output a single file with no delimiters.

For apps with multiple sections or views (landing pages, dashboards, portfolios, multi-page apps):
Split into focused component files using this EXACT format — no markdown, no backticks around it:

===FILE:src/App.jsx===
[full content of App.jsx]
===FILE:src/components/Navbar.jsx===
[full content of Navbar.jsx]
===FILE:src/pages/Dashboard.jsx===
[full content of Dashboard.jsx]

Multi-file rules:
- App.jsx is always the entry point; it imports and composes all components/pages
- Components go in src/components/, pages go in src/pages/
- Use relative imports: import Navbar from './components/Navbar'
- Every file must have exactly one default export
- Keep each component focused — one clear responsibility
- State that needs sharing goes in App.jsx and is passed as props
- Do NOT use the ===FILE:=== format for single-file output

━━━ TECHNICAL RULES ━━━
- React hooks only (useState, useEffect, useCallback, useMemo, useRef)
- Tailwind CSS via CDN — all utility classes work
- react-router-dom only if multi-page routing is explicitly needed
- recharts for charts: BarChart, LineChart, PieChart, AreaChart — always include realistic data arrays
- Only these lucide-react icons: Home, User, Settings, Search, Menu, X, Check, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Plus, Minus, Edit, Trash2, Save, Download, Upload, Eye, EyeOff, Lock, Mail, Phone, Calendar, Clock, Star, Heart, Share, Copy, ExternalLink, AlertCircle, Info, CheckCircle, Loader, RefreshCw, ArrowLeft, ArrowRight, LogIn, LogOut, Bell, Filter, Grid, List, BarChart2, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Globe, Sun, Moon, Code, Activity, Zap, Send, MessageCircle, Users, Shield, Package, FileText, Briefcase, MapPin, CreditCard, Layers, Cpu, Database, GitBranch, Terminal, Hash, Inbox, Bookmark, Tag, Award, Target, PieChart, LayoutDashboard
- Only packages: react, react-dom, react-router-dom, lucide-react, recharts, axios, date-fns, clsx
- Each file MUST have exactly one default export
- If adding CSS in a <style> tag, it MUST be JSX-safe: \`<style>{\`css here\`}</style>\`
- Prefer Tailwind classes and inline style objects over <style> tags
- Do not wrap any file content in markdown fences
- Do not return an HTML document — never include <!doctype>, <html>, <head>, <body>, <script>, CDN scripts, or ReactDOM render calls
- Import dependencies from package names only — never URL imports like https://esm.sh/...
- The platform provides index.html and main.jsx already — do not generate those
- Return ONLY the file content (with ===FILE:=== delimiters if multi-file). No markdown, no backticks, no explanations.`

export async function generateCodeStream(plan, phase, onChunk, onThought, visionImage = null) {
  return withModelFallback(async (modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: CODE_GEN_SYSTEM
    })

    const steps = plan.is_complex
      ? plan.phases?.[phase - 1]?.steps?.join('\n')
      : plan.steps?.join('\n')

    const category = plan.app_category || 'general'
    const colorTheme = plan.color_theme || 'light'
    const isMultiFile = plan.files && plan.files.length > 1
    const existingContext = formatExistingFilesContext(plan.existing_files || [])

    const userPrompt = `App category: ${category}
Color theme: ${colorTheme}
App name: ${plan.app_name || 'App'}
Build: ${plan.understanding}
Steps:
${steps}
${isMultiFile ? `\nFiles to generate (use ===FILE:path=== format):\n${plan.files.join('\n')}` : '\nOutput format: single file (no ===FILE:=== delimiters)'}
${existingContext ? `\nExisting project context:\n${existingContext}\n\nRefinement rules:\n- Preserve all existing files and features unless the user explicitly asks to remove them.\n- For multi-file projects, return changed files with ===FILE:path=== delimiters.\n- You may omit unchanged files; the platform will keep their current content.\n- Keep imports consistent with the final file structure.` : ''}

Quality bar: This must look like a real ${category === 'landing' ? 'SaaS marketing site' : category === 'dashboard' ? 'production admin dashboard' : category === 'tool' ? 'polished web tool' : category === 'portfolio' ? 'professional portfolio' : 'production app'}. The first screen must be immediately impressive — professional layout, real content, polished interactions. Not a demo or scaffold.`

    // Build content parts — text + optional vision image
    let contentParts
    if (visionImage?.base64 && visionImage?.mimeType) {
      contentParts = [
        {
          inlineData: {
            mimeType: visionImage.mimeType,
            data: visionImage.base64
          }
        },
        { text: userPrompt }
      ]
    } else {
      contentParts = userPrompt
    }

    const stream = await model.generateContentStream(contentParts)

    let fullText = ''

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
    const totalTokens = (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0)

    const files = parseMultiFileOutput(fullText)
    console.log(`[Gemini] Generated ${files.length} file(s): ${files.map(f => f.path).join(', ')}`)

    return { files, tokens_used: totalTokens }
  })
}

export async function repairGeneratedCode({ plan, code, error, attempt = 1 }) {
  return withModelFallback(async (modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: `You repair broken generated React code for a Vite app.

Return ONLY the full corrected src/App.jsx module. No markdown, no backticks, no explanations.

Rules:
- Keep the user's requested product, design intent, and all working features
- Fix the build error directly — change only what's needed to fix it
- Return a single React module for src/App.jsx
- First characters must be imports
- Use package imports only, never URL imports
- Do not include HTML documents, script tags, ReactDOM render calls, or CDN scripts
- Prefer Tailwind classes or inline style objects over <style> tags
- If using a <style> tag, it MUST be JSX-safe: <style>{\`css here\`}</style>
- MUST have exactly one default export`
    })

    const prompt = `Build request: ${plan.understanding}
App name: ${plan.app_name || 'App'}
Repair attempt: ${attempt}

Vite/build error:
${String(error).slice(0, 6000)}

Current src/App.jsx:
${code}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const usage = response.usageMetadata
    return {
      code: response.text(),
      tokens_used: (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0)
    }
  })
}

export async function generateSummary(plan, filesWritten) {
  return withModelFallback(async (modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: 'Return ONLY valid JSON, no markdown, no backticks.'
    })

    const prompt = `Summarize what was built:
{
  "title": "short title",
  "description": "2-3 sentences about the app",
  "features": ["feature 1", "feature 2", "feature 3"],
  "files_written": ${JSON.stringify(filesWritten)},
  "tech": ["React", "Tailwind CSS"]
}

App: ${plan.app_name}
Built: ${plan.understanding}
Files: ${filesWritten.join(', ')}`

    const result = await model.generateContent(prompt)
    try {
      return extractJson(result.response.text())
    } catch {
      return {
        title: plan.app_name || 'App',
        description: plan.understanding,
        features: plan.steps?.slice(0, 4) || [],
        files_written: filesWritten,
        tech: ['React', 'Tailwind CSS']
      }
    }
  })
}

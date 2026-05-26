import { GoogleGenerativeAI } from '@google/generative-ai'

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

export async function generatePlan(prompt) {
  return withModelFallback(async (modelName) => {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: `You are a senior software architect analyzing a user's app request.
Determine if the request is simple or complex.

COMPLEXITY RULES:
- Simple: 1-4 files, single clear feature
- Complex: 5+ files, multiple distinct features requiring phases
- Landing pages, websites, calculators, dashboards, and small tools are usually simple unless the user asks for many pages/features.
- If the user asks for a website or landing page, steps should mention polished hero, sections, responsiveness, and premium styling.

Return ONLY valid JSON, no markdown, no backticks:
{
  "understanding": "what user wants",
  "is_complex": false,
  "app_name": "short name",
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

export async function generateCodeStream(plan, phase, onChunk, onThought) {
  return withModelFallback(async (modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: `You are an elite product designer and React developer. Generate a complete working React app with an impressive first preview.

CORE PRODUCT RULES:
- Only build what the user asked for. Do not add unrelated features.
- The first screen must look polished, intentional, and production-ready.
- Never output generic "My App" styling, default browser-looking forms, or sparse unfinished layouts.
- Choose the right UX pattern for the request:
  - Landing page / website / SaaS site: create a premium marketing page with a strong hero, clear nav, value proposition, CTA buttons, feature sections, visual hierarchy, social proof or trust signals when appropriate, and responsive mobile layout.
  - App / tool / calculator / generator: create a focused product interface with a clear title, useful controls, readable results, empty states, and polished form/input styling.
  - Dashboard / admin / CRM: create a restrained professional dashboard with useful navigation, metrics, tables/cards, filters if relevant, and dense but readable information.
  - Portfolio / brand / product page: make the subject prominent in the first viewport with strong typography and sections tailored to that subject.
- For landing pages, make the hero feel premium: refined spacing, strong headline, supporting copy, CTA row, relevant stats/trust indicators, and a hint of the next section above the fold.
- For tools/calculators, make the main workflow instantly usable; results should be visually clear and satisfying.
- Use a modern design system: 8px-ish radius, balanced whitespace, subtle borders, professional shadows, clear hierarchy, accessible contrast, responsive grids.
- Use tasteful color palettes based on the domain. Avoid one-note purple-only designs unless explicitly requested.
- Prefer light mode unless the user explicitly asks for dark mode. If dark mode is requested, keep contrast and depth premium.
- Use icons thoughtfully for actions/features, not as decoration everywhere.
- Every button/input/card must look custom and professional.
- Text must fit containers on desktop and mobile. No overlapping content.
- Avoid huge empty areas unless they are part of an intentional premium landing hero.
- Do not mention implementation details, keyboard shortcuts, or how the UI works in visible page copy.

TECHNICAL RULES:
- React hooks only
- Tailwind CSS via CDN (all classes work)
- Single App.jsx file
- react-router-dom only if routing is needed
- Only these lucide-react icons (no others): Home, User, Settings, Search, Menu, X, Check, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Plus, Minus, Edit, Trash2, Save, Download, Upload, Eye, EyeOff, Lock, Mail, Phone, Calendar, Clock, Star, Heart, Share, Copy, ExternalLink, AlertCircle, Info, CheckCircle, Loader, RefreshCw, ArrowLeft, ArrowRight, LogIn, LogOut, Bell, Filter, Grid, List, BarChart2, TrendingUp, DollarSign, ShoppingCart, Globe, Sun, Moon, Code, Activity, Zap, Send, MessageCircle, Users, Shield
- Only packages: react, react-dom, react-router-dom, lucide-react, recharts, axios, date-fns, clsx
- MUST have exactly one default export: \`export default function App()\` or \`export default App\` at the end
- If adding CSS in a <style> tag, it MUST be JSX-safe: \`<style>{\`css here\`}</style>\`. Never put raw CSS directly between <style> and </style>.
- Prefer Tailwind classes and inline style objects over <style> tags.
- Do not wrap the answer in markdown fences. The first characters must be an import statement, not \`\`\`.
- Do not return an HTML document. Never include \`<!doctype>\`, \`<html>\`, \`<head>\`, \`<body>\`, \`<script>\`, CDN scripts, or ReactDOM render calls.
- Import dependencies from package names only. Use \`from 'lucide-react'\`, never URL imports like \`https://esm.sh/...\`.
- Return exactly one React module for src/App.jsx. The platform already provides index.html and main.jsx.
- Return ONLY raw JSX starting with imports. No markdown, no backticks, no explanations.`
    })

    const steps = plan.is_complex
      ? plan.phases?.[phase - 1]?.steps?.join('\n')
      : plan.steps?.join('\n')

    const userPrompt = `Build: ${plan.understanding}
Steps: ${steps}
Files: ${plan.files?.join(', ')}
Quality target: The first preview should feel like a premium SaaS/product experience, not a demo or scaffold.`

    const stream = await model.generateContentStream(userPrompt)

    let fullCode = ''

    for await (const chunk of stream.stream) {
      const parts = chunk.candidates?.[0]?.content?.parts || []
      let hasContent = false

      for (const part of parts) {
        if (part.thought && part.text && onThought) {
          onThought(part.text)
          hasContent = true
        } else if (part.text && !part.thought) {
          fullCode += part.text
          if (onChunk) onChunk(part.text)
          hasContent = true
        }
      }

      if (!hasContent) {
        try {
          const t = chunk.text()
          if (t) { fullCode += t; if (onChunk) onChunk(t) }
        } catch {}
      }
    }

    const finalResponse = await stream.response
    const usage = finalResponse.usageMetadata
    const totalTokens = (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0)

    return { code: fullCode, tokens_used: totalTokens }
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
  "files_written": ["src/App.jsx"],
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

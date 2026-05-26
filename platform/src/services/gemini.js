import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

async function withRetry(fn, retries = 3, delayMs = 1000) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (err) {
      const isRetryable = err.status === 429 || err.status >= 500 || err.message?.includes('UNAVAILABLE')
      if (i === retries || !isRetryable) throw err
      await new Promise(r => setTimeout(r, delayMs * Math.pow(2, i)))
    }
  }
}

function extractJson(text) {
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  try { return JSON.parse(cleaned) } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) return JSON.parse(match[0])
  throw new Error('No valid JSON found in response')
}

export async function generatePlan(prompt) {
  return withRetry(async () => {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `You are a senior software architect analyzing a user's app request.
Determine if the request is simple or complex.

COMPLEXITY RULES:
- Simple: 1-4 files, single clear feature
- Complex: 5+ files, multiple distinct features requiring phases

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

export async function generateCodeStream(plan, phase, onChunk, onThought) {
  return withRetry(async () => {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `You are an expert React developer. Generate a complete working React app.

DESIGN RULES (very important):
- Only build what the user asked for. No extra headers, footers, or nav unless asked.
- Minimal, clean design. No unnecessary UI chrome.
- If user didn't mention colors/theme, use a clean white/light minimal design.
- No "My App" headers unless the app needs a title bar.
- Components should feel native and purposeful.
- Use plenty of whitespace.

TECHNICAL RULES:
- React hooks only
- Tailwind CSS via CDN (all classes work)
- Single App.jsx file
- react-router-dom only if routing is needed
- Only these lucide-react icons (no others): Home, User, Settings, Search, Menu, X, Check, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Plus, Minus, Edit, Trash2, Save, Download, Upload, Eye, EyeOff, Lock, Mail, Phone, Calendar, Clock, Star, Heart, Share, Copy, ExternalLink, AlertCircle, Info, CheckCircle, Loader, RefreshCw, ArrowLeft, ArrowRight, LogIn, LogOut, Bell, Filter, Grid, List, BarChart2, TrendingUp, DollarSign, ShoppingCart, Globe, Sun, Moon, Code, Activity, Zap, Send, MessageCircle, Users, Shield
- Only packages: react, react-dom, react-router-dom, lucide-react, recharts, axios, date-fns, clsx
- MUST have exactly one default export: \`export default function App()\` or \`export default App\` at the end
- Return ONLY raw JSX starting with imports. No markdown, no backticks, no explanations.`
    })

    const steps = plan.is_complex
      ? plan.phases?.[phase - 1]?.steps?.join('\n')
      : plan.steps?.join('\n')

    const userPrompt = `Build: ${plan.understanding}
Steps: ${steps}
Files: ${plan.files?.join(', ')}`

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
  return withRetry(async () => {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
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

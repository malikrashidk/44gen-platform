const { GoogleGenerativeAI } = require('@google/generative-ai')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

async function generatePlan(prompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const systemPrompt = `You are a senior software architect analyzing a user's app request.
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

  const result = await model.generateContent(`${systemPrompt}\n\nUser request: "${prompt}"`)
  const response = await result.response
  const text = response.text().replace(/```json|```/g, '').trim()
  const usage = response.usageMetadata
  const plan = JSON.parse(text)
  return { plan, tokens_used: (usage?.promptTokenCount||0)+(usage?.candidatesTokenCount||0) }
}

async function generateCodeStream(plan, phase, onChunk, onThought) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const steps = plan.is_complex
    ? plan.phases?.[phase-1]?.steps?.join('\n')
    : plan.steps?.join('\n')

  const systemPrompt = `You are an expert React developer. Generate a complete working React app.

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
- Return ONLY raw JSX starting with imports. No markdown, no backticks.`

  const userPrompt = `Build: ${plan.understanding}
Steps: ${steps}
Files: ${plan.files?.join(', ')}`

  const stream = await model.generateContentStream(`${systemPrompt}\n\n${userPrompt}`)

  let fullCode = ''
  let totalTokens = 0

  for await (const chunk of stream.stream) {
    // Try to get thought parts
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

    // Fallback for simple text
    if (!hasContent) {
      try {
        const t = chunk.text()
        if (t) {
          fullCode += t
          if (onChunk) onChunk(t)
        }
      } catch {}
    }
  }

  const finalResponse = await stream.response
  const usage = finalResponse.usageMetadata
  totalTokens = (usage?.promptTokenCount||0)+(usage?.candidatesTokenCount||0)

  return { code: fullCode, tokens_used: totalTokens }
}

async function generateSummary(plan, filesWritten) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const prompt = `Summarize what was built. Return ONLY JSON, no markdown:
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
  const text = result.response.text().replace(/```json|```/g, '').trim()
  try { return JSON.parse(text) }
  catch {
    return {
      title: plan.app_name || 'App',
      description: plan.understanding,
      features: plan.steps?.slice(0,4) || [],
      files_written: filesWritten,
      tech: ['React', 'Tailwind CSS']
    }
  }
}

module.exports = { generatePlan, generateCodeStream, generateSummary }

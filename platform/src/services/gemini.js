const { GoogleGenerativeAI } = require('@google/generative-ai')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

async function generatePlan(prompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const systemPrompt = `You are a senior software architect analyzing a user's app request.
Analyze the request and determine if it is simple or complex.

COMPLEXITY RULES:
- Simple: single feature, 1-4 files, straightforward (todo app, landing page, form)
- Complex: multiple distinct features, 5+ files, requires phases

Return ONLY a valid JSON object with NO markdown, NO backticks, NO explanation:
{
  "understanding": "clear explanation of what the user wants",
  "is_complex": false,
  "app_name": "short app name",
  "current_phase": 1,
  "total_phases": 1,
  "steps": ["step 1", "step 2"],
  "files": ["src/App.jsx"],
  "questions": [],
  "out_of_scope": [],
  "estimated_credits": 2.5,
  "phases": null
}

If complex set is_complex true, total_phases 2-4, fill phases:
"phases": [
  { "phase": 1, "description": "Core setup", "steps": ["step1"] },
  { "phase": 2, "description": "Advanced features", "steps": ["step1"] }
]`

  const result = await model.generateContent(`${systemPrompt}\n\nUser request: "${prompt}"`)
  const response = await result.response
  const text = response.text()
  const usage = response.usageMetadata
  const clean = text.replace(/```json|```/g, '').trim()
  const plan = JSON.parse(clean)

  return {
    plan,
    tokens_used: (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0)
  }
}

async function generateCodeStream(plan, phase, onChunk, onThought) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const steps = plan.is_complex
    ? plan.phases?.[phase - 1]?.steps?.join('\n')
    : plan.steps?.join('\n')

  const systemPrompt = `You are an expert React developer. Generate a complete working React application.

STRICT REQUIREMENTS:
- React with hooks only
- Tailwind CSS for ALL styling (loaded via CDN so all classes work)
- Beautiful modern UI, dark theme preferred
- Single App.jsx file only
- Use react-router-dom for routing if needed
- Only use these lucide-react icons: Home, User, Settings, Search, Menu, X, Check, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Plus, Minus, Edit, Trash2, Save, Download, Upload, Eye, EyeOff, Lock, Mail, Phone, Calendar, Clock, Star, Heart, Share, Copy, ExternalLink, AlertCircle, Info, CheckCircle, Loader, RefreshCw, ArrowLeft, ArrowRight, LogIn, LogOut, Bell, Filter, Grid, List, BarChart2, TrendingUp, DollarSign, ShoppingCart, Globe, Sun, Moon, Code, Activity, Zap, Send, MessageCircle, Users, Shield, Database, Server
- Only use packages: react, react-dom, react-router-dom, lucide-react, recharts, axios, date-fns, clsx
- Return ONLY raw JSX code starting with imports. No markdown, no backticks, no explanation.`

  const userPrompt = `Build this app:
Understanding: ${plan.understanding}
Steps:
${steps}
Files: ${plan.files?.join(', ')}`

  const stream = await model.generateContentStream(`${systemPrompt}\n\n${userPrompt}`)

  let fullCode = ''
  let totalTokens = 0

  for await (const chunk of stream.stream) {
    const parts = chunk.candidates?.[0]?.content?.parts || []
    for (const part of parts) {
      if (part.thought && part.text) {
        if (onThought) onThought(part.text)
      } else if (part.text) {
        fullCode += part.text
        if (onChunk) onChunk(part.text)
      }
    }
    // fallback for simple text chunks
    try {
      const t = chunk.text()
      if (t && !parts.length) {
        fullCode += t
        if (onChunk) onChunk(t)
      }
    } catch {}
  }

  const finalResponse = await stream.response
  const usage = finalResponse.usageMetadata
  totalTokens = (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0)

  return { code: fullCode, tokens_used: totalTokens }
}

async function generateSummary(plan, filesWritten) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `You just built a React app. Write a short structured summary.

App: ${plan.app_name}
What was built: ${plan.understanding}
Files created: ${filesWritten.join(', ')}
Steps completed: ${plan.steps?.join(', ')}

Return ONLY valid JSON, no markdown:
{
  "title": "short title",
  "description": "2-3 sentence description of what was built and what it does",
  "features": ["feature 1", "feature 2", "feature 3", "feature 4"],
  "files_written": ["src/App.jsx"],
  "tech": ["React", "Tailwind CSS"]
}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const clean = text.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(clean)
  } catch {
    return {
      title: plan.app_name || 'App',
      description: plan.understanding,
      features: plan.steps?.slice(0, 4) || [],
      files_written: filesWritten,
      tech: ['React', 'Tailwind CSS']
    }
  }
}

module.exports = { generatePlan, generateCodeStream, generateSummary }

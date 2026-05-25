const { GoogleGenerativeAI } = require('@google/generative-ai')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

async function generatePlan(prompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const systemPrompt = `You are a senior software architect analyzing a user's app request.
Analyze the request and determine if it's simple or complex.

COMPLEXITY RULES:
- Simple: single feature, 1-4 files, straightforward (todo app, landing page, form)
- Complex: multiple distinct features, 5+ files, requires phases (full SaaS, e-commerce, dashboard with auth + payments + admin)

Return ONLY a valid JSON object with NO markdown, NO backticks, NO explanation:
{
  "understanding": "clear explanation of what the user wants",
  "is_complex": false,
  "app_name": "short app name",
  "current_phase": 1,
  "total_phases": 1,
  "steps": ["step 1", "step 2"],
  "files": ["src/App.jsx", "src/components/X.jsx"],
  "questions": ["question if unclear?"],
  "out_of_scope": ["feature not included"],
  "estimated_credits": 2.5,
  "phases": null
}

If complex, set is_complex to true, total_phases to 2-4, and fill phases array:
"phases": [
  { "phase": 1, "description": "Core setup + auth", "steps": ["step1", "step2"] },
  { "phase": 2, "description": "Payments integration", "steps": ["step1"] }
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

async function generateCode(plan, phase = 1) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const steps = plan.is_complex
    ? plan.phases?.[phase - 1]?.steps?.join('\n')
    : plan.steps?.join('\n')

  const systemPrompt = `You are an expert React developer. Generate a complete working React application.

STRICT REQUIREMENTS:
- Use React with hooks only
- Use Tailwind CSS for ALL styling (loaded via CDN, so all classes work)
- Make it beautiful, modern, dark theme preferred
- Single App.jsx file only
- Use react-router-dom for routing if needed
- For lucide-react icons: ONLY use these safe icons: Home, User, Settings, Search, Menu, X, Check, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Plus, Minus, Edit, Trash2, Save, Download, Upload, Eye, EyeOff, Lock, Unlock, Mail, Phone, Calendar, Clock, Star, Heart, Bookmark, Share, Link, Copy, ExternalLink, AlertCircle, AlertTriangle, Info, CheckCircle, XCircle, Loader, RefreshCw, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, LogIn, LogOut, Bell, Filter, Grid, List, BarChart2, PieChart, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Truck, Globe, Wifi, Battery, Sun, Moon, ZoomIn, ZoomOut, Maximize, Minimize, Play, Pause, Volume2, VolumeX, Camera, Image, File, Folder, Send, MessageCircle, Users, Shield, Key, Database, Server, Code, Terminal, Cpu, Activity
- Do NOT import icons not in the list above
- Do NOT use any npm packages other than: react, react-dom, react-router-dom, lucide-react, recharts, axios, date-fns, clsx
- Return ONLY the raw JSX code starting with import statements. No markdown, no backticks, no explanation.`

  const userPrompt = `Build this app:
Understanding: ${plan.understanding}
Steps to implement:
${steps}
Files needed: ${plan.files?.join(', ')}`

  const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`)
  const response = await result.response
  const usage = response.usageMetadata

  return {
    code: response.text(),
    tokens_used: (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0)
  }
}

module.exports = { generatePlan, generateCode }

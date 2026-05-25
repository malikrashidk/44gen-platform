const { GoogleGenerativeAI } = require('@google/generative-ai')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

async function generatePlan(prompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

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

  // Clean and parse JSON
  const clean = text.replace(/```json|```/g, '').trim()
  const plan = JSON.parse(clean)

  return {
    plan,
    tokens_used: (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0)
  }
}

async function generateCode(plan, phase = 1) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const steps = plan.is_complex
    ? plan.phases?.[phase - 1]?.steps?.join('\n')
    : plan.steps?.join('\n')

  const systemPrompt = `You are an expert React developer. Generate a complete working React application.

REQUIREMENTS:
- Use React with hooks
- Use Tailwind CSS for all styling
- Make it beautiful, modern, dark theme preferred
- All in a single App.jsx file
- Include proper routing if needed (use hash routing #/ for SPAs)
- Make it fully functional and production ready
- Include sample/mock data where needed

Return ONLY the complete App.jsx code. No explanation, no markdown, just the raw JSX code starting with imports.`

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

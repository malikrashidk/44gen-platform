import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { processJob, subscribeToJob, getJobHistory } from '../services/worker.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Take screenshot of a URL using a free screenshot service
async function captureScreenshot(url) {
  try {
    // Use screenshotone.com free tier or similar
    // Fallback: use microlink API which is free
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) })
    const data = await res.json()
    if (data?.data?.screenshot?.url) {
      // Download the screenshot and convert to base64
      const imgRes = await fetch(data.data.screenshot.url, { signal: AbortSignal.timeout(10000) })
      const arrayBuffer = await imgRes.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      return { base64, mimeType: 'image/jpeg' }
    }
  } catch (err) {
    console.warn('[Screenshot] Failed to capture:', err.message)
  }
  return null
}
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

async function createBuildJob({ projectId, userId, plan }) {
  const { data: profile } = await supabase
    .from('profiles').select('credits').eq('id', userId).single()
  if (!profile || profile.credits < 0.5) {
    const err = new Error('Insufficient credits')
    err.status = 402
    throw err
  }

  const { data: job, error } = await supabase
    .from('build_jobs')
    .insert({ project_id: projectId, user_id: userId, plan, status: 'queued', progress: [] })
    .select().single()
  if (error) throw error

  setTimeout(() => {
    processJob(job.id).catch(err => console.error('[Build] Job error:', err.message))
  }, 1500)

  return job
}

// Parse favicon change requests
function parseFaviconRequest(prompt) {
  const emojiRegex = /\p{Emoji_Presentation}/u
  const emojiMatch = prompt.match(new RegExp('favicon.*?(' + emojiRegex.source + ')', 'u'))
    || prompt.match(new RegExp('(' + emojiRegex.source + ').*?(?:as|for)?\\s*favicon', 'u'))
  if (emojiMatch) return { faviconEmoji: emojiMatch[1], faviconUrl: null }

  const urlMatch = prompt.match(/favicon.*?(https?:\/\/\S+)/i)
  if (urlMatch) return { faviconEmoji: null, faviconUrl: urlMatch[1] }

  if (/reset favicon|remove favicon|default favicon/i.test(prompt)) {
    return { faviconEmoji: null, faviconUrl: null, reset: true }
  }

  return null
}

function isFaviconOnlyRequest(prompt) {
  const p = prompt.trim().toLowerCase()
  return p.startsWith('change favicon') || p.startsWith('update favicon') ||
    p.startsWith('set favicon') || p.startsWith('use') && p.includes('favicon') ||
    (p.includes('favicon') && p.split(' ').length < 8)
}

// Detect design intent from a refinement prompt and expand it into
// specific, actionable instructions the model can act on precisely.
function buildDesignInstructions(prompt) {
  const instructions = []

  // Dark mode
  if (/dark(\s*(mode|theme|layout|design|ui|look))?|night\s*mode/i.test(prompt)) {
    instructions.push(
      'Apply a COMPLETE dark theme throughout every element: ' +
      'bg-slate-950 or bg-zinc-950 for page background, ' +
      'bg-slate-900 or bg-zinc-900 for cards/surfaces, ' +
      'text-white or text-slate-100 for headings, ' +
      'text-slate-400 for body text, ' +
      'border-slate-800 for borders, ' +
      'bg-slate-800 for inputs. ' +
      'Zero white or light surfaces — every background must be dark.'
    )
  }

  // Light mode
  if (/light(\s*(mode|theme|layout|design|ui|look))?/i.test(prompt)) {
    instructions.push(
      'Apply a clean light theme: bg-white page background, bg-slate-50 cards, ' +
      'text-slate-900 headings, text-slate-600 body, border-slate-200 borders, ' +
      'white inputs with slate-300 borders.'
    )
  }

  // Professional / premium / polished
  if (/professional|premium|polished|sophisticated|executive|enterprise/i.test(prompt)) {
    instructions.push(
      'Elevate visual quality significantly: ' +
      'increase whitespace and padding (py-8 min for sections), ' +
      'stronger typographic hierarchy (text-3xl+ headings, clear size steps), ' +
      'refined card styling (rounded-xl, shadow-md, proper border), ' +
      'polished buttons (px-6 py-3, rounded-lg, hover states, transitions), ' +
      'consistent spacing system throughout.'
    )
  }

  // Modern / clean / minimal
  if (/modern|clean|minimal|minimalist|simple\s+design|sleek/i.test(prompt)) {
    instructions.push(
      'Apply modern minimal design: generous whitespace, clean sans-serif typography, ' +
      'subtle borders instead of heavy shadows, simple color palette (1-2 accent colors), ' +
      'remove decorative clutter, focus on content clarity.'
    )
  }

  // Full redesign / new layout
  if (/redesign|new\s+layout|different\s+layout|redo|revamp|overhaul|from\s+scratch/i.test(prompt)) {
    instructions.push(
      'This is a FULL redesign — substantially change the layout structure and visual approach. ' +
      'Do not just restyle the existing layout. Rethink the page/component structure.'
    )
  }

  // Better / improve / enhance
  if (/better|improve|enhance|nicer|prettier|more\s+beautiful|upgrade/i.test(prompt)) {
    instructions.push(
      'Meaningfully improve the visual quality: better typography scale, ' +
      'proper spacing rhythm, more refined color usage, better component proportions, ' +
      'hover/focus states on all interactive elements, polished micro-details.'
    )
  }

  // Colorful / vibrant / gradient
  if (/colorf|vibrant|gradient|colorful/i.test(prompt)) {
    instructions.push(
      'Add tasteful color: gradient heading text (bg-gradient-to-r with background-clip), ' +
      'colored accent elements, vibrant but professional palette. ' +
      'Not garish — harmonious and intentional.'
    )
  }

  // Animations / transitions
  if (/animat|transit|smooth|motion/i.test(prompt)) {
    instructions.push(
      'Add smooth transitions: transition-all duration-200 on all interactive elements, ' +
      'hover:scale-105 on cards, hover:-translate-y-1 on buttons, ' +
      'smooth color transitions on focus states.'
    )
  }

  return instructions.length > 0
    ? '\n\nDesign requirements (apply ALL of these precisely):\n' +
      instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')
    : ''
}

// POST /api/build — create job from approved plan
router.post('/', requireAuth, async (req, res) => {
  const { plan, projectId } = req.body
  const userId = req.user.id

  if (!plan || !projectId)
    return res.status(400).json({ error: 'Missing required fields' })

  try {
    const job = await createBuildJob({ projectId, userId, plan })
    res.json({ job_id: job.id })
  } catch (err) {
    console.error('[Build] Error:', err.message)
    if (err.status) return res.status(err.status).json({ error: err.message })
    res.status(500).json({ error: err.message })
  }
})

// POST /api/build/direct — build immediately without a plan approval step
router.post('/direct', requireAuth, async (req, res) => {
  const { prompt, projectId, referenceImage, referenceUrl } = req.body
  const userId = req.user.id

  if (!prompt || !projectId)
    return res.status(400).json({ error: 'Missing required fields' })

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('id,name,prompt,status,user_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()
    if (!project) return res.status(404).json({ error: 'Project not found' })

    // Fetch all generated source files for context. Direct refinements must
    // preserve multi-file projects instead of collapsing them into App.jsx.
    const { data: existingRows } = await supabase
      .from('project_files')
      .select('file_path, content')
      .eq('project_id', projectId)
      .order('file_path', { ascending: true })

    const existingFiles = (existingRows || []).map(file => ({
      path: file.file_path,
      content: file.content
    }))
    const existingFilePaths = existingFiles.length
      ? existingFiles.map(file => file.path)
      : ['src/App.jsx']

    // Detect and expand design intent into specific instructions
    const designInstructions = buildDesignInstructions(prompt)

    // Capture screenshot if URL reference provided
    let visionImage = referenceImage || null
    if (!visionImage && referenceUrl) {
      const shot = await captureScreenshot(referenceUrl)
      if (shot) {
        visionImage = shot
        console.log(`[Build] Captured screenshot for reference URL: ${referenceUrl}`)
      }
    }

    const referenceNote = visionImage
      ? `\n\nA reference design image has been attached. Carefully analyze it and adopt its visual style, color palette, layout structure, typography, spacing, and component patterns. Replicate the design language faithfully while building the requested functionality.`
      : referenceUrl && !visionImage
      ? `\n\nReference URL provided: ${referenceUrl}. Use this design as inspiration for the visual style and layout.`
      : ''

    const understanding =
      `Update the existing app "${project.name || 'Untitled App'}" based on this request: ${prompt}.` +
      designInstructions +
      referenceNote +
      `\n\nReturn the complete updated project files using the ===FILE:path=== format when more than one file exists. ` +
      `Preserve every existing file, import, component, state flow, and feature unless the request changes it. ` +
      `If a file does not need changes, you may omit it; the builder will keep the existing version. ` +
      `Apply every design instruction precisely and comprehensively — ` +
      `if dark mode is requested, EVERY element must be dark with no exceptions.`

    const plan = {
      understanding,
      is_complex: false,
      app_name: project.name || 'Updated App',
      app_category: 'app',
      color_theme: /dark|night/i.test(prompt) ? 'dark' : 'light',
      current_phase: 1,
      total_phases: 1,
      steps: [
        `Apply user request: "${prompt}"`,
        'Preserve all existing files, imports, logic, and functionality',
        'Apply all design changes comprehensively to every element',
        'Return updated files in the existing project structure'
      ],
      files: existingFilePaths,
      questions: [],
      out_of_scope: [],
      estimated_credits: 2.5,
      phases: null,
      hidden: true,
      vision_image: visionImage || null,
      existing_files: existingFiles,
    }

    // Favicon-only request: update index.html without full rebuild
    const faviconData = parseFaviconRequest(prompt)
    if (faviconData && isFaviconOnlyRequest(prompt)) {
      try {
        const { buildAndDeploy } = await import('../services/builder.js')
        const { data: existingFiles } = await supabase
          .from('project_files').select('file_path, content').eq('project_id', projectId)

        if (!existingFiles?.length) {
          return res.status(400).json({ error: 'Build your app first, then change the favicon.' })
        }

        const files = existingFiles.map(f => ({ path: f.file_path, content: f.content }))
        await buildAndDeploy(projectId, files, () => {}, {
          appName: project.name || 'App',
          faviconEmoji: faviconData.reset ? null : (faviconData.faviconEmoji || null),
          faviconUrl: faviconData.reset ? null : (faviconData.faviconUrl || null),
        })

        const msg = faviconData.reset
          ? 'Favicon reset to the default 44Gen icon.'
          : `Favicon updated to ${faviconData.faviconEmoji || faviconData.faviconUrl}! Refresh the preview to see it.`

        await supabase.from('conversations').insert({
          project_id: projectId, role: 'assistant', content: msg, type: 'text'
        })

        return res.json({ favicon_updated: true, message: msg })
      } catch (err) {
        console.error('[Favicon] Error:', err.message)
        return res.status(500).json({ error: err.message })
      }
    }

    const job = await createBuildJob({ projectId, userId, plan })
    res.json({ job_id: job.id })
  } catch (err) {
    console.error('[Build Direct] Error:', err.message)
    if (err.status) return res.status(err.status).json({ error: err.message })
    res.status(500).json({ error: err.message })
  }
})

// GET /api/build/stream/:jobId — SSE stream
router.get('/stream/:jobId', requireAuth, async (req, res) => {
  const { jobId } = req.params
  const userId = req.user.id

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  let eventId = 0
  const lastId = parseInt(req.headers['last-event-id'] || '0', 10)

  const send = (event) => {
    try {
      eventId++
      res.write(`id: ${eventId}\ndata: ${JSON.stringify(event)}\n\n`)
    } catch {}
  }

  const keepalive = setInterval(() => {
    try { res.write(': keepalive\n\n') } catch {}
  }, 10000)

  try {
    const { data: job } = await supabase
      .from('build_jobs').select('*').eq('id', jobId).single()

    if (!job) {
      send({ type: 'error', message: 'Job not found' })
      clearInterval(keepalive)
      res.end()
      return
    }

    if (job.user_id !== userId) {
      send({ type: 'error', message: 'Forbidden' })
      clearInterval(keepalive)
      res.end()
      return
    }

    const history = getJobHistory(jobId)
    const source = history.length > 0 ? history : (job.progress || [])
    source.slice(lastId).forEach(e => send(e))

    if (job.status === 'done' || job.status === 'failed') {
      clearInterval(keepalive)
      setTimeout(() => res.end(), 300)
      return
    }

    const unsubscribe = subscribeToJob(jobId, (event) => {
      send(event)
      if (event.type === 'done' || event.type === 'error') {
        clearInterval(keepalive)
        setTimeout(() => res.end(), 500)
      }
    })

    req.on('close', () => {
      clearInterval(keepalive)
      unsubscribe()
    })
  } catch (err) {
    send({ type: 'error', message: err.message })
    clearInterval(keepalive)
    res.end()
  }
})

// GET /api/build/status/:jobId
router.get('/status/:jobId', requireAuth, async (req, res) => {
  const { data: job } = await supabase
    .from('build_jobs')
    .select('id,status,subdomain,credits_used,error,created_at,user_id')
    .eq('id', req.params.jobId).single()
  if (!job) return res.status(404).json({ error: 'Job not found' })
  if (job.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' })
  res.json(job)
})

export default router

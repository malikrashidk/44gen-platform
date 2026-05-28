import { createClient } from '@supabase/supabase-js'
import { generateCodeStream, generateSummary, repairGeneratedCode } from './gemini.js'
import { buildAndDeploy } from './builder.js'
import { sanitizeGeneratedFiles } from './fileSafety.js'

// ⚠️  FIX #34 (doc): jobStore and sseConnections (in build.js) are module-level Maps.
// This REQUIRES PM2 single-process mode (not cluster mode).
// Switching to cluster mode will silently break SSE streaming — each worker has its own Map.
// If horizontal scaling is needed, replace with Redis pub/sub.

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

async function purgeCloudflareCache(subdomain) {
  const zoneId = process.env.CF_ZONE_ID
  const apiToken = process.env.CF_API_TOKEN
  if (!zoneId || !apiToken) return
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: [
          `https://${subdomain}.44gen.com/`,
          `https://${subdomain}.44gen.com/index.html`
        ]
      })
    })
    const data = await res.json()
    if (data.success) console.log(`[Cloudflare] Cache purged for ${subdomain}.44gen.com`)
    else console.warn(`[Cloudflare] Purge failed:`, data.errors)
  } catch (err) {
    console.warn(`[Cloudflare] Cache purge error: ${err.message}`)
  }
}

const jobStore = new Map()

const MAX_CONCURRENT = 3
let activeBuilds = 0
const pendingQueue = []

function getStore(jobId) {
  if (!jobStore.has(jobId)) {
    jobStore.set(jobId, { listeners: new Set(), history: [], persistTimer: null })
  }
  return jobStore.get(jobId)
}

function emitJobEvent(jobId, event) {
  const store = getStore(jobId)
  const eventWithTs = { ...event, ts: Date.now() }
  store.history.push(eventWithTs)
  store.listeners.forEach(fn => {
    try { fn(eventWithTs) } catch {}
  })
  schedulePersist(jobId, store)
}

function schedulePersist(jobId, store) {
  if (store.persistTimer) return
  store.persistTimer = setTimeout(async () => {
    store.persistTimer = null
    const snapshot = [...store.history]
    try {
      await supabase.from('build_jobs')
        .update({ progress: snapshot, updated_at: new Date().toISOString() })
        .eq('id', jobId)
    } catch {}
  }, 2000)
}

async function flushPersist(jobId) {
  const store = jobStore.get(jobId)
  if (!store) return
  if (store.persistTimer) {
    clearTimeout(store.persistTimer)
    store.persistTimer = null
  }
  try {
    await supabase.from('build_jobs')
      .update({ progress: [...store.history], updated_at: new Date().toISOString() })
      .eq('id', jobId)
  } catch {}
}

export function subscribeToJob(jobId, listener) {
  const store = getStore(jobId)
  store.listeners.add(listener)
  return () => {
    store.listeners.delete(listener)
    if (store.listeners.size === 0) {
      setTimeout(() => {
        const s = jobStore.get(jobId)
        if (s && s.listeners.size === 0) jobStore.delete(jobId)
      }, 10 * 60 * 1000)
    }
  }
}

export function getJobHistory(jobId) {
  return jobStore.get(jobId)?.history || []
}

export async function processJob(jobId) {
  if (activeBuilds >= MAX_CONCURRENT) {
    pendingQueue.push(jobId)
    emitJobEvent(jobId, { type: 'queued', message: `Build queued — waiting for a slot (${pendingQueue.length} ahead)...` })
    return
  }
  activeBuilds++
  try {
    await runJob(jobId)
  } finally {
    activeBuilds--
    const next = pendingQueue.shift()
    if (next) processJob(next)
  }
}

const JOB_TIMEOUT_MS = 10 * 60 * 1000
const MAX_REPAIR_ATTEMPTS = 2

function isRepairableBuildError(err) {
  const message = String(err?.message || err || '')
  if (/npm ERR!|ENOSPC|EACCES|ETIMEDOUT|ECONNRESET/i.test(message)) return false
  return /vite|esbuild|transform failed|src\/[^\s:)]+|expected|unexpected|could not resolve|failed to resolve|unterminated|syntax/i.test(message)
}

function friendlyBuildError(err) {
  const message = String(err?.message || err || '')
  if (/insufficient credits/i.test(message)) return 'You need more credits before I can continue this build.'
  if (/timed out/i.test(message)) return 'The build took too long and stopped. Please try again.'
  if (/rate|429|busy|high demand|unavailable/i.test(message)) return 'The AI service is busy right now. Please try again in a moment.'
  return 'I hit a build issue while preparing your app. I can retry or fix it for you.'
}

// Save all generated files to project_files table
async function saveProjectFiles(projectId, files) {
  const safeFiles = sanitizeGeneratedFiles(files)

  // Delete existing files for this project first
  await supabase.from('project_files')
    .delete()
    .eq('project_id', projectId)

  // Insert all new files
  const rows = safeFiles.map(file => ({
    project_id: projectId,
    file_path: file.path,
    content: file.content,
    updated_at: new Date().toISOString()
  }))

  await supabase.from('project_files').insert(rows)
}

// Get App.jsx content from files array (for chat display and repair)
function getAppJsx(files) {
  return files.find(f => f.path === 'src/App.jsx')?.content
    || files[0]?.content
    || ''
}

function mergeWithExistingFiles(generatedFiles = [], existingFiles = []) {
  const safeGeneratedFiles = sanitizeGeneratedFiles(generatedFiles)
  const safeExistingFiles = sanitizeGeneratedFiles(existingFiles)
  if (!safeExistingFiles.length) return safeGeneratedFiles

  const merged = new Map(safeExistingFiles.map(file => [file.path, file]))
  for (const file of safeGeneratedFiles) {
    if (!file?.path || !file.content) continue
    merged.set(file.path, file)
  }
  return [...merged.values()].sort((a, b) => a.path.localeCompare(b.path))
}

function summarizeFileChanges(previousFiles = [], nextFiles = []) {
  const previous = new Map(sanitizeGeneratedFiles(previousFiles).map(file => [file.path, file.content]))
  const next = new Map(sanitizeGeneratedFiles(nextFiles).map(file => [file.path, file.content]))
  const added = []
  const modified = []
  const removed = []

  for (const [path, content] of next) {
    if (!previous.has(path)) added.push(path)
    else if (previous.get(path) !== content) modified.push(path)
  }

  for (const path of previous.keys()) {
    if (!next.has(path)) removed.push(path)
  }

  return {
    added_files: added.sort(),
    modified_files: modified.sort(),
    removed_files: removed.sort()
  }
}

function summarizeFileDiffs(previousFiles = [], nextFiles = []) {
  const previous = new Map(sanitizeGeneratedFiles(previousFiles).map(file => [file.path, file.content]))
  const next = new Map(sanitizeGeneratedFiles(nextFiles).map(file => [file.path, file.content]))
  const paths = [...new Set([...previous.keys(), ...next.keys()])].sort()
  const MAX_DIFF_FILES = 12
  const MAX_DIFF_CHARS = 20000

  return paths.flatMap(path => {
    const before = previous.get(path)
    const after = next.get(path)
    if (before === after) return []

    const status = before === undefined ? 'added' : after === undefined ? 'removed' : 'modified'
    return [{
      path,
      status,
      before: String(before || '').slice(0, MAX_DIFF_CHARS),
      after: String(after || '').slice(0, MAX_DIFF_CHARS),
      truncated: String(before || '').length > MAX_DIFF_CHARS || String(after || '').length > MAX_DIFF_CHARS
    }]
  }).slice(0, MAX_DIFF_FILES)
}

async function runJob(jobId) {
  const emit = (type, data = {}) => emitJobEvent(jobId, { type, ...data })

  const timeoutHandle = setTimeout(async () => {
    await supabase.from('build_jobs')
      .update({ status: 'failed', error: 'Job timed out after 10 minutes' })
      .eq('id', jobId)
    emit('error', {
      message: 'The build took too long and stopped. Please try again.',
      details: 'Job timed out after 10 minutes',
      retryable: true,
      fixable: true
    })
  }, JOB_TIMEOUT_MS)

  try {
    const { data: job } = await supabase
      .from('build_jobs').select('*').eq('id', jobId).single()
    if (!job) throw new Error('Job not found')

    await supabase.from('build_jobs')
      .update({ status: 'building' }).eq('id', jobId)

    const { data: profile } = await supabase
      .from('profiles').select('credits').eq('id', job.user_id).single()
    if (!profile || profile.credits < 0.5) throw new Error('Insufficient credits')

    emit('start', { message: 'Starting code generation...' })

    const manualFiles = Array.isArray(job.plan.manual_files)
      ? sanitizeGeneratedFiles(job.plan.manual_files)
      : null
    const previousFiles = job.plan.previous_files || job.plan.existing_files || []
    const fileList = manualFiles?.map(file => file.path) || job.plan.files || ['src/App.jsx']
    const isMultiFile = fileList.length > 1
    emit('code_start', {
      file: isMultiFile ? `${fileList.length} files` : 'src/App.jsx',
      message: isMultiFile
        ? `${manualFiles ? 'Preparing' : 'Writing'} ${fileList.length} files: ${fileList.map(f => f.split('/').pop()).join(', ')}...`
        : `${manualFiles ? 'Preparing' : 'Writing'} src/App.jsx...`
    })

    const generated = manualFiles
      ? { files: manualFiles, tokens_used: 0 }
      : await generateCodeStream(
        job.plan,
        job.plan.current_phase || 1,
        (chunk) => emit('code_chunk', { text: chunk }),
        (thought) => emit('thought', { text: thought }),
        job.plan.vision_image || null
      )

    emit('code_end', {
      message: manualFiles
        ? `Code edit saved — ${generated.files.length} file(s) ready`
        : `Code generation complete — ${generated.files.length} file(s) written`
    })

    let files = mergeWithExistingFiles(generated.files, job.plan.existing_files || [])
    let tokens_used = generated.tokens_used

    // Save all files to DB
    await saveProjectFiles(job.project_id, files)

    // Get App.jsx for chat display and repair
    let appCode = getAppJsx(files)

    // Build with repair loop
    let subdomain
    for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
      try {
        subdomain = await buildAndDeploy(
          job.project_id,
          files,
          (progress) => emit(progress.type, { message: progress.message }),
          {
            appName: job.plan.app_name || 'App',
            faviconEmoji: job.plan.favicon_emoji || null,
            faviconUrl: job.plan.favicon_url || null,
          }
        )
        await purgeCloudflareCache(subdomain)
        break
      } catch (buildErr) {
        if (attempt >= MAX_REPAIR_ATTEMPTS || !isRepairableBuildError(buildErr)) throw buildErr

        const repairAttempt = attempt + 1
        emit('repair_start', {
          attempt: repairAttempt,
          file: files.length > 1 ? `${files.length} files` : 'src/App.jsx',
          message: `Fixing build error (attempt ${repairAttempt})...`
        })
        console.warn(`[Worker] Repairing generated code for job ${jobId}, attempt ${repairAttempt}: ${buildErr.message}`)

        const repaired = await repairGeneratedCode({
          plan: job.plan,
          code: appCode,
          files,
          error: buildErr.message,
          attempt: repairAttempt
        })

        tokens_used += repaired.tokens_used || 0

        // Repair may return one changed file or several; preserve unchanged files.
        files = mergeWithExistingFiles(repaired.files || [{ path: 'src/App.jsx', content: repaired.code }], files)
        appCode = getAppJsx(files)

        // If App.jsx wasn't in files for some reason, add it
        if (!files.find(f => f.path === 'src/App.jsx')) {
          files = [{ path: 'src/App.jsx', content: appCode }, ...files]
        }

        await saveProjectFiles(job.project_id, files)
        const repairedPaths = (repaired.files || []).map(file => file.path)
        emit('repair_done', {
          attempt: repairAttempt,
          files: repairedPaths,
          file: repairedPaths.length > 1 ? `${repairedPaths.length} files` : repairedPaths[0] || 'generated files',
          message: `Fixed. Rebuilding...`
        })
      }
    }

    // Save App.jsx content to conversations for chat display
    await supabase.from('conversations').insert({
      project_id: job.project_id,
      role: 'assistant',
      content: appCode,
      type: 'code'
    })

    const credits_used = parseFloat((tokens_used / 10000).toFixed(2))

    emit('summarizing', { message: 'Generating summary...' })
    const filesWritten = files.map(f => f.path)
    const summary = await generateSummary(job.plan, filesWritten)

    await supabase.from('projects').update({
      name: job.plan.app_name || 'My App',
      prompt: job.plan.understanding,
      status: 'deployed',
      subdomain
    }).eq('id', job.project_id)

    // FIX #9: Re-fetch current credits immediately before deduction instead of using the
    // snapshot taken at job start (which may be minutes stale for long builds).
    // The .gte() guard ensures atomicity — if balance changed, updatedProfile is null.
    const { data: freshProfile } = await supabase
      .from('profiles').select('credits').eq('id', job.user_id).single()
    const creditsBeforeDeduction = freshProfile?.credits ?? profile.credits

    const { data: updatedProfile } = await supabase
      .from('profiles')
      .update({ credits: creditsBeforeDeduction - credits_used })
      .eq('id', job.user_id)
      .gte('credits', credits_used)
      .select('credits')
      .single()

    if (!updatedProfile) {
      console.warn('[Worker] Credit deduction skipped — insufficient balance at deduction time (credits_used:', credits_used, ', balance:', creditsBeforeDeduction, ')')
    }

    await supabase.from('credit_transactions').insert({
      user_id: job.user_id,
      project_id: job.project_id,
      action: 'build',
      credits_before: creditsBeforeDeduction,
      credits_used,
      credits_after: updatedProfile?.credits ?? creditsBeforeDeduction - credits_used,
      tokens_used,
      description: `Phase ${job.plan.current_phase}/${job.plan.total_phases} — ${filesWritten.length} file(s)`
    })

    const completionData = {
      subdomain, credits_used,
      phase: job.plan.current_phase,
      total_phases: job.plan.total_phases,
      next_phase_description: job.plan.phases?.[job.plan.current_phase]?.description,
      plan: job.plan,
      summary,
      files_written: filesWritten,
      changes: {
        ...summarizeFileChanges(previousFiles, files),
        file_diffs: summarizeFileDiffs(previousFiles, files)
      }
    }

    await supabase.from('conversations').insert({
      project_id: job.project_id,
      role: 'assistant',
      content: JSON.stringify(completionData),
      type: 'complete',
      credits_used,
      tokens_used
    })

    await supabase.from('build_jobs')
      .update({ status: 'done', subdomain, credits_used })
      .eq('id', jobId)

    clearTimeout(timeoutHandle)
    emit('done', completionData)
    await flushPersist(jobId)

  } catch (err) {
    clearTimeout(timeoutHandle)
    // FIX #8: Log full error object (not just .message) so stack traces appear in PM2 logs
    console.error('[Worker] Job failed:', err)
    await supabase.from('build_jobs')
      .update({ status: 'failed', error: err.message }).eq('id', jobId)
    await flushPersist(jobId)
    emit('error', {
      message: friendlyBuildError(err),
      details: err.message,
      retryable: true,
      fixable: true
    })
  }
}


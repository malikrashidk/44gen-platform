import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { requireAuth } from '../middleware/auth.js'
import { processJob } from '../services/worker.js'
import { normalizeGeneratedFilePath, sanitizeGeneratedFiles } from '../services/fileSafety.js'

const router = Router()
const USERS_DIR = '/var/www/44gen/users'
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

const SKIP_DIRS = new Set(['node_modules', '.git'])
const CODE_SKIP_DIRS = new Set(['node_modules', '.git', 'dist'])
const CODE_SKIP_FILES = new Set(['package-lock.json'])
const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.md', '.txt',
  '.yml', '.yaml', '.env', '.gitignore'
])

async function getOwnedProject(projectId, userId) {
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()
  return project
}

function projectDirFor(project) {
  const subdomain = project.subdomain || `app-${project.id.slice(0, 8)}`
  return path.join(USERS_DIR, subdomain)
}

function isTextFile(filePath) {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase()) ||
    ['package-lock.json', 'vite.config.js'].includes(path.basename(filePath))
}

async function createManualBuildJob({ project, userId, files, previousFiles, changedPath }) {
  const { data: profile } = await supabase
    .from('profiles').select('credits').eq('id', userId).single()
  if (!profile || profile.credits < 0.5) {
    const err = new Error('Insufficient credits')
    err.status = 402
    throw err
  }

  const plan = {
    understanding: `Apply a direct code edit to ${changedPath} and rebuild the published app.`,
    is_complex: false,
    app_name: project.name || 'Updated App',
    app_category: 'app',
    color_theme: 'light',
    current_phase: 1,
    total_phases: 1,
    steps: [
      `Save the edited ${changedPath} file`,
      'Rebuild and publish the app with the updated source'
    ],
    files: files.map(file => file.path),
    questions: [],
    out_of_scope: [],
    estimated_credits: 0,
    phases: null,
    hidden: true,
    manual_files: files,
    previous_files: previousFiles,
    code_edit: { file_path: changedPath }
  }

  const { data: job, error } = await supabase
    .from('build_jobs')
    .insert({ project_id: project.id, user_id: userId, plan, status: 'queued', progress: [] })
    .select().single()
  if (error) throw error

  setTimeout(() => {
    processJob(job.id).catch(err => console.error('[Projects] Code edit job error:', err.message))
  }, 500)

  return job
}

function walkFiles(root, { skipDirs = SKIP_DIRS, textOnly = false } = {}) {
  const files = []
  if (!fs.existsSync(root)) return files

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') && entry.name !== '.env') continue
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory() && skipDirs.has(entry.name)) continue

      const absolute = path.join(dir, entry.name)
      const relative = path.relative(root, absolute).replaceAll(path.sep, '/')
      if (relative.split('/').some(part => skipDirs.has(part))) continue

      if (entry.isDirectory()) {
        walk(absolute)
      } else {
        if (textOnly && CODE_SKIP_FILES.has(path.basename(relative))) continue
        if (!textOnly || isTextFile(relative)) files.push({ absolute, relative })
      }
    }
  }

  walk(root)
  return files
}

router.get('/:projectId/files', requireAuth, async (req, res) => {
  const project = await getOwnedProject(req.params.projectId, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  const root = projectDirFor(project)
  const diskFiles = walkFiles(root, { skipDirs: CODE_SKIP_DIRS, textOnly: true })

  if (diskFiles.length) {
    const files = diskFiles
      .sort((a, b) => a.relative.localeCompare(b.relative))
      .map(file => ({
        path: file.relative,
        content: fs.readFileSync(file.absolute, 'utf8')
      }))
    return res.json({ files })
  }

  const { data } = await supabase
    .from('project_files')
    .select('file_path,content')
    .eq('project_id', project.id)
    .order('file_path', { ascending: true })

  res.json({
    files: (data || []).map(file => ({
      path: file.file_path,
      content: file.content
    }))
  })
})

router.get('/:projectId/download', requireAuth, async (req, res) => {
  const project = await getOwnedProject(req.params.projectId, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  const root = projectDirFor(project)
  if (!fs.existsSync(root)) return res.status(404).json({ error: 'Project files not found' })

  const zip = new AdmZip()
  for (const file of walkFiles(root)) {
    zip.addLocalFile(file.absolute, path.dirname(file.relative) === '.' ? '' : path.dirname(file.relative))
  }

  const name = (project.name || '44gen-project')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || '44gen-project'

  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="${name}.zip"`)
  res.send(zip.toBuffer())
})

router.post('/:projectId/files/save-and-build', requireAuth, async (req, res) => {
  const project = await getOwnedProject(req.params.projectId, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  try {
    const safePath = normalizeGeneratedFilePath(req.body?.path)
    const content = String(req.body?.content ?? '')

    const { data: rows } = await supabase
      .from('project_files')
      .select('file_path, content')
      .eq('project_id', project.id)
      .order('file_path', { ascending: true })

    const dbFiles = (rows || []).map(file => ({
      path: file.file_path,
      content: file.content
    }))
    const diskFallbackFiles = dbFiles.length
      ? []
      : walkFiles(projectDirFor(project), { skipDirs: CODE_SKIP_DIRS, textOnly: true })
        .filter(file => file.relative.startsWith('src/'))
        .map(file => ({ path: file.relative, content: fs.readFileSync(file.absolute, 'utf8') }))
    const previousFiles = sanitizeGeneratedFiles(dbFiles.length ? dbFiles : diskFallbackFiles)
    const merged = new Map(previousFiles.map(file => [file.path, file]))
    merged.set(safePath, { path: safePath, content })
    const files = sanitizeGeneratedFiles([...merged.values()].sort((a, b) => a.path.localeCompare(b.path)))

    await supabase.from('project_files')
      .delete()
      .eq('project_id', project.id)

    await supabase.from('project_files').insert(files.map(file => ({
      project_id: project.id,
      file_path: file.path,
      content: file.content,
      updated_at: new Date().toISOString()
    })))

    const job = await createManualBuildJob({
      project,
      userId: req.user.id,
      files,
      previousFiles,
      changedPath: safePath
    })

    res.json({ job_id: job.id, file_path: safePath })
  } catch (err) {
    console.error('[Projects] Save and build failed:', err.message)
    if (err.status) return res.status(err.status).json({ error: err.message })
    res.status(500).json({ error: err.message })
  }
})

export default router

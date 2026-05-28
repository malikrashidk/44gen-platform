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
const EXPORT_SKIP_FILES = new Set(['package-lock.json'])

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

function defaultPackageJson(project) {
  return JSON.stringify({
    name: (project.name || '44gen-app').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '') || '44gen-app',
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview'
    },
    dependencies: {
      '@vitejs/plugin-react': '^4.0.0',
      axios: '^1.6.0',
      clsx: '^2.0.0',
      'date-fns': '^3.0.0',
      'lucide-react': '^0.460.0',
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      'react-router-dom': '^6.8.0',
      recharts: '^2.12.0',
      vite: '^5.0.0'
    }
  }, null, 2)
}

async function getExportFiles(project) {
  const root = projectDirFor(project)
  const diskFiles = walkFiles(root, { skipDirs: CODE_SKIP_DIRS })
    .filter(file => !EXPORT_SKIP_FILES.has(path.basename(file.relative)))

  if (diskFiles.length) {
    return diskFiles.map(file => ({
      path: file.relative,
      content: fs.readFileSync(file.absolute)
    }))
  }

  const { data } = await supabase
    .from('project_files')
    .select('file_path,content')
    .eq('project_id', project.id)
    .order('file_path', { ascending: true })

  const sourceFiles = sanitizeGeneratedFiles((data || []).map(file => ({
    path: file.file_path,
    content: file.content
  })))

  if (!sourceFiles.length) return []

  const supportFiles = [
    { path: 'package.json', content: defaultPackageJson(project) },
    { path: 'vite.config.js', content: "import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\n\nexport default defineConfig({ plugins: [react()] })\n" },
    { path: 'index.html', content: '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>44Gen App</title>\n    <script src="https://cdn.tailwindcss.com"></script>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.jsx"></script>\n  </body>\n</html>\n' },
    { path: 'src/main.jsx', content: "import React from 'react'\nimport ReactDOM from 'react-dom/client'\nimport App from './App.jsx'\n\nReactDOM.createRoot(document.getElementById('root')).render(\n  <React.StrictMode><App /></React.StrictMode>\n)\n" }
  ]

  const merged = new Map(supportFiles.map(file => [file.path, file]))
  sourceFiles.forEach(file => merged.set(file.path, file))
  return [...merged.values()].map(file => ({
    path: file.path,
    content: Buffer.from(file.content)
  }))
}

async function githubRequest(token, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) {
    const err = new Error(data?.message || `GitHub request failed (${response.status})`)
    err.status = response.status
    err.data = data
    throw err
  }
  return data
}

async function getGithubFileSha({ token, owner, repo, filePath, branch }) {
  try {
    const encodedPath = filePath.split('/').map(encodeURIComponent).join('/')
    const ref = branch ? `?ref=${encodeURIComponent(branch)}` : ''
    const data = await githubRequest(token, `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}${ref}`)
    return Array.isArray(data) ? null : data?.sha || null
  } catch (err) {
    if ([404, 409].includes(err.status)) return null
    throw err
  }
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

router.post('/:projectId/export/github', requireAuth, async (req, res) => {
  const project = await getOwnedProject(req.params.projectId, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  try {
    const token = String(req.body?.token || '').trim()
    const owner = String(req.body?.owner || '').trim()
    const repo = String(req.body?.repo || '').trim()
    const branchInput = String(req.body?.branch || 'main').trim()
    const commitMessage = String(req.body?.commitMessage || `Export ${project.name || '44Gen app'}`).trim()
    const privateRepo = Boolean(req.body?.privateRepo)
    const createRepo = req.body?.createRepo !== false

    if (!token) return res.status(400).json({ error: 'GitHub token is required' })
    if (!owner || !repo) return res.status(400).json({ error: 'GitHub owner and repo are required' })
    if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
      return res.status(400).json({ error: 'Invalid GitHub owner or repo name' })
    }

    const files = await getExportFiles(project)
    if (!files.length) return res.status(404).json({ error: 'Project files not found' })

    let repoData
    let createdRepo = false
    try {
      repoData = await githubRequest(token, `https://api.github.com/repos/${owner}/${repo}`)
    } catch (err) {
      if (err.status !== 404 || !createRepo) throw err
      const user = await githubRequest(token, 'https://api.github.com/user')
      const createUrl = owner.toLowerCase() === String(user.login || '').toLowerCase()
        ? 'https://api.github.com/user/repos'
        : `https://api.github.com/orgs/${owner}/repos`
      repoData = await githubRequest(token, createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: repo,
          private: privateRepo,
          auto_init: false,
          description: `Exported from 44Gen: ${project.name || 'Generated app'}`
        })
      })
      createdRepo = true
    }

    const branch = createdRepo || repoData.size === 0 ? '' : (branchInput || repoData.default_branch || 'main')
    let uploaded = 0
    const skipped = []

    for (const file of files) {
      if (file.content.length > 900000) {
        skipped.push(file.path)
        continue
      }

      const sha = await getGithubFileSha({ token, owner, repo, filePath: file.path, branch })
      const encodedPath = file.path.split('/').map(encodeURIComponent).join('/')
      const body = {
        message: commitMessage,
        content: Buffer.from(file.content).toString('base64'),
        ...(sha ? { sha } : {}),
        ...(branch ? { branch } : {})
      }
      await githubRequest(token, `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      uploaded++
    }

    res.json({
      repo_url: repoData.html_url || `https://github.com/${owner}/${repo}`,
      files_uploaded: uploaded,
      files_skipped: skipped,
      branch: branch || repoData.default_branch || 'main',
      created_repo: createdRepo
    })
  } catch (err) {
    console.error('[GitHub Export] Error:', err.message)
    const status = err.status && err.status < 500 ? err.status : 500
    res.status(status).json({ error: err.message || 'GitHub export failed' })
  }
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

import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import fs from 'node:fs'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { requireAuth } from '../middleware/auth.js'
import { processJob } from '../services/worker.js'
import { normalizeGeneratedFilePath, sanitizeGeneratedFiles } from '../services/fileSafety.js'
import { getGithubAccessToken, githubRequest } from '../services/githubAuth.js'
import { runRuntimeQa } from '../services/runtimeQa.js'

// #38: Validate UUID format before passing to Supabase to avoid DB errors on malformed input
function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}


const router = Router()
const USERS_DIR = '/var/www/44gen/users'

const SKIP_DIRS = new Set(['node_modules', '.git'])
const CODE_SKIP_DIRS = new Set(['node_modules', '.git', 'dist'])
const CODE_SKIP_FILES = new Set(['package-lock.json'])
const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.md', '.txt',
  '.yml', '.yaml', '.env', '.gitignore'
])
const EXPORT_SKIP_FILES = new Set(['package-lock.json', '.env'])
const EXPORT_INDEX_HTML = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>44Gen App</title>\n    <script src="https://cdn.tailwindcss.com"></script>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.jsx"></script>\n  </body>\n</html>\n'
const PAID_PLANS = new Set(['pro', 'business'])

async function getOwnedProject(projectId, userId) {
  if (!isValidUUID(projectId)) return null  // #38: reject malformed UUIDs before hitting DB
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

async function getUserPlan(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single()
  return String(data?.plan || 'free').toLowerCase()
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
      content: file.relative === 'index.html'
        ? Buffer.from(EXPORT_INDEX_HTML)
        : fs.readFileSync(file.absolute)
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
    { path: 'index.html', content: EXPORT_INDEX_HTML },
    { path: 'src/main.jsx', content: "import React from 'react'\nimport ReactDOM from 'react-dom/client'\nimport App from './App.jsx'\n\nReactDOM.createRoot(document.getElementById('root')).render(\n  <React.StrictMode><App /></React.StrictMode>\n)\n" }
  ]

  const merged = new Map(supportFiles.map(file => [file.path, file]))
  sourceFiles.forEach(file => merged.set(file.path, file))
  return [...merged.values()].map(file => ({
    path: file.path,
    content: Buffer.from(file.content)
  }))
}

// #37: Push all files in a single commit via the Git Trees API (replaces sequential PUT per file)
async function pushFilesViaTreesAPI({ token, owner, repo, branch, files, commitMessage }) {
  const base = `https://api.github.com/repos/${owner}/${repo}`
  const safeBranch = branch || 'main'
  const encodedBranch = encodeURIComponent(safeBranch).replaceAll('%2F', '/')

  // 1. Get current branch tip (empty/new repos have no commits yet)
  let baseCommitSha = null
  let baseTreeSha = null
  try {
    const ref = await githubRequest(token, `${base}/git/ref/heads/${encodedBranch}`)
    baseCommitSha = ref.object.sha
    const commit = await githubRequest(token, `${base}/git/commits/${baseCommitSha}`)
    baseTreeSha = commit.tree.sha
  } catch (err) {
    if (err.status !== 404) throw err
    // Branch doesn't exist yet — will be created on push
  }

  // 2. Create blobs for all files (in parallel, max 5 at a time to avoid rate limits)
  const skipped = []
  const validFiles = files.filter(file => {
    if (file.content.length > 900000) { skipped.push(file.path); return false }
    return true
  })

  const BATCH = 5
  const treeEntries = []
  for (let i = 0; i < validFiles.length; i += BATCH) {
    const batch = validFiles.slice(i, i + BATCH)
    const blobs = await Promise.all(batch.map(async file => {
      const content = Buffer.isBuffer(file.content)
        ? file.content.toString('base64')
        : Buffer.from(file.content).toString('base64')
      const blob = await githubRequest(token, `${base}/git/blobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, encoding: 'base64' })
      })
      return { path: file.path, mode: '100644', type: 'blob', sha: blob.sha }
    }))
    treeEntries.push(...blobs)
  }

  // 3. Create new tree
  const treeBody = { tree: treeEntries }
  if (baseTreeSha) treeBody.base_tree = baseTreeSha
  const newTree = await githubRequest(token, `${base}/git/trees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(treeBody)
  })

  // 4. Create commit
  const commitBody = { message: commitMessage, tree: newTree.sha }
  if (baseCommitSha) commitBody.parents = [baseCommitSha]
  const newCommit = await githubRequest(token, `${base}/git/commits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(commitBody)
  })

  // 5. Update or create branch ref
  const refPath = `${base}/git/refs/heads/${encodedBranch}`
  try {
    await githubRequest(token, refPath, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: newCommit.sha, force: false })
    })
  } catch (err) {
    if (err.status !== 422) throw err
    // Ref doesn't exist — create it
    await githubRequest(token, `${base}/git/refs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: `refs/heads/${safeBranch}`, sha: newCommit.sha })
    })
  }

  return { commitSha: newCommit.sha, filesUploaded: treeEntries.length, skipped }
}

async function readGithubSourceFiles({ token, owner, repo, branch = '' }) {
  const repoData = await githubRequest(token, `https://api.github.com/repos/${owner}/${repo}`)
  const targetBranch = branch || repoData.default_branch || 'main'
  const ref = await githubRequest(token, `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(targetBranch).replaceAll('%2F', '/')}`)
  const commit = await githubRequest(token, `https://api.github.com/repos/${owner}/${repo}/git/commits/${ref.object.sha}`)
  const tree = await githubRequest(token, `https://api.github.com/repos/${owner}/${repo}/git/trees/${commit.tree.sha}?recursive=1`)

  const entries = (tree.tree || [])
    .filter(item => item.type === 'blob' && item.path?.startsWith('src/') && /\.(jsx?|tsx?|css|json)$/i.test(item.path))
    .filter(item => item.size <= 200000)
    .slice(0, 60)

  const files = []
  for (const entry of entries) {
    const blob = await githubRequest(token, `https://api.github.com/repos/${owner}/${repo}/git/blobs/${entry.sha}`)
    if (blob.encoding !== 'base64') continue
    files.push({
      path: entry.path,
      content: Buffer.from(blob.content || '', 'base64').toString('utf8')
    })
  }

  return {
    repo: repoData.full_name,
    branch: targetBranch,
    files: sanitizeGeneratedFiles(files)
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

  // FIX #11: Removed unnecessary 500ms setTimeout — processJob is fire-and-forget
  // and does not block the HTTP response. Log full error object for stack traces.
  processJob(job.id).catch(err => console.error('[Projects] Code edit job error:', err))

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

  // #36: Use CODE_SKIP_DIRS to exclude node_modules, dist, .git from the download zip
  const zip = new AdmZip()
  for (const file of walkFiles(root, { skipDirs: CODE_SKIP_DIRS })) {
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
    const token = String(req.body?.token || '').trim() || await getGithubAccessToken(req.user.id)
    const owner = String(req.body?.owner || '').trim()
    const repo = String(req.body?.repo || '').trim()
    const branchInput = String(req.body?.branch || 'main').trim()
    const commitMessage = String(req.body?.commitMessage || `Export ${project.name || '44Gen app'}`).trim()
    const privateRepo = Boolean(req.body?.privateRepo)
    const createRepo = req.body?.createRepo !== false

    if (!token) return res.status(400).json({ error: 'Connect GitHub first or provide a GitHub token.' })
    if (!owner || !repo) return res.status(400).json({ error: 'GitHub owner and repo are required' })
    if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
      return res.status(400).json({ error: 'Invalid GitHub owner or repo name' })
    }

    const files = await getExportFiles(project)
    if (!files.length) return res.status(404).json({ error: 'Project files not found' })

    // Ensure repo exists (create if needed)
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

    const targetBranch = branchInput || repoData.default_branch || 'main'

    // #37: Use Git Trees API — single commit for all files (was N sequential PUT requests)
    const { commitSha, filesUploaded, skipped } = await pushFilesViaTreesAPI({
      token, owner, repo,
      branch: targetBranch,
      files,
      commitMessage
    })

    res.json({
      repo_url: repoData.html_url || `https://github.com/${owner}/${repo}`,
      files_uploaded: filesUploaded,
      files_skipped: skipped,
      branch: targetBranch,
      created_repo: createdRepo,
      commit_sha: commitSha
    })
  } catch (err) {
    console.error('[GitHub Export] Error:', err.message)
    const status = err.status && err.status < 500 ? err.status : 500
    res.status(status).json({ error: err.message || 'GitHub export failed' })
  }
})

router.post('/:projectId/runtime-qa', requireAuth, async (req, res) => {
  const project = await getOwnedProject(req.params.projectId, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  const plan = await getUserPlan(req.user.id)
  if (!PAID_PLANS.has(plan)) {
    return res.status(403).json({
      error: 'Runtime QA is available on Pro and Business plans.',
      upgrade_required: true
    })
  }

  if (!project.subdomain) return res.status(400).json({ error: 'Build the app before running Runtime QA.' })

  try {
    const url = `https://${project.subdomain}.44gen.com`
    const result = await runRuntimeQa(url)
    await supabase.from('runtime_qa_runs').insert({
      project_id: project.id,
      user_id: req.user.id,
      status: result.ok ? 'passed' : 'issues_found',
      url,
      result
    })
    res.json(result)
  } catch (err) {
    console.error('[Runtime QA] Error:', err)
    res.status(err.status || 500).json({
      error: err.message || 'Runtime QA failed',
      setup_required: err.status === 503
    })
  }
})

router.post('/:projectId/import/github', requireAuth, async (req, res) => {
  const project = await getOwnedProject(req.params.projectId, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  try {
    const token = await getGithubAccessToken(req.user.id)
    if (!token) return res.status(400).json({ error: 'Connect GitHub first.' })

    const owner = String(req.body?.owner || '').trim()
    const repo = String(req.body?.repo || '').trim()
    const branch = req.body?.branch ? String(req.body.branch).trim() : undefined
    if (!owner || !repo) return res.status(400).json({ error: 'GitHub owner and repo are required.' })
    if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
      return res.status(400).json({ error: 'Invalid GitHub owner or repo name' })
    }

    const imported = await readGithubSourceFiles({ token, owner, repo, branch })
    if (!imported.files.length) {
      return res.status(400).json({ error: 'No supported src files found in that repository.' })
    }

    const { data: rows } = await supabase
      .from('project_files')
      .select('file_path, content')
      .eq('project_id', project.id)
      .order('file_path', { ascending: true })
    const previousFiles = sanitizeGeneratedFiles((rows || []).map(file => ({
      path: file.file_path,
      content: file.content
    })))

    await supabase.from('project_files').delete().eq('project_id', project.id)
    await supabase.from('project_files').insert(imported.files.map(file => ({
      project_id: project.id,
      file_path: file.path,
      content: file.content,
      updated_at: new Date().toISOString()
    })))

    const job = await createManualBuildJob({
      project: { ...project, name: project.name || imported.repo },
      userId: req.user.id,
      files: imported.files,
      previousFiles,
      changedPath: `GitHub repo ${imported.repo}`
    })

    res.json({
      job_id: job.id,
      repo: imported.repo,
      branch: imported.branch,
      files_imported: imported.files.length
    })
  } catch (err) {
    console.error('[GitHub Import] Error:', err)
    res.status(err.status || 500).json({ error: err.message || 'GitHub import failed' })
  }
})

router.get('/:projectId/versions', requireAuth, async (req, res) => {
  const project = await getOwnedProject(req.params.projectId, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  const { data, error } = await supabase
    .from('project_versions')
    .select('id,version_number,summary,subdomain,credits_used,tokens_used,created_at')
    .eq('project_id', project.id)
    .order('version_number', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ versions: data || [] })
})

router.post('/:projectId/versions/:versionId/rollback', requireAuth, async (req, res) => {
  const project = await getOwnedProject(req.params.projectId, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  try {
    const { data: version, error } = await supabase
      .from('project_versions')
      .select('id,version_number,source_files')
      .eq('id', req.params.versionId)
      .eq('project_id', project.id)
      .single()
    if (error || !version) return res.status(404).json({ error: 'Version not found' })

    const files = sanitizeGeneratedFiles(version.source_files || [])
    if (!files.length) return res.status(400).json({ error: 'Version has no source files to restore.' })

    const { data: rows } = await supabase
      .from('project_files')
      .select('file_path, content')
      .eq('project_id', project.id)
      .order('file_path', { ascending: true })
    const previousFiles = sanitizeGeneratedFiles((rows || []).map(file => ({
      path: file.file_path,
      content: file.content
    })))

    await supabase.from('project_files').delete().eq('project_id', project.id)
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
      changedPath: `version ${version.version_number}`
    })

    res.json({ job_id: job.id, restored_version: version.version_number })
  } catch (err) {
    console.error('[Projects] Rollback failed:', err)
    if (err.status) return res.status(err.status).json({ error: err.message })
    res.status(500).json({ error: err.message || 'Rollback failed' })
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

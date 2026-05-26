import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { requireAuth } from '../middleware/auth.js'

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

function walkFiles(root, { skipDirs = SKIP_DIRS, textOnly = false } = {}) {
  const files = []
  if (!fs.existsSync(root)) return files

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') && entry.name !== '.env') continue
      if (entry.isDirectory() && skipDirs.has(entry.name)) continue

      const absolute = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(absolute)
      } else {
        const relative = path.relative(root, absolute).replaceAll(path.sep, '/')
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

export default router

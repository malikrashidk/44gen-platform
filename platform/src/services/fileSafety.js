import path from 'node:path'

const ALLOWED_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.json'])
const BLOCKED_SEGMENTS = new Set([
  '', '.', '..', 'node_modules', 'dist', '.git', '.vite-cache', '.env'
])

export function normalizeGeneratedFilePath(filePath) {
  if (typeof filePath !== 'string') {
    throw new Error('Generated file path must be a string')
  }

  const normalized = filePath
    .trim()
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')

  if (!normalized) throw new Error('Generated file path is empty')
  if (path.isAbsolute(normalized)) throw new Error(`Unsafe absolute file path: ${filePath}`)

  const parts = normalized.split('/')
  if (parts.some(part => BLOCKED_SEGMENTS.has(part) || part.startsWith('.'))) {
    throw new Error(`Unsafe generated file path: ${filePath}`)
  }

  const ext = path.extname(normalized).toLowerCase()
  const isAllowedSource = normalized.startsWith('src/') && ALLOWED_EXTENSIONS.has(ext)

  if (!isAllowedSource) {
    throw new Error(`Unsupported generated file path: ${filePath}`)
  }

  return normalized
}

export function sanitizeGeneratedFiles(files) {
  const seen = new Set()
  return (files || []).map(file => {
    const safePath = normalizeGeneratedFilePath(file.path)
    if (seen.has(safePath)) throw new Error(`Duplicate generated file path: ${safePath}`)
    seen.add(safePath)
    return {
      path: safePath,
      content: String(file.content || '')
    }
  })
}

export function resolveProjectFilePath(projectDir, filePath) {
  const safePath = normalizeGeneratedFilePath(filePath)
  const resolved = path.resolve(projectDir, safePath)
  const root = path.resolve(projectDir)

  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Generated file path escapes project directory: ${filePath}`)
  }

  return { safePath, absolutePath: resolved }
}

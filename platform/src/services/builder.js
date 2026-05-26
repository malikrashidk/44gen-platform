import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const USERS_DIR = '/var/www/44gen/users'
const NPM_CACHE_DIR = '/var/www/44gen/.npm-cache'
const TEMPLATE_DIR = '/var/www/44gen/.build-template'
let templateReadyPromise = null

const BASE_PACKAGE = {
  name: '44gen-build-template',
  version: '1.0.0',
  type: 'module',
  scripts: { build: 'vite build' },
  dependencies: {
    'react': '^18.2.0',
    'react-dom': '^18.2.0',
    'react-router-dom': '^6.8.0',
    'lucide-react': '^0.460.0',
    'recharts': '^2.12.0',
    'axios': '^1.6.0',
    'date-fns': '^3.0.0',
    'clsx': '^2.0.0'
  },
  devDependencies: {
    '@vitejs/plugin-react': '^4.0.0',
    'vite': '^5.0.0'
  }
}

const VITE_CONFIG = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], base: '/', cacheDir: './.vite-cache' })`

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>App</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>`

const MAIN_JSX = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)`

export async function buildAndDeploy(projectId, code, onProgress) {
  const subdomain = `app-${projectId.slice(0, 8)}`
  const projectDir = path.join(USERS_DIR, subdomain)

  const emit = (type, message) => {
    if (onProgress) onProgress({ type, message })
  }

  emit('installing', 'Preparing build template...')
  await ensureBuildTemplate((message) => emit('installing', message))
  prepareProjectDir(projectDir, subdomain)

  let safeCode = normalizeGeneratedCode(code)
  if (!safeCode.includes('export default')) {
    const match = safeCode.match(/function\s+([A-Z][A-Za-z0-9]*)\s*\(/)
    if (match) {
      safeCode = safeCode + `\n\nexport default ${match[1]}`
    } else {
      safeCode = safeCode + '\n\nexport default App'
    }
  }
  fs.writeFileSync(path.join(projectDir, 'src', 'App.jsx'), safeCode)

  try {
    emit('building', 'Building with Vite...')
    await runCommand('npm', ['run', 'build'], projectDir, (line) => {
      if (line.includes('transforming')) emit('building', 'Compiling modules...')
      if (line.includes('rendering')) emit('building', 'Rendering chunks...')
      if (line.includes('built in')) {
        const time = line.match(/built in (.+)/)
        emit('building', `Build complete! ${time ? time[1] : ''}`)
      }
    })
  } catch (err) {
    try { fs.rmSync(projectDir, { recursive: true, force: true }) } catch {}
    throw err
  }

  emit('deploying', 'Going live...')
  return subdomain
}

async function ensureBuildTemplate(onProgress) {
  if (!templateReadyPromise) {
    templateReadyPromise = createOrUpdateTemplate(onProgress).catch((err) => {
      templateReadyPromise = null
      throw err
    })
  }
  return templateReadyPromise
}

async function createOrUpdateTemplate(onProgress) {
  fs.mkdirSync(TEMPLATE_DIR, { recursive: true })
  fs.mkdirSync(path.join(TEMPLATE_DIR, 'src'), { recursive: true })
  fs.mkdirSync(NPM_CACHE_DIR, { recursive: true })

  const packageJson = JSON.stringify(BASE_PACKAGE, null, 2)
  const packagePath = path.join(TEMPLATE_DIR, 'package.json')
  const packageChanged = !fs.existsSync(packagePath) || fs.readFileSync(packagePath, 'utf8') !== packageJson

  fs.writeFileSync(packagePath, packageJson)
  fs.writeFileSync(path.join(TEMPLATE_DIR, 'vite.config.js'), VITE_CONFIG)
  fs.writeFileSync(path.join(TEMPLATE_DIR, 'index.html'), INDEX_HTML)
  fs.writeFileSync(path.join(TEMPLATE_DIR, 'src', 'main.jsx'), MAIN_JSX)
  fs.writeFileSync(path.join(TEMPLATE_DIR, 'src', 'App.jsx'), 'export default function App() { return null }\n')

  const nodeModulesReady = fs.existsSync(path.join(TEMPLATE_DIR, 'node_modules', '.vite')) ||
    fs.existsSync(path.join(TEMPLATE_DIR, 'node_modules', 'vite'))

  if (packageChanged || !nodeModulesReady) {
    onProgress?.('Installing shared dependencies...')
    await runCommand('npm', ['install', '--legacy-peer-deps', '--cache', NPM_CACHE_DIR], TEMPLATE_DIR, (line) => {
      const match = line.match(/added (\d+) packages/)
      if (match) onProgress?.(`Shared dependencies ready (${match[1]} packages)`)
    })
  } else {
    onProgress?.('Shared dependencies ready')
  }
}

function prepareProjectDir(projectDir, subdomain) {
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true, force: true })
  }

  fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true })
  const appPackage = { ...BASE_PACKAGE, name: subdomain }
  fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify(appPackage, null, 2))
  fs.writeFileSync(path.join(projectDir, 'vite.config.js'), VITE_CONFIG)
  fs.writeFileSync(path.join(projectDir, 'index.html'), INDEX_HTML)
  fs.writeFileSync(path.join(projectDir, 'src', 'main.jsx'), MAIN_JSX)

  const templateNodeModules = path.join(TEMPLATE_DIR, 'node_modules')
  const projectNodeModules = path.join(projectDir, 'node_modules')
  try {
    fs.symlinkSync(templateNodeModules, projectNodeModules, 'dir')
  } catch {
    fs.cpSync(templateNodeModules, projectNodeModules, { recursive: true })
  }
}

function normalizeGeneratedCode(code) {
  const unfenced = code
    .replace(/^\s*```(?:jsx|tsx|javascript|js)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  let cleaned = unfenced
  const moduleScript = cleaned.match(/<script\b[^>]*type=["']module["'][^>]*>([\s\S]*?)<\/script>/i)
  if (moduleScript?.[1]) cleaned = moduleScript[1].trim()

  cleaned = cleaned
    .replace(/^\s*<!doctype[^>]*>\s*/i, '')
    .replace(/<\/?(?:html|head|body)\b[^>]*>/gi, '')
    .replace(/<script\b[^>]*>/gi, '')
    .replace(/<\/script>/gi, '')
    .replace(/from\s+['"]https:\/\/esm\.sh\/lucide-react(?:@[^'"]*)?['"]/gi, "from 'lucide-react'")
    .replace(/from\s+['"]https:\/\/esm\.sh\/react(?:@[^'"]*)?['"]/gi, "from 'react'")
    .replace(/from\s+['"]https:\/\/esm\.sh\/react-dom\/client(?:@[^'"]*)?['"]/gi, "from 'react-dom/client'")
    .replace(/from\s+['"]https:\/\/esm\.sh\/react-dom(?:@[^'"]*)?['"]/gi, "from 'react-dom'")
    .replace(/^\s*import\s+.*?\s+from\s+['"]react-dom(?:\/client)?['"];?\s*$/gmi, '')
    .replace(/window\.ReactDOM\s*=\s*\{[\s\S]*?\};?/gi, '')
    .replace(/window\.lucideReact\s*=\s*\{[\s\S]*?\};?/gi, '')
    .replace(/ReactDOM\.createRoot[\s\S]*?;\s*/gi, '')
    .replace(/createRoot\([\s\S]*?;\s*/gi, '')
    .replace(/ReactDOM\.render\([\s\S]*?\);?/gi, '')
    .trim()

  cleaned = cleaned.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (match, attrs, body) => {
    if (!body.trim() || body.trimStart().startsWith('{`')) return match
    const escaped = body.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
    return `<style${attrs}>{\`${escaped}\`}</style>`
  })

  return cleaned
}

function runCommand(cmd, args, cwd, onLine) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, timeout: 180000 })
    let stderr = ''

    proc.stdout.on('data', (data) => {
      data.toString().split('\n').filter(Boolean).forEach(line => onLine?.(line))
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
      data.toString().split('\n').filter(Boolean).forEach(line => onLine?.(line))
    })

    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr || `Command failed with code ${code}`))
      else resolve()
    })

    proc.on('error', reject)
  })
}

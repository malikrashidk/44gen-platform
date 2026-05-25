const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const USERS_DIR = '/var/www/44gen/users'

async function buildAndDeploy(projectId, code, onProgress) {
  const subdomain = `app-${projectId.slice(0, 8)}`
  const projectDir = path.join(USERS_DIR, subdomain)

  const emit = (type, message, extra = {}) => {
    if (onProgress) onProgress({ type, message, ...extra })
  }

  // Clean existing directory
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true, force: true })
  }
  fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true })

  // Write package.json
  fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({
    name: subdomain,
    version: '1.0.0',
    type: 'module',
    scripts: { build: 'vite build' },
    dependencies: {
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'react-router-dom': '^6.8.0',
      'lucide-react': 'latest',
      'recharts': '^3.0.0',
      'axios': '^1.6.0',
      'date-fns': '^3.0.0',
      'clsx': '^2.0.0'
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.0.0',
      'vite': '^5.0.0'
    }
  }, null, 2))

  // Write vite.config.js
  fs.writeFileSync(path.join(projectDir, 'vite.config.js'),
`import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], base: '/' })`)

  // Write index.html
  fs.writeFileSync(path.join(projectDir, 'index.html'),
`<!DOCTYPE html>
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
</html>`)

  // Write main.jsx
  fs.writeFileSync(path.join(projectDir, 'src', 'main.jsx'),
`import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)`)

  // Write App.jsx
  fs.writeFileSync(path.join(projectDir, 'src', 'App.jsx'), code)

  // npm install with progress
  emit('installing', 'Installing dependencies...')
  await runCommand('npm', ['install', '--legacy-peer-deps'], projectDir, (line) => {
    const match = line.match(/added (\d+) packages/)
    if (match) emit('installing', `Installing dependencies... (${match[1]} packages)`)
  })

  // vite build with progress
  emit('building', 'Building with Vite...')
  await runCommand('npm', ['run', 'build'], projectDir, (line) => {
    if (line.includes('transforming')) emit('building', 'Compiling modules...')
    if (line.includes('rendering')) emit('building', 'Rendering chunks...')
    if (line.includes('built in')) {
      const time = line.match(/built in (.+)/)
      emit('building', `Build complete! ${time ? time[1] : ''}`)
    }
  })

  emit('deploying', 'Going live...')
  return subdomain
}

function runCommand(cmd, args, cwd, onLine) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, timeout: 180000 })
    let stderr = ''

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean)
      lines.forEach(line => onLine && onLine(line))
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
      const lines = data.toString().split('\n').filter(Boolean)
      lines.forEach(line => onLine && onLine(line))
    })

    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr || `Command failed with code ${code}`))
      else resolve()
    })

    proc.on('error', reject)
  })
}

module.exports = { buildAndDeploy }

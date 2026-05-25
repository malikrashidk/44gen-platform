const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const USERS_DIR = '/var/www/44gen/users'

async function buildAndDeploy(projectId, code) {
  const subdomain = `app-${projectId.slice(0, 8)}`
  const projectDir = path.join(USERS_DIR, subdomain)

  console.log(`[Builder] Starting build for ${subdomain}`)

  // Clean existing directory
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true, force: true })
  }

  // Create fresh directory
  fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true })
  console.log(`[Builder] Created directory: ${projectDir}`)

  // Write package.json with latest versions
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
export default defineConfig({
  plugins: [react()],
  base: '/'
})`)

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

  // Write generated App.jsx
  fs.writeFileSync(path.join(projectDir, 'src', 'App.jsx'), code)
  console.log(`[Builder] Files written`)

  // Install dependencies
  try {
    console.log(`[Builder] Installing dependencies...`)
    const installOutput = execSync('npm install --legacy-peer-deps', {
      cwd: projectDir,
      timeout: 180000
    })
    console.log(`[Builder] Install done`)
  } catch (err) {
    console.error(`[Builder] Install failed: ${err.stderr?.toString()}`)
    throw new Error('npm install failed: ' + err.stderr?.toString())
  }

  // Build
  try {
    console.log(`[Builder] Building...`)
    execSync('npm run build', {
      cwd: projectDir,
      timeout: 180000
    })
    console.log(`[Builder] Build successful!`)
  } catch (err) {
    console.error(`[Builder] Build failed: ${err.stderr?.toString()}`)
    throw new Error('Build failed: ' + err.stderr?.toString())
  }

  console.log(`[Builder] Successfully deployed: ${subdomain}`)
  return subdomain
}

module.exports = { buildAndDeploy }

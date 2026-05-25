const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const USERS_DIR = '/var/www/44gen/users'
const TEMPLATE_DIR = '/var/www/44gen/platform/template'

async function buildAndDeploy(projectId, code) {
  const subdomain = `app-${projectId.slice(0, 8)}`
  const projectDir = path.join(USERS_DIR, subdomain)

  // Create project directory
  fs.mkdirSync(projectDir, { recursive: true })

  // Create minimal Vite + React structure
  fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true })

  // Write package.json
  fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({
    name: subdomain,
    version: '1.0.0',
    type: 'module',
    scripts: { build: 'vite build' },
    dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
    devDependencies: {
      '@vitejs/plugin-react': '^4.0.0',
      'vite': '^5.0.0',
      'tailwindcss': '^3.4.0',
      'autoprefixer': '^10.4.0',
      'postcss': '^8.4.0'
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

  // Install dependencies and build
  execSync('npm install --legacy-peer-deps', {
    cwd: projectDir,
    timeout: 120000,
    stdio: 'pipe'
  })

  execSync('npm run build', {
    cwd: projectDir,
    timeout: 120000,
    stdio: 'pipe'
  })

  return subdomain
}

module.exports = { buildAndDeploy }

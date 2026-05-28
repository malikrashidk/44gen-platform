import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { resolveProjectFilePath, sanitizeGeneratedFiles } from './fileSafety.js'

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

const DEFAULT_FAVICON = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%23ff3cac'/><stop offset='50%25' stop-color='%23784ba0'/><stop offset='100%25' stop-color='%232b86c5'/></linearGradient></defs><rect width='64' height='64' rx='14' fill='url(%23g)'/><text x='50%25' y='50%25' dominant-baseline='central' text-anchor='middle' font-family='Arial,sans-serif' font-weight='900' font-size='26' fill='white'>44</text></svg>`

function buildIndexHtml({ title = 'App', faviconUrl = null, faviconEmoji = null } = {}) {
  let faviconTag = ''
  if (faviconEmoji) {
    faviconTag = `<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${faviconEmoji}</text></svg>" />`
  } else if (faviconUrl) {
    // FIX #7: Sanitize faviconUrl — encode any characters that could break out of the HTML attribute
    // (already sanitized upstream in build.js sanitizeFaviconUrl, but defence in depth here)
    // FIX #7: Use encodeURIComponent for safe chars — avoids Python string escape issues with quote chars
    const safeFaviconUrl = String(faviconUrl).replace(/['"<>&]/g, encodeURIComponent)
    faviconTag = `<link rel="icon" href="${safeFaviconUrl}" />`
  } else {
    faviconTag = `<link rel="icon" href="${DEFAULT_FAVICON}" />`
  }

  // Visual editor bridge — injected into every built app
  // Activated via postMessage from the 44Gen editor
  const visualBridge = `
<script>
(function() {
  var is44GenPreview = new URLSearchParams(window.location.search).get('__44gen_preview') === '1';
  if (!is44GenPreview) return;
  var active = false;
  var hoveredEl = null;
  var hoverBox = null;
  var errorToast = null;
  var errorDetails = '';

  function showRuntimeErrorToast(details) {
    errorDetails = String(details || 'Unknown app error').slice(0, 3000);
    if (!errorToast) {
      errorToast = document.createElement('div');
      errorToast.id = '__44gen_error_toast__';
      errorToast.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:100000;max-width:360px;background:#fff;color:#1f2937;border:1px solid rgba(239,68,68,0.25);box-shadow:0 20px 60px rgba(15,23,42,0.22);border-radius:14px;padding:14px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;';
      errorToast.innerHTML = '<div style="display:flex;gap:10px;align-items:flex-start;"><div style="width:28px;height:28px;border-radius:999px;background:rgba(239,68,68,0.12);color:#ef4444;display:flex;align-items:center;justify-content:center;font-weight:900;flex-shrink:0;">!</div><div style="min-width:0;flex:1;"><div style="font-size:14px;font-weight:800;margin-bottom:4px;">Something needs a quick fix</div><div style="font-size:12px;line-height:1.45;color:#64748b;margin-bottom:10px;">The preview hit an app error. 44Gen can inspect the details and repair it.</div><details style="font-size:11px;color:#64748b;margin-bottom:10px;"><summary style="cursor:pointer;font-weight:700;color:#334155;">Details</summary><pre id="__44gen_error_details__" style="white-space:pre-wrap;max-height:120px;overflow:auto;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px;margin:7px 0 0;"></pre></details><div style="display:flex;gap:8px;"><button id="__44gen_fix_error__" style="border:0;border-radius:8px;background:#BC6045;color:white;font-size:12px;font-weight:800;padding:7px 10px;cursor:pointer;">Fix it</button><button id="__44gen_dismiss_error__" style="border:1px solid #e2e8f0;border-radius:8px;background:white;color:#475569;font-size:12px;font-weight:700;padding:7px 10px;cursor:pointer;">Dismiss</button></div></div></div>';
      document.body.appendChild(errorToast);
      document.getElementById('__44gen_fix_error__').addEventListener('click', function() {
        window.parent.postMessage({ type: '__44gen_runtime_error_fix__', details: errorDetails, url: location.href }, '*');
      });
      document.getElementById('__44gen_dismiss_error__').addEventListener('click', function() {
        if (errorToast) errorToast.style.display = 'none';
      });
    }
    var detailsEl = document.getElementById('__44gen_error_details__');
    if (detailsEl) detailsEl.textContent = errorDetails;
    errorToast.style.display = 'block';
    window.parent.postMessage({ type: '__44gen_runtime_error__', details: errorDetails, url: location.href }, '*');
  }

  function getPath(el) {
    var path = [];
    while (el && el !== document.body) {
      var idx = Array.from(el.parentNode?.children || []).indexOf(el) + 1;
      var tag = el.tagName.toLowerCase();
      var cls = el.className && typeof el.className === 'string'
        ? el.className.trim().split(/\s+/).slice(0,3).join('.').replace(/[^a-zA-Z0-9._-]/g,'')
        : '';
      path.unshift(tag + (cls ? '.' + cls : '') + ':nth-child(' + idx + ')');
      el = el.parentNode;
    }
    return path.join(' > ');
  }

  function getStyles(el) {
    var cs = window.getComputedStyle(el);
    return {
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      padding: cs.padding,
      margin: cs.margin,
      borderRadius: cs.borderRadius,
      textContent: (el.innerText || '').slice(0, 200)
    };
  }

  function createHoverBox() {
    var box = document.createElement('div');
    box.id = '__44gen_hover__';
    box.style.cssText = 'position:fixed;pointer-events:none;z-index:99999;border:2px solid #BC6045;background:rgba(188,96,69,0.08);border-radius:4px;transition:all 0.1s ease;box-sizing:border-box;';
    var label = document.createElement('div');
    label.id = '__44gen_label__';
    label.style.cssText = 'position:absolute;top:-22px;left:0;background:#BC6045;color:#fff;font-size:11px;font-family:monospace;padding:2px 7px;border-radius:4px 4px 0 0;white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis;';
    box.appendChild(label);
    document.body.appendChild(box);
    return box;
  }

  function updateHoverBox(el) {
    if (!hoverBox) hoverBox = createHoverBox();
    var r = el.getBoundingClientRect();
    hoverBox.style.display = 'block';
    hoverBox.style.top = r.top + 'px';
    hoverBox.style.left = r.left + 'px';
    hoverBox.style.width = r.width + 'px';
    hoverBox.style.height = r.height + 'px';
    var label = document.getElementById('__44gen_label__');
    if (label) label.textContent = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '');
  }

  function hideHoverBox() {
    if (hoverBox) hoverBox.style.display = 'none';
  }

  function onMouseMove(e) {
    if (!active) return;
    var el = e.target;
    if (el === hoverBox || el.closest('#__44gen_hover__')) return;
    hoveredEl = el;
    updateHoverBox(el);
  }

  function onClick(e) {
    if (!active) return;
    var el = e.target;
    if (el === hoverBox || el.closest('#__44gen_hover__')) return;
    e.preventDefault();
    e.stopPropagation();
    var styles = getStyles(el);
    window.parent.postMessage({
      type: '__44gen_element_selected__',
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || '').slice(0, 300),
      path: getPath(el),
      styles: styles,
      rect: { top: el.getBoundingClientRect().top, left: el.getBoundingClientRect().left }
    }, '*');
  }

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === '__44gen_inspect_on__') {
      active = true;
      document.body.style.cursor = 'crosshair';
      document.addEventListener('mousemove', onMouseMove, true);
      document.addEventListener('click', onClick, true);
    }
    if (e.data && e.data.type === '__44gen_inspect_off__') {
      active = false;
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('click', onClick, true);
      hideHoverBox();
    }
  });

  window.addEventListener('error', function(e) {
    showRuntimeErrorToast((e.message || 'Runtime error') + '\\n' + (e.filename || '') + ':' + (e.lineno || '') + ':' + (e.colno || '') + '\\n' + (e.error && e.error.stack ? e.error.stack : ''));
  });

  window.addEventListener('unhandledrejection', function(e) {
    var reason = e.reason;
    showRuntimeErrorToast('Unhandled promise rejection\\n' + (reason && reason.stack ? reason.stack : reason && reason.message ? reason.message : String(reason || 'Unknown rejection')));
  });
})();
</script>
`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  ${faviconTag}
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  ${visualBridge}
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>`
}

const INDEX_HTML = buildIndexHtml()

const MAIN_JSX = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)`

// Accept either:
//   files: Array<{ path: string, content: string }>  (multi-file, new)
//   files: string                                     (single App.jsx, backward compat)
export async function buildAndDeploy(projectId, files, onProgress, meta = {}) {
  const subdomain = `app-${projectId.slice(0, 8)}`
  const projectDir = path.join(USERS_DIR, subdomain)

  // Normalize to array
  const fileList = sanitizeGeneratedFiles(Array.isArray(files)
    ? files
    : [{ path: 'src/App.jsx', content: files }])

  const emit = (type, message) => {
    if (onProgress) onProgress({ type, message })
  }

  emit('installing', 'Preparing build template...')
  await ensureBuildTemplate((message) => emit('installing', message))
  prepareProjectDir(projectDir, subdomain)

  // Write custom index.html with app title and favicon
  const customIndex = buildIndexHtml({
    title: meta.appName || 'App',
    faviconEmoji: meta.faviconEmoji || null,
    faviconUrl: meta.faviconUrl || null,
  })
  fs.writeFileSync(path.join(projectDir, 'index.html'), customIndex)

  // Write all generated files
  for (const file of fileList) {
    const { safePath, absolutePath } = resolveProjectFilePath(projectDir, file.path)
    const absDir = path.dirname(absolutePath)

    // Ensure the directory exists (e.g. src/components/, src/pages/)
    fs.mkdirSync(absDir, { recursive: true })

    let content = file.content

    // Normalize App.jsx specifically (strip fences, fix exports, etc.)
    if (safePath === 'src/App.jsx') {
      content = normalizeGeneratedCode(content)
      if (!content.includes('export default')) {
        const match = content.match(/function\s+([A-Z][A-Za-z0-9]*)\s*\(/)
        content = content + `\n\nexport default ${match ? match[1] : 'App'}`
      }
    } else {
      // For component/page files: strip markdown fences if present
      content = content
        .replace(/^```(?:jsx|tsx|javascript|js)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim()
    }

    fs.writeFileSync(absolutePath, content)
  }

  const fileNames = fileList.map(f => f.path).join(', ')
  console.log(`[Builder] Wrote ${fileList.length} file(s): ${fileNames}`)

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
    emit('building', 'Checking app completeness...')
    runGeneratedAppQa(projectDir, fileList)
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
      // FIX #12: Log when the promise resets so failures are visible in PM2 logs
      console.error('[Builder] Build template creation failed — will retry on next build:', err.message)
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
  } catch (symlinkErr) {
    // FIX #13: Log this — cpSync copies ~200MB and 3 concurrent falls could fill the disk fast
    console.warn(`[Builder] node_modules symlink failed for ${path.basename(projectDir)}, falling back to full copy (~200MB). Error: ${symlinkErr.message}`)
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

function runGeneratedAppQa(projectDir, fileList) {
  const issues = []
  const actionWords = /\b(add|apply|book|buy|cancel|checkout|connect|continue|create|delete|download|edit|export|filter|import|login|log in|new|publish|remove|save|search|send|share|sign in|sign up|submit|update|upload)\b/i
  const sourceFiles = fileList.filter(file => /\.(jsx?|tsx?)$/i.test(file.path))

  for (const file of sourceFiles) {
    const filePath = path.join(projectDir, file.path)
    if (!fs.existsSync(filePath)) continue
    const content = fs.readFileSync(filePath, 'utf8')

    if (/\b(todo|coming soon|not implemented|placeholder|lorem ipsum|dummy data only)\b/i.test(content)) {
      issues.push(`${file.path}: contains placeholder or unfinished user-facing text`)
    }
    if (/onClick=\{\s*(?:\(\)\s*=>\s*)?(?:\{\s*\}|void\s+0|undefined|null)\s*\}/i.test(content)) {
      issues.push(`${file.path}: contains an empty click handler`)
    }
    if (/onClick=\{[^}]*alert\s*\(/i.test(content)) {
      issues.push(`${file.path}: uses alert() as an action instead of implementing the flow`)
    }
    if (/(href=["']#["']|href=["']javascript:void\(0\)["'])/i.test(content)) {
      issues.push(`${file.path}: contains a dead link href`)
    }

    const buttonMatches = content.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)
    for (const match of buttonMatches) {
      const attrs = match[1] || ''
      const label = stripJsxText(match[2] || '')
      if (!actionWords.test(label)) continue
      const hasHandler = /\bonClick\s*=/.test(attrs) || /\btype=["']submit["']/.test(attrs)
      if (!hasHandler) {
        issues.push(`${file.path}: action button "${label.slice(0, 60)}" has no click handler`)
      }
    }
  }

  if (issues.length) {
    throw new Error(`Generated app QA failed:\n${issues.slice(0, 12).join('\n')}\nMake these user flows functional with React state and preserve all existing files.`)
  }
}

function stripJsxText(value) {
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[\s\S]*?\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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

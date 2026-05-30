const MAX_CLICKS = 18

function uniqueSelectorForText(tag, text) {
  const safeText = String(text || '').trim().replace(/\s+/g, ' ').slice(0, 80)
  if (!safeText) return tag
  return `${tag}:has-text("${safeText.replaceAll('"', '\\"')}")`
}

function isSafeActionText(text = '') {
  if (!text.trim()) return false
  if (/\b(delete|remove|destroy|logout|log out|sign out|pay|purchase|checkout|subscribe)\b/i.test(text)) return false
  return /\b(add|apply|book|cancel|clear|close|continue|create|edit|filter|learn|login|log in|new|next|open|save|search|send|share|submit|update|view)\b/i.test(text)
}

function normalizeIssue(message, details = '') {
  return {
    message: String(message || 'Issue detected').slice(0, 220),
    details: String(details || '').slice(0, 1200)
  }
}

export async function runRuntimeQa(url) {
  let chromium
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    console.warn('[RuntimeQA] Playwright not installed — skipping')
    return { ok: true, skipped: true, issues: [], summary: 'Runtime QA skipped.' }
  }

  let browser
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    })
  } catch (launchErr) {
    console.warn('[RuntimeQA] Browser launch failed — skipping:', launchErr.message)
    return { ok: true, skipped: true, issues: [], summary: 'Runtime QA skipped (browser unavailable).' }
  }

  const issues = []
  const actions = []
  const pageErrors = []
  const consoleErrors = []

  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } })
    page.setDefaultTimeout(6000)
    page.on('pageerror', err => {
      pageErrors.push(err.stack || err.message)
    })
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // Ignore browser extension, HMR, DevTools, and source-map noise
        if (/\[vite\]|\[hmr\]|react.devtools|chrome-extension:|favicon\.ico|\.map$/i.test(text)) return
        consoleErrors.push(text)
      }
    })

    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 })
    if (!response || response.status() >= 400) {
      issues.push(normalizeIssue('The app did not load cleanly.', `HTTP status: ${response?.status() || 'no response'}`))
    }

    await page.waitForTimeout(600)
    const title = await page.title().catch(() => '')

    const candidates = await page.locator('button, a, [role="button"], input[type="submit"]').evaluateAll(nodes => nodes.map((node, index) => {
      const text = (node.innerText || node.value || node.getAttribute('aria-label') || node.getAttribute('title') || '').trim()
      const tag = node.tagName.toLowerCase()
      const href = node.getAttribute('href') || ''
      const disabled = node.disabled || node.getAttribute('aria-disabled') === 'true'
      const visible = Boolean(node.offsetWidth || node.offsetHeight || node.getClientRects().length)
      return { index, tag, text, href, disabled, visible }
    }))

    for (const candidate of candidates.slice(0, 80)) {
      if (actions.length >= MAX_CLICKS) break
      if (!candidate.visible || candidate.disabled) continue
      if (candidate.tag === 'a' && candidate.href && /^(mailto:|tel:|#)/i.test(candidate.href)) continue
      if (!isSafeActionText(candidate.text)) continue

      const beforeUrl = page.url()
      const beforeText = await page.locator('body').innerText().catch(() => '')
      const selector = uniqueSelectorForText(candidate.tag, candidate.text)
      const locator = page.locator(selector).first()

      try {
        await locator.click({ trial: true })
        await locator.click()
        await page.waitForTimeout(350)
        const afterText = await page.locator('body').innerText().catch(() => '')
        const afterUrl = page.url()
        actions.push({ label: candidate.text || candidate.tag, status: 'tested' })
        if (afterText === beforeText && afterUrl === beforeUrl && /\b(add|create|save|submit|send|search|filter|login|log in)\b/i.test(candidate.text)) {
          issues.push(normalizeIssue(`"${candidate.text}" may not do anything.`, 'Clicking this action did not visibly change the page or URL.'))
        }
        if (afterUrl !== beforeUrl) await page.goto(url, { waitUntil: 'networkidle', timeout: 12000 }).catch(() => {})
      } catch (err) {
        issues.push(normalizeIssue(`Could not test "${candidate.text || candidate.tag}".`, err.message))
      }
    }

    for (const err of pageErrors.slice(0, 5)) {
      issues.push(normalizeIssue('Runtime error detected.', err))
    }
    for (const err of consoleErrors.slice(0, 5)) {
      issues.push(normalizeIssue('Console error detected.', err))
    }

    const uniqueIssues = []
    const seen = new Set()
    for (const issue of issues) {
      const key = `${issue.message}:${issue.details}`
      if (seen.has(key)) continue
      seen.add(key)
      uniqueIssues.push(issue)
    }

    return {
      ok: uniqueIssues.length === 0,
      url,
      title,
      tested_actions: actions.slice(0, MAX_CLICKS),
      issues: uniqueIssues.slice(0, 16),
      summary: uniqueIssues.length
        ? `Runtime QA found ${uniqueIssues.length} issue${uniqueIssues.length === 1 ? '' : 's'} across ${actions.length} tested action${actions.length === 1 ? '' : 's'}.`
        : `Runtime QA passed. I tested ${actions.length} visible action${actions.length === 1 ? '' : 's'} and did not find runtime errors.`
    }
  } finally {
    await browser.close().catch(() => {})
  }
}

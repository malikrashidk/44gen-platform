import { useState, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL

/**
 * #26: Extracted from Editor.jsx — handles all GitHub OAuth connection and export state/logic.
 * Self-contained: manages githubConnection, export form, results, and the OAuth popup flow.
 */
export function useGitHubExport({ session, projectId }) {
  const [githubExportOpen, setGithubExportOpen] = useState(false)
  const [githubExporting, setGithubExporting] = useState(false)
  const [githubExportForm, setGithubExportForm] = useState({
    token: '',
    owner: '',
    repo: '',
    branch: 'main',
    privateRepo: true,
    createRepo: true,
    commitMessage: 'Export from 44Gen'
  })
  const [githubExportResult, setGithubExportResult] = useState(null)
  const [githubExportError, setGithubExportError] = useState('')
  const [githubConnection, setGithubConnection] = useState(null)
  const [githubConnecting, setGithubConnecting] = useState(false)

  const loadGitHubConnection = useCallback(async () => {
    if (!session?.access_token) return
    try {
      const res = await fetch(`${API}/api/github/status`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      setGithubConnection(data.connected ? data : null)
      if (data.connected && data.login) {
        setGithubExportForm(prev => ({ ...prev, owner: data.login }))
      }
    } catch {}
  }, [session?.access_token])

  useEffect(() => {
    if (session?.access_token) loadGitHubConnection()
  }, [session?.access_token, loadGitHubConnection])

  const startGitHubConnect = useCallback(async () => {
    if (!session?.access_token) return
    setGithubConnecting(true)
    setGithubExportError('')
    try {
      const res = await fetch(`${API}/api/github/connect/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ origin: window.location.origin })
      })
      const { url } = await res.json()
      if (!url) throw new Error('No OAuth URL returned')
      const popup = window.open(url, '44gen-github-oauth', 'width=600,height=700,scrollbars=yes')
      if (!popup) {
        setGithubExportError('Popup was blocked. Allow popups for this site and try again.')
        setGithubConnecting(false)
      }
    } catch (err) {
      setGithubExportError(err.message || 'Failed to start GitHub connection')
      setGithubConnecting(false)
    }
  }, [session?.access_token])

  const disconnectGitHub = useCallback(async () => {
    if (!session?.access_token) return
    try {
      await fetch(`${API}/api/github/disconnect`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      setGithubConnection(null)
      setGithubExportForm(prev => ({ ...prev, owner: '', token: '' }))
    } catch {}
  }, [session?.access_token])

  // Called by Editor.jsx when OAuth popup posts back
  const handleGitHubOAuthMessage = useCallback((event) => {
    if (event.data?.type !== '44gen_github_oauth') return
    setGithubConnecting(false)
    if (event.data.ok) {
      loadGitHubConnection()
      setGithubExportError('')
    } else {
      setGithubExportError(event.data.error || 'GitHub connection failed')
    }
  }, [loadGitHubConnection])

  const handleGitHubExport = useCallback(async () => {
    if (!session?.access_token || !projectId) return
    setGithubExporting(true)
    setGithubExportError('')
    setGithubExportResult(null)
    try {
      const res = await fetch(`${API}/api/projects/${projectId}/export/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          token: githubExportForm.token || undefined,
          owner: githubExportForm.owner,
          repo: githubExportForm.repo,
          branch: githubExportForm.branch,
          commitMessage: githubExportForm.commitMessage,
          privateRepo: githubExportForm.privateRepo,
          createRepo: githubExportForm.createRepo,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Export failed')
      setGithubExportResult(data)
    } catch (err) {
      setGithubExportError(err.message || 'Export failed')
    } finally {
      setGithubExporting(false)
    }
  }, [session?.access_token, projectId, githubExportForm])

  return {
    githubExportOpen, setGithubExportOpen,
    githubExporting,
    githubExportForm, setGithubExportForm,
    githubExportResult, setGithubExportResult,
    githubExportError, setGithubExportError,
    githubConnection,
    githubConnecting,
    loadGitHubConnection,
    startGitHubConnect,
    disconnectGitHub,
    handleGitHubOAuthMessage,
    handleGitHubExport,
  }
}

import { ExternalLink, Loader2, X } from 'lucide-react'

export default function GitHubExportModal({
  open,
  onClose,
  connection,
  connecting,
  exporting,
  form,
  setForm,
  error,
  result,
  onConnect,
  onDisconnect,
  onExport,
  darkMode,
  surface,
  border,
  text,
  muted
}) {
  if (!open) return null

  const d = darkMode
  const exportDisabled = exporting || (!connection?.connected && !form.token) || !form.owner || !form.repo

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
      <div style={{ width: 'min(460px, 100%)', borderRadius: 14, border: `1px solid ${border}`, background: surface, boxShadow: '0 24px 80px rgba(0,0,0,0.28)', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <ExternalLink size={18} style={{ color: '#BC6045' }} />
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: text }}>Export to GitHub</p>
              <p style={{ fontSize: 12, color: muted, marginTop: 2 }}>Create or update a repository with this app's source.</p>
            </div>
          </div>
          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: `1px solid ${border}`, borderRadius: 10, padding: 10 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: text, fontSize: 13, fontWeight: 800 }}>
                {connection?.connected ? `Connected as ${connection.login}` : 'Connect your GitHub account'}
              </p>
              <p style={{ color: muted, fontSize: 11, marginTop: 2, lineHeight: 1.4 }}>
                {connection?.connected ? 'Exports will use your connected account.' : 'Connect once, then export without pasting tokens.'}
              </p>
            </div>
            {connection?.connected ? (
              <button onClick={onDisconnect}
                style={{ border: `1px solid ${border}`, background: 'transparent', color: muted, borderRadius: 8, padding: '7px 9px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                Disconnect
              </button>
            ) : (
              <button onClick={onConnect}
                disabled={connecting}
                style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: '#24292f', color: '#fff', borderRadius: 8, padding: '8px 10px', fontSize: 12, fontWeight: 800, cursor: connecting ? 'default' : 'pointer', flexShrink: 0, opacity: connecting ? 0.7 : 1 }}>
                {connecting ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <ExternalLink size={12} />}
                Connect
              </button>
            )}
          </div>

          {!connection?.connected && (
            <label style={{ display: 'grid', gap: 5, fontSize: 12, color: text, fontWeight: 700 }}>
              Or paste a GitHub token
              <input type="password" value={form.token}
                onChange={e => setForm(prev => ({ ...prev, token: e.target.value }))}
                placeholder="ghp_... or fine-grained token"
                style={{ background: d ? '#111' : '#fff', border: `1px solid ${border}`, color: text, borderRadius: 9, padding: '9px 10px', fontSize: 13, outline: 'none' }} />
              <span style={{ color: muted, fontSize: 11, fontWeight: 500 }}>Fallback only. The token is sent for this export and is not saved.</span>
            </label>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={{ display: 'grid', gap: 5, fontSize: 12, color: text, fontWeight: 700 }}>
              Owner
              <input value={form.owner}
                onChange={e => setForm(prev => ({ ...prev, owner: e.target.value }))}
                placeholder="username or org"
                style={{ background: d ? '#111' : '#fff', border: `1px solid ${border}`, color: text, borderRadius: 9, padding: '9px 10px', fontSize: 13, outline: 'none' }} />
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 12, color: text, fontWeight: 700 }}>
              Repository
              <input value={form.repo}
                onChange={e => setForm(prev => ({ ...prev, repo: e.target.value }))}
                placeholder="my-app"
                style={{ background: d ? '#111' : '#fff', border: `1px solid ${border}`, color: text, borderRadius: 9, padding: '9px 10px', fontSize: 13, outline: 'none' }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
            <label style={{ display: 'grid', gap: 5, fontSize: 12, color: text, fontWeight: 700 }}>
              Branch
              <input value={form.branch}
                onChange={e => setForm(prev => ({ ...prev, branch: e.target.value }))}
                style={{ background: d ? '#111' : '#fff', border: `1px solid ${border}`, color: text, borderRadius: 9, padding: '9px 10px', fontSize: 13, outline: 'none' }} />
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 12, color: text, fontWeight: 700 }}>
              Commit message
              <input value={form.commitMessage}
                onChange={e => setForm(prev => ({ ...prev, commitMessage: e.target.value }))}
                style={{ background: d ? '#111' : '#fff', border: `1px solid ${border}`, color: text, borderRadius: 9, padding: '9px 10px', fontSize: 13, outline: 'none' }} />
            </label>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: text, fontSize: 12, fontWeight: 700 }}>
            <input type="checkbox" checked={form.createRepo}
              onChange={e => setForm(prev => ({ ...prev, createRepo: e.target.checked }))}
              style={{ width: 14, height: 14 }} />
            Create repository if it does not exist
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: text, fontSize: 12, fontWeight: 700, opacity: form.createRepo ? 1 : 0.55 }}>
            <input type="checkbox" checked={form.privateRepo}
              disabled={!form.createRepo}
              onChange={e => setForm(prev => ({ ...prev, privateRepo: e.target.checked }))}
              style={{ width: 14, height: 14 }} />
            Create as private repo
          </label>

          {error && (
            <div style={{ color: '#ef4444', fontSize: 12, lineHeight: 1.45, padding: 9, borderRadius: 9, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)' }}>
              {error}
            </div>
          )}

          {result && (
            <div style={{ color: text, fontSize: 12, lineHeight: 1.45, padding: 9, borderRadius: 9, border: '1px solid rgba(16,185,129,0.22)', background: 'rgba(16,185,129,0.08)' }}>
              Exported {result.files_uploaded} file{result.files_uploaded === 1 ? '' : 's'} to{' '}
              <a href={result.repo_url} target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', fontWeight: 800 }}>
                {result.repo_url}
              </a>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose}
            style={{ padding: '9px 12px', borderRadius: 9, border: `1px solid ${border}`, background: 'transparent', color: muted, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Close
          </button>
          <button onClick={onExport}
            disabled={exportDisabled}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 13px', borderRadius: 9, border: 'none', background: '#BC6045', color: '#fff', fontSize: 13, fontWeight: 800, cursor: exporting ? 'default' : 'pointer', opacity: exportDisabled ? 0.65 : 1 }}>
            {exporting ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <ExternalLink size={13} />}
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
}

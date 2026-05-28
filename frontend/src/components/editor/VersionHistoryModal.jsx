import { Loader2, RefreshCcw, X } from 'lucide-react'

export default function VersionHistoryModal({
  open,
  onClose,
  versions,
  loading,
  rollbackLoading,
  onRollback,
  border,
  surface,
  text,
  muted
}) {
  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 75, background: 'rgba(0,0,0,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
      <div style={{ width: 'min(520px, 100%)', maxHeight: '78vh', overflow: 'hidden', borderRadius: 14, border: `1px solid ${border}`, background: surface, boxShadow: '0 24px 80px rgba(0,0,0,0.28)' }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ color: text, fontSize: 15, fontWeight: 900 }}>Version history</p>
            <p style={{ color: muted, fontSize: 12, marginTop: 2 }}>Restore any successful build and rebuild it safely.</p>
          </div>
          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: 14, maxHeight: '58vh', overflowY: 'auto', display: 'grid', gap: 8 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: muted, fontSize: 13 }}>
              <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite', color: '#BC6045' }} /> Loading versions...
            </div>
          ) : versions.length ? versions.map(version => (
            <div key={version.id} style={{ border: `1px solid ${border}`, borderRadius: 10, padding: 11, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ color: text, fontSize: 13, fontWeight: 900 }}>Version {version.version_number}</p>
                <p style={{ color: muted, fontSize: 11, marginTop: 3 }}>{new Date(version.created_at).toLocaleString()}</p>
                {version.summary?.title && <p style={{ color: muted, fontSize: 12, marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{version.summary.title}</p>}
              </div>
              <button onClick={() => onRollback(version)}
                disabled={Boolean(rollbackLoading)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: '#BC6045', color: '#fff', borderRadius: 8, padding: '8px 10px', fontSize: 12, fontWeight: 800, cursor: rollbackLoading ? 'default' : 'pointer', opacity: rollbackLoading ? 0.65 : 1, flexShrink: 0 }}>
                {rollbackLoading === version.id ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <RefreshCcw size={12} />}
                Restore
              </button>
            </div>
          )) : (
            <p style={{ color: muted, fontSize: 13 }}>Version history will appear after the next successful build.</p>
          )}
        </div>
      </div>
    </div>
  )
}

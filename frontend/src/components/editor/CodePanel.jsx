import {
  CheckCircle2, Code, Copy, Download, FileCode, FolderOpen, Loader2, RefreshCw
} from 'lucide-react'

export default function CodePanel({
  codeFiles,
  fullCode,
  selectedCodeFile,
  setSelectedCodeFile,
  codeFilesLoading,
  loadProjectFiles,
  downloadProjectZip,
  downloadingProject,
  copiedFile,
  setCopiedFile,
  darkMode,
  text,
  muted
}) {
  const visibleCodeFiles = codeFiles.length
    ? codeFiles
    : (fullCode ? [{ path: 'src/App.jsx', content: fullCode }] : [])
  const selectedFile = visibleCodeFiles.find(file => file.path === selectedCodeFile) || visibleCodeFiles[0]
  const d = darkMode
  const codeBorder = d ? '#30363d' : '#d0d7de'

  const copySelectedFile = () => {
    if (!selectedFile?.content) return
    navigator.clipboard.writeText(selectedFile.content)
    setCopiedFile(true)
    setTimeout(() => setCopiedFile(false), 1400)
  }

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, background: d ? '#0d1117' : '#f6f8fa' }}>
      {visibleCodeFiles.length ? (
        <>
          <div style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${codeBorder}`, background: d ? '#0d1117' : '#fff', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ height: 42, padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottom: `1px solid ${codeBorder}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: text, fontSize: 12, fontWeight: 700, minWidth: 0 }}>
                <FolderOpen size={13} style={{ color: '#BC6045', flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Files</span>
                <span style={{ color: muted, fontWeight: 600 }}>({visibleCodeFiles.length})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <button onClick={loadProjectFiles}
                  disabled={codeFilesLoading}
                  title="Refresh files"
                  style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${codeBorder}`, background: d ? '#161b22' : '#f6f8fa', color: muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: codeFilesLoading ? 'default' : 'pointer', opacity: codeFilesLoading ? 0.6 : 1 }}>
                  <RefreshCw size={12} style={{ animation: codeFilesLoading ? 'spin 0.8s linear infinite' : 'none' }} />
                </button>
                <button onClick={downloadProjectZip}
                  disabled={downloadingProject}
                  title="Download project ZIP"
                  style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${codeBorder}`, background: d ? '#161b22' : '#f6f8fa', color: '#BC6045', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: downloadingProject ? 'default' : 'pointer', opacity: downloadingProject ? 0.6 : 1 }}>
                  {downloadingProject ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Download size={12} />}
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              {visibleCodeFiles.map(file => {
                const active = file.path === selectedFile?.path
                return (
                  <button key={file.path} onClick={() => setSelectedCodeFile(file.path)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '7px 8px',
                      borderRadius: 6,
                      border: 'none',
                      background: active ? 'rgba(188,96,69,0.12)' : 'transparent',
                      color: active ? '#BC6045' : muted,
                      cursor: 'pointer',
                      fontSize: 12,
                      textAlign: 'left',
                      fontFamily: 'monospace'
                    }}>
                    <FileCode size={12} style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.path}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 42, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottom: `1px solid ${codeBorder}`, color: muted, fontSize: 12, fontFamily: 'monospace' }}>
              <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{codeFilesLoading ? 'Loading files...' : selectedFile?.path}</span>
              <button onClick={copySelectedFile}
                disabled={!selectedFile?.content}
                title="Copy current file"
                style={{ display: 'flex', alignItems: 'center', gap: 5, height: 27, borderRadius: 7, border: `1px solid ${codeBorder}`, background: d ? '#161b22' : '#fff', color: copiedFile ? '#059669' : muted, padding: '0 9px', fontSize: 11, fontFamily: 'inherit', fontWeight: 700, cursor: selectedFile?.content ? 'pointer' : 'default', opacity: selectedFile?.content ? 1 : 0.55 }}>
                {copiedFile ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                {copiedFile ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre style={{ flex: 1, overflow: 'auto', margin: 0, padding: 16, fontSize: 11, fontFamily: 'monospace', color: d ? '#c9d1d9' : '#24292f', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {selectedFile?.content || ''}
            </pre>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: muted }}>
          <Code size={22} style={{ opacity: 0.3, marginBottom: 6 }} />
          <p style={{ fontSize: 12 }}>Code appears here after building</p>
        </div>
      )}
    </div>
  )
}

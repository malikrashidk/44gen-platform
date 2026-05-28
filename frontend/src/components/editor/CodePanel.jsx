import { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2, Code, Copy, Download, ExternalLink, FileCode, FolderOpen, Loader2, RefreshCw
} from 'lucide-react'

function languageForPath(filePath = '') {
  const ext = filePath.split('.').pop()?.toLowerCase()
  if (ext === 'jsx') return 'javascript'
  if (ext === 'tsx') return 'typescript'
  if (ext === 'js') return 'javascript'
  if (ext === 'ts') return 'typescript'
  if (ext === 'css') return 'css'
  if (ext === 'json') return 'json'
  if (ext === 'html') return 'html'
  if (ext === 'md') return 'markdown'
  return 'plaintext'
}

export default function CodePanel({
  codeFiles,
  fullCode,
  selectedCodeFile,
  setSelectedCodeFile,
  codeFilesLoading,
  loadProjectFiles,
  downloadProjectZip,
  downloadingProject,
  openGitHubExport,
  copiedFile,
  setCopiedFile,
  onSaveFile,
  savingFile,
  darkMode,
  text,
  muted
}) {
  const visibleCodeFiles = codeFiles.length
    ? codeFiles
    : (fullCode ? [{ path: 'src/App.jsx', content: fullCode }] : [])
  const selectedFile = visibleCodeFiles.find(file => file.path === selectedCodeFile) || visibleCodeFiles[0]
  const hasCodeFiles = visibleCodeFiles.length > 0
  const d = darkMode
  const codeBorder = d ? '#30363d' : '#d0d7de'
  const editorHostRef = useRef(null)
  const editorRef = useRef(null)
  const modelRef = useRef(null)
  const changeDisposableRef = useRef(null)
  const monacoRef = useRef(null)
  const darkModeRef = useRef(d)
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorError, setEditorError] = useState('')
  const [editedContent, setEditedContent] = useState(selectedFile?.content || '')
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    darkModeRef.current = d
  }, [d])

  useEffect(() => {
    if (!editorHostRef.current || editorRef.current) return

    let cancelled = false
    setEditorLoading(true)
    setEditorError('')

    Promise.all([
      import('monaco-editor'),
      import('monaco-editor/esm/vs/editor/editor.worker?worker')
    ]).then(([monacoModule, workerModule]) => {
      if (cancelled || !editorHostRef.current) return

      const monaco = monacoModule
      const EditorWorker = workerModule.default
      self.MonacoEnvironment = self.MonacoEnvironment || {
        getWorker() {
          return new EditorWorker()
        }
      }

      monacoRef.current = monaco
      editorRef.current = monaco.editor.create(editorHostRef.current, {
        automaticLayout: true,
        fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", monospace',
        fontSize: 12,
        lineHeight: 19,
        minimap: { enabled: false },
        readOnly: false,
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        wordWrap: 'on'
      })
      monaco.editor.setTheme(darkModeRef.current ? 'vs-dark' : 'vs')
      setEditorLoading(false)
    }).catch((err) => {
      if (cancelled) return
      setEditorError(err?.message || 'Code editor failed to load')
      setEditorLoading(false)
    })

    return () => {
      cancelled = true
      modelRef.current?.dispose()
      changeDisposableRef.current?.dispose()
      editorRef.current?.dispose()
      modelRef.current = null
      changeDisposableRef.current = null
      editorRef.current = null
      monacoRef.current = null
    }
  }, [hasCodeFiles])

  useEffect(() => {
    monacoRef.current?.editor.setTheme(d ? 'vs-dark' : 'vs')
  }, [d])

  useEffect(() => {
    const monaco = monacoRef.current
    if (!editorRef.current || !monaco) return

    const uriPath = selectedFile?.path || 'src/App.jsx'
    const previousModel = modelRef.current
    changeDisposableRef.current?.dispose()
    previousModel?.dispose()
    const model = monaco.editor.createModel(
      selectedFile?.content || '',
      languageForPath(uriPath),
      monaco.Uri.parse(`file:///${uriPath}`)
    )
    modelRef.current = model
    editorRef.current.setModel(model)
    setEditedContent(selectedFile?.content || '')
    setIsDirty(false)
    changeDisposableRef.current = model.onDidChangeContent(() => {
      const next = model.getValue()
      setEditedContent(next)
      setIsDirty(next !== (selectedFile?.content || ''))
    })
  }, [selectedFile?.path, selectedFile?.content, editorLoading])

  const copySelectedFile = () => {
    if (!selectedFile?.content) return
    navigator.clipboard.writeText(selectedFile.content)
    setCopiedFile(true)
    setTimeout(() => setCopiedFile(false), 1400)
  }

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, background: d ? '#0d1117' : '#f6f8fa' }}>
      {hasCodeFiles ? (
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
                <button onClick={openGitHubExport}
                  title="Export to GitHub"
                  style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${codeBorder}`, background: d ? '#161b22' : '#f6f8fa', color: muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <ExternalLink size={12} />
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isDirty && <span style={{ color: '#f59e0b', fontSize: 11, fontFamily: 'inherit' }}>Unsaved</span>}
                <button onClick={copySelectedFile}
                  disabled={!selectedFile?.content}
                  title="Copy current file"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, height: 27, borderRadius: 7, border: `1px solid ${codeBorder}`, background: d ? '#161b22' : '#fff', color: copiedFile ? '#059669' : muted, padding: '0 9px', fontSize: 11, fontFamily: 'inherit', fontWeight: 700, cursor: selectedFile?.content ? 'pointer' : 'default', opacity: selectedFile?.content ? 1 : 0.55 }}>
                  {copiedFile ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                  {copiedFile ? 'Copied' : 'Copy'}
                </button>
                <button onClick={() => selectedFile?.path && onSaveFile?.(selectedFile.path, editedContent)}
                  disabled={!isDirty || savingFile}
                  title="Save file and rebuild"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, height: 27, borderRadius: 7, border: 'none', background: isDirty ? '#BC6045' : (d ? '#222' : '#e5e7eb'), color: isDirty ? '#fff' : muted, padding: '0 10px', fontSize: 11, fontFamily: 'inherit', fontWeight: 800, cursor: isDirty && !savingFile ? 'pointer' : 'default', opacity: savingFile ? 0.75 : 1 }}>
                  {savingFile ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle2 size={12} />}
                  {savingFile ? 'Saving' : 'Save & rebuild'}
                </button>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              {(editorLoading || editorError) && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: editorError ? '#ef4444' : muted, fontSize: 12, background: d ? '#0d1117' : '#f6f8fa' }}>
                  {editorLoading && <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite', color: '#BC6045' }} />}
                  {editorError || 'Loading editor...'}
                </div>
              )}
              <div ref={editorHostRef} style={{ width: '100%', height: '100%' }} />
            </div>
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

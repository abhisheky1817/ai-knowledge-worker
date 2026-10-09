import React, { useRef, useState } from 'react';

const ACCEPT = '.pdf,.txt,.md,.markdown';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function Library({ documents, loading, scope, onScope, onUpload, onInspect, onReprocess, onDelete, uploading, busyId }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const pick = (files) => {
    [...files].forEach((f) => onUpload(f));
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <aside className="library" aria-label="Document library">
      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files);
        }}
      >
        <input ref={inputRef} id="file-input" type="file" accept={ACCEPT} multiple hidden onChange={(e) => pick(e.target.files)} />
        <label htmlFor="file-input" className="btn primary" role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}>
          {uploading ? 'Indexing…' : 'Add documents'}
        </label>
        <p className="muted">PDF, TXT or Markdown. Drop files here or choose them.</p>
      </div>

      <div className="library-head">
        <h2>Your documents</h2>
        <span className="muted">{documents.length}</span>
      </div>

      <div className="scope-row">
        <label htmlFor="scope">Ask about</label>
        <select id="scope" value={scope} onChange={(e) => onScope(e.target.value)}>
          <option value="">All documents</option>
          {documents
            .filter((d) => d.status === 'READY')
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
        </select>
      </div>

      {loading ? (
        <p className="muted pad">Loading…</p>
      ) : documents.length === 0 ? (
        <p className="empty">No documents yet. Add a PDF, text or Markdown file and it becomes searchable in a few seconds.</p>
      ) : (
        <ul className="doc-list">
          {documents.map((d) => (
            <li key={d.id} className={`doc ${scope === d.id ? 'active' : ''}`}>
              <div className="doc-main">
                <span className={`type type-${d.fileType}`}>{d.fileType}</span>
                <div className="doc-text">
                  <strong title={d.fileName}>{d.title}</strong>
                  <span className="muted">
                    {d.status === 'READY' && `${d.chunkCount} sections · ${formatSize(d.sizeBytes)}`}
                    {d.status === 'PROCESSING' && 'Indexing…'}
                    {d.status === 'FAILED' && <span className="error-text">Indexing failed</span>}
                  </span>
                </div>
              </div>
              {d.status === 'FAILED' && d.error && <p className="error-text small">{d.error}</p>}
              <div className="doc-actions">
                <button type="button" className="link" onClick={() => onInspect(d.id)}>
                  Inspect
                </button>
                <button type="button" className="link" disabled={busyId === d.id} onClick={() => onReprocess(d.id)}>
                  {busyId === d.id ? 'Working…' : 'Reprocess'}
                </button>
                <button type="button" className="link danger" disabled={busyId === d.id} onClick={() => onDelete(d)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

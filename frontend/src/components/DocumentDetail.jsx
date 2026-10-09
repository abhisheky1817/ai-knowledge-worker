import React, { useEffect, useRef } from 'react';

export default function DocumentDetail({ doc, error, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label="Document details">
        <header>
          <div>
            <h2>{doc?.title || 'Document'}</h2>
            {doc && (
              <p className="muted">
                {doc.fileName} · {doc.characters.toLocaleString()} characters · {doc.chunkCount} sections
              </p>
            )}
          </div>
          <button ref={closeRef} type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="dialog-body">
          {error && <p className="error-text">{error}</p>}
          {!doc && !error && <p className="muted">Loading…</p>}
          {doc && (
            <>
              <h3>Cleaned text (start)</h3>
              <pre className="preview">{doc.preview}</pre>
              <h3>Sections used for search</h3>
              <ol className="chunk-list">
                {doc.chunks.map((c) => (
                  <li key={c.id}>
                    <span className="muted">Section {c.chunkIndex + 1} · {c.charCount} characters</span>
                    <p>{c.content}</p>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

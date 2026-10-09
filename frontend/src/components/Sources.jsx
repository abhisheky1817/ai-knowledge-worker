import React from 'react';

export default function Sources({ sources, openNumber, onToggle }) {
  if (!sources?.length) return null;
  const cited = sources.filter((s) => s.cited).length;
  return (
    <section className="sources" aria-label="Sources">
      <h3>
        Sources <span className="muted">{cited ? `${cited} cited of ${sources.length} retrieved` : `${sources.length} retrieved`}</span>
      </h3>
      <ol>
        {sources.map((s) => {
          const open = openNumber === s.number;
          return (
            <li key={s.chunkId} id={`src-${s.chunkId}`} className={s.cited ? 'cited' : ''}>
              <button type="button" className="source-head" aria-expanded={open} onClick={() => onToggle(open ? null : s.number)}>
                <span className="badge">{s.number}</span>
                <span className="source-title">{s.documentTitle}</span>
                <span className="muted">section {s.chunkIndex + 1}</span>
                <span className="score" title="Cosine similarity to your question">
                  {Math.round(s.score * 100)}% match
                </span>
              </button>
              {open && <blockquote className="excerpt">{s.content}</blockquote>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

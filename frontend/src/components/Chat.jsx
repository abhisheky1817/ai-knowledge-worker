import React, { useEffect, useRef, useState } from 'react';
import AnswerText from './AnswerText.jsx';
import Sources from './Sources.jsx';

function Turn({ turn }) {
  const [open, setOpen] = useState(null);
  const sourcesRef = useRef(null);

  const showSource = (n) => {
    setOpen(n);
    requestAnimationFrame(() => sourcesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  return (
    <article className="turn">
      <p className="question">{turn.question}</p>
      {turn.pending && <p className="muted thinking">Searching your documents…</p>}
      {turn.error && <p className="error-text">{turn.error}</p>}
      {turn.answer && (
        <>
          <AnswerText text={turn.answer} onCite={showSource} />
          <div ref={sourcesRef}>
            <Sources sources={turn.sources} openNumber={open} onToggle={setOpen} />
          </div>
        </>
      )}
    </article>
  );
}

export default function Chat({ turns, onAsk, disabled, scopeLabel, hasDocuments }) {
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns.length, turns.at(-1)?.answer, turns.at(-1)?.error]);

  const submit = (e) => {
    e.preventDefault();
    const q = text.trim();
    if (!q || disabled) return;
    onAsk(q);
    setText('');
  };

  return (
    <section className="chat" aria-label="Ask a question">
      <div className="thread" aria-live="polite">
        {turns.length === 0 ? (
          <div className="intro">
            <h2>Ask your documents</h2>
            <p>
              {hasDocuments
                ? 'Type a question in plain language. Answers use only the text of your files, and every answer shows the passages it came from.'
                : 'Add a document on the left first. Then ask a question and the answer will point back to the exact passages.'}
            </p>
          </div>
        ) : (
          turns.map((t) => <Turn key={t.id} turn={t} />)
        )}
        <div ref={endRef} />
      </div>

      <form className="composer" onSubmit={submit}>
        <label htmlFor="question" className="sr-only">
          Your question
        </label>
        <textarea
          id="question"
          rows={2}
          value={text}
          maxLength={1000}
          placeholder={hasDocuments ? `Ask about ${scopeLabel}…` : 'Add a document to start'}
          disabled={!hasDocuments}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) submit(e);
          }}
        />
        <button type="submit" className="btn primary" disabled={disabled || !text.trim() || !hasDocuments}>
          Ask
        </button>
      </form>
    </section>
  );
}

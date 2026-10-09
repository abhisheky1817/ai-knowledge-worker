import React from 'react';

// Tiny renderer for the subset of Markdown Gemini usually returns (paragraphs, bullets, **bold**)
// plus clickable [n] citation markers.
function inline(text, onCite, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\d{1,2}\])/g).filter(Boolean);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={key}>{part.slice(2, -2)}</strong>;
    const cite = part.match(/^\[(\d{1,2})\]$/);
    if (cite) {
      const n = Number(cite[1]);
      return (
        <button key={key} type="button" className="cite" onClick={() => onCite(n)} aria-label={`Show source ${n}`}>
          {n}
        </button>
      );
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

export default function AnswerText({ text, onCite }) {
  const blocks = [];
  let list = null;
  text.split('\n').forEach((raw, i) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[*-]\s+(.*)$/);
    if (bullet) {
      if (!list) {
        list = { type: 'ul', items: [] };
        blocks.push(list);
      }
      list.items.push({ key: i, text: bullet[1] });
      return;
    }
    list = null;
    if (line.trim()) blocks.push({ type: 'p', key: i, text: line });
  });

  return (
    <div className="answer-text">
      {blocks.map((b, bi) =>
        b.type === 'ul' ? (
          <ul key={bi}>
            {b.items.map((it) => (
              <li key={it.key}>{inline(it.text, onCite, `l${it.key}`)}</li>
            ))}
          </ul>
        ) : (
          <p key={bi}>{inline(b.text, onCite, `p${b.key}`)}</p>
        ),
      )}
    </div>
  );
}

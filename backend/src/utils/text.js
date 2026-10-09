/**
 * Text preparation: cleaning and chunking.
 * Pure functions (no I/O) so they are easy to unit test.
 */

/** Normalise raw extracted text. `fileType` enables PDF-specific repairs. */
export function cleanText(raw, fileType = 'txt') {
  let t = String(raw ?? '')
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u00A0\u2007\u202F]/g, ' ');

  if (fileType === 'pdf') {
    // "exam-\nple" -> "example"
    t = t.replace(/([A-Za-z])-\n([a-z])/g, '$1$2');
    // A single line break inside a sentence -> space (keeps blank-line paragraphs)
    t = t.replace(/([^\n])\n(?=[a-z,;:)])/g, '$1 ');
  }

  return t
    .replace(/[ \t]+\n/g, '\n') // trailing spaces
    .replace(/[ \t]{2,}/g, ' ') // runs of spaces
    .replace(/\n{3,}/g, '\n\n') // many blank lines
    .trim();
}

const SEPARATORS = ['\n\n', '\n', '. ', ' '];

function splitOn(text, size, level) {
  if (text.length <= size) return [text];
  if (level >= SEPARATORS.length) {
    const out = [];
    for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
    return out;
  }
  const sep = SEPARATORS[level];
  const parts = text.split(sep);
  const pieces = [];
  parts.forEach((part, i) => {
    const piece = i < parts.length - 1 ? part + sep : part;
    if (!piece) return;
    if (piece.length > size) pieces.push(...splitOn(piece, size, level + 1));
    else pieces.push(piece);
  });
  return pieces;
}

function overlapTail(text, overlap) {
  if (overlap <= 0 || text.length <= overlap) return overlap > 0 ? text : '';
  let tail = text.slice(text.length - overlap);
  const ws = tail.search(/\s/);
  // start at a word boundary so chunks do not begin mid-word
  if (ws > 0 && ws < tail.length - 1) tail = tail.slice(ws + 1);
  return tail;
}

/**
 * Recursive character splitting with overlap.
 * Splits on paragraph -> line -> sentence -> word boundaries, merges pieces up to
 * `size` characters, and repeats the last `overlap` characters at the start of the
 * next chunk so answers are not cut in half at a boundary.
 */
export function chunkText(text, { size = 1000, overlap = 150 } = {}) {
  if (size < 100) throw new Error('chunk size must be at least 100 characters');
  if (overlap < 0 || overlap >= size / 2) throw new Error('overlap must be between 0 and half the chunk size');

  const clean = String(text ?? '').trim();
  if (!clean) return [];

  const pieces = splitOn(clean, size, 0);
  const chunks = [];
  let current = '';

  for (const piece of pieces) {
    if (current.length + piece.length <= size) {
      current += piece;
      continue;
    }
    if (current.trim()) chunks.push(current.trim());
    const tail = overlapTail(current, overlap);
    current = tail.length + piece.length <= size ? tail + piece : piece;
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.map((content, chunkIndex) => ({ chunkIndex, content }));
}

/** L2-normalise a vector (Gemini returns un-normalised vectors for reduced dimensions). */
export function normalize(vec) {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const norm = Math.sqrt(sum) || 1;
  return vec.map((v) => v / norm);
}

/** pgvector text literal: [0.1,0.2,...] */
export function toVectorLiteral(vec) {
  return `[${vec.join(',')}]`;
}

import { env } from '../config/env.js';
import { chunkRepository } from '../repositories/chunk.repository.js';
import { documentRepository } from '../repositories/document.repository.js';
import { embedQuery, generateAnswer } from './gemini.service.js';
import { notFound } from '../lib/errors.js';
import { SYSTEM_PROMPT, NOT_FOUND_ANSWER, buildPrompt, citedNumbers } from '../utils/prompt.js';

export const qaService = {
  async ask({ question, documentId = null, topK }) {
    if (documentId && !(await documentRepository.exists(documentId))) throw notFound('Document not found');

    const queryVector = await embedQuery(question);
    const limit = Math.min(Math.max(topK || env.retrieval.topK, 1), 12);
    let hits = await chunkRepository.search(queryVector, { documentId, limit });
    hits = hits.filter((h) => h.score >= env.retrieval.minScore);

    if (hits.length === 0) {
      return { answer: NOT_FOUND_ANSWER, sources: [] };
    }

    const answer = await generateAnswer({ system: SYSTEM_PROMPT, prompt: buildPrompt(question, hits) });
    const cited = citedNumbers(answer, hits.length);

    const sources = hits.map((h, i) => ({
      number: i + 1,
      chunkId: h.id,
      documentId: h.documentId,
      documentTitle: h.documentTitle,
      chunkIndex: h.chunkIndex,
      score: Math.round(h.score * 1000) / 1000,
      cited: cited.has(i + 1),
      content: h.content,
    }));

    return { answer, sources };
  },
};

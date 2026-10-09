import { env } from '../config/env.js';
import { AppError, upstream } from '../lib/errors.js';
import { normalize } from '../utils/vector.js';

const EMBED_BATCH = 50;
const RETRIES = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function requireKey() {
  if (!env.gemini.apiKey) {
    throw new AppError(
      503,
      'GEMINI_API_KEY is not configured. Add it to backend/.env (get a key from Google AI Studio) and restart the server.',
    );
  }
}

async function post(path, body) {
  requireKey();
  const url = `${env.gemini.baseUrl}/v1beta/${path}`;
  let lastError;

  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.gemini.apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (err) {
      lastError = upstream(`Could not reach the Gemini API: ${err.message}`);
      if (attempt < RETRIES) await sleep(500 * 2 ** (attempt - 1));
      continue;
    }

    if (res.ok) return res.json();

    const text = await res.text().catch(() => '');
    let message = text;
    try {
      message = JSON.parse(text)?.error?.message || text;
    } catch {
      /* keep raw text */
    }
    lastError = upstream(`Gemini API error ${res.status}: ${String(message).slice(0, 300)}`);

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable) break;
    if (attempt < RETRIES) await sleep(800 * 2 ** (attempt - 1));
  }
  throw lastError;
}

async function embed(texts, taskType) {
  const { embedModel, embedDimensions } = env.gemini;
  const out = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    const data = await post(`models/${embedModel}:batchEmbedContents`, {
      requests: batch.map((text) => ({
        model: `models/${embedModel}`,
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: embedDimensions,
      })),
    });
    const embeddings = data.embeddings || [];
    if (embeddings.length !== batch.length) {
      throw upstream('Gemini returned an unexpected number of embeddings.');
    }
    for (const e of embeddings) {
      if (!Array.isArray(e.values) || e.values.length !== embedDimensions) {
        throw upstream(`Embedding has ${e.values?.length} dimensions, expected ${embedDimensions}.`);
      }
      out.push(normalize(e.values));
    }
  }
  return out;
}

/** Embed document chunks (one vector per text). */
export const embedDocuments = (texts) => embed(texts, 'RETRIEVAL_DOCUMENT');

/** Embed a single user question. */
export async function embedQuery(text) {
  const [vec] = await embed([text], 'RETRIEVAL_QUERY');
  return vec;
}

/** Generate an answer from a system instruction and a user prompt. */
export async function generateAnswer({ system, prompt }) {
  const data = await post(`models/${env.gemini.chatModel}:generateContent`, {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: env.gemini.temperature,
      maxOutputTokens: env.gemini.maxOutputTokens,
    },
  });

  if (data.promptFeedback?.blockReason) {
    throw upstream(`Gemini blocked this request (${data.promptFeedback.blockReason}).`);
  }
  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts || [])
    .map((p) => p.text || '')
    .join('')
    .trim();
  if (!text) {
    throw upstream(`Gemini returned an empty answer${candidate?.finishReason ? ` (${candidate.finishReason})` : ''}.`);
  }
  return text;
}

export const geminiConfigured = () => Boolean(env.gemini.apiKey);

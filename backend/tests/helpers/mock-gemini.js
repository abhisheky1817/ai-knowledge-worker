// Tiny stand-in for the Gemini REST API so tests run offline.
// Embeddings are hashed bags of words: texts sharing words get similar vectors.
import http from 'node:http';

const DIM = 768;
const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'of', 'to', 'and', 'in', 'for', 'on', 'what', 'how', 'many', 'much', 'does', 'do']);

function hash(word) {
  let h = 2166136261;
  for (const ch of word) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

export function fakeEmbedding(text) {
  const v = new Array(DIM).fill(0);
  for (const w of String(text).toLowerCase().match(/[a-z0-9]+/g) || []) {
    if (!STOP.has(w)) v[hash(w) % DIM] += 1;
  }
  if (v.every((x) => x === 0)) v[0] = 1;
  return v;
}

export function startMockGemini() {
  const calls = { embed: 0, generate: 0, lastPrompt: '', lastTaskTypes: new Set() };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const json = (status, obj) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(obj));
      };
      if (req.headers['x-goog-api-key'] !== 'test-key') return json(403, { error: { message: 'bad key' } });
      const payload = body ? JSON.parse(body) : {};

      if (req.url.includes(':batchEmbedContents')) {
        calls.embed++;
        for (const r of payload.requests) calls.lastTaskTypes.add(r.taskType);
        return json(200, { embeddings: payload.requests.map((r) => ({ values: fakeEmbedding(r.content.parts[0].text) })) });
      }
      if (req.url.includes(':generateContent')) {
        calls.generate++;
        const prompt = payload.contents[0].parts[0].text;
        calls.lastPrompt = prompt;
        const first = prompt.match(/\[1\][^\n]*\n([^\n]+)/);
        const text = first ? `According to the documents: ${first[1].slice(0, 120)} [1]` : "I couldn't find this in the uploaded documents.";
        return json(200, { candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] });
      }
      json(404, { error: { message: 'unknown route' } });
    });
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () =>
      resolve({ url: `http://127.0.0.1:${server.address().port}`, calls, close: () => new Promise((r) => server.close(r)) }),
    ),
  );
}

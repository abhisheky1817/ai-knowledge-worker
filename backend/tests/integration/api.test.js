// End-to-end test: real Express app + real PostgreSQL/pgvector + mock Gemini server.
// Needs a migrated database. DATABASE_URL defaults to the docker-compose database.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startMockGemini } from '../helpers/mock-gemini.js';

const here = path.dirname(fileURLToPath(import.meta.url));
let mock, server, base, prisma;

before(async () => {
  mock = await startMockGemini();
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_BASE_URL = mock.url;
  process.env.DATABASE_URL ||= 'postgresql://kw:kw@localhost:5432/kwdb?schema=public';
  process.env.CHUNK_SIZE = '300';
  process.env.CHUNK_OVERLAP = '50';

  ({ prisma } = await import('../../src/lib/prisma.js'));
  const { createApp } = await import('../../src/app.js');
  await prisma.document.deleteMany();
  await new Promise((resolve) => {
    server = createApp().listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  await prisma?.document.deleteMany();
  await new Promise((r) => server?.close(r));
  await mock?.close();
  await prisma?.$disconnect();
});

const upload = async (name, content, type = 'text/markdown') => {
  const form = new FormData();
  form.append('file', new Blob([content], { type }), name);
  return fetch(`${base}/documents`, { method: 'POST', body: form });
};

const POLICY = `# Remote Work Policy

Employees may work from home up to three days per week with manager approval.

## Equipment

The company provides a laptop and a monitor to every remote employee. Home internet costs are reimbursed up to 40 dollars per month.

## Security

All remote work must use the company VPN and multi-factor authentication.`;

const TRAVEL = `# Travel Expenses

Hotel stays are capped at 180 dollars per night in major cities. Meals are reimbursed up to 60 dollars per day with receipts. Flights must be booked at least fourteen days in advance in economy class.`;

let remoteId, travelId;

test('health reports database and pgvector', async () => {
  const res = await fetch(`${base}/health`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.database, 'ok');
  assert.match(body.pgvector, /^ok/);
  assert.equal(body.gemini, 'configured');
});

test('uploads a markdown document: extract, chunk, embed, store', async () => {
  const res = await upload('remote_work_policy.md', POLICY);
  const doc = await res.json();
  assert.equal(res.status, 201);
  assert.equal(doc.status, 'READY');
  assert.equal(doc.title, 'remote work policy');
  assert.ok(doc.chunkCount >= 2, `expected several chunks, got ${doc.chunkCount}`);
  assert.equal(doc.content, undefined, 'full text is not returned in list payloads');
  remoteId = doc.id;
  assert.ok(mock.calls.lastTaskTypes.has('RETRIEVAL_DOCUMENT'));
});

test('uploads a TXT and a PDF document', async () => {
  const txt = await (await upload('travel_expenses.txt', TRAVEL, 'text/plain')).json();
  assert.equal(txt.status, 'READY');
  travelId = txt.id;

  const pdfBytes = fs.readFileSync(path.join(here, '../fixtures/sample.pdf'));
  const res = await upload('library_handbook.pdf', pdfBytes, 'application/pdf');
  const pdf = await res.json();
  assert.equal(res.status, 201, JSON.stringify(pdf));
  assert.equal(pdf.status, 'READY');
  assert.equal(pdf.fileType, 'pdf');
});

test('rejects unsupported files and missing uploads', async () => {
  const bad = await upload('notes.exe', 'MZ...', 'application/octet-stream');
  assert.equal(bad.status, 400);
  const none = await fetch(`${base}/documents`, { method: 'POST', body: new FormData() });
  assert.equal(none.status, 400);
  const empty = await upload('empty.txt', '   ', 'text/plain');
  assert.equal(empty.status, 422);
});

test('lists documents and inspects one with its chunks', async () => {
  const list = await (await fetch(`${base}/documents`)).json();
  assert.equal(list.length, 3);
  const detail = await (await fetch(`${base}/documents/${remoteId}`)).json();
  assert.equal(detail.chunks.length, detail.chunkCount);
  assert.deepEqual(detail.chunks.map((c) => c.chunkIndex), detail.chunks.map((_, i) => i));
  assert.match(detail.preview, /Remote Work Policy/);
});

test('answers a question from the whole knowledge base with sources', async () => {
  const res = await fetch(`${base}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'What is the hotel nightly cap for travel?' }),
  });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.ok(body.sources.length > 0);
  assert.equal(body.sources[0].documentTitle, 'travel expenses', 'best match should be the travel document');
  assert.match(body.sources[0].content, /180 dollars/);
  assert.ok(body.sources[0].score > body.sources.at(-1).score - 1e-9, 'sources are ordered by similarity');
  assert.equal(body.sources[0].cited, true);
  assert.match(body.answer, /\[1\]/);
  assert.ok(mock.calls.lastTaskTypes.has('RETRIEVAL_QUERY'));
  assert.match(mock.calls.lastPrompt, /Question: What is the hotel nightly cap/);
});

test('scopes retrieval to one selected document', async () => {
  const res = await fetch(`${base}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'How many days can employees work from home?', documentId: remoteId }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(body.sources.length > 0);
  assert.ok(body.sources.every((s) => s.documentId === remoteId));
});

test('validates ask requests', async () => {
  const post = (payload) =>
    fetch(`${base}/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  assert.equal((await post({})).status, 400);
  assert.equal((await post({ question: '   ' })).status, 400);
  assert.equal((await post({ question: 'hi', documentId: 'not-a-uuid' })).status, 400);
  assert.equal((await post({ question: 'hi', documentId: '11111111-1111-4111-8111-111111111111' })).status, 404);
});

test('reprocess rebuilds chunks and keeps the document ready', async () => {
  const before = await (await fetch(`${base}/documents/${travelId}`)).json();
  const res = await fetch(`${base}/documents/${travelId}/reprocess`, { method: 'POST' });
  const doc = await res.json();
  assert.equal(res.status, 200);
  assert.equal(doc.status, 'READY');
  assert.equal(doc.chunkCount, before.chunkCount);
  const after = await (await fetch(`${base}/documents/${travelId}`)).json();
  assert.equal(after.chunks.length, before.chunks.length);
});

test('deletes a document and its chunks', async () => {
  const res = await fetch(`${base}/documents/${remoteId}`, { method: 'DELETE' });
  assert.equal(res.status, 204);
  assert.equal((await fetch(`${base}/documents/${remoteId}`)).status, 404);
  const orphans = await prisma.$queryRaw`SELECT count(*)::int AS n FROM "Chunk" WHERE "documentId" = ${remoteId}`;
  assert.equal(orphans[0].n, 0);
  assert.equal((await fetch(`${base}/documents/abc`)).status, 400);
});

test('a Gemini failure marks the document FAILED and reprocess can recover it', async () => {
  const realKey = process.env.GEMINI_API_KEY;
  const { env } = await import('../../src/config/env.js');
  env.gemini.apiKey = 'wrong-key';
  const res = await upload('broken.md', POLICY);
  const doc = await res.json();
  assert.equal(res.status, 201);
  assert.equal(doc.status, 'FAILED');
  assert.match(doc.error, /Gemini API error 403/);
  assert.equal(doc.chunkCount, 0);

  env.gemini.apiKey = realKey;
  const fixed = await (await fetch(`${base}/documents/${doc.id}/reprocess`, { method: 'POST' })).json();
  assert.equal(fixed.status, 'READY');
  assert.ok(fixed.chunkCount > 0);
});

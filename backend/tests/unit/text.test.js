import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, chunkText } from '../../src/utils/text.js';
import { normalize, toVectorLiteral } from '../../src/utils/vector.js';
import { buildPrompt, citedNumbers } from '../../src/utils/prompt.js';

test('cleanText normalises whitespace and line endings', () => {
  const out = cleanText('Hello   world\r\n\r\n\r\n\r\nNext   para  \u0000 ');
  assert.equal(out, 'Hello world\n\nNext para');
});

test('cleanText repairs PDF hyphenation and mid-sentence line breaks', () => {
  const out = cleanText('The exam-\nple shows how text\nflows across lines.\n\nNew paragraph.', 'pdf');
  assert.equal(out, 'The example shows how text flows across lines.\n\nNew paragraph.');
});

test('chunkText returns nothing for empty input', () => {
  assert.deepEqual(chunkText('   '), []);
});

test('chunkText keeps short text as a single chunk', () => {
  const chunks = chunkText('Just one short paragraph.');
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].chunkIndex, 0);
});

test('chunkText respects size, numbers chunks and overlaps neighbours', () => {
  const sentence = 'Retrieval augmented generation grounds answers in documents. ';
  const text = Array.from({ length: 60 }, (_, i) => `${sentence}Sentence ${i}.`).join('\n\n');
  const size = 400;
  const overlap = 80;
  const chunks = chunkText(text, { size, overlap });

  assert.ok(chunks.length > 5);
  chunks.forEach((c, i) => {
    assert.equal(c.chunkIndex, i);
    assert.ok(c.content.length <= size, `chunk ${i} has ${c.content.length} chars`);
  });
  // consecutive chunks share text (overlap)
  for (let i = 1; i < chunks.length; i++) {
    const tailWord = chunks[i - 1].content.split(/\s+/).slice(-2).join(' ');
    assert.ok(chunks[i].content.includes(tailWord), `chunk ${i} should repeat the end of chunk ${i - 1}`);
  }
});

test('chunkText splits one huge word-less string by hard size', () => {
  const chunks = chunkText('x'.repeat(2500), { size: 1000, overlap: 100 });
  assert.equal(chunks.length, 3);
  assert.ok(chunks.every((c) => c.content.length <= 1000));
});

test('chunkText rejects bad parameters', () => {
  assert.throws(() => chunkText('abc', { size: 50 }));
  assert.throws(() => chunkText('abc', { size: 200, overlap: 150 }));
});

test('normalize returns a unit vector', () => {
  const v = normalize([3, 4]);
  assert.ok(Math.abs(Math.hypot(...v) - 1) < 1e-9);
  assert.equal(toVectorLiteral([1, 2.5]), '[1,2.5]');
});

test('buildPrompt numbers the passages and citedNumbers reads citations', () => {
  const prompt = buildPrompt('What?', [
    { documentTitle: 'A', chunkIndex: 0, content: 'alpha' },
    { documentTitle: 'B', chunkIndex: 2, content: 'beta' },
  ]);
  assert.match(prompt, /\[1\] \(document: A, section 1\)\nalpha/);
  assert.match(prompt, /\[2\] \(document: B, section 3\)\nbeta/);
  assert.match(prompt, /Question: What\?$/);
  assert.deepEqual([...citedNumbers('Yes [1][2] and [9] and [0].', 2)].sort(), [1, 2]);
});

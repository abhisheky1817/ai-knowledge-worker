// Verifies your GEMINI_API_KEY and that the configured models exist.
//   npm run check:gemini
import { env } from '../src/config/env.js';

const { apiKey, baseUrl, chatModel, embedModel } = env.gemini;
if (!apiKey) {
  console.error('GEMINI_API_KEY is not set in backend/.env');
  process.exit(1);
}

const res = await fetch(`${baseUrl}/v1beta/models?pageSize=200`, { headers: { 'x-goog-api-key': apiKey } });
if (!res.ok) {
  console.error(`Gemini API returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}
const { models = [] } = await res.json();
const has = (name, method) => models.some((m) => m.name === `models/${name}` && (m.supportedGenerationMethods || []).includes(method));

console.log(`API key works. ${models.length} models visible.`);
console.log(`chat model      ${chatModel}: ${has(chatModel, 'generateContent') ? 'OK' : 'NOT FOUND'}`);
console.log(`embedding model ${embedModel}: ${has(embedModel, 'embedContent') || has(embedModel, 'batchEmbedContents') ? 'OK' : 'NOT FOUND'}`);

const suggestions = models
  .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent') && /flash/.test(m.name) && !/image|tts|live|audio/.test(m.name))
  .map((m) => m.name.replace('models/', ''));
if (!has(chatModel, 'generateContent')) {
  console.log('\nAvailable flash models you can put in GEMINI_CHAT_MODEL:\n  ' + suggestions.slice(0, 10).join('\n  '));
}

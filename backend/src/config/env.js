import 'dotenv/config';

const int = (value, fallback) => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
};
const float = (value, fallback) => {
  const n = Number.parseFloat(value ?? '');
  return Number.isFinite(n) ? n : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 3001),
  databaseUrl: process.env.DATABASE_URL,
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    baseUrl: (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/+$/, ''),
    chatModel: process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash',
    embedModel: process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001',
    // Must match vector(768) in prisma/schema.prisma
    embedDimensions: 768,
    temperature: float(process.env.GEMINI_TEMPERATURE, 0.2),
    maxOutputTokens: int(process.env.GEMINI_MAX_OUTPUT_TOKENS, 2048),
  },

  chunking: {
    size: int(process.env.CHUNK_SIZE, 1000),
    overlap: int(process.env.CHUNK_OVERLAP, 150),
  },

  retrieval: {
    topK: int(process.env.TOP_K, 5),
    minScore: float(process.env.MIN_SCORE, 0),
  },

  upload: {
    maxBytes: int(process.env.MAX_UPLOAD_MB, 15) * 1024 * 1024,
  },
};

export function assertDatabaseConfigured() {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is not set. Copy backend/.env.example to backend/.env and fill it in.');
  }
}

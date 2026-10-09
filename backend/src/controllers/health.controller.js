import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { geminiConfigured } from '../services/gemini.service.js';

export const healthController = {
  async check(req, res) {
    const status = { api: 'ok', database: 'unknown', pgvector: 'unknown', gemini: geminiConfigured() ? 'configured' : 'missing GEMINI_API_KEY' };
    try {
      await prisma.$queryRaw`SELECT 1`;
      status.database = 'ok';
      const ext = await prisma.$queryRaw`SELECT extversion FROM pg_extension WHERE extname = 'vector'`;
      status.pgvector = ext.length ? `ok (v${ext[0].extversion})` : 'extension not installed';
    } catch (err) {
      status.database = `error: ${err.message}`.slice(0, 200);
    }
    status.models = { chat: env.gemini.chatModel, embedding: env.gemini.embedModel };
    const healthy = status.database === 'ok' && status.pgvector.startsWith('ok');
    res.status(healthy ? 200 : 503).json(status);
  },
};

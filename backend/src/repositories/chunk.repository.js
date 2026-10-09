import { prisma, Prisma } from '../lib/prisma.js';
import { toVectorLiteral } from '../utils/vector.js';
import { randomUUID } from 'node:crypto';

const INSERT_BATCH = 200;

export const chunkRepository = {
  /**
   * Replace all chunks of a document in one transaction and mark it READY.
   * `chunks`: [{ chunkIndex, content }], `vectors`: number[][] (same order).
   */
  async replaceForDocument(documentId, chunks, vectors) {
    return prisma.$transaction(
      async (tx) => {
        await tx.chunk.deleteMany({ where: { documentId } });

        for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
          const rows = chunks.slice(i, i + INSERT_BATCH).map((c, j) => {
            const vec = toVectorLiteral(vectors[i + j]);
            return Prisma.sql`(${randomUUID()}, ${documentId}, ${c.chunkIndex}, ${c.content}, ${c.content.length}, ${vec}::vector)`;
          });
          await tx.$executeRaw`
            INSERT INTO "Chunk" ("id", "documentId", "chunkIndex", "content", "charCount", "embedding")
            VALUES ${Prisma.join(rows)}`;
        }

        return tx.document.update({
          where: { id: documentId },
          data: { status: 'READY', error: null, chunkCount: chunks.length },
          select: { id: true },
        });
      },
      { timeout: 60_000 },
    );
  },

  listByDocument: (documentId) =>
    prisma.chunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
      select: { id: true, chunkIndex: true, content: true, charCount: true },
    }),

  deleteByDocument: (documentId) => prisma.chunk.deleteMany({ where: { documentId } }),

  /** Cosine-similarity search with pgvector. Optionally limited to one document. */
  async search(queryVector, { documentId = null, limit = 5 } = {}) {
    const vec = toVectorLiteral(queryVector);
    const scope = documentId ? Prisma.sql`AND c."documentId" = ${documentId}` : Prisma.empty;
    const rows = await prisma.$queryRaw`
      SELECT c."id", c."documentId", c."chunkIndex", c."content",
             d."title" AS "documentTitle",
             1 - (c."embedding" <=> ${vec}::vector) AS "score"
      FROM "Chunk" c
      JOIN "Document" d ON d."id" = c."documentId"
      WHERE d."status" = 'READY' AND c."embedding" IS NOT NULL ${scope}
      ORDER BY c."embedding" <=> ${vec}::vector
      LIMIT ${limit}`;
    return rows.map((r) => ({ ...r, score: Number(r.score) }));
  },
};

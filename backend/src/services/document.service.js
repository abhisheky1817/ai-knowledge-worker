import { env } from '../config/env.js';
import { documentRepository } from '../repositories/document.repository.js';
import { chunkRepository } from '../repositories/chunk.repository.js';
import { chunkText } from '../utils/text.js';
import { embedDocuments } from './gemini.service.js';
import { detectFileType, extractText, titleFromFileName } from './extract.service.js';
import { notFound } from '../lib/errors.js';

const PREVIEW_CHARS = 1500;

/** chunk -> embed -> store. Marks the document READY, or FAILED with the reason. */
async function indexDocument(documentId, text) {
  try {
    const chunks = chunkText(text, env.chunking);
    if (chunks.length === 0) throw new Error('No text to index.');
    const vectors = await embedDocuments(chunks.map((c) => c.content));
    await chunkRepository.replaceForDocument(documentId, chunks, vectors);
    return documentRepository.findById(documentId);
  } catch (err) {
    await chunkRepository.deleteByDocument(documentId).catch(() => {});
    await documentRepository.update(documentId, { status: 'FAILED', error: String(err.message).slice(0, 500), chunkCount: 0 });
    return documentRepository.findById(documentId);
  }
}

const withoutContent = ({ content, ...rest }) => rest;

export const documentService = {
  /** Upload pipeline: extract -> clean -> store -> chunk -> embed -> index. */
  async ingest(file) {
    const fileType = detectFileType(file.originalname);
    const text = await extractText(file.buffer, fileType); // throws 400/422, nothing stored

    const doc = await documentRepository.create({
      title: titleFromFileName(file.originalname),
      fileName: file.originalname,
      fileType,
      sizeBytes: file.size,
      status: 'PROCESSING',
      content: text,
    });
    return withoutContent(await indexDocument(doc.id, text));
  },

  list: () => documentRepository.list(),

  async get(id) {
    const doc = await documentRepository.findById(id);
    if (!doc) throw notFound('Document not found');
    const chunks = await chunkRepository.listByDocument(id);
    const { content, ...meta } = doc;
    return {
      ...meta,
      characters: content.length,
      preview: content.slice(0, PREVIEW_CHARS),
      chunks,
    };
  },

  async reprocess(id) {
    const doc = await documentRepository.findById(id);
    if (!doc) throw notFound('Document not found');
    await documentRepository.update(id, { status: 'PROCESSING', error: null });
    return withoutContent(await indexDocument(id, doc.content));
  },

  async remove(id) {
    if (!(await documentRepository.exists(id))) throw notFound('Document not found');
    await documentRepository.remove(id); // chunks are removed by ON DELETE CASCADE
  },
};

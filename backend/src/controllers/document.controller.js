import { documentService } from '../services/document.service.js';
import { badRequest } from '../lib/errors.js';

export const documentController = {
  async upload(req, res) {
    if (!req.file) throw badRequest('No file received. Send a PDF, TXT or Markdown file in the "file" field.');
    const doc = await documentService.ingest(req.file);
    res.status(201).json(doc);
  },

  async list(req, res) {
    res.json(await documentService.list());
  },

  async get(req, res) {
    res.json(await documentService.get(req.params.id));
  },

  async reprocess(req, res) {
    res.json(await documentService.reprocess(req.params.id));
  },

  async remove(req, res) {
    await documentService.remove(req.params.id);
    res.status(204).end();
  },
};

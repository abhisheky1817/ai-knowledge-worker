import { qaService } from '../services/qa.service.js';
import { badRequest } from '../lib/errors.js';
import { isUuid } from '../middleware/validate.js';

const MAX_QUESTION = 1000;

export const qaController = {
  async ask(req, res) {
    const { question, documentId, topK } = req.body || {};
    if (typeof question !== 'string' || !question.trim()) throw badRequest('"question" is required.');
    if (question.length > MAX_QUESTION) throw badRequest(`Question is too long (max ${MAX_QUESTION} characters).`);
    if (documentId != null && !isUuid(documentId)) throw badRequest('"documentId" must be a valid document id.');
    if (topK != null && !Number.isInteger(topK)) throw badRequest('"topK" must be an integer.');

    res.json(await qaService.ask({ question: question.trim(), documentId: documentId ?? null, topK }));
  },
};

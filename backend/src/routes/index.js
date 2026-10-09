import { Router } from 'express';
import { documentController as docs } from '../controllers/document.controller.js';
import { qaController } from '../controllers/qa.controller.js';
import { healthController } from '../controllers/health.controller.js';
import { uploadSingle } from '../middleware/upload.js';
import { validateIdParam } from '../middleware/validate.js';

// Express 4 does not catch rejected promises from async handlers.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const router = Router();

router.get('/health', wrap(healthController.check));

router.get('/documents', wrap(docs.list));
router.post('/documents', uploadSingle, wrap(docs.upload));
router.get('/documents/:id', validateIdParam, wrap(docs.get));
router.post('/documents/:id/reprocess', validateIdParam, wrap(docs.reprocess));
router.delete('/documents/:id', validateIdParam, wrap(docs.remove));

router.post('/ask', wrap(qaController.ask));

export default router;

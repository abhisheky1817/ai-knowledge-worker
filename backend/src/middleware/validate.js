import { badRequest } from '../lib/errors.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v) => typeof v === 'string' && UUID.test(v);

export function validateIdParam(req, res, next) {
  if (!isUuid(req.params.id)) return next(badRequest('Invalid document id.'));
  next();
}

import multer from 'multer';
import { env } from '../config/env.js';

// Files are kept in memory only while being parsed; the cleaned text is stored in PostgreSQL.
export const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.upload.maxBytes, files: 1 },
}).single('file');

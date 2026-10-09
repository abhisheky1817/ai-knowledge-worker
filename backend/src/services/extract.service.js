import path from 'node:path';
import { PDFParse } from 'pdf-parse';
import { cleanText } from '../utils/text.js';
import { badRequest, unprocessable } from '../lib/errors.js';

export const SUPPORTED_EXTENSIONS = {
  '.pdf': 'pdf',
  '.txt': 'txt',
  '.md': 'md',
  '.markdown': 'md',
};

export function detectFileType(fileName) {
  const type = SUPPORTED_EXTENSIONS[path.extname(String(fileName)).toLowerCase()];
  if (!type) throw badRequest('Unsupported file type. Upload a PDF, TXT or Markdown (.md) file.');
  return type;
}

/** Read the raw text of an uploaded file and clean it. */
export async function extractText(buffer, fileType) {
  let raw;
  if (fileType === 'pdf') {
    let parser;
    try {
      parser = new PDFParse({ data: new Uint8Array(buffer) });
      const parsed = await parser.getText();
      raw = parsed.pages.map((p) => p.text).join('\n\n');
    } catch (err) {
      throw unprocessable(`This PDF could not be read (${err.message}). It may be corrupted or password protected.`);
    } finally {
      await parser?.destroy().catch(() => {});
    }
  } else {
    raw = buffer.toString('utf8');
  }

  const text = cleanText(raw, fileType);
  if (text.length < 20) {
    throw unprocessable(
      fileType === 'pdf'
        ? 'No readable text found. This looks like a scanned/image-only PDF, which needs OCR (not supported yet).'
        : 'The file has no readable text.',
    );
  }
  return text;
}

export function titleFromFileName(fileName) {
  return path.basename(fileName, path.extname(fileName)).replace(/[_-]+/g, ' ').trim() || fileName;
}

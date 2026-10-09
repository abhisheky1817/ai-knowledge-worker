# AI Knowledge Worker
**Intelligent Document Question Answering System** — Mini Project BCS 752, 7th Sem

Upload PDF, TXT or Markdown files, ask questions in plain language, and get answers that are
based on your documents, with the source passages shown next to every answer.

## Tech stack (same as the project presentation)

| Layer | Technology | Where in the code |
|---|---|---|
| Frontend | React + Vite + JavaScript (ES6) | `frontend/src` |
| Backend | Node.js + Express | `backend/src` |
| Database | PostgreSQL | `docker-compose.yml`, `backend/prisma` |
| Vector search | pgvector (cosine distance, HNSW index) | `backend/src/repositories/chunk.repository.js` |
| ORM | Prisma ORM (schema + migrations + data access) | `backend/prisma/schema.prisma` |
| AI | Google Gemini API (embeddings + answer generation) | `backend/src/services/gemini.service.js` |
| File processing | PDF / TXT / Markdown parsing | `backend/src/services/extract.service.js` |

Architecture: **Routes → Controllers → Services → Repositories → Database**

```
backend/src
  routes/        URL -> controller mapping                    (routes/index.js)
  controllers/   validate request, call a service             (document, qa, health)
  services/      business logic: extract, ingest, QA, Gemini  (*.service.js)
  repositories/  all database access (Prisma + pgvector SQL)  (*.repository.js)
  utils/         pure functions: clean text, chunk, prompt    (text.js, prompt.js, vector.js)
```

## How it works (Methodology slide)

**A. Document ingestion** — `document.service.js`
1. **Upload** PDF / TXT / MD (multer, max 15 MB)
2. **Extract** text (pdf-parse for PDFs)
3. **Clean** whitespace, line breaks and hyphenation (`utils/text.js › cleanText`)
4. **Chunk** into ~1000-character pieces with 150 characters overlap (`chunkText`)
5. **Embed** every chunk with Gemini (`gemini-embedding-001`, 768 dimensions)
6. **Store** text + vector in PostgreSQL (`Chunk.embedding vector(768)`) with an HNSW index

**B. Question answering** — `qa.service.js`
1. **Question** arrives (all documents, or one selected document)
2. **Retrieve** — the question is embedded and the closest chunks are found with pgvector (`<=>` cosine distance)
3. **Context** — top chunks become numbered passages `[1] [2] ...`
4. **Generate** — question + context go to Gemini (`gemini-2.5-flash`) with a "answer only from the passages" instruction
5. **Respond** — answer + the source passages (the ones the answer cites are highlighted)

If the passages do not contain the answer, the system says it could not find it instead of guessing.

## Setup (about 10 minutes)

**You need:** Node.js 20 or newer, Docker Desktop (for PostgreSQL), and a free Gemini API key
from <https://aistudio.google.com/apikey>.

```bash
# 1. Start PostgreSQL with pgvector
docker compose up -d

# 2. Backend
cd backend
npm install
cp .env.example .env            # Windows PowerShell: copy .env.example .env
#    -> open backend/.env and paste your key:  GEMINI_API_KEY=...
npm run db:migrate              # creates the tables + pgvector extension
npm run check:gemini            # optional: confirms your key and model names work
npm run dev                     # API on http://localhost:3001

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                     # open http://localhost:5173
```

Then click **Add documents** (try the files in `sample-docs/`) and ask a question, e.g.
*"What is the hotel nightly cap?"* or *"How long must a password be?"*

**No Docker?** Create a free PostgreSQL database on Neon or Supabase (both support pgvector),
and put its connection string in `DATABASE_URL` in `backend/.env`. Then run `npm run db:migrate`.

**Single-server mode (for demo/deployment):** `cd frontend && npm run build`, then
`cd ../backend && npm start`. Express serves the built React app and the API together on port 3001.

## Features

- Upload PDF, TXT and Markdown files (several at once, drag and drop)
- Ask across all documents or one selected document
- Answers with numbered citations; click a citation to open the exact passage and its similarity score
- List, **inspect** (cleaned text and every chunk), **reprocess** and **delete** documents
- Clear errors: scanned/image-only PDFs, wrong file type, missing API key, Gemini quota problems
- Responsive layout (works on a phone-sized screen)

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | database, pgvector and Gemini configuration status |
| GET | `/api/documents` | list documents |
| POST | `/api/documents` | upload (`multipart/form-data`, field `file`) |
| GET | `/api/documents/:id` | document details with all chunks |
| POST | `/api/documents/:id/reprocess` | re-chunk and re-embed |
| DELETE | `/api/documents/:id` | delete document and its chunks |
| POST | `/api/ask` | `{ "question": "...", "documentId": "optional-uuid" }` |

## Tests

```bash
cd backend
npm test                  # unit tests: cleaning, chunking, prompt building (no database needed)
npm run test:integration  # full API against PostgreSQL + pgvector with a fake Gemini server
```

The integration test needs the database from step 1 and a migrated schema. It uses a built-in fake
Gemini server, so it needs no API key and uses no quota. It **clears the documents table** first,
so do not run it against a database holding documents you want to keep.

## Configuration (`backend/.env`)

| Variable | Default | Meaning |
|---|---|---|
| `GEMINI_API_KEY` | — | required |
| `GEMINI_CHAT_MODEL` | `gemini-2.5-flash` | model that writes the answer |
| `GEMINI_EMBED_MODEL` | `gemini-embedding-001` | model that creates vectors (kept at 768 dimensions) |
| `DATABASE_URL` | local Docker database | PostgreSQL connection string |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | 1000 / 150 | chunking |
| `TOP_K` | 5 | passages sent to Gemini |

## Troubleshooting

- **"Gemini API error 404 ... model not found"** — Google renames and retires models. Run
  `npm run check:gemini`; it lists the models your key can use. Put a valid name in `GEMINI_CHAT_MODEL`.
  If you change `GEMINI_EMBED_MODEL`, re-process all documents (old vectors are not comparable).
- **"Gemini API error 429"** — free-tier rate limit. Wait a minute and press **Reprocess** on the document.
- **`extension "vector" is not available`** — the database does not have pgvector. Use the Docker image above, Neon or Supabase.
- **"No readable text found" for a PDF** — it is a scan (images only). OCR is listed under future enhancements.
- **`prisma migrate deploy` cannot connect** — check that `docker compose ps` shows the database as healthy and that `DATABASE_URL` matches.

## Limitations and future work (Limitations slide)

Answer quality depends on text extraction and chunking; scanned PDFs need OCR; very large collections
would need background jobs; there is no login yet (one shared knowledge base). Natural next steps:
hybrid keyword + vector search, reranking, OCR, per-user accounts, automatic evaluation.

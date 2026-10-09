# Product FAQ — Internal


## What does the platform do?


The platform ingests a company's documents, chunks and embeds them, stores the
vectors in a vector database, retrieves the most relevant passages for a user
question, and passes them to a large language model to produce a grounded
answer with citations. This is the **RAG (Retrieval-Augmented Generation)**
pattern.


## What is a vector embedding?


A vector embedding is a dense numeric representation of text — typically
**384 to 1536 dimensions** — where semantically similar texts end up close
together under cosine similarity. Embeddings power semantic search: a query
about "working from home" can match a document titled "Remote Work Policy"
even with no shared keywords.


## What is a vector database?


A vector database stores embeddings plus metadata and supports fast
approximate nearest-neighbour search. Common choices are **Chroma, pgvector,
Qdrant, Weaviate, Milvus and Pinecone**. This project ships with a NumPy-based
store that does exact cosine search, which is sufficient up to roughly
**100,000 chunks**.


## Why chunk documents?


Embedding a whole 20-page document into a single vector averages away the
detail, and the LLM gets a wall of text it can't cite precisely. Chunking into
**~900 character** passages with **~150 characters of overlap** keeps each unit
focused while preventing answers from being cut in half at a boundary.


## What is hybrid retrieval?


Dense embeddings miss exact tokens (product codes, acronyms, rare words).
BM25 is a classic keyword ranking function that catches exactly those. This
project runs both and fuses the rankings with **Reciprocal Rank Fusion (RRF)**,
which is more robust than normalizing two incomparable score scales.


## How do you prevent hallucinations?


Three mechanisms: (1) the system prompt instructs the model to answer **only**
from the supplied context and to say "I don't have that information" otherwise;
(2) retrieved passages are numbered and the model must cite them inline; (3)
every answer returns its source chunks so a human can verify the claim.


## How is retrieval quality measured?


With **hit-rate@k** (does an expected source appear in the top k?) and **MRR**
(mean reciprocal rank of the first correct source). Run `kw eval` to compute
both against `data/eval/questions.jsonl`.

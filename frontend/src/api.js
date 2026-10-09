// Thin wrapper around the REST API. Every function throws an Error with a readable message.
async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, options);
  } catch {
    throw new Error('Cannot reach the server. Is the backend running on port 3001?');
  }
  if (res.status === 204) return null;
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
}

export const api = {
  health: () => request('/health'),
  listDocuments: () => request('/documents'),
  getDocument: (id) => request(`/documents/${id}`),
  uploadDocument: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/documents', { method: 'POST', body: form });
  },
  reprocessDocument: (id) => request(`/documents/${id}/reprocess`, { method: 'POST' }),
  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
  ask: (question, documentId) =>
    request('/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, documentId: documentId || undefined }),
    }),
};

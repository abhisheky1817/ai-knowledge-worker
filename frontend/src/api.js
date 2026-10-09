
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

async function request(path, options = {}) {
  let res;

  try {
    res = await fetch(`${API_BASE_URL}/api${path}`, options);
  } catch {
    throw new Error('Cannot reach the server. Please check your internet connection or backend status.');
  }

  if (res.status === 204) return null;

  let body = null;

  try {
    body = await res.json();
  } catch {
    // Ignore non-JSON error responses.
  }

  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }

  return body;
}

export const api = {
  health: () => request('/health'),
  listDocuments: () => request('/documents'),
  getDocument: (id) => request(`/documents/${id}`),

  uploadDocument: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/documents', {
      method: 'POST',
      body: form,
    });
  },

  reprocessDocument: (id) =>
    request(`/documents/${id}/reprocess`, { method: 'POST' }),

  deleteDocument: (id) =>
    request(`/documents/${id}`, { method: 'DELETE' }),

  ask: (question, documentId) =>
    request('/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        documentId: documentId || undefined,
      }),
    }),
};

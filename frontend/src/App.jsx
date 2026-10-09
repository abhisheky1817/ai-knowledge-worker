import React, { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import Library from './components/Library.jsx';
import Chat from './components/Chat.jsx';
import DocumentDetail from './components/DocumentDetail.jsx';

let turnId = 0;

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null); // { kind: 'error' | 'ok', text }
  const [health, setHealth] = useState(null);
  const [scope, setScope] = useState('');
  const [turns, setTurns] = useState([]);
  const [uploading, setUploading] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [detail, setDetail] = useState(null); // { doc, error } | null

  const refresh = useCallback(async () => {
    try {
      setDocuments(await api.listDocuments());
    } catch (err) {
      setNotice({ kind: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    api.health().then(setHealth).catch(() => setHealth({ api: 'down' }));
  }, [refresh]);

  const upload = async (file) => {
    setUploading((n) => n + 1);
    setNotice(null);
    try {
      const doc = await api.uploadDocument(file);
      if (doc.status === 'FAILED') setNotice({ kind: 'error', text: `"${doc.title}" was saved but indexing failed: ${doc.error} Use Reprocess to try again.` });
      else setNotice({ kind: 'ok', text: `"${doc.title}" is ready (${doc.chunkCount} sections).` });
    } catch (err) {
      setNotice({ kind: 'error', text: `${file.name}: ${err.message}` });
    } finally {
      setUploading((n) => n - 1);
      refresh();
    }
  };

  const reprocess = async (id) => {
    setBusyId(id);
    setNotice(null);
    try {
      const doc = await api.reprocessDocument(id);
      setNotice(doc.status === 'READY' ? { kind: 'ok', text: `"${doc.title}" was re-indexed.` } : { kind: 'error', text: `Indexing failed: ${doc.error}` });
    } catch (err) {
      setNotice({ kind: 'error', text: err.message });
    } finally {
      setBusyId(null);
      refresh();
    }
  };

  const remove = async (doc) => {
    if (!window.confirm(`Delete "${doc.title}" and all its indexed sections?`)) return;
    setBusyId(doc.id);
    try {
      await api.deleteDocument(doc.id);
      if (scope === doc.id) setScope('');
      setNotice({ kind: 'ok', text: `"${doc.title}" was deleted.` });
    } catch (err) {
      setNotice({ kind: 'error', text: err.message });
    } finally {
      setBusyId(null);
      refresh();
    }
  };

  const inspect = async (id) => {
    setDetail({ doc: null, error: null });
    try {
      setDetail({ doc: await api.getDocument(id), error: null });
    } catch (err) {
      setDetail({ doc: null, error: err.message });
    }
  };

  const ask = async (question) => {
    const id = ++turnId;
    setTurns((t) => [...t, { id, question, pending: true }]);
    try {
      const res = await api.ask(question, scope);
      setTurns((t) => t.map((x) => (x.id === id ? { id, question, answer: res.answer, sources: res.sources } : x)));
    } catch (err) {
      setTurns((t) => t.map((x) => (x.id === id ? { id, question, error: err.message } : x)));
    }
  };

  const ready = documents.filter((d) => d.status === 'READY');
  const scopeLabel = scope ? documents.find((d) => d.id === scope)?.title || 'this document' : 'all documents';
  const waiting = turns.some((t) => t.pending);

  const problems = [];
  if (health?.api === 'down') problems.push('The backend is not reachable on port 3001.');
  else if (health) {
    if (health.database !== 'ok') problems.push('The database is not connected.');
    if (health.gemini !== 'configured') problems.push('Add GEMINI_API_KEY to backend/.env and restart the server.');
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>AI Knowledge Worker</h1>
        <p className="muted">Ask questions about your own documents</p>
      </header>

      {problems.length > 0 && (
        <div className="banner error" role="alert">
          {problems.join(' ')}
        </div>
      )}
      {notice && (
        <div className={`banner ${notice.kind}`} role="status">
          <span>{notice.text}</span>
          <button type="button" className="link" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      <main className="layout">
        <Library
          documents={documents}
          loading={loading}
          scope={scope}
          onScope={setScope}
          onUpload={upload}
          onInspect={inspect}
          onReprocess={reprocess}
          onDelete={remove}
          uploading={uploading > 0}
          busyId={busyId}
        />
        <Chat turns={turns} onAsk={ask} disabled={waiting} scopeLabel={scopeLabel} hasDocuments={ready.length > 0} />
      </main>

      {detail && <DocumentDetail doc={detail.doc} error={detail.error} onClose={() => setDetail(null)} />}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import './Attachments.css';

const BASE = '/api/incidents';

function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime) {
  if (!mime) return '📄';
  if (mime.startsWith('image/')) return '🖼';
  if (mime === 'application/pdf') return '📕';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return '📊';
  if (mime.includes('zip') || mime.includes('compressed')) return '🗜';
  return '📄';
}

export default function Attachments({ incidentId, section, label }) {
  const [files, setFiles]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUpload]  = useState(false);
  const [error, setError]       = useState(null);
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef(null);

  async function fetchAttachments() {
    try {
      const res  = await fetch(`${BASE}/${incidentId}/attachments`);
      const all  = await res.json();
      setFiles(all.filter(a => a.section === section));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchAttachments(); }, [incidentId, section]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUpload(true);
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('section', section);
    try {
      const res = await fetch(`${BASE}/${incidentId}/attachments`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      await fetchAttachments();
      setExpanded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpload(false);
    }
  }

  async function handleDelete(attId) {
    if (!confirm('Remove this attachment?')) return;
    try {
      await fetch(`${BASE}/${incidentId}/attachments/${attId}`, { method: 'DELETE' });
      setFiles(f => f.filter(a => a.id !== attId));
    } catch {
      setError('Failed to delete attachment.');
    }
  }

  const count = files.length;

  return (
    <div className="attach-block">
      <button className="attach-toggle" onClick={() => setExpanded(x => !x)}>
        <span className="attach-icon">📎</span>
        <span className="attach-label">{label || 'Attachments'}</span>
        {count > 0 && <span className="attach-badge">{count}</span>}
        <span className="attach-chevron">{expanded ? '▲' : '▼'}</span>
        <button
          className="attach-upload-btn"
          disabled={uploading}
          onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
          title="Add attachment"
        >
          {uploading ? '…' : '+ Add'}
        </button>
      </button>

      <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />

      {error && <div className="attach-error">{error}</div>}

      {expanded && (
        <div className="attach-list">
          {loading ? (
            <div className="attach-empty">Loading…</div>
          ) : count === 0 ? (
            <div className="attach-empty">No attachments yet. Click "+ Add" to upload.</div>
          ) : (
            files.map(a => (
              <div key={a.id} className="attach-item">
                <span className="attach-file-icon">{fileIcon(a.mimetype)}</span>
                <a
                  className="attach-name"
                  href={`${BASE}/${incidentId}/attachments/${a.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={a.original_name}
                >
                  {a.original_name}
                </a>
                <span className="attach-size">{formatBytes(a.size)}</span>
                <button className="attach-del" onClick={() => handleDelete(a.id)} title="Remove">✕</button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

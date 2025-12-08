import React, { useEffect, useState, useRef } from 'react';

/**
 * AllBooks.jsx
 * Props:
 *  - API_BASE (string)  -> base API URL, e.g. http://localhost:4000
 *  - showToast (fn)     -> function(type, message, data)
 */
export default function AllBooks({ API_BASE, showToast }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // book object being edited
  const [progress, setProgress] = useState(0);
  const [busyId, setBusyId] = useState(null); // id for which operations are in-flight

  const pdfInputRef = useRef(null);
  const posterInputRef = useRef(null);

  // Edit form fields
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [newPdfFile, setNewPdfFile] = useState(null);
  const [newPosterFile, setNewPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    return () => {
      if (posterPreview) URL.revokeObjectURL(posterPreview);
    };
  }, [posterPreview]);

  async function fetchBooks() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/books`);
      if (!res.ok) throw new Error('Failed to fetch books');
      const data = await res.json();
      setBooks(data);
    } catch (err) {
      console.error(err);
      showToast && showToast('error', 'Failed to load books');
    } finally {
      setLoading(false);
    }
  }

  function openEdit(book) {
    setEditing(book);
    setTitle(book.title || '');
    setAuthor(book.author || '');
    setDescription(book.description || '');
    setNewPdfFile(null);
    setNewPosterFile(null);
    setPosterPreview(book.posterUrl || null);
    if (pdfInputRef.current) pdfInputRef.current.value = null;
    if (posterInputRef.current) posterInputRef.current.value = null;
  }

  function closeEdit() {
    setEditing(null);
    setProgress(0);
    setPosterPreview(null);
  }

  function handlePdfChange(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) { setNewPdfFile(null); return; }
    if (f.type !== 'application/pdf') {
      showToast && showToast('error', 'Only PDF files allowed');
      e.target.value = null;
      return;
    }
    setNewPdfFile(f);
  }

  function handlePosterChange(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) { setNewPosterFile(null); return; }
    if (!f.type.startsWith('image/')) {
      showToast && showToast('error', 'Poster must be an image');
      e.target.value = null;
      return;
    }
    if (posterPreview) URL.revokeObjectURL(posterPreview);
    setPosterPreview(URL.createObjectURL(f));
    setNewPosterFile(f);
  }

  async function handleDelete(bookId) {
    if (!window.confirm('Delete this book permanently?')) return;
    setBusyId(bookId);
    try {
      const res = await fetch(`${API_BASE}/api/books/${bookId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(()=>({}));
        throw new Error(body.message || 'Delete failed');
      }
      showToast && showToast('success', 'Deleted');
      setBooks(prev => prev.filter(b => b._id !== bookId));
    } catch (err) {
      console.error(err);
      showToast && showToast('error', err.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  // PUT update with optional files (use XHR for progress)
  function submitEdit(e) {
    e.preventDefault();
    if (!editing) return;

    setBusyId(editing._id);
    setProgress(0);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('author', author);
    formData.append('description', description);
    if (newPdfFile) formData.append('pdf', newPdfFile, newPdfFile.name);
    if (newPosterFile) formData.append('poster', newPosterFile, newPosterFile.name);

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `${API_BASE}/api/books/${editing._id}`);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        setProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };

    xhr.onload = () => {
      setBusyId(null);
      setProgress(0);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const updated = JSON.parse(xhr.responseText);
          // update local list
          setBooks(prev => prev.map(b => (b._id === updated._id ? updated : b)));
          showToast && showToast('success', 'Updated', updated);
          closeEdit();
        } catch (err) {
          showToast && showToast('success', 'Updated (response parse failed)');
          closeEdit();
        }
      } else {
        let msg = `Update failed: ${xhr.status}`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body && body.message) msg = body.message;
        } catch (_) {}
        showToast && showToast('error', msg);
      }
    };

    xhr.onerror = () => {
      setBusyId(null);
      setProgress(0);
      showToast && showToast('error', 'Network error during update');
    };

    xhr.send(formData);
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.headerRow}>
        <h2 style={{ margin: 0 }}>All Books</h2>
        <div style={{ color: '#6b7280' }}>{loading ? 'Loading…' : `${books.length} book(s)`}</div>
      </div>

      <div style={styles.list}>
        {books.length === 0 && !loading && <div style={styles.empty}>No books yet.</div>}

        {books.map(book => (
          <div key={book._id} style={styles.card}>
            <div style={styles.left}>
              <div style={styles.posterBox}>
                {book.posterUrl ? <img src={book.posterUrl} alt="" style={styles.poster} /> : <div style={styles.posterEmpty}>No poster</div>}
              </div>
            </div>

            <div style={styles.middle}>
              <div style={{ fontWeight: 700 }}>{book.title}</div>
              <div style={{ color: '#6b7280', fontSize: 13 }}>{book.author || '—'}</div>
              <div style={{ marginTop: 8, color: '#374151' }}>{book.description}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>Added: {new Date(book.createdAt).toLocaleString()}</div>
              <div style={{ marginTop: 8 }}>
                {book.pdfUrl && <a href={book.pdfUrl} target="_blank" rel="noreferrer" style={styles.link}>Open PDF</a>}
                {book.posterUrl && <a href={book.posterUrl} target="_blank" rel="noreferrer" style={{ ...styles.link, marginLeft: 12 }}>Poster</a>}
              </div>
            </div>

            <div style={styles.right}>
              <button style={styles.smallButton} onClick={() => openEdit(book)}>Edit</button>
              <button style={{ ...styles.smallButton, background: '#fff', border: '1px solid #f3c5c5', color: '#b91c1c' }}
                onClick={() => handleDelete(book._id)}
                disabled={busyId === book._id}
              >
                {busyId === book._id ? '...' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div style={styles.modalOverlay} onMouseDown={(e)=>{ if (e.target === e.currentTarget) closeEdit(); }}>
          <div style={styles.modal}>
            <h3 style={{ marginTop: 0 }}>Edit Book</h3>

            <form onSubmit={submitEdit}>
              <label style={styles.field}>
                <div style={styles.fieldTitle}>Title *</div>
                <input style={styles.input} value={title} onChange={(e)=>setTitle(e.target.value)} required />
              </label>

              <label style={styles.field}>
                <div style={styles.fieldTitle}>Author</div>
                <input style={styles.input} value={author} onChange={(e)=>setAuthor(e.target.value)} />
              </label>

              <label style={styles.field}>
                <div style={styles.fieldTitle}>Description</div>
                <textarea style={{ ...styles.input, minHeight: 80 }} value={description} onChange={(e)=>setDescription(e.target.value)} />
              </label>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, marginBottom: 6 }}>Replace PDF (optional)</div>
                  <input ref={pdfInputRef} type="file" accept="application/pdf" onChange={handlePdfChange} />
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{newPdfFile ? newPdfFile.name : 'Leave empty to keep existing'}</div>
                </div>

                <div>
                  <div style={{ fontSize: 13, marginBottom: 6 }}>Replace Poster (optional)</div>
                  <input ref={posterInputRef} type="file" accept="image/*" onChange={handlePosterChange} />
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{newPosterFile ? newPosterFile.name : 'Leave empty to keep existing'}</div>
                </div>

                {posterPreview && <img src={posterPreview} alt="preview" style={{ width: 80, height: 100, objectFit: 'cover', borderRadius: 6 }} />}
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                <button style={styles.primaryButton} type="submit" disabled={busyId === editing._id}>
                  {busyId === editing._id ? `Saving ${progress}%` : 'Save Changes'}
                </button>
                <button type="button" style={styles.ghostButton} onClick={closeEdit}>Cancel</button>
                <div style={{ marginLeft: 10, color: '#6b7280', fontSize: 13 }}>{progress > 0 ? `Uploading: ${progress}%` : ''}</div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { padding: 18 },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  empty: { color: '#6b7280' },
  card: { display: 'flex', gap: 12, padding: 12, borderRadius: 10, background: '#fff', alignItems: 'center', boxShadow: '0 6px 18px rgba(2,6,23,0.06)' },
  left: { width: 110 },
  posterBox: { width: 90, height: 120, borderRadius: 8, overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  poster: { width: '100%', height: '100%', objectFit: 'cover' },
  posterEmpty: { color: '#9ca3af', fontSize: 12 },
  middle: { flex: 1 },
  right: { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' },
  smallButton: { padding: '8px 12px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', cursor: 'pointer' },
  link: { color: '#2563eb', fontSize: 13, textDecoration: 'none' },

  // modal
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  modal: { width: 780, maxWidth: '95%', background: '#fff', padding: 18, borderRadius: 12, boxShadow: '0 14px 40px rgba(2,6,23,0.24)' },
  field: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 },
  fieldTitle: { fontSize: 13, fontWeight: 700 },
  input: { padding: '8px 10px', borderRadius: 8, border: '1px solid #e6e9ef', fontSize: 14 },

  primaryButton: { padding: '10px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(90deg,#7c3aed,#2563eb)', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  ghostButton: { padding: '10px 12px', borderRadius: 10, border: '1px solid #e6e9ef', background: '#fff', cursor: 'pointer' }
};

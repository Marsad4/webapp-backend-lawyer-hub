// src/App.jsx (modified: adds AllBooks page)
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUploadCloud, FiFileText, FiImage, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import AllBooks from './AllBooks'; // <- new import

export default function App() {
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';

  // new: simple page toggle
  const [page, setPage] = useState('upload'); // 'upload' or 'list'

  // form fields
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');

  // files
  const [pdfFile, setPdfFile] = useState(null);
  const [posterFile, setPosterFile] = useState(null);

  // previews
  const [posterPreview, setPosterPreview] = useState(null);

  // UI state
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); // {type, message, data}

  // refs
  const pdfInputRef = useRef(null);
  const posterInputRef = useRef(null);

  // cleanup preview URL on poster change/unmount
  useEffect(() => {
    return () => {
      if (posterPreview) URL.revokeObjectURL(posterPreview);
    };
  }, [posterPreview]);

  // helpers
  const showToast = (type, message, data = null) => {
    setToast({ type, message, data });
    setTimeout(() => setToast(null), 4500);
  };

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setDescription('');
    if (pdfInputRef.current) pdfInputRef.current.value = null;
    if (posterInputRef.current) posterInputRef.current.value = null;

    setPdfFile(null);
    if (posterPreview) {
      URL.revokeObjectURL(posterPreview);
      setPosterPreview(null);
    }
    setPosterFile(null);
    setProgress(0);
  };

  // (rest of your existing functions remain unchanged)
  // PDF selection / drag-drop
  const handlePdfChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) { setPdfFile(null); return; }
    if (f.type !== 'application/pdf') {
      showToast('error', 'Only PDF files are allowed for the main file.');
      if (pdfInputRef.current) pdfInputRef.current.value = null;
      return;
    }
    setPdfFile(f);
  };

  const handleDropPdf = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    if (f.type !== 'application/pdf') {
      showToast('error', 'Only PDF files are allowed for the main file.');
      return;
    }
    setPdfFile(f);
    if (pdfInputRef.current) pdfInputRef.current.value = null;
  };

  // Poster image selection & preview
  const handlePosterChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) { removePoster(); return; }
    if (!f.type.startsWith('image/')) {
      showToast('error', 'Poster must be an image (png/jpg/webp).');
      if (posterInputRef.current) posterInputRef.current.value = null;
      return;
    }
    if (f.size > 6 * 1024 * 1024) { // 6MB limit for poster
      showToast('error', 'Poster image must be under 6 MB.');
      if (posterInputRef.current) posterInputRef.current.value = null;
      return;
    }
    if (posterPreview) URL.revokeObjectURL(posterPreview);
    const previewUrl = URL.createObjectURL(f);
    setPosterPreview(previewUrl);
    setPosterFile(f);
  };

  const removePoster = () => {
    if (posterInputRef.current) posterInputRef.current.value = null;
    if (posterPreview) {
      URL.revokeObjectURL(posterPreview);
      setPosterPreview(null);
    }
    setPosterFile(null);
  };

  // submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return showToast('error', 'Title is required.');

    try {
      setLoading(true);
      setProgress(0);

      const formData = new FormData();
      formData.append('title', title);
      formData.append('author', author);
      formData.append('description', description);
      if (pdfFile) formData.append('pdf', pdfFile, pdfFile.name);
      if (posterFile) formData.append('poster', posterFile, posterFile.name);

      // XMLHttpRequest for progress
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE}/api/books`);

        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const percent = Math.round((evt.loaded / evt.total) * 100);
            setProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              showToast('success', 'Uploaded successfully', data);
              resetForm();
              resolve(data);
            } catch (err) {
              showToast('error', 'Upload succeeded but response invalid.');
              resolve();
            }
          } else {
            let msg = `Upload failed: ${xhr.status}`;
            try {
              const body = JSON.parse(xhr.responseText);
              if (body && body.message) msg = body.message;
            } catch (_) {}
            showToast('error', msg);
            reject(new Error(msg));
          }
        };

        xhr.onerror = () => {
          showToast('error', 'Network error.');
          reject(new Error('Network error'));
        };

        xhr.send(formData);
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div style={theme.page}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={theme.container}>
        <header style={theme.header}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={{ duration: 0.4 }} style={theme.logoWrap}>
            <FiUploadCloud style={{ fontSize: 28, color: '#fff' }} />
          </motion.div>
          <div style={{ flex: 1 }}>
            <h1 style={theme.title}>Book Uploader</h1>
            <p style={theme.subtitle}>Upload PDFs + poster images — animated, modern UI.</p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setPage('upload')} style={{ ...theme.ghostButton, background: page === 'upload' ? '#eef2ff' : '#fff' }}>
              Upload
            </button>
            <button type="button" onClick={() => setPage('list')} style={{ ...theme.ghostButton, background: page === 'list' ? '#eef2ff' : '#fff' }}>
              All Books
            </button>
          </div>
        </header>

        {/* Render either upload UI (your existing form) or the new AllBooks list */}
        {page === 'upload' ? (
          <motion.form onSubmit={handleSubmit} style={theme.card} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* ... all of your existing upload form UI unchanged ... */}
            {/* I'll keep the rest of your original form code here unchanged for brevity (same as your current file) */}
            <div style={theme.grid}>
              <label style={theme.label}>
                <div style={theme.labelTitle}>Title *</div>
                <input style={theme.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter book title" />
              </label>

              <label style={theme.label}>
                <div style={theme.labelTitle}>Author</div>
                <input style={theme.input} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author name" />
              </label>

              <label style={{ ...theme.label, gridColumn: '1 / -1' }}>
                <div style={theme.labelTitle}>Description</div>
                <textarea style={{ ...theme.input, minHeight: 84, resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
              </label>

              {/* PDF drop area */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDropPdf}
                style={{ ...theme.dropArea, borderColor: dragOver ? '#7c3aed' : '#e6e9ef', background: dragOver ? 'rgba(124,58,237,0.04)' : 'transparent' }}
              >
                <input ref={pdfInputRef} id="pdfInput" type="file" accept="application/pdf" onChange={handlePdfChange} style={{ display: 'none' }} />
                <div style={theme.dropInner} onClick={() => pdfInputRef.current && pdfInputRef.current.click()}>
                  <FiFileText style={{ fontSize: 34, color: '#7c3aed', marginBottom: 8 }} />
                  <div style={{ fontWeight: 600 }}>{pdfFile ? pdfFile.name : 'Drag & drop PDF here or click to select'}</div>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>{pdfFile ? `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB` : 'PDF only • Max 50MB'}</div>
                </div>
              </div>

              {/* Poster upload & preview */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', gridColumn: '1 / -1' }}>
                <div style={theme.posterWrap}>
                  {posterPreview ? (
                    <img src={posterPreview} alt="poster preview" style={theme.posterImg} />
                  ) : (
                    <div style={theme.posterEmpty}>
                      <FiImage style={{ fontSize: 28, color: '#9ca3af' }} />
                      <div style={{ color: '#6b7280', fontSize: 13 }}>Poster preview</div>
                    </div>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input ref={posterInputRef} id="posterInput" type="file" accept="image/*" onChange={handlePosterChange} style={{ display: 'none' }} />
                    <button type="button" onClick={() => posterInputRef.current && posterInputRef.current.click()} style={theme.ghostButton}>
                      Select poster
                    </button>
                    <button type="button" onClick={removePoster} style={{ ...theme.ghostButton, background: '#fff' }}>
                      Remove
                    </button>
                    <div style={{ color: '#6b7280', fontSize: 13 }}>{posterFile ? posterFile.name : 'PNG / JPG / WEBP • Max 6MB'}</div>
                  </div>

                  <div style={{ marginTop: 8, color: '#6b7280', fontSize: 13 }}>
                    Poster is optional but recommended — it will be shown in lists and previews.
                  </div>
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, alignItems: 'center' }}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={theme.primaryButton} type="submit" disabled={loading}>
                  {loading ? `Uploading ${progress}%` : 'Upload Book'}
                </motion.button>

                <button type="button" onClick={resetForm} style={theme.ghostButton}>Reset</button>

                <div style={{ flex: 1 }}>
                  <AnimatePresence>
                    {progress > 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={theme.progressWrap}>
                        <div style={{ ...theme.progressBar, width: `${progress}%` }} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.form>
        ) : (
          // AllBooks page
          <AllBooks API_BASE={API_BASE} showToast={showToast} />
        )}

        {/* Toast / Feedback */}
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ ...theme.toast, borderLeft: `4px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}` }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {toast.type === 'success' ? <FiCheckCircle style={{ color: '#10b981', fontSize: 20 }} /> : <FiXCircle style={{ color: '#ef4444', fontSize: 20 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{toast.message}</div>

                  {/* show returned links if present */}
                  {toast.data && (
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {toast.data.pdfUrl && (
                        <a href={toast.data.pdfUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: 13, overflowWrap: 'anywhere' }}>
                          View PDF
                        </a>
                      )}
                      {toast.data.posterUrl && (
                        <a href={toast.data.posterUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: 13 }}>
                          View Poster
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ----------------- Styles -----------------
// keep your theme as-is
const theme = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
    padding: 24,
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  },
  container: {
    width: '100%',
    maxWidth: 900,
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 10px 40px rgba(2,6,23,0.12)'
  },
  header: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    padding: 20,
    background: 'linear-gradient(90deg, #7c3aed 0%, #2563eb 100%)',
    color: '#fff'
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.08)'
  },
  title: { margin: 0, fontSize: 20, fontWeight: 700 },
  subtitle: { margin: 0, opacity: 0.9, fontSize: 13, marginTop: 4 },
  card: { padding: 22, background: '#fff' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  label: { display: 'flex', flexDirection: 'column', gap: 8 },
  labelTitle: { fontSize: 13, color: '#374151', fontWeight: 600 },
  input: { padding: '10px 12px', borderRadius: 10, border: '1px solid #e6e9ef', fontSize: 14, outline: 'none' },
  dropArea: { gridColumn: '1 / -1', border: '1.5px dashed #e6e9ef', borderRadius: 12, padding: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dropInner: { textAlign: 'center', userSelect: 'none' },
  posterWrap: { width: 140, height: 180, borderRadius: 8, border: '1px solid #eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fff' },
  posterImg: { width: '100%', height: '100%', objectFit: 'cover' },
  posterEmpty: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 10 },
  primaryButton: { padding: '10px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(90deg,#7c3aed,#2563eb)', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  ghostButton: { padding: '10px 16px', borderRadius: 10, border: '1px solid #e6e9ef', background: '#fff', cursor: 'pointer' },
  progressWrap: { height: 8, background: '#eef2ff', borderRadius: 8, overflow: 'hidden' },
  progressBar: { height: '100%', background: 'linear-gradient(90deg,#7c3aed,#22c1c3)' },
  toast: { position: 'fixed', right: 24, bottom: 24, background: '#fff', padding: 14, borderRadius: 10, boxShadow: '0 8px 24px rgba(2,6,23,0.12)', minWidth: 320 }
};

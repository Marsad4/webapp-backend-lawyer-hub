import React, { useEffect, useState, useRef } from 'react';
import { FiEdit, FiTrash2, FiFileText, FiImage, FiX, FiSave } from 'react-icons/fi';

export default function AllBooks({ API_BASE, showToast }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [progress, setProgress] = useState(0);
  const [busyId, setBusyId] = useState(null);

  const pdfInputRef = useRef(null);
  const posterInputRef = useRef(null);

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
    if (posterPreview) URL.revokeObjectURL(posterPreview);
    setPosterPreview(null);
  }

  function handlePdfChange(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) {
      setNewPdfFile(null);
      return;
    }
    if (f.type !== 'application/pdf') {
      showToast && showToast('error', 'Only PDF files allowed');
      e.target.value = null;
      return;
    }
    setNewPdfFile(f);
  }

  function handlePosterChange(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) {
      setNewPosterFile(null);
      return;
    }
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
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Delete failed');
      }
      showToast && showToast('success', 'Deleted');
      setBooks((prev) => prev.filter((b) => b._id !== bookId));
    } catch (err) {
      console.error(err);
      showToast && showToast('error', err.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

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
          setBooks((prev) => prev.map((b) => (b._id === updated._id ? updated : b)));
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">All Books</h2>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? 'Loading…' : `${books.length} book(s) in total`}
          </p>
        </div>
      </div>

      {/* Books List */}
      <div className="p-6">
        {loading && (
          <div className="text-center py-12 text-gray-500">Loading books...</div>
        )}

        {!loading && books.length === 0 && (
          <div className="text-center py-12 text-gray-500">No books yet.</div>
        )}

        <div className="space-y-4">
          {books.map((book) => (
            <div
              key={book._id}
              className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              {/* Poster */}
              <div className="w-24 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 border border-gray-300">
                {book.posterUrl ? (
                  <img src={book.posterUrl} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <FiImage className="text-2xl" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{book.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{book.author || '—'}</p>
                <p className="text-sm text-gray-700 mb-3 line-clamp-2">{book.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <span>Added: {new Date(book.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  {book.pdfUrl && (
                    <a
                      href={book.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <FiFileText />
                      View PDF
                    </a>
                  )}
                  {book.posterUrl && (
                    <a
                      href={book.posterUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <FiImage />
                      View Poster
                    </a>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => openEdit(book)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <FiEdit className="text-sm" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(book._id)}
                  disabled={busyId === book._id}
                  className="px-4 py-2 bg-white border border-red-300 hover:bg-red-50 text-red-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <FiTrash2 className="text-sm" />
                  {busyId === book._id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Edit Book</h3>
              <button
                onClick={closeEdit}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={submitEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Author</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-vertical"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Replace PDF (optional)
                  </label>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfChange}
                    className="w-full text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {newPdfFile ? newPdfFile.name : 'Leave empty to keep existing'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Replace Poster (optional)
                  </label>
                  <input
                    ref={posterInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePosterChange}
                    className="w-full text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {newPosterFile ? newPosterFile.name : 'Leave empty to keep existing'}
                  </p>
                </div>
              </div>

              {posterPreview && (
                <div className="flex items-center gap-4">
                  <img
                    src={posterPreview}
                    alt="preview"
                    className="w-20 h-28 object-cover rounded-lg border border-gray-300"
                  />
                  <p className="text-sm text-gray-600">Poster preview</p>
                </div>
              )}

              {progress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={busyId === editing._id}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  <FiSave />
                  {busyId === editing._id ? `Saving ${progress}%` : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


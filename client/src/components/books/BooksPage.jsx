import React, { useEffect, useState, useRef } from 'react';
import { FiEdit, FiTrash2, FiFileText, FiImage, FiX, FiSave, FiPlus, FiCalendar } from 'react-icons/fi';
import BookUploadModal from './BookUploadModal';

export default function BooksPage({ API_BASE, showToast }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
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

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
useEffect(() => {
    fetchBooks();
  }, []);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
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
      showToast && showToast('success', 'Book deleted');
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
          showToast && showToast('success', 'Book updated');
          closeEdit();
        } catch (err) {
          showToast && showToast('success', 'Updated');
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
      showToast && showToast('error', 'Network error');
    };

    xhr.send(formData);
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Books</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? 'Loading...' : `${books.length} ${books.length === 1 ? 'book' : 'books'}`}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
        >
          <FiPlus className="text-base" />
          Add New Book
        </button>
      </div>

      {/* Books List */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
          <p className="text-sm text-gray-500 mt-4">Loading books...</p>
        </div>
      )}

      {!loading && books.length === 0 && (
        <div className="text-center py-16">
          <div className="max-w-sm mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiFileText className="text-2xl text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No books yet</h3>
            <p className="text-sm text-gray-500 mb-6">Get started by adding your first book to the collection.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
            >
              <FiPlus className="inline mr-2" />
              Add Your First Book
            </button>
          </div>
        </div>
      )}

      {!loading && books.length > 0 && (
        <div className="grid gap-4">
          {books.map((book) => (
            <div
              key={book._id}
              className="rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group bg-white"
            >
              <div className="p-5 flex gap-4">
                {/* Poster */}
                <div className="w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 shadow-sm">
                  {book.posterUrl ? (
                    <img
                      src={book.posterUrl}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <FiImage className="text-xl" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">{book.title}</h3>
                      {book.author && (
                        <p className="text-sm text-gray-600 mb-2">by {book.author}</p>
                      )}
                    </div>
                  </div>
                  
                  {book.description && (
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2 leading-relaxed">{book.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 flex-wrap">
                    {book.pdfUrl && (
                      <a
                        href={book.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        <FiFileText className="text-base" />
                        View PDF
                      </a>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <FiCalendar className="text-xs" />
                      {new Date(book.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => openEdit(book)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-sm hover:shadow"
                  >
                    <FiEdit className="text-sm" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(book._id)}
                    disabled={busyId === book._id}
                    className="px-4 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiTrash2 className="text-sm" />
                    {busyId === book._id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Book Modal */}
      <BookUploadModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        API_BASE={API_BASE}
        showToast={showToast}
        onSuccess={fetchBooks}
      />

      {/* Edit Modal */}
      {editing && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeEdit}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-900">Edit Book</h3>
              <button
                onClick={closeEdit}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={submitEdit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Replace PDF (optional)
                  </label>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfChange}
                    className="w-full text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    {newPdfFile ? newPdfFile.name : 'Keep existing file'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Replace Poster (optional)
                  </label>
                  <input
                    ref={posterInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePosterChange}
                    className="w-full text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    {newPosterFile ? newPosterFile.name : 'Keep existing image'}
                  </p>
                </div>
              </div>

              {posterPreview && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <img
                    src={posterPreview}
                    alt="preview"
                    className="w-24 h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                  />
                  <p className="text-sm text-gray-600">Poster preview</p>
                </div>
              )}

              {progress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={busyId === editing._id}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  <FiSave className="text-sm" />
                  {busyId === editing._id ? `Saving ${progress}%` : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

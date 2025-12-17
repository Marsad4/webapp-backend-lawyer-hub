import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFileText, FiImage, FiUpload, FiX, FiUploadCloud } from 'react-icons/fi';

export default function BookUploadModal({ isOpen, onClose, API_BASE, showToast, onSuccess }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [posterFile, setPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const pdfInputRef = useRef(null);
  const posterInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
    return () => {
      if (posterPreview) URL.revokeObjectURL(posterPreview);
    };
  }, [isOpen, posterPreview]);

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

  const handlePdfChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) {
      setPdfFile(null);
      return;
    }
    if (f.type !== 'application/pdf') {
      showToast('error', 'Only PDF files are allowed.');
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
      showToast('error', 'Only PDF files are allowed.');
      return;
    }
    setPdfFile(f);
    if (pdfInputRef.current) pdfInputRef.current.value = null;
  };

  const handlePosterChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) {
      removePoster();
      return;
    }
    if (!f.type.startsWith('image/')) {
      showToast('error', 'Poster must be an image.');
      if (posterInputRef.current) posterInputRef.current.value = null;
      return;
    }
    if (f.size > 6 * 1024 * 1024) {
      showToast('error', 'Poster must be under 6 MB.');
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
              showToast('success', 'Book uploaded successfully');
              resetForm();
              onSuccess && onSuccess();
              onClose();
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Add New Book</h2>
            <p className="text-sm text-gray-500 mt-1">Fill in the details to upload a new book</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Form - No scrollbar, scrollable content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-hide px-8 py-6">
          <div className="space-y-6">
            {/* Title and Author Row */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter book title"
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Author name"
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of the book"
                rows={3}
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none transition-all bg-white"
              />
            </div>

            {/* PDF and Poster Side by Side */}
            <div className="grid grid-cols-2 gap-6">
              {/* PDF Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PDF File <span className="text-red-500">*</span>
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDropPdf}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    dragOver
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
                  }`}
                  onClick={() => pdfInputRef.current && pdfInputRef.current.click()}
                >
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center">
                    {pdfFile ? (
                      <FiFileText className="text-3xl text-purple-600 mb-3" />
                    ) : (
                      <FiUploadCloud className="text-3xl text-gray-400 mb-3" />
                    )}
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {pdfFile ? pdfFile.name : 'Click or drag PDF here'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {pdfFile ? `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB` : 'PDF only • Max 50MB'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Poster Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poster <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                </label>
                <div className="space-y-3">
                  <div className="w-full h-40 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 shadow-sm">
                    {posterPreview ? (
                      <img
                        src={posterPreview}
                        alt="preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <FiImage className="text-2xl mb-2" />
                        <span className="text-xs">No poster</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      ref={posterInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePosterChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => posterInputRef.current && posterInputRef.current.click()}
                      className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Select Image
                    </button>
                    {posterFile && (
                      <button
                        type="button"
                        onClick={removePoster}
                        className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {posterFile ? posterFile.name : 'PNG / JPG / WEBP • Max 6MB'}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress */}
            <AnimatePresence>
              {progress > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"
                >
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>

        {/* Actions - Fixed at bottom */}
        <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-end gap-3 flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            {loading ? (
              <>
                <FiUpload className="animate-spin text-sm" />
                Uploading {progress}%
              </>
            ) : (
              <>
                <FiUploadCloud className="text-sm" />
                Upload Book
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

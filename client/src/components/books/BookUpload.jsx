import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFileText, FiImage, FiUpload, FiX } from 'react-icons/fi';

export default function BookUpload({ API_BASE, showToast }) {
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
    return () => {
      if (posterPreview) URL.revokeObjectURL(posterPreview);
    };
  }, [posterPreview]);

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

  const handlePosterChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) {
      removePoster();
      return;
    }
    if (!f.type.startsWith('image/')) {
      showToast('error', 'Poster must be an image (png/jpg/webp).');
      if (posterInputRef.current) posterInputRef.current.value = null;
      return;
    }
    if (f.size > 6 * 1024 * 1024) {
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Upload New Book</h2>
        <p className="text-sm text-gray-500 mt-1">
          Upload PDFs and poster images for your book collection
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter book title"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Author
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author name"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
            rows={4}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition resize-vertical"
          />
        </div>

        {/* PDF Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            PDF File <span className="text-red-500">*</span>
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDropPdf}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-300 hover:border-gray-400'
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
            <FiFileText className="text-4xl text-purple-600 mx-auto mb-3" />
            <div className="font-semibold text-gray-900 mb-1">
              {pdfFile ? pdfFile.name : 'Drag & drop PDF here or click to select'}
            </div>
            <div className="text-sm text-gray-500">
              {pdfFile
                ? `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB`
                : 'PDF only • Max 50MB'}
            </div>
          </div>
        </div>

        {/* Poster Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Poster Image <span className="text-gray-400 text-xs">(Optional)</span>
          </label>
          <div className="flex gap-4">
            <div className="w-32 h-40 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
              {posterPreview ? (
                <img
                  src={posterPreview}
                  alt="poster preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <FiImage className="text-2xl mb-2" />
                  <span className="text-xs">No poster</span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex gap-2 mb-2">
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
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Select Poster
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
              <p className="text-xs text-gray-500">
                {posterFile
                  ? posterFile.name
                  : 'PNG / JPG / WEBP • Max 6MB'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Poster is optional but recommended — it will be shown in lists and previews.
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
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

        {/* Submit Buttons */}
        <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <FiUpload className="animate-spin" />
                Uploading {progress}%
              </span>
            ) : (
              'Upload Book'
            )}
          </motion.button>
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}


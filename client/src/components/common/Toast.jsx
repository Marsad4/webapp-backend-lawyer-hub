import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiXCircle, FiX } from 'react-icons/fi';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, x: 20 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, y: 20, x: 20 }}
        className="fixed bottom-6 right-6 z-50 min-w-[320px] max-w-md"
      >
        <div
          className={`bg-white rounded-lg shadow-xl border-l-4 ${
            toast.type === 'success' ? 'border-green-500' : 'border-red-500'
          } p-4`}
        >
          <div className="flex items-start gap-3">
            {toast.type === 'success' ? (
              <FiCheckCircle className="text-green-500 text-xl flex-shrink-0 mt-0.5" />
            ) : (
              <FiXCircle className="text-red-500 text-xl flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900">{toast.message}</div>
              {toast.data && (
                <div className="mt-2 space-y-1">
                  {toast.data.pdfUrl && (
                    <a
                      href={toast.data.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm text-blue-600 hover:text-blue-700 truncate"
                    >
                      View PDF
                    </a>
                  )}
                  {toast.data.posterUrl && (
                    <a
                      href={toast.data.posterUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm text-blue-600 hover:text-blue-700 truncate"
                    >
                      View Poster
                    </a>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <FiX className="text-lg" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}


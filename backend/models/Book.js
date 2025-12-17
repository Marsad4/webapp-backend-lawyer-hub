const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  author: String,
  pdfUrl: String,
  posterUrl: String,
  pdfFilename: String,
  posterFilename: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Book', bookSchema);
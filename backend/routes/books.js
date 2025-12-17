const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Book = require('../models/Book');

// --- Multer Configuration ---
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedImage = ['.png', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;
    if (mimetype === 'application/pdf' || allowedImage.includes(ext) || mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  }
});

// Helper to build URL
function fileUrl(req, filename) {
  if (!filename) return null;
  // Use environment variable or fallback to request host
  const port = process.env.PORT || 4000;
  const defaultBase = `${req.protocol}://${req.get('host')}`; 
  const base = process.env.BASE_URL || defaultBase;
  return `${base}/uploads/${filename}`;
}

// --- Routes ---

// GET All
router.get('/', async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET One
router.get('/:id', async (req, res) => {
  try {
    const b = await Book.findById(req.params.id);
    if (!b) return res.status(404).json({ message: 'Not found' });
    res.json(b);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST Create
router.post('/', upload.fields([{ name: 'pdf', maxCount: 1 }, { name: 'poster', maxCount: 1 }]), async (req, res) => {
  try {
    const { title, description, author } = req.body;
    if (!title) return res.status(400).json({ message: 'title is required' });

    const files = req.files || {};
    const pdfFile = files.pdf && files.pdf[0];
    const posterFile = files.poster && files.poster[0];

    if (!pdfFile) return res.status(400).json({ message: 'PDF file required' });

    const book = new Book({
      title,
      description,
      author,
      pdfFilename: pdfFile.filename,
      posterFilename: posterFile ? posterFile.filename : undefined,
      // We generate full URLs dynamically or save them here
      pdfUrl: fileUrl(req, pdfFile.filename),
      posterUrl: posterFile ? fileUrl(req, posterFile.filename) : null,
    });

    await book.save();
    res.status(201).json(book);
  } catch (err) {
    console.error('POST /books error:', err);
    res.status(500).json({ message: err.message });
  }
});

// PUT Update
router.put('/:id', upload.fields([{ name: 'pdf', maxCount: 1 }, { name: 'poster', maxCount: 1 }]), async (req, res) => {
  try {
    const b = await Book.findById(req.params.id);
    if (!b) return res.status(404).json({ message: 'Not found' });

    const { title, description, author } = req.body;
    if (title) b.title = title;
    if (description) b.description = description;
    if (author) b.author = author;

    const files = req.files || {};
    const pdfFile = files.pdf && files.pdf[0];
    const posterFile = files.poster && files.poster[0];

    // Replace PDF
    if (pdfFile) {
      if (b.pdfFilename) {
        const old = path.join(uploadsDir, b.pdfFilename);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
      b.pdfFilename = pdfFile.filename;
      b.pdfUrl = fileUrl(req, pdfFile.filename);
    }

    // Replace Poster
    if (posterFile) {
      if (b.posterFilename) {
        const oldp = path.join(uploadsDir, b.posterFilename);
        if (fs.existsSync(oldp)) fs.unlinkSync(oldp);
      }
      b.posterFilename = posterFile.filename;
      b.posterUrl = fileUrl(req, posterFile.filename);
    }

    await b.save();
    res.json(b);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const b = await Book.findById(req.params.id);
    if (!b) return res.status(404).json({ message: 'Not found' });

    if (b.pdfFilename) {
      const p = path.join(uploadsDir, b.pdfFilename);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    if (b.posterFilename) {
      const p2 = path.join(uploadsDir, b.posterFilename);
      if (fs.existsSync(p2)) fs.unlinkSync(p2);
    }

    await b.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Import Routes
const authRoutes = require('./routes/userAuth');
const bookRoutes = require('./routes/books');
const chatRoutes = require("./routes/chat");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (uploads)
// This allows http://IP:PORT/uploads/filename.jpg to work
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/myapp";
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Mount Routes
// 1. Auth routes will be at: http://.../api/auth/signup
app.use('/api/auth', authRoutes);

// 2. Book routes will be at: http://.../api/books
app.use('/api/books', bookRoutes);
app.use("/api/chats", chatRoutes);

// Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Import Routes
const authRoutes = require('./routes/userAuth');
const bookRoutes = require('./routes/books');
const chatRoutes = require('./routes/chat');
const userRoutes = require('./routes/users');

let kycRoutes = null;
try {
  kycRoutes = require('./routes/kyc');
  console.log('✅ KYC routes loaded successfully');
} catch (err) {
  // Do not throw — keep server running even if KYC module isn't present
  console.warn('⚠️ KYC routes not found or failed to load. Continuing without KYC routes.');
  kycRoutes = null;
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Simple health check endpoint (doesn't rely on DB connection)
app.get('/api/health', (req, res) => {
  const connState = mongoose.connection && mongoose.connection.readyState;
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  res.json({
    status: 'ok',
    db: stateMap[connState] || (typeof connState === 'number' ? connState : 'unknown'),
    env: process.env.NODE_ENV || 'development'
  });
});

// Mount Routes (these require the app but not necessarily DB connection at require-time)
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/users', userRoutes);

if (kycRoutes) {
  app.use('/api/kyc', kycRoutes);
  console.log('✅ KYC routes mounted at /api/kyc');
} else {
  console.log('ℹ️ KYC routes not mounted (not available).');
}

// Export app so tests can require() it without starting the server
module.exports = app;

// If this file is run directly (node server.js), connect DB and start server
if (require.main === module) {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/myapp';
  const PORT = process.env.PORT || 4000;

  // Connect to Mongo only when the server is started directly
  mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

  mongoose.connection.on('connected', () => {
    console.log('Mongoose default connection open');
  });
  mongoose.connection.on('error', (err) => {
    console.error('Mongoose default connection error:', err);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('Mongoose default connection disconnected');
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });

  // Graceful shutdown
  const gracefulShutdown = () => {
    console.log('🛑 Shutting down gracefully...');
    server.close(() => {
      mongoose.connection.close(false, () => {
        console.log('Mongo connection closed. Exiting.');
        process.exit(0);
      });
    });

    // Force exit after 10s if not closed
    setTimeout(() => {
      console.error('Force exiting after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}


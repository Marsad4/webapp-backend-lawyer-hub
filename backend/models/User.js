// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true,
    minlength: 3 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true 
  },
  password: { type: String, required: true },
  photoUrl: { type: String, default: "" }, 
  isAdmin: { type: Boolean, default: false },
  // NEW: contact info
  phone: { type: String, default: "", trim: true },
  address: { type: String, default: "", trim: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);

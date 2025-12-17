const mongoose = require('mongoose');

const KYCSchema = new mongoose.Schema({
  lawyerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Lawyer'
  },
  idDocument: {
    url: String,
    fileName: String,
    uploadedAt: Date
  },
  licenseDocument: {
    url: String,
    fileName: String,
    uploadedAt: Date
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('KYC', KYCSchema);


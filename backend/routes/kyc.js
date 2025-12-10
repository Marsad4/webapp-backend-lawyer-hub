const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Helper to get KYC model from test database - collection name is 'lawyerkycs'
const getKYCModel = () => {
  try {
    const testDb = mongoose.connection.useDb('test');
    const KYCSchema = new mongoose.Schema({}, { collection: 'lawyerkycs', strict: false });
    return testDb.model('LawyerKYC', KYCSchema);
  } catch (err) {
    console.error('Error creating KYC model:', err);
    throw err;
  }
};

// Test route to verify KYC routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'KYC routes are working!' });
});

// GET /api/kyc - Get all KYC requests
router.get('/', async (req, res) => {
  try {
    console.log('GET /api/kyc - Request received');
    const {
      page = 1,
      limit = 20,
      status = '',
      sortBy = 'submittedAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const KYC = getKYCModel();
    console.log('KYC Model retrieved, querying database...');

    const query = {};
    if (status) {
      query.status = status;
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [kycs, total] = await Promise.all([
      KYC.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      KYC.countDocuments(query)
    ]);

    console.log(`Found ${kycs.length} KYC requests, total: ${total}`);

    res.json({
      kycs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('GET /api/kyc error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/kyc/:id/accept - Accept KYC request
router.put('/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid KYC ID format' });
    }

    const KYC = getKYCModel();

    const kyc = await KYC.findByIdAndUpdate(
      id,
      { 
        $set: { 
          status: 'accepted',
          updatedAt: new Date()
        }
      },
      { new: true }
    ).lean();

    if (!kyc) {
      return res.status(404).json({ message: 'KYC request not found' });
    }

    res.json({
      success: true,
      message: 'KYC accepted successfully',
      data: { kyc }
    });
  } catch (err) {
    console.error('PUT /api/kyc/:id/accept error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/kyc/:id/reject - Reject KYC request
router.put('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid KYC ID format' });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const KYC = getKYCModel();

    const kyc = await KYC.findByIdAndUpdate(
      id,
      { 
        $set: { 
          status: 'rejected',
          rejectionReason: reason.trim(),
          updatedAt: new Date()
        }
      },
      { new: true }
    ).lean();

    if (!kyc) {
      return res.status(404).json({ message: 'KYC request not found' });
    }

    res.json({
      success: true,
      message: 'KYC rejected successfully',
      data: { kyc }
    });
  } catch (err) {
    console.error('PUT /api/kyc/:id/reject error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;

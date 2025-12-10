const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// GET /api/users/regular - Get all regular users
router.get('/regular', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search = '',
      role = '' // filter by isAdmin
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = {};
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { fullName: searchRegex },
        { username: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    // Role filter
    if (role === 'admin') {
      query.isAdmin = true;
    } else if (role === 'user') {
      query.isAdmin = false;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get users and total count
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -__v')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query)
    ]);

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('GET /api/users/regular error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/users/lawyers - Get all lawyer users from test.lawyers collection
router.get('/lawyers', async (req, res) => {
  try {
    // Connect to test database for lawyers
    const testDb = mongoose.connection.useDb('test');
    
    // Define Lawyer schema for test database - collection name is 'lawyers'
    const LawyerSchema = new mongoose.Schema({
      email: String,
      password: String,
      name: String,
      bio: String,
      practiceAreas: [String],
      experienceYears: Number,
      phone: String,
      officeAddress: String,
      languages: [String],
      role: String,
      createdAt: Date
    }, { collection: 'lawyers', strict: false });
    
    const LawyerModel = testDb.model('Lawyer', LawyerSchema);

    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search = '',
      role = '', // filter by role
      experience = '' // filter by experience years
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = {};
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { officeAddress: searchRegex },
        { practiceAreas: { $in: [searchRegex] } }
      ];
    }

    // Role filter
    if (role) {
      query.role = role;
    }

    // Experience filter
    if (experience) {
      const expNum = parseInt(experience);
      if (!isNaN(expNum)) {
        query.experienceYears = { $gte: expNum };
      }
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get lawyers and total count
    const [lawyers, total] = await Promise.all([
      LawyerModel.find(query)
        .select('-password -__v')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      LawyerModel.countDocuments(query)
    ]);

    res.json({
      users: lawyers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('GET /api/users/lawyers error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/users/regular/:id - Delete a regular user
router.delete('/regular/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('DELETE /api/users/regular/:id - ID:', id);
    
    if (!isValidObjectId(id)) {
      console.log('Invalid ObjectId format:', id);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      console.log('User not found with ID:', id);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('User deleted successfully:', id);
    res.json({ message: 'User deleted successfully', userId: id });
  } catch (err) {
    console.error('DELETE /api/users/regular/:id error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/users/regular/:id - Update a regular user
router.put('/regular/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('PUT /api/users/regular/:id - ID:', id, 'Body:', req.body);
    
    if (!isValidObjectId(id)) {
      console.log('Invalid ObjectId format:', id);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    const { fullName, username, email, phone, isAdmin } = req.body;
    
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (isAdmin !== undefined) updateData.isAdmin = isAdmin;
    
    const user = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -__v');
    
    if (!user) {
      console.log('User not found with ID:', id);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('User updated successfully:', id);
    res.json({ message: 'User updated successfully', user });
  } catch (err) {
    console.error('PUT /api/users/regular/:id error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', error: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/users/lawyers/:id - Delete a lawyer user
router.delete('/lawyers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('DELETE /api/users/lawyers/:id - ID:', id);
    
    if (!isValidObjectId(id)) {
      console.log('Invalid ObjectId format:', id);
      return res.status(400).json({ message: 'Invalid lawyer ID format' });
    }
    
    const testDb = mongoose.connection.useDb('test');
    const LawyerSchema = new mongoose.Schema({}, { collection: 'lawyers', strict: false });
    const LawyerModel = testDb.model('Lawyer', LawyerSchema);
    
    const lawyer = await LawyerModel.findByIdAndDelete(id);
    
    if (!lawyer) {
      console.log('Lawyer not found with ID:', id);
      return res.status(404).json({ message: 'Lawyer not found' });
    }
    
    console.log('Lawyer deleted successfully:', id);
    res.json({ message: 'Lawyer deleted successfully', userId: id });
  } catch (err) {
    console.error('DELETE /api/users/lawyers/:id error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/users/lawyers/:id - Update a lawyer user
router.put('/lawyers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('PUT /api/users/lawyers/:id - ID:', id, 'Body:', req.body);
    
    if (!isValidObjectId(id)) {
      console.log('Invalid ObjectId format:', id);
      return res.status(400).json({ message: 'Invalid lawyer ID format' });
    }
    
    const { name, email, phone, bio, practiceAreas, officeAddress, role } = req.body;
    
    const testDb = mongoose.connection.useDb('test');
    const LawyerSchema = new mongoose.Schema({}, { collection: 'lawyers', strict: false });
    const LawyerModel = testDb.model('Lawyer', LawyerSchema);
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;
    if (practiceAreas !== undefined) updateData.practiceAreas = practiceAreas;
    if (officeAddress !== undefined) updateData.officeAddress = officeAddress;
    if (role !== undefined) updateData.role = role;
    
    const lawyer = await LawyerModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -__v');
    
    if (!lawyer) {
      console.log('Lawyer not found with ID:', id);
      return res.status(404).json({ message: 'Lawyer not found' });
    }
    
    console.log('Lawyer updated successfully:', id);
    res.json({ message: 'Lawyer updated successfully', user: lawyer });
  } catch (err) {
    console.error('PUT /api/users/lawyers/:id error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', error: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;

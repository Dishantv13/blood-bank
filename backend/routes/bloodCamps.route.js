import { Router } from 'express';
import jwt from 'jsonwebtoken';
import BloodBank from '../models/BloodBank.model.js';
import { auth } from '../middleware/auth.js';
import {
  getAllCamps,
  getCampById,
  createCamp,
  updateCamp,
  deleteCamp,
  registerCamp,
  exportRegistrations,
  getMyCamps,
  updateCollectedUnits,
  cleanupRegistrations,
  fixRegistrations
} from '../controller/bloodCamps.controller.js';

const router = Router();

// Middleware to protect blood bank routes
const protectBloodBank = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.type !== 'bloodbank') {
        return res.status(401).json({ message: 'Not authorized as blood bank' });
      }
      
      // Use bloodBankId from token (new format)
      const bloodBankId = decoded.bloodBankId || decoded.id;
      req.bloodBank = await BloodBank.findById(bloodBankId).select('-password');
      
      if (!req.bloodBank) {
        return res.status(401).json({ message: 'Blood bank not found' });
      }
      
      next();
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// @route   GET /api/blood-camps
// @desc    Get all blood camps
// @access  Public
router.route('/').get(getAllCamps);

// @route   POST /api/blood-camps/cleanup-registrations
// @desc    Remove invalid registrations (fake/empty data)
// @access  Private (Admin/Development only)
router.route('/cleanup-registrations').post(cleanupRegistrations);

// @route   POST /api/blood-camps/fix-registrations
// @desc    Fix empty registration data by populating from User collection
// @access  Private (Admin/Development only)
router.route('/fix-registrations').post(fixRegistrations);

// @route   GET /api/blood-camps/:id/export-registrations
// @desc    Export registered users for a blood camp to Excel
// @access  Private (Blood Bank - owner only)
router.route('/:id/export-registrations').get(protectBloodBank, exportRegistrations);

// @route   GET /api/blood-camps/my-camps
// @desc    Get camps organized by the logged in blood bank
// @access  Private (Blood Bank)
router.route('/my-camps').get(protectBloodBank, getMyCamps);

// @route   GET /api/blood-camps/:id
// @desc    Get blood camp by ID
// @access  Public
router.route('/:id').get(getCampById);

// @route   POST /api/blood-camps
// @desc    Create a new blood camp
// @access  Private (Blood Bank)
router.route('/').post(protectBloodBank, createCamp);

// @route   PUT /api/blood-camps/:id
// @desc    Update a blood camp
// @access  Private (Blood Bank - owner only)
router.route('/:id').put(protectBloodBank, updateCamp);

// @route   DELETE /api/blood-camps/:id
// @desc    Delete a blood camp
// @access  Private (Blood Bank - owner only)
router.route('/:id').delete(protectBloodBank, deleteCamp);

// @route   POST /api/blood-camps/:id/register
// @desc    Register for a blood camp
// @access  Private (User)
router.route('/:id/register').post(auth, registerCamp);

// @route   PUT /api/blood-camps/:id/collected
// @desc    Update collected units for a camp
// @access  Private (Blood Bank - owner only)
router.route('/:id/collected').put(protectBloodBank, updateCollectedUnits);

export default router;

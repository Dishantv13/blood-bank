import { Router } from 'express';
import jwt from 'jsonwebtoken';
import BloodBank from '../models/BloodBank.model.js';
import { auth } from '../middleware/auth.js';
import {
  submitHealthForm,
  getMyForms,
  getLatestForm,
  checkEligibility,
  getAllForms,
  getFormById,
  reviewForm,
  updateForm
} from '../controller/donorHealth.controller.js';

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
      
      req.bloodBank = await BloodBank.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// @route   POST /api/donor-health
// @desc    Submit a donor health form
// @access  Private (User)
router.route('/').post(auth, submitHealthForm);

// @route   GET /api/donor-health/my-forms
// @desc    Get donor's health forms
// @access  Private (User)
router.route('/my-forms').get(auth, getMyForms);

// @route   GET /api/donor-health/latest
// @desc    Get donor's latest health form
// @access  Private (User)
router.route('/latest').get(auth, getLatestForm);

// @route   GET /api/donor-health/eligibility
// @desc    Check donor eligibility
// @access  Private (User)
router.route('/eligibility').get(auth, checkEligibility);

// @route   GET /api/donor-health
// @desc    Get all health forms (for blood bank review)
// @access  Private (Blood Bank)
router.route('/').get(protectBloodBank, getAllForms);

// @route   GET /api/donor-health/:id
// @desc    Get health form by ID
// @access  Private (Blood Bank)
router.route('/:id').get(protectBloodBank, getFormById);

// @route   PUT /api/donor-health/:id/review
// @desc    Review a health form
// @access  Private (Blood Bank)
router.route('/:id/review').put(protectBloodBank, reviewForm);

// @route   PUT /api/donor-health/:id
// @desc    Update a health form (by donor)
// @access  Private (User)
router.route('/:id').put(auth, updateForm);

export default router;

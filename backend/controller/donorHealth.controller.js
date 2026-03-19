import DonorHealth from '../models/DonorHealth.model.js';
import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse, errorResponse } from '../utils/response.js';

// Submit a donor health form
const submitHealthForm = asyncHandler(async (req, res) => {
    const {
      fullName,
      dateOfBirth,
      gender,
      bloodGroup,
      weight,
      phone,
      email,
      address,
      city,
      medicalConditions,
      recentActivities,
      currentHealth,
      lifestyle,
      donationHistory,
      consent
    } = req.body;

    // Validate consent
    if (!consent.informationAccurate || !consent.consentToDonate || !consent.understandsProcess) {
      return res.status(400).json({ message: 'All consent fields must be accepted' });
    }

    // Check for existing pending form
    const existingForm = await DonorHealth.findOne({
      donor: req.user._id,
      status: 'pending'
    });

    if (existingForm) {
      return res.status(400).json({ 
        message: 'You already have a pending health form. Please wait for review.' 
      });
    }

    // Create new health form
    const healthForm = new DonorHealth({
      donor: req.user._id,
      fullName,
      dateOfBirth,
      gender,
      bloodGroup,
      weight,
      phone,
      email,
      address,
      city,
      medicalConditions,
      recentActivities,
      currentHealth,
      lifestyle,
      donationHistory,
      consent
    });

    await healthForm.save();

    res.status(201).json({
      message: 'Health form submitted successfully',
      healthForm: {
        id: healthForm._id,
        eligibility: healthForm.eligibility,
        status: healthForm.status
      }
    });
});

// Get donor's health forms
const getMyForms = asyncHandler(async (req, res) => {
    const forms = await DonorHealth.find({ donor: req.user._id })
      .sort({ submittedAt: -1 });
    
    res.json(forms);
});

// Get donor's latest health form
const getLatestForm = asyncHandler(async (req, res) => {
    const form = await DonorHealth.findOne({ donor: req.user._id })
      .sort({ submittedAt: -1 });
    
    if (!form) {
      return res.status(404).json({ message: 'No health form found' });
    }
    
    res.json(form);
});

// Check donor eligibility
const checkEligibility = asyncHandler(async (req, res) => {
    const form = await DonorHealth.findOne({ donor: req.user._id })
      .sort({ submittedAt: -1 });
    
    if (!form) {
      return res.json({ 
        hasForm: false,
        message: 'Please complete the health form first' 
      });
    }
    
    res.json({
      hasForm: true,
      isEligible: form.eligibility.isEligible,
      reasons: form.eligibility.reasonsForIneligibility,
      status: form.status,
      submittedAt: form.submittedAt
    });
});

// Get all health forms (for blood bank review)
const getAllForms = asyncHandler(async (req, res) => {
    const { status, isEligible } = req.query;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (isEligible !== undefined) {
      query['eligibility.isEligible'] = isEligible === 'true';
    }
    
    const forms = await DonorHealth.find(query)
      .populate('donor', 'name email phone')
      .sort({ submittedAt: -1 });
    
    res.json(forms);
});

// Get health form by ID
const getFormById = asyncHandler(async (req, res) => {
  const form = await DonorHealth.findById(req.params.id)
      .populate('donor', 'name email phone');
    
    if (!form) {
      return res.status(404).json({ message: 'Health form not found' });
    }
    
    res.json(form);
});

// Review a health form
const reviewForm = asyncHandler(async (req, res) => {
  const { status, reviewNotes } = req.body;
    
    const form = await DonorHealth.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({ message: 'Health form not found' });
    }
    
    form.status = status;
    form.reviewNotes = reviewNotes;
    form.reviewedBy = req.bloodBank._id;
    form.reviewedAt = Date.now();
    
    await form.save();
    
    res.json({
      message: 'Health form reviewed successfully',
      form
    });
});

// Update a health form (by donor)
const updateForm = asyncHandler(async (req, res) => {
  const form = await DonorHealth.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({ message: 'Health form not found' });
    }
    
    // Check if the form belongs to this user
    if (form.donor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Only allow updates if status is pending or requires_review
    if (!['pending', 'requires_review'].includes(form.status)) {
      return res.status(400).json({ 
        message: 'Cannot update a form that has been approved or rejected' 
      });
    }
    
    // Update fields
    const updateFields = [
      'fullName', 'dateOfBirth', 'gender', 'bloodGroup', 'weight',
      'phone', 'email', 'address', 'city',
      'medicalConditions', 'recentActivities', 'currentHealth',
      'lifestyle', 'donationHistory', 'consent'
    ];
    
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        form[field] = req.body[field];
      }
    });
    
    form.status = 'pending'; // Reset to pending after update
    
    await form.save();
    
    res.json({
      message: 'Health form updated successfully',
      form
    });
});


export {
  submitHealthForm,
  getMyForms,
  getLatestForm,
  checkEligibility,
  getAllForms,
  getFormById,
  reviewForm,
  updateForm
}
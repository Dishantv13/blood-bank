import BloodRequest from '../models/BloodRequest.model.js';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse, errorResponse } from '../utils/response.js';

// Get all blood requests
const getAllRequests = asyncHandler(async (req, res) => {
  const { status, bloodGroup } = req.query;
    
    let query = { requestType: 'user' };
    if (status) query.status = status;
    if (bloodGroup) query.bloodGroup = bloodGroup;

    const requests = await BloodRequest.find(query)
      .populate('requestedBy', 'name email phone')
      .sort({ createdAt: -1 });

    successResponse(res, requests, 200, 'All blood requests fetched successfully');
});

// Get user's blood requests
const getMyRequests = asyncHandler(async (req, res) => {
  const requests = await BloodRequest.find({ requestedBy: req.user.userId, requestType: 'user' })
      .sort({ createdAt: -1 });
    successResponse(res, requests, 200, 'My blood requests fetched successfully');
});

// Create a new blood request
const createRequest = asyncHandler(async (req, res) => {
  const { patientName, bloodGroup, units, urgency, hospital, contactNumber, requiredBy, description } = req.body;

    // Validation
    if (!patientName || !bloodGroup || !units || !contactNumber) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['patientName', 'bloodGroup', 'units', 'contactNumber'],
        received: { patientName: !!patientName, bloodGroup: !!bloodGroup, units: !!units, contactNumber: !!contactNumber }
      });
    }

    // Set default requiredBy if not provided (7 days from now)
    const requestDate = requiredBy ? new Date(requiredBy) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const bloodRequest = new BloodRequest({
      requestType: 'user',
      requestedBy: req.user.userId,
      patientName,
      bloodGroup,
      units: parseInt(units),
      urgency: urgency || 'normal',
      hospital: hospital || { name: '', address: '' },
      contactNumber,
      requiredBy: requestDate,
      description: description || ''
    });

    await bloodRequest.save();
    
    // Populate the requester info
    await bloodRequest.populate('requestedBy', 'name email phone');
    
    res.status(201).json({ 
      success: true,
      message: 'Blood request created successfully', 
      request: bloodRequest 
    });
});

// Update blood request status
const updateRequest = asyncHandler(async (req, res) => {
    const { status } = req.body;
    
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.requestType !== 'user') {
      return res.status(403).json({ message: 'Not authorized to modify this request' });
    }

    request.status = status;
    await request.save();

    res.json({ message: 'Request updated successfully', request });
});

// Update blood request status (for users to cancel OR blood banks to approve/decline)
const updateRequestStatus = asyncHandler(async (req, res) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { status } = req.body;
    
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.requestType !== 'user') {
      return res.status(403).json({ message: 'Not authorized to modify this request' });
    }

    // If blood bank, allow approve/decline
    if (decoded.type === 'bloodbank') {
      if (!['approved', 'declined'].includes(status)) {
        return res.status(400).json({ message: 'Blood banks can only approve or decline requests' });
      }
      
      request.status = status;
      await request.save();
      
      return res.json({ message: `Request ${status} successfully`, request });
    }
    
    // If user, verify ownership and allow cancellation
    if (request.requestedBy.toString() !== decoded.userId) {
      return res.status(403).json({ message: 'Not authorized to modify this request' });
    }

    if (status === 'cancelled' && request.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending requests can be cancelled' });
    }

    request.status = status;
    await request.save();
    
    res.json({ message: 'Request status updated successfully', request });
});


export {
  getAllRequests,
  getMyRequests,
  createRequest,
  updateRequest,
  updateRequestStatus
}

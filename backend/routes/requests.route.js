import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { requestCreationLimiter } from '../middleware/rateLimiter.js';
import {
  getAllRequests,
  getMyRequests,
  createRequest,
  updateRequest,
  updateRequestStatus
} from '../controller/request.controller.js';

const router = Router();

// @route   GET /api/requests
// @desc    Get all blood requests
// @access  Public
router.route('/').get(getAllRequests);

// @route   GET /api/requests/my-requests
// @desc    Get user's blood requests
// @access  Private
router.route('/my-requests').get(auth, getMyRequests);

// @route   POST /api/requests
// @desc    Create a new blood request
// @access  Private
router.route('/').post(auth, requestCreationLimiter, createRequest);

// @route   PUT /api/requests/:id
// @desc    Update blood request status
// @access  Private
router.route('/:id').put(auth, updateRequest);

// @route   PATCH /api/requests/:id/status
// @desc    Update blood request status (for users to cancel OR blood banks to approve/decline)
// @access  Private (User or Blood Bank)
router.route('/:id/status').patch(auth, updateRequestStatus);

export default router;

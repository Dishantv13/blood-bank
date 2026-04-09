import { validationResult } from 'express-validator';
import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse } from '../utils/response.js';
import { clearCacheByPrefix } from '../middleware/cache.js';
import * as bloodCampService from '../services/bloodCampService.js';

// Get all blood camps
export const getAllCamps = asyncHandler(async (req, res) => {
  const result = await bloodCampService.getAllCamps(req.query);
  successResponse(res, result, 200, 'Blood camps fetched successfully');
});

// Get blood camp by ID
export const getCampById = asyncHandler(async (req, res) => {
  const result = await bloodCampService.getCampById(req.params.id);
  successResponse(res, result, 200, 'Blood camp fetched successfully');
});

// Create a new blood camp
export const createCamp = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await bloodCampService.createCamp(req.bloodBank, req.body);
    clearCacheByPrefix('/api/blood-camps');
    successResponse(res, result, 201, 'Blood camp created successfully');
});

// Update a blood camp
export const updateCamp = asyncHandler(async (req, res) => {
  const result = await bloodCampService.updateCamp(req.params.id, req.bloodBank._id, req.body);
  clearCacheByPrefix('/api/blood-camps');
  successResponse(res, result, 200, 'Blood camp updated successfully');
});

// Delete a blood camp
export const deleteCamp = asyncHandler(async (req, res) => {
  await bloodCampService.deleteCamp(req.params.id, req.bloodBank._id);
  clearCacheByPrefix('/api/blood-camps');
  successResponse(res, null, 200, 'Blood camp deleted successfully');
});

// Register for a blood camp
export const registerCamp = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await bloodCampService.registerCamp(req.params.id, userId);
  clearCacheByPrefix('/api/blood-camps');
  successResponse(res, result, 200, 'Successfully registered for blood camp');
});

// Export registered users for a blood camp to Excel
export const exportRegistrations = asyncHandler(async (req, res) => {
    const result = await bloodCampService.exportRegistrations(req.params.id, req.bloodBank._id);
    res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(result.buffer);
});

// Get camps organized by the logged in blood bank
export const getMyCamps = asyncHandler(async (req, res) => {
  const result = await bloodCampService.getMyCamps(req.bloodBank._id);
  successResponse(res, result, 200, 'My camps fetched successfully');
});

// Update collected units for a camp
export const updateCollectedUnits = asyncHandler(async (req, res) => {
  const result = await bloodCampService.updateCollectedUnits(req.params.id, req.bloodBank._id, req.body.collectedUnits);
  clearCacheByPrefix('/api/blood-camps');
  successResponse(res, result, 200, 'Collected units updated');
});

// Remove invalid registrations
export const cleanupRegistrations = asyncHandler(async (req, res) => {
    const result = await bloodCampService.cleanupRegistrations();
    successResponse(res, result, 200, 'Cleanup completed');
});

// Fix empty registration data by populating from User collection
export const fixRegistrations = asyncHandler(async (req, res) => {
    const result = await bloodCampService.fixRegistrations();
    successResponse(res, result, 200, 'Registration data fix completed');
});

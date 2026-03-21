import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse } from '../utils/response.js';
import { clearCacheByPrefix } from '../middleware/cache.js';
import * as eventService from '../services/eventService.js';

// Get all upcoming events (all visibilities - filtering done on frontend)
const getAllEvents = asyncHandler(async (req, res) => {
  const result = await eventService.getAllEvents(req.query);
  successResponse(res, result, 200, 'Events fetched successfully');
});

// Create a new event
const createEvent = asyncHandler(async (req, res) => {
  const result = await eventService.createEvent(req.body);
  clearCacheByPrefix('/api/events');
  successResponse(res, result, 201, 'Event created successfully');
});

// Register for an event
const registerEvent = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await eventService.registerEvent(req.params.id, userId);
  clearCacheByPrefix('/api/events');
  successResponse(res, result, 200, 'Registered successfully');
});

// Delete an event
const deleteEvent = asyncHandler(async (req, res) => {
  await eventService.deleteEvent(req.params.id);
  clearCacheByPrefix('/api/events');
  successResponse(res, null, 200, 'Event deleted successfully');
});


export {
  getAllEvents,
  createEvent,
  registerEvent,
  deleteEvent
}
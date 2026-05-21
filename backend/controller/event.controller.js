import { asyncHandler } from "../utils/asynchandler.js";
import { successResponse } from "../utils/response.js";
import { HTTPS_CODE } from "../utils/httpsCode.js";
import { clearCacheByPrefix } from "../middleware/cache.js";
import * as eventService from "../services/eventService.js";
import { ensureValid } from "../middleware/validateRequest.js";

// Get all upcoming events (all visibilities - filtering done on frontend)
export const getAllEvents = asyncHandler(async (req, res) => {
  const result = await eventService.getAllEvents(req.query);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Events fetched successfully");
});

// Create a new event
export const createEvent = asyncHandler(async (req, res) => {
  ensureValid(req);
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await eventService.createEvent(userId, req.body);
  await clearCacheByPrefix("/api/v1/events");
  successResponse(res, result, HTTPS_CODE.CREATED, "Event created successfully");
});

// Register for an event
export const registerEvent = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await eventService.registerEvent(req.params.id, userId);
  await clearCacheByPrefix("/api/v1/events");
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Registered successfully");
});

// Delete an event
export const deleteEvent = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  await eventService.deleteEvent(req.params.id, userId);
  await clearCacheByPrefix("/api/v1/events");
  successResponse(res, null, HTTPS_CODE.OK_SUCCESS, "Event deleted successfully");
});

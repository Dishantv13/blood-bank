import eventRepository from "../repositories/EventRepository.js";
import userRepository from "../repositories/UserRepository.js";
import cacheManager from "../utils/cacheManager.js";
import { ApiError } from "../utils/apiError.js";
import { HTTPS_CODE } from "../utils/httpsCode.js";
import * as pagination from "../utils/pagination.js";
import * as notificationService from "./notificationService.js";

const EVENTS_CACHE_TTL_SECONDS = 120; // 2 minutes
const CACHE_KEYS = {
  EVENTS: "events",
};

const getCachedEvents = async (key) => {
  return cacheManager.get(`${CACHE_KEYS.EVENTS}:${key}`);
};

const setCachedEvents = async (key, payload) => {
  return cacheManager.set(
    `${CACHE_KEYS.EVENTS}:${key}`,
    payload,
    EVENTS_CACHE_TTL_SECONDS,
  );
};

export const invalidateEventsCache = async () => {
  return cacheManager.invalidatePattern(`${CACHE_KEYS.EVENTS}:*`);
};

export const getAllEvents = async (query) => {
  const { latitude, longitude, maxDistance, search } = query;
  const { page, limit, skip } = pagination.getPaginationParams({ query });
  const cacheKey = JSON.stringify({ query, page, limit });
  const cached = await getCachedEvents(cacheKey);
  if (cached) return cached;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const baseFilter = { isActive: true, date: { $gte: startOfToday } };

  if (search) {
    baseFilter.title = { $regex: search, $options: "i" };
  }

  // Use the new optimized aggregation search
  const { data: events, total } = await eventRepository.searchEvents(
    baseFilter,
    {
      latitude,
      longitude,
      maxDistance: maxDistance ? parseInt(maxDistance, 10) : 50000,
      skip,
      limit,
    },
  );

  const response = pagination.buildPaginatedResponse(events, total, page, limit);
  await setCachedEvents(cacheKey, response);
  return response;
};

export const createEvent = async (userId, data) => {
  const organizer = await userRepository.findById(userId, {
    select: "name role",
  });
  if (!organizer) {
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "Organizer not found");
  }

  const event = await eventRepository.create({
    ...data,
    organizer: organizer.name,
    organizedBy: organizer._id,
    organizerModel: "User",
  });
  await invalidateEventsCache();

  // Notify all users about the new event
  notificationService.broadcastNotification({
    title: "New Blood Donation Event",
    message: `${organizer?.name || "A user"} has organized a new event: ${event.title}. Check it out!`,
    type: "event",
    actionUrl: "/events",
  }).catch((err) =>
    console.error("Broadcast notification for event failed:", err),
  );

  return event;
};

export const registerEvent = async (eventId, userId) => {
  const [event, user] = await Promise.all([
    eventRepository.findById(eventId, { lean: false }),
    userRepository.findById(userId, { select: "name email" }),
  ]);

  if (!event) throw new ApiError(HTTPS_CODE.NOT_FOUND, "Event not found");
  if (!user) throw new ApiError(HTTPS_CODE.NOT_FOUND, "User not found");

  if (
    event.registeredDonors.some(
      (id) => id && id.toString() === userId.toString(),
    )
  ) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Already registered for this event");
  }

  event.registeredDonors.push(userId);
  await event.save();

  // Invalidate cache so the next getAllEvents call gets fresh data
  await invalidateEventsCache();

  // Create in-app notification
  notificationService.createNotification({
    recipient: user._id,
    recipientModel: "User",
    title: "Event Registration Confirmed",
    message: `You have successfully registered for the event: ${event.title}.`,
    type: "event",
    actionUrl: "/dashboard",
  }).catch((err) => console.error("In-app notification failed:", err));

  return event;
};

export const deleteEvent = async (eventId, userId) => {
  const event = await eventRepository.findById(eventId);
  if (!event) throw new ApiError(HTTPS_CODE.NOT_FOUND, "Event not found");
  if (String(event.organizedBy) !== String(userId)) {
    throw new ApiError(HTTPS_CODE.FORBIDDEN, "Not authorized to delete this event");
  }

  await eventRepository.deleteOne({ _id: eventId });
  await invalidateEventsCache();
  return { success: true };
};

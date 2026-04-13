import Event from '../models/Event.model.js';
import User from '../models/User.model.js';
import { ApiError } from '../utils/apiError.js';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';
import { sendRegistrationConfirmationEmail } from '../utils/emailService.js';
import { createNotification, broadcastNotification } from './notificationService.js';
import BloodBank from '../models/BloodBank.model.js';

const EVENT_LIST_FIELDS = '_id title description organizer eventType location date startTime endTime contactInfo expectedDonors isActive visibility maxParticipants registeredDonors';

const EVENTS_CACHE_TTL_MS = 2 * 60 * 1000;
const eventsCache = new Map();

const getCachedEvents = (key) => {
  const cached = eventsCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    eventsCache.delete(key);
    return null;
  }
  return cached.payload;
};

const setCachedEvents = (key, payload) => {
  eventsCache.set(key, {
    payload,
    expiresAt: Date.now() + EVENTS_CACHE_TTL_MS,
  });
};

export const invalidateEventsCache = () => {
  eventsCache.clear();
};

export const getAllEvents = async (query) => {
  const { latitude, longitude, maxDistance } = query;
  const { page, limit, skip } = getPaginationParams({ query });
  const cacheKey = JSON.stringify({ query, page, limit });
  const cached = getCachedEvents(cacheKey);
  if (cached) return cached;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const baseFilter = { isActive: true, date: { $gte: startOfToday } };

  // Geo-filtered queries: $near is incompatible with countDocuments;
  // return a single bounded result page without total count.
  if (latitude && longitude) {
    const geoFilter = {
      ...baseFilter,
      'location.coordinates.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
          $maxDistance: maxDistance ? parseInt(maxDistance, 10) : 50000
        }
      }
    };
    const events = await Event.find(geoFilter)
      .select(EVENT_LIST_FIELDS)
      .populate('organizedBy', 'name email phone')
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const response = buildPaginatedResponse(events, events.length, page, limit);
    setCachedEvents(cacheKey, response);
    return response;
  }

  const [events, total] = await Promise.all([
    Event.find(baseFilter)
      .select(EVENT_LIST_FIELDS)
      .populate('organizedBy', 'name email phone')
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Event.countDocuments(baseFilter)
  ]);

  const response = buildPaginatedResponse(events, total, page, limit);
  setCachedEvents(cacheKey, response);
  return response;
};

export const createEvent = async (data) => {
  const event = new Event(data);
  await event.save();
  invalidateEventsCache();

  // Notify all users about the new event
  const bloodBank = await BloodBank.findById(event.organizedBy).select('name').lean();
  broadcastNotification({
    title: 'New Blood Donation Event',
    message: `${bloodBank?.name || 'A blood bank'} has organized a new event: ${event.title}. Check it out!`,
    type: 'event',
    actionUrl: '/events'
  }).catch(err => console.error('Broadcast notification for event failed:', err));

  return event;
};

export const registerEvent = async (eventId, userId) => {
  const [event, user] = await Promise.all([
    Event.findById(eventId),
    User.findById(userId).select('name email')
  ]);
  
  if (!event) throw new ApiError(404, 'Event not found');
  if (!user) throw new ApiError(404, 'User not found');

  if (event.registeredDonors.some((id) => id && id.toString() === userId.toString())) {
    throw new ApiError(400, 'Already registered for this event');
  }

  event.registeredDonors.push(userId);
  await event.save();

  // Send confirmation email (async)
  sendRegistrationConfirmationEmail(user, 'event', event)
    .catch(err => console.error('Event registration email failed:', err));

  // Create in-app notification
  createNotification({
    recipient: user._id,
    recipientModel: 'User',
    title: 'Event Registration Confirmed',
    message: `You have successfully registered for the event: ${event.title}.`,
    type: 'event',
    actionUrl: '/dashboard'
  }).catch(err => console.error('In-app notification failed:', err));

  return event;
};

export const deleteEvent = async (eventId) => {
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, 'Event not found');

  await Event.findByIdAndDelete(eventId);
  invalidateEventsCache();
  return { success: true };
};
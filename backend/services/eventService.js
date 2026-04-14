import eventRepository from '../repositories/EventRepository.js';
import userRepository from '../repositories/UserRepository.js';
import bloodBankRepository from '../repositories/BloodBankRepository.js';
import cacheManager from '../utils/cacheManager.js';
import { ApiError } from '../utils/apiError.js';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';
import { sendRegistrationConfirmationEmail } from '../utils/emailService.js';
import { createNotification, broadcastNotification } from './notificationService.js';

const EVENT_LIST_FIELDS = '_id title description organizer eventType location date startTime endTime contactInfo expectedDonors isActive visibility maxParticipants registeredDonors';

const EVENTS_CACHE_TTL_SECONDS = 120; // 2 minutes
const CACHE_KEYS = {
  EVENTS: 'events'
};

const getCachedEvents = async (key) => {
  return cacheManager.get(`${CACHE_KEYS.EVENTS}:${key}`);
};

const setCachedEvents = async (key, payload) => {
  return cacheManager.set(`${CACHE_KEYS.EVENTS}:${key}`, payload, EVENTS_CACHE_TTL_SECONDS);
};

export const invalidateEventsCache = async () => {
  return cacheManager.invalidatePattern(`${CACHE_KEYS.EVENTS}:*`);
};

export const getAllEvents = async (query) => {
  const { latitude, longitude, maxDistance } = query;
  const { page, limit, skip } = getPaginationParams({ query });
  const cacheKey = JSON.stringify({ query, page, limit });
  const cached = await getCachedEvents(cacheKey);
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
    const events = await eventRepository.find(geoFilter, {
      select: EVENT_LIST_FIELDS,
      populate: { path: 'organizedBy', select: 'name email phone' },
      sort: { date: 1 },
      skip,
      limit
    });
    const response = buildPaginatedResponse(events, events.length, page, limit);
    await setCachedEvents(cacheKey, response);
    return response;
  }

  const [events, total] = await Promise.all([
    eventRepository.find(baseFilter, {
      select: EVENT_LIST_FIELDS,
      populate: { path: 'organizedBy', select: 'name email phone' },
      sort: { date: 1 },
      skip,
      limit
    }),
    eventRepository.count(baseFilter)
  ]);

  const response = buildPaginatedResponse(events, total, page, limit);
  await setCachedEvents(cacheKey, response);
  return response;
};

export const createEvent = async (data) => {
  const event = await eventRepository.create(data);
  await invalidateEventsCache();

  // Notify all users about the new event
  const bloodBank = await bloodBankRepository.findById(event.organizedBy, { select: 'name' });
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
    eventRepository.findById(eventId, { lean: false }),
    userRepository.findById(userId, { select: 'name email' })
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
  const event = await eventRepository.findById(eventId);
  if (!event) throw new ApiError(404, 'Event not found');

  await eventRepository.deleteOne({ _id: eventId });
  await invalidateEventsCache();
  return { success: true };
};
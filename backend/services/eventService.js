import Event from '../models/Event.model.js';
import { ApiError } from '../utils/apiError.js';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';

const EVENT_LIST_FIELDS = '_id title description organizer eventType location date startTime endTime contactInfo expectedDonors isActive visibility maxParticipants registeredDonors';

export const getAllEvents = async (query) => {
  const { latitude, longitude, maxDistance } = query;
  const { page, limit, skip } = getPaginationParams({ query });
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
    return buildPaginatedResponse(events, events.length, page, limit);
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

  return buildPaginatedResponse(events, total, page, limit);
};

export const createEvent = async (data) => {
  const event = new Event(data);
  await event.save();
  return event;
};

export const registerEvent = async (eventId, userId) => {
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, 'Event not found');

  if (event.registeredDonors.some((id) => id && id.toString() === userId.toString())) {
    throw new ApiError(400, 'Already registered for this event');
  }

  event.registeredDonors.push(userId);
  await event.save();
  return event;
};

export const deleteEvent = async (eventId) => {
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, 'Event not found');

  await Event.findByIdAndDelete(eventId);
  return { success: true };
};
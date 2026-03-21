import Event from '../models/Event.model.js';
import { ApiError } from '../utils/apiError.js';

export const getAllEvents = async (query) => {
  const { latitude, longitude, maxDistance } = query;
  const now = new Date();

  if (latitude && longitude) {
    return Event.find({
      isActive: true,
      date: { $gte: now },
      'location.coordinates.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
          $maxDistance: maxDistance ? parseInt(maxDistance, 10) : 50000
        }
      }
    })
      .populate('organizedBy', 'name email phone')
      .sort({ date: 1 })
      .lean();
  }

  return Event.find({ isActive: true, date: { $gte: now } })
    .populate('organizedBy', 'name email phone')
    .sort({ date: 1 })
    .lean();
};

export const createEvent = async (data) => {
  const event = new Event(data);
  await event.save();
  return event;
};

export const registerEvent = async (eventId, userId) => {
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, 'Event not found');

  if (event.registeredDonors.some((id) => id.toString() === userId.toString())) {
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
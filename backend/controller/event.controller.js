import Event from '../models/Event.model.js';
import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse, errorResponse } from '../utils/response.js';

// Get all upcoming events (all visibilities - filtering done on frontend)
const getAllEvents = asyncHandler(async (req, res) => {
  const { latitude, longitude, maxDistance } = req.query;
    const now = new Date();
    // console.log('[Event API] Fetching events. Current time:', now);

    let events;
    if (latitude && longitude) {
      events = await Event.find({
        isActive: true,
        date: { $gte: now },
        'location.coordinates.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            $maxDistance: maxDistance ? parseInt(maxDistance) : 50000
          }
        }
      })
      .populate('organizedBy', 'name email phone')
      .sort({ date: 1 });
    } else {
      // First, let's check all events in the database
      const allEventsInDB = await Event.countDocuments({});
    //   console.log('[Event API] Total events in database:', allEventsInDB);
      
      // Get active events
      const activeEvents = await Event.countDocuments({ isActive: true });
    //   console.log('[Event API] Active events in database:', activeEvents);
      
      // Get events with future dates
      const futureEvents = await Event.countDocuments({ date: { $gte: now } });
    //   console.log('[Event API] Events with future dates:', futureEvents);
      
      // Now fetch the matching events
      events = await Event.find({
        isActive: true,
        date: { $gte: now }
      })
      .populate('organizedBy', 'name email phone')
      .sort({ date: 1 });
      
    //   console.log('[Event API] Returning events count:', events.length);
    //   if (events.length === 0) {
    //     console.log('[Event API] No matching events found!');
    //   } else {
    //     console.log('[Event API] Events:', events.map(e => ({ title: e.title, date: e.date, isActive: e.isActive, visibility: e.visibility })));
    //   }
    }

    successResponse(res, events, 200, 'Events fetched successfully');
});

// Create a new event
const createEvent = asyncHandler(async (req, res) => {
  const event = new Event(req.body);
    await event.save();
    res.status(201).json({ message: 'Event created successfully', event });
});

// Register for an event
const registerEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.registeredDonors.includes(req.user.userId)) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }

    event.registeredDonors.push(req.user.userId);
    await event.save();

    res.json({ message: 'Registered successfully', event });
});

// Delete an event
const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted successfully' });
});


export {
  getAllEvents,
  createEvent,
  registerEvent,
  deleteEvent
}
import BloodRequest from '../models/BloodRequest.model.js';
import User from '../models/User.model.js';
import Notification from '../models/Notification.model.js';
import { ApiError } from '../utils/apiError.js';
import * as smsService from '../utils/smsService.js';

export const broadcastEmergencyRequest = async (requestId, radiusKm = 15) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Blood request not found');

  if (request.urgency !== 'critical' && request.urgency !== 'high' && request.urgency !== 'urgent') {
    return { success: false, message: 'Broadcast only allowed for high urgency requests' };
  }

  // Find center point (request location or bank location)
  const center = request.location?.coordinates?.length === 2 
    ? request.location.coordinates 
    : [0, 0]; // Fallback, though ideally request has location

  const radiusInMeters = radiusKm * 1000;

  // Find nearby available donors of matching blood group
  const nearbyDonors = await User.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: center },
        $maxDistance: radiusInMeters
      }
    },
    bloodGroup: request.bloodGroup,
    isDonor: true,
    isAvailable: true,
    role: { $in: ['user', 'donor'] }
  }).select('_id email name').limit(100);

  if (nearbyDonors.length === 0) {
    return { success: true, count: 0, message: 'No matching donors found in the immediate vicinity' };
  }

  // Create notifications in bulk
  const notifications = nearbyDonors.map(donor => ({
    recipient: donor._id,
    type: 'emergency_blood_request',
    title: '🚨 EMERGENCY BLOOD REQUEST NEARBY',
    message: `A critical request for ${request.bloodGroup} blood has been made at ${request.hospital?.name || 'a nearby hospital'}. Please help if you can!`,
    metadata: {
      requestId: request._id,
      bloodGroup: request.bloodGroup,
      urgency: request.urgency,
      hospital: request.hospital?.name
    }
  }));

  await Notification.insertMany(notifications);

  // Send SMS to nearby donors in parallel (fire and forget with error logging)
  nearbyDonors.forEach(donor => {
    if (donor.phone) {
      smsService.sendEmergencySMS(donor.phone, donor.name, request.bloodGroup, request.hospital?.name)
        .catch(err => console.error(`[BROADCAST] Failed to send emergency SMS to donor ${donor._id}: ${err.message}`));
    }
  });

  console.log(`[BROADCAST] Sent to ${nearbyDonors.length} donors for Request: ${requestId} (${request.bloodGroup})`);

  return {
    success: true,
    count: nearbyDonors.length,
    message: `Broadcast successfully sent to ${nearbyDonors.length} nearby donors`
  };
};

import userRepository from '../repositories/UserRepository.js';
import { createNotification } from './notificationService.js';

const COMPATIBILITY_MAP = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-']
};

export const findMatchingDonors = async (request, options = {}) => {
  const { bloodGroup, hospital } = request;
  const maxDistance = options.maxDistance || 10000; // Default 10km
  const limit = options.limit || 50;

  const compatibleGroups = COMPATIBILITY_MAP[bloodGroup] || [bloodGroup];

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const donors = await userRepository.findMatchingDonors(request, { 
    compatibleGroups, 
    maxDistance, 
    limit,
    threeMonthsAgo 
  });

  return donors;
};

export const notifyMatchingDonors = async (request) => {
  if (request.status !== 'pending') return;

  const donors = await findMatchingDonors(request, { limit: 20 });
  
  if (donors.length === 0) return;

  const notificationPromises = donors.map(donor => 
    createNotification({
      recipient: donor._id,
      recipientModel: 'User',
      title: 'Urgent Blood Match Found!',
      message: `A request for ${request.bloodGroup} blood is needed at ${request.hospital.name}. You are a match!`,
      type: 'request',
      actionUrl: `/requests/${request._id}`
    })
  );

  await Promise.all(notificationPromises);
  
  console.log(`Notified ${donors.length} donors for request ${request._id}`);
  return donors.length;
};

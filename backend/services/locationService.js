import BloodBank from '../models/BloodBank.model.js';
import User from '../models/User.model.js';
import { ApiError } from '../utils/apiError.js';

export const searchBloodAvailability = async ({ 
  latitude, 
  longitude, 
  bloodGroup, 
  radiusKm = 10,
  type = 'all'
}) => {
  if (!latitude || !longitude || !bloodGroup) {
    throw new ApiError(400, 'Latitude, longitude, and blood group are required');
  }

  const radiusInMeters = Number(radiusKm) * 1000;
  const point = {
    type: 'Point',
    coordinates: [parseFloat(longitude), parseFloat(latitude)]
  };

  const results = {
    bloodBanks: [],
    donors: []
  };

  const promises = [];

  if (type === 'all' || type === 'banks') {
    promises.push(
      BloodBank.find({
        location: {
          $near: {
            $geometry: point,
            $maxDistance: radiusInMeters
          }
        },
        approvalStatus: 'approved',
        isActive: true,
        'inventory.bloodGroup': bloodGroup,
        'inventory.units': { $gt: 0 }
      })
      .select('name email phone address inventory location')
      .lean()
      .then(banks => {
        results.bloodBanks = banks.map(bank => ({
          ...bank,
          availableUnits: bank.inventory.find(i => i.bloodGroup === bloodGroup)?.units || 0,
          inventory: undefined, // Don't expose full inventory
          searchDetails: { type: 'bloodbank', distanceInfo: 'Sorted by distance ($near)' }
        }));
      })
    );
  }

  if (type === 'all' || type === 'donors') {
    promises.push(
      User.find({
        location: {
          $near: {
            $geometry: point,
            $maxDistance: radiusInMeters
          }
        },
        bloodGroup,
        isDonor: true,
        isAvailable: true,
        role: { $in: ['user', 'donor'] }
      })
      .select('name email phone bloodGroup location lastDonationDate photoURL')
      .lean()
      .then(donors => {
        results.donors = donors.map(donor => ({
          ...donor,
          searchDetails: { type: 'donor', distanceInfo: 'Sorted by distance ($near)' }
        }));
      })
    );
  }

  await Promise.all(promises);

  return {
    searchCriteria: { latitude, longitude, bloodGroup, radiusKm },
    summary: {
      totalBanks: results.bloodBanks.length,
      totalDonors: results.donors.length
    },
    results: {
      bloodBanks: results.bloodBanks,
      donors: results.donors
    }
  };
};

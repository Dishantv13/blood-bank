import BaseRepository from './BaseRepository.js';
import User from '../models/User.model.js';

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email) {
    return this.findOne({ email });
  }

  async findNearbyDonors(coordinates, radiusInMeters, bloodGroup) {
    return this.model.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates },
          $maxDistance: radiusInMeters
        }
      },
      bloodGroup,
      isDonor: true,
      isAvailable: true,
      role: { $in: ['user', 'donor'] }
    }).select('_id email name').limit(100);
  }

  async findMatchingDonors(request, options = {}) {
    const { hospital, requestedBy } = request;
    const { compatibleGroups, maxDistance, limit, threeMonthsAgo } = options;

    const query = {
      isDonor: true,
      isAvailable: true,
      bloodGroup: { $in: compatibleGroups },
      activeMode: 'donor',
      _id: { $ne: requestedBy },
      $or: [
        { 'donorInfo.lastDonationDate': { $exists: false } },
        { 'donorInfo.lastDonationDate': null },
        { 'donorInfo.lastDonationDate': { $lte: threeMonthsAgo } }
      ]
    };

    if (hospital?.location?.coordinates?.length === 2) {
      return this.model.find({
        ...query,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: hospital.location.coordinates
            },
            $maxDistance: maxDistance
          }
        }
      })
      .select('name email phone bloodGroup location donorInfo')
      .limit(limit)
      .lean();
    }

    return this.model.find(query)
      .select('name email phone bloodGroup location donorInfo')
      .limit(limit)
      .lean();
  }
}

export default new UserRepository();

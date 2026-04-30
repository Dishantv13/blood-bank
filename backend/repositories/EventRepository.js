import BaseRepository from './BaseRepository.js';
import Event from '../models/Event.model.js';

class EventRepository extends BaseRepository {
  constructor() {
    super(Event);
  }

  async findByOrganizer(organizerId, model = 'BloodBank', options = {}) {
    return this.find({ organizedBy: organizerId, organizerModel: model }, options);
  }

  async getEventStats(bloodBankId) {
    return this.aggregate([
      { $match: { organizedBy: new Event.base.Types.ObjectId(bloodBankId), organizerModel: 'BloodBank' } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          upcoming: [{ $match: { date: { $gte: new Date() }, isActive: true } }, { $count: 'count' }],
          totalRegistrations: [{ $unwind: '$registeredDonors' }, { $count: 'count' }]
        }
      }
    ]);
  }
}

export default new EventRepository();

import BaseRepository from './BaseRepository.js';
import BloodRequest from '../models/BloodRequest.model.js';

class RequestRepository extends BaseRepository {
  constructor() {
    super(BloodRequest);
  }

  async findByRequester(userId, options = {}) {
    return this.find({ requestedBy: userId }, options);
  }

  async findForBloodBank(bloodBankId, options = {}) {
    // Legacy mapping or specific complex filters
    return this.find({
      $or: [
        { bloodBank: bloodBankId },
        { targetBloodBank: bloodBankId }
      ]
    }, options);
  }

  async getStatusStats(bloodBankId) {
    return this.aggregate([
      { $match: { targetBloodBank: new BloodRequest.base.Types.ObjectId(bloodBankId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalUnits: { $sum: '$units' }
        }
      }
    ]);
  }

  async getFacetedStats(bloodBankId) {
    const bankId = new BloodRequest.base.Types.ObjectId(bloodBankId);
    return this.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          pending: [{ $match: { status: 'pending' } }, { $count: 'count' }],
          approved: [{ $match: { bloodBank: bankId, status: 'approved' } }, { $count: 'count' }],
          rejected: [{ $match: { bloodBank: bankId, status: 'rejected' } }, { $count: 'count' }],
          byBloodGroup: [{ $match: { status: 'pending' } }, { $group: { _id: '$bloodGroup', count: { $sum: 1 } } }],
          byUrgency: [{ $match: { status: 'pending' } }, { $group: { _id: '$urgency', count: { $sum: 1 } } }]
        }
      }
    ]);
  }

  async getDashboardStats(bloodBankId) {
    const bankId = new BloodRequest.base.Types.ObjectId(bloodBankId);
    return this.aggregate([
      {
        $facet: {
          pending: [{ $match: { status: 'pending' } }, { $count: 'count' }],
          approved: [{ $match: { bloodBank: bankId, status: 'approved' } }, { $count: 'count' }],
          thisMonth: [
            { $match: { bloodBank: bankId, createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } },
            { $count: 'count' }
          ]
        }
      }
    ]);
  }
}

export default new RequestRepository();

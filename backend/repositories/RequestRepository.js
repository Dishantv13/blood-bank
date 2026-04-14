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
}

export default new RequestRepository();

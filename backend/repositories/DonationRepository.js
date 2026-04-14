import BaseRepository from './BaseRepository.js';
import Donation from '../models/Donation.model.js';

class DonationRepository extends BaseRepository {
  constructor() {
    super(Donation);
  }

  async findByDonor(donorId, options = {}) {
    return this.find({ donor: donorId }, options);
  }

  async findByBloodBank(bloodBankId, options = {}) {
    return this.find({ bloodBank: bloodBankId }, options);
  }

  async countByDonor(donorId) {
    return this.count({ donor: donorId });
  }

  async countByBloodBank(bloodBankId) {
    return this.count({ bloodBank: bloodBankId });
  }
}

export default new DonationRepository();

import BaseRepository from './BaseRepository.js';
import BloodBankRegistrationOtp from '../models/BloodBankRegistrationOtp.model.js';

class BloodBankRegistrationOtpRepository extends BaseRepository {
  constructor() {
    super(BloodBankRegistrationOtp);
  }

  async findByVerificationId(verificationId, options = {}) {
    return this.findOne({ verificationId }, options);
  }

  async findPendingByEmail(email, options = {}) {
    const now = new Date();
    return this.findOne({
      email,
      status: 'pending',
      expiresAt: { $gt: now }
    }, options);
  }
}

export default new BloodBankRegistrationOtpRepository();

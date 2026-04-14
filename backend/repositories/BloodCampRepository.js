import BaseRepository from './BaseRepository.js';
import BloodCamp from '../models/BloodCamp.model.js';

class BloodCampRepository extends BaseRepository {
  constructor() {
    super(BloodCamp);
  }

  async findByOrganizer(bloodBankId, options = {}) {
    return this.find({ organizer: bloodBankId }, options);
  }
}

export default new BloodCampRepository();

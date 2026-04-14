import BaseRepository from './BaseRepository.js';
import AdminAuthState from '../models/AdminAuthState.model.js';

class AdminAuthStateRepository extends BaseRepository {
  constructor() {
    super(AdminAuthState);
  }

  async findByEmail(email) {
    return this.findOne({ email });
  }
}

export default new AdminAuthStateRepository();

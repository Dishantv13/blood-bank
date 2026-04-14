import BaseRepository from './BaseRepository.js';
import Event from '../models/Event.model.js';

class EventRepository extends BaseRepository {
  constructor() {
    super(Event);
  }

  async findByOrganizer(organizerId, model = 'BloodBank', options = {}) {
    return this.find({ organizedBy: organizerId, organizerModel: model }, options);
  }
}

export default new EventRepository();

import BaseRepository from './BaseRepository.js';
import Notification from '../models/Notification.model.js';

class NotificationRepository extends BaseRepository {
  constructor() {
    super(Notification);
  }

  async findByRecipient(recipientId, options = {}) {
    return this.find({ recipient: recipientId }, options);
  }

  async countUnread(recipientId) {
    return this.count({ recipient: recipientId, isRead: false });
  }

  async markAllAsRead(recipientId) {
    return this.model.updateMany(
      { recipient: recipientId, isRead: false },
      { $set: { isRead: true } }
    );
  }
}

export default new NotificationRepository();

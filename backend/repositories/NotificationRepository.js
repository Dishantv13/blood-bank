import mongoose from "mongoose";
import BaseRepository from "./BaseRepository.js";
import Notification from "../models/Notification.model.js";

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
    const filter = { recipient: recipientId, isRead: false };

    // Explicitly handle string IDs for updateMany to ensure correct casting to ObjectId
    if (
      typeof recipientId === "string" &&
      mongoose.Types.ObjectId.isValid(recipientId)
    ) {
      filter.recipient = new mongoose.Types.ObjectId(recipientId);
    }

    return this.model.updateMany(filter, { $set: { isRead: true } });
  }
}

export default new NotificationRepository();

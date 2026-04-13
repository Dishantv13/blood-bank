import Notification from '../models/Notification.model.js';
import User from '../models/User.model.js';
import { ApiError } from '../utils/apiError.js';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';
import { sendLiveEvent } from '../utils/sse.js';

export const createNotification = async (data) => {
  const notification = new Notification({
    recipient: data.recipient,
    recipientModel: data.recipientModel || 'User',
    title: data.title,
    message: data.message,
    type: data.type || 'system',
    actionUrl: data.actionUrl || ''
  });

  await notification.save();
  sendLiveEvent(data.recipient, 'notification', notification);
  return notification;
};

export const broadcastNotification = async (data) => {
  const users = await User.find({ role: 'user' }).select('_id').lean();
  
  if (!users.length) return { success: true, count: 0 };

  const notifications = users.map(user => ({
    recipient: user._id,
    recipientModel: 'User',
    title: data.title,
    message: data.message,
    type: data.type || 'system',
    actionUrl: data.actionUrl || ''
  }));

  const createdNotifications = await Notification.insertMany(notifications);

  users.forEach((user, index) => {
    sendLiveEvent(user._id, 'notification', createdNotifications[index]);
  });

  return { success: true, count: users.length };
};


export const getNotifications = async (recipientId, query) => {
  const { page, limit, skip } = getPaginationParams({ query });
  
  const filter = { recipient: recipientId };
  if (query.isRead !== undefined) {
    filter.isRead = query.isRead === 'true';
  }

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter)
  ]);

  return buildPaginatedResponse(notifications, total, page, limit);
};

export const markAsRead = async (notificationId, recipientId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: recipientId },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  return notification;
};

export const markAllAsRead = async (recipientId) => {
  await Notification.updateMany(
    { recipient: recipientId, isRead: false },
    { $set: { isRead: true } }
  );
  
  return { success: true };
};

export const deleteNotification = async (notificationId, recipientId) => {
  const result = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: recipientId
  });

  if (!result) {
    throw new ApiError(404, 'Notification not found');
  }

  return { success: true };
};

export const getUnreadCount = async (recipientId) => {
  const count = await Notification.countDocuments({
    recipient: recipientId,
    isRead: false
  });
  
  return { unreadCount: count };
};

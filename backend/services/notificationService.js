import notificationRepository from '../repositories/NotificationRepository.js';
import User from '../models/User.model.js';
import { ApiError } from '../utils/apiError.js';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';
import { emitToUser, emitToRole } from '../utils/socket.js';

export const createNotification = async (data) => {
  const notificationData = {
    recipient: data.recipient,
    recipientModel: data.recipientModel || 'User',
    title: data.title,
    message: data.message,
    type: data.type || 'system',
    actionUrl: data.actionUrl || ''
  };

  const notification = await notificationRepository.create(notificationData);
  emitToUser(data.recipient, 'notification', notification);
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

  const createdNotifications = await notificationRepository.model.insertMany(notifications);

  users.forEach((user, index) => {
    emitToUser(user._id, 'notification', createdNotifications[index]);
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
    notificationRepository.find(filter, {
      sort: { createdAt: -1 },
      skip,
      limit
    }),
    notificationRepository.count(filter)
  ]);

  return buildPaginatedResponse(notifications, total, page, limit);
};

export const markAsRead = async (notificationId, recipientId) => {
  const notification = await notificationRepository.updateOne(
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
  await notificationRepository.markAllAsRead(recipientId);
  
  return { success: true };
};

export const deleteNotification = async (notificationId, recipientId) => {
  const result = await notificationRepository.deleteOne({
    _id: notificationId,
    recipient: recipientId
  });

  if (!result) {
    throw new ApiError(404, 'Notification not found');
  }

  return { success: true };
};

export const getUnreadCount = async (recipientId) => {
  const count = await notificationRepository.countUnread(recipientId);
  
  return { unreadCount: count };
};

import notificationRepository from "../repositories/NotificationRepository.js";
import userRepository from "../repositories/UserRepository.js";
import bloodBankRepository from "../repositories/BloodBankRepository.js";
import { ApiError } from "../utils/apiError.js";
import * as pagination from "../utils/pagination.js";
import * as socket from "../utils/socket.js";

export const createNotification = async (data) => {
  const notificationData = {
    recipient: data.recipient,
    recipientModel: data.recipientModel || "User",
    title: data.title,
    message: data.message,
    type: data.type || "system",
    actionUrl: data.actionUrl || "",
  };

  const notification = await notificationRepository.create(notificationData);
  socket.emitToUser(data.recipient, "notification", notification);
  return notification;
};

export const broadcastNotification = async (data) => {
  const users = await userRepository.find({ role: "user" }, { select: "_id" });

  if (!users.length) return { success: true, count: 0 };

  const notifications = users.map((user) => ({
    recipient: user._id,
    recipientModel: "User",
    title: data.title,
    message: data.message,
    type: data.type || "system",
    actionUrl: data.actionUrl || "",
  }));

  const createdNotifications =
    await notificationRepository.insertMany(notifications);

  users.forEach((user, index) => {
    socket.emitToUser(user._id, "notification", createdNotifications[index]);
  });

  return { success: true, count: users.length };
};

export const notifyAllBloodBanks = async (data) => {
  const bloodBanks = await bloodBankRepository.find({}, { select: "_id" });

  if (!bloodBanks.length) return { success: true, count: 0 };

  const notifications = bloodBanks.map((bank) => ({
    recipient: bank._id,
    recipientModel: "BloodBank",
    title: data.title,
    message: data.message,
    type: data.type || "request",
    actionUrl: data.actionUrl || "",
  }));

  const createdNotifications =
    await notificationRepository.insertMany(notifications);

  socket.emitToRole("bloodbank", "notification", {
    title: data.title,
    message: data.message,
    type: "request",
    actionUrl: data.actionUrl,
  });

  return { success: true, count: bloodBanks.length };
};

// Notifies all admins about critical system events (e.g., new registrations)
export const notifyAdmins = async (data) => {
  const admins = await userRepository.find({ role: "admin" }, { select: "_id" });

  if (!admins.length) return { success: true, count: 0 };

  const notifications = admins.map((admin) => ({
    recipient: admin._id,
    recipientModel: "User",
    title: data.title,
    message: data.message,
    type: data.type || "system",
    actionUrl: data.actionUrl || "",
  }));

  const createdNotifications =
    await notificationRepository.insertMany(notifications);

  // Broadcast via socket to all admins instantly
  socket.emitToRole("admin", "notification", {
    title: data.title,
    message: data.message,
    type: data.type || "system",
    actionUrl: data.actionUrl,
  });

  return { success: true, count: admins.length };
};

export const getNotifications = async (recipientId, query) => {
  const { page, limit, skip } = pagination.getPaginationParams({ query });

  const filter = { recipient: recipientId };
  if (query.isRead !== undefined) {
    filter.isRead = query.isRead === "true";
  }

  const [notifications, total] = await Promise.all([
    notificationRepository.find(filter, {
      sort: { createdAt: -1 },
      skip,
      limit,
    }),
    notificationRepository.count(filter),
  ]);

  return pagination.buildPaginatedResponse(notifications, total, page, limit);
};

export const markAsRead = async (notificationId, recipientId) => {
  const notification = await notificationRepository.updateOne(
    { _id: notificationId, recipient: recipientId },
    { $set: { isRead: true } },
    { new: true },
  );

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  return notification;
};

export const markAllAsRead = async (recipientId) => {
  const result = await notificationRepository.markAllAsRead(recipientId);

  return {
    success: true,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  };
};

export const deleteNotification = async (notificationId, recipientId) => {
  const result = await notificationRepository.deleteOne({
    _id: notificationId,
    recipient: recipientId,
  });

  if (!result) {
    throw new ApiError(404, "Notification not found");
  }

  return { success: true };
};

export const getUnreadCount = async (recipientId) => {
  const count = await notificationRepository.countUnread(recipientId);

  return { unreadCount: count };
};

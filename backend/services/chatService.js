import ChatMessage from "../models/ChatMessage.model.js";
import BloodRequest from "../models/BloodRequest.model.js";
import { ApiError } from "../utils/apiError.js";
import { HTTPS_CODE } from "../utils/httpsCode.js";

export const saveMessage = async (data) => {
  const {
    requestId,
    senderId,
    senderModel,
    recipientId,
    recipientModel,
    message,
  } = data;

  // Basic validation
  if (!requestId || !senderId || !recipientId || !message) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Missing required message fields");
  }

  const newMessage = await ChatMessage.create({
    requestId,
    sender: senderId,
    senderModel,
    recipient: recipientId,
    recipientModel,
    message,
  });

  return newMessage;
};

export const getChatHistory = async (
  requestId,
  userId,
  limit = 50,
  page = 1,
) => {
  // Authorization: Check if user is part of this request (requester or bloodbank)
  const request = await BloodRequest.findById(requestId);
  if (!request) throw new ApiError(HTTPS_CODE.NOT_FOUND, "Blood request not found");

  const isRequester =
    request.requestedBy && request.requestedBy.toString() === userId.toString();
  const isAssignedBank =
    request.bloodBank && request.bloodBank.toString() === userId.toString();
  const isTargetBank =
    request.targetBloodBank &&
    request.targetBloodBank.toString() === userId.toString();

  if (!isRequester && !isAssignedBank && !isTargetBank) {
    throw new ApiError(HTTPS_CODE.FORBIDDEN, "You are not authorized to view this chat");
  }

  const skip = (page - 1) * limit;

  const messages = await ChatMessage.find({ requestId })
    .sort({ createdAt: 1 }) // Chronological order
    .skip(skip)
    .limit(limit)
    .populate("sender", "name photoURL");

  return messages;
};

export const markAsRead = async (requestId, recipientId) => {
  return await ChatMessage.updateMany(
    { requestId, recipient: recipientId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  );
};

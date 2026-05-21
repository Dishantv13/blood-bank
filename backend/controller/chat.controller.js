import { asyncHandler } from "../utils/asynchandler.js";
import { successResponse } from "../utils/response.js";
import { HTTPS_CODE } from "../utils/httpsCode.js";
import * as chatService from "../services/chatService.js";

export const getHistory = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { limit, page } = req.query;
  const userId = req.user.userId || req.user._id || req.user.id;

  const result = await chatService.getChatHistory(
    requestId,
    userId,
    parseInt(limit) || 50,
    parseInt(page) || 1,
  );

  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Chat history fetched successfully");
});

export const markRead = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user.userId || req.user._id || req.user.id;

  await chatService.markAsRead(requestId, userId);

  successResponse(res, null, HTTPS_CODE.OK_SUCCESS, "Messages marked as read");
});

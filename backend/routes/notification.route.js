import express from 'express';
import * as notificationService from '../services/notificationService.js';
import { auth as authenticateUser } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asynchandler.js';
import { registerClient } from '../utils/sse.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

/**
 * @route GET /api/notifications/stream
 * @desc SSE stream for real-time notifications
 */
router.get('/stream', (req, res) => {
  registerClient(req.user.id, res);
});

/**
 * @route GET /api/notifications
 * @desc Get all notifications for current user
 */
router.get('/', asyncHandler(async (req, res) => {
  const result = await notificationService.getNotifications(req.user.id, req.query);
  res.status(200).json(result);
}));

/**
 * @route GET /api/notifications/unread-count
 * @desc Get number of unread notifications
 */
router.get('/unread-count', asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user.id);
  res.status(200).json(result);
}));

/**
 * @route PATCH /api/notifications/:id/read
 * @desc Mark a notification as read
 */
router.patch('/:id/read', asyncHandler(async (req, res) => {
  const result = await notificationService.markAsRead(req.params.id, req.user.id);
  res.status(200).json({ success: true, notification: result });
}));

/**
 * @route PATCH /api/notifications/read-all
 * @desc Mark all notifications as read
 */
router.patch('/read-all', asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);
  res.status(200).json(result);
}));

/**
 * @route DELETE /api/notifications/:id
 * @desc Delete a notification
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await notificationService.deleteNotification(req.params.id, req.user.id);
  res.status(200).json(result);
}));

export default router;

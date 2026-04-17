import express from 'express';
import * as notificationService from '../services/notificationService.js';
import { auth as authenticateUser } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asynchandler.js';
const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

router.get('/', asyncHandler(async (req, res) => {
  const result = await notificationService.getNotifications(req.user.id, req.query);
  res.status(200).json(result);
}));

router.get('/unread-count', asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user.id);
  res.status(200).json(result);
}));

router.patch('/:id/read', asyncHandler(async (req, res) => {
  const result = await notificationService.markAsRead(req.params.id, req.user.id);
  res.status(200).json({ success: true, notification: result });
}));

router.patch('/read-all', asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);
  res.status(200).json(result);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await notificationService.deleteNotification(req.params.id, req.user.id);
  res.status(200).json(result);
}));

export default router;

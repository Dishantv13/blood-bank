import { Router } from "express";
import * as notificationService from "../services/notificationService.js";
import { authOrBloodBank } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { HTTPS_CODE } from "../utils/httpsCode.js";
const router = Router();

// All routes require authentication (user or blood bank)
router.use(authOrBloodBank);

const getRecipientId = (req) => {
  if (req.bloodBank) return req.bloodBank.id;
  if (req.admin) return req.admin.id;
  return req.user ? req.user.id : null;
};

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await notificationService.getNotifications(
      getRecipientId(req),
      req.query,
    );
    res.status(HTTPS_CODE.OK_SUCCESS).json(result);
  }),
);

router.get(
  "/unread-count",
  asyncHandler(async (req, res) => {
    const result = await notificationService.getUnreadCount(
      getRecipientId(req),
    );
    res.status(HTTPS_CODE.OK_SUCCESS).json(result);
  }),
);

router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const result = await notificationService.markAsRead(
      req.params.id,
      getRecipientId(req),
    );
    res.status(HTTPS_CODE.OK_SUCCESS).json({ success: true, notification: result });
  }),
);

router.patch(
  "/read-all",
  asyncHandler(async (req, res) => {
    const result = await notificationService.markAllAsRead(getRecipientId(req));
    res.status(HTTPS_CODE.OK_SUCCESS).json(result);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await notificationService.deleteNotification(
      req.params.id,
      getRecipientId(req),
    );
    res.status(HTTPS_CODE.OK_SUCCESS).json(result);
  }),
);

export default router;

import { Router } from "express";
import { getHistory, markRead } from "../controller/chat.controller.js";
import { auth, bloodBankAuth } from "../middleware/auth.js";
import { HTTPS_CODE } from "../utils/httpsCode.js";

const router = Router();

const combinedAuth = (req, res, next) => {
  if (req.cookies.bb_user_at) return auth(req, res, next);
  if (req.cookies.bb_bank_at) return bloodBankAuth(req, res, next);
  res.status(HTTPS_CODE.UNAUTHORIZED).json({ message: "Authentication required" });
};

router.get("/:requestId", combinedAuth, getHistory);
router.patch("/:requestId/read", combinedAuth, markRead);

export default router;

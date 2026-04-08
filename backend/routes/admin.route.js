import { Router } from "express";
import { adminAuth } from "../middleware/auth.js";
import {
  adminExportLimiter,
  adminActionLimiter,
} from "../middleware/rateLimiter.js";
import * as adminController from "../controller/admin.controller.js";

const router = Router();

// ===================== DASHBOARD STATS =====================
router
  .route("/dashboard/stats")
  .get(adminAuth, adminActionLimiter, adminController.getDashboardStats);

// ===================== USERS MANAGEMENT =====================
router.route("/users").get(adminAuth, adminActionLimiter, adminController.getAllUsers);
router.route("/users/:userId").get(adminAuth, adminActionLimiter, adminController.getUserById);
router
  .route("/users/:userId/status")
  .patch(adminAuth, adminActionLimiter, adminController.updateUserStatus);

// ===================== BLOOD BANKS MANAGEMENT =====================
router
  .route("/bloodbanks")
  .get(adminAuth, adminActionLimiter, adminController.getAllBloodBanks);
router
  .route("/bloodbanks/:bankId")
  .get(adminAuth, adminActionLimiter, adminController.getBloodBankById);
router
  .route("/bloodbanks/:bankId/status")
  .patch(adminAuth, adminActionLimiter, adminController.updateBloodBankStatus);

// ===================== CAMPS MANAGEMENT =====================
router.route("/camps").get(adminAuth, adminActionLimiter, adminController.getAllCamps);
router
  .route("/camps/bloodbank/:bankId")
  .get(adminAuth, adminActionLimiter, adminController.getCampsByBloodBank);
router.route("/camps/:campId").get(adminAuth, adminActionLimiter, adminController.getCampById);
router
  .route("/camps/:campId/status")
  .patch(adminAuth, adminActionLimiter, adminController.updateCampStatus);

// ===================== EVENTS MANAGEMENT =====================
router.route("/events").get(adminAuth, adminActionLimiter, adminController.getAllEvents);
router
  .route("/events/bloodbank/:bankId")
  .get(adminAuth, adminActionLimiter, adminController.getEventsByBloodBank);
router
  .route("/events/:eventId")
  .get(adminAuth, adminActionLimiter, adminController.getEventById);
router
  .route("/events/:eventId/status")
  .patch(adminAuth, adminActionLimiter, adminController.updateEventStatus);

// ===================== REQUESTS MANAGEMENT =====================
router.route("/requests").get(adminAuth, adminActionLimiter, adminController.getAllRequests);
router
  .route("/requests/:requestId")
  .get(adminAuth, adminActionLimiter, adminController.getRequestById);
router
  .route("/requests/:requestId/status")
  .patch(adminAuth, adminActionLimiter, adminController.updateRequestStatus);

// ===================== DONATIONS MANAGEMENT =====================
router.route("/donations").get(adminAuth, adminActionLimiter, adminController.getAllDonations);
router
  .route("/donations/:donationId")
  .get(adminAuth, adminActionLimiter, adminController.getDonationById);
router
  .route("/donations/:donationId/status")
  .patch(adminAuth, adminActionLimiter, adminController.updateDonationStatus);

// ===================== INVENTORY MANAGEMENT =====================
router
  .route("/inventory")
  .get(adminAuth, adminActionLimiter, adminController.getInventoryOverview);
router
  .route("/inventory/:inventoryId")
  .get(adminAuth, adminActionLimiter, adminController.getInventoryById);

// ===================== EXPORT ENDPOINTS (XLSX FORMAT) =====================
router.route("/export/users").get(adminAuth, adminExportLimiter, adminController.exportUsers);
router
  .route("/export/requests")
  .get(adminAuth, adminExportLimiter, adminController.exportRequests);
router
  .route("/export/bloodbanks")
  .get(adminAuth, adminExportLimiter, adminController.exportBloodBanks);
router.route("/export/camps").get(adminAuth, adminExportLimiter, adminController.exportCamps);
router.route("/export/events").get(adminAuth, adminExportLimiter, adminController.exportEvents);

// ===================== EXPORT ENDPOINTS (CSV FORMAT) =====================
router
  .route("/export/users/csv")
  .get(adminAuth, adminExportLimiter, adminController.exportUsersCsv);
router
  .route("/export/requests/csv")
  .get(adminAuth, adminExportLimiter, adminController.exportRequestsCsv);
router
  .route("/export/bloodbanks/csv")
  .get(adminAuth, adminExportLimiter, adminController.exportBloodBanksCsv);
router
  .route("/export/camps/csv")
  .get(adminAuth, adminExportLimiter, adminController.exportCampsCsv);
router
  .route("/export/events/csv")
  .get(adminAuth, adminExportLimiter, adminController.exportEventsCsv);

// ===================== ALL-IN-ONE EXPORT =====================
router.route("/export/all").get(adminAuth, adminExportLimiter, adminController.exportAllData);

export default router;

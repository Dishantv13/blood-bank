import { Router } from "express";
import { adminAuth } from "../middleware/auth.js";
import {
  adminExportLimiter,
  adminActionLimiter,
} from "../middleware/rateLimiter.js";
import * as adminController from "../controller/admin.controller.js";
import * as adminValidation from "../validations/admin.validation.js";

const router = Router();

router
  .route("/dashboard/stats")
  .get(adminAuth, adminActionLimiter, adminController.getDashboardStats);

// USERS MANAGEMENT
router
  .route("/users")
  .get(adminAuth, adminActionLimiter, adminController.getAllUsers);
router
  .route("/users/:userId")
  .get(adminAuth, adminActionLimiter, adminController.getUserById);
router
  .route("/users/:userId/status")
  .patch(
    adminAuth,
    adminActionLimiter,
    adminValidation.updateUserStatusValidation,
    adminController.updateUserStatus,
  );

// BLOOD BANKS MANAGEMENT
router
  .route("/blood-banks")
  .get(adminAuth, adminActionLimiter, adminController.getAllBloodBanks);
router
  .route("/blood-banks/:bankId")
  .get(adminAuth, adminActionLimiter, adminController.getBloodBankById);
router
  .route("/blood-banks/:bankId/status")
  .patch(
    adminAuth,
    adminActionLimiter,
    adminValidation.updateBloodBankStatusValidation,
    adminController.updateBloodBankStatus,
  );

// CAMPS MANAGEMENT
router
  .route("/camps")
  .get(adminAuth, adminActionLimiter, adminController.getAllCamps);
router
  .route("/camps/bloodbank/:bankId")
  .get(adminAuth, adminActionLimiter, adminController.getCampsByBloodBank);
router
  .route("/camps/:campId")
  .get(adminAuth, adminActionLimiter, adminController.getCampById);
router
  .route("/camps/:campId/status")
  .patch(
    adminAuth,
    adminActionLimiter,
    adminValidation.updateCampStatusValidation,
    adminController.updateCampStatus,
  );

// EVENTS MANAGEMENT
router
  .route("/events")
  .get(adminAuth, adminActionLimiter, adminController.getAllEvents);
router
  .route("/events/bloodbank/:bankId")
  .get(adminAuth, adminActionLimiter, adminController.getEventsByBloodBank);
router
  .route("/events/:eventId")
  .get(adminAuth, adminActionLimiter, adminController.getEventById);
router
  .route("/events/:eventId/status")
  .patch(
    adminAuth,
    adminActionLimiter,
    adminValidation.updateEventStatusValidation,
    adminController.updateEventStatus,
  );

// REQUESTS MANAGEMENT
router
  .route("/requests")
  .get(adminAuth, adminActionLimiter, adminController.getAllRequests);
router
  .route("/requests/:requestId")
  .get(adminAuth, adminActionLimiter, adminController.getRequestById);
router
  .route("/requests/:requestId/status")
  .patch(
    adminAuth,
    adminActionLimiter,
    adminValidation.updateRequestStatusValidation,
    adminController.updateRequestStatus,
  );

// DONATIONS MANAGEMENT
router
  .route("/donations")
  .get(adminAuth, adminActionLimiter, adminController.getAllDonations);
router
  .route("/donations/:donationId")
  .get(adminAuth, adminActionLimiter, adminController.getDonationById);
router
  .route("/donations/:donationId/status")
  .patch(
    adminAuth,
    adminActionLimiter,
    adminValidation.updateDonationStatusValidation,
    adminController.updateDonationStatus,
  );

// INVENTORY MANAGEMENT
router
  .route("/inventory")
  .get(adminAuth, adminActionLimiter, adminController.getInventoryOverview);
router
  .route("/inventory/:inventoryId")
  .get(adminAuth, adminActionLimiter, adminController.getInventoryById);

// EXPORT ENDPOINTS (XLSX FORMAT)
router
  .route("/export/users")
  .get(adminAuth, adminExportLimiter, adminController.exportUsers);
router
  .route("/export/requests")
  .get(adminAuth, adminExportLimiter, adminController.exportRequests);
router
  .route("/export/blood-banks")
  .get(adminAuth, adminExportLimiter, adminController.exportBloodBanks);
router
  .route("/export/camps")
  .get(adminAuth, adminExportLimiter, adminController.exportCamps);
router
  .route("/export/events")
  .get(adminAuth, adminExportLimiter, adminController.exportEvents);

// ALL-IN-ONE EXPORT
router
  .route("/export/all")
  .get(adminAuth, adminExportLimiter, adminController.exportAllData);

export default router;

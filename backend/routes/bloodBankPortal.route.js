import { Router } from "express";
import { bloodBankAuth } from "../middleware/auth.js";
import { cacheResponse } from "../middleware/cache.js";
import * as bloodBankPortalController from "../controller/bloodBankPortal.controller.js";
import * as bloodBankPortalValidation from "../validations/bloodBankPortal.validation.js";

const router = Router();

// Blood Request Management
router
  .route("/requests")
  .get(
    bloodBankAuth,
    cacheResponse(60),
    bloodBankPortalController.getAllRequests,
  );

router
  .route("/requests/inter-bank")
  .post(
    bloodBankAuth,
    bloodBankPortalValidation.interBankRequestValidation,
    bloodBankPortalController.createBankToBankRequest,
  );

router
  .route("/requests/approved")
  .get(bloodBankAuth, bloodBankPortalController.getApprovedRequests);

router
  .route("/requests/stats/summary")
  .get(
    bloodBankAuth,
    cacheResponse(300),
    bloodBankPortalController.getRequestStats,
  );

router
  .route("/requests/:id")
  .get(bloodBankAuth, bloodBankPortalController.getRequestDetails);

router
  .route("/requests/:id/approve")
  .post(
    bloodBankAuth,
    bloodBankPortalValidation.approveRequestValidation,
    bloodBankPortalController.approveRequest,
  );

router
  .route("/requests/:id/reject")
  .post(
    bloodBankAuth,
    bloodBankPortalValidation.rejectRequestValidation,
    bloodBankPortalController.rejectRequest,
  );

// Event Management
router
  .route("/events")
  .get(bloodBankAuth, bloodBankPortalController.getAllEvents);

router
  .route("/events")
  .post(
    bloodBankAuth,
    bloodBankPortalValidation.createEventValidation,
    bloodBankPortalController.createEvent,
  );

router
  .route("/events/:id")
  .put(
    bloodBankAuth,
    bloodBankPortalValidation.updateEventValidation,
    bloodBankPortalController.updateEvent,
  );

router
  .route("/events/:id")
  .delete(bloodBankAuth, bloodBankPortalController.deleteEvent);

router
  .route("/events/:id/registrations")
  .get(bloodBankAuth, bloodBankPortalController.getEventRegistrations);

router
  .route("/events/:id/export-registrations")
  .get(bloodBankAuth, bloodBankPortalController.exportEventRegistrations);

// Blood Camp Management

router
  .route("/camps")
  .get(bloodBankAuth, bloodBankPortalController.getAllCamps);

router
  .route("/camps/:id/registrations")
  .get(bloodBankAuth, bloodBankPortalController.getCampRegistrations);

router
  .route("/camps/:id/registrations/:donorId")
  .delete(bloodBankAuth, bloodBankPortalController.removeDonorRegistration);

router
  .route("/camps/:id/export-registrations")
  .get(bloodBankAuth, bloodBankPortalController.exportCampRegistrations);

// Settings & Profile Management

import { upload } from "../middleware/multer.js";

router
  .route("/settings/photo")
  .post(
    bloodBankAuth,
    upload.single("photo"),
    bloodBankPortalController.uploadPhoto,
  );

router
  .route("/settings/profile")
  .get(bloodBankAuth, cacheResponse(600), bloodBankPortalController.getProfile);

router
  .route("/settings/profile")
  .put(
    bloodBankAuth,
    bloodBankPortalValidation.updateProfileValidation,
    bloodBankPortalController.updateProfile,
  );

router
  .route("/settings/password")
  .put(
    bloodBankAuth,
    bloodBankPortalValidation.changePasswordValidation,
    bloodBankPortalController.changePassword,
  );

router
  .route("/settings/inventory")
  .get(
    bloodBankAuth,
    cacheResponse(30),
    bloodBankPortalController.getInventory,
  );

router
  .route("/settings/inventory")
  .put(
    bloodBankAuth,
    bloodBankPortalValidation.updateInventoryValidation,
    bloodBankPortalController.updateInventory,
  );

router
  .route("/settings/inventory/:bloodGroup")
  .patch(
    bloodBankAuth,
    bloodBankPortalValidation.updateBloodGroupUnitsValidation,
    bloodBankPortalController.updateBloodGroupUnits,
  );

// Dashboard & Analytics

router
  .route("/dashboard")
  .get(
    bloodBankAuth,
    cacheResponse(30),
    bloodBankPortalController.getDashboard,
  );

export default router;

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


// Settings & Profile Management

import { upload } from "../middleware/multer.js";

router
  .route("/photo")
  .post(
    bloodBankAuth,
    upload.single("photo"),
    bloodBankPortalController.uploadPhoto,
  );

router
  .route("/profile")
  .get(bloodBankAuth, cacheResponse(600), bloodBankPortalController.getProfile);

router
  .route("/profile")
  .put(
    bloodBankAuth,
    bloodBankPortalValidation.updateProfileValidation,
    bloodBankPortalController.updateProfile,
  );

router
  .route("/password")
  .put(
    bloodBankAuth,
    bloodBankPortalValidation.changePasswordValidation,
    bloodBankPortalController.changePassword,
  );

router
  .route("/inventory")
  .get(
    bloodBankAuth,
    cacheResponse(30),
    bloodBankPortalController.getInventory,
  );

router
  .route("/inventory")
  .put(
    bloodBankAuth,
    bloodBankPortalValidation.updateInventoryValidation,
    bloodBankPortalController.updateInventory,
  );

router
  .route("/inventory/:bloodGroup")
  .patch(
    bloodBankAuth,
    bloodBankPortalValidation.updateBloodGroupUnitsValidation,
    bloodBankPortalController.updateBloodGroupUnits,
  );

router
  .route("/export/inventory")
  .get(bloodBankAuth, bloodBankPortalController.exportInventoryData);

router
  .route("/export/camps")
  .get(bloodBankAuth, bloodBankPortalController.exportCampReports);

router
  .route("/export/all")
  .get(bloodBankAuth, bloodBankPortalController.exportAllData);



// Dashboard & Analytics

router
  .route("/dashboard")
  .get(
    bloodBankAuth,
    cacheResponse(30),
    bloodBankPortalController.getDashboard,
  );

export default router;

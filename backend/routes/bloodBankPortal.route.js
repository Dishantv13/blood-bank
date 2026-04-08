import { Router } from 'express';
import { bloodBankAuth } from '../middleware/auth.js';
import * as bloodBankPortalController from '../controller/bloodBankPortal.controller.js';

const router = Router();

// ==================== BLOOD REQUEST MANAGEMENT ====================
router.route('/requests').get(bloodBankAuth, bloodBankPortalController.getAllRequests);

router.route('/requests/inter-bank').post(bloodBankAuth, bloodBankPortalController.createBankToBankRequest);

router.route('/requests/approved').get(bloodBankAuth, bloodBankPortalController.getApprovedRequests);

router.route('/requests/stats/summary').get(bloodBankAuth, bloodBankPortalController.getRequestStats);

router.route('/requests/:id').get(bloodBankAuth, bloodBankPortalController.getRequestDetails);

router.route('/requests/:id/approve').post(bloodBankAuth, bloodBankPortalController.approveRequest);

router.route('/requests/:id/reject').post(bloodBankAuth, bloodBankPortalController.rejectRequest);

// ==================== EVENT MANAGEMENT ====================
router.route('/events').get(bloodBankAuth, bloodBankPortalController.getAllEvents);

router.route('/events').post(bloodBankAuth, bloodBankPortalController.createEvent);

router.route('/events/:id').put(bloodBankAuth, bloodBankPortalController.updateEvent);

router.route('/events/:id').delete(bloodBankAuth, bloodBankPortalController.deleteEvent);

router.route('/events/:id/registrations').get(bloodBankAuth, bloodBankPortalController.getEventRegistrations);

router.route('/events/:id/export-registrations').get(bloodBankAuth, bloodBankPortalController.exportEventRegistrations);

// ==================== BLOOD CAMP MANAGEMENT ====================

router.route('/camps').get(bloodBankAuth, bloodBankPortalController.getAllCamps);

router.route('/camps/:id/registrations').get(bloodBankAuth, bloodBankPortalController.getCampRegistrations);

router.route('/camps/:id/registrations/:donorId').delete(bloodBankAuth, bloodBankPortalController.removeDonorRegistration);

router.route('/camps/:id/export-registrations').get(bloodBankAuth, bloodBankPortalController.exportCampRegistrations);

// ==================== SETTINGS & PROFILE MANAGEMENT ====================

import { upload } from '../middleware/multer.js';

router.route('/settings/photo').post(bloodBankAuth, upload.single('photo'), bloodBankPortalController.uploadPhoto);

router.route('/settings/profile').get(bloodBankAuth, bloodBankPortalController.getProfile);

router.route('/settings/profile').put(bloodBankAuth, bloodBankPortalController.updateProfile);

router.route('/settings/password').put(bloodBankAuth, bloodBankPortalController.changePassword);

router.route('/settings/inventory').get(bloodBankAuth, bloodBankPortalController.getInventory);

router.route('/settings/inventory').put(bloodBankAuth, bloodBankPortalController.updateInventory);

router.route('/settings/inventory/:bloodGroup').patch(bloodBankAuth, bloodBankPortalController.updateBloodGroupUnits);

// ==================== DASHBOARD & ANALYTICS ====================

router.route('/dashboard').get(bloodBankAuth, bloodBankPortalController.getDashboard);

export default router;

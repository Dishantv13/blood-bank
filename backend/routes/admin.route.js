import { Router } from 'express';
import { adminAuth } from '../middleware/auth.js';
import { adminExportLimiter, adminActionLimiter } from '../middleware/rateLimiter.js';
import {
    exportUsers,
    exportRequests,
    exportBloodBanks,
    exportCamps,
    exportEvents,
    exportUsersCsv,
    exportRequestsCsv,
    exportBloodBanksCsv,
    exportCampsCsv,
    exportEventsCsv,
    exportAllData,
    getAllUsers,
    getUserById,
    updateUserStatus,
    getAllBloodBanks,
    getBloodBankById,
    updateBloodBankStatus,
    getAllCamps,
    getCampsByBloodBank,
    getCampById,
    updateCampStatus,
    getAllEvents,
    getEventsByBloodBank,
    getEventById,
    updateEventStatus,
    getAllRequests,
    getRequestById,
    updateRequestStatus,
    getAllDonations,
    getDonationById,
    updateDonationStatus,
    getInventoryOverview,
    getInventoryById,
    getDashboardStats,
} from '../controller/admin.controller.js';

const router = Router();

// ===================== DASHBOARD STATS =====================
router.route('/dashboard/stats').get(adminAuth, adminActionLimiter, getDashboardStats);

// ===================== USERS MANAGEMENT =====================
router.route('/users').get(adminAuth, adminActionLimiter, getAllUsers);
router.route('/users/:userId').get(adminAuth, adminActionLimiter, getUserById);
router.route('/users/:userId/status').patch(adminAuth, adminActionLimiter, updateUserStatus);

// ===================== BLOOD BANKS MANAGEMENT =====================
router.route('/bloodbanks').get(adminAuth, adminActionLimiter, getAllBloodBanks);
router.route('/bloodbanks/:bankId').get(adminAuth, adminActionLimiter, getBloodBankById);
router.route('/bloodbanks/:bankId/status').patch(adminAuth, adminActionLimiter, updateBloodBankStatus);

// ===================== CAMPS MANAGEMENT =====================
router.route('/camps').get(adminAuth, adminActionLimiter, getAllCamps);
router.route('/camps/bloodbank/:bankId').get(adminAuth, adminActionLimiter, getCampsByBloodBank);
router.route('/camps/:campId').get(adminAuth, adminActionLimiter, getCampById);
router.route('/camps/:campId/status').patch(adminAuth, adminActionLimiter, updateCampStatus);

// ===================== EVENTS MANAGEMENT =====================
router.route('/events').get(adminAuth, adminActionLimiter, getAllEvents);
router.route('/events/bloodbank/:bankId').get(adminAuth, adminActionLimiter, getEventsByBloodBank);
router.route('/events/:eventId').get(adminAuth, adminActionLimiter, getEventById);
router.route('/events/:eventId/status').patch(adminAuth, adminActionLimiter, updateEventStatus);

// ===================== REQUESTS MANAGEMENT =====================
router.route('/requests').get(adminAuth, adminActionLimiter, getAllRequests);
router.route('/requests/:requestId').get(adminAuth, adminActionLimiter, getRequestById);
router.route('/requests/:requestId/status').patch(adminAuth, adminActionLimiter, updateRequestStatus);

// ===================== DONATIONS MANAGEMENT =====================
router.route('/donations').get(adminAuth, adminActionLimiter, getAllDonations);
router.route('/donations/:donationId').get(adminAuth, adminActionLimiter, getDonationById);
router.route('/donations/:donationId/status').patch(adminAuth, adminActionLimiter, updateDonationStatus);

// ===================== INVENTORY MANAGEMENT =====================
router.route('/inventory').get(adminAuth, adminActionLimiter, getInventoryOverview);
router.route('/inventory/:inventoryId').get(adminAuth, adminActionLimiter, getInventoryById);

// ===================== EXPORT ENDPOINTS (XLSX FORMAT) =====================
router.route('/export/users').get(adminAuth, adminExportLimiter, exportUsers);
router.route('/export/requests').get(adminAuth, adminExportLimiter, exportRequests);
router.route('/export/bloodbanks').get(adminAuth, adminExportLimiter, exportBloodBanks);
router.route('/export/camps').get(adminAuth, adminExportLimiter, exportCamps);  
router.route('/export/events').get(adminAuth, adminExportLimiter, exportEvents);

// ===================== EXPORT ENDPOINTS (CSV FORMAT) =====================
router.route('/export/users/csv').get(adminAuth, adminExportLimiter, exportUsersCsv);
router.route('/export/requests/csv').get(adminAuth, adminExportLimiter, exportRequestsCsv);
router.route('/export/bloodbanks/csv').get(adminAuth, adminExportLimiter, exportBloodBanksCsv);
router.route('/export/camps/csv').get(adminAuth, adminExportLimiter, exportCampsCsv);
router.route('/export/events/csv').get(adminAuth, adminExportLimiter, exportEventsCsv);

// ===================== ALL-IN-ONE EXPORT =====================
router.route('/export/all').get(adminAuth, adminExportLimiter, exportAllData);

export default router;

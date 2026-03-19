import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import {
    isAdmin,
    exportUsers,
    exportRequests,
    exportBloodBanks,
    exportCamps,
    exportEvents
}from '../controller/admin.controller.js';

const router = Router();

// Export all users to Excel
router.route('/export/users').get(auth, isAdmin, exportUsers);

// Export all blood requests to Excel
router.route('/export/requests').get(auth, isAdmin, exportRequests);

// Export all blood banks to Excel
router.route('/export/bloodbanks').get(auth, isAdmin, exportBloodBanks);

// Export all blood camps to Excel
router.route('/export/camps').get(auth, isAdmin, exportCamps);  

// Export all events to Excel
router.route('/export/events').get(auth, isAdmin, exportEvents);

export default router;

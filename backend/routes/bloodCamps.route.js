import { Router } from 'express';
import { auth, protectBloodBank } from '../middleware/auth.js';
import { cacheResponse } from '../middleware/cache.js';
import * as bloodCampsControllers from '../controller/bloodCamps.controller.js';

const router = Router();

router.route('/').get(cacheResponse(120), bloodCampsControllers.getAllCamps);

router.route('/cleanup-registrations').post(bloodCampsControllers.cleanupRegistrations);

router.route('/fix-registrations').post(bloodCampsControllers.fixRegistrations);

router.route('/:id/export-registrations').get(protectBloodBank, bloodCampsControllers.exportRegistrations);

router.route('/my-camps').get(protectBloodBank, bloodCampsControllers.getMyCamps);

router.route('/:id').get(bloodCampsControllers.getCampById);

router.route('/').post(protectBloodBank, bloodCampsControllers.createCamp);

router.route('/:id').put(protectBloodBank, bloodCampsControllers.updateCamp);

router.route('/:id').delete(protectBloodBank, bloodCampsControllers.deleteCamp);

router.route('/:id/register').post(auth, bloodCampsControllers.registerCamp);

router.route('/:id/collected').put(protectBloodBank, bloodCampsControllers.updateCollectedUnits);

export default router;

import { Router } from 'express';
import { bloodBankAuth } from '../middleware/auth.js';
import { cacheResponse } from '../middleware/cache.js';
import * as bloodUnitController from '../controller/bloodUnit.controller.js';

const router = Router();

// Detailed Individual Unit Inventory
router.route('/units').get(cacheResponse(30), bloodBankAuth, bloodUnitController.getIndividualInventory);

// Expedited Expiry Monitoring
router.route('/units/expiring').get(cacheResponse(30), bloodBankAuth, bloodUnitController.getExpiringUnits);

// Medical Screening Update
router.route('/units/:unitId/screening').patch(bloodBankAuth, bloodUnitController.updateScreeningStatus);

// Refining/Processing
router.route('/units/:unitId/refine').post(bloodBankAuth, bloodUnitController.refineBloodUnit);

// Cold Chain Storage Logging
router.route('/units/:unitId/cold-chain').post(bloodBankAuth, bloodUnitController.addColdChainLog);

// Component Splitting
router.route('/units/:unitId/split').post(bloodBankAuth, bloodUnitController.splitBloodUnit);

export default router;

import { Router } from 'express';
import { auth, authOrBloodBank, bloodBankAuth } from '../middleware/auth.js';
import { cacheResponse } from '../middleware/cache.js';
import * as requestControllers from '../controller/request.controller.js';
import { requestCreationLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.route('/').get(cacheResponse(60), requestControllers.getAllRequests);
router.route('/my-requests').get(auth, requestControllers.getMyRequests);
router.route('/blood-bank-requests').get(bloodBankAuth, requestControllers.getBloodBankRequests);
router.route('/').post(auth, requestCreationLimiter, requestControllers.createRequest);

router.route('/:id').get(requestControllers.getRequestById);
router.route('/:id').put(auth, requestControllers.updateRequest);
router.route('/:id/status').patch(authOrBloodBank, requestControllers.updateRequestStatus);
router.route('/:id/fulfill').post(authOrBloodBank, requestControllers.fulfillRequest);
router.route('/:id/broadcast').post(auth, requestControllers.broadcastRequest);

export default router;

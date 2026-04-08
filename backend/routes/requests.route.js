import { Router } from 'express';
import { auth, authOrBloodBank } from '../middleware/auth.js';
import { cacheResponse } from '../middleware/cache.js';
import * as requestControllers from '../controller/request.controller.js';
import { requestCreationLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.route('/').get(cacheResponse(60), requestControllers.getAllRequests);

router.route('/my-requests').get(auth, requestControllers.getMyRequests);

router.route('/').post(auth, requestCreationLimiter, requestControllers.createRequest);

router.route('/:id').put(auth, requestControllers.updateRequest);

router.route('/:id/status').patch(authOrBloodBank, requestControllers.updateRequestStatus);

export default router;

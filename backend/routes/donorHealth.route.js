import { Router } from 'express';
import { auth, protectBloodBank } from '../middleware/auth.js';
import * as donorHealthControllers from '../controller/donorHealth.controller.js';

const router = Router();

router.route('/').post(auth, donorHealthControllers.submitHealthForm);

router.route('/my-forms').get(auth, donorHealthControllers.getMyForms);

router.route('/latest').get(auth, donorHealthControllers.getLatestForm);

router.route('/eligibility').get(auth, donorHealthControllers.checkEligibility);

router.route('/').get(protectBloodBank, donorHealthControllers.getAllForms);

router.route('/:id').get(protectBloodBank, donorHealthControllers.getFormById);

router.route('/:id/review').put(protectBloodBank, donorHealthControllers.reviewForm);

router.route('/:id').put(auth, donorHealthControllers.updateForm);

export default router;

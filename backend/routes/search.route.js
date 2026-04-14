import { Router } from 'express';
import * as searchController from '../controller/search.controller.js';

const router = Router();

router.get('/availability', searchController.searchAvailability);

export default router;

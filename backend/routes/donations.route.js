import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { bloodBankAuth } from "../middleware/auth.js";
import { donationCreationLimiter } from '../middleware/rateLimiter.js';
import * as donationControllers from "../controller/donation.controller.js";

const router = Router();

// Donor Routes
router.route("/request").post(auth, donationCreationLimiter, donationControllers.createDonationRequest);

router.route("/my").get(auth, donationControllers.getMyDonations);

// Blood Bank Routes
router.route("/bank").get(bloodBankAuth, donationControllers.getBloodBankDonations);

router.route("/bank/:donationId/record").put(bloodBankAuth, donationControllers.recordDonation);

router.route("/bank/:donationId/status").put(bloodBankAuth, donationControllers.updateDonationStatus);

router.route("/bank/create").post(bloodBankAuth, donationControllers.createDonationByBank);

export default router;

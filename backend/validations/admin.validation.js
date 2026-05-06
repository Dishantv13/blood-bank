import { body } from "express-validator";

const USER_STATUSES = ["active", "inactive", "suspended"];
const APPROVAL_STATUSES = ["pending", "approved", "rejected"];
const CAMP_STATUSES = ["active", "completed", "cancelled"];
const EVENT_STATUSES = ["scheduled", "ongoing", "completed", "cancelled"];
const REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "fulfilled",
  "cancelled",
];
const DONATION_STATUSES = ["pending", "approved", "rejected", "completed"];

export const updateUserStatusValidation = [
  body("status").exists().isIn(USER_STATUSES),
];

export const updateBloodBankStatusValidation = [
  body("status").exists().isIn(APPROVAL_STATUSES),
  body("rejectionReason").optional().isString().trim().isLength({ max: 500 }),
];

export const updateCampStatusValidation = [
  body("status").exists().isIn(CAMP_STATUSES),
];

export const updateEventStatusValidation = [
  body("status").exists().isIn(EVENT_STATUSES),
];

export const updateRequestStatusValidation = [
  body("status").exists().isIn(REQUEST_STATUSES),
];

export const updateDonationStatusValidation = [
  body("status").exists().isIn(DONATION_STATUSES),
];

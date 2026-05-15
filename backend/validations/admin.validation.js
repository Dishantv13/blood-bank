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
  body("status")
    .exists()
    .withMessage("Status is required")
    .isIn(USER_STATUSES)
    .withMessage(`Invalid status. Must be one of: ${USER_STATUSES.join(", ")}`),
];

export const updateBloodBankStatusValidation = [
  body("status")
    .exists()
    .withMessage("Status is required")
    .isIn(APPROVAL_STATUSES)
    .withMessage(`Invalid status. Must be one of: ${APPROVAL_STATUSES.join(", ")}`),
  body("rejectionReason")
    .optional()
    .isString()
    .withMessage("Rejection reason must be a string")
    .trim()
    .isLength({ max: 500 })
    .withMessage("Rejection reason cannot exceed 500 characters"),
];

export const updateCampStatusValidation = [
  body("status")
    .exists()
    .withMessage("Status is required")
    .isIn(CAMP_STATUSES)
    .withMessage(`Invalid status. Must be one of: ${CAMP_STATUSES.join(", ")}`),
];

export const updateEventStatusValidation = [
  body("status")
    .exists()
    .withMessage("Status is required")
    .isIn(EVENT_STATUSES)
    .withMessage(`Invalid status. Must be one of: ${EVENT_STATUSES.join(", ")}`),
];

export const updateRequestStatusValidation = [
  body("status")
    .exists()
    .withMessage("Status is required")
    .isIn(REQUEST_STATUSES)
    .withMessage(`Invalid status. Must be one of: ${REQUEST_STATUSES.join(", ")}`),
];

export const updateDonationStatusValidation = [
  body("status")
    .exists()
    .withMessage("Status is required")
    .isIn(DONATION_STATUSES)
    .withMessage(`Invalid status. Must be one of: ${DONATION_STATUSES.join(", ")}`),
];

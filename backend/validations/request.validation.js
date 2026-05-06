import { body } from "express-validator";
import { BLOOD_GROUPS, URGENCY_LEVELS } from "./validation.constants.js";

const REQUEST_STATUSES = [
  "pending",
  "approved",
  "in_progress",
  "fulfilled",
  "completed",
  "rejected",
  "cancelled",
];

export const createRequestValidation = [
  body("patientName").exists().isString().trim().isLength({ min: 2, max: 120 }),
  body("bloodGroup").exists().isIn(BLOOD_GROUPS),
  body("units").exists().isInt({ min: 1, max: 20 }),
  body("urgency").optional().isIn(URGENCY_LEVELS),
  body("contactNumber")
    .exists()
    .matches(/^\d{10}$/)
    .withMessage("Contact number must be 10 digits"),
  body("requiredBy").optional().isISO8601(),
  body("description").optional().isString().trim().isLength({ max: 1000 }),
  body("hospital").optional().isObject(),
  body("hospital.name").optional().isString().trim().isLength({ max: 120 }),
  body("hospital.address").optional().isString().trim().isLength({ max: 300 }),
];

export const updateRequestValidation = [
  body("patientName")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 120 }),
  body("bloodGroup").optional().isIn(BLOOD_GROUPS),
  body("units").optional().isInt({ min: 1, max: 20 }),
  body("urgency").optional().isIn(URGENCY_LEVELS),
  body("contactNumber")
    .optional()
    .matches(/^\d{10}$/)
    .withMessage("Contact number must be 10 digits"),
  body("requiredBy").optional().isISO8601(),
  body("description").optional().isString().trim().isLength({ max: 1000 }),
  body("hospital").optional().isObject(),
  body("hospital.name").optional().isString().trim().isLength({ max: 120 }),
  body("hospital.address").optional().isString().trim().isLength({ max: 300 }),
];

export const updateRequestStatusValidation = [
  body("status").exists().isIn(REQUEST_STATUSES),
  body("note").optional().isString().trim().isLength({ max: 500 }),
];

export const fulfillRequestValidation = [
  body("unitsProvided").optional().isInt({ min: 1, max: 20 }),
  body("deliveryMethod").optional().isIn(["pickup", "delivery"]),
  body("notes").optional().isString().trim().isLength({ max: 500 }),
];

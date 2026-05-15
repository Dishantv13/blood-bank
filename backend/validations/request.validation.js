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
  body("patientName")
    .exists()
    .withMessage("Patient name is required")
    .isString()
    .withMessage("Patient name must be a string")
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage("Patient name must be between 2 and 120 characters"),
  body("bloodGroup")
    .exists()
    .withMessage("Blood group is required")
    .isIn(BLOOD_GROUPS)
    .withMessage(`Invalid blood group. Must be one of: ${BLOOD_GROUPS.join(", ")}`),
  body("units")
    .exists()
    .withMessage("Number of units is required")
    .isInt({ min: 1, max: 20 })
    .withMessage("Units must be a number between 1 and 20"),
  body("urgency")
    .optional()
    .isIn(URGENCY_LEVELS)
    .withMessage(`Invalid urgency level. Must be one of: ${URGENCY_LEVELS.join(", ")}`),
  body("contactNumber")
    .exists()
    .withMessage("Contact number is required")
    .matches(/^\d{10}$/)
    .withMessage("Contact number must be exactly 10 digits"),
  body("requiredBy")
    .optional()
    .isISO8601()
    .withMessage("Required by date must be a valid ISO8601 date"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string")
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),
  body("hospital")
    .optional()
    .isObject()
    .withMessage("Hospital information must be an object"),
  body("hospital.name")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 120 })
    .withMessage("Hospital name cannot exceed 120 characters"),
  body("hospital.address")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 300 })
    .withMessage("Hospital address cannot exceed 300 characters"),
];

export const updateRequestValidation = [
  body("patientName")
    .optional()
    .isString()
    .withMessage("Patient name must be a string")
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage("Patient name must be between 2 and 120 characters"),
  body("bloodGroup")
    .optional()
    .isIn(BLOOD_GROUPS)
    .withMessage(`Invalid blood group. Must be one of: ${BLOOD_GROUPS.join(", ")}`),
  body("units")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("Units must be a number between 1 and 20"),
  body("urgency")
    .optional()
    .isIn(URGENCY_LEVELS)
    .withMessage(`Invalid urgency level. Must be one of: ${URGENCY_LEVELS.join(", ")}`),
  body("contactNumber")
    .optional()
    .matches(/^\d{10}$/)
    .withMessage("Contact number must be exactly 10 digits"),
  body("requiredBy")
    .optional()
    .isISO8601()
    .withMessage("Required by date must be a valid ISO8601 date"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string")
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),
  body("hospital")
    .optional()
    .isObject()
    .withMessage("Hospital information must be an object"),
  body("hospital.name")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 120 })
    .withMessage("Hospital name cannot exceed 120 characters"),
  body("hospital.address")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 300 })
    .withMessage("Hospital address cannot exceed 300 characters"),
];

export const updateRequestStatusValidation = [
  body("status")
    .exists()
    .withMessage("Status is required")
    .isIn(REQUEST_STATUSES)
    .withMessage(`Invalid status. Must be one of: ${REQUEST_STATUSES.join(", ")}`),
  body("note")
    .optional()
    .isString()
    .withMessage("Note must be a string")
    .trim()
    .isLength({ max: 500 })
    .withMessage("Note cannot exceed 500 characters"),
];

export const fulfillRequestValidation = [
  body("unitsProvided")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("Units provided must be a number between 1 and 20"),
  body("deliveryMethod")
    .optional()
    .isIn(["pickup", "delivery"])
    .withMessage("Delivery method must be pickup or delivery"),
  body("notes")
    .optional()
    .isString()
    .withMessage("Notes must be a string")
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),
];

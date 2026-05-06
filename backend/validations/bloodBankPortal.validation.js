import { body, param } from "express-validator";
import {
  BLOOD_GROUPS,
  EVENT_TYPES,
  EVENT_VISIBILITIES,
} from "./validation.constants.js";

export const interBankRequestValidation = [
  body("targetBloodBankId").exists().isMongoId(),
  body("bloodGroup").exists().isIn(BLOOD_GROUPS),
  body("units").exists().isInt({ min: 1, max: 20 }),
  body("urgency").optional().isIn(["critical", "urgent", "normal"]),
  body("description").optional().isString().trim().isLength({ max: 1000 }),
];

export const approveRequestValidation = [
  body("responseNote").optional().isString().trim().isLength({ max: 500 }),
];

export const rejectRequestValidation = [
  body("responseNote")
    .exists()
    .isString()
    .trim()
    .isLength({ min: 3, max: 500 }),
];

export const createEventValidation = [
  body("title").exists().isString().trim().isLength({ min: 3, max: 120 }),
  body("description")
    .exists()
    .isString()
    .trim()
    .isLength({ min: 10, max: 2000 }),
  body("eventType").optional().isIn(EVENT_TYPES),
  body("date").exists().isISO8601(),
  body("startTime")
    .exists()
    .matches(/^\d{2}:\d{2}$/),
  body("endTime")
    .exists()
    .matches(/^\d{2}:\d{2}$/),
  body("visibility").optional().isIn(EVENT_VISIBILITIES),
  body("expectedDonors").optional().isInt({ min: 0, max: 100000 }),
  body("maxParticipants").optional().isInt({ min: 1, max: 100000 }),
  body("location").optional().isObject(),
  body("location.name").optional().isString().trim().isLength({ max: 120 }),
  body("location.address").optional().isString().trim().isLength({ max: 300 }),
];

export const updateEventValidation = [
  body("title").optional().isString().trim().isLength({ min: 3, max: 120 }),
  body("description")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 2000 }),
  body("eventType").optional().isIn(EVENT_TYPES),
  body("date").optional().isISO8601(),
  body("startTime")
    .optional()
    .matches(/^\d{2}:\d{2}$/),
  body("endTime")
    .optional()
    .matches(/^\d{2}:\d{2}$/),
  body("visibility").optional().isIn(EVENT_VISIBILITIES),
  body("expectedDonors").optional().isInt({ min: 0, max: 100000 }),
  body("maxParticipants").optional().isInt({ min: 1, max: 100000 }),
  body("location").optional().isObject(),
  body("location.name").optional().isString().trim().isLength({ max: 120 }),
  body("location.address").optional().isString().trim().isLength({ max: 300 }),
];

export const updateProfileValidation = [
  body("name").optional().isString().trim().isLength({ min: 2, max: 120 }),
  body("phone")
    .optional()
    .matches(/^\d{10}$/)
    .withMessage("Phone number must be 10 digits"),
  body("address").optional().isObject(),
  body("address.street").optional().isString().trim().isLength({ max: 200 }),
  body("address.city").optional().isString().trim().isLength({ max: 100 }),
  body("address.state").optional().isString().trim().isLength({ max: 100 }),
  body("address.pincode")
    .optional()
    .matches(/^\d{6}$/)
    .withMessage("Pincode must be 6 digits"),
  body("location").optional().isObject(),
  body("location.type").optional().equals("Point"),
  body("location.coordinates").optional().isArray({ min: 2, max: 2 }),
  body("location.coordinates.*").optional().isFloat(),
  body("establishedYear").optional().isInt({ min: 1800, max: 2100 }),
];

export const changePasswordValidation = [
  body("currentPassword").exists().isString().notEmpty(),
  body("newPassword")
    .exists()
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/),
];

export const updateInventoryValidation = [
  body("inventory").exists().isArray({ min: 1, max: 8 }),
  body("inventory.*.bloodGroup").optional().isIn(BLOOD_GROUPS),
  body("inventory.*.type").optional().isIn(BLOOD_GROUPS),
  body("inventory.*.units").exists().isInt({ min: 0, max: 100000 }),
];

export const updateBloodGroupUnitsValidation = [
  param("bloodGroup").isIn(BLOOD_GROUPS),
  body("units").exists().isInt({ min: 0, max: 100000 }),
];

import { body, param } from "express-validator";
import {
  BLOOD_GROUPS,
  EVENT_TYPES,
  EVENT_VISIBILITIES,
} from "./validation.constants.js";

export const interBankRequestValidation = [
  body("targetBloodBankId")
    .exists()
    .withMessage("Target blood bank ID is required")
    .isMongoId()
    .withMessage("Invalid blood bank ID format"),
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
    .isIn(["critical", "urgent", "normal"])
    .withMessage("Urgency must be critical, urgent, or normal"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string")
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),
];

export const approveRequestValidation = [
  body("responseNote")
    .optional()
    .isString()
    .withMessage("Response note must be a string")
    .trim()
    .isLength({ max: 500 })
    .withMessage("Response note cannot exceed 500 characters"),
];

export const rejectRequestValidation = [
  body("responseNote")
    .exists()
    .withMessage("Rejection note is required")
    .isString()
    .withMessage("Rejection note must be a string")
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage("Rejection note must be between 3 and 500 characters"),
];

export const createEventValidation = [
  body("title")
    .exists()
    .withMessage("Event title is required")
    .isString()
    .withMessage("Event title must be a string")
    .trim()
    .isLength({ min: 3, max: 120 })
    .withMessage("Event title must be between 3 and 120 characters"),
  body("description")
    .exists()
    .withMessage("Event description is required")
    .isString()
    .withMessage("Event description must be a string")
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Event description must be between 10 and 2000 characters"),
  body("eventType")
    .optional()
    .isIn(EVENT_TYPES)
    .withMessage(`Invalid event type. Must be one of: ${EVENT_TYPES.join(", ")}`),
  body("date")
    .exists()
    .withMessage("Event date is required")
    .isISO8601()
    .withMessage("Event date must be a valid ISO8601 date (YYYY-MM-DD)"),
  body("startTime")
    .exists()
    .withMessage("Start time is required")
    .matches(/^\d{2}:\d{2}$/)
    .withMessage("Start time must be in HH:mm format"),
  body("endTime")
    .exists()
    .withMessage("End time is required")
    .matches(/^\d{2}:\d{2}$/)
    .withMessage("End time must be in HH:mm format"),
  body("visibility")
    .optional()
    .isIn(EVENT_VISIBILITIES)
    .withMessage(`Invalid visibility. Must be one of: ${EVENT_VISIBILITIES.join(", ")}`),
  body("expectedDonors")
    .optional()
    .isInt({ min: 0, max: 100000 })
    .withMessage("Expected donors must be a number between 0 and 100,000"),
  body("maxParticipants")
    .optional()
    .isInt({ min: 1, max: 100000 })
    .withMessage("Maximum participants must be a number between 1 and 100,000"),
  body("location")
    .optional()
    .isObject()
    .withMessage("Location must be an object"),
  body("location.name")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 120 })
    .withMessage("Location name cannot exceed 120 characters"),
  body("location.address")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 300 })
    .withMessage("Location address cannot exceed 300 characters"),
];

export const updateEventValidation = [
  body("title")
    .optional()
    .isString()
    .withMessage("Event title must be a string")
    .trim()
    .isLength({ min: 3, max: 120 })
    .withMessage("Event title must be between 3 and 120 characters"),
  body("description")
    .optional()
    .isString()
    .withMessage("Event description must be a string")
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Event description must be between 10 and 2000 characters"),
  body("eventType")
    .optional()
    .isIn(EVENT_TYPES)
    .withMessage(`Invalid event type. Must be one of: ${EVENT_TYPES.join(", ")}`),
  body("date")
    .optional()
    .isISO8601()
    .withMessage("Event date must be a valid ISO8601 date (YYYY-MM-DD)"),
  body("startTime")
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage("Start time must be in HH:mm format"),
  body("endTime")
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage("End time must be in HH:mm format"),
  body("visibility")
    .optional()
    .isIn(EVENT_VISIBILITIES)
    .withMessage(`Invalid visibility. Must be one of: ${EVENT_VISIBILITIES.join(", ")}`),
  body("expectedDonors")
    .optional()
    .isInt({ min: 0, max: 100000 })
    .withMessage("Expected donors must be a number between 0 and 100,000"),
  body("maxParticipants")
    .optional()
    .isInt({ min: 1, max: 100000 })
    .withMessage("Maximum participants must be a number between 1 and 100,000"),
  body("location")
    .optional()
    .isObject()
    .withMessage("Location must be an object"),
  body("location.name")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 120 })
    .withMessage("Location name cannot exceed 120 characters"),
  body("location.address")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 300 })
    .withMessage("Location address cannot exceed 300 characters"),
];

export const updateProfileValidation = [
  body("name")
    .optional()
    .isString()
    .withMessage("Name must be a string")
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage("Name must be between 2 and 120 characters"),
  body("phone")
    .optional()
    .matches(/^\d{10}$/)
    .withMessage("Phone number must be exactly 10 digits"),
  body("address")
    .optional()
    .isObject()
    .withMessage("Address must be an object"),
  body("address.street")
    .optional()
    .isString()
    .withMessage("Street must be a string")
    .trim()
    .isLength({ max: 200 })
    .withMessage("Street address cannot exceed 200 characters"),
  body("address.city")
    .optional()
    .isString()
    .withMessage("City must be a string")
    .trim()
    .isLength({ max: 100 })
    .withMessage("City name cannot exceed 100 characters"),
  body("address.state")
    .optional()
    .isString()
    .withMessage("State must be a string")
    .trim()
    .isLength({ max: 100 })
    .withMessage("State name cannot exceed 100 characters"),
  body("address.pincode")
    .optional()
    .matches(/^\d{6}$/)
    .withMessage("Pincode must be exactly 6 digits"),
  body("location")
    .optional()
    .isObject()
    .withMessage("Location must be an object"),
  body("location.type")
    .optional()
    .equals("Point")
    .withMessage("Location type must be 'Point'"),
  body("location.coordinates")
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage("Coordinates must be an array of [longitude, latitude]"),
  body("location.coordinates.*")
    .optional()
    .isFloat()
    .withMessage("Coordinates must be valid numbers"),
  body("establishedYear")
    .optional()
    .isInt({ min: 1800, max: 2100 })
    .withMessage("Established year must be between 1800 and 2100"),
];

export const changePasswordValidation = [
  body("currentPassword")
    .exists()
    .withMessage("Current password is required")
    .isString()
    .notEmpty()
    .withMessage("Current password cannot be empty"),
  body("newPassword")
    .exists()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/)
    .withMessage("New password must include uppercase, lowercase, number and special character"),
];

export const updateInventoryValidation = [
  body("inventory")
    .exists()
    .withMessage("Inventory data is required")
    .isArray({ min: 1, max: 8 })
    .withMessage("Inventory must be an array with 1 to 8 items"),
  body("inventory.*.bloodGroup")
    .optional()
    .isIn(BLOOD_GROUPS)
    .withMessage(`Invalid blood group. Must be one of: ${BLOOD_GROUPS.join(", ")}`),
  body("inventory.*.type")
    .optional()
    .isIn(BLOOD_GROUPS)
    .withMessage(`Invalid type. Must be one of: ${BLOOD_GROUPS.join(", ")}`),
  body("inventory.*.units")
    .exists()
    .withMessage("Units are required for each inventory item")
    .isInt({ min: 0, max: 100000 })
    .withMessage("Units must be a number between 0 and 100,000"),
];

export const updateBloodGroupUnitsValidation = [
  param("bloodGroup").isIn(BLOOD_GROUPS),
  body("units").exists().isInt({ min: 0, max: 100000 }),
];

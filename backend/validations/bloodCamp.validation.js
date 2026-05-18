import { body } from "express-validator";

const CAMP_STATUSES = [
  "scheduled",
  "upcoming",
  "ongoing",
  "completed",
  "cancelled",
];

export const createCampValidation = [
  body("name")
    .exists()
    .withMessage("Camp name is required")
    .isString()
    .withMessage("Camp name must be a string")
    .trim()
    .isLength({ min: 3, max: 120 })
    .withMessage("Camp name must be between 3 and 120 characters"),
  body("date")
    .exists()
    .withMessage("Camp date is required")
    .isISO8601()
    .withMessage("Camp date must be a valid ISO8601 date (YYYY-MM-DD)"),
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
  body("venue")
    .exists()
    .withMessage("Venue is required")
    .isString()
    .withMessage("Venue must be a string")
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Venue must be between 3 and 200 characters"),
  body("address")
    .exists()
    .withMessage("Address is required")
    .isString()
    .withMessage("Address must be a string")
    .trim()
    .isLength({ min: 5, max: 300 })
    .withMessage("Address must be between 5 and 300 characters"),
  body("city")
    .exists()
    .withMessage("City is required")
    .isString()
    .withMessage("City must be a string")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("City name must be between 2 and 100 characters"),
  body("targetUnits")
    .exists()
    .withMessage("Target units is required")
    .isInt({ min: 1, max: 100000 })
    .withMessage("Target units must be a number between 1 and 100,000"),
  body("status")
    .optional()
    .isIn(CAMP_STATUSES)
    .withMessage(`Invalid status. Must be one of: ${CAMP_STATUSES.join(", ")}`),
];

export const updateCampValidation = [
  body("name")
    .optional()
    .isString()
    .withMessage("Camp name must be a string")
    .trim()
    .isLength({ min: 3, max: 120 })
    .withMessage("Camp name must be between 3 and 120 characters"),
  body("date")
    .optional()
    .isISO8601()
    .withMessage("Camp date must be a valid ISO8601 date (YYYY-MM-DD)"),
  body("startTime")
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage("Start time must be in HH:mm format"),
  body("endTime")
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage("End time must be in HH:mm format"),
  body("venue")
    .optional()
    .isString()
    .withMessage("Venue must be a string")
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Venue must be between 3 and 200 characters"),
  body("address")
    .optional()
    .isString()
    .withMessage("Address must be a string")
    .trim()
    .isLength({ min: 5, max: 300 })
    .withMessage("Address must be between 5 and 300 characters"),
  body("city")
    .optional()
    .isString()
    .withMessage("City must be a string")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("City name must be between 2 and 100 characters"),
  body("targetUnits")
    .optional()
    .isInt({ min: 1, max: 100000 })
    .withMessage("Target units must be a number between 1 and 100,000"),
  body("status")
    .optional()
    .isIn(CAMP_STATUSES)
    .withMessage(`Invalid status. Must be one of: ${CAMP_STATUSES.join(", ")}`),
];

export const updateCollectedUnitsValidation = [
  body("collectedUnits")
    .exists()
    .withMessage("Collected units is required")
    .isInt({ min: 0, max: 100000 })
    .withMessage("Collected units must be a number between 0 and 100,000"),
];

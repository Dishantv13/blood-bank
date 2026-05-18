import { body } from "express-validator";
import { EVENT_TYPES, EVENT_VISIBILITIES } from "./validation.constants.js";

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

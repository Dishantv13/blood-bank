import { body } from "express-validator";
import { EVENT_TYPES, EVENT_VISIBILITIES } from "./validation.constants.js";

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

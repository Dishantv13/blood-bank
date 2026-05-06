import { body } from "express-validator";

const CAMP_STATUSES = [
  "scheduled",
  "upcoming",
  "ongoing",
  "completed",
  "cancelled",
];

export const createCampValidation = [
  body("name").exists().isString().trim().isLength({ min: 3, max: 120 }),
  body("date").exists().isISO8601(),
  body("startTime")
    .exists()
    .matches(/^\d{2}:\d{2}$/),
  body("endTime")
    .exists()
    .matches(/^\d{2}:\d{2}$/),
  body("venue").exists().isString().trim().isLength({ min: 3, max: 200 }),
  body("address").exists().isString().trim().isLength({ min: 5, max: 300 }),
  body("city").exists().isString().trim().isLength({ min: 2, max: 100 }),
  body("targetUnits").exists().isInt({ min: 1, max: 100000 }),
  body("status").optional().isIn(CAMP_STATUSES),
];

export const updateCampValidation = [
  body("name").optional().isString().trim().isLength({ min: 3, max: 120 }),
  body("date").optional().isISO8601(),
  body("startTime")
    .optional()
    .matches(/^\d{2}:\d{2}$/),
  body("endTime")
    .optional()
    .matches(/^\d{2}:\d{2}$/),
  body("venue").optional().isString().trim().isLength({ min: 3, max: 200 }),
  body("address").optional().isString().trim().isLength({ min: 5, max: 300 }),
  body("city").optional().isString().trim().isLength({ min: 2, max: 100 }),
  body("targetUnits").optional().isInt({ min: 1, max: 100000 }),
  body("status").optional().isIn(CAMP_STATUSES),
];

export const updateCollectedUnitsValidation = [
  body("collectedUnits").exists().isInt({ min: 0, max: 100000 }),
];

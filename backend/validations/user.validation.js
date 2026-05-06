import { body } from "express-validator";
import { BLOOD_GROUPS } from "./validation.constants.js";

const GENDERS = ["male", "female", "other"];

export const updateProfileValidation = [
  body("name").optional().isString().trim().isLength({ min: 2, max: 100 }),
  body("phone")
    .optional()
    .matches(/^\d{10}$/)
    .withMessage("Phone number must be 10 digits"),
  body("bloodGroup").optional().isIn(BLOOD_GROUPS),
  body("isDonor").optional().isBoolean(),
  body("isAvailable").optional().isBoolean(),
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
];

export const updateDonorInfoValidation = [
  body("weight").exists().isFloat({ min: 1, max: 500 }),
  body("dateOfBirth").exists().isISO8601(),
  body("gender").exists().isIn(GENDERS),
  body("consent").optional().isObject(),
  body("consent.informationAccurate").optional().isBoolean(),
  body("consent.consentToDonate").optional().isBoolean(),
  body("consent.understandsProcess").optional().isBoolean(),
  body("accuracyDeclaration").optional().isBoolean(),
  body("location").optional().isObject(),
  body("location.type").optional().equals("Point"),
  body("location.coordinates").optional().isArray({ min: 2, max: 2 }),
  body("location.coordinates.*").optional().isFloat(),
];

export const toggleModeValidation = [
  body("mode").exists().isIn(["donor", "patient"]),
];

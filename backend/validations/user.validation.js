import { body } from "express-validator";
import { BLOOD_GROUPS } from "./validation.constants.js";

const GENDERS = ["male", "female", "other"];

export const updateProfileValidation = [
  body("name")
    .optional()
    .isString()
    .withMessage("Name must be a string")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),
  body("phone")
    .optional()
    .matches(/^\d{10}$/)
    .withMessage("Phone number must be exactly 10 digits"),
  body("bloodGroup")
    .optional()
    .isIn(BLOOD_GROUPS)
    .withMessage(`Invalid blood group. Must be one of: ${BLOOD_GROUPS.join(", ")}`),
  body("isDonor")
    .optional()
    .isBoolean()
    .withMessage("isDonor must be a boolean value"),
  body("isAvailable")
    .optional()
    .isBoolean()
    .withMessage("isAvailable must be a boolean value"),
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
];

export const updateDonorInfoValidation = [
  body("weight")
    .exists()
    .withMessage("Weight is required")
    .isFloat({ min: 1, max: 500 })
    .withMessage("Weight must be a number between 1 and 500 kg"),
  body("dateOfBirth")
    .exists()
    .withMessage("Date of birth is required")
    .isISO8601()
    .withMessage("Date of birth must be a valid ISO8601 date"),
  body("gender")
    .exists()
    .withMessage("Gender is required")
    .isIn(GENDERS)
    .withMessage(`Invalid gender. Must be one of: ${GENDERS.join(", ")}`),
  body("consent")
    .optional()
    .isObject()
    .withMessage("Consent information must be an object"),
  body("consent.informationAccurate")
    .optional()
    .isBoolean()
    .withMessage("informationAccurate must be a boolean"),
  body("consent.consentToDonate")
    .optional()
    .isBoolean()
    .withMessage("consentToDonate must be a boolean"),
  body("consent.understandsProcess")
    .optional()
    .isBoolean()
    .withMessage("understandsProcess must be a boolean"),
  body("accuracyDeclaration")
    .optional()
    .isBoolean()
    .withMessage("accuracyDeclaration must be a boolean"),
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
];

export const toggleModeValidation = [
  body("mode")
    .exists()
    .withMessage("Mode is required")
    .isIn(["donor", "patient"])
    .withMessage("Mode must be donor or patient"),
];

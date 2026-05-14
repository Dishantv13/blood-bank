import mongoose from "mongoose";
import bloodBankRepository from "../repositories/BloodBankRepository.js";
import inventoryRepository from "../repositories/InventoryRepository.js";
import { ApiError } from "../utils/apiError.js";
import { revokeAllPrincipalSessions } from "./sessionService.js";
import * as serializers from "../utils/serializers.js";
import * as validationService from "./validationService.js";

export const getProfile = async (bloodBankId) => {
  const bloodBank = await bloodBankRepository.findById(bloodBankId, {
    select: serializers.BLOOD_BANK_SAFE_FIELDS,
  });
  if (!bloodBank) throw new ApiError(404, "Blood bank not found");
  return serializers.sanitizeBloodBank(bloodBank);
};

export const updateProfile = async (bloodBankId, payload) => {
  const bloodBank = await bloodBankRepository.findById(bloodBankId, {
    lean: false,
  });
  if (!bloodBank) throw new ApiError(404, "Blood bank not found");

  const allowedUpdates = [
    "name",
    "phone",
    "logo",
    "imageUrl",
    "address",
    "location",
    "operatingHours",
    "services",
    "contactPerson",
    "establishedYear",
  ];

  const nameChanged =
    payload.name !== undefined && payload.name !== bloodBank.name;

  allowedUpdates.forEach((field) => {
    if (payload[field] !== undefined) bloodBank[field] = payload[field];
  });

  if (nameChanged) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await bloodBank.save({ session });
      await inventoryRepository.model.updateOne(
        { bloodBank: bloodBank._id },
        { $set: { bloodBankName: bloodBank.name } },
        { session },
      );
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } else {
    await bloodBank.save();
  }

  const updatedBloodBank = await bloodBankRepository.findById(bloodBank._id, {
    select: serializers.BLOOD_BANK_SAFE_FIELDS,
  });
  return serializers.sanitizeBloodBank(updatedBloodBank);
};

export const changePassword = async (
  bloodBankId,
  currentPassword,
  newPassword,
) => {
  if (!currentPassword || !newPassword)
    throw new ApiError(400, "Please provide current and new password");

  if (currentPassword === newPassword)
    throw new ApiError(
      400,
      "New password must be different from current password",
    );

  validationService.validatePassword(newPassword);

  const bloodBank = await bloodBankRepository.findById(bloodBankId, {
    select: "+password +tokenVersion",
    lean: false,
  });

  if (!bloodBank) throw new ApiError(404, "Blood bank not found");

  const isMatch = await bloodBank.comparePassword(currentPassword);
  if (!isMatch) throw new ApiError(401, "Invalid current password");

  bloodBank.password = newPassword;
  bloodBank.tokenVersion = (bloodBank.tokenVersion || 0) + 1;
  bloodBank.passwordChangedAt = new Date();
  await bloodBank.save();

  await revokeAllPrincipalSessions({
    role: "bloodbank",
    bloodBankId: bloodBank._id,
    reason: "password_change",
  });

  return { success: true };
};

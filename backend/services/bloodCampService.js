import ExcelJS from "exceljs";
import mongoose from "mongoose";
import bloodCampRepository from "../repositories/BloodCampRepository.js";
import userRepository from "../repositories/UserRepository.js";
import donationRepository from "../repositories/DonationRepository.js";
import cacheManager from "../utils/cacheManager.js";
import { ApiError } from "../utils/apiError.js";
import * as pagination from "../utils/pagination.js";
import * as notificationService from "./notificationService.js";
import * as auditService from "./auditService.js";

const CAMP_LIST_FIELDS =
  "_id name organizer organizerName date startTime endTime venue address city state targetUnits collectedUnits description contactPhone status registeredDonors.donor";

const CAMPS_CACHE_TTL_SECONDS = 300; // 5 minutes
const CACHE_KEYS = {
  CAMPS: "camps",
};

export const invalidateCampsCache = async () => {
  return cacheManager.invalidatePattern(`${CACHE_KEYS.CAMPS}:*`);
};

export const getAllCamps = async (query) => {
  const { city, status, upcoming, search } = query;
  const { page, limit, skip } = pagination.getPaginationParams({ query });

  const cacheKey = JSON.stringify({ query, page, limit });
  const cached = await cacheManager.get(`${CACHE_KEYS.CAMPS}:${cacheKey}`);
  if (cached) return cached;

  const filter = {};
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  if (city) filter.city = new RegExp(city, "i");
  if (status) filter.status = status;
  if (upcoming === "true" || !status) {
    filter.date = { $gte: startOfToday };
    filter.status = { $in: ["scheduled", "upcoming"] };
  }

  // Use the new optimized aggregation search
  const { data: camps, total } = await bloodCampRepository.searchCamps(filter, {
    skip,
    limit,
    sort: { date: 1 },
  });

  const response = pagination.buildPaginatedResponse(camps, total, page, limit);
  await cacheManager.set(
    `${CACHE_KEYS.CAMPS}:${cacheKey}`,
    response,
    CAMPS_CACHE_TTL_SECONDS,
  );
  return response;
};

export const getCampById = async (campId) => {
  const camp = await bloodCampRepository.findById(campId, {
    populate: { path: "organizer", select: "name email phone address" },
  });

  if (!camp) throw new ApiError(404, "Blood camp not found");
  return camp;
};

export const createCamp = async (bloodBank, data) => {
  const camp = await bloodCampRepository.create({
    ...data,
    organizer: bloodBank._id,
    organizerName: bloodBank.name,
    contactPhone: data.contactPhone || bloodBank.phone,
    contactEmail: data.contactEmail || bloodBank.email,
  });

  // Notify all users about the new camp
  notificationService
    .broadcastNotification({
      title: "New Blood Donation Camp",
      message: `${bloodBank.name} has organized a new blood donation camp: ${camp.name}. Join us to save lives!`,
      type: "event", // Use 'event' type for both events and camps in notifications
      actionUrl: "/events",
    })
    .catch((err) =>
      console.error("Broadcast notification for camp failed:", err),
    );

  await invalidateCampsCache();
  return camp;
};

export const updateCamp = async (campId, bloodBankId, data) => {
  const camp = await bloodCampRepository.findById(campId, { lean: false });
  if (!camp) throw new ApiError(404, "Blood camp not found");

  if (camp.organizer.toString() !== bloodBankId.toString()) {
    throw new ApiError(403, "Not authorized to update this camp");
  }

  const updateFields = [
    "name",
    "date",
    "startTime",
    "endTime",
    "venue",
    "address",
    "city",
    "state",
    "pincode",
    "targetUnits",
    "description",
    "status",
  ];

  updateFields.forEach((field) => {
    if (data[field] !== undefined) camp[field] = data[field];
  });

  await camp.save();
  await invalidateCampsCache();
  return camp;
};

export const deleteCamp = async (campId, bloodBankId) => {
  const camp = await bloodCampRepository.findById(campId);
  if (!camp) throw new ApiError(404, "Blood camp not found");

  if (camp.organizer.toString() !== bloodBankId.toString()) {
    throw new ApiError(403, "Not authorized to delete this camp");
  }

  await bloodCampRepository.deleteOne({ _id: campId });
  await invalidateCampsCache();
  return { success: true };
};

export const registerCamp = async (campId, userId) => {
  const camp = await bloodCampRepository.findById(campId, { lean: false });
  if (!camp) throw new ApiError(404, "Blood camp not found");

  const user = await userRepository.findById(userId, {
    select: "name email phone bloodGroup donorInfo",
  });
  if (!user) throw new ApiError(404, "User not found");

  const alreadyRegistered = camp.registeredDonors.some(
    (donor) =>
      donor && donor.donor && donor.donor.toString() === userId.toString(),
  );
  if (alreadyRegistered)
    throw new ApiError(400, "You have already registered for this camp");

  if (user.donorInfo?.lastDonationDate) {
    const lastDate = new Date(user.donorInfo.lastDonationDate);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    if (lastDate > threeMonthsAgo) {
      throw new ApiError(
        400,
        "You must wait 3 months after your last donation to donate again.",
      );
    }
  }

  camp.registeredDonors.push({
    donor: userId,
    name: user.name || "Unknown",
    phone: user.phone || "Not provided",
    bloodGroup: user.bloodGroup || "Not specified",
    registeredAt: new Date(),
  });

  const donation = await donationRepository.create({
    donor: userId,
    bloodBank: camp.organizer,
    camp: camp._id,
    type: "camp",
    bloodGroup: user.bloodGroup || "O+",
    donationDate: camp.date,
    notes: `Registered for camp: ${camp.name}`,
    status: "pending",
  });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await camp.save({ session });
    await donation.save({ session });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  // Create in-app notification
  notificationService
    .createNotification({
      recipient: user._id,
      recipientModel: "User",
      title: "Camp Registration Confirmed",
      message: `You have successfully registered for the camp: ${camp.name}.`,
      type: "event",
      actionUrl: "/dashboard",
    })
    .catch((err) => console.error("In-app notification failed:", err));

  await invalidateCampsCache();

  return {
    registration: {
      name: user.name,
      bloodGroup: user.bloodGroup,
      phone: user.phone,
    },
  };
};

export const getMyCamps = async (bloodBankId) => {
  return bloodCampRepository.find(
    { organizer: bloodBankId },
    { sort: { date: -1 } },
  );
};

export const updateCollectedUnits = async (
  campId,
  bloodBankId,
  collectedUnits,
) => {
  const camp = await bloodCampRepository.findById(campId, { lean: false });
  if (!camp) throw new ApiError(404, "Blood camp not found");
  if (camp.organizer.toString() !== bloodBankId.toString())
    throw new ApiError(403, "Not authorized");

  camp.collectedUnits = collectedUnits;
  await camp.save();
  await invalidateCampsCache();
  return camp;
};

export const cleanupRegistrations = async (req) => {
  const camps = await bloodCampRepository.find(
    { "registeredDonors.0": { $exists: true } },
    { lean: false },
  );
  let removed = 0;

  for (const camp of camps) {
    const before = camp.registeredDonors.length;
    camp.registeredDonors = camp.registeredDonors.filter((donor) => {
      const hasValidName =
        donor.name && donor.name !== "Unknown" && donor.name.trim() !== "";
      const hasValidDonor = donor.donor && donor.donor.toString().length === 24;
      if (!hasValidName || !hasValidDonor) {
        removed += 1;
        return false;
      }
      return true;
    });
    if (before !== camp.registeredDonors.length) {
      await camp.save();
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await auditService.logAction(
      {
        action: "BLOOD_CAMP_REGISTRATIONS_CLEANED",
        actorModel: "Admin",
        targetModel: "BloodCamp",
        changes: { removed, campsProcessed: camps.length },
        metadata: { adminEmail: req?.admin?.adminEmail || null },
      },
      { session },
    );
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  return { removed, campsProcessed: camps.length };
};

export const fixRegistrations = async (req) => {
  const camps = await bloodCampRepository.find(
    { "registeredDonors.0": { $exists: true } },
    { lean: false },
  );

  // 1. Collect all unique donor IDs that need fixing
  const donorIdsToFetch = new Set();
  camps.forEach((camp) => {
    camp.registeredDonors.forEach((donor) => {
      if (
        !donor.name ||
        !donor.phone ||
        !donor.bloodGroup ||
        donor.name === "Unknown" ||
        donor.phone === "Not provided"
      ) {
        if (donor.donor) donorIdsToFetch.add(donor.donor.toString());
      }
    });
  });

  // 2. Fetch all users in one batch
  const users = await userRepository.find(
    { _id: { $in: Array.from(donorIdsToFetch) } },
    { select: "name phone bloodGroup" },
  );
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  let fixed = 0;
  let errors = 0;

  // 3. Apply fixes
  for (const camp of camps) {
    let updated = false;
    for (let i = 0; i < camp.registeredDonors.length; i += 1) {
      const donor = camp.registeredDonors[i];
      if (
        !donor.name ||
        !donor.phone ||
        !donor.bloodGroup ||
        donor.name === "Unknown" ||
        donor.phone === "Not provided"
      ) {
        const user = userMap.get(donor.donor?.toString());
        if (user) {
          camp.registeredDonors[i].name = user.name || "Unknown";
          camp.registeredDonors[i].phone = user.phone || "Not provided";
          camp.registeredDonors[i].bloodGroup =
            user.bloodGroup || "Not specified";
          fixed += 1;
          updated = true;
        } else {
          errors += 1;
        }
      }
    }
    if (updated) {
      await camp.save();
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await auditService.logAction(
      {
        action: "BLOOD_CAMP_REGISTRATIONS_FIXED",
        actorModel: "Admin",
        targetModel: "BloodCamp",
        changes: { fixed, errors, campsProcessed: camps.length },
        metadata: { adminEmail: req?.admin?.adminEmail || null },
      },
      { session },
    );
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  return { fixed, errors, campsProcessed: camps.length };
};

export const exportRegistrations = async (campId, bloodBankId) => {
  const camp = await bloodCampRepository.findById(campId, {
    populate: {
      path: "registeredUsers",
      select: "name email phone bloodGroup city state age gender address",
    },
  });

  if (!camp) throw new ApiError(404, "Blood camp not found");
  if (camp.organizer.toString() !== bloodBankId.toString())
    throw new ApiError(403, "Not authorized to export this camp's data");
  if (!camp.registeredUsers || camp.registeredUsers.length === 0)
    throw new ApiError(400, "No registered users to export");

  const workbook = new ExcelJS.Workbook();
  const infoSheet = workbook.addWorksheet("Camp Info");
  infoSheet.addRow(["Camp Name", camp.name]);
  infoSheet.addRow(["Date", new Date(camp.date).toLocaleDateString()]);
  infoSheet.addRow(["Total Registrations", camp.registeredUsers.length]);

  const regSheet = workbook.addWorksheet("Registrations");
  regSheet.columns = [
    { header: "S.No", key: "sno", width: 8 },
    { header: "Name", key: "name", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Phone", key: "phone", width: 15 },
    { header: "Blood Group", key: "bloodGroup", width: 12 },
  ];
  camp.registeredUsers.forEach((user, index) => {
    regSheet.addRow({
      sno: index + 1,
      name: user.name || "N/A",
      email: user.email || "N/A",
      phone: user.phone || "N/A",
      bloodGroup: user.bloodGroup || "N/A",
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${camp.name.replace(/[^a-z0-9]/gi, "_")}_registrations.xlsx`;
  return { buffer, filename };
};

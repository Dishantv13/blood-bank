import mongoose from "mongoose";
import donationRepository from "../repositories/DonationRepository.js";
import userRepository from "../repositories/UserRepository.js";
import cacheManager from "../utils/cacheManager.js";
import { ApiError } from "../utils/apiError.js";
import { createBloodUnit } from "./bloodUnitService.js";
import { toObjectId } from "../utils/dbGuards.js";
import * as emailService from "../utils/emailService.js";
import * as notificationService from "./notificationService.js";
import * as certificateService from "./certificateService.js";
import * as validationService from "./validationService.js";
import * as pagination from "../utils/pagination.js";

const DONATION_ELIGIBILITY_PERIOD = 90 * 24 * 60 * 60 * 1000; // 90 days in ms

// Create donation request
export const createDonationRequest = async (donorId, bloodBankId, data) => {
  validationService.validateDonation({ bloodBankId, date: data.date });

  // Get user with optimized query
  const user = await userRepository.findById(donorId, {
    select: "_id name bloodGroup isDonor donorInfo",
  });

  if (!user || !user.isDonor) {
    throw new ApiError(403, "Only registered donors can request to donate");
  }

  // Check 3-month donation rule
  if (user.donorInfo?.lastDonationDate) {
    const lastDate = new Date(user.donorInfo.lastDonationDate);
    const threeMonthsAgo = new Date(Date.now() - DONATION_ELIGIBILITY_PERIOD);

    if (lastDate > threeMonthsAgo) {
      throw new ApiError(
        400,
        "You must wait 3 months after your last donation to donate again",
      );
    }
  }

  // Create donation request
  const donation = await donationRepository.create({
    donor: donorId,
    bloodBank: bloodBankId,
    camp: data.campId || null,
    type: data.campId ? "camp" : "request",
    bloodGroup: data.bloodGroup || user.bloodGroup,
    donationDate: data.date || new Date(),
    notes: data.notes || "",
    status: "pending",
  });

  cacheManager.del("admin:dashboard_stats");
  return donation;
};

// Get user's donation history (paginated, optimized)
export const getUserDonations = async (donorId, query) => {
  const { page, limit, skip } = pagination.getPaginationParams({ query });
  const { status } = query;

  const filter = { donor: toObjectId(donorId) };
  if (status) {
    filter.status = status;
  }

  const { data: donations, total } = await donationRepository.findPaginated(
    filter,
    {
      sort: { createdAt: -1 },
      skip,
      limit,
    },
  );

  if (donations.length > 0) {
    await donationRepository.model.populate(donations, [
      { path: "bloodBank", select: "name phone" },
      { path: "camp", select: "name date" },
    ]);
  }

  return pagination.buildPaginatedResponse(donations, total, page, limit);
};

// Get blood bank's donations (paginated, optimized)
export const getBloodBankDonations = async (bloodBankId, query) => {
  const { page, limit, skip } = pagination.getPaginationParams({ query });
  const { status, search, type } = query;

  const filter = { bloodBank: toObjectId(bloodBankId) };

  if (status) {
    if (status === "pending") {
      filter.status = { $in: ["pending", "approved"] };
    } else if (status !== "all") {
      filter.status = status;
    }
  }

  if (type) {
    filter.type = type;
  }

  // If searching, we need to look into donor name or blood group
  if (search) {
    const donors = await userRepository.find(
      { name: { $regex: search, $options: "i" } },
      { select: "_id" },
    );
    const donorIds = donors.map((d) => d._id);

    filter.$or = [
      { donor: { $in: donorIds } },
      { bloodGroup: { $regex: search, $options: "i" } },
      { certificateCode: { $regex: search, $options: "i" } },
    ];
  }

  const { data: donations, total } = await donationRepository.findPaginated(
    filter,
    {
      sort: { createdAt: -1 },
      skip,
      limit,
    },
  );

  if (donations.length > 0) {
    await donationRepository.model.populate(donations, [
      { path: "donor", select: "name phone email bloodGroup" },
      { path: "camp", select: "name date" },
    ]);
  }

  return pagination.buildPaginatedResponse(donations, total, page, limit);
};

// Record/approve donation (atomic operation)
export const recordDonation = async (
  donationId,
  bloodBankId,
  volumeDonated,
) => {
  if (!volumeDonated || volumeDonated <= 0) {
    throw new ApiError(400, "Volume donated must be greater than 0");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get donation with optimized query
    const donation = await donationRepository.findById(donationId, {
      select: "_id bloodBank status donor",
      session,
    });

    if (!donation) {
      throw new ApiError(404, "Donation record not found");
    }

    if (donation.bloodBank.toString() !== bloodBankId.toString()) {
      throw new ApiError(403, "Not authorized to record this donation");
    }

    if (donation.status === "completed") {
      throw new ApiError(400, "This donation has already been recorded");
    }

    const updatedDonation = await donationRepository.updateOne(
      { _id: donationId },
      {
        $set: {
          status: "completed",
          volumeDonated,
          donationDate: new Date(),
          certificateCode: certificateService.generateVerificationCode(),
          certificateIssuedAt: new Date(),
        },
      },
      {
        session,
        returnDocument: "after",
        runValidators: true,
        populate: [
          { path: "donor", select: "name email" },
          { path: "bloodBank", select: "name" },
        ],
      },
    );

    // Update donor info
    await userRepository.updateOne(
      { _id: donation.donor },
      {
        $set: { "donorInfo.lastDonationDate": new Date() },
        $inc: {
          "donorInfo.totalDonations": 1,
          "donorInfo.totalDonatedVolume": volumeDonated,
        },
      },
      { session },
    );

    await createBloodUnit(updatedDonation, session);

    await session.commitTransaction();

    // Async tasks (Email/Notifications) - outside transaction
    if (
      updatedDonation &&
      updatedDonation.donor &&
      updatedDonation.type === "request"
    ) {
      emailService.sendDonationUpdateEmail(
        updatedDonation.donor,
        updatedDonation,
        `Your donation of ${volumeDonated} units was successfully completed and recorded.`,
      ).catch((err) => console.error("Donation record email failed:", err));

      emailService.sendCertificateNotificationEmail(
        updatedDonation.donor,
        updatedDonation,
      ).catch((err) => console.error("Certificate email failed:", err));

      notificationService.createNotification({
        recipient: updatedDonation.donor._id,
        recipientModel: "User",
        title: "Donation Completed ✨",
        message: `Your blood donation of ${volumeDonated} units has been successfully recorded. Your certificate is ready!`,
        type: "donation",
        actionUrl: "/donation-history",
      }).catch((err) => console.error("In-app notification failed:", err));
    }

    cacheManager.del("admin:dashboard_stats");
    return updatedDonation;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Update donation status
export const updateDonationStatus = async (donationId, bloodBankId, status) => {
  const validStatuses = ["pending", "approved", "rejected", "completed"];

  if (!validStatuses.includes(status)) {
    throw new ApiError(
      400,
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    );
  }

  const donation = await donationRepository.findById(donationId, {
    select: "bloodBank status type",
  });

  if (!donation) {
    throw new ApiError(404, "Donation record not found");
  }

  if (donation.bloodBank.toString() !== bloodBankId.toString()) {
    throw new ApiError(403, "Not authorized to update this donation");
  }

  // Atomic update
  const updatedDonation = await donationRepository.updateOne(
    { _id: donationId },
    { $set: { status, updatedAt: new Date() } },
    {
      returnDocument: "after",
      runValidators: true,
      populate: [
        { path: "donor", select: "name email" },
        { path: "bloodBank", select: "name" },
      ],
    },
  );

  // Send status update email (async) - ONLY for personal requests, not camps
  if (
    updatedDonation &&
    updatedDonation.donor &&
    updatedDonation.status !== "completed" &&
    updatedDonation.type === "request"
  ) {
    const message =
      status === "rejected"
        ? "Unfortunately, your donation request was not approved at this time. Please contact the blood bank for details."
        : `Your donation request has been marked as ${status}.`;

    emailService.sendDonationUpdateEmail(
      updatedDonation.donor,
      updatedDonation,
      message,
    ).catch((err) => console.error("Donation status email failed:", err));

    // Create in-app notification
    notificationService.createNotification({
      recipient: updatedDonation.donor._id,
      recipientModel: "User",
      title: "Donation Request Update",
      message: `Your donation request status has been updated to ${status}.`,
      type: "donation",
      actionUrl: "/dashboard",
    }).catch((err) => console.error("In-app notification failed:", err));
  }

  cacheManager.del("admin:dashboard_stats");
  return updatedDonation;
};

// Check donor eligibility
export const checkDonorEligibility = async (donorId) => {
  const user = await userRepository.findById(donorId, {
    select: "donorInfo isDonor",
  });

  if (!user || !user.isDonor) {
    throw new ApiError(403, "User is not a registered donor");
  }

  if (!user.donorInfo?.lastDonationDate) {
    return { eligible: true, message: "Eligible to donate" };
  }

  const lastDate = new Date(user.donorInfo.lastDonationDate);
  const threeMonthsAgo = new Date(Date.now() - DONATION_ELIGIBILITY_PERIOD);

  if (lastDate > threeMonthsAgo) {
    const daysRemaining = Math.ceil(
      (lastDate.getTime() + DONATION_ELIGIBILITY_PERIOD - Date.now()) /
        (24 * 60 * 60 * 1000),
    );
    return {
      eligible: false,
      message: `You can donate again in ${daysRemaining} days`,
      daysRemaining,
    };
  }

  return { eligible: true, message: "Eligible to donate" };
};

// Get donation statistics
export const getDonationStats = async (bloodBankId, query) => {
  const stats = await donationRepository.getStatusStats(bloodBankId);

  const formattedStats = {
    total: 0,
    completed: 0,
    pending: 0,
    rejected: 0,
    totalVolume: 0,
  };

  stats.forEach((stat) => {
    formattedStats.total += stat.count;
    formattedStats[stat._id] = stat.count;
    formattedStats.totalVolume += stat.totalVolume || 0;
  });

  return formattedStats;
};

// Get donation certificate (for download)
export const getDonationCertificate = async (donationId, user) => {
  const donation = await donationRepository.findById(donationId, {
    populate: [
      { path: "donor", select: "name" },
      { path: "bloodBank", select: "name address" },
      { path: "camp", select: "name address" },
    ],
    lean: false,
  });

  if (!donation) {
    throw new ApiError(404, "Donation record not found");
  }

  const userId = user.userId || user._id || user.id;

  // Security check: Only the donor or an admin can download the certificate
  if (
    donation.donor._id.toString() !== userId.toString() &&
    user.role !== "admin"
  ) {
    throw new ApiError(403, "Unauthorized to download this certificate");
  }

  if (donation.status !== "completed") {
    throw new ApiError(
      400,
      "Donation is not completed yet. Certificate not available.",
    );
  }

  const pdfBuffer = await certificateService.generateDonationCertificate(donation);

  return {
    pdfBuffer,
    certificateCode: donation.certificateCode,
  };
};

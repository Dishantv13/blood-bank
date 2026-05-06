import BloodBank from "../models/BloodBank.model.js";
import User from "../models/User.model.js";
import { ApiError } from "../utils/apiError.js";
import {
  sanitizeSearchBloodBankResult,
  sanitizeSearchDonorResult,
} from "../utils/serializers.js";

export const searchBloodAvailability = async ({
  latitude,
  longitude,
  bloodGroup,
  radiusKm = 10,
  type = "all",
}) => {
  if (!latitude || !longitude || !bloodGroup) {
    throw new ApiError(
      400,
      "Latitude, longitude, and blood group are required",
    );
  }

  const radiusInMeters = Number(radiusKm) * 1000;
  const point = {
    type: "Point",
    coordinates: [parseFloat(longitude), parseFloat(latitude)],
  };

  const results = {
    bloodBanks: [],
    donors: [],
  };

  const promises = [];

  if (type === "all" || type === "banks") {
    promises.push(
      BloodBank.aggregate([
        {
          $geoNear: {
            near: point,
            distanceField: "distance",
            maxDistance: radiusInMeters,
            query: { approvalStatus: "approved", isActive: true },
            spherical: true,
          },
        },
        {
          $lookup: {
            from: "inventories",
            localField: "_id",
            foreignField: "bloodBank",
            as: "inventoryData",
          },
        },
        { $unwind: "$inventoryData" },
        {
          $match: {
            "inventoryData.items": {
              $elemMatch: { bloodGroup: bloodGroup, units: { $gt: 0 } },
            },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            address: 1,
            distance: 1,
            isVerified: 1,
            operatingHours: 1,
            availableUnits: {
              $filter: {
                input: "$inventoryData.items",
                as: "item",
                cond: { $eq: ["$$item.bloodGroup", bloodGroup] },
              },
            },
          },
        },
        {
          $addFields: {
            availableUnits: { $arrayElemAt: ["$availableUnits.units", 0] },
          },
        },
      ]).then((banks) => {
        results.bloodBanks = banks.map((bank) =>
          sanitizeSearchBloodBankResult({
            ...bank,
            distanceKm: Number(bank.distance || 0) / 1000,
          }),
        );
      }),
    );
  }

  if (type === "all" || type === "donors") {
    promises.push(
      User.aggregate([
        {
          $geoNear: {
            near: point,
            distanceField: "distance",
            maxDistance: radiusInMeters,
            query: {
              bloodGroup,
              isDonor: true,
              isAvailable: true,
              role: { $in: ["user", "donor"] },
            },
            spherical: true,
          },
        },
        {
          $project: {
            _id: 1,
            bloodGroup: 1,
            isAvailable: 1,
            phone: 1,
            photoURL: 1,
            address: 1,
            distance: 1,
          },
        },
      ]).then((donors) => {
        results.donors = donors.map((donor) =>
          sanitizeSearchDonorResult({
            ...donor,
            distanceKm: Number(donor.distance || 0) / 1000,
          }),
        );
      }),
    );
  }

  await Promise.all(promises);

  return {
    searchCriteria: { latitude, longitude, bloodGroup, radiusKm },
    summary: {
      totalBanks: results.bloodBanks.length,
      totalDonors: results.donors.length,
    },
    results: {
      bloodBanks: results.bloodBanks,
      donors: results.donors,
    },
  };
};

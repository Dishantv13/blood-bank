import bloodBankRepository from "../repositories/BloodBankRepository.js";
import userRepository from "../repositories/UserRepository.js";
import { ApiError } from "../utils/apiError.js";
import * as serializers from "../utils/serializers.js";

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
      bloodBankRepository.searchAvailability(point, radiusInMeters, bloodGroup).then((banks) => {
        results.bloodBanks = banks.map((bank) =>
          serializers.sanitizeSearchBloodBankResult({
            ...bank,
            distanceKm: Number(bank.distance || 0) / 1000,
          }),
        );
      }),
    );
  }

  if (type === "all" || type === "donors") {
    promises.push(
      userRepository.findAvailableDonorsNear(point, radiusInMeters, bloodGroup).then((donors) => {
        results.donors = donors.map((donor) =>
          serializers.sanitizeSearchDonorResult({
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

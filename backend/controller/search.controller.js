import * as locationService from "../services/locationService.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { successResponse } from "../utils/response.js";
import { HTTPS_CODE } from "../utils/httpsCode.js";

export const searchAvailability = asyncHandler(async (req, res) => {
  const { lat, lng, bloodGroup, radius, type } = req.query;

  const results = await locationService.searchBloodAvailability({
    latitude: lat,
    longitude: lng,
    bloodGroup,
    radiusKm: radius,
    type,
  });

  successResponse(res, results, HTTPS_CODE.OK_SUCCESS, "Search results retrieved successfully");
});

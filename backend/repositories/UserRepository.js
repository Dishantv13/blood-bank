import BaseRepository from "./BaseRepository.js";
import User from "../models/User.model.js";

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email) {
    return this.findOne({ email });
  }

  async findNearbyDonors(coordinates, radiusInMeters, bloodGroup) {
    return this.model
      .find({
        location: {
          $near: {
            $geometry: { type: "Point", coordinates },
            $maxDistance: radiusInMeters,
          },
        },
        bloodGroup,
        isDonor: true,
        isAvailable: true,
        role: { $in: ["user", "donor"] },
      })
      .select(
        "_id email phone name bloodGroup location isAvailable isDonor donorInfo lastDonationDate photoURL",
      )
      .limit(100);
  }

  async findMatchingDonors(request, options = {}) {
    const { hospital, requestedBy } = request;
    const { compatibleGroups, maxDistance, limit, threeMonthsAgo } = options;

    const query = {
      isDonor: true,
      isAvailable: true,
      bloodGroup: { $in: compatibleGroups },
      activeMode: "donor",
      _id: { $ne: requestedBy },
      $or: [
        { "donorInfo.lastDonationDate": { $exists: false } },
        { "donorInfo.lastDonationDate": null },
        { "donorInfo.lastDonationDate": { $lte: threeMonthsAgo } },
      ],
    };

    if (hospital?.location?.coordinates?.length === 2) {
      return this.model
        .find({
          ...query,
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: hospital.location.coordinates,
              },
              $maxDistance: maxDistance,
            },
          },
        })
        .select("name email phone bloodGroup location donorInfo")
        .limit(limit)
        .lean();
    }

    return this.model
      .find(query)
      .select("name email phone bloodGroup location donorInfo")
      .limit(limit)
      .lean();
  }

  async getAllUsersPaginated(options = {}) {
    const { query = {}, skip = 0, limit = 10 } = options;

    const pipeline = [
      { $match: query },
      {
        $facet: {
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "bloodrequests",
                localField: "_id",
                foreignField: "requestedBy",
                as: "requests",
              },
            },
            {
              $lookup: {
                from: "donations",
                localField: "_id",
                foreignField: "donor",
                as: "donations",
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
                mobileNumber: "$phone",
                bloodType: { $ifNull: ["$bloodGroup", "$donorInfo.bloodGroup"] },
                requestCount: { $size: "$requests" },
                donationCount: { $size: "$donations" },
                status: {
                  $cond: { if: "$isAvailable", then: "active", else: "inactive" },
                },
                lastDonationDate: 1,
                createdAt: 1,
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    return this.model.aggregate(pipeline);
  }

  async findAvailableDonorsNear(point, radiusInMeters, bloodGroup) {
    return this.model.aggregate([
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
    ]);
  }
}

export default new UserRepository();

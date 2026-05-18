import mongoose from "mongoose";
import BaseRepository from "./BaseRepository.js";
import BloodBank from "../models/BloodBank.model.js";

class BloodBankRepository extends BaseRepository {
  constructor() {
    super(BloodBank);
  }

  async findApprovedBanksWithInventory(options = {}) {
    const start = performance.now();
    const {
      page = 1,
      limit = 10,
      skip = 0,
      bloodGroup,
      latitude,
      longitude,
      maxDistance,
      search,
      excludeId,
    } = options;

    const pipeline = [];

    // 1. Initial filter for approved/active banks
    const matchStage = {
      isActive: true,
      approvalStatus: "approved",
    };

    if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
      matchStage._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }

    if (search && typeof search === "string" && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      matchStage.$or = [
        { name: searchRegex },
        { "address.city": searchRegex },
        { "address.state": searchRegex },
      ];
    }

    // 2. Geospatial search if coordinates provided
    if (latitude && longitude) {
      pipeline.push({
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          distanceField: "distance",
          maxDistance: maxDistance ? parseInt(maxDistance) : 50000,
          query: matchStage,
          spherical: true,
        },
      });
    } else {
      pipeline.push({ $match: matchStage });
    }

    // 3. Optimization: If no bloodGroup filter, paginate BEFORE lookup
    if (!bloodGroup) {
      pipeline.push({ $sort: { createdAt: -1 } });

      // Use $facet to get total count and paginated data separately
      pipeline.push({
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "inventories",
                localField: "_id",
                foreignField: "bloodBank",
                as: "inventoryData",
              },
            },
            {
              $addFields: {
                inventory: {
                  $ifNull: [{ $arrayElemAt: ["$inventoryData.items", 0] }, []],
                },
              },
            },
            {
              $project: {
                name: 1,
                email: 1,
                phone: 1,
                address: 1,
                rating: 1,
                logo: 1,
                imageUrl: 1,
                profileImage: 1,
                location: 1,
                inventory: 1,
                distance: 1,
                isActive: 1,
                isVerified: 1,
                approvalStatus: 1,
                services: 1,
                createdAt: 1,
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      });
    } else {
      // 3b. If bloodGroup filter is present, we must lookup and filter before pagination
      pipeline.push({
        $lookup: {
          from: "inventories",
          localField: "_id",
          foreignField: "bloodBank",
          as: "inventoryData",
        },
      });

      pipeline.push({
        $addFields: {
          inventory: {
            $ifNull: [{ $arrayElemAt: ["$inventoryData.items", 0] }, []],
          },
        },
      });

      pipeline.push({
        $match: {
          inventory: {
            $elemMatch: {
              bloodGroup: bloodGroup,
              units: { $gt: 0 },
            },
          },
        },
      });

      pipeline.push({
        $facet: {
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                name: 1,
                email: 1,
                phone: 1,
                address: 1,
                rating: 1,
                logo: 1,
                imageUrl: 1,
                profileImage: 1,
                location: 1,
                inventory: 1,
                distance: 1,
                isActive: 1,
                isVerified: 1,
                approvalStatus: 1,
                services: 1,
                createdAt: 1,
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      });
    }

    const result = await this.model.aggregate(pipeline);
    const end = performance.now();
    console.log(`[DB] Aggregation took ${(end - start).toFixed(2)}ms`);

    const data = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    return { data, total };
  }

  async findByIdWithPassword(id) {
    return this.model.findById(id).select("+password +tokenVersion");
  }

  async getAllBloodBanksPaginated(options = {}) {
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
              $project: {
                _id: 1,
                name: 1,
                email: 1,
                mobileNumber: { $ifNull: ["$phone", ""] },
                city: { $ifNull: ["$address.city", ""] },
                state: { $ifNull: ["$address.state", ""] },
                status: { $ifNull: ["$approvalStatus", "pending"] },
                isActive: 1,
                isVerified: 1,
                registrationNumber: {
                  $ifNull: [
                    "$registrationNumber",
                    { $ifNull: ["$licenseNumber", ""] },
                  ],
                },
                rejectionReason: { $ifNull: ["$rejectionReason", ""] },
                reviewedAt: 1,
                reviewedBy: { $ifNull: ["$reviewedBy", ""] },
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

  async getByIdWithInventory(bankId, fields = "") {
    const pipeline = [
      { $match: { _id: new BloodBank.base.Types.ObjectId(bankId) } },
      {
        $lookup: {
          from: "inventories",
          localField: "_id",
          foreignField: "bloodBank",
          as: "inventoryData",
        },
      },
      {
        $project: {
          ...fields.split(" ").reduce((acc, field) => {
            if (field) acc[field] = 1;
            return acc;
          }, {}),
          inventory: { $arrayElemAt: ["$inventoryData.items", 0] },
        },
      },
    ];

    const result = await this.model.aggregate(pipeline);
    return result[0];
  }

  async searchAvailability(point, radiusInMeters, bloodGroup) {
    return this.model.aggregate([
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
          phone: 1,
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
    ]);
  }

  async getPendingBloodBanks(limit = 5) {
    return this.model
      .find({ approvalStatus: "pending" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("name email phone address createdAt")
      .lean();
  }
}

export default new BloodBankRepository();

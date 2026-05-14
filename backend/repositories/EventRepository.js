import BaseRepository from "./BaseRepository.js";
import Event from "../models/Event.model.js";

class EventRepository extends BaseRepository {
  constructor() {
    super(Event);
  }

  async findByOrganizer(organizerId, model = "BloodBank", options = {}) {
    const { populate, sort } = options;
    const query = { organizedBy: organizerId, organizerModel: model };
    
    if (populate) {
      return this.model.find(query).populate(populate).sort(sort || { date: 1 });
    }
    return this.model.find(query).sort(sort || { date: 1 });
  }

  async searchEvents(filter, options = {}) {
    const { latitude, longitude, maxDistance = 50000, skip = 0, limit = 10 } =
      options;
    const pipeline = [];

    // 1. Geo-near if coordinates provided
    if (latitude && longitude) {
      pipeline.push({
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          distanceField: "distance",
          maxDistance: maxDistance,
          query: filter,
          spherical: true,
        },
      });
    } else {
      pipeline.push({ $match: filter });
      pipeline.push({ $sort: { date: 1 } });
    }

    // 2. Facet for data and total count
    pipeline.push({
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: "bloodbanks",
              localField: "organizedBy",
              foreignField: "_id",
              as: "organizedByInfo",
            },
          },
          {
            $addFields: {
              organizedBy: { $arrayElemAt: ["$organizedByInfo", 0] },
            },
          },
          {
            $project: {
              organizedByInfo: 0,
              "organizedBy.password": 0,
              "organizedBy.tokenVersion": 0,
              "organizedBy.inventory": 0,
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    });

    const result = await this.model.aggregate(pipeline);
    const data = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    return { data, total };
  }

  async getEventStats(bloodBankId) {
    return this.aggregate([
      {
        $match: {
          organizedBy: new Event.base.Types.ObjectId(bloodBankId),
          organizerModel: "BloodBank",
        },
      },
      {
        $facet: {
          total: [{ $count: "count" }],
          upcoming: [
            { $match: { date: { $gte: new Date() }, isActive: true } },
            { $count: "count" },
          ],
          totalRegistrations: [
            { $unwind: "$registeredDonors" },
            { $count: "count" },
          ],
        },
      },
    ]);
  }

  async getAllEventsPaginated(options = {}) {
    const { query = {}, skip = 0, limit = 10 } = options;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );

    const pipeline = [
      { $match: query },
      {
        $facet: {
          data: [
            { $sort: { date: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "bloodbanks",
                localField: "organizedBy",
                foreignField: "_id",
                as: "organizedByInfo",
              },
            },
            {
              $addFields: {
                organizedBy: { $arrayElemAt: ["$organizedByInfo", 0] },
              },
            },
            {
              $project: {
                _id: 1,
                name: "$title",
                bloodBankId: { $ifNull: ["$organizedBy._id", "$organizedBy"] },
                bloodBankName: { $ifNull: ["$organizedBy.name", { $ifNull: ["$organizer", "-"] }] },
                description: 1,
                startDate: "$date",
                endDate: "$date",
                location: {
                  $ifNull: [
                    "$location.name",
                    { $ifNull: ["$location.address", "-"] },
                  ],
                },
                status: {
                  $cond: [
                    { $eq: ["$isActive", false] },
                    "cancelled",
                    {
                      $cond: [
                        { $lt: ["$date", todayStart] },
                        "completed",
                        {
                          $cond: [
                            {
                              $and: [
                                { $gte: ["$date", todayStart] },
                                { $lt: ["$date", todayEnd] },
                              ],
                            },
                            "ongoing",
                            "scheduled",
                          ],
                        },
                      ],
                    },
                  ],
                },
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

  async getUserDashboardStats(userId, now) {
    const userObjectId = new Event.base.Types.ObjectId(userId);
    return this.aggregate([
      {
        $facet: {
          upcoming: [
            { $match: { date: { $gte: now }, isActive: true } },
            { $count: "count" },
          ],
          registered: [
            { $match: { registeredDonors: userObjectId, date: { $gte: now } } },
            { $count: "count" },
          ],
        },
      },
    ]);
  }
}

export default new EventRepository();

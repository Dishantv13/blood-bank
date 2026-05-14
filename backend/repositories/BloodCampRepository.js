import BaseRepository from "./BaseRepository.js";
import BloodCamp from "../models/BloodCamp.model.js";

class BloodCampRepository extends BaseRepository {
  constructor() {
    super(BloodCamp);
  }

  async searchCamps(filter, options = {}) {
    const { skip = 0, limit = 10, sort = { date: 1 } } = options;

    const pipeline = [
      { $match: filter },
      { $sort: sort },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "bloodbanks",
                localField: "organizer",
                foreignField: "_id",
                as: "organizerInfo",
              },
            },
            {
              $addFields: {
                organizer: { $arrayElemAt: ["$organizerInfo", 0] },
              },
            },
            {
              $project: {
                organizerInfo: 0,
                "organizer.password": 0,
                "organizer.tokenVersion": 0,
                "organizer.inventory": 0,
                "organizer.refreshTokens": 0,
                "organizer.passwordReset": 0,
                "organizer.authSession": 0,
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await this.model.aggregate(pipeline);
    const data = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    return { data, total };
  }

  async findByOrganizer(bloodBankId, options = {}) {
    return this.find({ organizer: bloodBankId }, options);
  }

  async getAllCampsPaginated(options = {}) {
    const { query = {}, skip = 0, limit = 10 } = options;

    const pipeline = [
      { $match: query },
      {
        $facet: {
          data: [
            { $sort: { date: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                name: 1,
                bloodBankId: "$organizer",
                bloodBankName: { $ifNull: ["$organizerName", "-"] },
                location: {
                  $ifNull: [
                    {
                      $trim: {
                        input: {
                          $concat: [
                            { $ifNull: ["$venue", ""] },
                            { $cond: [{ $and: ["$venue", "$city"] }, ", ", ""] },
                            { $ifNull: ["$city", ""] },
                          ],
                        },
                      },
                    },
                    { $ifNull: ["$address", "-"] },
                  ],
                },
                startDate: "$date",
                endDate: "$date",
                status: 1,
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
}

export default new BloodCampRepository();

import BaseRepository from "./BaseRepository.js";
import Donation from "../models/Donation.model.js";

class DonationRepository extends BaseRepository {
  constructor() {
    super(Donation);
  }

  async findByDonor(donorId, options = {}) {
    return this.find({ donor: donorId }, options);
  }

  async findByBloodBank(bloodBankId, options = {}) {
    return this.find({ bloodBank: bloodBankId }, options);
  }

  async countByDonor(donorId) {
    return this.count({ donor: donorId });
  }

  async countByBloodBank(bloodBankId) {
    return this.count({ bloodBank: bloodBankId });
  }

  async getAllDonationsPaginated(options = {}) {
    const { matchStage = {}, skip = 0, limit = 10 } = options;

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "users",
          localField: "donor",
          foreignField: "_id",
          as: "donorData",
          pipeline: [{ $project: { name: 1 } }],
        },
      },
      { $addFields: { donorName: { $arrayElemAt: ["$donorData.name", 0] } } },
      {
        $facet: {
          data: [
            { $sort: { donationDate: -1, createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                donorName: { $ifNull: ["$donorName", "Unknown"] },
                bloodType: "$bloodGroup",
                quantity: {
                  $round: [
                    { $multiply: [{ $ifNull: ["$volumeDonated", 0] }, 1000] },
                    0,
                  ],
                },
                status: 1,
                donationDate: { $ifNull: ["$donationDate", "$createdAt"] },
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

  async getUserDonationSummary(userId) {
    const userObjectId = new Donation.base.Types.ObjectId(userId);
    return this.aggregate([
      { $match: { donor: userObjectId, status: "completed" } },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalCount: { $sum: 1 },
                totalVolume: { $sum: "$volumeDonated" },
              },
            },
          ],
          latest: [
            { $sort: { donationDate: -1 } },
            { $limit: 1 },
            { $project: { _id: 0, donationDate: 1 } },
          ],
        },
      },
    ]);
  }

  async getStatusStats(bloodBankId) {
    return this.aggregate([
      { $match: { bloodBank: new Donation.base.Types.ObjectId(bloodBankId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalVolume: { $sum: "$volumeDonated" },
        },
      },
    ]);
  }

  async getRecentDonations(bloodBankId, limit = 5) {
    const filter = { status: "completed" };
    if (bloodBankId) {
      filter.bloodBank = new Donation.base.Types.ObjectId(bloodBankId);
    }
    return this.model
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({ path: "donor", select: "name" })
      .select("donor bloodGroup volumeDonated donationDate")
      .lean();
  }
}

export default new DonationRepository();

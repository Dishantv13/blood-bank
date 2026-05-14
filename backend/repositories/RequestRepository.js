import BaseRepository from "./BaseRepository.js";
import BloodRequest from "../models/BloodRequest.model.js";

class RequestRepository extends BaseRepository {
  constructor() {
    super(BloodRequest);
  }

  async findByRequester(userId, options = {}) {
    return this.find({ requestedBy: userId }, options);
  }

  async findForBloodBank(bloodBankId, options = {}) {
    // Legacy mapping or specific complex filters
    return this.find(
      {
        $or: [{ bloodBank: bloodBankId }, { targetBloodBank: bloodBankId }],
      },
      options,
    );
  }

  async getStatusStats(bloodBankId) {
    return this.aggregate([
      {
        $match: {
          targetBloodBank: new BloodRequest.base.Types.ObjectId(bloodBankId),
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalUnits: { $sum: "$units" },
        },
      },
    ]);
  }

  async getFacetedStats(bloodBankId) {
    const bankId = new BloodRequest.base.Types.ObjectId(bloodBankId);
    return this.aggregate([
      {
        $facet: {
          total: [{ $count: "count" }],
          pending: [{ $match: { status: "pending" } }, { $count: "count" }],
          approved: [
            { $match: { bloodBank: bankId, status: "approved" } },
            { $count: "count" },
          ],
          rejected: [
            { $match: { bloodBank: bankId, status: "rejected" } },
            { $count: "count" },
          ],
          byBloodGroup: [
            { $match: { status: "pending" } },
            { $group: { _id: "$bloodGroup", count: { $sum: 1 } } },
          ],
          byUrgency: [
            { $match: { status: "pending" } },
            { $group: { _id: "$urgency", count: { $sum: 1 } } },
          ],
        },
      },
    ]);
  }

  async getDashboardStats(bloodBankId) {
    const bankId = new BloodRequest.base.Types.ObjectId(bloodBankId);
    return this.aggregate([
      {
        $facet: {
          pending: [{ $match: { status: "pending" } }, { $count: "count" }],
          approved: [
            { $match: { bloodBank: bankId, status: "approved" } },
            { $count: "count" },
          ],
          thisMonth: [
            {
              $match: {
                bloodBank: bankId,
                createdAt: {
                  $gte: new Date(
                    new Date().getFullYear(),
                    new Date().getMonth(),
                    1,
                  ),
                },
              },
            },
            { $count: "count" },
          ],
        },
      },
    ]);
  }

  async getUserDashboardStats(userId, sixMonthsAgo) {
    const userObjectId = new BloodRequest.base.Types.ObjectId(userId);
    return this.aggregate([
      {
        $facet: {
          myRequests: [
            { $match: { requestedBy: userObjectId } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ],
          bloodGroups: [
            { $match: { status: "pending" } },
            { $group: { _id: "$bloodGroup", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          urgency: [
            { $match: { status: "pending" } },
            { $group: { _id: "$urgency", count: { $sum: 1 } } },
          ],
          monthlyTrend: [
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ],
        },
      },
    ]);
  }

  async getRecentRequests(limit = 5) {
    return this.model
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("patientName bloodGroup units hospital urgency status createdAt")
      .lean();
  }

  async getAllRequestsPaginated(options = {}) {
    const { query = {}, skip = 0, limit = 10 } = options;

    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: "users",
          localField: "requestedBy",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $lookup: {
          from: "bloodbanks",
          localField: "requestingBloodBank",
          foreignField: "_id",
          as: "bankInfo",
        },
      },
      {
        $addFields: {
          requesterName: {
            $cond: {
              if: { $eq: ["$requestType", "user"] },
              then: { $arrayElemAt: ["$userInfo.name", 0] },
              else: { $arrayElemAt: ["$bankInfo.name", 0] },
            },
          },
        },
      },
      {
        $facet: {
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                patientName: 1,
                requesterName: { $ifNull: ["$requesterName", "-"] },
                requestType: 1,
                bloodType: "$bloodGroup",
                quantity: "$units",
                hospital: {
                  $ifNull: ["$hospital.name", { $ifNull: ["$hospital.address", "-"] }],
                },
                urgency: {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$urgency", "critical"] }, then: "high" },
                      { case: { $eq: ["$urgency", "urgent"] }, then: "medium" },
                      { case: { $eq: ["$urgency", "normal"] }, then: "low" },
                    ],
                    default: "$urgency",
                  },
                },
                status: 1,
                requestedAt: "$createdAt",
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

export default new RequestRepository();

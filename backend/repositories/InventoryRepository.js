import BaseRepository from "./BaseRepository.js";
import Inventory from "../models/Inventory.model.js";

class InventoryRepository extends BaseRepository {
  constructor() {
    super(Inventory);
  }

  async findByBloodBank(bloodBankId) {
    return this.findOne({ bloodBank: bloodBankId });
  }

  async findMultipleByBloodBanks(bloodBankIds) {
    return this.find({ bloodBank: { $in: bloodBankIds } });
  }

  async getInventoryOverview(options = {}) {
    const { skip = 0, limit = 10, matchStage = {}, bloodType } = options;

    const pipeline = [
      { $match: matchStage },
      {
        $addFields: {
          filteredItems: {
            $filter: {
              input: "$items",
              as: "item",
              cond: bloodType ? { $eq: ["$$item.bloodGroup", bloodType] } : true,
            },
          },
        },
      },
      { $match: { $expr: { $gt: [{ $size: "$filteredItems" }, 0] } } },
      {
        $facet: {
          data: [
            { $sort: { updatedAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                bloodBank: "$bloodBankName",
                totalUnits: { $sum: "$filteredItems.units" },
                bloodTypeCount: { $size: "$filteredItems" },
                lastUpdated: { $ifNull: ["$lastModified", "$updatedAt"] },
                inventory: {
                  $map: {
                    input: "$filteredItems",
                    as: "item",
                    in: {
                      bloodType: "$$item.bloodGroup",
                      quantity: "$$item.units",
                      lastUpdated: {
                        $ifNull: [
                          "$$item.lastUpdated",
                          { $ifNull: ["$lastModified", "$updatedAt"] },
                        ],
                      },
                    },
                  },
                },
              },
            },
          ],
          stats: [
            { $unwind: "$filteredItems" },
            {
              $group: {
                _id: "$filteredItems.bloodGroup",
                total: { $sum: "$filteredItems.units" },
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    return this.model.aggregate(pipeline);
  }

  async getBloodTypeDistribution() {
    return this.model.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.bloodGroup",
          totalUnits: { $sum: "$items.units" },
        },
      },
    ]);
  }
}

export default new InventoryRepository();

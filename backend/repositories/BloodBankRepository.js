import BaseRepository from "./BaseRepository.js";
import BloodBank from "../models/BloodBank.model.js";

class BloodBankRepository extends BaseRepository {
  constructor() {
    super(BloodBank);
  }

  async findApprovedBanksInRange(coordinates, radiusInMeters, bloodGroup) {
    return this.model
      .find({
        location: {
          $near: {
            $geometry: { type: "Point", coordinates },
            $maxDistance: radiusInMeters,
          },
        },
        approvalStatus: "approved",
        isActive: true,
        "inventory.bloodGroup": bloodGroup,
        "inventory.units": { $gt: 0 },
      })
      .select("name email phone address inventory location")
      .lean();
  }

  async findByIdWithPassword(id) {
    return this.model.findById(id).select("+password +tokenVersion");
  }
}

export default new BloodBankRepository();

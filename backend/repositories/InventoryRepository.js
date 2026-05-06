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
}

export default new InventoryRepository();

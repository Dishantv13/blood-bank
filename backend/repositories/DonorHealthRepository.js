import BaseRepository from "./BaseRepository.js";
import DonorHealth from "../models/DonorHealth.model.js";

class DonorHealthRepository extends BaseRepository {
  constructor() {
    super(DonorHealth);
  }
}

export default new DonorHealthRepository();

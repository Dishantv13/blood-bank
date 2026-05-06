import BaseRepository from "./BaseRepository.js";
import AuditLog from "../models/AuditLog.model.js";

class AuditLogRepository extends BaseRepository {
  constructor() {
    super(AuditLog);
  }

  async findByTarget(targetId, options = {}) {
    return this.find(
      { target: targetId },
      { sort: { timestamp: -1 }, ...options },
    );
  }

  async findByActor(actorId, options = {}) {
    return this.find(
      { actor: actorId },
      { sort: { timestamp: -1 }, ...options },
    );
  }
}

export default new AuditLogRepository();

import auditLogRepository from '../repositories/AuditLogRepository.js';

export const logAction = async ({
  action,
  req,
  actorId,
  actorModel,
  targetId,
  targetModel,
  changes,
  metadata
}) => {
  try {
    const logEntry = {
      action,
      actor: actorId || req?.user?.userId || req?.bloodBank?.bloodBankId || req?.admin?.adminId,
      actorModel: actorModel || (req?.user ? 'User' : req?.bloodBank ? 'BloodBank' : req?.admin ? 'Admin' : 'User'),
      target: targetId,
      targetModel,
      changes,
      ip: req?.ip || req?.headers['x-forwarded-for'],
      userAgent: req?.get('user-agent'),
      metadata,
    };

    // Skip if actor is missing and cannot be inferred
    if (!logEntry.actor) {
      console.warn(`[AUDIT] Skipping log: No actor found for action: ${action}`);
      return;
    }

    await auditLogRepository.create(logEntry);
    
    console.log(`[AUDIT] Action: ${action} | Actor: ${logEntry.actor} | Target: ${logEntry.target}`);
  } catch (error) {
    // Audit logging should never break the main flow
    console.error(`[AUDIT] Logging failed for action: ${action}`, error);
  }
};

export const getTargetLogs = async (targetId, query = {}) => {
  const { limit = 50, skip = 0 } = query;
  return await auditLogRepository.findByTarget(targetId, { limit, skip });
};

export const getActorLogs = async (actorId, query = {}) => {
  const { limit = 50, skip = 0 } = query;
  return await auditLogRepository.findByActor(actorId, { limit, skip });
};

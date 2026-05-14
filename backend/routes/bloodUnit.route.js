import { Router } from "express";
import { bloodBankAuth } from "../middleware/auth.js";
import * as bloodUnitController from "../controller/bloodUnit.controller.js";

const router = Router();

router
  .route("/units")
  .get(bloodBankAuth, bloodUnitController.getIndividualInventory);

router
  .route("/units/expiring")
  .get(bloodBankAuth, bloodUnitController.getExpiringUnits);
router
  .route("/units/:unitId/screening")
  .patch(bloodBankAuth, bloodUnitController.updateScreeningStatus);
router
  .route("/units/:unitId/refine")
  .post(bloodBankAuth, bloodUnitController.refineBloodUnit);
router
  .route("/units/:unitId/cold-chain")
  .post(bloodBankAuth, bloodUnitController.addColdChainLog);

router
  .route("/units/:unitId/split")
  .post(bloodBankAuth, bloodUnitController.splitBloodUnit);

export default router;

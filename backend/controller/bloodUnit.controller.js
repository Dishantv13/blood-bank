import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse } from '../utils/response.js';
import * as bloodUnitService from '../services/bloodUnitService.js';

const getBloodBankId = (req) => req.bloodBank.bloodBankId || req.bloodBank.id;

export const getIndividualInventory = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const result = await bloodUnitService.getBloodBankInventoryDetails(getBloodBankId(req), req.query);
  successResponse(res, result, 200, 'Individual blood units fetched successfully');
});

export const getExpiringUnits = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const result = await bloodUnitService.getExpiringUnits(getBloodBankId(req), req.query.days);
  successResponse(res, result, 200, 'Expiring units fetched successfully');
});

export const updateScreeningStatus = asyncHandler(async (req, res) => {
  const result = await bloodUnitService.updateScreeningResults(
    req.params.unitId,
    req.body.results,
    getBloodBankId(req)
  );
  successResponse(res, result, 200, 'Screening results updated successfully');
});

export const addColdChainLog = asyncHandler(async (req, res) => {
  const result = await bloodUnitService.recordColdChain(
    req.params.unitId,
    req.body,
    getBloodBankId(req)
  );
  successResponse(res, result, 201, 'Cold chain log added successfully');
});

export const refineBloodUnit = asyncHandler(async (req, res) => {
  const result = await bloodUnitService.refineBloodUnit(
    req.params.unitId,
    req.body.method,
    getBloodBankId(req)
  );
  successResponse(res, result, 201, 'Blood unit refined successfully');
});

export const splitBloodUnit = asyncHandler(async (req, res) => {
  const result = await bloodUnitService.splitComponent(
    req.params.unitId,
    req.body.components,
    getBloodBankId(req)
  );
  successResponse(res, result, 201, 'Blood unit split into components successfully');
});

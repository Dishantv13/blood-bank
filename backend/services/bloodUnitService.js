import mongoose from "mongoose";
import crypto from "crypto";
import BloodUnit from "../models/BloodUnit.model.js";
import { ApiError } from "../utils/apiError.js";
import * as inventoryService from "./inventoryService.js";

const COMPONENT_EXPIRY_DAYS = {
  "Whole Blood": 35,
  RBC: 42,
  Platelets: 5,
  Plasma: 365,
  Cryoprecipitate: 365,
};

export const createBloodUnit = async (donation, session = null) => {
  const collectionDate = donation.donationDate || new Date();

  const componentType = "Whole Blood";
  const expiryDays = COMPONENT_EXPIRY_DAYS[componentType];
  const expiryDate = new Date(collectionDate);
  expiryDate.setDate(expiryDate.getDate() + expiryDays);

  const unitId = `UNIT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const batchNumber = `BATCH-${new Date().getFullYear()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

  const bloodUnit = await BloodUnit.create(
    [
      {
        unitId,
        batchNumber,
        donation: donation._id,
        donor: donation.donor._id || donation.donor,
        bloodBank: donation.bloodBank,
        bloodGroup: donation.bloodGroup,
        componentType,
        volume: donation.volumeDonated || 450,
        collectionDate,
        expiryDate,
        status: "raw",
        screeningStatus: "pending",
      },
    ],
    { session },
  );

  return bloodUnit[0];
};

export const refineBloodUnit = async (unitId, refineMethod, adminId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const rawUnit = await BloodUnit.findOne({ unitId, status: "raw" }).session(
      session,
    );
    if (!rawUnit)
      throw new ApiError(404, "Raw blood unit not found or already processed");

    const createdUnits = [];
    let totalYieldVolume = 0;

    const componentSpecs =
      refineMethod === "separate"
        ? [
            { type: "RBC", volume: 280 },
            { type: "Plasma", volume: 220 },
            { type: "Platelets", volume: 50 },
          ]
        : [{ type: "Whole Blood", volume: rawUnit.volume }];

    for (const spec of componentSpecs) {
      const expiryDays = COMPONENT_EXPIRY_DAYS[spec.type];
      const expiryDate = new Date(rawUnit.collectionDate);
      expiryDate.setDate(expiryDate.getDate() + expiryDays);

      const newUnitId = `${rawUnit.unitId}-${spec.type.substring(0, 3).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

      const newUnit = await BloodUnit.create(
        [
          {
            unitId: newUnitId,
            batchNumber: rawUnit.batchNumber,
            donation: rawUnit.donation,
            donor: rawUnit.donor,
            bloodBank: rawUnit.bloodBank,
            bloodGroup: rawUnit.bloodGroup,
            componentType: spec.type,
            volume: spec.volume,
            collectionDate: rawUnit.collectionDate,
            expiryDate,
            status: "quarantine",
            screeningStatus: "pending",
          },
        ],
        { session },
      );

      createdUnits.push(newUnit[0]);
      totalYieldVolume += spec.volume;
    }

    const wastage = Math.max(0, rawUnit.volume - totalYieldVolume);

    rawUnit.status = "processed";
    rawUnit.discardDetails = {
      reason: `Refined via ${refineMethod}`,
      discardedAt: new Date(),
      discardedBy: adminId,
      remarks: `Yielded ${createdUnits.length} components. Theoretical wastage: ${wastage}ml`,
    };
    await rawUnit.save({ session });

    await session.commitTransaction();

    return {
      units: createdUnits,
      wastage,
      yieldVolume: totalYieldVolume,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const updateScreeningResults = async (unitId, results, adminId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const unit = await BloodUnit.findOne({ unitId }).session(session);
    if (!unit) throw new ApiError(404, "Blood unit not found");

    if (unit.screeningStatus !== "pending") {
      throw new ApiError(
        400,
        "Unit screening results have already been recorded",
      );
    }

    unit.screeningResults = {
      ...unit.screeningResults,
      ...results,
      testedAt: new Date(),
      testedBy: adminId,
    };

    const tests = ["hiv", "hbv", "hcv", "syphilis", "malaria"];
    const allNegative = tests.every(
      (test) => unit.screeningResults[test] === "negative",
    );
    const anyPositive = tests.some(
      (test) => unit.screeningResults[test] === "positive",
    );

    if (anyPositive) {
      unit.screeningStatus = "failed";
      unit.status = "discarded";
      unit.discardDetails = {
        reason: "Failed medical screening",
        discardedAt: new Date(),
        discardedBy: adminId,
      };
    } else if (allNegative) {
      unit.screeningStatus = "passed";
      unit.status = "available";

      // Atomic inventory increment
      await inventoryService.addInventoryUnits(
        unit.bloodBank,
        unit.bloodGroup,
        1,
        session,
      );
    }

    await unit.save({ session });
    await session.commitTransaction();
    return unit;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const recordColdChain = async (unitId, data, adminId) => {
  const unit = await BloodUnit.findOne({ unitId });
  if (!unit) throw new ApiError(404, "Blood unit not found");

  unit.coldChain.push({
    temperature: data.temperature,
    location: data.location,
    remarks: data.remarks,
    recordedBy: adminId,
    recordedAt: new Date(),
  });

  await unit.save();
  return unit;
};

export const getExpiringUnits = async (bloodBankId, days = 7) => {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + days);

  return await BloodUnit.find({
    bloodBank: bloodBankId,
    status: "available",
    expiryDate: { $lte: thresholdDate, $gt: new Date() },
  }).sort({ expiryDate: 1 });
};

export const getBloodBankInventoryDetails = async (bloodBankId, query = {}) => {
  if (!bloodBankId || !mongoose.Types.ObjectId.isValid(bloodBankId)) {
    throw new ApiError(400, "Invalid Blood Bank ID format");
  }
  const { status, componentType, bloodGroup, page = 1, limit = 10 } = query;

  const now = new Date();
  const filter = { bloodBank: new mongoose.Types.ObjectId(bloodBankId) };

  // Adjust filter to handle dynamic expiration status
  if (status) {
    if (status === "expired") {
      filter.$or = [
        { status: "expired" },
        {
          status: { $in: ["available", "raw", "quarantine", "reserved"] },
          expiryDate: { $lt: now },
        },
      ];
    } else if (status === "available") {
      filter.status = "available";
      filter.expiryDate = { $gte: now };
    } else {
      filter.status = status;
    }
  } else {
    // Default refined inventory view: Exclude 'raw' (shown in separate tab)
    // and 'processed' (discarded parent units)
    filter.status = { $nin: ["raw", "processed"] };
  }

  if (componentType) filter.componentType = componentType;
  if (bloodGroup) filter.bloodGroup = bloodGroup;

  const skip = (page - 1) * limit;

  const pipeline = [
    { $match: filter },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          {
            $addFields: {
              isExpired: {
                $cond: [
                  {
                    $and: [
                      { $lt: ["$expiryDate", now] },
                      {
                        $in: [
                          "$status",
                          ["available", "raw", "quarantine", "reserved"],
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
          {
            $addFields: {
              displayStatus: {
                $cond: [{ $eq: ["$isExpired", 1] }, "expired", "$status"],
              },
            },
          },
          { $sort: { isExpired: 1, expiryDate: 1 } },
          { $skip: skip },
          { $limit: Number(limit) },
          {
            $lookup: {
              from: "users",
              localField: "donor",
              foreignField: "_id",
              as: "donor",
            },
          },
          { $unwind: { path: "$donor", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              unitId: 1,
              batchNumber: 1,
              bloodGroup: 1,
              componentType: 1,
              volume: 1,
              status: "$displayStatus",
              collectionDate: 1,
              expiryDate: 1,
              screeningStatus: 1,
              screeningResults: 1,
              coldChain: 1,
              "donor.name": 1,
              "donor.bloodGroup": 1,
              "donor._id": 1,
            },
          },
        ],
      },
    },
  ];

  const [result] = await BloodUnit.aggregate(pipeline);
  const units = result.data || [];
  const total = result.metadata[0]?.total || 0;

  return {
    units,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const splitComponent = async (unitId, components, adminId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sourceUnit = await BloodUnit.findOne({
      unitId,
      status: { $in: ["available", "quarantine", "raw"] },
    }).session(session);
    if (!sourceUnit)
      throw new ApiError(
        404,
        "Source unit not found or unavailable for splitting",
      );

    const totalSplitVolume = components.reduce(
      (acc, c) => acc + Number(c.volume),
      0,
    );
    if (totalSplitVolume > sourceUnit.volume) {
      throw new ApiError(
        400,
        `Total split volume (${totalSplitVolume}ml) exceeds source unit volume (${sourceUnit.volume}ml)`,
      );
    }

    const createdUnits = [];
    for (const comp of components) {
      const expiryDays = COMPONENT_EXPIRY_DAYS[comp.type] || 35;
      const expiryDate = new Date(sourceUnit.collectionDate);
      expiryDate.setDate(expiryDate.getDate() + expiryDays);

      const newUnit = await BloodUnit.create(
        [
          {
            unitId: `${sourceUnit.unitId}-S${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
            batchNumber: sourceUnit.batchNumber,
            donation: sourceUnit.donation,
            donor: sourceUnit.donor,
            bloodBank: sourceUnit.bloodBank,
            bloodGroup: sourceUnit.bloodGroup,
            componentType: comp.type,
            volume: comp.volume,
            collectionDate: sourceUnit.collectionDate,
            expiryDate,
            status:
              sourceUnit.status === "raw" ? "quarantine" : sourceUnit.status,
            screeningStatus: sourceUnit.screeningStatus,
          },
        ],
        { session },
      );

      createdUnits.push(newUnit[0]);
    }

    sourceUnit.status = "processed";
    sourceUnit.discardDetails = {
      reason: "Split into smaller units/components",
      discardedAt: new Date(),
      discardedBy: adminId,
    };
    await sourceUnit.save({ session });

    await session.commitTransaction();
    return createdUnits;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

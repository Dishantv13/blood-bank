import inventoryRepository from "../repositories/InventoryRepository.js";
import { ApiError } from "../utils/apiError.js";
import { invalidateBloodBankCaches } from "../utils/cacheInvalidation.js";
import * as validationService from "./validationService.js";

// Get blood bank inventory
export const getInventory = async (bloodBankId) => {
  const inventory = await inventoryRepository.findOne({
    bloodBank: bloodBankId,
  });

  if (!inventory) {
    throw new ApiError(404, "Inventory record not found");
  }

  return inventory;
};

// Update blood group units (atomic operation - single query)
export const updateInventoryUnits = async (
  bloodBankId,
  bloodGroup,
  units,
  operation = "set",
  session = null,
) => {
  validationService.validateBloodGroup(bloodGroup);
  validationService.validateInventoryUpdate({ bloodGroup, units });

  const updateOps = {
    $set: {
      "items.$.lastUpdated": new Date(),
    },
  };

  const queryFilter = {
    bloodBank: bloodBankId,
    items: {
      $elemMatch: { bloodGroup },
    },
  };

  if (operation === "set") {
    updateOps.$set["items.$.units"] = units;
  } else if (operation === "add") {
    updateOps.$inc = { "items.$.units": units };
  } else if (operation === "subtract") {
    updateOps.$inc = { "items.$.units": -units };
    // CONCURRENCY FIX: Use $elemMatch to ensure the SAME element has enough units
    queryFilter.items.$elemMatch.units = { $gte: units };
  } else {
    throw new ApiError(400, `Unsupported inventory operation: ${operation}`);
  }

  const updatedInventory = await inventoryRepository.model
    .findOneAndUpdate(queryFilter, updateOps, {
      returnDocument: "after",
      runValidators: true,
      session,
    })
    .select("items")
    .lean();

  if (!updatedInventory) {
    // If it's a subtraction, failure might mean insufficient units
    if (operation === "subtract") {
      const currentStock = await getAvailableUnits(bloodBankId, bloodGroup);
      if (currentStock < units) {
        throw new ApiError(
          400,
          `Insufficient ${bloodGroup} units. Available: ${currentStock}, Requested: ${units}`,
        );
      }
    }
    throw new ApiError(404, "Inventory or blood group not found");
  }

  const updatedItem = updatedInventory.items.find(
    (item) => item.bloodGroup === bloodGroup,
  );
  if (!updatedItem) {
    throw new ApiError(404, `${bloodGroup} inventory not found`);
  }

  invalidateBloodBankCaches(bloodBankId);
  return updatedItem;
};

// Add inventory units
export const addInventoryUnits = async (
  bloodBankId,
  bloodGroup,
  units,
  session = null,
) => {
  if (!units || units <= 0) {
    throw new ApiError(400, "Units must be greater than 0");
  }

  return updateInventoryUnits(bloodBankId, bloodGroup, units, "add", session);
};

// Subtract inventory units
export const subtractInventoryUnits = async (
  bloodBankId,
  bloodGroup,
  units,
  session = null,
) => {
  if (!units || units <= 0) {
    throw new ApiError(400, "Units must be greater than 0");
  }

  return updateInventoryUnits(
    bloodBankId,
    bloodGroup,
    units,
    "subtract",
    session,
  );
};

// Check if sufficient units available
export const checkInventoryAvailability = async (
  bloodBankId,
  bloodGroup,
  requiredUnits,
) => {
  validationService.validateBloodGroup(bloodGroup);
  validationService.validateInventoryUpdate({ bloodGroup, units: requiredUnits });

  const inventory = await inventoryRepository.findOne(
    { bloodBank: bloodBankId },
    { select: "items" },
  );
  if (!inventory) {
    throw new ApiError(404, "Inventory record not found");
  }

  const item = inventory.items.find((i) => i.bloodGroup === bloodGroup);

  if (!item) {
    throw new ApiError(404, `Blood group ${bloodGroup} not found in inventory`);
  }

  return item.units >= requiredUnits;
};

// Get available units for a blood group
export const getAvailableUnits = async (bloodBankId, bloodGroup) => {
  validationService.validateBloodGroup(bloodGroup);

  const inventory = await inventoryRepository.findOne(
    { bloodBank: bloodBankId },
    { select: "items" },
  );
  if (!inventory) {
    throw new ApiError(404, "Inventory record not found");
  }

  const item = inventory.items.find((i) => i.bloodGroup === bloodGroup);

  if (!item) {
    throw new ApiError(404, `Blood group ${bloodGroup} not found in inventory`);
  }

  return item.units;
};

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

// Update blood group units (atomic operation)
export const updateInventoryUnits = async (
  bloodBankId,
  bloodGroup,
  componentType = "Whole Blood",
  units,
  operation = "set",
  session = null,
) => {
  validationService.validateBloodGroup(bloodGroup);

  const inventory = await inventoryRepository.model.findOne(
    { bloodBank: bloodBankId },
    null,
    { session }
  );

  if (!inventory) {
    throw new ApiError(404, "Inventory record not found");
  }

  // Find or create the blood group item
  let item = inventory.items.find((i) => i.bloodGroup === bloodGroup);
  if (!item) {
    item = { bloodGroup, units: 0, components: [], lastUpdated: new Date() };
    inventory.items.push(item);
    // Re-find to get the reference in the array
    item = inventory.items[inventory.items.length - 1];
  }

  if (componentType === "Whole Blood") {
    // Update main units
    if (operation === "set") item.units = units;
    else if (operation === "add") item.units += units;
    else if (operation === "subtract") {
      if (item.units < units) throw new ApiError(400, `Insufficient ${bloodGroup} Whole Blood units`);
      item.units -= units;
    }
  } else {
    // Update nested component
    let comp = (item.components || []).find((c) => c.componentType === componentType);
    if (!comp) {
      comp = { componentType, units: 0, lastUpdated: new Date() };
      if (!item.components) item.components = [];
      item.components.push(comp);
      comp = item.components[item.components.length - 1];
    }

    if (operation === "set") comp.units = units;
    else if (operation === "add") comp.units += units;
    else if (operation === "subtract") {
      if (comp.units < units) throw new ApiError(400, `Insufficient ${bloodGroup} ${componentType} units`);
      comp.units -= units;
    }
    comp.lastUpdated = new Date();
  }

  item.lastUpdated = new Date();
  await inventory.save({ session });
  
  invalidateBloodBankCaches(bloodBankId);
  return item;
};

export const addInventoryUnits = async (
  bloodBankId,
  bloodGroup,
  units,
  componentType = "Whole Blood",
  session = null,
) => {
  if (!units || units <= 0) {
    throw new ApiError(400, "Units must be greater than 0");
  }

  return updateInventoryUnits(bloodBankId, bloodGroup, componentType, units, "add", session);
};

export const subtractInventoryUnits = async (
  bloodBankId,
  bloodGroup,
  units,
  componentType = "Whole Blood",
  session = null,
) => {
  if (!units || units <= 0) {
    throw new ApiError(400, "Units must be greater than 0");
  }

  return updateInventoryUnits(
    bloodBankId,
    bloodGroup,
    componentType,
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
  validationService.validateInventoryUpdate({
    bloodGroup,
    units: requiredUnits,
  });

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

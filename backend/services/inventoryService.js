import bloodBankRepository from '../repositories/BloodBankRepository.js';
import inventoryRepository from '../repositories/InventoryRepository.js';
import { validateInventoryUpdate, validateBloodGroup } from './validationService.js';
import { ApiError } from '../utils/apiError.js';

const syncBloodBankInventoryItem = async (bloodBankId, bloodGroup, units) => {
  await bloodBankRepository.updateOne(
    { _id: bloodBankId, 'inventory.bloodGroup': bloodGroup },
    {
      $set: {
        'inventory.$.units': units,
        'inventory.$.lastUpdated': new Date(),
      },
    }
  );
};

// Get blood bank inventory
export const getInventory = async (bloodBankId) => {
  // Optimized query - only fetch needed fields
  const inventory = await bloodBankRepository.findById(bloodBankId, {
    select: 'inventory name'
  });
  
  if (!inventory) {
    throw new Error('Blood bank not found');
  }

  return inventory;
};

// Update blood group units (atomic operation - single query)
export const updateInventoryUnits = async (bloodBankId, bloodGroup, units, operation = 'set') => {
  validateBloodGroup(bloodGroup);
  validateInventoryUpdate({ bloodGroup, units });

  const inventoryDoc = await inventoryRepository.findOne({ bloodBank: bloodBankId }, { lean: false });
  if (!inventoryDoc) {
    throw new ApiError(404, 'Inventory record not found for this blood bank');
  }

  const targetItem = inventoryDoc.items.find((item) => item.bloodGroup === bloodGroup);
  if (!targetItem) {
    throw new ApiError(404, `${bloodGroup} inventory not found`);
  }

  if (operation === 'subtract' && targetItem.units < units) {
    throw new ApiError(400, `Insufficient ${bloodGroup} units available`);
  }

  const updateOps = {
    $set: {
      'items.$.lastUpdated': new Date(),
    },
  };

  if (operation === 'set') {
    updateOps.$set['items.$.units'] = units;
  } else if (operation === 'add') {
    updateOps.$inc = { 'items.$.units': units };
  } else if (operation === 'subtract') {
    updateOps.$inc = { 'items.$.units': -units };
  } else {
    throw new ApiError(400, `Unsupported inventory operation: ${operation}`);
  }

  const updatedInventory = await inventoryRepository.model.findOneAndUpdate(
    { bloodBank: bloodBankId, 'items.bloodGroup': bloodGroup },
    updateOps,
    { new: true, runValidators: true }
  ).select('items').lean();

  if (!updatedInventory) {
    throw new ApiError(404, 'Inventory or blood group not found');
  }

  const updatedItem = updatedInventory.items.find((item) => item.bloodGroup === bloodGroup);
  if (!updatedItem) {
    throw new ApiError(404, `${bloodGroup} inventory not found`);
  }

  await syncBloodBankInventoryItem(bloodBankId, bloodGroup, updatedItem.units);

  return updatedItem;
};

// Add inventory units
export const addInventoryUnits = async (bloodBankId, bloodGroup, units) => {
  if (!units || units <= 0) {
    throw new ApiError(400, 'Units must be greater than 0');
  }

  return updateInventoryUnits(bloodBankId, bloodGroup, units, 'add');
};

// Subtract inventory units
export const subtractInventoryUnits = async (bloodBankId, bloodGroup, units) => {
  if (!units || units <= 0) {
    throw new ApiError(400, 'Units must be greater than 0');
  }

  const inventoryItem = await updateInventoryUnits(bloodBankId, bloodGroup, units, 'subtract');
  
  if (inventoryItem.units < 0) {
    throw new ApiError(400, `Insufficient ${bloodGroup} units available`);
  }

  return inventoryItem;
};

// Get inventory from Inventory collection (backup)
export const getInventoryFromCollection = async (bloodBankId) => {
  const inventory = await inventoryRepository.findOne({ bloodBank: bloodBankId }, {
    select: 'items bloodBankName'
  });
  
  if (!inventory) {
    throw new ApiError(404, 'Inventory record not found');
  }

  return inventory;
};

// Update inventory in Inventory collection (atomic)
export const updateInventoryInCollection = async (bloodBankId, bloodGroup, units, operation = 'set') => {
  validateBloodGroup(bloodGroup);
  validateInventoryUpdate({ bloodGroup, units });

  const updateOps = {
    $set: { 'items.$.lastUpdated': new Date() }
  };

  if (operation === 'add') {
    updateOps.$inc = { 'items.$.units': units };
  } else if (operation === 'subtract') {
    updateOps.$inc = { 'items.$.units': -units };
  } else {
    updateOps.$set['items.$.units'] = units;
  }

  const updatedInventory = await inventoryRepository.model.findOneAndUpdate(
    { bloodBank: bloodBankId, 'items.bloodGroup': bloodGroup },
    updateOps,
    { new: true, runValidators: true }
  ).select('items').lean();

  if (!updatedInventory) {
    throw new ApiError(404, 'Inventory or blood group not found');
  }

  const updatedItem = updatedInventory.items.find(item => item.bloodGroup === bloodGroup);
  
  if (updatedItem && updatedItem.units < 0) {
    throw new ApiError(400, `Insufficient ${bloodGroup} units available`);
  }

  return updatedItem;
};

// Check if sufficient units available
export const checkInventoryAvailability = async (bloodBankId, bloodGroup, requiredUnits) => {
  validateBloodGroup(bloodGroup);
  validateInventoryUpdate({ bloodGroup, units: requiredUnits });

  const inventory = await inventoryRepository.findOne({ bloodBank: bloodBankId }, { select: 'items' });
  if (!inventory) {
    throw new ApiError(404, 'Inventory record not found');
  }

  const item = inventory.items.find((i) => i.bloodGroup === bloodGroup);
  
  if (!item) {
    throw new ApiError(404, `Blood group ${bloodGroup} not found in inventory`);
  }

  return item.units >= requiredUnits;
};

// Get available units for a blood group
export const getAvailableUnits = async (bloodBankId, bloodGroup) => {
  validateBloodGroup(bloodGroup);

  const inventory = await inventoryRepository.findOne({ bloodBank: bloodBankId }, { select: 'items' });
  if (!inventory) {
    throw new ApiError(404, 'Inventory record not found');
  }

  const item = inventory.items.find((i) => i.bloodGroup === bloodGroup);
  
  if (!item) {
    throw new ApiError(404, `Blood group ${bloodGroup} not found in inventory`);
  }

  return item.units;
};

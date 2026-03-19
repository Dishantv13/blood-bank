// Shared blood bank inventory data to ensure consistency across the app
export const capitalHospitalInventory = [
  { bloodGroup: 'A+', units: 0, lastUpdated: new Date() },
  { bloodGroup: 'A-', units: 0, lastUpdated: new Date() },
  { bloodGroup: 'B+', units: 0, lastUpdated: new Date() },
  { bloodGroup: 'B-', units: 0, lastUpdated: new Date() },
  { bloodGroup: 'AB+', units: 0, lastUpdated: new Date() },
  { bloodGroup: 'AB-', units: 0, lastUpdated: new Date() },
  { bloodGroup: 'O+', units: 0, lastUpdated: new Date() },
  { bloodGroup: 'O-', units: 0, lastUpdated: new Date() }
];

// Function to get inventory status based on units
export const getInventoryStatus = (units) => {
  if (units >= 50) return 'good';
  if (units >= 30) return 'low';
  return 'critical';
};

// Function to update inventory (can be used by both dashboards)
export const updateInventoryUnits = (inventory, bloodGroup, change) => {
  return inventory.map(item => {
    if (item.bloodGroup === bloodGroup) {
      const newUnits = Math.max(0, item.units + change);
      return {
        ...item,
        units: newUnits,
        lastUpdated: new Date()
      };
    }
    return item;
  });
};

// Convert to format expected by Blood Bank Dashboard (legacy format)
export const toLegacyFormat = (inventory) => {
  return inventory.map(item => ({
    type: item.bloodGroup,
    units: item.units,
    status: getInventoryStatus(item.units)
  }));
};

// Convert from legacy format to standard format
export const fromLegacyFormat = (legacyInventory) => {
  return legacyInventory.map(item => ({
    bloodGroup: item.type,
    units: item.units,
    lastUpdated: new Date()
  }));
};

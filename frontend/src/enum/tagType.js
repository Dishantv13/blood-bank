export const TAGS = {
  // Custom tags for Blood Bank
  EVENT: "Event",
  BLOOD_BANK: "BloodBank",
  REQUEST: "Request",
  BLOOD_CAMP: "BloodCamp",
  DONATION: "Donation",
  USER: "User",
  DASHBOARD: "Dashboard",
  INVENTORY_ITEM: "InventoryItem",
};

export const TAG_IDS = {
  CURRENT_USER: "CURRENT",
  LIST: "LIST",
  SUMMARY: "SUMMARY",
};

export const tagList = (type) => [{ type, id: TAG_IDS.LIST }];

export const tagById = (type, id) => [{ type, id }];

export const tagListWithIds = (type, data) =>
  Array.isArray(data)
    ? [
        ...data.map((item) => ({ type, id: item._id || item.id })),
        { type, id: TAG_IDS.LIST },
      ]
    : [{ type, id: TAG_IDS.LIST }];

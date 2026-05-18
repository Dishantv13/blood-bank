import {
  updateInventoryUnits,
  addInventoryUnits,
  subtractInventoryUnits,
  checkInventoryAvailability,
} from "../../services/inventoryService.js";
import Inventory from "../../models/Inventory.model.js";
import mongoose from "mongoose";

describe("Inventory Service Unit Tests", () => {
  let bloodBankId;

  beforeEach(async () => {
    bloodBankId = new mongoose.Types.ObjectId();
    // Initialize a mock inventory for the blood bank
    await Inventory.create({
      bloodBank: bloodBankId,
      bloodBankName: "Test Blood Bank",
      items: [
        { bloodGroup: "A+", units: 10 },
        { bloodGroup: "B+", units: 5 },
        { bloodGroup: "O+", units: 0 },
      ],
    });
  });

  test("Should correctly add units to inventory", async () => {
    await addInventoryUnits(bloodBankId, "A+", 5);
    const inv = await Inventory.findOne({ bloodBank: bloodBankId });
    const item = inv.items.find((i) => i.bloodGroup === "A+");
    expect(item.units).toBe(15);
  });

  test("Should correctly subtract units from inventory", async () => {
    await subtractInventoryUnits(bloodBankId, "B+", 2);
    const inv = await Inventory.findOne({ bloodBank: bloodBankId });
    const item = inv.items.find((i) => i.bloodGroup === "B+");
    expect(item.units).toBe(3);
  });

  test("Should fail to subtract more units than available (Atomic Check)", async () => {
    await expect(subtractInventoryUnits(bloodBankId, "B+", 10)).rejects.toThrow(
      "Insufficient B+ Whole Blood units",
    );

    // Ensure value didn't change
    const inv = await Inventory.findOne({ bloodBank: bloodBankId });
    const item = inv.items.find((i) => i.bloodGroup === "B+");
    expect(item.units).toBe(5);
  });

  test("Should correctly check availability", async () => {
    const available = await checkInventoryAvailability(bloodBankId, "A+", 10);
    const unavailable = await checkInventoryAvailability(bloodBankId, "A+", 11);

    expect(available).toBe(true);
    expect(unavailable).toBe(false);
  });

  test("Should fail for invalid blood group", async () => {
    await expect(addInventoryUnits(bloodBankId, "Z+", 5)).rejects.toThrow();
  });

  test("Should update lastUpdated timestamp on change", async () => {
    const before = await Inventory.findOne({ bloodBank: bloodBankId });
    const oldTimestamp = before.items.find(
      (i) => i.bloodGroup === "A+",
    ).lastUpdated;

    // Wait a tiny bit to ensure timestamp changes
    await new Promise((resolve) => setTimeout(resolve, 10));

    await addInventoryUnits(bloodBankId, "A+", 1);

    const after = await Inventory.findOne({ bloodBank: bloodBankId });
    const newTimestamp = after.items.find(
      (i) => i.bloodGroup === "A+",
    ).lastUpdated;

    expect(newTimestamp.getTime()).toBeGreaterThan(oldTimestamp.getTime());
  });
});

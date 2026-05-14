import bloodCampRepository from "../repositories/BloodCampRepository.js";
import eventRepository from "../repositories/EventRepository.js";
import inventoryRepository from "../repositories/InventoryRepository.js";
import requestRepository from "../repositories/RequestRepository.js";
import * as exportHelper from "../utils/exportHelper.js";

export const exportInventoryData = async (bloodBankId) => {
  const inventory = await inventoryRepository.findOne({
    bloodBank: bloodBankId,
  });
  const items = inventory?.items || [];

  const rows = items.map((item) => ({
    "Blood Group": item.bloodGroup || item.type,
    Units: item.units,
    "Last Updated": item.lastUpdated
      ? new Date(item.lastUpdated).toLocaleString()
      : "N/A",
  }));

  const buffer = await exportHelper.buildWorkbookBuffer("Inventory", rows);
  return {
    buffer,
    fileName: `inventory_${new Date().toISOString().split("T")[0]}.xlsx`,
  };
};

export const exportCampReports = async (bloodBankId) => {
  const camps = await bloodCampRepository.find({ organizer: bloodBankId });

  const rows = camps.map((camp) => ({
    "Camp Name": camp.name,
    Date: camp.date ? new Date(camp.date).toLocaleDateString() : "N/A",
    Venue: camp.venue,
    City: camp.city,
    "Target Units": camp.targetUnits || 0,
    "Donors Registered": camp.registeredDonors?.length || 0,
    Status: camp.status,
  }));

  const buffer = await exportHelper.buildWorkbookBuffer("Camps", rows);
  return {
    buffer,
    fileName: `camps_report_${new Date().toISOString().split("T")[0]}.xlsx`,
  };
};

export const exportAllData = async (bloodBankId) => {
  const [inventory, camps, events, requests] = await Promise.all([
    inventoryRepository.findOne({ bloodBank: bloodBankId }),
    bloodCampRepository.find({ organizer: bloodBankId }),
    eventRepository.find({
      organizedBy: bloodBankId,
      organizerModel: "BloodBank",
    }),
    requestRepository.find({
      $or: [
        { bloodBank: bloodBankId },
        { targetBloodBank: bloodBankId },
        { requestingBloodBank: bloodBankId },
      ],
    }),
  ]);

  const inventoryRows = (inventory?.items || []).map((i) => ({
    "Blood Group": i.bloodGroup,
    Units: i.units,
    "Last Updated": i.lastUpdated
      ? new Date(i.lastUpdated).toLocaleString()
      : "N/A",
  }));

  const campRows = camps.map((c) => ({
    Name: c.name,
    Date: c.date ? new Date(c.date).toLocaleDateString() : "N/A",
    Venue: c.venue,
    Donors: c.registeredDonors?.length || 0,
    Status: c.status,
  }));

  const eventRows = events.map((e) => ({
    Title: e.title,
    Date: e.date ? new Date(e.date).toLocaleDateString() : "N/A",
    Type: e.eventType,
    Registrations: e.registeredDonors?.length || 0,
  }));

  const requestRows = requests.map((r) => ({
    "Request Type": r.requestType,
    "Blood Group": r.bloodGroup,
    Units: r.units,
    Patient: r.patientName,
    Status: r.status,
    Date: new Date(r.createdAt).toLocaleDateString(),
  }));

  const sheetsData = [
    { name: "Inventory", rows: inventoryRows },
    { name: "Camps", rows: campRows },
    { name: "Events", rows: eventRows },
    { name: "Requests", rows: requestRows },
  ];

  const buffer = await exportHelper.buildMultiSheetWorkbookBuffer(sheetsData);
  return {
    buffer,
    fileName: `full_data_export_${new Date().toISOString().split("T")[0]}.xlsx`,
  };
};

import ExcelJS from 'exceljs';
import User from '../models/User.model.js';
import BloodRequest from '../models/BloodRequest.model.js';
import BloodBank from '../models/BloodBank.model.js';
import BloodCamp from '../models/BloodCamp.model.js';
import Event from '../models/Event.model.js';

const buildWorkbookBuffer = async (sheetName, rows) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    sheet.addRow(headers);
    rows.forEach((row) => sheet.addRow(headers.map((h) => row[h])));
  }

  return workbook.xlsx.writeBuffer();
};

export const exportUsers = async () => {
  const users = await User.find().select('-password').lean();
  const rows = users.map((user) => ({
    Name: user.name,
    Email: user.email,
    Phone: user.phone || 'N/A',
    BloodGroup: user.bloodGroup || 'N/A',
    Role: user.role,
    IsDonor: user.isDonor ? 'Yes' : 'No',
    CreatedAt: new Date(user.createdAt).toLocaleDateString()
  }));
  return { buffer: await buildWorkbookBuffer('Users', rows), filename: 'users.xlsx' };
};

export const exportRequests = async () => {
  const requests = await BloodRequest.find()
    .populate('requestedBy', 'name email phone')
    .populate('bloodBank', 'name phone')
    .lean();

  const rows = requests.map((req) => ({
    RequestId: req._id.toString(),
    RequesterName: req.requestedBy?.name || 'Unknown',
    BloodGroup: req.bloodGroup,
    Units: req.units,
    BloodBank: req.bloodBank?.name || 'N/A',
    Status: req.status,
    Urgency: req.urgency,
    RequiredBy: req.requiredBy ? new Date(req.requiredBy).toLocaleDateString() : 'N/A'
  }));

  return { buffer: await buildWorkbookBuffer('Requests', rows), filename: 'blood_requests.xlsx' };
};

export const exportBloodBanks = async () => {
  const banks = await BloodBank.find().select('-password').lean();
  const rows = banks.map((bank) => ({
    Name: bank.name,
    Email: bank.email,
    Phone: bank.phone,
    LicenseNumber: bank.licenseNumber,
    City: bank.address?.city || 'N/A',
    State: bank.address?.state || 'N/A',
    CreatedAt: new Date(bank.createdAt).toLocaleDateString()
  }));

  return { buffer: await buildWorkbookBuffer('BloodBanks', rows), filename: 'blood_banks.xlsx' };
};

export const exportCamps = async () => {
  const camps = await BloodCamp.find().populate('organizer', 'name email phone').lean();
  const rows = camps.map((camp) => ({
    CampName: camp.name,
    Organizer: camp.organizerName || camp.organizer?.name || 'Unknown',
    Date: new Date(camp.date).toLocaleDateString(),
    Venue: camp.venue,
    City: camp.city,
    Status: camp.status
  }));

  return { buffer: await buildWorkbookBuffer('BloodCamps', rows), filename: 'blood_camps.xlsx' };
};

export const exportEvents = async () => {
  const events = await Event.find().lean();
  const rows = events.map((event) => ({
    Title: event.title,
    Date: new Date(event.date).toLocaleDateString(),
    Organizer: event.organizer,
    EventType: event.eventType,
    Visibility: event.visibility,
    Active: event.isActive ? 'Yes' : 'No'
  }));

  return { buffer: await buildWorkbookBuffer('Events', rows), filename: 'events.xlsx' };
};
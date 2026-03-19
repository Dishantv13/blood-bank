import ExcelJS from 'exceljs';
import User from '../models/User.model.js';
import BloodRequest from '../models/BloodRequest.model.js';
import BloodBank from '../models/BloodBank.model.js';
import BloodCamp from '../models/BloodCamp.model.js';
import Event from '../models/Event.model.js';

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};

// Export all users to Excel
const exportUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').lean();
    
    const data = users.map(user => ({
      Name: user.name,
      Email: user.email,
      Phone: user.phone || 'N/A',
      'Blood Group': user.bloodGroup || 'N/A',
      Role: user.role,
      'Is Donor': user.isDonor ? 'Yes' : 'No',
      'Last Donation': user.lastDonation ? new Date(user.lastDonation).toLocaleDateString() : 'Never',
      City: user.city || 'N/A',
      State: user.state || 'N/A',
      'Created At': new Date(user.createdAt).toLocaleDateString(),
    }));

    const worksheet = ExcelJS.utils.json_to_sheet(data);
    const workbook = ExcelJS.utils.book_new();
    ExcelJS.utils.book_append_sheet(workbook, worksheet, 'Users');

    const buffer = ExcelJS.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting users:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Export all blood requests to Excel
const exportRequests = async (req, res) => {
  try {
    const requests = await BloodRequest.find()
      .populate('userId', 'name email phone')
      .populate('bloodBankId', 'name phone')
      .lean();
    
    const data = requests.map(request => ({
      'Request ID': request._id,
      'Requester Name': request.userId?.name || 'Unknown',
      'Requester Email': request.userId?.email || 'N/A',
      'Requester Phone': request.userId?.phone || 'N/A',
      'Blood Group': request.bloodGroup,
      Units: request.units,
      'Blood Bank': request.bloodBankId?.name || 'N/A',
      'Bank Phone': request.bloodBankId?.phone || 'N/A',
      Status: request.status,
      Urgency: request.urgency,
      'Required Date': new Date(request.requiredDate).toLocaleDateString(),
      'Created At': new Date(request.createdAt).toLocaleDateString(),
    }));

    const worksheet = ExcelJS.utils.json_to_sheet(data);
    const workbook = ExcelJS.utils.book_new();
    ExcelJS.utils.book_append_sheet(workbook, worksheet, 'Requests');

    const buffer = ExcelJS.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=blood_requests.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Export all blood banks to Excel
const exportBloodBanks = async (req, res) => {
  try {
    const bloodBanks = await BloodBank.find().select('-password').lean();
    
    const data = bloodBanks.map(bank => ({
      Name: bank.name,
      Email: bank.email,
      Phone: bank.phone,
      'License Number': bank.licenseNumber,
      Address: bank.address,
      City: bank.city,
      State: bank.state,
      'Operating Hours': bank.operatingHours || 'N/A',
      'A+': bank.inventory?.['A+'] || 0,
      'A-': bank.inventory?.['A-'] || 0,
      'B+': bank.inventory?.['B+'] || 0,
      'B-': bank.inventory?.['B-'] || 0,
      'AB+': bank.inventory?.['AB+'] || 0,
      'AB-': bank.inventory?.['AB-'] || 0,
      'O+': bank.inventory?.['O+'] || 0,
      'O-': bank.inventory?.['O-'] || 0,
      'Created At': new Date(bank.createdAt).toLocaleDateString(),
    }));

    const worksheet = ExcelJS.utils.json_to_sheet(data);
    const workbook = ExcelJS.utils.book_new();
    ExcelJS.utils.book_append_sheet(workbook, worksheet, 'Blood Banks');

    const buffer = ExcelJS.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=blood_banks.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting blood banks:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Export all blood camps to Excel
const exportCamps = async (req, res) => {
  try {
    const camps = await BloodCamp.find()
      .populate('organizedBy', 'name email phone')
      .lean();
    
    const data = camps.map(camp => ({
      'Camp Name': camp.name,
      'Organizer Name': camp.organizedBy?.name || 'Unknown',
      'Organizer Email': camp.organizedBy?.email || 'N/A',
      'Organizer Phone': camp.organizedBy?.phone || 'N/A',
      Date: new Date(camp.date).toLocaleDateString(),
      Time: camp.time,
      Location: camp.location,
      'Expected Donors': camp.expectedDonors,
      'Blood Collected': camp.bloodCollected || 0,
      'Registered Users': camp.registeredUsers?.length || 0,
      Status: camp.status,
      'Created At': new Date(camp.createdAt).toLocaleDateString(),
    }));

    const worksheet = ExcelJS.utils.json_to_sheet(data);
    const workbook = ExcelJS.utils.book_new();
    ExcelJS.utils.book_append_sheet(workbook, worksheet, 'Blood Camps');

    const buffer = ExcelJS.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=blood_camps.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting camps:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Export all events to Excel
const exportEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('organizer', 'name email')
      .lean();
    
    const data = events.map(event => ({
      Title: event.title,
      Description: event.description,
      Date: new Date(event.date).toLocaleDateString(),
      Time: event.time,
      Location: event.location,
      'Organizer Name': event.organizer?.name || 'Unknown',
      'Organizer Email': event.organizer?.email || 'N/A',
      'Max Participants': event.maxParticipants || 'Unlimited',
      'Registered Count': event.registeredUsers?.length || 0,
      'Created At': new Date(event.createdAt).toLocaleDateString(),
    }));

    const worksheet = ExcelJS.utils.json_to_sheet(data);
    const workbook = ExcelJS.utils.book_new();
    ExcelJS.utils.book_append_sheet(workbook, worksheet, 'Events');

    const buffer = ExcelJS.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=events.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting events:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


export { 
  isAdmin,
  exportUsers,
  exportRequests,
  exportBloodBanks,
  exportCamps,
  exportEvents
};
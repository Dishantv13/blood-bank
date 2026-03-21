import * as adminService from '../services/adminService.js';

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
  const result = await adminService.exportUsers();
  res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(result.buffer);
};

// Export all blood requests to Excel
const exportRequests = async (req, res) => {
  const result = await adminService.exportRequests();
  res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(result.buffer);
};

// Export all blood banks to Excel
const exportBloodBanks = async (req, res) => {
  const result = await adminService.exportBloodBanks();
  res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(result.buffer);
};

// Export all blood camps to Excel
const exportCamps = async (req, res) => {
  const result = await adminService.exportCamps();
  res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(result.buffer);
};

// Export all events to Excel
const exportEvents = async (req, res) => {
  const result = await adminService.exportEvents();
  res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(result.buffer);
};


export { 
  isAdmin,
  exportUsers,
  exportRequests,
  exportBloodBanks,
  exportCamps,
  exportEvents
};
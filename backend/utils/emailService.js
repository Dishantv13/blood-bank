import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, 'emailTemplates');

/**
 * Escapes HTML special characters to prevent injection in email templates.
 */
const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD 
  }
});

// Email Queue
const emailQueue = [];
let isProcessing = false;

const processQueue = async () => {
  if (isProcessing || emailQueue.length === 0) return;
  isProcessing = true;
  
  while (emailQueue.length > 0) {
    const { to, subject, html } = emailQueue.shift();
    try {
      await transporter.sendMail({
        from: `"RaktSarthi" <${process.env.EMAIL_USER || 'noreply@raktsarthi.com'}>`,
        to,
        subject,
        html
      });
    } catch (error) {
      console.error('Email queue processing error:', error);
      // Optional: Add retry logic here
    }
    // Small delay between emails to respect provider limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  isProcessing = false;
};

const queueEmail = (to, subject, html) => {
  emailQueue.push({ to, subject, html });
  processQueue();
};

const getTemplate = async (templateName, data) => {
  try {
    const filePath = path.join(templatesDir, `${templateName}.html`);
    let content = await fs.readFile(filePath, 'utf8');
    
    // Simple template engines like replacement
    Object.keys(data).forEach(key => {
      const value = data[key];
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value);
    });
    
    return content;
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    return null;
  }
};

const generateUnsubscribeUrl = (email) => {
  const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET || 'secret', { expiresIn: '365d' });
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${baseUrl}/unsubscribe?token=${token}`;
};

// --- Email Functions ---

const sendPasswordResetEmail = async (email, resetToken, userType = 'user') => {
  const resetUrl = userType === 'bloodbank' 
    ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/blood-bank-reset-password?token=${resetToken}`
    : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
  const subject = userType === 'bloodbank' ? 'Blood Bank - Password Reset Request' : 'Password Reset Request - RaktSarthi';
  
  // For legacy support or critical path, keep the inline template or move it to a file
  // Let's use the file-based approach for consistency if we created it
  const html = await getTemplate('passwordReset', { resetUrl, userType, subject }) || `Reset your password here: ${resetUrl}`;
  queueEmail(email, subject, html);
};

const sendWelcomeEmail = async (email, name) => {
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
  const unsubscribeUrl = generateUnsubscribeUrl(email);
  const html = await getTemplate('welcome', { 
    name: escapeHtml(name), 
    dashboardUrl, 
    unsubscribeUrl 
  });
  if (html) queueEmail(email, 'Welcome to RaktSarthi! 🩸', html);
};

const sendRequestReceivedEmail = async (bloodBank, request) => {
  const requestUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/blood-bank-requests`;
  const html = await getTemplate('requestReceived', {
    bloodBankName: escapeHtml(bloodBank.name),
    patientName: escapeHtml(request.patientName),
    bloodGroup: request.bloodGroup,
    urgency: request.urgency,
    units: request.units,
    contactNumber: request.contactNumber,
    requestUrl
  });
  if (html) queueEmail(bloodBank.email, 'New Urgent Blood Request Received', html);
};

const sendRequestStatusUpdateEmail = async (user, request, remarks) => {
  const requestUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
  const unsubscribeUrl = generateUnsubscribeUrl(user.email);
  
  let statusColor = '#10b981'; // Success green
  if (request.status === 'rejected') statusColor = '#ef4444';
  if (request.status === 'pending') statusColor = '#f59e0b';

  const html = await getTemplate('requestStatusChange', {
    userName: escapeHtml(user.name),
    patientName: escapeHtml(request.patientName),
    bloodBankName: escapeHtml(request.bloodBank?.name || 'Blood Bank'),
    status: request.status.toUpperCase(),
    statusColor,
    remarks: escapeHtml(remarks || 'No specific remarks provided.'),
    requestUrl,
    unsubscribeUrl
  });
  if (html) queueEmail(user.email, `Update on your Blood Request: ${request.status}`, html);
};

const sendDonationUpdateEmail = async (user, donation, message) => {
  const historyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
  const unsubscribeUrl = generateUnsubscribeUrl(user.email);
  
  let headerColor = '#3b82f6'; 
  let icon = '🩸';
  if (donation.status === 'completed') { headerColor = '#10b981'; icon = '✨'; }
  if (donation.status === 'rejected') { headerColor = '#ef4444'; icon = 'ℹ️'; }

  const html = await getTemplate('donationUpdate', {
    userName: escapeHtml(user.name),
    donationDate: new Date(donation.donationDate).toLocaleDateString(),
    status: donation.status.toUpperCase(),
    message: escapeHtml(message),
    headerColor,
    icon,
    boxColor: donation.status === 'rejected' ? '#fef2f2' : '#eff6ff',
    borderColor: donation.status === 'rejected' ? '#fecaca' : '#bfdbfe',
    statusColor: headerColor,
    historyUrl,
    unsubscribeUrl
  });
  if (html) queueEmail(user.email, 'Your Donation Record has been Updated', html);
};

const sendDonationReminderEmail = async (user) => {
  const eventsUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events`;
  const unsubscribeUrl = generateUnsubscribeUrl(user.email);
  const html = await getTemplate('donationReminder', {
    name: escapeHtml(user.name),
    lastDonationDate: new Date(user.lastDonationDate).toLocaleDateString(),
    bloodGroup: user.bloodGroup,
    eventsUrl,
    unsubscribeUrl
  });
  if (html) queueEmail(user.email, 'You are eligible to save a life again! 🦸‍♂️', html);
};

const sendRegistrationConfirmationEmail = async (user, type, entity) => {
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
  const unsubscribeUrl = generateUnsubscribeUrl(user.email);
  const templateName = type === 'camp' ? 'campRegistration' : 'eventRegistration';
  
  const html = await getTemplate(templateName, {
    userName: escapeHtml(user.name),
    title: escapeHtml(entity.name || entity.title),
    date: new Date(entity.date).toLocaleDateString(),
    time: `${entity.startTime} - ${entity.endTime}`,
    venue: escapeHtml(entity.venue || entity.location?.name || 'TBD'),
    organizer: escapeHtml(entity.organizerName || entity.organizer || 'Blood Bank'),
    dashboardUrl,
    unsubscribeUrl
  });
  if (html) queueEmail(user.email, `${type.charAt(0).toUpperCase() + type.slice(1)} Registration Confirmed`, html);
};

const sendBloodBankApprovalEmail = async (email, bloodBankName) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/blood-bank-login`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Approved!</h2>
      <p>Hello ${escapeHtml(bloodBankName)}, your registration is approved.</p>
      <a href="${loginUrl}">Login Now</a>
    </div>
  `; // Fallback or use a template
  queueEmail(email, 'Blood Bank Approved', html);
};

const sendWeeklyInventoryDigest = async (bloodBank, stats) => {
  const inventoryUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/blood-bank-inventory`;
  const html = await getTemplate('weeklyDigest', {
    bloodBankName: escapeHtml(bloodBank.name),
    totalRequests: stats.totalRequests,
    totalDonations: stats.totalDonations,
    lowInventoryGroups: stats.lowInventoryGroups.join(', ') || 'None',
    inventoryUrl
  });
  if (html) queueEmail(bloodBank.email, 'Weekly Inventory Digest - RaktSarthi', html);
};

const verifyEmailSetup = async () => {
  try {
    await transporter.verify();
    console.log('Email service is ready');
    return true;
  } catch (error) {
    console.error('Email verification failed:', error);
    return false;
  }
};

const sendBloodBankRegistrationOtpEmail = async (email, otp, options = {}) => {
  const html = await getTemplate('bloodBankOtp', { 
    otp, 
    expiresInMinutes: options.expiresInMinutes || 10 
  });
  if (html) queueEmail(email, 'Blood Bank Registration - Your OTP', html);
};

const sendUserRegistrationOtpEmail = async (email, otp, options = {}) => {
  const html = await getTemplate('userOtp', { 
    otp, 
    expiresInMinutes: options.expiresInMinutes || 10 
  });
  if (html) queueEmail(email, 'Verify your email - RaktSarthi Registration', html);
};

const sendBloodBankRejectionEmail = async (email, bloodBankName, rejectionReason) => {
  const html = await getTemplate('bloodBankRejection', {
    bloodBankName: escapeHtml(bloodBankName),
    rejectionReason: escapeHtml(rejectionReason)
  });
  if (html) queueEmail(email, 'Update on your Blood Bank Registration', html);
};

export {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendRequestReceivedEmail,
  sendRequestStatusUpdateEmail,
  sendDonationUpdateEmail,
  sendDonationReminderEmail,
  sendRegistrationConfirmationEmail,
  sendBloodBankApprovalEmail,
  sendBloodBankRejectionEmail,
  sendBloodBankRegistrationOtpEmail,
  sendUserRegistrationOtpEmail,
  sendWeeklyInventoryDigest,
  verifyEmailSetup
};

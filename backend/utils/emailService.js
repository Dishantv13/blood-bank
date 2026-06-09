import nodemailer from "nodemailer";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "emailTemplates");

// Escapes HTML special characters to prevent injection in email templates.
const escapeHtml = (str) =>
  String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");

// Resolve SMTP/Email Configuration from Environment Variables
const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
const emailPass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;

const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;

const isProduction = process.env.NODE_ENV === "production";
const devTimeout = 4000; // 4 seconds timeout for dev to prevent blocking API responses on failure

const transporterConfig = {
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465, // true for 465, false for 587 (which upgrades securely via STARTTLS)
  auth: {
    user: emailUser,
    pass: emailPass,
  },
  connectionTimeout: isProduction ? 20000 : devTimeout,
  greetingTimeout: isProduction ? 20000 : devTimeout,
  socketTimeout: isProduction ? 30000 : devTimeout,
  tls: {
    rejectUnauthorized: false, // Don't fail on self-signed or intermediate certificates
  },
};

let isSmtpReady = false;

// Create transporter for sending emails
const transporter = nodemailer.createTransport(transporterConfig);

// Sends email directly via Nodemailer (BullMQ removed).
const sendEmail = async (to, subject, html) => {
  if (process.env.NODE_ENV === "test") {
    console.log(`[Email Mock] Skip sending email to ${to} in test mode.`);
    return { messageId: "test-id" };
  }

  // Fallback to console logger in development if SMTP service is not reachable/verified
  if (!isSmtpReady && process.env.NODE_ENV !== "production") {
    console.log(`\n==================================================`);
    console.log(`✉️  [MOCK EMAIL SENT] (SMTP server is offline/unreachable)`);
    console.log(`👉 To: ${to}`);
    console.log(`👉 Subject: ${subject}`);
    console.log(`👉 Body Preview: ${html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').slice(0, 250).trim()}...`);
    console.log(`==================================================\n`);
    return { messageId: "mock-dev-id-" + Date.now() };
  }

  try {
    const info = await transporter.sendMail({
      from: `"RaktSarthi" <${emailUser || "noreply@raktsarthi.com"}>`,
      to,
      subject,
      html,
    });
    console.log(`[Email] Sent to ${to}. MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[Email] Critical failure to send to ${to}:`, error.message);
    // We don't throw here to prevent breaking the caller's main flow
    return null;
  }
};

const getTemplate = async (templateName, data) => {
  try {
    const filePath = path.join(templatesDir, `${templateName}.html`);
    let content = await fs.readFile(filePath, "utf8");

    // Simple template engines like replacement
    Object.keys(data).forEach((key) => {
      const value = data[key];
      const regex = new RegExp(`{{${key}}}`, "g");
      content = content.replace(regex, value);
    });

    return content;
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error.message);
    return null;
  }
};

const generateUnsubscribeUrl = (email) => {
  const token = jwt.sign(
    { email },
    process.env.ACCESS_TOKEN_SECRET || "secret",
    {
      expiresIn: "365d",
    },
  );
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  return `${baseUrl}/unsubscribe?token=${token}`;
};

// --- Email Functions ---

export const sendPasswordResetEmail = async (
  email,
  resetToken,
  userType = "user",
) => {
  const resetUrl =
    userType === "bloodbank"
      ? `${process.env.FRONTEND_URL || "http://localhost:3000"}/blood-bank/reset-password?token=${resetToken}`
      : `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

  const subject =
    userType === "bloodbank"
      ? "Blood Bank - Password Reset Request"
      : "Password Reset Request - RaktSarthi";

  const html =
    (await getTemplate("passwordReset", { resetUrl, userType, subject })) ||
    `Reset your password here: ${resetUrl}`;
  await sendEmail(email, subject, html);
};

export const sendWelcomeEmail = async (email, name) => {
  const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`;
  const unsubscribeUrl = generateUnsubscribeUrl(email);
  const html = await getTemplate("welcome", {
    name: escapeHtml(name),
    dashboardUrl,
    unsubscribeUrl,
  });
  if (html) await sendEmail(email, "Welcome to RaktSarthi! 🩸", html);
};

export const sendRequestReceivedEmail = async (bloodBank, request) => {
  const requestUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/blood-bank-requests`;
  const html = await getTemplate("requestReceived", {
    bloodBankName: escapeHtml(bloodBank.name),
    patientName: escapeHtml(request.patientName),
    bloodGroup: request.bloodGroup,
    urgency: request.urgency,
    units: request.units,
    contactNumber: request.contactNumber,
    requestUrl,
  });
  if (html)
    await sendEmail(bloodBank.email, "New Urgent Blood Request Received", html);
};

export const sendRequestStatusUpdateEmail = async (user, request, remarks) => {
  const requestUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`;
  const unsubscribeUrl = generateUnsubscribeUrl(user.email);

  let statusColor = "#10b981";
  if (request.status === "rejected") statusColor = "#ef4444";
  if (request.status === "pending") statusColor = "#f59e0b";

  const html = await getTemplate("requestStatusChange", {
    userName: escapeHtml(user.name),
    patientName: escapeHtml(request.patientName),
    bloodBankName: escapeHtml(request.bloodBank?.name || "Blood Bank"),
    status: request.status.toUpperCase(),
    statusColor,
    remarks: escapeHtml(remarks || "No specific remarks provided."),
    requestUrl,
    unsubscribeUrl,
  });
  if (html)
    await sendEmail(
      user.email,
      `Update on your Blood Request: ${request.status}`,
      html,
    );
};

export const sendDonationUpdateEmail = async (user, donation, message) => {
  const historyUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`;
  const unsubscribeUrl = generateUnsubscribeUrl(user.email);

  let headerColor = "#3b82f6";
  let icon = "🩸";
  if (donation.status === "completed") {
    headerColor = "#10b981";
    icon = "✨";
  }
  if (donation.status === "rejected") {
    headerColor = "#ef4444";
    icon = "ℹ️";
  }

  const html = await getTemplate("donationUpdate", {
    userName: escapeHtml(user.name),
    donationDate: new Date(donation.donationDate).toLocaleDateString(),
    status: donation.status.toUpperCase(),
    message: escapeHtml(message),
    headerColor,
    icon,
    boxColor: donation.status === "rejected" ? "#fef2f2" : "#eff6ff",
    borderColor: donation.status === "rejected" ? "#fecaca" : "#bfdbfe",
    statusColor: headerColor,
    historyUrl,
    unsubscribeUrl,
  });
  if (html)
    await sendEmail(user.email, "Your Donation Record has been Updated", html);
};

export const sendDonationReminderEmail = async (user) => {
  const eventsUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/events`;
  const unsubscribeUrl = generateUnsubscribeUrl(user.email);
  const html = await getTemplate("donationReminder", {
    name: escapeHtml(user.name),
    lastDonationDate: new Date(user.lastDonationDate).toLocaleDateString(),
    bloodGroup: user.bloodGroup,
    eventsUrl,
    unsubscribeUrl,
  });
  if (html)
    await sendEmail(
      user.email,
      "You are eligible to save a life again! 🦸‍♂️",
      html,
    );
};

export const sendBloodBankApprovalEmail = async (email, bloodBankName) => {
  const loginUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/blood-bank-login`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Approved!</h2>
      <p>Hello ${escapeHtml(bloodBankName)}, your registration is approved.</p>
      <a href="${loginUrl}">Login Now</a>
    </div>
  `;
  await sendEmail(email, "Blood Bank Approved", html);
};

export const sendWeeklyInventoryDigest = async (bloodBank, stats) => {
  const inventoryUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/blood-bank-inventory`;
  const html = await getTemplate("weeklyDigest", {
    bloodBankName: escapeHtml(bloodBank.name),
    totalRequests: stats.totalRequests,
    totalDonations: stats.totalDonations,
    lowInventoryGroups: stats.lowInventoryGroups.join(", ") || "None",
    inventoryUrl,
  });
  if (html)
    await sendEmail(
      bloodBank.email,
      "Weekly Inventory Digest - RaktSarthi",
      html,
    );
};

export const verifyEmailSetup = async () => {
  if (process.env.NODE_ENV === "test") {
    isSmtpReady = true;
    return true;
  }
  try {
    const activeHost = smtpHost || "Gmail Service";
    const activePort = smtpHost ? smtpPort : "default";
    console.log(`📡 Verifying connection to email server (${activeHost}:${activePort})...`);
    
    // Set a quick timeout for SMTP verification to fail fast in development mode
    const verificationTimeout = process.env.NODE_ENV === "production" ? 15000 : 4000;
    
    const verifyPromise = transporter.verify();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Connection timeout")), verificationTimeout)
    );
    
    await Promise.race([verifyPromise, timeoutPromise]);
    console.log("📧 Email service is ready");
    isSmtpReady = true;
    return true;
  } catch (error) {
    console.error("Email verification failed:", error.message);
    isSmtpReady = false;
    return false;
  }
};

export const sendBloodBankRegistrationOtpEmail = async (
  email,
  otp,
  options = {},
) => {
  const html = await getTemplate("bloodBankOtp", {
    otp,
    expiresInMinutes: options.expiresInMinutes || 10,
  });
  if (html) await sendEmail(email, "Blood Bank Registration - Your OTP", html);
};

export const sendUserRegistrationOtpEmail = async (
  email,
  otp,
  options = {},
) => {
  const html = await getTemplate("userOtp", {
    otp,
    expiresInMinutes: options.expiresInMinutes || 10,
  });
  if (html)
    await sendEmail(email, "Verify your email - RaktSarthi Registration", html);
};

export const sendBloodBankRejectionEmail = async (
  email,
  bloodBankName,
  rejectionReason,
) => {
  const html = await getTemplate("bloodBankRejection", {
    bloodBankName: escapeHtml(bloodBankName),
    rejectionReason: escapeHtml(rejectionReason),
  });
  if (html)
    await sendEmail(email, "Update on your Blood Bank Registration", html);
};

export const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email/${token}`;
  const html = await getTemplate("verifyEmail", { verifyUrl });
  if (html) await sendEmail(email, "Verify your email - RaktSarthi", html);
};

export const sendCertificateNotificationEmail = async (user, donation) => {
  const historyUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/donation-history`;
  const unsubscribeUrl = generateUnsubscribeUrl(user.email);
  const html = await getTemplate("donationCertificate", {
    name: escapeHtml(user.name),
    donationDate: new Date(donation.donationDate).toLocaleDateString(),
    certificateCode: donation.certificateCode,
    historyUrl,
    unsubscribeUrl,
  });
  if (html)
    await sendEmail(user.email, "Your Donation Certificate is Ready! 📜", html);
};

export const broadcastNotificationEmail = async (user, notification) => {
  const unsubscribeUrl = generateUnsubscribeUrl(user.email);
  const html = await getTemplate("broadcastNotification", {
    name: escapeHtml(user.name),
    title: escapeHtml(notification.title),
    message: escapeHtml(notification.message),
    unsubscribeUrl,
  });
  if (html) await sendEmail(user.email, notification.title, html);
};

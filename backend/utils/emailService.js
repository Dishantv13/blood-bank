import nodemailer from 'nodemailer';

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD 
  }
});

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, userType = 'user') => {
  try {
    let resetUrl;
    let subject;
    let htmlTemplate;

    // Generate reset URL based on user type
    if (userType === 'bloodbank') {
      resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/blood-bank-reset-password?token=${resetToken}`;
      subject = 'Blood Bank - Password Reset Request';
    } else {
      resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      subject = 'Password Reset Request - RaktSarthi';
    }

    // HTML email template
    htmlTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { padding: 20px; color: #333; }
            .button { background-color: #667eea; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
            .footer { color: #888; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
            .warning { color: #d32f2f; font-size: 12px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${userType === 'bloodbank' ? '🏥 Blood Bank' : '🩸 RaktSarthi'}</h2>
              <p>Password Reset Request</p>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset your password. Click the button below to reset it:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; color: #667eea;"><small>${resetUrl}</small></p>
              <p class="warning">⚠️ This link will expire in 1 hour.</p>
              <p>If you didn't request a password reset, you can safely ignore this email.</p>
              <p>Best regards,<br><strong>RaktSarthi Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2026 RaktSarthi - Blood Donation Management System</p>
              <p>This is an automated email. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@raktsarthi.com',
      to: email,
      subject: subject,
      html: htmlTemplate
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send reset email');
  }
};

const sendBloodBankApprovalEmail = async (email, bloodBankName) => {
  try {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/blood-bank-login`;
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@raktsarthi.com',
      to: email,
      subject: 'Blood Bank Registration Approved - RaktSarthi',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
              .container { max-width: 600px; margin: 20px auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #15803d 0%, #166534 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { padding: 20px; color: #333; }
              .button { background-color: #15803d; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
              .footer { color: #888; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Blood Bank Registration Approved</h2>
              </div>
              <div class="content">
                <p>Hello ${bloodBankName || 'Blood Bank'},</p>
                <p>Your blood bank registration has been reviewed and approved by the admin team.</p>
                <p>You can now log in to your blood bank portal using your registered email and password.</p>
                <a href="${loginUrl}" class="button">Login to Blood Bank Portal</a>
                <p>If the button does not work, use this link:</p>
                <p style="word-break: break-all; color: #15803d;"><small>${loginUrl}</small></p>
                <p>Best regards,<br><strong>RaktSarthi Team</strong></p>
              </div>
              <div class="footer">
                <p>© 2026 RaktSarthi - Blood Donation Management System</p>
                <p>This is an automated email. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending blood bank approval email:', error);
    throw new Error('Failed to send approval email');
  }
};

const sendBloodBankRejectionEmail = async (email, bloodBankName, rejectionReason) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@raktsarthi.com',
      to: email,
      subject: 'Blood Bank Registration Rejected - RaktSarthi',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
              .container { max-width: 600px; margin: 20px auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { padding: 20px; color: #333; }
              .reason { background: #fef2f2; border-left: 4px solid #dc2626; padding: 14px; border-radius: 6px; margin: 18px 0; }
              .footer { color: #888; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Blood Bank Registration Rejected</h2>
              </div>
              <div class="content">
                <p>Hello ${bloodBankName || 'Blood Bank'},</p>
                <p>Your registration request has been reviewed by the admin team and was not approved at this time.</p>
                <div class="reason">
                  <strong>Reason for rejection:</strong>
                  <p style="margin: 8px 0 0;">${rejectionReason}</p>
                </div>
                <p>Please review the reason above and contact the admin team or support before trying again.</p>
                <p>Best regards,<br><strong>RaktSarthi Team</strong></p>
              </div>
              <div class="footer">
                <p>© 2026 RaktSarthi - Blood Donation Management System</p>
                <p>This is an automated email. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending blood bank rejection email:', error);
    throw new Error('Failed to send rejection email');
  }
};

// Verify transporter connection
const verifyEmailSetup = async () => {
  try {
    await transporter.verify();
    console.log('Email service is ready to send emails');
    return true;
  } catch (error) {
    console.error('Email service verification failed:', error);
    return false;
  }
};

export {
  sendPasswordResetEmail,
  sendBloodBankApprovalEmail,
  sendBloodBankRejectionEmail,
  verifyEmailSetup
};

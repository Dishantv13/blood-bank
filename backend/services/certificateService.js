import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { ApiError } from '../utils/apiError.js';
import Donation from '../models/Donation.model.js';
import crypto from 'crypto';

export const generateVerificationCode = () => {
  return `BB-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
};

export const generateDonationCertificate = async (donation) => {
  if (!donation || donation.status !== 'completed') {
    throw new ApiError(400, 'Certificate can only be generated for completed donations');
  }

  // Ensure we have necessary data
  const donorName = donation.donor?.name || 'Valued Donor';
  const bloodBankName = donation.bloodBank?.name || donation.camp?.name || 'Authorized Blood Bank';
  const donationDate = new Date(donation.donationDate || donation.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const bloodGroup = donation.bloodGroup;
  const volume = donation.volumeDonated;
  const verificationCode = donation.certificateCode;
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-certificate/${verificationCode}`;

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 0 // We'll manage margins manually for precision
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // --- Professional Certificate Design ---
      
      // 1. Background / Border
      doc.rect(0, 0, pageWidth, pageHeight).fill('#fafafa'); // Light background
      
      // Main decorative border
      doc.rect(30, 30, pageWidth - 60, pageHeight - 60).lineWidth(3).stroke('#8b0000');
      doc.rect(40, 40, pageWidth - 80, pageHeight - 80).lineWidth(1).stroke('#8b0000');

      // Decorative corners
      const cornerSize = 50;
      doc.lineWidth(10).strokeColor('#8b0000');
      // Top Left
      doc.moveTo(30, 30 + cornerSize).lineTo(30, 30).lineTo(30 + cornerSize, 30).stroke();
      // Top Right
      doc.moveTo(pageWidth - 30 - cornerSize, 30).lineTo(pageWidth - 30, 30).lineTo(pageWidth - 30, 30 + cornerSize).stroke();
      // Bottom Left
      doc.moveTo(30, pageHeight - 30 - cornerSize).lineTo(30, pageHeight - 30).lineTo(30 + cornerSize, pageHeight - 30).stroke();
      // Bottom Right
      doc.moveTo(pageWidth - 30 - cornerSize, pageHeight - 30).lineTo(pageWidth - 30, pageHeight - 30).lineTo(pageWidth - 30, pageHeight - 30 - cornerSize).stroke();

      // 2. Header / Logo Placeholder (Watermark effect)
      doc.fillColor('#8b0000').opacity(0.05).fontSize(150).text('RTBMS', 0, pageHeight / 2 - 100, { align: 'center' }).opacity(1);

      // 3. Main Title
      doc.fillColor('#8b0000').fontSize(42).font('Helvetica-Bold').text('CERTIFICATE OF DONATION', 0, 90, { align: 'center' });
      
      doc.fillColor('#333').fontSize(16).font('Helvetica').text('This prestigious recognition is proudly presented to', 0, 150, { align: 'center' });

      // 4. Donor Name
      doc.fillColor('#000').fontSize(36).font('Helvetica-Bold').text(donorName.toUpperCase(), 0, 190, { align: 'center' });
      
      // Decorative horizontal line
      doc.moveTo(pageWidth / 2 - 150, 235).lineTo(pageWidth / 2 + 150, 235).lineWidth(2).strokeColor('#8b0000').stroke();

      doc.fillColor('#333').fontSize(16).font('Helvetica').text('In sincere appreciation for your selfless contribution of blood,', 0, 260, { align: 'center' });
      doc.text('directly helping to save lives and support our community.', 0, 285, { align: 'center' });

      // 5. Details Section
      const gridY = 340;
      const labelX = pageWidth / 2 - 200;
      const valueX = pageWidth / 2 - 40;

      const drawDetail = (label, value, y) => {
        doc.fillColor('#666').fontSize(14).font('Helvetica').text(label, labelX, y);
        doc.fillColor('#000').fontSize(14).font('Helvetica-Bold').text(value, valueX, y);
      };

      drawDetail('Blood Group:', bloodGroup, gridY);
      drawDetail('Date of Donation:', donationDate, gridY + 30);
      drawDetail('Donated Units:', `${volume} Units`, gridY + 60);
      drawDetail('Donation Center:', bloodBankName, gridY + 90);

      // 6. QR Verification Section (Now more premium)
      const qrY = 320;
      const qrX = pageWidth - 220;
      
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      });
      
      doc.image(qrCodeDataUrl, qrX, qrY, { width: 110 });
      doc.fontSize(9).font('Helvetica').fillColor('#8b0000').text('SCAN TO VERIFY', qrX, qrY + 115, { width: 110, align: 'center' });

      // 7. Signatures Area
      const sigY = 480;
      doc.moveTo(80, sigY).lineTo(230, sigY).lineWidth(1).strokeColor('#333').stroke();
      doc.fontSize(10).font('Helvetica').fillColor('#333').text('Medical Director', 80, sigY + 5, { width: 150, align: 'center' });

      doc.moveTo(pageWidth - 230, sigY).lineTo(pageWidth - 80, sigY).lineWidth(1).strokeColor('#333').stroke();
      doc.fontSize(10).font('Helvetica').fillColor('#333').text('Registration Authority', pageWidth - 230, sigY + 5, { width: 150, align: 'center' });

      // 8. Footer (Verification Code)
      doc.fontSize(10).font('Helvetica').fillColor('#999').text(`Document Hash: ${verificationCode}`, 0, pageHeight - 50, { align: 'center' });
      doc.fontSize(9).text('Real-Time Blood Management System - A Life Saving Initiative', 0, pageHeight - 35, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export const verifyCertificate = async (code) => {
  if (!code) throw new ApiError(400, 'Verification code is required');

  const donation = await Donation.findOne({ certificateCode: code, status: 'completed' })
    .populate('donor', 'name bloodGroup')
    .populate('bloodBank', 'name address')
    .populate('camp', 'name address')
    .lean();

  if (!donation) {
    throw new ApiError(404, 'Invalid certificate or donation record not found');
  }

  return {
    verified: true,
    donorName: donation.donor?.name,
    bloodGroup: donation.bloodGroup,
    donationDate: donation.donationDate,
    volume: donation.volumeDonated,
    collectedBy: donation.bloodBank?.name || donation.camp?.name,
    issuedAt: donation.certificateIssuedAt
  };
};

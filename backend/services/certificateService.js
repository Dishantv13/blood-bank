import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { ApiError } from '../utils/apiError.js';
import donationRepository from '../repositories/DonationRepository.js';
import crypto from 'crypto';
import path from 'path';

export const generateVerificationCode = () => {
  return `BB-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now()
    .toString(36)
    .toUpperCase()}`;
};

export const generateDonationCertificate = async (donation) => {
  if (!donation || donation.status !== 'completed') {
    throw new ApiError(
      400,
      'Certificate can only be generated for completed donations'
    );
  }

  const donorName = donation.donor?.name || 'Valued Donor';
  const bloodBankName =
    donation.bloodBank?.name ||
    donation.camp?.name ||
    'Authorized Blood Bank';

  const donationDate = new Date(
    donation.donationDate || donation.createdAt
  ).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const bloodGroup = donation.bloodGroup;
  const volume = donation.volumeDonated;
  const verificationCode = donation.certificateCode;

  const verificationUrl = `${
    process.env.FRONTEND_URL || 'http://localhost:3000'
  }/verify-certificate/${verificationCode}`;

  const hash = crypto
    .createHash('sha256')
    .update(`${donorName}-${verificationCode}`)
    .digest('hex');

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 0,
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      const assetsDir = path.resolve(process.cwd(), 'assets');
      const logoPath = path.join(assetsDir, 'logo.png');
      const signPath = path.join(assetsDir, 'signature.png');
      const stampPath = path.join(assetsDir, 'stamp.png');

      // 1. Background and Border
      doc.rect(0, 0, pageWidth, pageHeight).fill('#ffffff');
      
      // Subtle background pattern or texture (Optional: could be an image)
      doc.rect(40, 40, pageWidth - 80, pageHeight - 80).fill('#fffcf5'); // Light cream

      // Decorative Borders
      // Outer border
      doc.rect(20, 20, pageWidth - 40, pageHeight - 40).lineWidth(4).strokeColor('#8b0000').stroke();
      // Inner double border
      doc.rect(35, 35, pageWidth - 70, pageHeight - 70).lineWidth(1).strokeColor('#c5a059').stroke(); // Gold
      doc.rect(42, 42, pageWidth - 84, pageHeight - 84).lineWidth(2).strokeColor('#8b0000').stroke();

      // Corner Accents (Gold Rects)
      const accentSize = 60;
      doc.rect(20, 20, accentSize, accentSize).fill('#8b0000');
      doc.rect(pageWidth - 20 - accentSize, 20, accentSize, accentSize).fill('#8b0000');
      doc.rect(20, pageHeight - 20 - accentSize, accentSize, accentSize).fill('#8b0000');
      doc.rect(pageWidth - 20 - accentSize, pageHeight - 20 - accentSize, accentSize, accentSize).fill('#8b0000');

      // Logo and Header
      try {
        doc.image(logoPath, pageWidth / 2 - 50, 60, { width: 100 });
      } catch {
        // Fallback logo shape
        doc.circle(pageWidth / 2, 100, 40).fill('#8b0000');
        doc.fillColor('#fff').fontSize(20).font('Helvetica-Bold').text('LL', pageWidth / 2 - 15, 90);
      }

      doc
        .fillColor('#8b0000')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('LIFELINE BLOOD BANK NETWORK', 0, 165, { align: 'center', characterSpacing: 1.5 });

      doc
        .fontSize(10)
        .fillColor('#555')
        .font('Helvetica')
        .text('Recognized by National Health Authority | Reg No: BB-INF-2026', 0, 185, { align: 'center' });

      // Main Title
      doc
        .fillColor('#333')
        .fontSize(48)
        .font('Helvetica-Bold')
        .text('CERTIFICATE', 0, 220, { align: 'center' });
      
      doc
        .fillColor('#c5a059')
        .fontSize(24)
        .font('Helvetica')
        .text('OF APPRECIATION', 0, 275, { align: 'center', characterSpacing: 2 });

      // Presentation Text
      doc
        .fillColor('#555')
        .fontSize(16)
        .font('Helvetica')
        .text('This is to certify that', 0, 320, { align: 'center' });

      // Donor Name
      doc
        .fillColor('#000')
        .fontSize(38)
        .font('Helvetica-Bold')
        .text(donorName.toUpperCase(), 0, 350, { align: 'center' });

      // Separator
      doc.moveTo(pageWidth / 2 - 180, 400).lineTo(pageWidth / 2 + 180, 400).lineWidth(1).strokeColor('#c5a059').stroke();

      // Appreciation Content
      doc
        .fillColor('#444')
        .fontSize(15)
        .font('Helvetica')
        .text(
          `For their noble contribution of blood at ${bloodBankName}.`,
          0,
          420,
          { align: 'center' }
        );

      doc.text(
        'Your heroic act has provided the gift of life to those in need.',
        0,
        445,
        { align: 'center' }
      );

      // Donation Details Table/Grid
      const detailsY = 490;
      const colWidth = 140;
      const startX = pageWidth / 2 - (colWidth * 2);

      const drawDetailBox = (label, value, x) => {
        doc.fillColor('#888').fontSize(10).font('Helvetica').text(label.toUpperCase(), x, detailsY, { width: colWidth, align: 'center' });
        doc.fillColor('#000').fontSize(14).font('Helvetica-Bold').text(value, x, detailsY + 15, { width: colWidth, align: 'center' });
      };

      drawDetailBox('Blood Group', bloodGroup, startX);
      drawDetailBox('Volume', `${volume} ml`, startX + colWidth);
      drawDetailBox('Date', donationDate, startX + colWidth * 2);
      drawDetailBox('Certificate ID', verificationCode.split('-')[1], startX + colWidth * 3);

      // QR Code for Verification
      const qrX = 80;
      const qrY = pageHeight - 180;
      try {
        const qrCode = await QRCode.toDataURL(verificationUrl);
        doc.image(qrCode, qrX, qrY, { width: 90 });
        doc.fillColor('#555').fontSize(8).font('Helvetica').text('SCAN TO VERIFY', qrX, qrY + 95, { width: 90, align: 'center' });
      } catch {}

      // Signatures and Stamp
      const sigY = pageHeight - 100;
      
      // Left Signature
      try {
        doc.image(signPath, 200, sigY - 50, { width: 100 });
      } catch {}
      doc.moveTo(200, sigY).lineTo(350, sigY).lineWidth(0.5).strokeColor('#333').stroke();
      doc.fillColor('#333').fontSize(11).font('Helvetica').text('Medical Officer', 200, sigY + 10, { width: 150, align: 'center' });

      // Right Signature
      doc.moveTo(pageWidth - 350, sigY).lineTo(pageWidth - 200, sigY).lineWidth(0.5).strokeColor('#333').stroke();
      doc.fillColor('#333').fontSize(11).font('Helvetica').text('Director / Authority', pageWidth - 350, sigY + 10, { width: 150, align: 'center' });

      // Official Stamp
      try {
        doc.image(stampPath, pageWidth / 2 - 50, pageHeight - 160, { width: 100 });
      } catch {}

      // Footer
      doc
        .opacity(0.6)
        .fillColor('#999')
        .fontSize(8)
        .font('Helvetica')
        .text(`Verification Hash: ${hash}`, 0, pageHeight - 40, { align: 'center' });

      doc
        .opacity(1)
        .fillColor('#8b0000')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('THANK YOU FOR SAVING LIVES', 0, pageHeight - 60, { align: 'center', characterSpacing: 1 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

export const verifyCertificate = async (code) => {
  if (!code) throw new ApiError(400, 'Verification code is required');

  const donation = await donationRepository.findOne(
    { certificateCode: code, status: 'completed' },
    {
      populate: [
        { path: 'donor', select: 'name bloodGroup' },
        { path: 'bloodBank', select: 'name address' },
        { path: 'camp', select: 'name address' },
      ],
    }
  );

  if (!donation) {
    throw new ApiError(
      404,
      'Invalid certificate or donation record not found'
    );
  }

  return {
    verified: true,
    donorName: donation.donor?.name,
    bloodGroup: donation.bloodGroup,
    donationDate: donation.donationDate,
    volume: donation.volumeDonated,
    collectedBy: donation.bloodBank?.name || donation.camp?.name,
    issuedAt: donation.certificateIssuedAt,
  };
};
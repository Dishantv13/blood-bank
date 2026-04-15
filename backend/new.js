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

      const logoPath = path.join('assets', 'logo.png');
      const signPath = path.join('assets', 'signature.png');
      const stampPath = path.join('assets', 'stamp.png');

      doc.rect(0, 0, pageWidth, pageHeight).fill('#fafafa');

      doc.rect(30, 30, pageWidth - 60, pageHeight - 60).lineWidth(3).stroke('#8b0000');
      doc.rect(40, 40, pageWidth - 80, pageHeight - 80).lineWidth(1).stroke('#8b0000');

      try {
        doc.image(logoPath, pageWidth / 2 - 40, 40, { width: 80 });
      } catch {}

      doc
        .fontSize(10)
        .fillColor('#555')
        .text(
          'Govt. Approved Blood Bank | License No: BB/2026/4589',
          0,
          75,
          { align: 'center' }
        );

      const watermarkText = process.env.APP_NAME || 'Blood Donation System';
      doc
        .fillColor('#8b0000')
        .opacity(0.04)
        .fontSize(120)
        .text(watermarkText, 0, pageHeight / 2 - 80, { align: 'center' })
        .opacity(1);

      doc
        .fillColor('#8b0000')
        .fontSize(42)
        .font('Helvetica-Bold')
        .text('CERTIFICATE OF DONATION', 0, 120, { align: 'center' });

      doc
        .fillColor('#333')
        .fontSize(16)
        .font('Helvetica')
        .text(
          'This prestigious recognition is proudly presented to',
          0,
          180,
          { align: 'center' }
        );

      doc
        .fillColor('#000')
        .fontSize(34)
        .font('Helvetica-Bold')
        .text(donorName.toUpperCase(), 0, 220, { align: 'center' });

      doc
        .moveTo(pageWidth / 2 - 150, 265)
        .lineTo(pageWidth / 2 + 150, 265)
        .lineWidth(2)
        .strokeColor('#8b0000')
        .stroke();

      doc
        .fontSize(16)
        .fillColor('#333')
        .text(
          'In sincere appreciation for your selfless contribution of blood,',
          0,
          290,
          { align: 'center' }
        );

      doc.text(
        'helping to save lives and strengthen our community.',
        0,
        315,
        { align: 'center' }
      );

      const gridY = 360;
      const labelX = pageWidth / 2 - 200;
      const valueX = pageWidth / 2 - 40;

      const drawDetail = (label, value, y) => {
        doc.fillColor('#666').fontSize(14).font('Helvetica').text(label, labelX, y);
        doc.fillColor('#000').fontSize(14).font('Helvetica-Bold').text(value, valueX, y);
      };

      drawDetail('Blood Group:', bloodGroup, gridY);
      drawDetail('Date of Donation:', donationDate, gridY + 30);
      drawDetail('Volume Donated:', `${volume} ml`, gridY + 60);
      drawDetail('Donation Center:', bloodBankName, gridY + 90);

      const qrX = pageWidth - 220;
      const qrY = 330;

      const qrCode = await QRCode.toDataURL(verificationUrl);

      doc.image(qrCode, qrX, qrY, { width: 110 });

      doc
        .fontSize(9)
        .fillColor('#8b0000')
        .text('SCAN TO VERIFY', qrX, qrY + 115, {
          width: 110,
          align: 'center',
        });

      doc
        .fontSize(8)
        .fillColor('#555')
        .text(
          'Verify this certificate online',
          qrX,
          qrY + 130,
          { width: 110, align: 'center' }
        );

      const sigY = 500;

      doc.moveTo(80, sigY).lineTo(230, sigY).stroke();
      doc.text('Medical Director', 80, sigY + 5, { width: 150, align: 'center' });

      doc.moveTo(pageWidth - 230, sigY).lineTo(pageWidth - 80, sigY).stroke();
      doc.text('Authority Signature', pageWidth - 230, sigY + 5, {
        width: 150,
        align: 'center',
      });

      try {
        doc.image(signPath, 100, sigY - 40, { width: 80 });
        doc.image(stampPath, pageWidth - 260, sigY - 60, { width: 80 });
      } catch {}

      doc
        .fontSize(10)
        .fillColor('#444')
        .text(`Certificate ID: ${verificationCode}`, 60, pageHeight - 70);

      doc.text(
        `Issued On: ${new Date().toLocaleDateString()}`,
        60,
        pageHeight - 55
      );

      doc
        .fontSize(7)
        .fillColor('#999')
        .text(`Secure Hash: ${hash.slice(0, 25)}...`, 0, pageHeight - 30, {
          align: 'center',
        });

      doc
        .fontSize(9)
        .text(
          'Real-Time Blood Management System - Saving Lives Together',
          0,
          pageHeight - 15,
          { align: 'center' }
        );

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
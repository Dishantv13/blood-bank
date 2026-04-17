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

  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'
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
        info: {
          Title: `Donation Certificate - ${donorName}`,
          Author: 'RaktSarthi Network',
        }
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

      // 1. Outer Background
      doc.rect(0, 0, pageWidth, pageHeight).fill('#ffffff');

      // 2. Decorative Background (Creamy texture)
      doc.rect(40, 40, pageWidth - 80, pageHeight - 80).fill('#fffdfa');

      doc.rect(25, 25, pageWidth - 50, pageHeight - 50)
        .lineWidth(3)
        .strokeColor('#8b0000') // Deep Red
        .stroke();

      // Inner gold border
      doc.rect(35, 35, pageWidth - 70, pageHeight - 70)
        .lineWidth(1.5)
        .strokeColor('#d4af37') // Antique Gold
        .stroke();

      // 4. Subtle Watermark Logo
      doc.save();
      doc.opacity(0.05);
      try {
        doc.image(logoPath, pageWidth / 2 - 150, pageHeight / 2 - 150, { width: 300 });
      } catch {
        // Fallback watermark text
        doc.fillColor('#8b0000').fontSize(100).font('Helvetica-Bold').text('RAKTSARTHI', 0, pageHeight / 2 - 50, { align: 'center' });
      }
      doc.restore();

      // 5. Header Branding
      try {
        doc.image(logoPath, pageWidth / 2 - 40, 55, { width: 80 });
      } catch {
        doc.circle(pageWidth / 2, 95, 35).fill('#8b0000');
        doc.fillColor('#fff').fontSize(18).font('Helvetica-Bold').text('RS', pageWidth / 2 - 13, 85);
      }

      doc
        .fillColor('#8b0000')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('RAKTSARTHI BLOOD BANK NETWORK', 0, 145, { align: 'center', characterSpacing: 2 });

      doc
        .fontSize(10)
        .fillColor('#666')
        .font('Helvetica')
        .text('National Certified Donor Registry | ISO 9001:2015 Certified', 0, 165, { align: 'center' });

      // 6. Title Section
      doc
        .fillColor('#1a1a1a')
        .fontSize(40)
        .font('Helvetica-Bold')
        .text('CERTIFICATE', 0, 195, { align: 'center', characterSpacing: 1 });

      doc
        .fillColor('#d4af37')
        .fontSize(18)
        .font('Helvetica')
        .text('OF NOBLE CONTRIBUTION', 0, 240, { align: 'center', characterSpacing: 3 });

      // 7. Presentation Statement
      doc
        .fillColor('#444')
        .fontSize(14)
        .font('Helvetica')
        .text('This proud recognition is awarded to', 0, 285, { align: 'center' });

      // 8. Donor Name
      doc
        .fillColor('#8b0000')
        .fontSize(38)
        .font('Helvetica-Bold')
        .text(donorName.toUpperCase(), 0, 310, { align: 'center' });

      // Golden Line Separator
      doc.moveTo(pageWidth / 2 - 120, 355).lineTo(pageWidth / 2 + 120, 355).lineWidth(1.5).strokeColor('#d4af37').stroke();

      // 9. Donation Metadata Grid (Moved higher to avoid signatures)
      const detailsY = 375;
      const colWidth = 140;
      const startX = pageWidth / 2 - (colWidth * 2);

      const drawDetail = (label, value, x) => {
        doc.fillColor('#999').fontSize(8).font('Helvetica').text(label.toUpperCase(), x, detailsY, { width: colWidth, align: 'center' });
        doc.fillColor('#222').fontSize(13).font('Helvetica-Bold').text(value, x, detailsY + 12, { width: colWidth, align: 'center' });
      };

      drawDetail('Blood Group', bloodGroup, startX);
      drawDetail('Units Donated', `${volume} units`, startX + colWidth);
      drawDetail('Donation Date', donationDate, startX + colWidth * 2);
      drawDetail('Reference ID', verificationCode.split('-')[1], startX + colWidth * 3);

      // 10. Contribution Description
      doc
        .fillColor('#555')
        .fontSize(13)
        .font('Helvetica')
        .text(
          `For successfully donating life-saving blood at ${bloodBankName}.`,
          0,
          420,
          { align: 'center', lineGap: 3 }
        );

      doc.text(
        'Your selfless act of humanity serves as an inspiration to others.',
        0,
        440,
        { align: 'center' }
      );

      // 11. Verification QR Code (Moved to lower left, away from signatures)
      // 11. QR Code (Clean placement - no overlap)
const qrX = 80;
const qrY = pageHeight - 160;

try {
  const qrCode = await QRCode.toDataURL(verificationUrl);
  doc.image(qrCode, qrX, qrY, { width: 75 });

  doc
    .fillColor('#777')
    .fontSize(7)
    .font('Helvetica')
    .text('SECURE VERIFICATION', qrX, qrY + 80, {
      width: 75,
      align: 'center',
    });
} catch {}


// 12. SIGNATURES + STAMP (PROPERLY SPACED)
const bottomY = pageHeight - 90;

// === LEFT SIGNATURE ===
const leftX = 160;
const lineWidth = 150;

// Draw signature image (above line, no overlap with QR)
try {
  doc.image(signPath, leftX + 10, bottomY - 65, {
    width: 110,
  });
} catch {}

// Line
doc
  .moveTo(leftX, bottomY)
  .lineTo(leftX + lineWidth, bottomY)
  .lineWidth(0.6)
  .strokeColor('#444')
  .stroke();

// Label
doc
  .fillColor('#333')
  .fontSize(10)
  .font('Helvetica-Bold')
  .text('Authorized Signatory', leftX, bottomY + 8, {
    width: lineWidth,
    align: 'center',
  });


// === RIGHT SIGNATURE LINE ===
const rightX = pageWidth - 310;

doc
  .moveTo(rightX, bottomY)
  .lineTo(rightX + lineWidth, bottomY)
  .lineWidth(0.6)
  .strokeColor('#444')
  .stroke();

doc
  .fillColor('#333')
  .fontSize(10)
  .font('Helvetica-Bold')
  .text('Medical Superintendent', rightX, bottomY + 8, {
    width: lineWidth,
    align: 'center',
  });


// === STAMP (Perfect center-right placement) ===
try {
  doc.save();

  const stampSize = 95;
  const stampX = pageWidth / 2 + 160;
  const stampY = bottomY - 70;

  doc.opacity(0.45);

  // Rotate from center (fix distortion)
  doc.rotate(0, {
    origin: [stampX + stampSize / 2, stampY + stampSize / 2],
  });

  doc.image(stampPath, stampX, stampY, {
    width: stampSize,
  });

  doc.restore();
} catch {}
      // 13. Security Footer
      const footerY = pageHeight - 45;
      doc.moveTo(60, footerY).lineTo(pageWidth - 60, footerY).lineWidth(0.25).strokeColor('#ddd').stroke();

      doc
        .fillColor('#aaa')
        .fontSize(6)
        .font('Helvetica')
        .text(`Certificate Hash: ${hash} | Digitally Issued on ${new Date().toLocaleString()}`, 0, footerY + 8, { align: 'center' });

      doc
        .fillColor('#8b0000')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('THE BLOOD OF A HERO FLOWS THROUGH THE VEINS OF A SURVIVOR', 0, footerY - 18, { align: 'center', characterSpacing: 1.2 });

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
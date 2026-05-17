const PDFDocument = require('pdfkit');
const { Readable } = require('stream');

/**
 * Generate OD Letter PDF for a group of students by department
 * @param {Object} params - Parameters for PDF generation
 * @param {Object} params.event - Event details
 * @param {Array} params.participants - Array of participant objects with student details
 * @param {String} params.department - Department to filter by
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateODLetterPDF({ event, participants, department }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Filter participants by department
      const deptParticipants = participants.filter(p => p.department === department);

      if (deptParticipants.length === 0) {
        doc.text('No participants found for this department');
        doc.end();
        return;
      }

      // Add letterhead
      doc.fontSize(16).font('Helvetica-Bold').text('NSS UNIT', 50, 50, { align: 'center' });
      doc.fontSize(12).font('Helvetica').text('University Activity Portal', { align: 'center' });
      doc.fontSize(10).text(`Department of ${department}`, { align: 'center' });
      doc.moveTo(50, 130).lineTo(550, 130).stroke();

      // Date
      doc.fontSize(10).font('Helvetica').text(`Date: ${new Date().toLocaleDateString()}`, 50, 150);

      // Title
      doc.fontSize(14).font('Helvetica-Bold').text('ON DUTY (OD) LETTER', 50, 190, { align: 'center' });

      // Letter content
      doc.fontSize(11).font('Helvetica');
      const currentY = 240;
      const lineHeight = 15;
      let yPosition = currentY;

      doc.text('To Whom It May Concern,', 50, yPosition);
      yPosition += lineHeight * 2;

      doc.text(
        `This is to certify that the following students from ${department} department participated in the event titled "${event.title}" held on ${new Date(event.startDate).toLocaleDateString()}.`,
        50,
        yPosition,
        { width: 500 }
      );
      yPosition += lineHeight * 3;

      // Event Details
      doc.fontSize(10).font('Helvetica-Bold').text('Event Details:', 50, yPosition);
      yPosition += lineHeight;

      doc.font('Helvetica').fontSize(10);
      doc.text(`Event Title: ${event.title}`, 60, yPosition);
      yPosition += lineHeight;

      doc.text(
        `Date: ${new Date(event.startDate).toLocaleDateString()} (${new Date(event.startDate).toTimeString().slice(0, 5)} - ${new Date(event.endDate).toTimeString().slice(0, 5)})`,
        60,
        yPosition
      );
      yPosition += lineHeight;

      doc.text(`Location: ${event.location}`, 60, yPosition);
      yPosition += lineHeight * 2;

      // Participants Table
      doc.fontSize(10).font('Helvetica-Bold').text('Participants:', 50, yPosition);
      yPosition += lineHeight + 5;

      // Table headers
      const tableY = yPosition;
      const col1 = 50;
      const col2 = 140;
      const col3 = 280;
      const col4 = 420;
      const colWidth = 80;
      const rowHeight = 25;

      // Draw header row with background
      doc.rect(col1, tableY, 500, rowHeight).fill('#e8e8e8');
      doc.fill('#000000');

      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Reg. No.', col1 + 5, tableY + 5, { width: colWidth - 10 });
      doc.text('Name', col2 + 5, tableY + 5, { width: colWidth - 10 });
      doc.text('Year', col3 + 5, tableY + 5, { width: colWidth - 10 });
      doc.text('Status', col4 + 5, tableY + 5, { width: colWidth - 10 });

      yPosition = tableY + rowHeight;
      const maxTableHeight = 420;

      // Add participant rows
      let rowCount = 0;
      deptParticipants.forEach((participant, index) => {
        if (yPosition > maxTableHeight) {
          // Add new page if table exceeds space
          doc.addPage();
          yPosition = 50;
        }

        // Alternate row background
        if (index % 2 === 0) {
          doc.rect(col1, yPosition, 500, rowHeight).fill('#f5f5f5');
          doc.fill('#000000');
        }

        doc.fontSize(9).font('Helvetica');
        doc.text(participant.registrationNumber || '-', col1 + 5, yPosition + 5, { width: colWidth - 10 });
        doc.text(participant.name || '-', col2 + 5, yPosition + 5, { width: colWidth - 10 });
        doc.text(participant.year || '-', col3 + 5, yPosition + 5, { width: colWidth - 10 });
        doc.text(participant.status || '-', col4 + 5, yPosition + 5, { width: colWidth - 10 });

        yPosition += rowHeight;
        rowCount++;
      });

      // Footer section
      yPosition += lineHeight;

      doc.fontSize(10).font('Helvetica').text(
        'These students are hereby absolved from their regular class attendance on the aforementioned date for their participation in the said activity.',
        50,
        yPosition,
        { width: 500 }
      );

      yPosition += lineHeight * 3;

      // Signatures section
      doc.fontSize(9).font('Helvetica-Bold').text('Faculty Signature:', 50, yPosition);
      yPosition += lineHeight * 2;

      doc.moveTo(50, yPosition).lineTo(200, yPosition).stroke();
      doc.fontSize(8).font('Helvetica').text('___________________', 50, yPosition + 5);

      doc.fontSize(9).font('Helvetica-Bold').text('Faculty Name & Date', 50, yPosition + 20);

      yPosition += lineHeight * 3;

      doc.fontSize(9).font('Helvetica-Bold').text('NSS Coordinator Signature:', 300, yPosition - 35);
      yPosition -= 35;

      doc.moveTo(300, yPosition + 40).lineTo(450, yPosition + 40).stroke();
      doc.fontSize(8).font('Helvetica').text('___________________', 300, yPosition + 45);

      doc.fontSize(9).font('Helvetica-Bold').text('NSS Coordinator', 300, yPosition + 60);

      // Footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 1; i <= pageCount; i++) {
        doc.switchToPage(i - 1);
        doc.fontSize(8).font('Helvetica').text(
          `Page ${i} of ${pageCount}`,
          50,
          doc.page.height - 30,
          { align: 'center' }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate OD Letter PDFs for all departments in a batch
 * @param {Object} params - Parameters for batch PDF generation
 * @param {Object} params.event - Event details
 * @param {Array} params.participants - Array of participant objects
 * @returns {Promise<Object>} Object with department keys and PDF buffers as values
 */
async function generateBatchODLetterPDFs({ event, participants }) {
  try {
    // Group participants by department
    const departments = [...new Set(participants.map(p => p.department))];
    const pdfs = {};

    for (const department of departments) {
      pdfs[department] = await generateODLetterPDF({
        event,
        participants,
        department
      });
    }

    return pdfs;
  } catch (error) {
    throw new Error(`Failed to generate batch OD letters: ${error.message}`);
  }
}

module.exports = {
  generateODLetterPDF,
  generateBatchODLetterPDFs
};

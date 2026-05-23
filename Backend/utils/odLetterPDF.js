const { jsPDF } = require('jspdf');

/**
 * Generate OD Letter PDF for a group of students by department
 * @param {Object} params - Parameters for PDF generation
 * @param {Object} params.event - Event details
 * @param {Array} params.participants - Array of participant objects with student details
 * @param {String} params.department - Department to filter by
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateODLetterPDF({ event, participants, department }) {
  const deptParticipants = participants.filter(p => p.department === department);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  if (deptParticipants.length === 0) {
    pdf.setFontSize(12);
    pdf.text('No participants found for this department', 20, 20);
    return Buffer.from(pdf.output('arraybuffer'));
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('NSS UNIT', pageWidth / 2, 20, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.text('University Activity Portal', pageWidth / 2, 28, { align: 'center' });
  pdf.setFontSize(10);
  pdf.text(`Department of ${department}`, pageWidth / 2, 35, { align: 'center' });
  pdf.line(20, 42, pageWidth - 20, 42);

  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, 50);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('ON DUTY (OD) LETTER', pageWidth / 2, 60, { align: 'center' });

  let yPosition = 75;
  const lineHeight = 7;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text('To Whom It May Concern,', 20, yPosition);
  yPosition += lineHeight * 2;

  const intro = `This is to certify that the following students from ${department} department participated in the event titled "${event.title}" held on ${new Date(event.startDate).toLocaleDateString()}.`;
  const introLines = pdf.splitTextToSize(intro, pageWidth - 40);
  pdf.text(introLines, 20, yPosition);
  yPosition += introLines.length * lineHeight + 4;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Event Details:', 20, yPosition);
  yPosition += lineHeight;

  pdf.setFont('helvetica', 'normal');
  pdf.text(`Event Title: ${event.title}`, 25, yPosition);
  yPosition += lineHeight;
  pdf.text(
    `Date: ${new Date(event.startDate).toLocaleDateString()} (${new Date(event.startDate).toTimeString().slice(0, 5)} - ${new Date(event.endDate).toTimeString().slice(0, 5)})`,
    25,
    yPosition
  );
  yPosition += lineHeight;
  pdf.text(`Location: ${event.location}`, 25, yPosition);
  yPosition += lineHeight * 2;

  pdf.setFont('helvetica', 'bold');
  pdf.text('Participants:', 20, yPosition);
  yPosition += 5;

  const col1 = 20;
  const col2 = 60;
  const col3 = 115;
  const col4 = 150;
  const rowHeight = 8;

  const drawHeader = () => {
    pdf.setFillColor(232, 232, 232);
    pdf.rect(col1, yPosition, pageWidth - 40, rowHeight, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('Reg. No.', col1 + 2, yPosition + 5);
    pdf.text('Name', col2 + 2, yPosition + 5);
    pdf.text('Year', col3 + 2, yPosition + 5);
    pdf.text('Status', col4 + 2, yPosition + 5);
    yPosition += rowHeight;
  };

  drawHeader();

  deptParticipants.forEach((participant, index) => {
    if (yPosition > pageHeight - 35) {
      pdf.addPage();
      yPosition = 20;
      drawHeader();
    }

    if (index % 2 === 0) {
      pdf.setFillColor(245, 245, 245);
      pdf.rect(col1, yPosition, pageWidth - 40, rowHeight, 'F');
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(String(participant.registrationNumber || '-'), col1 + 2, yPosition + 5);
    pdf.text(String(participant.name || '-'), col2 + 2, yPosition + 5);
    pdf.text(String(participant.year || '-'), col3 + 2, yPosition + 5);
    pdf.text(String(participant.status || '-'), col4 + 2, yPosition + 5);
    yPosition += rowHeight;
  });

  yPosition += lineHeight;
  const footer = 'These students are hereby absolved from their regular class attendance on the aforementioned date for their participation in the said activity.';
  const footerLines = pdf.splitTextToSize(footer, pageWidth - 40);
  pdf.text(footerLines, 20, yPosition);
  yPosition += footerLines.length * lineHeight + 10;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('Faculty Signature:', 20, yPosition);
  pdf.line(20, yPosition + 10, 70, yPosition + 10);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text('Faculty Name & Date', 20, yPosition + 15);

  pdf.setFont('helvetica', 'bold');
  pdf.text('NSS Coordinator Signature:', 110, yPosition);
  pdf.line(110, yPosition + 10, 170, yPosition + 10);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text('NSS Coordinator', 110, yPosition + 15);

  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  return Buffer.from(pdf.output('arraybuffer'));
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

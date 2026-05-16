const express = require('express');
const { jsPDF } = require('jspdf');
const XLSX = require('xlsx');
const multer = require('multer');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const Event = require('../models/Event');
const Participation = require('../models/Participation');
const Contribution = require('../models/Contribution');
const User = require('../models/User');
const Report = require('../models/Report');
const { auth, authorize } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const { analyzeStudentReport, generateConsolidatedReport, generateEventSummary } = require('../services/geminiService');

function addWrappedText(doc, text, startY, options = {}) {
  const {
    marginLeft = 15,
    marginRight = 15,
    lineHeight = 6,
    topMargin = 20
  } = options;
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = doc.internal.pageSize.getWidth() - marginLeft - marginRight;
  const lines = doc.splitTextToSize(text, usableWidth);
  let cursorY = startY;
  lines.forEach((line) => {
    if (cursorY > pageHeight - marginRight) {
      doc.addPage();
      cursorY = topMargin;
    }
    doc.text(line, marginLeft, cursorY);
    cursorY += lineHeight;
  });
  return cursorY;
}

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument'];
    if (allowedTypes.some(type => file.mimetype.startsWith(type) || file.mimetype.includes(type))) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

const router = express.Router();

// @route   GET /api/reports/event/:id
// @desc    Generate event report PDF
// @access  Private (Admin/Faculty)
router.get('/event/:id', [auth, authorize('admin', 'faculty'), validateObjectId('id')], async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate({
        path: 'participations',
        populate: {
          path: 'student',
          select: 'name email studentId department'
        }
      });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const participations = await Participation.find({ event: event._id })
      .populate('student', 'name email studentId department year');

    const contributions = await Contribution.find({ event: event._id })
      .populate('student', 'name email studentId');

    // Generate PDF
    const doc = new jsPDF();
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.text('NSS Event Report', 105, yPos, { align: 'center' });
    yPos += 15;

    // Event Details
    doc.setFontSize(12);
    doc.text(`Event: ${event.title}`, 20, yPos);
    yPos += 7;
    doc.text(`Type: ${event.eventType}`, 20, yPos);
    yPos += 7;
    doc.text(`Location: ${event.location}`, 20, yPos);
    yPos += 7;
    doc.text(`Start Date: ${new Date(event.startDate).toLocaleDateString()}`, 20, yPos);
    yPos += 7;
    doc.text(`End Date: ${new Date(event.endDate).toLocaleDateString()}`, 20, yPos);
    yPos += 7;
    doc.text(`Organizer: ${event.organizer.name}`, 20, yPos);
    yPos += 10;

    // Statistics
    doc.setFontSize(14);
    doc.text('Statistics', 20, yPos);
    yPos += 7;
    doc.setFontSize(12);
    doc.text(`Total Registrations: ${participations.length}`, 20, yPos);
    yPos += 7;
    doc.text(`Approved: ${participations.filter(p => p.status === 'approved' || p.status === 'attended' || p.status === 'completed').length}`, 20, yPos);
    yPos += 7;
    doc.text(`Attended: ${participations.filter(p => p.attendance).length}`, 20, yPos);
    yPos += 7;
    doc.text(`Total Volunteer Hours: ${contributions.reduce((sum, c) => sum + c.volunteerHours, 0)}`, 20, yPos);
    yPos += 10;

    // Participants List
    if (participations.length > 0) {
      doc.setFontSize(14);
      doc.text('Participants', 20, yPos);
      yPos += 7;
      doc.setFontSize(10);

      participations.forEach((part, index) => {
        if (!part.student) {
          return;
        }
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${index + 1}. ${part.student.name} (${part.student.studentId || 'N/A'}) - ${part.status}`, 25, yPos);
        yPos += 6;
      });
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="event-report-${event._id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate event report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reports/certificate/:participationId
// @desc    Generate participation certificate PDF
// @access  Private
router.get('/certificate/:participationId', auth, validateObjectId('participationId'), async (req, res) => {
  try {
    const participation = await Participation.findById(req.params.participationId)
      .populate('student', 'name email studentId')
      .populate('event', 'title eventType startDate endDate');

    if (!participation) {
      return res.status(404).json({ message: 'Participation not found' });
    }

    if (!participation.student) {
      return res.status(404).json({ message: 'Student record not found for this participation' });
    }

    // Check authorization
    if (req.user.role === 'student' && participation.student._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (participation.status !== 'completed' && participation.status !== 'attended') {
      return res.status(400).json({ message: 'Cannot generate certificate for incomplete participation' });
    }

    // Generate Certificate PDF
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // Border
    doc.setLineWidth(2);
    doc.rect(10, 10, width - 20, height - 20);

    // Title
    doc.setFontSize(24);
    doc.text('CERTIFICATE OF PARTICIPATION', width / 2, 50, { align: 'center' });

    // Body
    doc.setFontSize(14);
    doc.text('This is to certify that', width / 2, 80, { align: 'center' });

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(participation.student.name.toUpperCase(), width / 2, 100, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont(undefined, 'normal');
    doc.text(`Student ID: ${participation.student.studentId || 'N/A'}`, width / 2, 115, { align: 'center' });

    doc.text('has successfully participated in', width / 2, 135, { align: 'center' });

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(participation.event.title, width / 2, 150, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Event Type: ${participation.event.eventType}`, width / 2, 165, { align: 'center' });
    doc.text(`Date: ${new Date(participation.event.startDate).toLocaleDateString()} - ${new Date(participation.event.endDate).toLocaleDateString()}`, width / 2, 175, { align: 'center' });

    if (participation.volunteerHours > 0) {
      doc.text(`Volunteer Hours: ${participation.volunteerHours}`, width / 2, 185, { align: 'center' });
    }

    doc.text('organized under the National Service Scheme (NSS)', width / 2, 200, { align: 'center' });

    // Signature lines
    doc.setFontSize(12);
    doc.text('_________________', 60, height - 40);
    doc.text('NSS Coordinator', 60, height - 35);

    doc.text('_________________', width - 60, height - 40, { align: 'right' });
    doc.text('Date', width - 60, height - 35, { align: 'right' });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${participation._id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate certificate error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reports/annual-summary
// @desc    Generate annual NSS summary (PDF and Excel)
// @access  Private (Admin only)
router.get('/annual-summary', [auth, authorize('admin')], async (req, res) => {
  try {
    const { year, academicYear, startMonth, endMonth } = req.query;

    const buildAcademicRange = (academicYearValue) => {
      const match = /^\s*(\d{4})-(\d{2})\s*$/.exec(String(academicYearValue || ''));
      if (!match) {
        return null;
      }

      const startYear = parseInt(match[1], 10);
      const endYear = startYear + 1;
      const expectedEndSuffix = String(endYear).slice(-2);

      if (match[2] !== expectedEndSuffix) {
        return null;
      }

      const rangeStart = new Date(startYear, 5, 1, 0, 0, 0, 0); // June 1
      const rangeEnd = new Date(endYear, 4, 31, 23, 59, 59, 999); // May 31
      return { rangeStart, rangeEnd, label: academicYearValue };
    };

    const buildMonthRange = (yearValue, startMonthValue, endMonthValue) => {
      const reportYear = parseInt(yearValue, 10);
      const start = parseInt(startMonthValue, 10);
      const end = parseInt(endMonthValue, 10);

      if (!Number.isFinite(reportYear) || !Number.isFinite(start) || !Number.isFinite(end)) {
        return null;
      }

      if (start < 1 || start > 12 || end < 1 || end > 12) {
        return null;
      }

      const rangeStart = new Date(reportYear, start - 1, 1, 0, 0, 0, 0);
      const rangeEnd = new Date(reportYear, end, 0, 23, 59, 59, 999);
      if (rangeEnd < rangeStart) {
        return null;
      }

      return { rangeStart, rangeEnd, label: `${reportYear}-${String(start).padStart(2, '0')}-${String(end).padStart(2, '0')}` };
    };

    const academicRange = academicYear ? buildAcademicRange(academicYear) : null;
    const monthRange = !academicRange && startMonth && endMonth ? buildMonthRange(year || new Date().getFullYear(), startMonth, endMonth) : null;
    const fallbackYear = year || new Date().getFullYear();
    const defaultRange = {
      rangeStart: new Date(`${fallbackYear}-01-01T00:00:00.000Z`),
      rangeEnd: new Date(`${fallbackYear}-12-31T23:59:59.999Z`),
      label: String(fallbackYear)
    };

    const selectedRange = academicRange || monthRange || defaultRange;
    const { rangeStart, rangeEnd, label } = selectedRange;

    // Get all events for the year
    const events = await Event.find({
      startDate: { $gte: rangeStart, $lte: rangeEnd }
    });

    // Get all participations
    const participations = await Participation.find({
      createdAt: { $gte: rangeStart, $lte: rangeEnd }
    }).populate('student', 'name email studentId department year');

    // Get all contributions
    const contributions = await Contribution.find({
      submittedAt: { $gte: rangeStart, $lte: rangeEnd }
    }).populate('student', 'name email studentId');

    // Get all students with their total hours
    const students = await User.find({
      role: 'student',
      contributions: { $exists: true, $ne: [] }
    });

    // Format query parameter
    const format = req.query.format || 'pdf';

    if (format === 'excel') {
      // Generate Excel
      const workbook = XLSX.utils.book_new();

      // Summary Sheet
      const validParticipations = participations.filter(p => p.student);
      const summaryData = [
        ['NSS Annual Summary', label],
        [],
        ['Total Events', events.length],
        ['Total Registrations', participations.length],
        ['Total Participants', new Set(validParticipations.map(p => p.student._id.toString())).size],
        ['Total Volunteer Hours', contributions.reduce((sum, c) => sum + c.volunteerHours, 0)],
        [],
        ['Events by Type'],
        ...Object.entries(
          events.reduce((acc, e) => {
            acc[e.eventType] = (acc[e.eventType] || 0) + 1;
            return acc;
          }, {})
        ).map(([type, count]) => [type, count])
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Events Sheet
      const eventsData = [
        ['Title', 'Type', 'Location', 'Start Date', 'End Date', 'Participants', 'Status']
      ];
      events.forEach(event => {
        const eventParticipations = participations.filter(p => p.event.toString() === event._id.toString());
        eventsData.push([
          event.title,
          event.eventType,
          event.location,
          new Date(event.startDate).toLocaleDateString(),
          new Date(event.endDate).toLocaleDateString(),
          eventParticipations.length,
          event.status
        ]);
      });
      const eventsSheet = XLSX.utils.aoa_to_sheet(eventsData);
      XLSX.utils.book_append_sheet(workbook, eventsSheet, 'Events');

      // Students Sheet
      const studentsData = [
        ['Name', 'Student ID', 'Department', 'Total Volunteer Hours', 'Events Participated']
      ];
      students.forEach(student => {
        const studentParticipations = participations.filter(p => p.student && p.student._id.toString() === student._id.toString());
        studentsData.push([
          student.name,
          student.studentId || 'N/A',
          student.department || 'N/A',
          student.totalVolunteerHours,
          studentParticipations.length
        ]);
      });
      const studentsSheet = XLSX.utils.aoa_to_sheet(studentsData);
      XLSX.utils.book_append_sheet(workbook, studentsSheet, 'Students');

      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="nss-annual-summary-${label}.xlsx"`);
      res.send(excelBuffer);
    } else {
      // Generate PDF
      const doc = new jsPDF();
      let yPos = 20;

      doc.setFontSize(20);
      doc.text(`NSS Annual Summary ${label}`, 105, yPos, { align: 'center' });
      yPos += 20;

      doc.setFontSize(14);
      doc.text('Overview', 20, yPos);
      yPos += 10;

      doc.setFontSize(12);
      doc.text(`Total Events: ${events.length}`, 20, yPos);
      yPos += 7;
      doc.text(`Total Registrations: ${participations.length}`, 20, yPos);
      yPos += 7;
      doc.text(`Total Participants: ${new Set(participations.filter(p => p.student).map(p => p.student._id.toString())).size}`, 20, yPos);
      yPos += 7;
      doc.text(`Total Volunteer Hours: ${contributions.reduce((sum, c) => sum + c.volunteerHours, 0)}`, 20, yPos);
      yPos += 15;

      // Events by Type
      doc.setFontSize(14);
      doc.text('Events by Type', 20, yPos);
      yPos += 10;
      doc.setFontSize(12);

      const eventsByType = events.reduce((acc, e) => {
        acc[e.eventType] = (acc[e.eventType] || 0) + 1;
        return acc;
      }, {});

      Object.entries(eventsByType).forEach(([type, count]) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${type}: ${count}`, 25, yPos);
        yPos += 7;
      });

      yPos += 10;

      // Top Volunteers
      doc.setFontSize(14);
      doc.text('Top Volunteers', 20, yPos);
      yPos += 10;
      doc.setFontSize(12);

      const topVolunteers = students
        .sort((a, b) => b.totalVolunteerHours - a.totalVolunteerHours)
        .slice(0, 10);

      topVolunteers.forEach((student, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${index + 1}. ${student.name} - ${student.totalVolunteerHours} hours`, 25, yPos);
        yPos += 7;
      });

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="nss-annual-summary-${label}.pdf"`);
      res.send(pdfBuffer);
    }
  } catch (error) {
    console.error('Generate annual summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/reports/student/submit
// @desc    Student submits event report with file uploads
// @access  Private (Student)
router.post('/student/submit', [auth, authorize('student'), upload.array('files', 5)], async (req, res) => {
  try {
    const { eventId, title, description, academicYear } = req.body;

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Verify student participated in the event
    const participation = await Participation.findOne({
      student: req.user.id,
      event: eventId,
      status: { $in: ['attended', 'completed'] }
    });

    if (!participation) {
      return res.status(403).json({ message: 'You must have attended this event to submit a report' });
    }

    // Ensure the student submits only one report per event
    const existingReport = await Report.findOne({
      student: req.user.id,
      event: eventId
    });

    if (existingReport) {
      return res.status(400).json({ message: 'You have already submitted a report for this event' });
    }

    // Upload files to Cloudinary using upload_stream (more reliable than base64 data URI)
    const uploadedFiles = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Build a safe base name without extension
        const baseName = path.basename(file.originalname || 'upload', path.extname(file.originalname || ''));
        const safeBaseName = baseName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
          .slice(0, 60) || 'upload';

        const publicId = `${Date.now()}-${safeBaseName}`;

        // Determine resource_type based on file mimetype
        let resourceType = 'auto';
        if (file.mimetype.startsWith('image/')) {
          resourceType = 'image';
        } else if (file.mimetype.startsWith('video/')) {
          resourceType = 'video';
        } else {
          // For PDFs, documents, and other files, use 'raw'
          resourceType = 'raw';
        }

        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: `nss-reports/${eventId}`,
              resource_type: resourceType,
              public_id: publicId,
              // Add flags for better PDF handling
              ...(file.mimetype === 'application/pdf' && {
                flags: 'attachment'
              })
            },
            (error, result) => {
              if (error) {
                return reject(error);
              }
              resolve(result);
            }
          );

          uploadStream.end(file.buffer);
        });

        uploadedFiles.push({
          url: result.secure_url,
          publicId: result.public_id,
          fileName: file.originalname,
          fileType: file.mimetype
        });
      }
    }

    // Create report
    const report = await Report.create({
      student: req.user.id,
      event: eventId,
      title,
      description,
      files: uploadedFiles,
      academicYear: academicYear || new Date().getFullYear().toString(),
      status: 'submitted'
    });

    // Populate event details
    await report.populate('event', 'title startDate endDate location');
    await report.populate('student', 'name email studentId');

    // Analyze with Gemini AI (async, don't wait)
    analyzeStudentReport(report)
      .then(async (analysis) => {
        await Report.findByIdAndUpdate(report._id, {
          aiSummary: analysis.summary,
          aiAnalysis: {
            keyPoints: analysis.keyPoints,
            learnings: analysis.learnings,
            impact: analysis.impact,
            recommendations: analysis.recommendations,
            generatedAt: new Date()
          }
        });
        console.log(`✅ AI analysis completed for report ${report._id}`);
      })
      .catch(err => console.error('AI analysis failed:', err));

    res.status(201).json({
      message: 'Report submitted successfully. AI analysis in progress.',
      report
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already submitted a report for this event' });
    }
    console.error('Submit report error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/reports/student/my-reports
// @desc    Get all reports submitted by the logged-in student
// @access  Private (Student)
router.get('/student/my-reports', auth, async (req, res) => {
  try {
    const reports = await Report.find({ student: req.user.id })
      .populate('event', 'title startDate endDate location')
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (error) {
    console.error('Get student reports error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reports/admin/all
// @desc    Get all student reports (Admin)
// @access  Private (Admin/Faculty)
router.get('/admin/all', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const { eventId, academicYear, status } = req.query;
    
    const query = {};
    if (eventId) query.event = eventId;
    if (academicYear) query.academicYear = academicYear;
    if (status) query.status = status;

    const reports = await Report.find(query)
      .populate('student', 'name email studentId department')
      .populate('event', 'title startDate endDate location')
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (error) {
    console.error('Get all reports error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/reports/admin/analyze/:reportId
// @desc    Manually trigger AI analysis for a report
// @access  Private (Admin/Faculty)
router.post('/admin/analyze/:reportId', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const report = await Report.findById(req.params.reportId)
      .populate('event', 'title')
      .populate('student', 'name');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const analysis = await analyzeStudentReport(report);

    const updatedReport = await Report.findByIdAndUpdate(
      report._id,
      {
        aiSummary: analysis.summary,
        aiAnalysis: {
          keyPoints: analysis.keyPoints,
          learnings: analysis.learnings,
          impact: analysis.impact,
          recommendations: analysis.recommendations,
          generatedAt: new Date()
        }
      },
      { new: true }
    );

    res.json({
      message: 'AI analysis completed',
      analysis: updatedReport.aiAnalysis,
      summary: updatedReport.aiSummary
    });
  } catch (error) {
    console.error('Analyze report error:', error);
    res.status(500).json({ message: 'Failed to analyze report', error: error.message });
  }
});

// @route   POST /api/reports/admin/generate-naac
// @desc    Generate NAAC report using Gemini AI
// @access  Private (Admin)
router.post('/admin/generate-naac', [auth, authorize('admin')], async (req, res) => {
  try {
    const { academicYear } = req.body;

    if (!academicYear) {
      return res.status(400).json({ message: 'Academic year is required' });
    }

    // Fetch all approved reports for the academic year
    const reports = await Report.find({
      academicYear,
      status: { $in: ['submitted', 'reviewed', 'approved'] }
    })
      .populate('student', 'name email studentId department')
      .populate('event', 'title startDate endDate location category eventType');

    if (reports.length === 0) {
      return res.status(404).json({ message: 'No reports found for this academic year' });
    }

    console.log(`📊 Generating NAAC report for ${academicYear} with ${reports.length} reports...`);

    const naacReport = await generateConsolidatedReport(reports, academicYear, 'NAAC');

    res.json({
      message: 'NAAC report generated successfully',
      report: naacReport
    });
  } catch (error) {
    console.error('Generate NAAC report error:', error.cause || error);
    const status = error.statusCode || 500;
    res.status(status).json({
      message: error.clientMessage || error.message || 'Failed to generate NAAC report',
      details: process.env.NODE_ENV !== 'production' ? error.details : undefined
    });
  }
});

// @route   POST /api/reports/admin/generate-ugc
// @desc    Generate UGC report using Gemini AI
// @access  Private (Admin)
router.post('/admin/generate-ugc', [auth, authorize('admin')], async (req, res) => {
  try {
    const { academicYear } = req.body;

    if (!academicYear) {
      return res.status(400).json({ message: 'Academic year is required' });
    }

    const reports = await Report.find({
      academicYear,
      status: { $in: ['submitted', 'reviewed', 'approved'] }
    })
      .populate('student', 'name email studentId department')
      .populate('event', 'title startDate endDate location category eventType');

    if (reports.length === 0) {
      return res.status(404).json({ message: 'No reports found for this academic year' });
    }

    console.log(`📊 Generating UGC report for ${academicYear} with ${reports.length} reports...`);

    const ugcReport = await generateConsolidatedReport(reports, academicYear, 'UGC');

    res.json({
      message: 'UGC report generated successfully',
      report: ugcReport
    });
  } catch (error) {
    console.error('Generate UGC report error:', error.cause || error);
    const status = error.statusCode || 500;
    res.status(status).json({
      message: error.clientMessage || error.message || 'Failed to generate UGC report',
      details: process.env.NODE_ENV !== 'production' ? error.details : undefined
    });
  }
});

// @route   POST /api/reports/admin/consolidated-pdf
// @desc    Generate consolidated AI report PDF and upload to Cloudinary
// @access  Private (Admin/Faculty)
router.post('/admin/consolidated-pdf', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const { academicYear, reportType = 'NAAC', content, statistics, totals } = req.body;

    if (!academicYear) {
      return res.status(400).json({ message: 'Academic year is required' });
    }

    const normalizedType = reportType.toUpperCase();
    if (!['NAAC', 'UGC', 'CUSTOM'].includes(normalizedType)) {
      return res.status(400).json({ message: 'Invalid report type' });
    }

    let consolidated;

    if (content) {
      consolidated = {
        reportType: normalizedType,
        academicYear,
        totalEvents: totals?.events ?? 0,
        totalReports: totals?.reports ?? 0,
        totalStudents: totals?.students ?? 0,
        generatedAt: totals?.generatedAt ? new Date(totals.generatedAt) : new Date(),
        content,
        statistics: statistics || {}
      };
    } else {
      const reports = await Report.find({
        academicYear,
        status: { $in: ['submitted', 'reviewed', 'approved'] }
      })
        .populate('student', 'name email studentId department')
        .populate('event', 'title startDate endDate location category eventType');

      if (reports.length === 0) {
        return res.status(404).json({ message: 'No reports found for this academic year' });
      }

      consolidated = await generateConsolidatedReport(reports, academicYear, normalizedType);
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 18;
    let cursorY = 20;

    const ensureSpace = (height) => {
      if (cursorY + height > pageHeight - 20) {
        doc.addPage();
        cursorY = 20;
      }
    };

    const addHeading = (text, size = 16, spacing = 8) => {
      ensureSpace(spacing + size / 2);
      doc.setFontSize(size);
      doc.setFont(undefined, 'bold');
      doc.text(text, pageWidth / 2, cursorY, { align: 'center' });
      cursorY += spacing;
      doc.setFont(undefined, 'normal');
    };

    const addSubHeading = (text, size = 13, spacing = 6) => {
      ensureSpace(spacing + size / 2);
      doc.setFontSize(size);
      doc.setFont(undefined, 'bold');
      doc.text(text, marginX, cursorY);
      cursorY += spacing;
      doc.setFont(undefined, 'normal');
    };

    const addParagraph = (text, size = 11, spacing = 5) => {
      if (!text) return;
      doc.setFontSize(size);
      const maxWidth = pageWidth - marginX * 2;
      const lines = doc.splitTextToSize(text.trim(), maxWidth);
      lines.forEach(line => {
        ensureSpace(spacing);
        doc.text(line, marginX, cursorY);
        cursorY += spacing;
      });
      cursorY += 2;
    };

    // Header
    addHeading(`NSS ${normalizedType} Report`, 20, 12);
    addParagraph(`Academic Year: ${academicYear}-${parseInt(academicYear, 10) + 1}`);
    addParagraph(`Generated On: ${new Date(consolidated.generatedAt).toLocaleString()}`);
    addParagraph(`Total Events: ${consolidated.totalEvents || 0}   |   Total Reports: ${consolidated.totalReports || 0}   |   Students Participated: ${consolidated.totalStudents || 0}`);

    // Statistics Section
    addSubHeading('Key Metrics');
    if (consolidated.statistics?.eventsBreakdown) {
      Object.entries(consolidated.statistics.eventsBreakdown).forEach(([key, value]) => {
        addParagraph(`${key}: ${value}`);
      });
    }

    if (consolidated.statistics?.impactMetrics) {
      const { totalVolunteerHours, estimatedBeneficiaries, averageReportLength } = consolidated.statistics.impactMetrics;
      if (typeof totalVolunteerHours !== 'undefined') {
        addParagraph(`Total Volunteer Hours: ${totalVolunteerHours}`);
      }
      if (typeof estimatedBeneficiaries !== 'undefined') {
        addParagraph(`Estimated Beneficiaries: ${estimatedBeneficiaries}`);
      }
      if (typeof averageReportLength !== 'undefined') {
        addParagraph(`Average Report Length: ${averageReportLength} characters`);
      }
    }

    // Main Content
    addSubHeading('AI Consolidated Report');
    consolidated.content.split('\n').forEach((block) => {
      if (block.trim().length === 0) {
        cursorY += 3;
        return;
      }
      addParagraph(block, 11, 5);
    });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    try {
      const dataUri = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
      const uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: `nss-reports/consolidated/${academicYear}`,
        public_id: `${normalizedType.toLowerCase()}-${Date.now()}`,
        resource_type: 'raw'
      });
      if (uploadResult?.secure_url) {
        res.setHeader('X-Cloudinary-URL', uploadResult.secure_url);
      }
    } catch (uploadError) {
      console.error('Upload consolidated PDF error:', uploadError.message);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${normalizedType.toLowerCase()}-report-${academicYear}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate consolidated PDF error:', error.cause || error);
    const status = error.statusCode || 500;
    res.status(status).json({
      message: error.clientMessage || error.message || 'Failed to generate consolidated PDF',
      details: process.env.NODE_ENV !== 'production' ? error.details : undefined
    });
  }
});

// @route   POST /api/reports/admin/event-summary/:eventId
// @desc    Generate AI summary for specific event from all student reports
// @access  Private (Admin/Faculty)
router.post('/admin/event-summary/:eventId', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const reports = await Report.find({
      event: req.params.eventId,
      status: { $in: ['submitted', 'reviewed', 'approved'] }
    }).populate('student', 'name email');

    if (reports.length === 0) {
      return res.status(404).json({ message: 'No reports found for this event' });
    }

    console.log(`📝 Generating summary for event ${event.title} with ${reports.length} reports...`);

    const summary = await generateEventSummary(reports, event);

    event.summaryReport = {
      ...(event.summaryReport || {}),
      summaryText: summary,
      reportType: 'event',
      generatedAt: new Date(),
      url: event.summaryReport?.url || null,
      publicId: event.summaryReport?.publicId || null
    };
    await event.save();

    res.json({
      message: 'Event summary generated successfully',
      event: {
        id: event._id,
        title: event.title,
        date: `${new Date(event.startDate).toLocaleDateString()} - ${new Date(event.endDate).toLocaleDateString()}`
      },
      totalReports: reports.length,
      summary
    });
  } catch (error) {
    console.error('Generate event summary error:', error.cause || error);
    const status = error.statusCode || 500;
    res.status(status).json({
      message: error.clientMessage || error.message || 'Failed to generate event summary',
      details: process.env.NODE_ENV !== 'production' ? error.details : undefined
    });
  }
});

// @route   GET /api/reports/file-proxy
// @desc    Proxy Cloudinary report files and force inline preview
// @access  Private (Admin/Faculty)
router.get('/file-proxy', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const maxProxyFileSizeBytes = 50 * 1024 * 1024;
    const fileUrl = req.query.url;

    if (!fileUrl || typeof fileUrl !== 'string') {
      return res.status(400).json({ message: 'File URL is required' });
    }

    // Basic safety check: only allow Cloudinary NSS report URLs
    if (!fileUrl.startsWith('https://res.cloudinary.com') || !fileUrl.includes('/nss-reports/')) {
      return res.status(400).json({ message: 'Invalid file URL' });
    }

    console.log('📄 Proxying file:', fileUrl);

    const response = await fetch(fileUrl);
    if (!response.ok) {
      console.error('Cloudinary fetch failed:', response.status, await response.text().catch(() => ''));
      return res.status(502).json({ message: 'Failed to fetch file from storage' });
    }

    const contentLengthHeader = response.headers.get('content-length');
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;
    if (contentLength !== null && Number.isFinite(contentLength) && contentLength > maxProxyFileSizeBytes) {
      return res.status(413).json({ message: 'File is too large to proxy' });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('✅ File fetched, size:', buffer.length, 'bytes, type:', contentType);

    // Determine content type from URL if Cloudinary doesn't provide it correctly
    let finalContentType = contentType;
    if (fileUrl.includes('.pdf')) {
      finalContentType = 'application/pdf';
    } else if (fileUrl.match(/\.(jpg|jpeg)$/i)) {
      finalContentType = 'image/jpeg';
    } else if (fileUrl.includes('.png')) {
      finalContentType = 'image/png';
    } else if (fileUrl.match(/\.(doc|docx)$/i)) {
      finalContentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    res.setHeader('Content-Type', finalContentType);
    res.setHeader('Content-Length', buffer.length);
    // Force inline display; browser will show if it knows the type (e.g. PDF)
    res.setHeader('Content-Disposition', 'inline');
    // Prevent caching issues
    res.setHeader('Cache-Control', 'no-cache');
    res.send(buffer);
  } catch (error) {
    console.error('File proxy error:', error);
    res.status(500).json({ message: 'Failed to proxy file', error: error.message });
  }
});

router.get('/admin/event/:eventId/submissions', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).select('title startDate endDate location');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const reports = await Report.find({
      event: req.params.eventId,
      status: { $in: ['submitted', 'reviewed', 'approved'] }
    })
      .populate('student', 'name email studentId department')
      .sort({ createdAt: -1 });

    const payload = reports.map(report => ({
      id: report._id,
      title: report.title,
      description: report.description,
      academicYear: report.academicYear,
      status: report.status,
      submittedAt: report.createdAt,
      student: report.student ? {
        id: report.student._id,
        name: report.student.name,
        email: report.student.email,
        studentId: report.student.studentId,
        department: report.student.department
      } : null,
      files: report.files?.map(file => ({
        url: file.url,
        fileName: file.fileName,
        fileType: file.fileType,
        uploadedAt: file.uploadedAt,
        publicId: file.publicId
      })) || []
    }));

    res.json({
      event: {
        id: event._id,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location
      },
      totalReports: payload.length,
      reports: payload
    });
  } catch (error) {
    console.error('Get event submissions error:', error);
    res.status(500).json({ message: 'Failed to fetch submissions', error: error.message });
  }
});

router.post('/admin/event-summary/:eventId/pdf', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const reports = await Report.find({
      event: req.params.eventId,
      status: { $in: ['submitted', 'reviewed', 'approved'] }
    })
      .populate('student', 'name email studentId');

    if (reports.length === 0) {
      return res.status(404).json({ message: 'No reports found for this event' });
    }

    const summary = await generateEventSummary(reports, event);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.text('NSS Event Summary', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    let cursorY = 35;
    const detailLines = [
      `Event: ${event.title}`,
      `Date: ${new Date(event.startDate).toLocaleDateString()} - ${new Date(event.endDate).toLocaleDateString()}`,
      `Location: ${event.location}`,
      `Reports Analyzed: ${reports.length}`
    ];
    detailLines.forEach((line) => {
      doc.text(line, 15, cursorY);
      cursorY += 6;
    });

    cursorY += 4;
    doc.setFontSize(14);
    doc.text('AI Generated Summary', 15, cursorY);
    cursorY += 8;
    doc.setFontSize(12);
    cursorY = addWrappedText(doc, summary, cursorY, { topMargin: 25 });

    cursorY += 6;
    doc.setFontSize(14);
    doc.text('Participants', 15, cursorY);
    cursorY += 8;
    doc.setFontSize(11);
    reports.forEach((report, index) => {
      const participantLine = `${index + 1}. ${report.student?.name || 'Unknown Student'}${report.student?.studentId ? ` (${report.student.studentId})` : ''}`;
      cursorY = addWrappedText(doc, participantLine, cursorY, { topMargin: 25, lineHeight: 5 });
    });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const base64 = pdfBuffer.toString('base64');
    const uploadResult = await cloudinary.uploader.upload(
      `data:application/pdf;base64,${base64}`,
      {
        folder: 'nss-event-summaries',
        resource_type: 'raw',
        public_id: `event-summary-${event._id}-${Date.now()}`
      }
    );

    event.summaryReport = {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      generatedAt: new Date(),
      summaryText: summary,
      reportType: 'event'
    };
    await event.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="event-summary-${event._id}.pdf"`);
    res.setHeader('X-Cloudinary-Url', uploadResult.secure_url);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate event summary PDF error:', error.cause || error);
    const status = error.statusCode || 500;
    res.status(status).json({
      message: error.clientMessage || error.message || 'Failed to generate event summary PDF',
      details: process.env.NODE_ENV !== 'production' ? error.details : undefined
    });
  }
});

router.post('/admin/consolidated-pdf', [auth, authorize('admin')], async (req, res) => {
  try {
    const { academicYear, reportType = 'NAAC' } = req.body;

    if (!academicYear) {
      return res.status(400).json({ message: 'Academic year is required' });
    }

    const normalizedType = typeof reportType === 'string' ? reportType.toUpperCase() : 'NAAC';

    const reports = await Report.find({
      academicYear,
      status: { $in: ['submitted', 'reviewed', 'approved'] }
    })
      .populate('student', 'name studentId department')
      .populate('event', 'title startDate endDate location eventType category');

    if (reports.length === 0) {
      return res.status(404).json({ message: 'No reports found for the selected academic year' });
    }

    const consolidatedReport = await generateConsolidatedReport(reports, academicYear, normalizedType);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.text(`NSS ${normalizedType} Report`, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    let cursorY = 32;
    const stats = [
      `Academic Year: ${academicYear}-${parseInt(academicYear, 10) + 1}`,
      `Total Events: ${consolidatedReport.totalEvents}`,
      `Total Reports Analyzed: ${consolidatedReport.totalReports}`,
      `Total Students Participated: ${consolidatedReport.totalStudents}`,
      `Generated At: ${new Date(consolidatedReport.generatedAt).toLocaleString()}`
    ];
    stats.forEach((line) => {
      doc.text(line, 15, cursorY);
      cursorY += 6;
    });

    cursorY += 4;
    doc.setFontSize(14);
    doc.text('Executive Summary', 15, cursorY);
    cursorY += 8;
    doc.setFontSize(12);
    cursorY = addWrappedText(doc, consolidatedReport.content, cursorY, { topMargin: 25 });

    if (consolidatedReport.statistics) {
      cursorY += 6;
      doc.setFontSize(14);
      doc.text('Key Metrics', 15, cursorY);
      cursorY += 8;
      doc.setFontSize(12);

      if (consolidatedReport.statistics.eventsBreakdown) {
        cursorY = addWrappedText(doc, 'Events by Category:', cursorY, { topMargin: 25 });
        Object.entries(consolidatedReport.statistics.eventsBreakdown).forEach(([category, count]) => {
          cursorY = addWrappedText(doc, `• ${category}: ${count}`, cursorY, { topMargin: 25 });
        });
      }

      if (consolidatedReport.statistics.participationTrends) {
        cursorY += 4;
        cursorY = addWrappedText(doc, 'Participation Trends:', cursorY, { topMargin: 25 });
        Object.entries(consolidatedReport.statistics.participationTrends).forEach(([month, total]) => {
          cursorY = addWrappedText(doc, `• ${month}: ${total}`, cursorY, { topMargin: 25 });
        });
      }

      if (consolidatedReport.statistics.impactMetrics) {
        cursorY += 4;
        cursorY = addWrappedText(doc, 'Impact Metrics:', cursorY, { topMargin: 25 });
        const { totalVolunteerHours, estimatedBeneficiaries, averageReportLength } = consolidatedReport.statistics.impactMetrics;
        cursorY = addWrappedText(doc, `• Total Volunteer Hours: ${totalVolunteerHours}`, cursorY, { topMargin: 25 });
        cursorY = addWrappedText(doc, `• Estimated Beneficiaries: ${estimatedBeneficiaries}`, cursorY, { topMargin: 25 });
        cursorY = addWrappedText(doc, `• Average Report Length: ${averageReportLength} characters`, cursorY, { topMargin: 25 });
      }
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const base64 = pdfBuffer.toString('base64');
    const uploadResult = await cloudinary.uploader.upload(
      `data:application/pdf;base64,${base64}`,
      {
        folder: 'nss-consolidated-reports',
        resource_type: 'raw',
        public_id: `${normalizedType.toLowerCase()}-report-${academicYear}-${Date.now()}`
      }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${normalizedType.toLowerCase()}-report-${academicYear}.pdf"`);
    res.setHeader('X-Cloudinary-Url', uploadResult.secure_url);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate consolidated PDF error:', error);
    res.status(500).json({ message: 'Failed to generate consolidated PDF', error: error.message });
  }
});

// @route   PUT /api/reports/admin/review/:reportId
// @desc    Review and approve/reject student report
// @access  Private (Admin/Faculty)
router.put('/admin/review/:reportId', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const { status, reviewNotes } = req.body;

    if (!['reviewed', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const report = await Report.findByIdAndUpdate(
      req.params.reportId,
      {
        status,
        reviewNotes,
        reviewedBy: req.user.id,
        reviewedAt: new Date()
      },
      { new: true }
    )
      .populate('student', 'name email')
      .populate('event', 'title');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json({
      message: `Report ${status} successfully`,
      report
    });
  } catch (error) {
    console.error('Review report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


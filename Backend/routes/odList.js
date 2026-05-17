const express = require('express');

const router = express.Router();

const Event = require('../models/Event');

const Participation = require('../models/Participation');

const User = require('../models/User');

const PeriodConfig = require('../models/PeriodConfig');

const { auth, authorize } = require('../middleware/auth');

const XLSX = require('xlsx');

const { generateODLetterPDF, generateBatchODLetterPDFs } = require('../utils/odLetterPDF');



// Get OD list for an event

router.get('/event/:eventId', [auth, authorize('admin', 'faculty')], async (req, res) => {

  try {

    const event = await Event.findById(req.params.eventId)

      .populate({

        path: 'participations',

        populate: {

          path: 'student',

          select: 'name studentId year department email'

        }

      });



    if (!event) {

      return res.status(404).json({ message: 'Event not found' });

    }



    // Get active period configuration

    const periodConfig = await PeriodConfig.findOne({ isActive: true });

    

    // Filter approved participants only

    const approvedParticipants = event.participations.filter(

      participation => participation.status === 'approved' || participation.status === 'attended'

    );



    const odList = approvedParticipants.map(participation => {

      const student = participation.student;

      const eventStartTime = new Date(event.startDate).toTimeString().slice(0, 5);

      const eventEndTime = new Date(event.endDate).toTimeString().slice(0, 5);

      

      // Get matching periods for this student's year

      let matchingPeriods = [];

      if (periodConfig && student.year) {

        const yearPeriods = periodConfig.periods[student.year] || [];

        matchingPeriods = getMatchingPeriods(yearPeriods, eventStartTime, eventEndTime);

      }



      return {

        registrationNumber: student.studentId,

        name: student.name,

        year: student.year,

        department: student.department,

        email: student.email,

        status: participation.status,

        attendance: participation.attendance,

        periods: matchingPeriods,

        eventTitle: event.title,

        eventDate: new Date(event.startDate).toLocaleDateString(),

        eventStartTime,

        eventEndTime

      };

    });



    res.json({

      event: {

        title: event.title,

        date: new Date(event.startDate).toLocaleDateString(),

        startTime: eventStartTime,

        endTime: eventEndTime

      },

      participants: odList

    });

  } catch (error) {

    console.error('Error fetching OD list:', error);

    res.status(500).json({ message: 'Failed to fetch OD list' });

  }

});



// Generate and download OD list as Excel

router.get('/event/:eventId/download', [auth, authorize('admin', 'faculty')], async (req, res) => {

  try {

    const event = await Event.findById(req.params.eventId)

      .populate({

        path: 'participations',

        populate: {

          path: 'student',

          select: 'name studentId year department email'

        }

      });



    if (!event) {

      return res.status(404).json({ message: 'Event not found' });

    }



    // Get active period configuration

    const periodConfig = await PeriodConfig.findOne({ isActive: true });

    

    // Filter approved participants only

    const approvedParticipants = event.participations.filter(

      participation => participation.status === 'approved' || participation.status === 'attended'

    );



    // Prepare data for Excel

    const excelData = [];

    

    // Add event information header

    excelData.push(['EVENT OD LIST']);

    excelData.push(['Event Name:', event.title]);

    excelData.push(['Date:', new Date(event.startDate).toLocaleDateString()]);

    excelData.push(['Time:', `${new Date(event.startDate).toTimeString().slice(0, 5)} - ${new Date(event.endDate).toTimeString().slice(0, 5)}`]);

    excelData.push([]); // Empty row

    

    // Add headers

    excelData.push([

      'Registration Number',

      'Name',

      'Year',

      'Department',

      'Status',

      'Attendance',

      'Periods',

      'Email'

    ]);



    // Add participant data

    approvedParticipants.forEach(participation => {

      const student = participation.student;

      const eventStartTime = new Date(event.startDate).toTimeString().slice(0, 5);

      const eventEndTime = new Date(event.endDate).toTimeString().slice(0, 5);

      

      // Get matching periods for this student's year

      let matchingPeriods = [];

      if (periodConfig && student.year) {

        const yearPeriods = periodConfig.periods[student.year] || [];

        matchingPeriods = getMatchingPeriods(yearPeriods, eventStartTime, eventEndTime);

      }



      excelData.push([

        student.studentId || '',

        student.name || '',

        student.year || '',

        student.department || '',

        participation.status || '',

        participation.attendance ? 'Present' : 'Absent',

        matchingPeriods.map(p => `Period ${p.periodNumber}`).join(', ') || '',

        student.email || ''

      ]);

    });



    // Create workbook and worksheet

    const ws = XLSX.utils.aoa_to_sheet(excelData);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, 'OD List');



    // Set column widths

    const colWidths = [

      { wch: 20 }, // Registration Number

      { wch: 30 }, // Name

      { wch: 10 }, // Year

      { wch: 20 }, // Department

      { wch: 15 }, // Status

      { wch: 12 }, // Attendance

      { wch: 20 }, // Periods

      { wch: 35 }  // Email

    ];

    ws['!cols'] = colWidths;



    // Generate buffer

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });



    // Set headers for download

    const fileName = `OD_List_${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date(event.startDate).toLocaleDateString().replace(/\//g, '-')}.xlsx`;

    

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    res.send(excelBuffer);

  } catch (error) {

    console.error('Error generating OD list:', error);

    res.status(500).json({ message: 'Failed to generate OD list' });

  }

});



// Helper function to get matching periods

function getMatchingPeriods(yearPeriods, eventStartTime, eventEndTime) {

  const matchingPeriods = [];

  

  yearPeriods.forEach(period => {

    const periodStart = parseTime(period.startTime);

    const periodEnd = parseTime(period.endTime);

    const eventStart = parseTime(eventStartTime);

    const eventEnd = parseTime(eventEndTime);

    

    // Check if event overlaps with this period

    if ((eventStart >= periodStart && eventStart < periodEnd) ||

        (eventEnd > periodStart && eventEnd <= periodEnd) ||

        (eventStart <= periodStart && eventEnd >= periodEnd)) {

      matchingPeriods.push(period);

    }

  });

  

  return matchingPeriods;

}



// Helper function to parse time string (HH:MM) to minutes

function parseTime(timeString) {

  const [hours, minutes] = timeString.split(':').map(Number);

  return hours * 60 + minutes;

}

// Generate and download department-wise OD letter PDF (faculty-countersigned)
router.get('/event/:eventId/letter-pdf/:department', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const { eventId, department } = req.params;
    
    const event = await Event.findById(eventId)
      .populate({
        path: 'participations',
        populate: {
          path: 'student',
          select: 'name studentId year department email'
        }
      });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Filter approved participants for this department
    const approvedParticipants = event.participations
      .filter(p => (p.status === 'approved' || p.status === 'attended') && p.student.department === department)
      .map(p => ({
        registrationNumber: p.student.studentId,
        name: p.student.name,
        year: p.student.year,
        department: p.student.department,
        email: p.student.email,
        status: p.status,
        attendance: p.attendance
      }));

    if (approvedParticipants.length === 0) {
      return res.status(404).json({ message: 'No participants found for this department' });
    }

    // Generate PDF
    const pdfBuffer = await generateODLetterPDF({
      event,
      participants: approvedParticipants,
      department
    });

    // Set response headers
    const fileName = `OD_Letter_${department}_${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date(event.startDate).toLocaleDateString().replace(/\//g, '-')}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating OD letter PDF:', error);
    res.status(500).json({ message: 'Failed to generate OD letter PDF', error: error.message });
  }
});

// Get list of departments with participant counts for an event
router.get('/event/:eventId/departments', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const event = await Event.findById(eventId)
      .populate({
        path: 'participations',
        populate: {
          path: 'student',
          select: 'department'
        }
      });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Group by department
    const departmentStats = {};
    event.participations
      .filter(p => (p.status === 'approved' || p.status === 'attended'))
      .forEach(p => {
        const dept = p.student.department || 'Unknown';
        departmentStats[dept] = (departmentStats[dept] || 0) + 1;
      });

    res.json({
      event: { id: event._id, title: event.title },
      departments: Object.entries(departmentStats).map(([name, count]) => ({
        name,
        participants: count,
        letterUrl: `/api/od-list/event/${eventId}/letter-pdf/${name}`
      }))
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
});

module.exports = router;


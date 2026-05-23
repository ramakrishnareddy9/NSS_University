const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Participation = require('../models/Participation');
const PeriodConfig = require('../models/PeriodConfig');
const { auth, authorize } = require('../middleware/auth');
const XLSX = require('xlsx');

// Get OD list for an event
router.get('/event/:eventId', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Get active period configuration
    const periodConfig = await PeriodConfig.findOne({ isActive: true });

    // Fetch participations separately to avoid large Event documents
    const allParticipations = await Participation.find({ event: event._id, isDeleted: { $ne: true } })
      .populate('student', 'name studentId year department email')
      .sort({ createdAt: -1 });

    // Filter approved participants only
    const approvedParticipants = allParticipations.filter(p => p.status === 'approved' || p.status === 'attended');

    // Compute event times once
    const eventStartTime = new Date(event.startDate).toTimeString().slice(0, 5);
    const eventEndTime = new Date(event.endDate).toTimeString().slice(0, 5);

    const odList = approvedParticipants.map(participation => {
      const student = participation.student || {};

      // Get matching periods for this student's year
      let matchingPeriods = [];
      if (periodConfig && student.year) {
        const yearPeriods = periodConfig.periods[student.year] || [];
        matchingPeriods = getMatchingPeriods(yearPeriods, eventStartTime, eventEndTime);
      }

      return {
        registrationNumber: student.studentId || '',
        name: student.name || '',
        year: student.year || '',
        department: student.department || '',
        email: student.email || '',
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
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const periodConfig = await PeriodConfig.findOne({ isActive: true });

    const allParticipations = await Participation.find({ event: event._id, isDeleted: { $ne: true } })
      .populate('student', 'name studentId year department email')
      .sort({ createdAt: -1 });

    const approvedParticipants = allParticipations.filter(p => p.status === 'approved' || p.status === 'attended');

    const eventStartTime = new Date(event.startDate).toTimeString().slice(0, 5);
    const eventEndTime = new Date(event.endDate).toTimeString().slice(0, 5);

    const excelData = [];
    excelData.push(['EVENT OD LIST']);
    excelData.push(['Event Name:', event.title]);
    excelData.push(['Date:', new Date(event.startDate).toLocaleDateString()]);
    excelData.push(['Time:', `${eventStartTime} - ${eventEndTime}`]);
    excelData.push([]);
    excelData.push([
      'Registration Number', 'Name', 'Year', 'Department', 'Status', 'Attendance', 'Periods', 'Email'
    ]);

    approvedParticipants.forEach(participation => {
      const student = participation.student || {};
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

    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'OD List');

    ws['!cols'] = [
      { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 35 }
    ];

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

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

module.exports = router;

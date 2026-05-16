const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Event = require('../models/Event');
const Participation = require('../models/Participation');
const { auth, authorize } = require('../middleware/auth');

// @route   GET /api/stats/landing
// @desc    Get statistics for landing page
// @access  Public
router.get('/landing', async (req, res) => {
  try {
    // Count total students (users with role 'student')
    const totalStudents = await User.countDocuments({ role: 'student' });

    // Count total events
    const totalEvents = await Event.countDocuments();

    // Count unique departments as a proxy for institutions (no 'college' field in user schema)
    const departments = await User.distinct('department', { role: 'student' });
    const totalInstitutions = departments.filter(d => d && d.trim() !== '').length || 1;

    // Calculate total volunteer hours from actual recorded values
    const userHoursResult = await User.aggregate([
      { $match: { role: 'student' } },
      { $group: { _id: null, totalHours: { $sum: { $ifNull: ['$totalVolunteerHours', 0] } } } }
    ]);
    const userTotalHours = userHoursResult.length > 0 ? userHoursResult[0].totalHours : 0;

    // Fallback: sum participation hours for attended records
    const participationHoursResult = await Participation.aggregate([
      { $match: { attendance: true } },
      { $group: { _id: null, totalHours: { $sum: { $ifNull: ['$volunteerHours', 0] } } } }
    ]);
    const participationTotalHours = participationHoursResult.length > 0 ? participationHoursResult[0].totalHours : 0;

    const totalHours = Math.max(userTotalHours, participationTotalHours);

    const participations = await Participation.countDocuments({ status: 'approved' });

    res.json({
      success: true,
      totalStudents,
      totalEvents,
      totalInstitutions,
      totalHours,
      participations
    });
  } catch (error) {
    console.error('Error fetching landing statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// @route   GET /api/stats/dashboard
// @desc    Get detailed statistics for admin dashboard
// @access  Private (Admin)
router.get('/dashboard', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalFaculty = await User.countDocuments({ role: 'faculty' });
    const totalEvents = await Event.countDocuments();
    const activeEvents = await Event.countDocuments({ status: { $in: ['published', 'ongoing'] } });
    const completedEvents = await Event.countDocuments({ status: 'completed' });
    
    const totalParticipations = await Participation.countDocuments();
    const approvedParticipations = await Participation.countDocuments({ status: 'approved' });
    const pendingParticipations = await Participation.countDocuments({ status: 'pending' });

    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRegistrations = await User.countDocuments({
      role: 'student',
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.json({
      success: true,
      students: {
        total: totalStudents,
        recent: recentRegistrations
      },
      faculty: {
        total: totalFaculty
      },
      events: {
        total: totalEvents,
        active: activeEvents,
        completed: completedEvents
      },
      participations: {
        total: totalParticipations,
        approved: approvedParticipations,
        pending: pendingParticipations
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

module.exports = router;

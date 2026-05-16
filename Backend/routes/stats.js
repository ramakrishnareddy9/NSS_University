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

    // Calculate total hours of service
    // Sum up all event durations or participation hours
    const events = await Event.find({}, 'duration');
    const totalHours = events.reduce((sum, event) => {
      // Assuming duration is in hours, or calculate from event dates
      return sum + (event.duration || 0);
    }, 0);

    // Alternative: Calculate from participations
    const participations = await Participation.countDocuments({ status: 'approved' });
    const estimatedHours = participations * 8; // Assuming average 8 hours per participation

    res.json({
      success: true,
      totalStudents,
      totalEvents,
      totalInstitutions,
      totalHours: Math.max(totalHours, estimatedHours),
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

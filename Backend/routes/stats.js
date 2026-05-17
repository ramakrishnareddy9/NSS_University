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

// @route   GET /api/stats/event-capacity
// @desc    Get event capacity analytics (waitlist, filling rate, etc.)
// @access  Private (Admin only)
router.get('/event-capacity', [auth, authorize('admin')], async (req, res) => {
  try {
    // Get all published/ongoing events with capacity tracking
    const events = await Event.find({
      status: { $in: ['published', 'ongoing', 'completed'] },
      maxParticipants: { $ne: null }
    })
      .select('title maxParticipants currentParticipants startDate endDate status')
      .lean();

    // Enrich with waitlist data
    const enrichedEvents = await Promise.all(events.map(async (event) => {
      const waitlisted = await Participation.countDocuments({
        event: event._id,
        waitlistStatus: 'waitlisted'
      });

      const fillingPercentage = event.maxParticipants 
        ? Math.round((event.currentParticipants / event.maxParticipants) * 100) 
        : 0;

      const isAtCapacity = event.currentParticipants >= event.maxParticipants;
      const spotsRemaining = Math.max(0, event.maxParticipants - event.currentParticipants);

      return {
        id: event._id,
        title: event.title,
        status: event.status,
        startDate: event.startDate,
        endDate: event.endDate,
        maxCapacity: event.maxParticipants,
        currentParticipants: event.currentParticipants,
        waitlistedCount: waitlisted,
        fillingPercentage,
        isAtCapacity,
        spotsRemaining,
        totalWantedSpots: event.currentParticipants + waitlisted
      };
    }));

    // Calculate aggregate analytics
    const totalEvents = enrichedEvents.length;
    const atCapacityEvents = enrichedEvents.filter(e => e.isAtCapacity).length;
    const totalWaitlisted = enrichedEvents.reduce((sum, e) => sum + e.waitlistedCount, 0);
    const avgFillingRate = totalEvents > 0 
      ? Math.round(enrichedEvents.reduce((sum, e) => sum + e.fillingPercentage, 0) / totalEvents)
      : 0;

    // Get events sorted by waitlist size (highest first)
    const eventsWithWaitlist = enrichedEvents
      .filter(e => e.waitlistedCount > 0)
      .sort((a, b) => b.waitlistedCount - a.waitlistedCount);

    // Get events sorted by filling percentage
    const mostFilledEvents = enrichedEvents
      .sort((a, b) => b.fillingPercentage - a.fillingPercentage)
      .slice(0, 10);

    res.json({
      success: true,
      summary: {
        totalCapacityLimitedEvents: totalEvents,
        eventsAtCapacity: atCapacityEvents,
        totalWaitlistedStudents: totalWaitlisted,
        averageFillingRate: avgFillingRate
      },
      eventsWithWaitlist,
      mostFilledEvents,
      allEvents: enrichedEvents
    });
  } catch (error) {
    console.error('Error fetching event capacity analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching event capacity analytics',
      error: error.message
    });
  }
});

// @route   GET /api/stats/event-capacity/:eventId
// @desc    Get detailed capacity analytics for a specific event
// @access  Private (Admin only)
router.get('/event-capacity/:eventId', [auth, authorize('admin')], async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .select('title maxParticipants currentParticipants startDate endDate status description')
      .lean();

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Get all participations breakdown
    const totalParticipations = await Participation.countDocuments({ event: req.params.eventId });
    const confirmedCount = await Participation.countDocuments({
      event: req.params.eventId,
      waitlistStatus: { $ne: 'waitlisted' },
      status: { $ne: 'rejected', $ne: 'cancelled' }
    });
    const waitlistedCount = await Participation.countDocuments({
      event: req.params.eventId,
      waitlistStatus: 'waitlisted'
    });
    const attendedCount = await Participation.countDocuments({
      event: req.params.eventId,
      attendance: true
    });
    const rejectedCount = await Participation.countDocuments({
      event: req.params.eventId,
      status: 'rejected'
    });
    const cancelledCount = await Participation.countDocuments({
      event: req.params.eventId,
      status: 'cancelled'
    });

    // Get waitlist details
    const waitlist = await Participation.find({
      event: req.params.eventId,
      waitlistStatus: 'waitlisted'
    })
      .populate('student', 'name email studentId')
      .sort({ waitlistedAt: 1 })
      .select('student waitlistedAt');

    // Calculate metrics
    const fillingPercentage = event.maxParticipants 
      ? Math.round((event.currentParticipants / event.maxParticipants) * 100)
      : 0;
    const spotsRemaining = Math.max(0, event.maxParticipants - event.currentParticipants);
    const isAtCapacity = event.currentParticipants >= event.maxParticipants;
    const attendanceRate = confirmedCount > 0 
      ? Math.round((attendedCount / confirmedCount) * 100)
      : 0;

    res.json({
      success: true,
      event: {
        id: event._id,
        title: event.title,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        status: event.status
      },
      capacity: {
        maxCapacity: event.maxParticipants,
        currentParticipants: event.currentParticipants,
        spotsRemaining,
        fillingPercentage,
        isAtCapacity
      },
      participations: {
        total: totalParticipations,
        confirmed: confirmedCount,
        waitlisted: waitlistedCount,
        attended: attendedCount,
        rejected: rejectedCount,
        cancelled: cancelledCount,
        attendanceRate
      },
      waitlist: {
        count: waitlistedCount,
        students: waitlist.map(w => ({
          position: waitlist.indexOf(w) + 1,
          student: w.student,
          waitlistedAt: w.waitlistedAt
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching event capacity details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching event capacity details',
      error: error.message
    });
  }
});

module.exports = router;

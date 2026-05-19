const express = require('express');
const User = require('../models/User');
const Participation = require('../models/Participation');
const Contribution = require('../models/Contribution');
const Event = require('../models/Event');
const { auth, authorize } = require('../middleware/auth');
const escapeRegex = require('../utils/escapeRegex');
const validateObjectId = require('../middleware/validateObjectId');
const { getPagination, buildPagedResponse } = require('../utils/pagination');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (filtered by role)
// @access  Private (Admin/Faculty)
router.get('/', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const { role, search } = req.query;
    const query = {};

    if (role) {
      query.role = role;
    }

    if (search) {
      const safeSearch = escapeRegex(search.trim());
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { studentId: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const { page, limit, skip } = getPagination(req);
    query.isDeleted = { $ne: true };

    const total = await User.countDocuments(query);

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(buildPagedResponse(users, total, page, limit));
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/stats
// @desc    Get dashboard statistics
// @access  Private (Admin/Faculty)
router.get('/stats', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const activeFilter = { isDeleted: { $ne: true } };
    const totalStudents = await User.countDocuments({ role: 'student', ...activeFilter });
    const totalFaculty = await User.countDocuments({ role: 'faculty', ...activeFilter });
    const totalEvents = await Event.countDocuments(activeFilter);
    const totalParticipations = await Participation.countDocuments(activeFilter);
    const totalContributions = await Contribution.countDocuments(activeFilter);
    
    // Calculate total volunteer hours from all students
    const totalVolunteerHours = await User.aggregate([
      { $match: { role: 'student', isDeleted: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$totalVolunteerHours' } } }
    ]);
    
    // Get pending problems count
    const Problem = require('../models/Problem');
    const pendingProblems = await Problem.countDocuments({ status: 'pending', isDeleted: { $ne: true } });

    const stats = {
      totalStudents,
      totalFaculty,
      totalEvents,
      totalParticipations,
      totalContributions,
      totalVolunteerHours: totalVolunteerHours[0]?.total || 0,
      pendingProblems
    };

    console.log('📊 Dashboard stats:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

const appConfig = require('../config/appConfig');

// @route   GET /api/users/student/:id
// @desc    Get student profile with details
// @access  Private
router.get('/student/:id', auth, validateObjectId('id'), async (req, res) => {
  try {
    // Students can only view their own profile
    if (req.user.role === 'student' && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const student = await User.findById(req.params.id)
      .select('-password')
      .populate('contributions');

    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    const participations = await Participation.find({ student: student._id, isDeleted: { $ne: true } })
      .populate('event', 'title eventType startDate endDate');

    const contributions = await Contribution.find({ student: student._id, isDeleted: { $ne: true } })
      .populate('event', 'title eventType')
      .populate('participation');

    res.json({
      student,
      participations,
      contributions,
      totalEvents: participations.length,
      totalHours: student.totalVolunteerHours,
      certificateEligible: student.totalVolunteerHours >= (appConfig.CERTIFICATE_HOURS_REQUIRED || 120)
    });
  } catch (error) {
    console.error('Get student profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


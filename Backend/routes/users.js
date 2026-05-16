const express = require('express');
const User = require('../models/User');
const Participation = require('../models/Participation');
const Contribution = require('../models/Contribution');
const { auth, authorize } = require('../middleware/auth');

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
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
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
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalFaculty = await User.countDocuments({ role: 'faculty' });
    const totalEvents = await (await require('../models/Event').find({})).length;
    const totalParticipations = await Participation.countDocuments({});
    const totalContributions = await Contribution.countDocuments({});
    
    // Calculate total volunteer hours from all students
    const totalVolunteerHours = await User.aggregate([
      { $match: { role: 'student' } },
      { $group: { _id: null, total: { $sum: '$totalVolunteerHours' } } }
    ]);
    
    // Get pending problems count
    const Problem = require('../models/Problem');
    const pendingProblems = await Problem.countDocuments({ status: 'pending' });

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

// @route   GET /api/users/student/:id
// @desc    Get student profile with details
// @access  Private
router.get('/student/:id', auth, async (req, res) => {
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

    const participations = await Participation.find({ student: student._id })
      .populate('event', 'title eventType startDate endDate');

    const contributions = await Contribution.find({ student: student._id })
      .populate('event', 'title eventType')
      .populate('participation');

    res.json({
      student,
      participations,
      contributions,
      totalEvents: participations.length,
      totalHours: student.totalVolunteerHours,
      certificateEligible: student.totalVolunteerHours >= 120 // Example: 120 hours for certificate
    });
  } catch (error) {
    console.error('Get student profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


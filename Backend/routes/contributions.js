const express = require('express');
const { body, validationResult } = require('express-validator');
const Contribution = require('../models/Contribution');
const Participation = require('../models/Participation');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { sendContributionVerified } = require('../utils/notifications');

const router = express.Router();

// @route   GET /api/contributions
// @desc    Get all contributions
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    // Students can only see their own contributions
    if (req.user.role === 'student') {
      query.student = req.user.id;
    }

    // Filter by event
    if (req.query.eventId) {
      query.event = req.query.eventId;
    }

    // Filter by verification status
    if (req.query.isVerified !== undefined) {
      query.isVerified = req.query.isVerified === 'true';
    }

    const contributions = await Contribution.find(query)
      .populate('student', 'name email studentId department')
      .populate('event', 'title eventType startDate endDate')
      .populate('participation')
      .populate('verifiedBy', 'name email')
      .sort({ submittedAt: -1 });

    res.json(contributions);
  } catch (error) {
    console.error('Get contributions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/contributions
// @desc    Submit contribution report
// @access  Private (Students only)
router.post('/', [
  auth,
  authorize('student'),
  body('participationId').notEmpty().withMessage('Participation ID is required'),
  body('report').trim().notEmpty().withMessage('Report is required'),
  body('volunteerHours').isNumeric().withMessage('Valid volunteer hours required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Contribution validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { participationId, report, volunteerHours, evidence } = req.body;
    console.log('📝 Submitting contribution:', { participationId, volunteerHours, evidenceCount: evidence?.length });

    // Verify participation belongs to student and is attended
    const participation = await Participation.findById(participationId)
      .populate('event');

    if (!participation) {
      return res.status(404).json({ message: 'Participation not found' });
    }

    if (participation.student.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (participation.status !== 'attended' && participation.status !== 'completed') {
      return res.status(400).json({ message: 'Participation must be attended or completed' });
    }

    // Check if contribution already exists
    const existingContribution = await Contribution.findOne({ participation: participationId });
    if (existingContribution) {
      return res.status(400).json({ message: 'Contribution already submitted for this event' });
    }

    // Create contribution
    const contribution = new Contribution({
      student: req.user.id,
      event: participation.event._id,
      participation: participationId,
      report,
      volunteerHours: parseFloat(volunteerHours),
      evidence: evidence || []
    });

    await contribution.save();

    // Update participation
    participation.status = 'completed';
    participation.contribution = contribution._id;
    participation.volunteerHours = parseFloat(volunteerHours);
    await participation.save();

    // Add contribution to user's contributions list (hours are added when attendance is marked)
    const user = await User.findById(req.user.id);
    user.contributions.push(contribution._id);
    await user.save();

    await contribution.populate('student', 'name email studentId');
    await contribution.populate('event', 'title eventType');
    await contribution.populate('participation');

    res.status(201).json(contribution);
  } catch (error) {
    console.error('Submit contribution error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/contributions/:id/verify
// @desc    Verify contribution
// @access  Private (Admin/Faculty only)
router.put('/:id/verify', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const contribution = await Contribution.findById(req.params.id);

    if (!contribution) {
      return res.status(404).json({ message: 'Contribution not found' });
    }

    contribution.isVerified = true;
    contribution.verifiedAt = new Date();
    contribution.verifiedBy = req.user.id;

    await contribution.save();

    await contribution.populate('student', 'name email studentId totalVolunteerHours');
    await contribution.populate('event', 'title eventType');
    await contribution.populate('verifiedBy', 'name email');

    // Send verification notification email
    try {
      await sendContributionVerified(contribution.student, contribution);
    } catch (error) {
      console.error('Failed to send contribution verification email:', error);
    }

    res.json(contribution);
  } catch (error) {
    console.error('Verify contribution error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


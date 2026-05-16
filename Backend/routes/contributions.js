const express = require('express');
const { body, validationResult } = require('express-validator');
const Contribution = require('../models/Contribution');
const Participation = require('../models/Participation');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const { getPagination, buildPagedResponse } = require('../utils/pagination');
const { sendContributionVerified } = require('../utils/notifications');

const router = express.Router();

function getScheduledVolunteerHours(event) {
  if (!event || !event.startDate || !event.endDate) {
    return 0;
  }

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const durationInMs = endDate - startDate;

  if (Number.isNaN(durationInMs) || durationInMs <= 0) {
    return 0;
  }

  return Math.round((durationInMs / (1000 * 60 * 60)) * 100) / 100;
}

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

    const { page, limit, skip } = getPagination(req);
    const total = await Contribution.countDocuments(query);

    const contributions = await Contribution.find(query)
      .populate('student', 'name email studentId department')
      .populate('event', 'title eventType startDate endDate')
      .populate('participation')
      .populate('verifiedBy', 'name email')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ success: true, ...buildPagedResponse(contributions, total, page, limit) });
  } catch (error) {
    console.error('Get contributions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/contributions
// @desc    Submit contribution report
// @access  Private (Students only)
router.post('/', [
  auth,
  authorize('student'),
  body('participationId').notEmpty().withMessage('Participation ID is required'),
  body('report').trim().notEmpty().withMessage('Report is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Contribution validation errors:', errors.array());
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { participationId, report, evidence } = req.body;
    console.log('📝 Submitting contribution:', { participationId, evidenceCount: evidence?.length });

    if (typeof req.body.volunteerHours !== 'undefined') {
      return res.status(400).json({ success: false, message: 'Volunteer hours are calculated automatically from the event schedule.' });
    }

    // Verify participation belongs to student and is attended
    const participation = await Participation.findById(participationId)
      .populate('event');

    if (!participation) {
      return res.status(404).json({ success: false, message: 'Participation not found' });
    }

    if (participation.student.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (participation.status !== 'attended' && participation.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Participation must be attended or completed' });
    }

    // Check if contribution already exists
    const existingContribution = await Contribution.findOne({ participation: participationId });
    if (existingContribution) {
      return res.status(400).json({ success: false, message: 'Contribution already submitted for this event' });
    }

    // Use volunteer hours recorded on the participation or derive them from the event schedule.
    const recordedHours = participation.volunteerHours || getScheduledVolunteerHours(participation.event);

    // Create contribution (do NOT accept volunteerHours from the student request)
    const contribution = new Contribution({
      student: req.user.id,
      event: participation.event._id,
      participation: participationId,
      report,
      volunteerHours: parseFloat(recordedHours),
      evidence: evidence || []
    });

    await contribution.save();

    // Update participation: link to contribution and mark completed
    participation.status = 'completed';
    participation.contribution = contribution._id;
    // Do NOT overwrite participation.volunteerHours here; it should be set by admin attendance
    await participation.save();

    // Add contribution to user's contributions list (hours are added when attendance is marked)
    const user = await User.findById(req.user.id);
    user.contributions.push(contribution._id);
    await user.save();

    await contribution.populate('student', 'name email studentId');
    await contribution.populate('event', 'title eventType');
    await contribution.populate('participation');

    res.status(201).json({ success: true, data: contribution });
  } catch (error) {
    console.error('Submit contribution error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/contributions/:id/verify
// @desc    Verify contribution
// @access  Private (Admin/Faculty only)
router.put('/:id/verify', [auth, authorize('admin', 'faculty'), validateObjectId('id')], async (req, res) => {
  try {
    const contribution = await Contribution.findById(req.params.id);

    if (!contribution) {
      return res.status(404).json({ success: false, message: 'Contribution not found' });
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

    res.json({ success: true, data: contribution });
  } catch (error) {
    console.error('Verify contribution error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;


const express = require('express');
const { body, validationResult } = require('express-validator');
const Event = require('../models/Event');
const Participation = require('../models/Participation');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { auth, authorize } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const { sendNewEventNotification } = require('../utils/notifications');
const escapeRegex = require('../utils/escapeRegex');
const { getPagination, buildPagedResponse } = require('../utils/pagination');

const router = express.Router();
const allowedStudentStatuses = ['published', 'ongoing', 'completed'];

async function notifyStudentsAboutEvent(event, req) {
  if (event.notificationsSent) {
    return;
  }

  const students = await User.find({
    role: 'student',
    isActive: true,
    email: { $exists: true, $ne: null, $ne: '' }
  }).select('email name _id');

  if (students.length === 0) {
    return;
  }

  sendNewEventNotification(event, students).catch(error => {
    console.error('Error sending event notifications:', error);
  });

  const io = req.app.get('io');
  if (io) {
    const notificationData = {
      type: 'new-event',
      message: `New event: ${event.title}`,
      event: {
        id: event._id.toString(),
        title: event.title,
        eventType: event.eventType,
        location: event.location,
        startDate: event.startDate,
        status: event.status
      },
      timestamp: new Date()
    };

    students.forEach(student => {
      io.to(`user-${student._id}`).emit('new-event', notificationData);
    });

    io.emit('new-event', notificationData);
    io.emit('new-event-broadcast', notificationData);
  }

  const notificationPromises = students.map(student => Notification.create({
    user: student._id,
    type: 'new-event',
    message: `New event: ${event.title}`,
    event: event._id,
    data: {
      eventId: event._id.toString(),
      eventTitle: event.title,
      eventType: event.eventType,
      location: event.location,
      startDate: event.startDate
    },
    read: false
  }).catch(err => {
    console.error(`Failed to store notification for ${student.name}:`, err.message);
  }));

  await Promise.allSettled(notificationPromises);
  event.notificationsSent = true;
  await event.save();
}

// @route   GET /api/events
// @desc    Get all events (with filters)
// @access  Private (authenticated)
router.get('/', auth, async (req, res) => {
  try {
    const { status, eventType, search } = req.query;
    const query = {};

    if (req.user.role === 'student') {
      query.status = { $in: allowedStudentStatuses };
    }

    if (status && (req.user.role !== 'student' || allowedStudentStatuses.includes(status))) {
      query.status = status;
    }

    if (eventType) {
      query.eventType = eventType;
    }

    if (search) {
      const safeSearch = escapeRegex(search.trim());
      query.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const { page, limit, skip } = getPagination(req);
    const total = await Event.countDocuments(query);

    const events = await Event.find(query)
      .populate('organizer', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    let participationMap = new Map();
    if (req.user.role === 'student' && events.length > 0) {
      const participations = await Participation.find({
        student: req.user.id,
        event: { $in: events.map(event => event._id) }
      }).select('event status');

      participationMap = new Map(participations.map(participation => [
        String(participation.event),
        participation.status
      ]));
    }

    const data = events.map(event => {
      const plain = event.toObject();
      if (req.user.role === 'student') {
        plain.participationStatus = participationMap.get(String(event._id)) || null;
      }
      return plain;
    });

    res.json(buildPagedResponse(data, total, page, limit));
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/events/:id
// @desc    Get single event
// @access  Private
router.get('/:id', auth, validateObjectId('id'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate({
        path: 'participations',
        populate: {
          path: 'student',
          select: 'name email studentId'
        }
      });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const plain = event.toObject();
    if (req.user.role === 'student') {
      const participation = await Participation.findOne({ student: req.user.id, event: event._id }).select('status');
      plain.participationStatus = participation ? participation.status : null;
    }

    res.json(plain);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/events
// @desc    Create new event
// @access  Private (Admin/Faculty only)
router.post('/', [
  auth,
  authorize('admin', 'faculty'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('eventType').isIn(['tree plantation', 'blood donation', 'cleanliness drive', 'awareness campaign', 'health camp', 'other']).withMessage('Invalid event type'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('registrationDeadline').isISO8601().withMessage('Valid registration deadline is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const start = new Date(req.body.startDate);
    const end = new Date(req.body.endDate);
    const regDeadline = new Date(req.body.registrationDeadline);

    if (!(end > start)) {
      return res.status(400).json({ message: 'endDate must be after startDate' });
    }

    if (!(regDeadline < start)) {
      return res.status(400).json({ message: 'registrationDeadline must be before startDate' });
    }

    const event = new Event({ ...req.body, organizer: req.user.id });
    await event.save();
    await event.populate('organizer', 'name email');

    if (event.status === 'published') {
      await notifyStudentsAboutEvent(event, req);
    }

    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/events/:id/publish
// @desc    Publish event
// @access  Private (Admin/Faculty only)
router.post('/:id/publish', auth, validateObjectId('id'), async (req, res) => {
  try {
    if (!['admin', 'faculty'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Only Admin and Faculty can publish events.' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    event.status = 'published';
    await event.save();
    await event.populate('organizer', 'name email');

    await notifyStudentsAboutEvent(event, req);

    res.json(event);
  } catch (error) {
    console.error('Publish event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/events/:id
// @desc    Update event
// @access  Private (Admin/Faculty only)
router.put('/:id', [auth, authorize('admin', 'faculty'), validateObjectId('id')], async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    Object.assign(event, req.body);
    await event.save();
    await event.populate('organizer', 'name email');
    res.json(event);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/events/:id
// @desc    Delete event
// @access  Private (Admin only)
router.delete('/:id', [auth, authorize('admin'), validateObjectId('id')], async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await Participation.deleteMany({ event: event._id });

    try {
      const Contribution = require('../models/Contribution');
      const Problem = require('../models/Problem');

      await Contribution.deleteMany({ event: event._id });
      await Problem.deleteMany({ eventId: event._id });
      await Notification.deleteMany({ event: event._id });
    } catch (cleanupErr) {
      console.error('Error cleaning up related records for event deletion:', cleanupErr);
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
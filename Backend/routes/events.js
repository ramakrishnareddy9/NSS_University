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
const { resolveAcademicYearContext } = require('../utils/academicYear');

const router = express.Router();
const mongoose = require('mongoose');
const allowedStudentStatuses = ['published', 'ongoing', 'completed'];

async function notifyStudentsAboutEvent(event, req) {
  if (event.notificationsSent) {
    return;
  }

  const students = await User.find({
    role: 'student',
    isActive: true,
    email: { $exists: true, $ne: null, $ne: '' }
  }).select('email name _id notificationPreferences');

  if (students.length === 0) {
    return;
  }

  // Filter students who want new event notifications
  const studentsToNotify = students.filter(student => {
    if (!student.notificationPreferences?.emailNotifications) {
      return true; // Default to true if preferences not set
    }
    return student.notificationPreferences.emailNotifications.newEvent !== false;
  });

  if (studentsToNotify.length === 0) {
    console.log('📧 No students opted in for new event notifications');
    return;
  }

  sendNewEventNotification(event, studentsToNotify).catch(error => {
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
    const { status, eventType, search, academicYear } = req.query;
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

    if (academicYear) {
      query.academicYear = academicYear;
    }

    if (search) {
      const safeSearch = escapeRegex(search.trim());
      query.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    // Exclude soft-deleted records from active queries unless explicitly requested by an admin
    if (!(req.query.includeDeleted === 'true' && req.user.role === 'admin')) {
      query.isDeleted = { $ne: true };
    }

    // Support both traditional page-based pagination and cursor-based pagination
    const requestedLimit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const cursor = req.query.cursor;

    let events;
    if (cursor) {
      // Cursor-based pagination using ObjectId ordering (newest first)
      try {
        const cursorId = mongoose.Types.ObjectId(cursor);
        query._id = { $lt: cursorId };
      } catch (e) {
        return res.status(400).json({ message: 'Invalid cursor' });
      }

      events = await Event.find(query)
        .populate('organizer', 'name email')
        .sort({ _id: -1 })
        .limit(requestedLimit + 1); // fetch one extra to determine hasMore
    } else {
      // Fallback to page-based pagination for existing clients
      const { page, limit, skip } = getPagination(req);
      const total = await Event.countDocuments(query);

      events = await Event.find(query)
        .populate('organizer', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // keep old response format
      const totalForPage = total;
      const data = events.map(event => event.toObject());

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

      const mapped = data.map(event => {
        if (req.user.role === 'student') {
          event.participationStatus = participationMap.get(String(event._id)) || null;
        }
        return event;
      });

      return res.json(buildPagedResponse(mapped, totalForPage, page, limit));
    }

    // At this point we're in cursor mode
    const hasMore = events.length > requestedLimit;
    if (hasMore) events.pop(); // remove extra

    const dataObjects = events.map(e => e.toObject());

    let participationMap = new Map();
    if (req.user.role === 'student' && events.length > 0) {
      const participations = await Participation.find({
        student: req.user.id,
        event: { $in: events.map(event => event._id) },
        isDeleted: { $ne: true }
      }).select('event status');

      participationMap = new Map(participations.map(p => [String(p.event), p.status]));
    }

    const mapped = dataObjects.map(event => {
      if (req.user.role === 'student') {
        event.participationStatus = participationMap.get(String(event._id)) || null;
      }
      return event;
    });

    const nextCursor = mapped.length > 0 ? String(mapped[mapped.length - 1]._id) : null;

    res.json({ data: mapped, nextCursor, hasMore });
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
        match: { isDeleted: { $ne: true } },
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
      const participation = await Participation.findOne({ student: req.user.id, event: event._id, isDeleted: { $ne: true } }).select('status');
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

    const academicYearContext = await resolveAcademicYearContext(undefined, start);
    const event = new Event({
      ...req.body,
      academicYear: academicYearContext.label,
      organizer: req.user.id
    });
    await event.save();
    await event.populate('organizer', 'name email');

    if (event.status === 'published') {
      await notifyStudentsAboutEvent(event, req);
    }

    // Invalidate caches (best-effort)
    try {
      const redis = require('../config/redis');
      await redis.del('landing:stats');
      await redis.purgePattern('leaderboard:*');
    } catch (cacheErr) {
      console.warn('Cache invalidation failed after event create:', cacheErr.message);
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

    try {
      const redis = require('../config/redis');
      await redis.del('landing:stats');
      await redis.purgePattern('leaderboard:*');
    } catch (cacheErr) {
      console.warn('Cache invalidation failed after publish:', cacheErr.message);
    }

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

    if (event.startDate) {
      const academicYearContext = await resolveAcademicYearContext(undefined, event.startDate);
      event.academicYear = academicYearContext.label;
    }

    await event.save();
    await event.populate('organizer', 'name email');

    try {
      const redis = require('../config/redis');
      await redis.del('landing:stats');
      await redis.purgePattern('leaderboard:*');
    } catch (cacheErr) {
      console.warn('Cache invalidation failed after event update:', cacheErr.message);
    }

    res.json(event);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/events/:id
// @desc    Cancel or delete event (soft cancel or hard delete based on status)
// @access  Private (Admin only)
router.delete('/:id', [auth, authorize('admin'), validateObjectId('id')], async (req, res) => {
  const session = await mongoose.startSession();
  let registeredStudents = [];
  try {
    let transactionResult = null;
    await session.withTransaction(async () => {
      const event = await Event.findById(req.params.id).session(session);
      if (!event) {
        const err = new Error('Event not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      const { cancellationReason, hardDelete } = req.body;

      // If event has registered participants and hasn't started, mark as cancelled and notify
      if (event.status === 'draft' || event.status === 'published') {
        const Participation = require('../models/Participation');
        const registeredParticipations = await Participation.find({
          event: event._id,
          waitlistStatus: { $ne: 'waitlisted' },
          status: { $nin: ['rejected', 'cancelled'] }
        }).populate('student', 'name email notificationPreferences').session(session);

        registeredStudents = registeredParticipations.map(p => p.student);

        // Mark event as cancelled
        event.status = 'cancelled';
        event.cancelledAt = new Date();
        event.cancelledBy = req.user.id;
        event.cancellationReason = cancellationReason || 'No reason provided';
        await event.save({ session });

        // Mark all participations as cancelled
        await Participation.updateMany(
          { event: event._id, status: { $nin: ['rejected', 'cancelled'] } },
          { $set: { status: 'cancelled', attendance: false } },
          { session }
        );

        transactionResult = { type: 'cancel', event: event.toObject(), notificationsSent: registeredStudents.length };
        return;
      }

      // For completed or ongoing events, require hardDelete=true to proceed
      if (hardDelete !== true && (event.status === 'ongoing' || event.status === 'completed')) {
        const err = new Error('CANNOT_DELETE_STARTED_OR_COMPLETED');
        err.code = 'BAD_REQUEST';
        throw err;
      }

      // Perform cascaded soft-delete for event and related documents
      try {
        const Contribution = require('../models/Contribution');
        const Problem = require('../models/Problem');

        await Participation.updateMany({ event: event._id }, { $set: { isDeleted: true } }, { session });
        await Contribution.updateMany({ event: event._id }, { $set: { isDeleted: true } }, { session });
        await Problem.updateMany({ eventId: event._id }, { $set: { isDeleted: true } }, { session });
        await Notification.updateMany({ event: event._id }, { $set: { isDeleted: true } }, { session });

        event.isDeleted = true;
        await event.save({ session });
        transactionResult = { type: 'softDelete', eventId: event._id };
      } catch (cleanupErr) {
        console.error('Error during cascaded soft-delete in transaction:', cleanupErr);
        throw cleanupErr;
      }
    });

    // Transaction completed
    if (transactionResult && transactionResult.type === 'cancel') {
      // After transaction: notify students and broadcast
      const studentsToNotify = registeredStudents.filter(student => {
        if (!student.notificationPreferences?.emailNotifications) return true;
        return student.notificationPreferences.emailNotifications.eventCancelled !== false;
      });

      if (studentsToNotify.length > 0) {
        const { sendEventCancellationNotification } = require('../utils/notifications');
        try {
          const emailResult = await sendEventCancellationNotification(transactionResult.event, studentsToNotify, req.body.cancellationReason);
          console.log(`📧 Event cancellation notifications sent: ${emailResult.notificationsSent}/${emailResult.total}`);
        } catch (error) {
          console.error('Error sending cancellation notifications:', error);
        }
      }

      try {
        const io = req.app.get('io');
        if (io) {
          io.emit('event-cancelled', {
            type: 'event-cancelled',
            message: `Event "${transactionResult.event.title}" has been cancelled.`,
            event: {
              id: transactionResult.event._id,
              title: transactionResult.event.title,
              cancellationReason: transactionResult.event.cancellationReason
            },
            timestamp: new Date()
          });
        }
      } catch (socketError) {
        console.error('Socket emission failed for event cancellation:', socketError);
      }

      try {
        const redis = require('../config/redis');
        await redis.del('landing:stats');
        await redis.purgePattern('leaderboard:*');
      } catch (cacheErr) {
        console.warn('Cache invalidation failed after event cancellation:', cacheErr.message);
      }

      return res.json({ message: 'Event cancelled successfully and notifications sent', event: transactionResult.event, notificationsSent: transactionResult.notificationsSent });
    }

    if (transactionResult && transactionResult.type === 'softDelete') {
      try {
        const redis = require('../config/redis');
        await redis.del('landing:stats');
        await redis.purgePattern('leaderboard:*');
      } catch (cacheErr) {
        console.warn('Cache invalidation failed after event soft-delete:', cacheErr.message);
      }

      return res.json({ message: 'Event soft-deleted (cascaded)', eventId: transactionResult.eventId });
    }
    // No result? respond generic
    return res.json({ message: 'Operation completed' });
  } catch (error) {
    if (error.code === 'NOT_FOUND') return res.status(404).json({ message: 'Event not found' });
    if (error.code === 'BAD_REQUEST') return res.status(400).json({ message: 'Cannot delete started or completed events without hardDelete: true' });
    console.error('Delete event error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;
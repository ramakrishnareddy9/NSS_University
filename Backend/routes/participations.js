const express = require('express');
const mongoose = require('mongoose');
const Participation = require('../models/Participation');
const Event = require('../models/Event');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { auth, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const validateObjectId = require('../middleware/validateObjectId');
const appConfig = require('../config/appConfig');
const AuditLog = require('../models/AuditLog');
const { sendRegistrationConfirmation, sendApprovalNotification, sendWaitlistPromotionNotification } = require('../utils/notifications');
const { getPagination, buildPagedResponse } = require('../utils/pagination');
const redis = require('../config/redis');

const router = express.Router();

const VOLUNTEER_HOURS_BUFFER_MS = 15 * 60 * 1000;

function getEventVolunteerHours(event) {
  if (!event || !event.startDate || !event.endDate) {
    return {
      durationHours: 0,
      maxAllowedHours: 0.25
    };
  }

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const durationInMs = endDate - startDate;

  if (Number.isNaN(durationInMs) || durationInMs <= 0) {
    return {
      durationHours: 0,
      maxAllowedHours: 0.25
    };
  }

  const durationHours = Math.round((durationInMs / (1000 * 60 * 60)) * 100) / 100;
  const maxAllowedHours = Math.round(((durationInMs + VOLUNTEER_HOURS_BUFFER_MS) / (1000 * 60 * 60)) * 100) / 100;

  return {
    durationHours,
    maxAllowedHours
  };
}

// @route   GET /api/participations
// @desc    Get all participations (filtered by role)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    // Students can only see their own participations
    if (req.user.role === 'student') {
      query.student = req.user.id;
    }

    // Admin/Faculty can see all or filter by event
    if (req.query.eventId) {
      query.event = req.query.eventId;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    // Exclude soft-deleted participations from normal listings unless admin requests them
    if (!(req.query.includeDeleted === 'true' && (req.user.role === 'admin' || req.user.role === 'faculty'))) {
      query.isDeleted = { $ne: true };
    }

    const { page, limit, skip } = getPagination(req);
    const total = await Participation.countDocuments(query);

    const participations = await Participation.find(query)
      .populate('student', 'name email studentId department year')
      .populate('event', 'title eventType startDate endDate location')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(buildPagedResponse(participations, total, page, limit));
  } catch (error) {
    console.error('Get participations error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/participations
// @desc    Register for an event or join waitlist if full
// @access  Private (Students only)
router.post('/', [auth, authorize('student'), body('eventId').notEmpty().isMongoId().withMessage('Valid eventId is required')], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required' });
    }

    const session = await mongoose.startSession();
    let participation;

    try {
      await session.withTransaction(async () => {
        const event = await Event.findById(eventId).session(session);
        if (!event) {
          const error = new Error('Event not found');
          error.statusCode = 404;
          throw error;
        }

        // Check if event is published
        if (event.status !== 'published' && event.status !== 'ongoing') {
          const error = new Error('Event is not available for registration');
          error.statusCode = 400;
          throw error;
        }

        // Check registration deadline
        if (new Date() > new Date(event.registrationDeadline)) {
          const error = new Error('Registration deadline has passed');
          error.statusCode = 400;
          throw error;
        }

        // Check if already registered (including waitlist)
        const existingParticipation = await Participation.findOne({
          student: req.user.id,
          event: eventId,
          isDeleted: { $ne: true }
        }).session(session);

        if (existingParticipation) {
          const error = new Error('Already registered for this event');
          error.statusCode = 400;
          throw error;
        }

        // Determine if adding to waitlist or registering directly.
        // Reserve a slot atomically when the event has a capacity limit.
        let isWaitlisted = false;
        if (event.maxParticipants != null) {
          const reservedEvent = await Event.findOneAndUpdate(
            {
              _id: eventId,
              currentParticipants: { $lt: event.maxParticipants }
            },
            {
              $inc: { currentParticipants: 1 }
            },
            { session, new: true }
          );

          if (!reservedEvent) {
            isWaitlisted = true;
          }
        }

        // Create participation
        participation = new Participation({
          student: req.user.id,
          event: eventId,
          academicYear: event.academicYear || null,
          status: 'pending',
          waitlistStatus: isWaitlisted ? 'waitlisted' : 'none',
          waitlistedAt: isWaitlisted ? new Date() : undefined
        });

        await participation.save({ session });

        // Slot reservation is handled above; waitlisted registrations do not change the count.
      });
    } catch (txnError) {
      if (txnError.statusCode) {
        return res.status(txnError.statusCode).json({ message: txnError.message });
      }
      throw txnError;
    } finally {
      session.endSession();
    }

    await participation.populate('student', 'name email studentId');
    await participation.populate('event', 'title eventType startDate endDate location');

    // Send appropriate notification
    try {
        if (participation.waitlistStatus === 'waitlisted') {
        const waitlistPosition = await Participation.countDocuments({
          event: eventId,
          waitlistStatus: 'waitlisted',
          waitlistedAt: { $lt: participation.waitlistedAt }
        }) + 1;
        
        console.debug(`Waitlist confirmation queued for email (position ${waitlistPosition})`);
        // Send generic registration confirmation for now (waitlist position included in logs/audit)
        await sendRegistrationConfirmation(participation.student, participation.event);
      } else {
        await sendRegistrationConfirmation(participation.student, participation.event);
      }
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
    }

    // SEC-03: Send WebSocket notification to admin room only (not broadcast to all)
    try {
      const io = req.app.get('io');
      if (io) {
        // Only send to admin room - not a public broadcast
        io.to('admin-notifications').emit('new-participation', {
          type: 'new-participation',
          message: `New ${participation.waitlistStatus === 'waitlisted' ? 'waitlist' : 'registration'} for event`,
          participation: {
            id: participation._id,
            eventId: participation.event._id,
            status: participation.status,
            waitlistStatus: participation.waitlistStatus
          },
          timestamp: new Date()
        });
      }
    } catch (socketError) {
      console.error('Socket emission failed:', socketError);
    }

    res.status(201).json({
      ...participation.toObject(),
      message: participation.waitlistStatus === 'waitlisted' 
        ? 'Added to waitlist. You will be notified if a spot becomes available.'
        : 'Successfully registered for the event'
    });

    // Invalidate landing stats and leaderboard caches (best-effort)
    try {
      await redis.del('landing:stats');
      await redis.purgePattern('leaderboard:*');
    } catch (cacheErr) {
      console.warn('Cache invalidation failed after registration:', cacheErr.message);
    }

  } catch (error) {
    console.error('Register participation error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/participations/:id/approve
// @desc    Approve participation request
// @access  Private (Admin/Faculty only)
router.put('/:id/approve', [auth, authorize('admin', 'faculty'), validateObjectId('id')], async (req, res) => {
  try {
    const participation = await Participation.findById(req.params.id);

    if (!participation || participation.isDeleted) {
      return res.status(404).json({ message: 'Participation not found' });
    }

    if (participation.status !== 'pending') {
      return res.status(400).json({ message: 'Participation is not pending' });
    }

    participation.status = 'approved';
    participation.approvedAt = new Date();
    participation.approvedBy = req.user.id;

    await participation.save();

    // Invalidate caches (best-effort)
    try {
      await redis.del('landing:stats');
      await redis.purgePattern('leaderboard:*');
    } catch (cacheErr) {
      console.warn('Cache invalidation failed after approval:', cacheErr.message);
    }

    await participation.populate('student', 'name email studentId notificationPreferences');
    await participation.populate('event', 'title eventType startDate endDate location');

    console.debug('Participation approval requested');

    // Send approval notification email to the approved student
    if (participation.student.email) {
      try {
        // Check if user wants participation approval emails
        const emailEnabled = participation.student.notificationPreferences?.emailNotifications?.participationApproved !== false;
        if (emailEnabled) {
          const emailResult = await sendApprovalNotification(participation.student, participation.event);
          if (emailResult.success) {
            console.log(`✅ Approval email sent successfully to ${participation.student.email}`);
          } else {
            console.error(`❌ Failed to send approval email: ${emailResult.error || emailResult.message}`);
          }
        } else {
          console.log(`📧 Skipped approval email for ${participation.student.email} (preferences disabled)`);
        }
      } catch (error) {
        console.error('❌ Error sending approval notification email:', error);
      }
    } else {
      console.warn('⚠️ Student has no email address, skipping email notification');
    }

    // Send WebSocket notification to the approved student
    try {
      const io = req.app.get('io');
      if (io) {
        const studentId = participation.student._id.toString();
        const roomName = `user-${studentId}`;

        const notificationData = {
          type: 'participation-approved',
          message: `Your participation for "${participation.event.title}" has been approved!`,
          participation: {
            id: participation._id,
            eventId: participation.event._id,
            eventTitle: participation.event.title,
            status: participation.status
          },
          timestamp: new Date()
        };

        console.debug(`Sending approval notification to user room`);
        io.to(roomName).emit('participation-approved', notificationData);

        // Also emit an admin-scoped notification for dashboards (no PII)
        io.to('admin-notifications').emit('participation-approved', {
          ...notificationData,
          targetUserId: studentId
        });

        // Store notification in database for later access
        try {
          await Notification.create({
            user: participation.student._id,
            type: 'participation-approved',
            message: notificationData.message,
            data: {
              participationId: participation._id.toString(),
              eventId: participation.event._id.toString(),
              eventTitle: participation.event.title,
              status: participation.status
            },
            read: false
          });
          console.debug(`Notification stored in database for student ${studentId}`);
        } catch (err) {
          console.error(`❌ Failed to store notification:`, err.message);
        }

        console.debug(`WebSocket notification sent to student ${studentId}`);
      } else {
        console.warn('⚠️ Socket.IO not available');
      }
    } catch (error) {
      console.error('❌ Failed to send WebSocket notification:', error);
    }

    // Send admin-scoped participation-updated notification (avoid public broadcast)
    try {
      const io = req.app.get('io');
      if (io) {
        io.to('admin-notifications').emit('participation-updated', {
          type: 'participation-updated',
          message: `Participation updated for an event`,
          participation: {
            id: participation._id,
            student: { id: participation.student._id, studentId: participation.student.studentId },
            event: { id: participation.event._id, title: participation.event.title },
            status: participation.status
          },
          timestamp: new Date()
        });
        console.debug('Admin-scoped participation-updated emitted');
      }
    } catch (socketError) {
      console.error('Socket emission failed for approval:', socketError);
    }

    res.json(participation);

  } catch (error) {
    console.error('Approve participation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/participations/:id/reject
// @desc    Reject participation request
// @access  Private (Admin/Faculty only)
router.put('/:id/reject', [auth, authorize('admin', 'faculty'), validateObjectId('id')], async (req, res) => {
  try {
    const session = await mongoose.startSession();
    let participation = null;
    try {
      await session.withTransaction(async () => {
        participation = await Participation.findOneAndUpdate(
          {
            _id: req.params.id,
            status: 'pending',
            isDeleted: { $ne: true }
          },
          {
            $set: {
              status: 'rejected',
              rejectedAt: new Date(),
              rejectedBy: req.user.id
            }
          },
          {
            new: true,
            session
          }
        );

        if (!participation) {
          const error = new Error('Participation not found or is not pending');
          error.statusCode = 400;
          throw error;
        }

        const participationInTxn = participation;

        // Atomically decrement participant count and remove participation reference from event
        // BL-02: Only decrement participant count if the participant wasn't waitlisted
        if (participationInTxn.waitlistStatus !== 'waitlisted') {
          await Event.findByIdAndUpdate(participationInTxn.event, {
            $inc: { currentParticipants: -1 }
          }, { session });
        }
      });
    } finally {
      session.endSession();
    }

    // Refresh participation to get updated status from transaction
    participation = await Participation.findById(participation._id)
      .populate('student', 'name email studentId')
      .populate('event', 'title eventType');

    // Invalidate caches (best-effort)
    try {
      await redis.del('landing:stats');
      await redis.purgePattern('leaderboard:*');
    } catch (cacheErr) {
      console.warn('Cache invalidation failed after rejection:', cacheErr.message);
    }

    // Send admin-scoped update (avoid public broadcast)
    try {
      const io = req.app.get('io');
      if (io) {
        io.to('admin-notifications').emit('participation-updated', {
          type: 'participation-updated',
          message: `Participation rejected for an event`,
          participation: {
            id: participation._id,
            student: { id: participation.student._id, studentId: participation.student.studentId },
            event: { id: participation.event._id, title: participation.event.title },
            status: participation.status
          },
          timestamp: new Date()
        });
      }
    } catch (socketError) {
      console.error('Socket emission failed for rejection:', socketError);
    }

    res.json(participation);

  } catch (error) {
    console.error('Reject participation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/participations/:id/complete
// @desc    Mark participation as completed (Admin/Faculty) — allows bypassing contribution requirement
// @access  Private (Admin/Faculty only)
router.put('/:id/complete', [auth, authorize('admin', 'faculty'), validateObjectId('id')], async (req, res) => {
  try {
    let participation = await Participation.findById(req.params.id)
      .populate('student', 'totalVolunteerHours name email')
      .populate('event', 'startDate endDate title');

    if (!participation || participation.isDeleted) {
      return res.status(404).json({ message: 'Participation not found' });
    }

    // Only allow completion from approved/attended states
    if (!['approved', 'attended', 'pending'].includes(participation.status)) {
      // allow marking completed even if pending (admin override), but skip if already completed/rejected
      if (participation.status === 'completed' || participation.status === 'rejected') {
        return res.status(400).json({ message: 'Participation cannot be completed from its current state' });
      }
    }

    const session = await mongoose.startSession();
    let auditPayload = null;
    try {

      await session.withTransaction(async () => {
        const participationInTxn = await Participation.findById(participation._id)
          .populate('student', 'totalVolunteerHours name email')
          .session(session);
        const student = await User.findById(participationInTxn.student._id || participationInTxn.student).session(session);
        const { durationHours, maxAllowedHours } = getEventVolunteerHours(participationInTxn.event);
        const calculatedHours = Math.min(durationHours, maxAllowedHours);
        const oldHours = participationInTxn.volunteerHours || 0;
        const delta = calculatedHours - oldHours;

        // Set completed audit fields
        participationInTxn.status = 'completed';
        participationInTxn.completedAt = new Date();
        participationInTxn.completedBy = req.user.id;

        participationInTxn.volunteerHours = calculatedHours;

        if (student && delta !== 0) {
          const oldTotal = student.totalVolunteerHours || 0;
          student.totalVolunteerHours = Math.max(0, oldTotal + delta);
          await student.save({ session });

          auditPayload = {
            action: 'participation_completed_hours_calculated',
            actor: req.user._id,
            targetModel: 'Participation',
            targetId: participationInTxn._id,
            details: {
              eventId: participationInTxn.event?._id || participationInTxn.event,
              studentId: participationInTxn.student?._id || participationInTxn.student,
              oldVolunteerHours: oldHours,
              newVolunteerHours: calculatedHours,
              delta,
              eventDurationHours: durationHours,
              maxAllowedHours,
              bufferMinutes: 15,
              studentTotalVolunteerHoursBefore: oldTotal,
              studentTotalVolunteerHoursAfter: student.totalVolunteerHours,
              source: 'event-schedule',
              timestamp: new Date()
            }
          };
        }

        await participationInTxn.save({ session });
      });
    } catch (txnError) {
      if (txnError.statusCode) {
        return res.status(txnError.statusCode).json({ message: txnError.message });
      }
      throw txnError;
    } finally {
      session.endSession();
    }

    participation = await Participation.findById(participation._id)
      .populate('student', 'name email studentId totalVolunteerHours')
      .populate('event', 'title eventType startDate endDate');

    if (auditPayload) {
      try {
        await AuditLog.create(auditPayload);
      } catch (logErr) {
        console.error('Failed to write AuditLog for completion hours calculation:', logErr);
      }
    }

    // Invalidate caches (best-effort)
    try {
      await redis.del('landing:stats');
      await redis.purgePattern('leaderboard:*');
    } catch (cacheErr) {
      console.warn('Cache invalidation failed after completion:', cacheErr.message);
    }

    // Emit admin-scoped socket event (avoid public broadcast)
    try {
      const io = req.app.get('io');
      if (io) {
        io.to('admin-notifications').emit('participation-updated', {
          type: 'participation-updated',
          message: `Participation completed for an event`,
          participation: {
            id: participation._id,
            student: { id: participation.student._id, studentId: participation.student.studentId },
            event: { id: participation.event._id, title: participation.event.title },
            status: participation.status
          },
          timestamp: new Date()
        });
      }
    } catch (e) {
      console.error('Socket emit failed after marking participation complete:', e);
    }

    res.json(participation);
  } catch (error) {
    console.error('Complete participation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/participations/:id/attendance
// @desc    Mark attendance
// @access  Private (Admin/Faculty only)
router.put('/:id/attendance', [auth, authorize('admin', 'faculty'), validateObjectId('id'), body('attended').isBoolean().withMessage('attended must be boolean'), body('force').optional().isBoolean()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { attended } = req.body;
    console.log('\n🎯 === ATTENDANCE MARKING REQUEST ===');
    console.log('Participation ID:', req.params.id);
    console.log('Attended:', attended);

    if (typeof req.body.volunteerHours !== 'undefined') {
      console.warn('Ignoring client-supplied volunteerHours; hours are calculated from the event schedule.');
    }

    let participation = await Participation.findById(req.params.id)
      .populate('event')
      .populate('student', 'name email totalVolunteerHours');

    if (!participation || participation.isDeleted) {
      console.log('❌ Participation not found or deleted');
      return res.status(404).json({ message: 'Participation not found' });
    }

    // If client supplies volunteerHours, validate it against event duration cap and reject out-of-range values.
    // The system still computes authoritative hours from event schedule during save.
    if (typeof req.body.volunteerHours !== 'undefined') {
      const requestedHours = Number(req.body.volunteerHours);
      if (!Number.isFinite(requestedHours) || requestedHours < 0) {
        return res.status(400).json({ message: 'volunteerHours must be a non-negative number' });
      }

      const { maxAllowedHours } = getEventVolunteerHours(participation.event);
      if (requestedHours > maxAllowedHours) {
        return res.status(400).json({
          message: `volunteerHours exceeds allowed maximum (${maxAllowedHours}h) for this event`
        });
      }
    }

    // Enforce attendance marking window: only allow within X days after event endDate
    const graceDays = parseInt(appConfig.ATTENDANCE_MARKING_GRACE_DAYS, 10) || 7;
    if (participation.event && participation.event.endDate) {
      const endDate = new Date(participation.event.endDate);
      const allowedUntil = new Date(endDate.getTime() + graceDays * 24 * 60 * 60 * 1000);
      const now = new Date();
      if (now > allowedUntil) {
        // If admin wants to force, they must provide `{ force: true }` and be admin role
        const force = req.body.force === true || req.body.force === 'true';
        if (!(force && req.user.role === 'admin')) {
          // Log the denied attempt
          try {
            await AuditLog.create({
              action: 'attendance_mark_attempt_out_of_window',
              actor: req.user._id,
              targetModel: 'Participation',
              targetId: participation._id,
              details: {
                eventId: participation.event._id,
                eventEndDate: participation.event.endDate,
                allowedUntil,
                attemptedAt: new Date(),
                attemptedAttendedValue: attended
              }
            });
          } catch (logErr) {
            console.error('Failed to write AuditLog for out-of-window attendance attempt:', logErr);
          }

          return res.status(400).json({ message: `Attendance marking window has expired (allowed within ${graceDays} days after event end). To force this action, resubmit with { force: true } as an Admin.` });
        }
      }
    }

    // SEC-07: Don't log PII to stdout - use audit logs instead
    console.debug('Attendance marking in progress');

    const session = await mongoose.startSession();
    let auditPayload = null;
    let attendanceChangeAudit = null;
    let lateAttendanceWarning = null;
    try {
      await session.withTransaction(async () => {
        const participationInTxn = await Participation.findById(participation._id)
          .populate('student', 'name email totalVolunteerHours')
          .populate('event')
          .session(session);

        const wasAttended = participationInTxn.attendance;
        const oldHours = participationInTxn.volunteerHours || 0;
        const student = await User.findById(participationInTxn.student._id || participationInTxn.student).session(session);
        participationInTxn.attendance = attended;
        participationInTxn.attendanceDate = attended ? new Date() : null;
        participationInTxn.status = attended ? 'attended' : participationInTxn.status;

        if (wasAttended !== attended) {
          const nowTs = new Date();
          const eventEndDate = participationInTxn.event?.endDate ? new Date(participationInTxn.event.endDate) : null;
          const lateThreshold = eventEndDate
            ? new Date(eventEndDate.getTime() + graceDays * 24 * 60 * 60 * 1000)
            : null;
          const isLateChange = !!(lateThreshold && nowTs > lateThreshold);
          if (isLateChange) {
            lateAttendanceWarning = `Attendance was changed more than ${graceDays} days after event end date.`;
            console.warn(lateAttendanceWarning);
          }

          attendanceChangeAudit = {
            action: 'attendance_changed',
            actor: req.user._id,
            targetModel: 'Participation',
            targetId: participationInTxn._id,
            details: {
              eventId: participationInTxn.event?._id || participationInTxn.event,
              studentId: participationInTxn.student?._id || participationInTxn.student,
              previousAttendance: wasAttended,
              newAttendance: attended,
              changedAt: nowTs,
              eventEndDate,
              lateThreshold,
              isLateChange
            }
          };
        }

        // Calculate volunteer hours if marking as attended
        if (attended && !wasAttended) {
          console.log('\n📊 Calculating volunteer hours...');
          const { durationHours, maxAllowedHours } = getEventVolunteerHours(participationInTxn.event);
          const hours = Math.min(durationHours, maxAllowedHours);
          participationInTxn.volunteerHours = hours;
          console.log(`Final hours to add: ${participationInTxn.volunteerHours}`);

          if (student) {
            const oldTotal = student.totalVolunteerHours || 0;
            student.totalVolunteerHours = Math.max(0, oldTotal + participationInTxn.volunteerHours);
            await student.save({ session });
            console.debug('Volunteer hours updated for student (id):', student._id);
            console.debug(`Previous Total: ${oldTotal}h, Added: ${participationInTxn.volunteerHours}h`);

            auditPayload = {
              action: 'attendance_hours_calculated',
              actor: req.user._id,
              targetModel: 'Participation',
              targetId: participationInTxn._id,
              details: {
                eventId: participationInTxn.event?._id || participationInTxn.event,
                studentId: participationInTxn.student?._id || participationInTxn.student,
                attendance: true,
                oldVolunteerHours: oldHours,
                newVolunteerHours: participationInTxn.volunteerHours,
                delta: participationInTxn.volunteerHours - oldHours,
                eventDurationHours: durationHours,
                maxAllowedHours,
                bufferMinutes: 15,
                manualVolunteerHoursIgnored: typeof req.body.volunteerHours !== 'undefined',
                studentTotalVolunteerHoursBefore: oldTotal,
                studentTotalVolunteerHoursAfter: student.totalVolunteerHours,
                timestamp: new Date()
              }
            };
          }
        } else if (!attended && wasAttended) {
          console.log('\n⚠️ Unmarking attendance - removing hours...');
          // If unmarking attendance, subtract the hours
            if (student && participationInTxn.volunteerHours) {
            const oldTotal = student.totalVolunteerHours || 0;
            student.totalVolunteerHours = Math.max(0, oldTotal - participationInTxn.volunteerHours);
            await student.save({ session });
            console.debug('Volunteer hours removed for student (id):', student._id);
            console.debug(`Previous Total: ${oldTotal}h, Removed: ${participationInTxn.volunteerHours}h`);

            auditPayload = {
              action: 'attendance_hours_reversed',
              actor: req.user._id,
              targetModel: 'Participation',
              targetId: participationInTxn._id,
              details: {
                eventId: participationInTxn.event?._id || participationInTxn.event,
                studentId: participationInTxn.student?._id || participationInTxn.student,
                attendance: false,
                oldVolunteerHours: oldHours,
                newVolunteerHours: 0,
                delta: -participationInTxn.volunteerHours,
                manualVolunteerHoursIgnored: typeof req.body.volunteerHours !== 'undefined',
                studentTotalVolunteerHoursBefore: oldTotal,
                studentTotalVolunteerHoursAfter: student.totalVolunteerHours,
                timestamp: new Date()
              }
            };
          }
          participationInTxn.volunteerHours = 0;
        } else {
          console.log('ℹ️ No hours change needed (wasAttended:', wasAttended, ', attended:', attended, ')');
        }

        await participationInTxn.save({ session });
      });
    } catch (txnError) {
      if (txnError.statusCode) {
        return res.status(txnError.statusCode).json({ message: txnError.message });
      }
      throw txnError;
    } finally {
      session.endSession();
    }
    console.log('✅ Participation saved');

    participation = await Participation.findById(participation._id)
      .populate('student', 'name email studentId totalVolunteerHours')
      .populate('event', 'title eventType');

    if (auditPayload) {
      try {
        await AuditLog.create(auditPayload);
      } catch (logErr) {
        console.error('Failed to write AuditLog for attendance hours update:', logErr);
      }
    }

    if (attendanceChangeAudit) {
      try {
        await AuditLog.create(attendanceChangeAudit);
      } catch (logErr) {
        console.error('Failed to write AuditLog for attendance change:', logErr);
      }
    }

    await participation.populate('student', 'name email studentId totalVolunteerHours');
    await participation.populate('event', 'title eventType');

    // Emit admin-scoped update (avoid public broadcast)
    try {
      const io = req.app.get('io');
      if (io) {
        io.to('admin-notifications').emit('participation-updated', {
          type: 'participation-updated',
          message: `Attendance updated for an event`,
          participation: {
            id: participation._id,
            student: { id: participation.student._id, studentId: participation.student.studentId },
            event: { id: participation.event._id, title: participation.event.title },
            status: participation.status,
            attendance: participation.attendance
          },
          timestamp: new Date()
        });
      }
    } catch (socketError) {
      console.error('Socket emission failed for attendance:', socketError);
    }

    console.debug('Sending response with updated participation');
    if (lateAttendanceWarning) {
      return res.json({
        ...participation.toObject(),
        warning: lateAttendanceWarning
      });
    }
    res.json(participation);

  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/participations/:id
// @desc    Cancel participation and promote next waitlisted student if applicable
// @access  Private (Admin/Faculty or student cancelling own)
router.delete('/:id', [auth, validateObjectId('id')], async (req, res) => {
  try {
    const participation = await Participation.findById(req.params.id)
      .populate('student', 'name email')
      .populate('event', 'title maxParticipants currentParticipants');

    if (!participation || participation.isDeleted) {
      return res.status(404).json({ message: 'Participation not found' });
    }

    // Check authorization: student can only cancel their own, admin/faculty can cancel anyone's
    if (req.user.role === 'student' && participation.student._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to cancel this participation' });
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const participationInTxn = await Participation.findById(participation._id).session(session);
        const eventInTxn = await Event.findById(participationInTxn.event).session(session);

        // Update participation status to cancelled
        participationInTxn.status = 'cancelled';
        await participationInTxn.save({ session });

        // Decrement participant count only if they were confirmed (not waitlisted)
        if (participationInTxn.waitlistStatus !== 'waitlisted') {
          await Event.findByIdAndUpdate(participationInTxn.event, {
            $inc: { currentParticipants: -1 }
          }, { session });
        }

        // If event has capacity and there are waitlisted students, promote next one
        if (eventInTxn.maxParticipants && participationInTxn.waitlistStatus !== 'waitlisted') {
          const nextWaitlisted = await Participation.findOne({
            event: participationInTxn.event,
            waitlistStatus: 'waitlisted'
          })
            .sort({ waitlistedAt: 1 })
            .session(session);

          if (nextWaitlisted) {
            nextWaitlisted.waitlistStatus = 'promoted_from_waitlist';
            nextWaitlisted.promotedAt = new Date();
            await nextWaitlisted.save({ session });

            // Increment participant count for promoted student
            await Event.findByIdAndUpdate(participationInTxn.event, {
              $inc: { currentParticipants: 1 }
            }, { session });

            // Send promotion notification
            const promotedStudent = await User.findById(nextWaitlisted.student).session(session);
            if (promotedStudent) {
              try {
                // Check if user wants waitlist promotion emails
                const emailEnabled = promotedStudent.notificationPreferences?.emailNotifications?.waitlistPromotion !== false;
                if (emailEnabled) {
                  await sendWaitlistPromotionNotification(promotedStudent, eventInTxn);
                  console.log(`✅ Waitlist promotion notification sent to ${promotedStudent.email}`);
                } else {
                  console.log(`📧 Skipped waitlist promotion email for ${promotedStudent.email} (preferences disabled)`);
                }
              } catch (error) {
                console.error(`Failed to send promotion email to ${promotedStudent.email}:`, error);
              }
            }
          }
        }
      });
    } finally {
      session.endSession();
    }

    // Invalidate caches (best-effort)
    try {
      await redis.del('landing:stats');
      await redis.purgePattern('leaderboard:*');
    } catch (cacheErr) {
      console.warn('Cache invalidation failed after cancellation:', cacheErr.message);
    }

    // Send cancellation notification to the student if requested
    if (req.body.notifyStudent !== false) {
      try {
        const io = req.app.get('io');
        if (io) {
          io.to(`user-${participation.student._id}`).emit('participation-cancelled', {
            type: 'participation-cancelled',
            message: `Your participation for "${participation.event.title}" has been cancelled.`,
            participationId: participation._id,
            eventId: participation.event._id,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Failed to send cancellation notification:', error);
      }
    }

    res.json({ message: 'Participation cancelled successfully', participation });

  } catch (error) {
    console.error('Cancel participation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


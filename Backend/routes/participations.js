const express = require('express');
const mongoose = require('mongoose');
const Participation = require('../models/Participation');
const Event = require('../models/Event');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { auth, authorize } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const appConfig = require('../config/appConfig');
const AuditLog = require('../models/AuditLog');
const { sendRegistrationConfirmation, sendApprovalNotification } = require('../utils/notifications');
const { getPagination, buildPagedResponse } = require('../utils/pagination');

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
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/participations
// @desc    Register for an event
// @access  Private (Students only)
router.post('/', [auth, authorize('student')], async (req, res) => {
  try {
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
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

        // Check max participants
        if (event.maxParticipants && event.currentParticipants >= event.maxParticipants) {
          const error = new Error('Event is full');
          error.statusCode = 400;
          throw error;
        }

        // Check if already registered
        const existingParticipation = await Participation.findOne({
          student: req.user.id,
          event: eventId
        }).session(session);

        if (existingParticipation) {
          const error = new Error('Already registered for this event');
          error.statusCode = 400;
          throw error;
        }

        // Create participation
        participation = new Participation({
          student: req.user.id,
          event: eventId,
          status: 'pending'
        });

        await participation.save({ session });

        // Atomically update event: increment participant count and add participation reference
        await Event.findByIdAndUpdate(eventId, {
          $inc: { currentParticipants: 1 },
          $push: { participations: participation._id }
        }, { session });
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

    // Send registration confirmation email
    try {
      await sendRegistrationConfirmation(participation.student, participation.event);
    } catch (error) {
      console.error('Failed to send registration confirmation email:', error);
    }

    // Send WebSocket notification to admins
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('new-participation', {
          type: 'new-participation',
          message: `New registration for "${participation.event.title}"`,
          participation: {
            id: participation._id,
            student: participation.student,
            event: participation.event,
            status: participation.status
          },
          timestamp: new Date()
        });
        console.log(`🔔 Socket: New participation emitted for event: ${participation.event.title}`);
      }
    } catch (socketError) {
      console.error('Socket emission failed for registration:', socketError);
    }

    res.status(201).json(participation);

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

    if (!participation) {
      return res.status(404).json({ message: 'Participation not found' });
    }

    if (participation.status !== 'pending') {
      return res.status(400).json({ message: 'Participation is not pending' });
    }

    participation.status = 'approved';
    participation.approvedAt = new Date();
    participation.approvedBy = req.user.id;

    await participation.save();

    await participation.populate('student', 'name email studentId');
    await participation.populate('event', 'title eventType startDate endDate location');

    console.log(`\n=== Approving participation for student: ${participation.student.name} (${participation.student.email}) ===`);
    console.log(`Event: ${participation.event.title}`);

    // Send approval notification email to the approved student
    if (participation.student.email) {
      try {
        const emailResult = await sendApprovalNotification(participation.student, participation.event);
        if (emailResult.success) {
          console.log(`✅ Approval email sent successfully to ${participation.student.email}`);
        } else {
          console.error(`❌ Failed to send approval email: ${emailResult.error || emailResult.message}`);
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

        console.log(`📤 Sending approval notification to room: ${roomName}`);
        io.to(roomName).emit('participation-approved', notificationData);

        // Also emit to the socket directly if we can find it
        io.emit('participation-approved-broadcast', {
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
          console.log(`💾 Notification stored in database for student ${studentId}`);
        } catch (err) {
          console.error(`❌ Failed to store notification:`, err.message);
        }

        console.log(`🔔 WebSocket notification sent to student ${studentId}`);
      } else {
        console.warn('⚠️ Socket.IO not available');
      }
    } catch (error) {
      console.error('❌ Failed to send WebSocket notification:', error);
    }

    // Broadcast update to everyone (especially admins)
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('participation-updated', {
          type: 'participation-updated',
          message: `Participation updated for "${participation.event.title}"`,
          participation: {
            id: participation._id,
            student: participation.student,
            event: participation.event,
            status: participation.status
          },
          timestamp: new Date()
        });
        console.log(`🔄 Socket: Participation update emitted for student: ${participation.student.name}`);
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
    const participation = await Participation.findById(req.params.id);

    if (!participation) {
      return res.status(404).json({ message: 'Participation not found' });
    }

    if (participation.status !== 'pending') {
      return res.status(400).json({ message: 'Participation is not pending' });
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const participationInTxn = await Participation.findById(participation._id).session(session);
        participationInTxn.status = 'rejected';
        participationInTxn.rejectedAt = new Date();
        participationInTxn.rejectedBy = req.user.id;

        await participationInTxn.save({ session });

        // Atomically decrement participant count and remove participation reference from event
        await Event.findByIdAndUpdate(participationInTxn.event, {
          $inc: { currentParticipants: -1 },
          $pull: { participations: participationInTxn._id }
        }, { session });
      });
    } finally {
      session.endSession();
    }

    await participation.populate('student', 'name email studentId');
    await participation.populate('event', 'title eventType');

    // Broadcast update
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('participation-updated', {
          type: 'participation-updated',
          message: `Participation rejected for "${participation.event.title}"`,
          participation: {
            id: participation._id,
            student: participation.student,
            event: participation.event,
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

    if (!participation) {
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

    // Emit socket event
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('participation-updated', {
          type: 'participation-updated',
          message: `Participation completed for "${participation.event.title}"`,
          participation: {
            id: participation._id,
            student: participation.student,
            event: participation.event,
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
router.put('/:id/attendance', [auth, authorize('admin', 'faculty'), validateObjectId('id')], async (req, res) => {
  try {
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

    if (!participation) {
      console.log('❌ Participation not found');
      return res.status(404).json({ message: 'Participation not found' });
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

    console.log('Student:', participation.student.name);
    console.log('Current Student Hours:', participation.student.totalVolunteerHours);
    console.log('Event:', participation.event.title);

    const session = await mongoose.startSession();
    let auditPayload = null;
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
            console.log(`✅ HOURS UPDATED!`);
            console.log(`   Student: ${student.name}`);
            console.log(`   Previous Total: ${oldTotal} hours`);
            console.log(`   Added: ${participationInTxn.volunteerHours} hours`);
            console.log(`   New Total: ${student.totalVolunteerHours} hours`);

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
            console.log(`⚠️ HOURS REMOVED!`);
            console.log(`   Student: ${student.name}`);
            console.log(`   Previous Total: ${oldTotal} hours`);
            console.log(`   Removed: ${participationInTxn.volunteerHours} hours`);
            console.log(`   New Total: ${student.totalVolunteerHours} hours`);

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

    await participation.populate('student', 'name email studentId totalVolunteerHours');
    await participation.populate('event', 'title eventType');

    // Broadcast update
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('participation-updated', {
          type: 'participation-updated',
          message: `Attendance updated for "${participation.event.title}"`,
          participation: {
            id: participation._id,
            student: participation.student,
            event: participation.event,
            status: participation.status,
            attendance: participation.attendance
          },
          timestamp: new Date()
        });
      }
    } catch (socketError) {
      console.error('Socket emission failed for attendance:', socketError);
    }

    console.log('📤 Sending response with updated data');
    console.log('=== END ATTENDANCE MARKING ===\n');
    res.json(participation);

  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


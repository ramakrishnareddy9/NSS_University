const express = require('express');
const Participation = require('../models/Participation');
const Event = require('../models/Event');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { auth, authorize } = require('../middleware/auth');
const { sendRegistrationConfirmation, sendApprovalNotification } = require('../utils/notifications');

const router = express.Router();

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

    const participations = await Participation.find(query)
      .populate('student', 'name email studentId department year')
      .populate('event', 'title eventType startDate endDate location')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(participations);
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

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if event is published
    if (event.status !== 'published' && event.status !== 'ongoing') {
      return res.status(400).json({ message: 'Event is not available for registration' });
    }

    // Check registration deadline
    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ message: 'Registration deadline has passed' });
    }

    // Check max participants
    if (event.maxParticipants && event.currentParticipants >= event.maxParticipants) {
      return res.status(400).json({ message: 'Event is full' });
    }

    // Check if already registered
    const existingParticipation = await Participation.findOne({
      student: req.user.id,
      event: eventId
    });

    if (existingParticipation) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }

    // Create participation
    const participation = new Participation({
      student: req.user.id,
      event: eventId,
      status: 'pending'
    });

    await participation.save();

    // Atomically update event: increment participant count and add participation reference
    await Event.findByIdAndUpdate(eventId, {
      $inc: { currentParticipants: 1 },
      $push: { participations: participation._id }
    }).catch(err => console.error('Failed to atomically update event on registration:', err));

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
router.put('/:id/approve', [auth, authorize('admin', 'faculty')], async (req, res) => {
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
router.put('/:id/reject', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const participation = await Participation.findById(req.params.id);

    if (!participation) {
      return res.status(404).json({ message: 'Participation not found' });
    }

    if (participation.status !== 'pending') {
      return res.status(400).json({ message: 'Participation is not pending' });
    }

    participation.status = 'rejected';
    participation.rejectedAt = new Date();
    participation.rejectedBy = req.user.id;

    await participation.save();

    // Atomically decrement participant count and remove participation reference from event
    try {
      await Event.findByIdAndUpdate(participation.event, {
        $inc: { currentParticipants: -1 },
        $pull: { participations: participation._id }
      });
    } catch (err) {
      console.error('Failed to atomically update event on rejection:', err);
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
router.put('/:id/complete', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const { volunteerHours } = req.body;
    const participation = await Participation.findById(req.params.id)
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

    // Set completed audit fields
    participation.status = 'completed';
    participation.completedAt = new Date();
    participation.completedBy = req.user.id;

    // If admin provided volunteerHours, validate against event duration cap and update student's totals accordingly
    if (typeof volunteerHours !== 'undefined') {
      const newHours = Number(volunteerHours) || 0;
      const oldHours = participation.volunteerHours || 0;

      // Determine maximum allowed hours: event duration in hours + 2 hour buffer
      let maxAllowed = 24; // sensible default cap
      if (participation.event && participation.event.startDate && participation.event.endDate) {
        const durationInMs = new Date(participation.event.endDate) - new Date(participation.event.startDate);
        const durationHours = Math.max(0, Math.round(durationInMs / (1000 * 60 * 60)));
        maxAllowed = Math.max(1, durationHours + 2);
      }

      if (newHours < 0 || newHours > maxAllowed) {
        return res.status(400).json({ message: `volunteerHours must be between 0 and ${maxAllowed}` });
      }

      const delta = newHours - oldHours;
      participation.volunteerHours = newHours;

      if (delta !== 0) {
        const student = await User.findById(participation.student._id || participation.student);
        if (student) {
          student.totalVolunteerHours = Math.max(0, (student.totalVolunteerHours || 0) + delta);
          await student.save();
        }
      }
    }

    await participation.save();

    await participation.populate('student', 'name email studentId totalVolunteerHours');
    await participation.populate('event', 'title eventType startDate endDate');

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
router.put('/:id/attendance', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const { attended, volunteerHours } = req.body;
    console.log('\n🎯 === ATTENDANCE MARKING REQUEST ===');
    console.log('Participation ID:', req.params.id);
    console.log('Attended:', attended);
    console.log('Volunteer Hours (from request):', volunteerHours);

    const participation = await Participation.findById(req.params.id)
      .populate('event')
      .populate('student', 'name email totalVolunteerHours');

    if (!participation) {
      console.log('❌ Participation not found');
      return res.status(404).json({ message: 'Participation not found' });
    }

    console.log('Student:', participation.student.name);
    console.log('Current Student Hours:', participation.student.totalVolunteerHours);
    console.log('Event:', participation.event.title);

    const wasAttended = participation.attendance;
    participation.attendance = attended;
    participation.attendanceDate = attended ? new Date() : null;
    participation.status = attended ? 'attended' : participation.status;

    // Calculate volunteer hours if marking as attended
    if (attended && !wasAttended) {
      console.log('\n📊 Calculating volunteer hours...');
      // Use provided hours or calculate from event duration
      let hours = typeof volunteerHours !== 'undefined' ? Number(volunteerHours) : undefined;
      if (typeof hours === 'undefined' || Number.isNaN(hours)) {
        if (participation.event) {
          // Calculate hours from event start and end date (in hours)
          const startDate = new Date(participation.event.startDate);
          const endDate = new Date(participation.event.endDate);
          const durationInMs = endDate - startDate;
          hours = Math.max(1, Math.round(durationInMs / (1000 * 60 * 60))); // Convert to hours, minimum 1 hour
          console.log(`Calculated from event duration: ${hours} hours`);
        } else {
          hours = 1;
        }
      }

      // Determine maximum allowed hours: event duration in hours + 2 hour buffer
      let maxAllowed = 24;
      if (participation.event && participation.event.startDate && participation.event.endDate) {
        const durationInMs = new Date(participation.event.endDate) - new Date(participation.event.startDate);
        const durationHours = Math.max(0, Math.round(durationInMs / (1000 * 60 * 60)));
        maxAllowed = Math.max(1, durationHours + 2);
      }

      if (hours < 0 || hours > maxAllowed) {
        return res.status(400).json({ message: `volunteerHours must be between 0 and ${maxAllowed}` });
      }

      participation.volunteerHours = hours; // set validated hours
      console.log(`Final hours to add: ${participation.volunteerHours}`);

      // Add hours to student's total
      const student = await User.findById(participation.student._id || participation.student);
      if (student) {
        const oldTotal = student.totalVolunteerHours || 0;
        student.totalVolunteerHours = oldTotal + participation.volunteerHours;
        await student.save();
        console.log(`✅ HOURS UPDATED!`);
        console.log(`   Student: ${student.name}`);
        console.log(`   Previous Total: ${oldTotal} hours`);
        console.log(`   Added: ${participation.volunteerHours} hours`);
        console.log(`   New Total: ${student.totalVolunteerHours} hours`);
      } else {
        console.log('❌ ERROR: Student not found!');
      }
    } else if (!attended && wasAttended) {
      console.log('\n⚠️ Unmarking attendance - removing hours...');
      // If unmarking attendance, subtract the hours
      const student = await User.findById(participation.student._id || participation.student);
      if (student && participation.volunteerHours) {
        const oldTotal = student.totalVolunteerHours || 0;
        student.totalVolunteerHours = Math.max(0, oldTotal - participation.volunteerHours);
        await student.save();
        console.log(`⚠️ HOURS REMOVED!`);
        console.log(`   Student: ${student.name}`);
        console.log(`   Previous Total: ${oldTotal} hours`);
        console.log(`   Removed: ${participation.volunteerHours} hours`);
        console.log(`   New Total: ${student.totalVolunteerHours} hours`);
      }
      participation.volunteerHours = 0;
    } else {
      console.log('ℹ️ No hours change needed (wasAttended:', wasAttended, ', attended:', attended, ')');
    }

    await participation.save();
    console.log('✅ Participation saved');

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


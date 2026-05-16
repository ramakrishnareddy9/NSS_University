const express = require('express');
const Participation = require('../models/Participation');
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const { sendEventReminder } = require('../utils/notifications');
const { auth, authorize } = require('../middleware/auth');

let cron = null;
try {
  cron = require('node-cron');
} catch (error) {
  console.log('node-cron not installed. Scheduled notifications will not work.');
}

const router = express.Router();

if (cron) {
  cron.schedule('0 9 * * *', async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const events = await Event.find({
        startDate: { $gte: tomorrow, $lt: dayAfterTomorrow },
        status: { $in: ['published', 'ongoing'] }
      });

      for (const event of events) {
        const participations = await Participation.find({
          event: event._id,
          status: { $in: ['approved', 'attended'] }
        }).populate('student', 'name email');

        for (const participation of participations) {
          try {
            await sendEventReminder(participation.student, event, 1);
          } catch (error) {
            console.error(`Failed to send reminder to ${participation.student.email}:`, error);
          }
        }
      }

      console.log(`Sent ${events.length} event reminders`);
    } catch (error) {
      console.error('Error in scheduled reminder job:', error);
    }
  });
}

// @route   POST /api/scheduler/send-reminder
// @desc    Manually send event reminder
// @access  Private (Admin/Faculty)
router.post('/send-reminder', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const { eventId, daysBefore = 1 } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const participations = await Participation.find({
      event: eventId,
      status: { $in: ['approved', 'attended'] }
    }).populate('student', 'name email');

    const results = [];
    for (const participation of participations) {
      try {
        const result = await sendEventReminder(participation.student, event, daysBefore);
        results.push({ student: participation.student.email, success: result.success });
      } catch (error) {
        results.push({ student: participation.student.email, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Reminders sent to ${participations.length} participants`,
      data: { results }
    });
  } catch (error) {
    console.error('Send reminder error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/scheduler/clear
// @desc    Clear all notifications for current user
// @access  Private
router.delete('/clear', auth, async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user.id });

    res.json({ success: true, message: 'All notifications cleared successfully' });
  } catch (error) {
    console.error('Clear notifications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
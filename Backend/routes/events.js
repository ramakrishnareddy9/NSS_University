const express = require('express');
const { body, validationResult } = require('express-validator');
const Event = require('../models/Event');
const Participation = require('../models/Participation');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { auth, authorize } = require('../middleware/auth');
const { sendNewEventNotification } = require('../utils/notifications');

const router = express.Router();

// @route   GET /api/events
// @desc    Get all events (with filters)
// @access  Public (for students), Private (for admin/faculty)
router.get('/', auth, async (req, res) => {
  try {
    const { status, eventType, search } = req.query;
    const query = {};

    // Students can only see published events
    if (req.user.role === 'student') {
      query.status = { $in: ['published', 'ongoing', 'completed'] };
    }

    if (status) {
      query.status = status;
    }

    if (eventType) {
      query.eventType = eventType;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const events = await Event.find(query)
      .populate('organizer', 'name email')
      .sort({ createdAt: -1 });

    // Add participation status for students
    if (req.user.role === 'student') {
      for (let event of events) {
        const participation = await Participation.findOne({
          student: req.user.id,
          event: event._id
        });
        event._doc.participationStatus = participation ? participation.status : null;
      }
    }

    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/events/:id
// @desc    Get single event
// @access  Private
router.get('/:id', auth, async (req, res) => {
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

    // Check if student is registered
    if (req.user.role === 'student') {
      const participation = await Participation.findOne({
        student: req.user.id,
        event: event._id
      });
      event._doc.participationStatus = participation ? participation.status : null;
    }

    res.json(event);
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
  body('registrationDeadline').isISO8601().withMessage('Valid registration deadline is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const eventData = {
      ...req.body,
      organizer: req.user.id
    };

    const event = new Event(eventData);
    await event.save();

    await event.populate('organizer', 'name email');

    console.log(`\n🎯 ===== NEW EVENT CREATED: ${event.title} =====`);
    console.log(`   Event ID: ${event._id}`);
    console.log(`   Status: ${event.status}`);

    // Send notifications to all students when event is published
    if (req.body.status === 'published' || event.status === 'published') {
      try {
        console.log('\n📋 Fetching students for notifications...');
        const students = await User.find({ 
          role: 'student', 
          isActive: true,
          email: { $exists: true, $ne: null, $ne: '' }
        }).select('email name _id');
        
        console.log(`✅ Found ${students.length} registered students`);
        
        if (students.length > 0) {
          // Send emails in background (don't wait)
          console.log('📧 Sending email notifications...');
          sendNewEventNotification(event, students).catch(error => {
            console.error('Error sending event notifications:', error);
          });

          // Send WebSocket notification to all connected students
          const io = req.app.get('io');
          if (io) {
            console.log(`🔔 Sending WebSocket notifications...`);
            console.log(`   Connected clients: ${io.engine.clientsCount}`);
            
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

            // Send to individual user rooms
            students.forEach(student => {
              const roomName = `user-${student._id}`;
              io.to(roomName).emit('new-event', notificationData);
              console.log(`   📤 Sent to room: ${roomName} (${student.name})`);
            });

            // Broadcast to all connected users (admin + students)
            console.log(`   📢 Broadcasting to all connected clients...`);
            io.emit('new-event', notificationData);
            io.emit('new-event-broadcast', notificationData);
          } else {
            console.warn('⚠️ Socket.IO not available');
          }

          // Store notifications in database for offline students
          console.log('💾 Storing notifications in database...');
          const Notification = require('../models/Notification');
          const notificationPromises = students.map(student => {
            return Notification.create({
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
            });
          });
          
          await Promise.allSettled(notificationPromises);
          console.log(`✅ Stored ${students.length} notifications in database`);
        }
      } catch (error) {
        console.error('❌ Error notifying students about new event:', error);
        console.error('   Stack:', error.stack);
        // Don't fail the request if notification fails
      }
    } else {
      console.log('⏭️ Event not published yet, skipping notifications');
    }

    console.log(`✅ Event creation completed\n`);
    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/events/:id/publish
// @desc    Publish event
// @access  Private (Admin/Faculty only)
// Note: This route must come before PUT /:id to avoid route conflicts
router.post('/:id/publish', auth, async (req, res) => {
  try {
    // Check authorization manually for better error handling
    if (!req.user) {
      console.error('❌ No user found in request');
      return res.status(401).json({ message: 'Authentication required' });
    }

    console.log(`\n🔐 Publish attempt by user: ${req.user.name} (${req.user.email})`);
    console.log(`   User ID: ${req.user._id}`);
    console.log(`   User Role: ${req.user.role}`);
    console.log(`   Required Roles: admin, faculty`);

    if (!['admin', 'faculty'].includes(req.user.role)) {
      console.error(`❌ Access denied for user ${req.user._id} (${req.user.name}) with role: ${req.user.role}`);
      console.error(`   Expected role: 'admin' or 'faculty', but got: '${req.user.role}'`);
      return res.status(403).json({ 
        message: 'Access denied. Only Admin and Faculty can publish events.',
        userRole: req.user.role,
        userName: req.user.name,
        userId: req.user._id,
        requiredRoles: ['admin', 'faculty']
      });
    }

    console.log(`✅ Authorization successful for ${req.user.role}`);

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    event.status = 'published';
    await event.save();

    await event.populate('organizer', 'name email');

    console.log(`\n🎯 ===== PUBLISHING EVENT: ${event.title} =====`);
    console.log(`   Event ID: ${event._id}`);
    console.log(`   Status: ${event.status}`);

    // Send email notifications to ALL registered students when event is published
    try {
      console.log('\n📋 Step 1: Fetching students...');
      // Get all registered students (active and with email addresses)
      const students = await User.find({ 
        role: 'student', 
        isActive: true,
        email: { $exists: true, $ne: null, $ne: '' }
      }).select('email name _id');
      
      console.log(`✅ Found ${students.length} registered students with email addresses`);
      
      if (students.length > 0) {
        console.log('📧 Step 2: Starting email notifications...');
        // Send emails to all registered students (await to ensure it starts)
        const emailPromise = sendNewEventNotification(event, students)
          .then(results => {
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;
            console.log(`\n📊 Email Summary:`);
            console.log(`   ✅ Successful: ${successful}`);
            console.log(`   ❌ Failed: ${failed}`);
            console.log(`   📧 Total attempted: ${results.length}`);
            if (failed > 0) {
              console.error('   Failed email sends:', results.filter(r => !r.success));
            }
            return results;
          })
          .catch(error => {
            console.error('❌ Error in email notification promise:', error);
            console.error('   Stack:', error.stack);
            throw error;
          });
        
        // Don't await, but ensure it starts
        emailPromise.catch(err => console.error('Email promise error:', err));

        console.log('🔔 Step 3: Starting WebSocket notifications...');
        // Send WebSocket notification to all connected students
        const io = req.app.get('io');
        if (io) {
          console.log(`   Socket.IO available. Connected clients: ${io.engine.clientsCount}`);
          
          let notificationsSent = 0;
          const notificationData = {
            type: 'new-event',
            message: `New event: ${event.title}`,
            event: {
              id: event._id.toString(),
              title: event.title,
              eventType: event.eventType,
              location: event.location,
              startDate: event.startDate
            },
            timestamp: new Date()
          };

          students.forEach(student => {
            const studentId = student._id.toString();
            const roomName = `user-${studentId}`;
            
            console.log(`   📤 Sending to room: ${roomName} (${student.name})`);
            io.to(roomName).emit('new-event', notificationData);
            notificationsSent++;
          });
          
          // Also broadcast to all connected sockets (for students who might have joined)
          console.log(`   📢 Broadcasting to all connected clients...`);
          io.emit('new-event-broadcast', notificationData);
          
          // Store notifications in database for students who log in later
          console.log(`💾 Storing notifications in database for offline students...`);
          const notificationPromises = students.map(student => {
            return Notification.create({
              user: student._id,
              type: 'new-event',
              message: `New event: ${event.title}`,
              data: {
                eventId: event._id.toString(),
                eventTitle: event.title,
                eventType: event.eventType,
                location: event.location,
                startDate: event.startDate
              },
              read: false
            }).catch(err => {
              console.error(`   Failed to store notification for ${student.name}:`, err.message);
            });
          });
          
          await Promise.allSettled(notificationPromises);
          console.log(`✅ Stored ${students.length} notifications in database`);
          
          console.log(`✅ WebSocket: Sent to ${notificationsSent} student rooms + broadcast`);
        } else {
          console.error('❌ Socket.IO NOT AVAILABLE!');
          console.error('   This means WebSocket notifications will not work.');
        }
      } else {
        console.warn('⚠️ No students found with email addresses');
        console.warn('   Email notifications will be skipped.');
      }
      
      console.log('\n🎯 ===== PUBLISH COMPLETE =====\n');
    } catch (error) {
      console.error('❌ CRITICAL ERROR in notification process:', error);
      console.error('   Error message:', error.message);
      console.error('   Stack trace:', error.stack);
      // Don't fail the request if notification fails
    }

    res.json(event);
  } catch (error) {
    console.error('Publish event error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/events/:id
// @desc    Update event
// @access  Private (Admin/Faculty only)
router.put('/:id', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the organizer or admin
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    Object.assign(event, req.body);
    await event.save();

    await event.populate('organizer', 'name email');

    // Broadcast event update to all connected users
    const io = req.app.get('io');
    if (io) {
      io.emit('event-updated', {
        type: 'event-updated',
        message: `Event updated: ${event.title}`,
        event: {
          id: event._id,
          title: event.title,
          eventType: event.eventType,
          location: event.location,
          startDate: event.startDate,
          status: event.status
        },
        timestamp: new Date()
      });
      console.log(`🔄 Broadcasted event update: ${event.title}`);
    }

    res.json(event);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/events/:id
// @desc    Delete event
// @access  Private (Admin only)
router.delete('/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Delete related participations
    await Participation.deleteMany({ event: event._id });

    // Broadcast event deletion to all connected users
    const io = req.app.get('io');
    if (io) {
      io.emit('event-deleted', {
        type: 'event-deleted',
        message: `Event deleted: ${event.title}`,
        event: {
          id: event._id,
          title: event.title,
          eventType: event.eventType,
          location: event.location,
          startDate: event.startDate,
          status: event.status
        },
        timestamp: new Date()
      });
      console.log(`🗑️ Broadcasted event deletion: ${event.title}`);
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


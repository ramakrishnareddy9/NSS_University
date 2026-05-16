// Test notifications when publishing an event
// Run with: node backend/utils/test-notifications.js [eventId]

require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const { sendNewEventNotification } = require('./notifications');
const http = require('http');
const io = require('socket.io-client');

async function testNotifications() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nss-portal', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    const args = process.argv.slice(2);
    const eventId = args[0];

    // Get event
    let event;
    if (eventId) {
      event = await Event.findById(eventId);
      if (!event) {
        console.error(`❌ Event with ID ${eventId} not found`);
        return;
      }
    } else {
      event = await Event.findOne({}).sort({ createdAt: -1 });
      if (!event) {
        console.error('❌ No events found in database');
        return;
      }
    }

    console.log(`📅 Testing with event: ${event.title} (${event._id})\n`);

    // Get students
    const students = await User.find({ 
      role: 'student', 
      isActive: true,
      email: { $exists: true, $ne: null, $ne: '' }
    }).select('email name _id');
    
    console.log(`👥 Found ${students.length} students with emails\n`);

    // Test email sending
    console.log('📧 Testing email notifications...\n');
    const emailResults = await sendNewEventNotification(event, students);
    console.log('\n📊 Email Results:', emailResults);

    // Test Socket.IO connection
    console.log('\n🔔 Testing Socket.IO connection...');
    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', socket.id);
      
      // Test joining a room
      if (students.length > 0) {
        const testStudent = students[0];
        socket.emit('join-user-room', testStudent._id.toString());
        console.log(`👤 Joined room for student: ${testStudent.name} (${testStudent._id})`);
        
        // Listen for notifications
        socket.on('new-event', (data) => {
          console.log('🔔 Received new-event notification:', data);
        });
        
        socket.on('new-event-broadcast', (data) => {
          console.log('🔔 Received broadcast notification:', data);
        });
        
        console.log('\n✅ Socket.IO test setup complete');
        console.log('   Waiting for notifications... (Press Ctrl+C to exit)');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error.message);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket.IO disconnected');
    });

    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\n👋 Exiting...');
      socket.disconnect();
      mongoose.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testNotifications();


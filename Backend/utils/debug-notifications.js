// Debug script to test notifications and emails
// Run with: node backend/utils/debug-notifications.js

require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const { sendNewEventNotification } = require('./notifications');

async function debugNotifications() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nss-portal', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Check email configuration
    console.log('📧 Email Configuration Check:');
    console.log(`   EMAIL_HOST: ${process.env.EMAIL_HOST || 'not set'}`);
    console.log(`   EMAIL_PORT: ${process.env.EMAIL_PORT || 'not set'}`);
    console.log(`   EMAIL_USER: ${process.env.EMAIL_USER || 'not set'}`);
    console.log(`   EMAIL_PASS: ${process.env.EMAIL_PASS ? '***' : 'not set'}\n`);

    // Check students
    const students = await User.find({ 
      role: 'student', 
      isActive: true,
      email: { $exists: true, $ne: null, $ne: '' }
    }).select('email name _id');
    
    console.log(`👥 Students with emails: ${students.length}`);
    if (students.length > 0) {
      console.log('   First 5 students:');
      students.slice(0, 5).forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.name} - ${s.email}`);
      });
    }

    // Check events
    const events = await Event.find({}).limit(1);
    if (events.length > 0) {
      console.log(`\n📅 Latest event: ${events[0].title}`);
      
      if (students.length > 0) {
        console.log('\n🧪 Testing email notification...');
        const testStudents = students.slice(0, 1); // Test with first student
        const results = await sendNewEventNotification(events[0], testStudents);
        console.log('Results:', results);
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugNotifications();


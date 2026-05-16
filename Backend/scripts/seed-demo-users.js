const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const demoUsers = [
  {
    name: 'Demo Admin',
    email: 'admin@nssportal.local',
    password: 'DemoPass123!',
    role: 'admin',
    phone: '9000000001',
    department: 'Administration',
    isActive: true
  },
  {
    name: 'Demo Faculty',
    email: 'faculty@nssportal.local',
    password: 'DemoPass123!',
    role: 'faculty',
    phone: '9000000002',
    department: 'Computer Science',
    isActive: true
  },
  {
    name: 'Demo Student One',
    email: 'student1@nssportal.local',
    password: 'DemoPass123!',
    role: 'student',
    studentId: 'NSS001',
    phone: '9000000003',
    department: 'Computer Science',
    year: '2nd',
    isActive: true
  },
  {
    name: 'Demo Student Two',
    email: 'student2@nssportal.local',
    password: 'DemoPass123!',
    role: 'student',
    studentId: 'NSS002',
    phone: '9000000004',
    department: 'Information Technology',
    year: '3rd',
    isActive: true
  }
];

async function seedDemoUsers() {
  const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/nss-portal';

  try {
    await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const createdUsers = [];

    for (const demoUser of demoUsers) {
      const existingUser = await User.findOne({ email: demoUser.email });

      if (!existingUser) {
        await User.create(demoUser);
        createdUsers.push(demoUser.email);
      }
    }

    if (createdUsers.length > 0) {
      console.log(`🌱 Demo users seeded: ${createdUsers.join(', ')}`);
    } else {
      console.log('🌱 Demo users already present');
    }
  } catch (error) {
    console.error('❌ Demo user seed failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedDemoUsers();
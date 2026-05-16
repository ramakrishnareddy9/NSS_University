// Script to check and update user role
// Run with: node backend/utils/check-user-role.js [email] [newRole]

require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkOrUpdateUserRole() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nss-portal', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    const args = process.argv.slice(2);
    const email = args[0];
    const newRole = args[1];

    if (!email) {
      // List all users
      console.log('📋 All Users:\n');
      const users = await User.find({}).select('name email role isActive');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.isActive}`);
        console.log('');
      });
      return;
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      console.error(`❌ User with email "${email}" not found`);
      return;
    }

    console.log(`\n👤 User Found:`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}\n`);

    // Update role if provided
    if (newRole && ['admin', 'faculty', 'student'].includes(newRole)) {
      const oldRole = user.role;
      user.role = newRole;
      await user.save();
      console.log(`✅ Role updated from "${oldRole}" to "${newRole}"`);
      console.log(`\n📝 Updated User:`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   New Role: ${user.role}\n`);
      console.log('⚠️  You may need to log out and log back in for changes to take effect.');
    } else if (newRole) {
      console.error(`❌ Invalid role: ${newRole}`);
      console.log('   Valid roles: admin, faculty, student');
    } else {
      console.log('💡 To update role, run:');
      console.log(`   node backend/utils/check-user-role.js ${email} admin`);
      console.log(`   or`);
      console.log(`   node backend/utils/check-user-role.js ${email} faculty`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkOrUpdateUserRole();


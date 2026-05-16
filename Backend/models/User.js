const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'faculty', 'student'],
    default: 'student'
  },
  studentId: {
    type: String,
    sparse: true,
    unique: true
  },
  phone: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  year: {
    type: String,
    enum: ['1st', '2nd', '3rd', '4th', 'PG'],
    default: '1st'
  },
  totalVolunteerHours: {
    type: Number,
    default: 0
  },
  contributions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contribution'
  }],
  // Rewards and Points System
  rewardPoints: {
    type: Number,
    default: 0
  },
  reportingScore: {
    type: Number,
    default: 0
  },
  badges: [{
    type: String,
    enum: [
      'First Reporter',
      'Community Hero',
      'Problem Solver',
      'Change Maker',
      'Eagle Eye',
      'Active Reporter',
      'Environmental Champion',
      'Health Guardian',
      'Infrastructure Inspector'
    ]
  }],
  problemsReported: {
    type: Number,
    default: 0
  },
  problemsApproved: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);


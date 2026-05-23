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
    trim: true,
    match: [/^[+]?\d{10,15}$/, 'Invalid phone number format']
  },
  department: {
    type: String,
    trim: true
  },
  // Academic year in format "YYYY-YY" e.g., "2024-25"
  academicYear: {
    type: String,
    trim: true
  },
  // Batch/cohort identifier (can default to academicYear)
  batch: {
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
  // NOTE: `contributions` removed to avoid unbounded array growth. Query contributions via Contribution model.
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
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  // Notification preferences per type
  notificationPreferences: {
    emailNotifications: {
      newEvent: { type: Boolean, default: true },
      eventPublished: { type: Boolean, default: true },
      participationApproved: { type: Boolean, default: true },
      participationRejected: { type: Boolean, default: true },
      waitlistPromotion: { type: Boolean, default: true },
      eventCancelled: { type: Boolean, default: true },
      certificateReady: { type: Boolean, default: true },
      contributionVerified: { type: Boolean, default: true },
      eventReminder: { type: Boolean, default: true }
    },
    pushNotifications: { type: Boolean, default: true },
    inAppNotifications: { type: Boolean, default: true }
  }
  ,
  fcmTokens: [{
    token: { type: String },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ role: 1, totalVolunteerHours: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('phone') && typeof this.phone === 'string') {
    this.phone = this.phone.replace(/[\s\-().]/g, '');
  }

  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);


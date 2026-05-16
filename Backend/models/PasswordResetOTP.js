const mongoose = require('mongoose');

const passwordResetOTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: true,
    select: false
  },
  expiresAt: {
    type: Date,
    required: true,
    // Store an absolute expiry time (10 minutes from creation). Use a TTL index with expireAfterSeconds: 0.
    default: () => new Date(Date.now() + 10 * 60 * 1000)
  },
  isUsed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for cleanup of expired documents
// Create a TTL index on `expiresAt` where documents expire at the stored date.
passwordResetOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PasswordResetOTP', passwordResetOTPSchema);

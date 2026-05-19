const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

// Hash OTP before saving if it's a raw 6-digit code. If the OTP field
// already appears hashed (not matching 6-digit numeric), we leave it unchanged.
passwordResetOTPSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('otp')) return next();
    const rawOtp = this.otp;
    // If OTP looks like 6 digits, hash it. Otherwise assume it's already hashed.
    if (/^\d{6}$/.test(String(rawOtp))) {
      const hash = await bcrypt.hash(String(rawOtp), 10);
      this.otp = hash;
    }
    return next();
  } catch (err) {
    return next(err);
  }
});

// Helper to compare a plain OTP against the stored hash. Caller must select('+otp') when querying.
passwordResetOTPSchema.methods.compareOtp = async function (plainOtp) {
  if (!this.otp) return false;
  return bcrypt.compare(String(plainOtp), this.otp);
};

module.exports = mongoose.model('PasswordResetOTP', passwordResetOTPSchema);

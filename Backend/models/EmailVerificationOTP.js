const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const emailVerificationOTPSchema = new mongoose.Schema({
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
    default: () => new Date(Date.now() + 15 * 60 * 1000)
  },
  isUsed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

emailVerificationOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Hash OTP before saving if it's a raw 6-digit code. If the OTP field
// already appears hashed (not matching 6-digit numeric), we leave it unchanged.
emailVerificationOTPSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('otp')) return next();
    const rawOtp = this.otp;
    if (/^\d{6}$/.test(String(rawOtp))) {
      const hash = await bcrypt.hash(String(rawOtp), 10);
      this.otp = hash;
    }
    return next();
  } catch (err) {
    return next(err);
  }
});

emailVerificationOTPSchema.methods.compareOtp = async function (plainOtp) {
  if (!this.otp) return false;
  return bcrypt.compare(String(plainOtp), this.otp);
};

module.exports = mongoose.model('EmailVerificationOTP', emailVerificationOTPSchema);

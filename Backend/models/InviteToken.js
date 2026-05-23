const mongoose = require('mongoose');
const crypto = require('crypto');

const inviteTokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'faculty'],
    required: true
  },
  userData: {
    name: String,
    phone: String,
    department: String
  },
  expiresAt: {
    type: Date,
    required: true,
    // Store an absolute expiry time (24 hours from creation). Use a TTL index with expireAfterSeconds: 0.
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  usedAt: Date,
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for cleanup of expired documents
inviteTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
inviteTokenSchema.index({ email: 1, isUsed: 1 });

// Static method to generate a new invite token
inviteTokenSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = mongoose.model('InviteToken', inviteTokenSchema);

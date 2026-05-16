const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  participation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participation',
    required: true
  },
  report: {
    type: String,
    required: true
  },
  volunteerHours: {
    type: Number,
    required: true,
    min: 0
  },
  evidence: [{
    type: {
      type: String,
      enum: ['photo', 'writeup', 'document']
    },
    url: String,
    publicId: String,
    description: String
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Contribution', contributionSchema);


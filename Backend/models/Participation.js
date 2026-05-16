const mongoose = require('mongoose');

const participationSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'attended', 'completed'],
    default: 'pending'
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: {
    type: Date
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Rejection audit fields (set when a participation is rejected)
  rejectedAt: {
    type: Date
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Completion audit fields (set when admin/faculty marks participation as completed)
  completedAt: {
    type: Date
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  attendance: {
    type: Boolean,
    default: false
  },
  attendanceDate: {
    type: Date
  },
  volunteerHours: {
    type: Number,
    default: 0
  },
  contribution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contribution'
  },
  certificate: {
    url: String,
    publicId: String,
    generatedAt: Date
  }
}, {
  timestamps: true
});

// Prevent duplicate participations
participationSchema.index({ student: 1, event: 1 }, { unique: true });

module.exports = mongoose.model('Participation', participationSchema);


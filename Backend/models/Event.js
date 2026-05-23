const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    enum: ['tree plantation', 'blood donation', 'cleanliness drive', 'awareness campaign', 'health camp', 'other'],
    required: true
  },
  location: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  registrationDeadline: {
    type: Date,
    required: true
  },
  maxParticipants: {
    type: Number,
    default: null
  },
  currentParticipants: {
    type: Number,
    default: 0
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  academicYear: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'],
    default: 'draft'
  },
  requirements: [{
    type: String
  }],
  images: [{
    url: String,
    publicId: String
  }],
  summaryReport: {
    url: { type: String, default: null },
    publicId: { type: String, default: null },
    generatedAt: { type: Date },
    summaryText: { type: String },
    reportType: {
      type: String,
      enum: ['event', 'academic-year'],
      default: 'event'
    }
  },
  certificate: {
    templateUrl: {
      type: String,
      default: null
    },
    templatePublicId: {
      type: String,
      default: null
    },
    fields: {
      name: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        fontSize: { type: Number, default: 36 },
        color: { type: String, default: '#000000' },
        fontFamily: { type: String, default: 'Arial' }
      },
      eventName: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        fontSize: { type: Number, default: 28 },
        color: { type: String, default: '#000000' },
        fontFamily: { type: String, default: 'Arial' }
      },
      date: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        fontSize: { type: Number, default: 24 },
        color: { type: String, default: '#000000' },
        fontFamily: { type: String, default: 'Arial' }
      }
    },
    autoSend: {
      type: Boolean,
      default: true
    }
  },
  certificatesSent: { type: Boolean, default: false },
  notificationsSent: { type: Boolean, default: false },
  // Problem Resolution Event fields
  isProblemResolution: {
    type: Boolean,
    default: false
  },
  relatedProblemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem'
  },
  // Event cancellation audit fields
  cancelledAt: {
    type: Date
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: {
    type: String,
    trim: true
  }
  ,
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

eventSchema.index({ status: 1, startDate: 1 });
eventSchema.index({ startDate: 1, endDate: 1 });
eventSchema.index({ academicYear: 1, startDate: 1 });
eventSchema.index({ maxParticipants: 1, currentParticipants: 1 });

module.exports = mongoose.model('Event', eventSchema);


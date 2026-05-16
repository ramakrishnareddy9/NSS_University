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
  participations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participation'
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
    type: mongoose.Schema.Types.Mixed,
    default: () => ({
      templateUrl: null,
      templatePublicId: null,
      fields: {
        name: { x: 0, y: 0, fontSize: 36, color: '#000000', fontFamily: 'Arial' },
        eventName: { x: 0, y: 0, fontSize: 28, color: '#000000', fontFamily: 'Arial' },
        date: { x: 0, y: 0, fontSize: 24, color: '#000000', fontFamily: 'Arial' }
      },
      autoSend: true
    })
  },
  certificatesSent: { type: Boolean, default: false },
  // Problem Resolution Event fields
  isProblemResolution: {
    type: Boolean,
    default: false
  },
  relatedProblemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);


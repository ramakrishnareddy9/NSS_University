const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  files: [{
    url: String,
    publicId: String,
    fileName: String,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  aiSummary: {
    type: String,
    default: null
  },
  aiAnalysis: {
    keyPoints: [String],
    learnings: [String],
    impact: String,
    recommendations: [String],
    generatedAt: Date
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'reviewed', 'approved', 'rejected'],
    default: 'draft'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewNotes: String,
  reviewedAt: Date,
  academicYear: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
reportSchema.index({ student: 1, event: 1 }, { unique: true });
reportSchema.index({ academicYear: 1 });
reportSchema.index({ status: 1 });

module.exports = mongoose.model('Report', reportSchema);

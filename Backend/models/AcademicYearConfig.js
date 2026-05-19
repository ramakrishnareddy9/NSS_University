const mongoose = require('mongoose');

const academicYearConfigSchema = new mongoose.Schema({
  yearLabel: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  startMonth: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  endMonth: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  certificateHoursRequired: {
    type: Number,
    min: 0,
    default: 240
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

academicYearConfigSchema.index({ yearLabel: 1 }, { unique: true });
academicYearConfigSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('AcademicYearConfig', academicYearConfigSchema);
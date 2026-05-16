const mongoose = require('mongoose');

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const periodConfigSchema = new mongoose.Schema({
  academicYear: {
    type: String,
    required: true,
    unique: true
  },
  periods: {
    '1st': [{
      periodNumber: {
        type: Number,
        required: true
      },
      startTime: {
        type: String,
        required: true,
        match: timePattern
      },
      endTime: {
        type: String,
        required: true,
        match: timePattern
      }
    }],
    '2nd': [{
      periodNumber: {
        type: Number,
        required: true
      },
      startTime: {
        type: String,
        required: true,
        match: timePattern
      },
      endTime: {
        type: String,
        required: true,
        match: timePattern
      }
    }],
    '3rd': [{
      periodNumber: {
        type: Number,
        required: true
      },
      startTime: {
        type: String,
        required: true,
        match: timePattern
      },
      endTime: {
        type: String,
        required: true,
        match: timePattern
      }
    }],
    '4th': [{
      periodNumber: {
        type: Number,
        required: true
      },
      startTime: {
        type: String,
        required: true,
        match: timePattern
      },
      endTime: {
        type: String,
        required: true,
        match: timePattern
      }
    }],
    'PG': [{
      periodNumber: {
        type: Number,
        required: true
      },
      startTime: {
        type: String,
        required: true,
        match: timePattern
      },
      endTime: {
        type: String,
        required: true,
        match: timePattern
      }
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PeriodConfig', periodConfigSchema);

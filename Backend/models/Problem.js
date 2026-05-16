const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Problem title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Problem description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'cleanliness',
      'infrastructure',
      'health',
      'education',
      'environment',
      'safety',
      'water',
      'electricity',
      'roads',
      'other'
    ]
  },
  location: {
    address: {
      type: String,
      required: [true, 'Location address is required'],
      trim: true
    },
    coordinates: {
      lat: {
        type: Number,
        min: -90,
        max: 90
      },
      lng: {
        type: Number,
        min: -180,
        max: 180
      }
    }
  },
  images: [{
    type: String, // Cloudinary URLs
    trim: true
  }],
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'resolved'],
    default: 'pending'
  },
  visibility: {
    type: String,
    enum: ['private', 'public'],
    default: 'private' // Private until approved
  },
  adminFeedback: {
    type: String,
    trim: true,
    maxlength: [1000, 'Feedback cannot exceed 1000 characters']
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  },
  pointsAwarded: {
    type: Number,
    default: 0
  },
  resolvedAt: {
    type: Date
  },
  // Additional metadata
  viewCount: {
    type: Number,
    default: 0
  },
  upvotes: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better query performance
problemSchema.index({ reportedBy: 1, status: 1 });
problemSchema.index({ status: 1, visibility: 1 });
problemSchema.index({ category: 1 });
problemSchema.index({ createdAt: -1 });

// Virtual for checking if problem is public
problemSchema.virtual('isPublic').get(function() {
  return this.visibility === 'public' && this.status === 'approved';
});

// Method to check if user can view this problem
problemSchema.methods.canBeViewedBy = function(userId, userRole) {
  // Admin can view all
  if (userRole === 'admin' || userRole === 'faculty') {
    return true;
  }
  
  // Reporter can view their own
  if (this.reportedBy.toString() === userId.toString()) {
    return true;
  }
  
  // Others can only view public/approved problems
  return this.visibility === 'public' && this.status === 'approved';
};

// Static method to get problems visible to a user
problemSchema.statics.getVisibleProblems = function(userId, userRole) {
  if (userRole === 'admin' || userRole === 'faculty') {
    // Admin sees all
    return this.find();
  } else {
    // Students see only their own or public approved ones
    return this.find({
      $or: [
        { reportedBy: userId },
        { visibility: 'public', status: 'approved' }
      ]
    });
  }
};

module.exports = mongoose.model('Problem', problemSchema);

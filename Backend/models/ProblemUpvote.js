const mongoose = require('mongoose');

const problemUpvoteSchema = new mongoose.Schema(
  {
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: true
    },
    upvotedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index to prevent duplicate upvotes
problemUpvoteSchema.index({ problem: 1, upvotedBy: 1 }, { unique: true });

// Index to quickly find upvotes for a problem
problemUpvoteSchema.index({ problem: 1 });

// Index to quickly find problems upvoted by a user
problemUpvoteSchema.index({ upvotedBy: 1 });

module.exports = mongoose.model('ProblemUpvote', problemUpvoteSchema);

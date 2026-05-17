const express = require('express');
const router = express.Router();
const {
  submitProblem,
  getProblems,
  getProblemById,
  getMyReports,
  approveProblem,
  rejectProblem,
  resolveProblem,
  getLeaderboard,
  getCategoryHeatmap,
  followUser,
  unfollowUser,
  getFollowersCount,
  upvoteProblem,
  removeUpvote,
  getUpvoteCount
} = require('../controllers/problemController');
const { auth, authorize } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

// PUBLIC routes (no auth required)
router.get('/heatmap/categories', getCategoryHeatmap);
router.get('/followers/:userId', validateObjectId('userId'), getFollowersCount);
router.get('/:id/upvotes', validateObjectId('id'), getUpvoteCount);

// Protected routes (all authenticated users)
router.use(auth);

// Leaderboard is now authenticated to avoid exposing student PII publicly
router.get('/leaderboard', getLeaderboard);

// Student routes
router.post('/', submitProblem);
router.get('/', getProblems);
router.get('/my-reports', getMyReports);
router.get('/:id', validateObjectId('id'), getProblemById);

// Follow routes
router.post('/follow/:userId', validateObjectId('userId'), followUser);
router.delete('/follow/:userId', validateObjectId('userId'), unfollowUser);

// Upvote routes
router.post('/:id/upvote', validateObjectId('id'), upvoteProblem);
router.delete('/:id/upvote', validateObjectId('id'), removeUpvote);

// Admin/Faculty only routes
router.put('/:id/approve', validateObjectId('id'), authorize('admin', 'faculty'), approveProblem);
router.put('/:id/reject', validateObjectId('id'), authorize('admin', 'faculty'), rejectProblem);
router.put('/:id/resolve', validateObjectId('id'), authorize('admin', 'faculty'), resolveProblem);

module.exports = router;

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
  getLeaderboard
} = require('../controllers/problemController');
const { auth, authorize } = require('../middleware/auth');

// Public routes
router.get('/leaderboard', getLeaderboard);

// Protected routes (all authenticated users)
router.use(auth);

// Student routes
router.post('/', submitProblem);
router.get('/', getProblems);
router.get('/my-reports', getMyReports);
router.get('/:id', getProblemById);

// Admin/Faculty only routes
router.put('/:id/approve', authorize('admin', 'faculty'), approveProblem);
router.put('/:id/reject', authorize('admin', 'faculty'), rejectProblem);
router.put('/:id/resolve', authorize('admin', 'faculty'), resolveProblem);

module.exports = router;

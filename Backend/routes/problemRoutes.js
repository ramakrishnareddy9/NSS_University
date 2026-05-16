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
const validateObjectId = require('../middleware/validateObjectId');

// Protected routes (all authenticated users)
router.use(auth);

// Leaderboard is now authenticated to avoid exposing student PII publicly
router.get('/leaderboard', getLeaderboard);

// Student routes
router.post('/', submitProblem);
router.get('/', getProblems);
router.get('/my-reports', getMyReports);
router.get('/:id', validateObjectId('id'), getProblemById);

// Admin/Faculty only routes
router.put('/:id/approve', validateObjectId('id'), authorize('admin', 'faculty'), approveProblem);
router.put('/:id/reject', validateObjectId('id'), authorize('admin', 'faculty'), rejectProblem);
router.put('/:id/resolve', validateObjectId('id'), authorize('admin', 'faculty'), resolveProblem);

module.exports = router;

const Problem = require('../models/Problem');
const User = require('../models/User');
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const UserFollow = require('../models/UserFollow');
const ProblemUpvote = require('../models/ProblemUpvote');
const mongoose = require('mongoose');
const { sendEmail, sendNewEventNotification } = require('../utils/notifications');
const AuditLog = require('../models/AuditLog');
const appConfig = require('../config/appConfig');
const { getPagination, buildPagedResponse } = require('../utils/pagination');
const redis = require('../config/redis');

// Points configuration
const POINTS_CONFIG = {
  PROBLEM_APPROVED: 10,
  PROBLEM_RESOLVED: 5,
  HIGH_SEVERITY_BONUS: 5,
  CRITICAL_SEVERITY_BONUS: 10,
  FIRST_REPORT_BONUS: 20
};

// Badge thresholds
const BADGE_THRESHOLDS = {
  'First Reporter': 1,
  'Community Hero': 5,
  'Problem Solver': 10,
  'Change Maker': 20,
  'Active Reporter': 3 // 3 reports in current month
};

/**
 * @desc    Submit a new problem report
 * @route   POST /api/problems
 * @access  Private (Student)
 */
exports.submitProblem = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      location,
      images,
      severity
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !location?.address) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Create problem
    const problem = await Problem.create({
      title,
      description,
      category,
      location,
      images: images || [],
      severity: severity || 'medium',
      reportedBy: req.user._id,
      status: 'pending',
      visibility: 'private'
    });

    // Update user's problem count
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { problemsReported: 1 }
    });

    // Check for first report badge
    const user = await User.findById(req.user._id);
    if (user.problemsReported === 1 && !user.badges.includes('First Reporter')) {
      user.badges.push('First Reporter');
      user.rewardPoints += POINTS_CONFIG.FIRST_REPORT_BONUS;
      await user.save();
    }

    // Populate reporter details
    await problem.populate('reportedBy', 'name email studentId');

    try {
      await redis.purgePattern('leaderboard:*');
      await redis.del('landing:stats');
    } catch (cacheErr) {
      console.warn('Redis purge failed after submitProblem:', cacheErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Problem reported successfully. Waiting for admin approval.',
      data: problem
    });
  } catch (error) {
    console.error('Error submitting problem:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit problem',
      error: error.message
    });
  }
};

/**
 * @desc    Get all problems (with privacy filtering)
 * @route   GET /api/problems
 * @access  Private
 */
exports.getProblems = async (req, res) => {
  try {
    const { status, category, severity, visibility } = req.query;
    const userId = req.user._id;
    const userRole = req.user.role;

    let query = {};

    // Apply privacy filter
    if (userRole === 'admin' || userRole === 'faculty') {
      // Admin/Faculty can see all problems
      if (status) query.status = status;
      if (visibility) query.visibility = visibility;
    } else {
      // Students can only see their own or public approved ones
      query.$or = [
        { reportedBy: userId },
        { visibility: 'public', status: 'approved' }
      ];
      
      // If student filters by status, apply to their own reports only
      if (status) {
        query.$or = [
          { reportedBy: userId, status },
          { visibility: 'public', status: 'approved' }
        ];
      }
    }

    // Apply other filters
    if (category) query.category = category;
    if (severity) query.severity = severity;

    const { page, limit, skip } = getPagination(req);
    query.isDeleted = { $ne: true };

    const total = await Problem.countDocuments(query);

    const problems = await Problem.find(query)
      .populate('reportedBy', 'name email studentId department')
      .populate('reviewedBy', 'name email')
      .populate('eventId', 'title date location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      ...buildPagedResponse(problems, total, page, limit)
    });
  } catch (error) {
    console.error('Error fetching problems:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch problems',
      error: error.message
    });
  }
};

/**
 * @desc    Get single problem by ID
 * @route   GET /api/problems/:id
 * @access  Private
 */
exports.getProblemById = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id)
      .populate('reportedBy', 'name email studentId department')
      .populate('reviewedBy', 'name email')
      .populate('eventId', 'title date location registeredCount');

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    // Check if user can view this problem
    if (!problem.canBeViewedBy(req.user._id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this problem'
      });
    }

    // Increment view count
    problem.viewCount += 1;
    await problem.save();

    res.status(200).json({
      success: true,
      data: problem
    });
  } catch (error) {
    console.error('Error fetching problem:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch problem',
      error: error.message
    });
  }
};

/**
 * @desc    Get user's own problem reports
 * @route   GET /api/problems/my-reports
 * @access  Private (Student)
 */
exports.getMyReports = async (req, res) => {
  try {
    const problems = await Problem.find({ reportedBy: req.user._id, isDeleted: { $ne: true } })
      .populate('reviewedBy', 'name email')
      .populate('eventId', 'title date location')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: problems.length,
      data: problems
    });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your reports',
      error: error.message
    });
  }
};

/**
 * @desc    Approve problem and create event
 * @route   PUT /api/problems/:id/approve
 * @access  Private (Admin/Faculty)
 */
exports.approveProblem = async (req, res) => {
  try {
    const { eventDate, eventTime, additionalDetails } = req.body;

    const problem = await Problem.findById(req.params.id)
      .populate('reportedBy', 'name email studentId rewardPoints badges problemsApproved');

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    if (problem.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Problem has already been reviewed'
      });
    }

    // Create event from problem
    // Map problem category to event type
    const categoryToEventType = {
      'cleanliness': 'cleanliness drive',
      'infrastructure': 'other',
      'health': 'health camp',
      'education': 'awareness campaign',
      'environment': 'tree plantation',
      'safety': 'awareness campaign',
      'water': 'other',
      'electricity': 'other',
      'roads': 'other',
      'other': 'other'
    };

    const eventStartDate = eventDate ? new Date(eventDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const eventEndDate = new Date(eventStartDate);
    eventEndDate.setHours(eventStartDate.getHours() + 4); // Default 4-hour event
    let regDeadline = new Date(eventStartDate);
    regDeadline.setDate(regDeadline.getDate() - 1); // Registration closes 1 day before

    // Enforce a minimum registration lead time so students have time to register
    const now = new Date();
    const minLeadHours = parseInt(appConfig.MIN_REGISTRATION_LEAD_HOURS, 10) || 2;
    const minAllowedDeadline = new Date(now.getTime() + minLeadHours * 60 * 60 * 1000);
    let registrationDeadlineAdjusted = false;
    let originalRegistrationDeadline = null;
    if (regDeadline < now) {
      originalRegistrationDeadline = regDeadline;
      regDeadline = minAllowedDeadline;
      registrationDeadlineAdjusted = true;
    }

    const session = await mongoose.startSession();
    let event;
    let reporter;

    try {
      await session.withTransaction(async () => {
        // Calculate points
        let pointsToAward = POINTS_CONFIG.PROBLEM_APPROVED;
        
        if (problem.severity === 'high') {
          pointsToAward += POINTS_CONFIG.HIGH_SEVERITY_BONUS;
        } else if (problem.severity === 'critical') {
          pointsToAward += POINTS_CONFIG.CRITICAL_SEVERITY_BONUS;
        }

        event = await Event.create([{
          title: `Community Service: ${problem.title}`,
          description: `${problem.description}\n\n${additionalDetails || ''}`,
          eventType: categoryToEventType[problem.category] || 'other',
          location: problem.location.address,
          startDate: eventStartDate,
          endDate: eventEndDate,
          registrationDeadline: regDeadline,
          images: problem.images.map(url => ({ url, publicId: null })),
          organizer: req.user._id,
          status: 'published',
          isProblemResolution: true,
          relatedProblemId: problem._id
        }], { session }).then(docs => docs[0]);

        // Update problem
        problem.status = 'approved';
        problem.visibility = 'public';
        problem.reviewedBy = req.user._id;
        problem.reviewedAt = new Date();
        problem.eventId = event._id;
        problem.pointsAwarded = pointsToAward;
        await problem.save({ session });

        // Award points to reporter
        reporter = await User.findById(problem.reportedBy._id).session(session);
        reporter.rewardPoints += pointsToAward;
        reporter.reportingScore += pointsToAward;
        reporter.problemsApproved += 1;

        // Check and award badges
        await checkAndAwardBadges(reporter);
        await reporter.save({ session });
      });
    } finally {
      session.endSession();
    }

    if (registrationDeadlineAdjusted) {
      try {
        await AuditLog.create({
          action: 'registration_deadline_adjusted',
          actor: req.user._id,
          targetModel: 'Problem',
          targetId: problem._id,
          details: {
            originalDeadline: originalRegistrationDeadline,
            adjustedDeadline: regDeadline,
            minLeadHours,
            note: 'Registration deadline was earlier than now; adjusted to provide minimum lead time'
          }
        });
      } catch (logErr) {
        console.error('Failed to write AuditLog for registration deadline adjustment:', logErr);
      }

      try {
        await Notification.create({
          user: req.user._id,
          type: 'reg-deadline-warning',
          message: `Registration deadline for event created from problem "${problem.title}" was in the past and was adjusted to ${regDeadline.toISOString()}`,
          data: { problemId: problem._id, adjustedDeadline: regDeadline },
          read: false
        });
      } catch (notifyErr) {
        console.error('Failed to create admin notification for reg-deadline adjustment:', notifyErr);
      }
    }

    // Purge caches related to leaderboard/landing since data changed
    try {
      await redis.purgePattern('leaderboard:*');
      await redis.del('landing:stats');
    } catch (cacheErr) {
      console.warn('Redis purge failed after approveProblem:', cacheErr.message);
    }

    const pointsToAward = problem.pointsAwarded;

    // Send notification to reporter
    try {
      const emailSubject = '🎉 Your Problem Report Has Been Approved!';
      const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Congratulations ${reporter.name}!</h2>
            <p>Your problem report has been approved by the NSS admin.</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Problem Details:</h3>
              <p><strong>Title:</strong> ${problem.title}</p>
              <p><strong>Category:</strong> ${problem.category}</p>
              <p><strong>Location:</strong> ${problem.location.address}</p>
            </div>

            <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e40af;">🏆 Rewards Earned:</h3>
              <p style="font-size: 24px; font-weight: bold; color: #2563eb;">+${pointsToAward} Points</p>
              <p><strong>Total Points:</strong> ${reporter.rewardPoints}</p>
              ${reporter.badges.length > 0 ? `<p><strong>Badges:</strong> ${reporter.badges.join(', ')}</p>` : ''}
            </div>

            <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #166534;">📅 Event Created:</h3>
              <p>An event has been created to resolve this problem. All students will be notified.</p>
              <p><strong>Event:</strong> ${event.title}</p>
              <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>
            </div>

            <p>Thank you for being an active member of the NSS community!</p>
            
            <a href="${process.env.FRONTEND_URL}/problems/${problem._id}" 
               style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
              View Problem Details
            </a>
          </div>
        `;
      
      await sendEmail(reporter.email, emailSubject, '', emailHtml);
    } catch (emailError) {
      console.error('Error sending approval email:', emailError);
    }

    // Notify all students about the new event (emails + web notifications)
    await notifyAllStudentsAboutEvent(event, problem, req);

    res.status(200).json({
      success: true,
      message: 'Problem approved and event created successfully',
      data: {
        problem,
        event,
        pointsAwarded: pointsToAward,
        newBadges: reporter.badges
      }
    });
  } catch (error) {
    console.error('Error approving problem:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve problem',
      error: error.message
    });
  }
};

/**
 * @desc    Reject problem
 * @route   PUT /api/problems/:id/reject
 * @access  Private (Admin/Faculty)
 */
exports.rejectProblem = async (req, res) => {
  try {
    const { feedback } = req.body;

    const problem = await Problem.findById(req.params.id)
      .populate('reportedBy', 'name email');

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    if (problem.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Problem has already been reviewed'
      });
    }

    problem.status = 'rejected';
    problem.visibility = 'private';
    problem.adminFeedback = feedback;
    problem.reviewedBy = req.user._id;
    problem.reviewedAt = new Date();
    await problem.save();

    // Send notification to reporter
    try {
      const emailSubject = 'Problem Report Update - NSS Portal';
      const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Problem Report Status Update</h2>
            <p>Dear ${problem.reportedBy.name},</p>
            <p>Thank you for reporting the problem. After review, we are unable to proceed with this report at this time.</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Problem Details:</h3>
              <p><strong>Title:</strong> ${problem.title}</p>
              <p><strong>Category:</strong> ${problem.category}</p>
            </div>

            ${feedback ? `
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #991b1b;">Admin Feedback:</h3>
              <p>${feedback}</p>
            </div>
            ` : ''}

            <p>You can submit a new report with more details or contact the NSS coordinator for clarification.</p>
            
            <a href="${process.env.FRONTEND_URL}/problems/report" 
               style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
              Report Another Problem
            </a>
          </div>
        `;
      
      await sendEmail(problem.reportedBy.email, emailSubject, '', emailHtml);
    } catch (emailError) {
      console.error('Error sending rejection email:', emailError);
    }

    try {
      await redis.purgePattern('leaderboard:*');
      await redis.del('landing:stats');
    } catch (cacheErr) {
      console.warn('Redis purge failed after rejectProblem:', cacheErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Problem rejected',
      data: problem
    });
  } catch (error) {
    console.error('Error rejecting problem:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject problem',
      error: error.message
    });
  }
};

/**
 * @desc    Mark problem as resolved
 * @route   PUT /api/problems/:id/resolve
 * @access  Private (Admin/Faculty)
 */
exports.resolveProblem = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id)
      .populate('reportedBy', 'name email rewardPoints');

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    if (problem.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved problems can be marked as resolved'
      });
    }

    problem.status = 'resolved';
    problem.resolvedAt = new Date();
    await problem.save();

    // Award additional points for resolution
    const reporter = await User.findById(problem.reportedBy._id);
    reporter.rewardPoints += POINTS_CONFIG.PROBLEM_RESOLVED;
    await reporter.save();

    try {
      await redis.purgePattern('leaderboard:*');
      await redis.del('landing:stats');
    } catch (cacheErr) {
      console.warn('Redis purge failed after resolveProblem:', cacheErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Problem marked as resolved',
      data: problem,
      additionalPoints: POINTS_CONFIG.PROBLEM_RESOLVED
    });
  } catch (error) {
    console.error('Error resolving problem:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve problem',
      error: error.message
    });
  }
};

/**
 * @desc    Get leaderboard (top reporters) - ANONYMIZED
 * @route   GET /api/problems/leaderboard
 * @access  Private (Authenticated users only)
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const { limit = 10, period = 'all' } = req.query;

    const cacheKey = `leaderboard:period=${period}:limit=${limit}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.status(200).json(JSON.parse(cached));
      }
    } catch (cacheErr) {
      console.warn('Redis read failed for leaderboard:', cacheErr.message);
    }

    // Calculate date filter based on period
    let dateFilter = {};
    const now = new Date();
    
    if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: startOfMonth } };
    } else if (period === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: startOfYear } };
    }

    const matchStage = { reportedBy: { $exists: true } };
    if (Object.keys(dateFilter).length > 0) {
      matchStage.createdAt = dateFilter.createdAt;
    }

    const pipeline = [
      { $match: { ...matchStage, isDeleted: { $ne: true } } },
      { 
        $group: { 
          _id: '$reportedBy', 
          problemsInPeriod: { $sum: 1 },
          approvedProblems: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          }
        } 
      },
      { 
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        } 
      },
      { $unwind: '$user' },
      { $match: { 'user.role': 'student' } },
      { 
        $project: {
          _id: 1,
          problemsInPeriod: 1,
          approvedProblems: 1,
          reportingScore: '$user.reportingScore',
          badges: '$user.badges'
        } 
      },
      { $sort: { problemsInPeriod: -1, reportingScore: -1 } },
      { $limit: parseInt(limit) }
    ];

    const topReporters = await Problem.aggregate(pipeline);

    const anonymizedLeaderboard = topReporters.map((reporter, index) => ({
      rank: index + 1,
      anonymousId: `reporter-${index + 1}`,
      reportingScore: reporter.reportingScore,
      problemsReported: reporter.problemsInPeriod,
      problemsApproved: reporter.approvedProblems,
      badges: reporter.badges || [],
      period: period
    }));

    const response = {
      success: true,
      count: anonymizedLeaderboard.length,
      period: period,
      data: anonymizedLeaderboard
    };

    try {
      await redis.setEx(cacheKey, 300, JSON.stringify(response));
    } catch (cacheErr) {
      console.warn('Redis write failed for leaderboard:', cacheErr.message);
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard',
      error: error.message
    });
  }
};

/**
 * Helper: Check and award badges based on achievements
 */
async function checkAndAwardBadges(user) {
  const badges = user.badges || [];

  // Community Hero - 5 approved reports
  if (user.problemsApproved >= 5 && !badges.includes('Community Hero')) {
    user.badges.push('Community Hero');
  }

  // Problem Solver - 10 approved reports
  if (user.problemsApproved >= 10 && !badges.includes('Problem Solver')) {
    user.badges.push('Problem Solver');
  }

  // Change Maker - 20 approved reports
  if (user.problemsApproved >= 20 && !badges.includes('Change Maker')) {
    user.badges.push('Change Maker');
  }

  // Active Reporter - 3 reports in current month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const monthlyReports = await Problem.countDocuments({
    reportedBy: user._id,
    createdAt: { $gte: startOfMonth },
    isDeleted: { $ne: true }
  });

  if (monthlyReports >= 3 && !badges.includes('Active Reporter')) {
    user.badges.push('Active Reporter');
  }
}

/**
 * Helper: Notify all students about new event
 */
async function notifyAllStudentsAboutEvent(event, problem, req) {
  try {
    console.log(`\n📧 ===== Notifying students about event from problem: ${event.title} =====`);
    
    const students = await User.find({ role: 'student', isActive: true })
      .select('email name _id');

    console.log(`📋 Found ${students.length} active students to notify`);

    if (students.length === 0) {
      console.warn('⚠️ No students found to notify');
      return;
    }

    // Send email to all students using Brevo
    console.log('📧 Using Brevo to send event notifications...');
    const emailResults = await sendNewEventNotification(event, students);
    
    // Log email results
    const successCount = emailResults.filter(r => r.success).length;
    const failCount = emailResults.filter(r => !r.success).length;
    console.log(`📊 Email notification summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📧 Total attempted: ${students.length}`);

    // Send WebSocket notifications to all students
    const io = req.app.get('io');
    if (io) {
      console.log('🔔 Sending WebSocket notifications...');
      
      const notificationData = {
        type: 'new-event',
        message: `New event: ${event.title}`,
        event: {
          id: event._id.toString(),
          title: event.title,
          eventType: event.eventType,
          location: event.location,
          startDate: event.startDate
        },
        timestamp: new Date()
      };

      // Send to each student's room
      students.forEach(student => {
        const studentId = student._id.toString();
        const roomName = `user-${studentId}`;
        io.to(roomName).emit('new-event', notificationData);
      });

      // Also broadcast to all connected clients
      io.emit('new-event-broadcast', notificationData);
      
      console.log(`✅ WebSocket notifications sent to ${students.length} students`);

      // Store notifications in database for students who are offline
      console.log('💾 Storing notifications in database...');
      const notificationPromises = students.map(student => {
        return Notification.create({
          user: student._id,
          type: 'new-event',
          message: `New event: ${event.title}`,
          event: event._id, // Add event reference for auto-cleanup
          data: {
            eventId: event._id.toString(),
            eventTitle: event.title,
            eventType: event.eventType,
            location: event.location,
            startDate: event.startDate
          },
          read: false
        }).catch(err => {
          console.error(`Failed to store notification for ${student.name}:`, err.message);
        });
      });
      
      await Promise.allSettled(notificationPromises);
      console.log(`✅ Stored ${students.length} notifications in database`);
    } else {
      console.warn('⚠️ Socket.IO not available, web notifications will not be sent');
    }

    console.log('🎯 ===== Student notification complete =====\n');
  } catch (error) {
    console.error('Error notifying students:', error);
  }
}

/**
 * @desc    Get category heatmap (public, anonymized)
 * @route   GET /api/problems/heatmap/categories
 * @access  Public
 */
exports.getCategoryHeatmap = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    // Calculate date filter
    let dateFilter = {};
    const now = new Date();
    
    if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: startOfMonth } };
    } else if (period === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: startOfYear } };
    } else {
      // Last 30 days
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = { createdAt: { $gte: thirtyDaysAgo } };
    }

    const matchStage = { reportedBy: { $exists: true } };
    if (Object.keys(dateFilter).length > 0) {
      matchStage.createdAt = dateFilter.createdAt;
    }

    const pipeline = [
      { $match: { ...matchStage, isDeleted: { $ne: true } } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          approvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          resolvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          avgSeverity: {
            $avg: {
              $cond: [
                { $eq: ['$severity', 'critical'] },
                3,
                { $cond: [{ $eq: ['$severity', 'high'] }, 2, 1] }
              ]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ];

    const heatmapData = await Problem.aggregate(pipeline);

    // Calculate totals
    const totals = heatmapData.reduce(
      (acc, cat) => ({
        totalProblems: acc.totalProblems + cat.count,
        totalApproved: acc.totalApproved + cat.approvedCount,
        totalResolved: acc.totalResolved + cat.resolvedCount
      }),
      { totalProblems: 0, totalApproved: 0, totalResolved: 0 }
    );

    const anonymizedHeatmap = heatmapData.map(category => ({
      category: category._id,
      problemsReported: category.count,
      problemsApproved: category.approvedCount,
      problemsResolved: category.resolvedCount,
      resolutionRate: category.count > 0 ? ((category.resolvedCount / category.count) * 100).toFixed(1) : 0,
      approvalRate: category.count > 0 ? ((category.approvedCount / category.count) * 100).toFixed(1) : 0,
      averageSeverity: category.avgSeverity.toFixed(1),
      percentageOfTotal: ((category.count / totals.totalProblems) * 100).toFixed(1)
    }));

    res.status(200).json({
      success: true,
      period: period,
      totals,
      data: anonymizedHeatmap
    });
  } catch (error) {
    console.error('Error fetching category heatmap:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category heatmap',
      error: error.message
    });
  }
};

/**
 * @desc    Follow a user (with duplicate prevention)
 * @route   POST /api/problems/follow/:userId
 * @access  Private
 */
exports.followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user._id;

    // Prevent self-follow
    if (followerId.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself'
      });
    }

    // Verify target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already following (duplicate prevention via unique index)
    let follow = await UserFollow.findOne({
      follower: followerId,
      following: userId
    });

    if (follow) {
      return res.status(400).json({
        success: false,
        message: 'Already following this user'
      });
    }

    // Create follow relationship
    follow = await UserFollow.create({
      follower: followerId,
      following: userId
    });

    try {
      await redis.purgePattern('leaderboard:*');
    } catch (cacheErr) {
      console.warn('Redis purge failed after followUser:', cacheErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Successfully followed user',
      data: follow
    });
  } catch (error) {
    console.error('Error following user:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Already following this user'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to follow user',
      error: error.message
    });
  }
};

/**
 * @desc    Unfollow a user
 * @route   DELETE /api/problems/follow/:userId
 * @access  Private
 */
exports.unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user._id;

    const result = await UserFollow.findOneAndDelete({
      follower: followerId,
      following: userId
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Follow relationship not found'
      });
    }

    try {
      await redis.purgePattern('leaderboard:*');
    } catch (cacheErr) {
      console.warn('Redis purge failed after unfollowUser:', cacheErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Successfully unfollowed user'
    });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unfollow user',
      error: error.message
    });
  }
};

/**
 * @desc    Get followers count for a user
 * @route   GET /api/problems/followers/:userId
 * @access  Public
 */
exports.getFollowersCount = async (req, res) => {
  try {
    const { userId } = req.params;

    const followersCount = await UserFollow.countDocuments({
      following: userId
    });

    const followingCount = await UserFollow.countDocuments({
      follower: userId
    });

    res.status(200).json({
      success: true,
      data: {
        userId,
        followers: followersCount,
        following: followingCount
      }
    });
  } catch (error) {
    console.error('Error fetching followers count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch followers count',
      error: error.message
    });
  }
};

/**
 * @desc    Upvote a problem (with duplicate prevention)
 * @route   POST /api/problems/:id/upvote
 * @access  Private
 */
exports.upvoteProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify problem exists
    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    // Check if already upvoted (duplicate prevention via unique index)
    let upvote = await ProblemUpvote.findOne({
      problem: id,
      upvotedBy: userId
    });

    if (upvote) {
      return res.status(400).json({
        success: false,
        message: 'Already upvoted this problem'
      });
    }

    // Create upvote
    upvote = await ProblemUpvote.create({
      problem: id,
      upvotedBy: userId
    });

    // Increment upvote count on problem
    problem.upvotes = (problem.upvotes || 0) + 1;
    await problem.save();

    try {
      await redis.purgePattern('leaderboard:*');
    } catch (cacheErr) {
      console.warn('Redis purge failed after upvoteProblem:', cacheErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Successfully upvoted problem',
      data: {
        problemId: id,
        upvotes: problem.upvotes
      }
    });
  } catch (error) {
    console.error('Error upvoting problem:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Already upvoted this problem'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upvote problem',
      error: error.message
    });
  }
};

/**
 * @desc    Remove upvote from a problem
 * @route   DELETE /api/problems/:id/upvote
 * @access  Private
 */
exports.removeUpvote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Remove upvote
    const result = await ProblemUpvote.findOneAndDelete({
      problem: id,
      upvotedBy: userId
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Upvote not found'
      });
    }

    // Decrement upvote count on problem
    const problem = await Problem.findById(id);
    if (problem) {
      problem.upvotes = Math.max(0, (problem.upvotes || 1) - 1);
      await problem.save();
    }

    try {
      await redis.purgePattern('leaderboard:*');
    } catch (cacheErr) {
      console.warn('Redis purge failed after removeUpvote:', cacheErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Successfully removed upvote',
      data: {
        problemId: id,
        upvotes: problem?.upvotes || 0
      }
    });
  } catch (error) {
    console.error('Error removing upvote:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove upvote',
      error: error.message
    });
  }
};

/**
 * @desc    Get upvote count for a problem
 * @route   GET /api/problems/:id/upvotes
 * @access  Public
 */
exports.getUpvoteCount = async (req, res) => {
  try {
    const { id } = req.params;

    const upvoteCount = await ProblemUpvote.countDocuments({
      problem: id
    });

    res.status(200).json({
      success: true,
      data: {
        problemId: id,
        upvotes: upvoteCount
      }
    });
  } catch (error) {
    console.error('Error fetching upvote count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upvote count',
      error: error.message
    });
  }
};

module.exports = exports;

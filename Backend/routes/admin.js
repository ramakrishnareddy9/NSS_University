const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const InviteToken = require('../models/InviteToken');
const { auth, authorize } = require('../middleware/auth');
const { sendEmail } = require('../utils/notifications');
const { isInstitutionalEmail } = require('../utils/emailPolicy');

const router = express.Router();

// @route   POST /api/admin/invite
// @desc    Generate secure invite link for new admin/faculty account (SEC-01)
// @access  Private (Admin)
router.post('/invite', [
  auth,
  authorize('admin'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('role').isIn(['admin', 'faculty']).withMessage('Role must be admin or faculty'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, role, phone, department } = req.body;
    const normalizedEmail = email.toLowerCase();

    if (!isInstitutionalEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: `Please use an institutional email address (${(process.env.INSTITUTION_EMAIL_DOMAINS || '.edu,.ac.in,.edu.in').split(',').join(', ')})`
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // SEC-01: Generate secure invite token (expires in 24 hours)
    const inviteToken = InviteToken.generateToken();
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${frontendURL}/auth/accept-invite?token=${inviteToken}`;

    // Store invite token in database
    await InviteToken.create({
      email: normalizedEmail,
      token: inviteToken,
      role,
      userData: {
        name,
        phone,
        department
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    // Send secure invite link (no password)
    const emailResult = await sendEmail(
      normalizedEmail,
      'NSS Portal Account Invitation',
      `You have been invited to join the NSS Portal as ${role}. Accept the invitation and set your password here: ${inviteLink}`,
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">You're Invited to NSS Portal</h2>
        <p>You have been invited to join as <strong>${role}</strong>.</p>
        <p><a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Accept Invitation & Set Password</a></p>
        <p style="color: #666; font-size: 0.875rem;">This link expires in 24 hours.</p>
      </div>`
    );

    if (!emailResult.success) {
      // Clean up the token if email fails
      await InviteToken.deleteOne({ token: inviteToken });
      return res.status(500).json({
        success: false,
        message: 'Failed to send invite email. Please try again.'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Invite link sent successfully',
      data: {
        email: normalizedEmail,
        role,
        expiresIn: '24 hours'
      }
    });
  } catch (error) {
    console.error('Admin invite error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}); 

// @route   POST /api/admin/accept-invite
// @desc    Accept invite and set password (SEC-01)
// @access  Public
router.post('/accept-invite', [
  body('token').trim().notEmpty().withMessage('Invite token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { token, password } = req.body;

    // Find and validate invite token
    const inviteToken = await InviteToken.findOne({ token });
    if (!inviteToken) {
      return res.status(404).json({ success: false, message: 'Invalid or expired invite link' });
    }

    if (inviteToken.isUsed) {
      return res.status(400).json({ success: false, message: 'This invite has already been used' });
    }

    if (new Date() > inviteToken.expiresAt) {
      return res.status(400).json({ success: false, message: 'Invite link has expired' });
    }

    // Create user with provided password
    const user = await User.create({
      name: inviteToken.userData.name,
      email: inviteToken.email,
      password,
      role: inviteToken.role,
      phone: inviteToken.userData.phone,
      department: inviteToken.userData.department,
      isActive: true,
      emailVerified: true
    });

    // Mark token as used
    inviteToken.isUsed = true;
    inviteToken.usedAt = new Date();
    inviteToken.usedBy = user._id;
    await inviteToken.save();

    res.status(201).json({
      success: true,
      message: 'Account created successfully. You can now log in.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/admin/students/:studentId/update-year
// @desc    Manually update a student's year
// @access  Private (Admin only)
router.post('/students/:studentId/update-year', [
  auth,
  authorize('admin'),
  body('year').isIn(['1st', '2nd', '3rd', '4th', 'PG']).withMessage('Invalid year value')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { studentId } = req.params;
    const { year } = req.body;

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const oldYear = student.year;
    student.year = year;
    await student.save();

    res.json({
      success: true,
      message: `Student year updated: ${oldYear} → ${year}`,
      student: {
        id: student._id,
        name: student.name,
        studentId: student.studentId,
        email: student.email,
        year: student.year,
        batch: student.batch
      }
    });
  } catch (error) {
    console.error('Update student year error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/admin/students/batch/update-year
// @desc    Batch update student years by batch/cohort
// @access  Private (Admin only)
router.post('/students/batch/update-year', [
  auth,
  authorize('admin'),
  body('batch').trim().notEmpty().withMessage('Batch is required'),
  body('year').isIn(['1st', '2nd', '3rd', '4th', 'PG']).withMessage('Invalid year value')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { batch, year } = req.body;

    const result = await User.updateMany(
      { batch, role: 'student', isActive: true },
      { year }
    );

    res.json({
      success: true,
      message: `Batch update completed`,
      data: {
        batch,
        newYear: year,
        modifiedCount: result.modifiedCount,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Batch update student year error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/admin/trigger-student-year-check
// @desc    Manually trigger student year update scheduler (testing)
// @access  Private (Admin only)
router.post('/trigger-student-year-check', [auth, authorize('admin')], async (req, res) => {
  try {
    const { triggerStudentYearUpdate } = require('../utils/studentYearScheduler');
    await triggerStudentYearUpdate();
    
    res.json({
      success: true,
      message: 'Student year update check triggered successfully',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Trigger student year check error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/admin/events/:id/reconcile-participants
// @desc    Reconcile an event's participant counter with actual participations
// @access  Private (Admin only)
router.post('/events/:id/reconcile-participants', [auth, authorize('admin')], async (req, res) => {
  try {
    const { reconcileEventParticipants } = require('../utils/reconciliation');
    const eventId = req.params.id;
    const autoFix = req.body?.autoFix === true || process.env.AUTO_FIX_RECONCILIATION === 'true';

    const result = await reconcileEventParticipants(eventId, { autoFix, performedBy: req.user.id });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Reconcile event error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
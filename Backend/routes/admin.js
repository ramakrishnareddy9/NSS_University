const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { sendPasswordEmail, generateOTP, sendEmail } = require('../utils/notifications');
const { isInstitutionalEmail } = require('../utils/emailPolicy');

const router = express.Router();

// @route   POST /api/admin/invite
// @desc    Create an admin or faculty account
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

    const tempPassword = generateOTP() + generateOTP();

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: tempPassword,
      role,
      phone,
      department,
      isActive: true,
      emailVerified: true
    });

    await sendPasswordEmail(user, tempPassword);

    res.status(201).json({
      success: true,
      message: 'Invite sent successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          department: user.department
        }
      }
    });
  } catch (error) {
    console.error('Admin invite error:', error);
    res.status(500).json({ success: false, message: 'Server error while creating user account' });
  }
});

module.exports = router;
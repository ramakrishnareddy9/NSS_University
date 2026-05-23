const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PasswordResetOTP = require('../models/PasswordResetOTP');
const EmailVerificationOTP = require('../models/EmailVerificationOTP');
const { auth } = require('../middleware/auth');
const { sendPasswordResetOTP, sendEmail, generateOTP } = require('../utils/notifications');
const { isInstitutionalEmail } = require('../utils/emailPolicy');
const { resolveAcademicYearContext } = require('../utils/academicYear');

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET;
const refreshSecret = process.env.REFRESH_TOKEN_SECRET || jwtSecret;
const accessTokenExpiresIn = process.env.JWT_EXPIRE || '1h';
const refreshTokenExpiresIn = process.env.JWT_REFRESH_EXPIRE || '30d';

if (!jwtSecret || !jwtSecret.trim()) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Aborting startup.');
  throw new Error('JWT_SECRET environment variable is required');
}

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/api/v1/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000
});

const csrfCookieOptions = () => ({
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/api/v1/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000
});

const getCookie = (req, name) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map(part => part.trim());
  const match = cookies.find(part => part.startsWith(`${name}=`));
  if (!match) return null;

  return decodeURIComponent(match.slice(name.length + 1));
};

// Generate JWT token pair
const generateAccessToken = (id) => {
  return jwt.sign({ id }, jwtSecret, {
    expiresIn: accessTokenExpiresIn
  });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id, type: 'refresh' }, refreshSecret, {
    expiresIn: refreshTokenExpiresIn
  });
};

const attachAuthCookies = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, cookieOptions());
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie('refreshCsrfToken', csrfToken, csrfCookieOptions());
  return csrfToken;
};

const getCsrfToken = (req) => {
  return req.header('x-refresh-csrf-token') || req.header('x-csrf-token') || null;
};

const validateRefreshCsrf = (req) => {
  const csrfCookie = getCookie(req, 'refreshCsrfToken');
  const csrfHeader = getCsrfToken(req);
  return !!csrfCookie && !!csrfHeader && csrfCookie === csrfHeader;
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  // SECURITY: Reject any role field in registration — students only via public endpoint
  body('role').not().exists().withMessage('Role cannot be specified during public registration'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, studentId, phone, department, year, academicYear, batch } = req.body;
    // Defense in depth: Even after validation, block any elevated role attempt
    if (req.body.role && (req.body.role === 'admin' || req.body.role === 'faculty')) {
      console.warn(`[SECURITY] Blocked public registration attempt with elevated role: ${req.body.role} for email ${email} from IP ${req.ip}`);
      return res.status(403).json({ success: false, message: 'Cannot register with elevated role. Use invite flow for admin/faculty accounts.' });
    }
    const role = 'student';
    const normalizedEmail = email.toLowerCase();

    if (!isInstitutionalEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: `Please use an institutional email address (${(process.env.INSTITUTION_EMAIL_DOMAINS || '.edu,.ac.in,.edu.in').split(',').join(', ')})`
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Check if studentId already exists (for students)
    if (role === 'student' && studentId) {
      const existingStudent = await User.findOne({ studentId });
      if (existingStudent) {
        return res.status(400).json({ success: false, message: 'Student ID already exists' });
      }
    }

    let resolvedAcademicYear;
    let resolvedBatch;

    if (role === 'student') {
      // Derive academic year from active AcademicYearConfig (falls back to default context when no active config exists).
      const academicYearContext = await resolveAcademicYearContext(academicYear);
      resolvedAcademicYear = academicYearContext?.label;
      resolvedBatch = batch || resolvedAcademicYear;
    }

    // Create user
    const user = new User({
      name,
      email: normalizedEmail,
      password,
      role,
      studentId: role === 'student' ? studentId : undefined,
      phone,
      department,
      year: role === 'student' ? year : undefined,
      academicYear: role === 'student' ? resolvedAcademicYear : undefined,
      batch: role === 'student' ? resolvedBatch : undefined,
      isActive: false,
      emailVerified: false
    });

    await user.save();

    const otp = generateOTP();
    await EmailVerificationOTP.deleteMany({ email: normalizedEmail });
    await EmailVerificationOTP.create({
      email: normalizedEmail,
      otp: await bcrypt.hash(otp, 10),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });

    const verificationEmailResult = await sendEmail(
      normalizedEmail,
      'Verify your NSS Portal email address',
      `Your verification code is ${otp}`,
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Verify your email</h2>
        <p>Use this verification code to activate your NSS Portal account:</p>
        <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">${otp}</div>
        <p>This code expires in 15 minutes.</p>
      </div>`
    );

    if (!verificationEmailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Account created, but verification email could not be sent. Please try again later.'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email with the OTP sent to your inbox.',
      data: {
        email: user.email,
        requiresVerification: true,
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify signup email OTP and activate account
// @access  Public
router.post('/verify-email', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase();

    const otpRecord = await EmailVerificationOTP.findOne({
      email: normalizedEmail,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    }).select('+otp');

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const isOtpValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isOtpValid) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.emailVerified = true;
    user.isActive = true;
    await user.save();

    otpRecord.isUsed = true;
    await otpRecord.save();

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    attachAuthCookies(res, refreshToken);

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          studentId: user.studentId
        }
      }
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ success: false, message: 'Server error during email verification' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.emailVerified === false) {
      return res.status(401).json({ success: false, message: 'Email not verified' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    attachAuthCookies(res, refreshToken);

    res.json({
      success: true,
      data: {
        token: accessToken,
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          studentId: user.studentId,
          totalVolunteerHours: user.totalVolunteerHours
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// @route   POST /api/auth/refresh
// @desc    Exchange refresh token cookie for a new access token
// @access  Public
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = getCookie(req, 'refreshToken');
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token missing' });
    }

    if (!validateRefreshCsrf(req)) {
      return res.status(403).json({ success: false, message: 'Invalid refresh CSRF token' });
    }

    const decoded = jwt.verify(refreshToken, refreshSecret);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    const accessToken = generateAccessToken(user._id);
    const rotatedRefreshToken = generateRefreshToken(user._id);
    attachAuthCookies(res, rotatedRefreshToken);

    return res.json({
      success: true,
      data: {
        accessToken,
        token: accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          studentId: user.studentId,
          totalVolunteerHours: user.totalVolunteerHours
        }
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(401).json({ success: false, message: 'Refresh token is not valid' });
  }
});

// @route   POST /api/auth/logout
// @desc    Clear refresh token cookie
// @access  Public
router.post('/logout', async (req, res) => {
  if (!validateRefreshCsrf(req)) {
    return res.status(403).json({ success: false, message: 'Invalid logout CSRF token' });
  }

  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
  res.clearCookie('refreshCsrfToken', { path: '/api/v1/auth' });
  return res.json({ success: true, message: 'Logged out successfully' });
});

// @route   POST /api/auth/forgot-password
// @desc    Send OTP for password reset (SEC-02: generic response for all accounts)
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please provide a valid email'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;

    // SEC-02: Always return generic response to prevent user enumeration
    // But still process if user exists
    const user = await User.findOne({ email });

    if (user && user.isActive) {
      try {
        // Generate OTP
        const otp = generateOTP();

        // Delete any existing OTPs for this email
        await PasswordResetOTP.deleteMany({ email });

        // Store new OTP (hashed)
        const otpHash = await bcrypt.hash(otp, 10);
        await PasswordResetOTP.create({
          email,
          otp: otpHash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        });

        // Send OTP via email (best-effort)
        const emailResult = await sendPasswordResetOTP(user, otp);
        if (!emailResult.success) {
          console.warn(`Failed to send password reset OTP to ${email}`);
        }
      } catch (error) {
        console.error(`Error processing password reset for ${email}:`, error);
        // swallow errors to preserve generic response
      }
    } else {
      // Log the miss for security monitoring (no PII in production logs)
      console.warn(`Forgot password requested for unknown or inactive account`);
    }

    // SEC-02: Return a generic success response regardless of whether account exists
    return res.json({
      success: true,
      message: 'If an account exists for the provided email, an OTP has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and allow password reset
// @access  Public
router.post('/verify-otp', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, otp, newPassword } = req.body;

    // Find valid OTP
    const otpRecord = await PasswordResetOTP.findOne({
      email,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    }).select('+otp');

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const isOtpValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isOtpValid) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Use transaction to atomically update user password and mark OTP as used
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Find user within transaction
        const user = await User.findOne({ email }).session(session);
        if (!user) {
          const err = new Error('User not found');
          err.statusCode = 404;
          throw err;
        }

        // Update password
        user.password = newPassword;
        await user.save({ session });

        // Mark OTP as used
        otpRecord.isUsed = true;
        await otpRecord.save({ session });
      });
    } catch (txnError) {
      if (txnError.statusCode === 404) {
        return res.status(404).json({ success: false, message: txnError.message });
      }
      throw txnError;
    } finally {
      session.endSession();
    }

    console.log(`✅ Password reset successful for user: ${email}`);

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error during password reset' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    console.log(`👤 User ${user.name} - Total Volunteer Hours: ${user.totalVolunteerHours || 0}`);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;


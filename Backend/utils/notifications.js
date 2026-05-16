const path = require('path');
const brevo = require('@getbrevo/brevo');

// Ensure .env is loaded (in case this module is loaded before server.js)
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configure Brevo API client
let apiInstance = null;
let isBrevoConfigured = false;

// Initialize Brevo if API key is available
if (process.env.BREVO_API_KEY) {
  console.log('📧 Initializing Brevo email service...');
  try {
    apiInstance = new brevo.TransactionalEmailsApi();
    
    // Set API key
    const apiKey = apiInstance.authentications['apiKey'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    
    isBrevoConfigured = true;
    console.log('✅ Brevo email service is ready to send messages');
  } catch (error) {
    console.error('❌ Failed to initialize Brevo:', error.message);
  }
} else {
  console.log('⚠️ Brevo API key not found. Email notifications will be disabled.');
  console.log('To enable emails, set BREVO_API_KEY in backend/.env file');
  console.log('Get your API key from: https://app.brevo.com/settings/keys/api');
}

// Send email notification using Brevo
const sendEmail = async (to, subject, text, html) => {
  try {
    if (!isBrevoConfigured) {
      console.log('⚠️ Brevo not configured. Skipping email notification.');
      return { success: false, message: 'Brevo not configured' };
    }

    // Get sender email from environment or use default
    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || 'noreply@nssportal.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'NSS Portal';

    // Create SendSmtpEmail object
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = { name: senderName, email: senderEmail };
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.textContent = text;

    console.log(`📧 Attempting to send email to: ${to}`);
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Email sent successfully to ${to}. Message ID: ${data.messageId}`);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error(`❌ Email send error for ${to}:`, error.message);
    if (error.response) {
      console.error('   Response:', error.response.text);
    }
    return { success: false, error: error.message };
  }
};

// Send event registration confirmation
const sendRegistrationConfirmation = async (user, event) => {
  const subject = `Registration Confirmed: ${event.title}`;
  const text = `Dear ${user.name},\n\nYour registration for the event "${event.title}" has been received and is pending approval.\n\nEvent Details:\n- Type: ${event.eventType}\n- Location: ${event.location}\n- Date: ${new Date(event.startDate).toLocaleDateString()}\n\nYou will be notified once your registration is approved.`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0ea5e9;">Registration Received</h2>
      <p>Dear ${user.name},</p>
      <p>Your registration for the event <strong>${event.title}</strong> has been received and is pending approval.</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Event Details:</strong></p>
        <ul>
          <li>Type: ${event.eventType}</li>
          <li>Location: ${event.location}</li>
          <li>Date: ${new Date(event.startDate).toLocaleDateString()}</li>
        </ul>
      </div>
      <p>You will be notified once your registration is approved.</p>
    </div>
  `;

  return await sendEmail(user.email, subject, text, html);
};

// Send approval notification to approved participant
const sendApprovalNotification = async (user, event) => {
  console.log(`📧 Sending approval email to ${user.email} for event: ${event.title}`);
  
  if (!user.email) {
    console.warn(`⚠️ User ${user.name} has no email address, skipping approval email`);
    return { success: false, error: 'No email address' };
  }

  const subject = `Registration Approved: ${event.title}`;
  const text = `Dear ${user.name},\n\nYour registration for "${event.title}" has been approved!\n\nEvent Details:\n- Type: ${event.eventType}\n- Location: ${event.location}\n- Start Date: ${new Date(event.startDate).toLocaleDateString()}\n- End Date: ${new Date(event.endDate).toLocaleDateString()}\n\nPlease make sure to attend the event.`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">Registration Approved!</h2>
      <p>Dear ${user.name},</p>
      <p>Great news! Your registration for <strong>${event.title}</strong> has been approved!</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Event Details:</strong></p>
        <ul>
          <li>Type: ${event.eventType}</li>
          <li>Location: ${event.location}</li>
          <li>Start Date: ${new Date(event.startDate).toLocaleDateString()}</li>
          <li>End Date: ${new Date(event.endDate).toLocaleDateString()}</li>
        </ul>
      </div>
      <p>Please make sure to attend the event.</p>
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View My Profile</a></p>
    </div>
  `;

  const result = await sendEmail(user.email, subject, text, html);
  if (result.success) {
    console.log(`✅ Approval email sent successfully to ${user.email}`);
  }
  return result;
};

// Send event reminder
const sendEventReminder = async (user, event, daysBefore = 1) => {
  const subject = `Reminder: ${event.title} in ${daysBefore} day(s)`;
  const text = `Dear ${user.name},\n\nThis is a reminder that you are registered for "${event.title}" which will start in ${daysBefore} day(s).\n\nEvent Details:\n- Type: ${event.eventType}\n- Location: ${event.location}\n- Start Date: ${new Date(event.startDate).toLocaleDateString()}\n- End Date: ${new Date(event.endDate).toLocaleDateString()}\n\nPlease ensure you are prepared for the event.`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Event Reminder</h2>
      <p>Dear ${user.name},</p>
      <p>This is a reminder that you are registered for <strong>${event.title}</strong> which will start in ${daysBefore} day(s).</p>
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p><strong>Event Details:</strong></p>
        <ul>
          <li>Type: ${event.eventType}</li>
          <li>Location: ${event.location}</li>
          <li>Start Date: ${new Date(event.startDate).toLocaleDateString()}</li>
          <li>End Date: ${new Date(event.endDate).toLocaleDateString()}</li>
        </ul>
      </div>
      <p>Please ensure you are prepared for the event.</p>
    </div>
  `;

  return await sendEmail(user.email, subject, text, html);
};

// Send contribution verification notification
const sendContributionVerified = async (user, contribution) => {
  const subject = `Contribution Verified: ${contribution.event?.title || 'Event'}`;
  const text = `Dear ${user.name},\n\nYour contribution for "${contribution.event?.title || 'Event'}" has been verified and ${contribution.volunteerHours} volunteer hours have been added to your account.\n\nYour total volunteer hours: ${user.totalVolunteerHours}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">Contribution Verified</h2>
      <p>Dear ${user.name},</p>
      <p>Your contribution for <strong>${contribution.event?.title || 'Event'}</strong> has been verified and <strong>${contribution.volunteerHours}</strong> volunteer hours have been added to your account.</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Your total volunteer hours: ${user.totalVolunteerHours}</strong></p>
      </div>
    </div>
  `;

  return await sendEmail(user.email, subject, text, html);
};

// Send new event notification to all registered students
const sendNewEventNotification = async (event, students) => {
  console.log(`\n📧 ===== Starting email notification for event: ${event.title} =====`);
  console.log(`📋 Total registered students to notify: ${students.length}`);
  
  // Check Brevo configuration first
  if (!isBrevoConfigured) {
    console.error('❌ Brevo API not configured in .env file');
    console.error('   Email notifications will be skipped. Please configure BREVO_API_KEY in backend/.env');
    return students.map(s => ({ 
      student: s.email || 'no-email', 
      studentName: s.name,
      success: false, 
      error: 'Brevo not configured' 
    }));
  }

  // Filter students with valid email addresses
  const studentsWithEmail = students.filter(s => s.email && s.email.trim() !== '');
  console.log(`📬 Students with valid email addresses: ${studentsWithEmail.length}`);
  
  if (studentsWithEmail.length === 0) {
    console.warn('⚠️ No students found with valid email addresses');
    return [];
  }
  
  console.log('✅ Brevo email service verified, starting to send emails...');

  const subject = `New NSS Event: ${event.title}`;
  const text = `Dear Student,\n\nA new NSS event "${event.title}" has been created!\n\nEvent Details:\n- Type: ${event.eventType}\n- Location: ${event.location}\n- Start Date: ${new Date(event.startDate).toLocaleDateString()}\n- End Date: ${new Date(event.endDate).toLocaleDateString()}\n- Registration Deadline: ${new Date(event.registrationDeadline).toLocaleDateString()}\n\nLog in to the NSS Portal to register for this event.`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0ea5e9;">New NSS Event Created!</h2>
      <p>Dear Student,</p>
      <p>A new NSS event <strong>${event.title}</strong> has been created!</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Event Details:</strong></p>
        <ul>
          <li>Type: ${event.eventType}</li>
          <li>Location: ${event.location}</li>
          <li>Start Date: ${new Date(event.startDate).toLocaleDateString()}</li>
          <li>End Date: ${new Date(event.endDate).toLocaleDateString()}</li>
          <li>Registration Deadline: ${new Date(event.registrationDeadline).toLocaleDateString()}</li>
        </ul>
      </div>
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background-color: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Event</a></p>
    </div>
  `;

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const student of studentsWithEmail) {
    try {
      const result = await sendEmail(student.email, subject, text, html);
      results.push({ 
        student: student.email, 
        studentName: student.name,
        success: result.success, 
        error: result.error 
      });
      
      if (result.success) {
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`  ✓ Sent ${successCount}/${studentsWithEmail.length} emails...`);
        }
      } else {
        failCount++;
        console.error(`  ✗ Failed to send email to ${student.email} (${student.name}):`, result.error);
      }
      
      // Small delay to avoid rate limiting (especially for Gmail)
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      failCount++;
      console.error(`  ✗ Error sending email to ${student.email} (${student.name}):`, error.message);
      results.push({ 
        student: student.email, 
        studentName: student.name,
        success: false, 
        error: error.message 
      });
    }
  }

  console.log(`\n📊 Email notification summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📧 Total attempted: ${studentsWithEmail.length}\n`);
  return results;
};

// Generate OTP
const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Ensure exactly 6 digits (in case of any floating point issues)
  return otp.padStart(6, '0');
};

// Send OTP for password reset
const sendPasswordResetOTP = async (user, otp) => {
  console.log(`📧 Sending password reset OTP to ${user.email}`);
  
  if (!user.email) {
    console.warn(`⚠️ User ${user.name} has no email address, skipping OTP email`);
    return { success: false, error: 'No email address' };
  }

  const subject = `🔐 NSS Portal - Password Reset OTP`;
  const text = `Dear ${user.name},\n\nYou requested to reset your password for the NSS Portal.\n\nYour OTP code is: ${otp}\n\nThis OTP will expire in 10 minutes.\n\nIf you didn't request this, please contact the administrator immediately.\n\nBest regards,\nNSS Portal Team`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0ea5e9;">🔐 Password Reset Request</h2>
      <p>Dear ${user.name},</p>
      <p>You requested to reset your password for the NSS Portal.</p>
      
      <div style="background-color: #f3f4f6; padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center; border-left: 4px solid #0ea5e9;">
        <h3 style="color: #1f2937; margin-bottom: 15px;">Your OTP Code:</h3>
        <div style="background-color: #1f2937; color: white; padding: 15px 25px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 5px; display: inline-block;">
          ${otp}
        </div>
        <p style="margin-top: 15px; color: #6b7280; font-size: 14px;">This OTP will expire in 10 minutes</p>
      </div>
      
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e;"><strong>⚠️ Security Notice:</strong> Never share this OTP with anyone.</p>
      </div>
      
      <p>If you didn't request this, please contact the administrator immediately.</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px;">Best regards,<br>NSS Portal Team</p>
    </div>
  `;

  const result = await sendEmail(user.email, subject, text, html);
  if (result.success) {
    console.log(`✅ Password reset OTP sent successfully to ${user.email}`);
  }
  return result;
};

// Send password to user via email
const sendPasswordEmail = async (user, password) => {
  console.log(`📧 Sending password email to ${user.email}`);
  
  if (!user.email) {
    console.warn(`⚠️ User ${user.name} has no email address, skipping password email`);
    return { success: false, error: 'No email address' };
  }

  const subject = `Your NSS Portal Password`;
  const text = `Dear ${user.name},\n\nYou requested to receive your password for the NSS Portal.\n\nYour login credentials:\n- Email: ${user.email}\n- Password: ${password}\n\nPlease keep your password secure and do not share it with anyone.\n\nIf you didn't request this, please contact the administrator immediately.\n\nBest regards,\nNSS Portal Team`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0ea5e9;">Your NSS Portal Password</h2>
      <p>Dear ${user.name},</p>
      <p>You requested to receive your password for the NSS Portal.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
        <h3 style="color: #1f2937; margin-bottom: 15px;">Your Login Credentials:</h3>
        <p style="margin: 8px 0;"><strong>Email:</strong> ${user.email}</p>
        <p style="margin: 8px 0;"><strong>Password:</strong> <span style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 16px;">${password}</span></p>
      </div>
      
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e;"><strong>⚠️ Security Notice:</strong> Please keep your password secure and do not share it with anyone.</p>
      </div>
      
      <p>If you didn't request this, please contact the administrator immediately.</p>
      
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background-color: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Login to NSS Portal</a></p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px;">Best regards,<br>NSS Portal Team</p>
    </div>
  `;

  const result = await sendEmail(user.email, subject, text, html);
  if (result.success) {
    console.log(`✅ Password email sent successfully to ${user.email}`);
  }
  return result;
};

module.exports = {
  sendEmail,
  sendRegistrationConfirmation,
  sendApprovalNotification,
  sendEventReminder,
  sendContributionVerified,
  sendNewEventNotification,
  sendPasswordEmail,
  generateOTP,
  sendPasswordResetOTP
};


const { createCanvas, loadImage } = require('canvas');
const fs = require('fs').promises;
const path = require('path');
const brevo = require('@getbrevo/brevo');
const cloudinary = require('../config/cloudinary');
const Event = require('../models/Event');
const Participation = require('../models/Participation');
const Notification = require('../models/Notification');

// Configure Brevo API client for certificate emails
let apiInstance = null;
let isBrevoConfigured = false;

if (process.env.BREVO_API_KEY) {
  try {
    apiInstance = new brevo.TransactionalEmailsApi();
    const apiKey = apiInstance.authentications['apiKey'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    isBrevoConfigured = true;
  } catch (error) {
    console.error('❌ Failed to initialize Brevo for certificates:', error.message);
  }
}

/**
 * Generate a certificate for a single student
 * @param {Object} event - Event object
 * @param {Object} student - Student object
 * @param {String} templatePath - Path to image template
 * @returns {Promise<Buffer>} - Generated certificate image buffer
 */
async function generateCertificate(event, student, templatePath) {
  try {
    console.log('📄 Generating certificate with template:', templatePath);
    
    // Check if file exists
    try {
      await fs.access(templatePath);
    } catch (err) {
      throw new Error(`Template file not found at: ${templatePath}`);
    }
    
    // Load the template image
    console.log('📷 Loading image...');
    const image = await loadImage(templatePath);
    console.log(`✅ Image loaded: ${image.width}x${image.height}`);
    
    // Create canvas with same dimensions as template
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    // Draw the template image
    ctx.drawImage(image, 0, 0);
    
    // Format date
    const formatDate = (date) => {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(date).toLocaleDateString('en-US', options);
    };
    
    // Set text alignment to center
    ctx.textAlign = 'center';
    
    // Draw student name
    if (event.certificate.fields.name && event.certificate.fields.name.x !== undefined) {
      const nameFont = event.certificate.fields.name.fontFamily || 'Arial';
      ctx.font = `${event.certificate.fields.name.fontSize || 36}px ${nameFont}`;
      ctx.fillStyle = event.certificate.fields.name.color || '#000000';
      ctx.fillText(student.name || '', event.certificate.fields.name.x, event.certificate.fields.name.y);
    }
    
    // Draw event name
    if (event.certificate.fields.eventName && event.certificate.fields.eventName.x !== undefined) {
      const eventFont = event.certificate.fields.eventName.fontFamily || 'Arial';
      ctx.font = `${event.certificate.fields.eventName.fontSize || 28}px ${eventFont}`;
      ctx.fillStyle = event.certificate.fields.eventName.color || '#000000';
      ctx.fillText(event.title || '', event.certificate.fields.eventName.x, event.certificate.fields.eventName.y);
    }
    
    // Draw date (format: Start Date - End Date)
    if (event.certificate.fields.date && event.certificate.fields.date.x !== undefined) {
      const dateFont = event.certificate.fields.date.fontFamily || 'Arial';
      ctx.font = `${event.certificate.fields.date.fontSize || 24}px ${dateFont}`;
      ctx.fillStyle = event.certificate.fields.date.color || '#000000';
      const startDate = formatDate(event.startDate);
      const endDate = formatDate(event.endDate);
      const dateText = `${startDate} - ${endDate}`;
      ctx.fillText(dateText, event.certificate.fields.date.x, event.certificate.fields.date.y);
    }
    
    // Return PNG buffer
    return canvas.toBuffer('image/png');
  } catch (error) {
    console.error('Error generating certificate:', error);
    throw error;
  }
}

/**
 * Send certificate via email using Brevo
 * @param {Object} student - Student object
 * @param {Object} event - Event object
 * @param {Buffer} certificateBuffer - Certificate image buffer
 * @returns {Promise<Object>} - Email send result
 */
async function sendCertificateEmail(student, event, certificateBuffer) {
  try {
    if (!isBrevoConfigured) {
      console.log('⚠️ Brevo not configured. Skipping certificate email.');
      return { success: false, message: 'Brevo not configured' };
    }

    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || 'noreply@nssportal.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'NSS Portal';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Congratulations ${student.name}!</h2>
        <p>Thank you for your participation in <strong>${event.title}</strong>.</p>
        <p>Please find your certificate of participation attached to this email.</p>
        <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 8px;">
          <p style="margin: 5px 0;"><strong>Event:</strong> ${event.title}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(event.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p style="margin: 5px 0;"><strong>Location:</strong> ${event.location}</p>
        </div>
        <p>Keep up the great work in your NSS activities!</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Best regards,<br>
          NSS Team
        </p>
      </div>
    `;

    // Create SendSmtpEmail object with attachment
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = { name: senderName, email: senderEmail };
    sendSmtpEmail.to = [{ email: student.email, name: student.name }];
    sendSmtpEmail.subject = `Certificate for ${event.title}`;
    sendSmtpEmail.htmlContent = htmlContent;
    
    // Add certificate as attachment (base64 encoded)
    sendSmtpEmail.attachment = [{
      name: `Certificate_${student.name.replace(/\s+/g, '_')}_${event.title.replace(/\s+/g, '_')}.png`,
      content: certificateBuffer.toString('base64')
    }];

    console.log(`📧 Sending certificate to ${student.email}...`);
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Certificate sent to ${student.email}. Message ID: ${data.messageId}`);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error(`❌ Failed to send certificate to ${student.email}:`, error.message);
    if (error.response) {
      console.error('   Response:', error.response.text);
    }
    return { success: false, error: error.message };
  }
}

/**
 * Send in-app notification about certificate
 * @param {Object} student - Student object
 * @param {Object} event - Event object
 * @param {Object} io - Socket.IO instance
 * @returns {Promise<void>}
 */
async function sendCertificateNotification(student, event, io) {
  try {
    // Create database notification
    await Notification.create({
      user: student._id,
      type: 'certificate',
      message: `Your certificate for "${event.title}" is ready!`,
      data: {
        eventId: event._id.toString(),
        eventTitle: event.title,
        certificateAvailable: true
      },
      read: false
    });
    
    // Send real-time notification if socket.io is available
    if (io) {
      const notificationData = {
        type: 'certificate',
        message: `Your certificate for "${event.title}" is ready and has been sent to your email!`,
        event: {
          id: event._id.toString(),
          title: event.title
        },
        timestamp: new Date()
      };
      
      io.to(`user-${student._id.toString()}`).emit('certificate-ready', notificationData);
    }
    
    console.log(`✅ In-app notification sent to ${student.name}`);
  } catch (error) {
    console.error(`❌ Failed to send notification to ${student.name}:`, error.message);
  }
}

/**
 * Generate and send certificates to all participated students
 * @param {String} eventId - Event ID
 * @param {Object} io - Socket.IO instance (optional)
 * @returns {Promise<Object>} - Generation summary
 */
async function generateAndSendCertificates(eventId, io = null) {
  try {
    console.log(`\n📜 ===== GENERATING CERTIFICATES FOR EVENT: ${eventId} =====`);
    
    // Fetch event with full details
    const event = await Event.findById(eventId).populate('organizer', 'name email');
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Check if certificate template is configured
    if (!event.certificate || !event.certificate.templateUrl) {
      throw new Error('Certificate template not configured for this event');
    }
    
    // Check if certificates already sent
    if (event.certificatesSent) {
      console.log('⚠️ Certificates already sent for this event');
      return { success: false, message: 'Certificates already sent' };
    }
    
    // Fetch all attended/completed participations
    const participations = await Participation.find({
      event: eventId,
      status: { $in: ['attended', 'completed'] }
    }).populate('student', 'name email studentId');
    
    if (participations.length === 0) {
      console.log('⚠️ No participated students found');
      return { success: false, message: 'No students to send certificates to' };
    }
    
    console.log(`📋 Found ${participations.length} students to receive certificates`);
    
    // Get template image path
    let templatePath;
    if (event.certificate.templateUrl.startsWith('http')) {
      // If using Cloudinary or external URL, download temporarily
      const response = await fetch(event.certificate.templateUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      templatePath = path.join(__dirname, '..', 'uploads', 'temp', `temp-${Date.now()}.png`);
      await fs.mkdir(path.dirname(templatePath), { recursive: true });
      await fs.writeFile(templatePath, buffer);
    } else {
      // If using local file
      // Normalize stored URL to filesystem path (remove leading slash if present)
      const templateRel = event.certificate.templateUrl.startsWith('/')
        ? event.certificate.templateUrl.slice(1)
        : event.certificate.templateUrl;
      templatePath = path.join(__dirname, '..', templateRel);
    }
    
    const results = {
      total: participations.length,
      successful: 0,
      failed: 0,
      errors: []
    };
    
    // Generate and send certificates
    for (const participation of participations) {
      try {
        const student = participation.student;
        console.log(`\n📄 Generating certificate for: ${student.name} (${student.email})`);
        
        // Generate certificate
        const certificateBuffer = await generateCertificate(event, student, templatePath);
        
        // Upload certificate to Cloudinary
        console.log('☁️ Uploading certificate to Cloudinary...');
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'nss-portal/certificates',
              public_id: `cert_${student._id}_${event._id}_${Date.now()}`,
              resource_type: 'image',
              format: 'png'
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(certificateBuffer);
        });
        
        const certUrl = uploadResult.secure_url;
        const certPublicId = uploadResult.public_id;
        console.log(`✅ Certificate uploaded to Cloudinary: ${certUrl}`);
        
        // Send via email
        const emailResult = await sendCertificateEmail(student, event, certificateBuffer);
        
        // Send in-app notification
        await sendCertificateNotification(student, event, io);
        
        // Update participation with certificate URL (always save, even if email fails)
        await Participation.findOneAndUpdate(
          { student: student._id, event: event._id },
          { 
            certificate: {
              url: certUrl,
              publicId: certPublicId,
              generatedAt: new Date()
            }
          }
        );
        
        if (emailResult.success) {
          results.successful++;
          console.log(`✅ Certificate successfully sent to ${student.name}`);
        } else {
          results.failed++;
          results.errors.push({
            student: student.name,
            email: student.email,
            error: emailResult.error || 'Email failed but certificate saved'
          });
          console.warn(`⚠️ Certificate saved but email failed for ${student.name}`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        results.failed++;
        results.errors.push({
          student: participation.student.name,
          email: participation.student.email,
          error: error.message
        });
        console.error(`❌ Error processing certificate for ${participation.student.name}:`, error.message);
      }
    }
    
    // Mark certificates as sent
    event.certificatesSent = true;
    await event.save();
    
    console.log(`\n📊 Certificate Generation Summary:`);
    console.log(`   ✅ Successful: ${results.successful}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   📧 Total: ${results.total}`);
    console.log(`\n📜 ===== CERTIFICATE GENERATION COMPLETE =====\n`);
    
    return {
      success: true,
      ...results
    };
    
  } catch (error) {
    console.error('❌ Certificate generation error:', error);
    throw error;
  }
}

module.exports = {
  generateCertificate,
  sendCertificateEmail,
  sendCertificateNotification,
  generateAndSendCertificates
};

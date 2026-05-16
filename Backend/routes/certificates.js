const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cloudinary = require('../config/cloudinary');
const Event = require('../models/Event');
const Participation = require('../models/Participation');
const { auth, authorize } = require('../middleware/auth');
const { generateAndSendCertificates } = require('../utils/certificateGenerator');

const router = express.Router();

// @route   POST /api/certificates/force-save-test/:eventId
// @desc    TEST endpoint to force save a template URL (for debugging)
// @access  Private (Admin/Faculty only)
router.post('/force-save-test/:eventId', [
  auth,
  authorize('admin', 'faculty')
], async (req, res) => {
  try {
    console.log('\n🧪 FORCE SAVE TEST for Event ID:', req.params.eventId);
    const event = await Event.findById(req.params.eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Force create certificate object
    if (!event.certificate) {
      event.certificate = {};
    }
    
    // Set a test template URL
    event.certificate.templateUrl = '/uploads/certificates/TEST-MANUAL-SAVE.pdf';
    
    console.log('Before markModified:', event.certificate);
    event.markModified('certificate');
    
    await event.save();
    console.log('After save:', event.certificate);
    
    // Re-fetch from DB to verify
    const refetched = await Event.findById(req.params.eventId);
    console.log('Refetched from DB:', refetched.certificate);
    
    res.json({
      message: 'Force save test completed',
      beforeSave: event.certificate,
      afterRefetch: refetched.certificate
    });
  } catch (error) {
    console.error('Force save test error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/certificates/debug/:eventId
// @desc    Debug endpoint to check event configuration
// @access  Private (Admin/Faculty only)
router.get('/debug/:eventId', [
  auth,
  authorize('admin', 'faculty')
], async (req, res) => {
  try {
    console.log('\n🔍 Debug Request for Event ID:', req.params.eventId);
    const event = await Event.findById(req.params.eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const debug = {
      eventId: event._id,
      eventTitle: event.title,
      hasCertificate: !!event.certificate,
      hasTemplateUrl: !!event.certificate?.templateUrl,
      templateUrl: event.certificate?.templateUrl || null,
      hasFields: !!event.certificate?.fields,
      fields: event.certificate?.fields || null,
      autoSend: event.certificate?.autoSend,
      certificatesSent: event.certificatesSent
    };
    
    console.log('Debug Info:', JSON.stringify(debug, null, 2));
    res.json(debug);
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Configure multer for memory storage (for Cloudinary upload)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG and JPG/JPEG files are allowed'));
    }
  }
});

// @route   POST /api/certificates/upload-template/:eventId
// @desc    Upload certificate template for an event
// @access  Private (Admin/Faculty only)
router.post('/upload-template/:eventId', [
  auth,
  authorize('admin', 'faculty'),
  upload.single('template')
], async (req, res) => {
  try {
    console.log('\n📤 Upload Template Request');
    console.log('   Event ID:', req.params.eventId);
    console.log('   File:', req.file ? req.file.originalname : 'No file');
    
    const event = await Event.findById(req.params.eventId);
    
    if (!event) {
      console.log('❌ Event not found');
      return res.status(404).json({ message: 'Event not found' });
    }
    
    console.log('✅ Event found:', event.title);
    
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    console.log('✅ File received:', req.file.originalname);
    
    // Delete old template from Cloudinary if exists
    if (event.certificate && event.certificate.templatePublicId) {
      try {
        await cloudinary.uploader.destroy(event.certificate.templatePublicId);
        console.log('🗑️ Old template deleted from Cloudinary');
      } catch (error) {
        console.log('⚠️ Old template not found in Cloudinary or already deleted');
      }
    }
    
    // Upload template to Cloudinary
    console.log('☁️ Uploading template to Cloudinary...');
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'nss-portal/certificate-templates',
          public_id: `template_${req.params.eventId}_${Date.now()}`,
          resource_type: 'image',
          format: 'png'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });
    
    const templateUrl = uploadResult.secure_url;
    const templatePublicId = uploadResult.public_id;
    console.log('✅ Template uploaded to Cloudinary:', templateUrl);
    
    // Initialize certificate object if it doesn't exist
    if (!event.certificate || typeof event.certificate !== 'object') {
      event.certificate = {
        templateUrl: null,
        templatePublicId: null,
        fields: {
          name: { x: 0, y: 0, fontSize: 36, color: '#000000', fontFamily: 'Arial' },
          eventName: { x: 0, y: 0, fontSize: 28, color: '#000000', fontFamily: 'Arial' },
          date: { x: 0, y: 0, fontSize: 24, color: '#000000', fontFamily: 'Arial' }
        },
        autoSend: true
      };
    }
    
    // Update template URL and publicId
    event.certificate.templateUrl = templateUrl;
    event.certificate.templatePublicId = templatePublicId;
    
    // Mark the certificate field as modified (Mongoose needs this for nested objects)
    event.markModified('certificate');
    
    console.log('💾 Saving templateUrl:', templateUrl);
    console.log('   Certificate object before save:', JSON.stringify(event.certificate, null, 2));
    
    await event.save();
    
    console.log('✅ Template saved to database');
    
    // Verify by re-fetching
    const verifyEvent = await Event.findById(req.params.eventId);
    console.log('   Certificate object after save (verified):', JSON.stringify(verifyEvent.certificate, null, 2));
    
    res.json({
      message: 'Certificate template uploaded successfully to Cloudinary',
      templateUrl: templateUrl,
      templatePublicId: templatePublicId,
      event: event
    });
  } catch (error) {
    console.error('Upload template error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/certificates/configure/:eventId
// @desc    Configure certificate field coordinates
// @access  Private (Admin/Faculty only)
router.put('/configure/:eventId', [
  auth,
  authorize('admin', 'faculty')
], async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const { fields, autoSend } = req.body;
    
    // Initialize certificate object if it doesn't exist
    if (!event.certificate || typeof event.certificate !== 'object') {
      event.certificate = {
        templateUrl: null,
        templatePublicId: null,
        fields: {
          name: { x: 0, y: 0, fontSize: 36, color: '#000000', fontFamily: 'Arial' },
          eventName: { x: 0, y: 0, fontSize: 28, color: '#000000', fontFamily: 'Arial' },
          date: { x: 0, y: 0, fontSize: 24, color: '#000000', fontFamily: 'Arial' }
        },
        autoSend: true
      };
    }
    
    // Update field coordinates
    if (fields) {
      event.certificate.fields = {
        name: fields.name || event.certificate.fields?.name || { x: 0, y: 0, fontSize: 36, color: '#000000', fontFamily: 'Arial' },
        eventName: fields.eventName || event.certificate.fields?.eventName || { x: 0, y: 0, fontSize: 28, color: '#000000', fontFamily: 'Arial' },
        date: fields.date || event.certificate.fields?.date || { x: 0, y: 0, fontSize: 24, color: '#000000', fontFamily: 'Arial' }
      };
    }
    
    if (autoSend !== undefined) {
      event.certificate.autoSend = autoSend;
    }
    
    // Mark the certificate field as modified (Mongoose needs this for nested objects)
    event.markModified('certificate');
    
    console.log('💾 Saving certificate configuration:', JSON.stringify(event.certificate, null, 2));
    await event.save();
    console.log('✅ Configuration saved successfully');
    
    res.json({
      message: 'Certificate configuration updated successfully',
      certificate: event.certificate
    });
  } catch (error) {
    console.error('Configure certificate error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/certificates/config/:eventId
// @desc    Get certificate configuration for an event
// @access  Private (Admin/Faculty only)
router.get('/config/:eventId', [
  auth,
  authorize('admin', 'faculty')
], async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.json({
      certificate: event.certificate || null,
      eventTitle: event.title,
      endDate: event.endDate
    });
  } catch (error) {
    console.error('Get certificate config error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/certificates/generate/:eventId
// @desc    Generate and send certificates to all participated students
// @access  Private (Admin/Faculty only)
router.post('/generate/:eventId', [
  auth,
  authorize('admin', 'faculty')
], async (req, res) => {
  try {
    console.log('\n📧 Generate Certificates Request for Event ID:', req.params.eventId);
    console.log('   User:', req.user?.name, req.user?.role);
    
    const event = await Event.findById(req.params.eventId);
    
    if (!event) {
      console.log('❌ Event not found');
      return res.status(404).json({ message: 'Event not found' });
    }
    
    console.log('✅ Event found:', event.title);
    console.log('   Certificate config:', event.certificate ? 'Yes' : 'No');
    
    // Check if certificate template is configured
    if (!event.certificate || !event.certificate.templateUrl) {
      console.log('❌ Certificate template not configured');
      return res.status(400).json({ 
        message: 'Certificate template not configured. Please upload a template first.',
        requiresSetup: true
      });
    }
    
    // Check if event has ended - allow manual generation for testing
    // const now = new Date();
    // if (new Date(event.endDate) > now) {
    //   return res.status(400).json({ 
    //     message: 'Cannot generate certificates before event ends',
    //     endDate: event.endDate 
    //   });
    // }
    
    // Get Socket.IO instance
    const io = req.app.get('io');
    
    // Generate and send certificates
    const result = await generateAndSendCertificates(req.params.eventId, io);
    
    res.json({
      message: 'Certificates generated and sent successfully',
      ...result
    });
  } catch (error) {
    console.error('Generate certificates error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: error.message || 'Server error',
      error: error.message,
      stack: error.stack
    });
  }
});

// @route   POST /api/certificates/test-preview/:eventId
// @desc    Generate a test certificate preview
// @access  Private (Admin/Faculty only)
router.post('/test-preview/:eventId', [
  auth,
  authorize('admin', 'faculty')
], async (req, res) => {
  try {
    console.log('\n🧪 Test Preview Request for Event ID:', req.params.eventId);
    console.log('   User:', req.user?.name, req.user?.role);
    
    const event = await Event.findById(req.params.eventId);
    
    if (!event) {
      console.log('❌ Event not found');
      return res.status(404).json({ message: 'Event not found' });
    }
    
    console.log('✅ Event found:', event.title);
    console.log('   Certificate config:', event.certificate ? 'Yes' : 'No');
    if (event.certificate) {
      console.log('   Template URL:', event.certificate.templateUrl);
      console.log('   Fields configured:', event.certificate.fields ? 'Yes' : 'No');
    }
    
    if (!event.certificate || !event.certificate.templateUrl) {
      console.log('❌ Certificate template not configured');
      return res.status(400).json({ 
        message: 'Certificate template not configured. Please upload a template first.',
        requiresSetup: true 
      });
    }
    
    // Check if fields are configured (check for null/undefined, not falsy since 0 is valid)
    if (!event.certificate.fields || 
        (event.certificate.fields.name?.x == null && 
         event.certificate.fields.eventName?.x == null && 
         event.certificate.fields.date?.x == null)) {
      console.log('❌ Fields not configured');
      return res.status(400).json({ 
        message: 'Please configure field positions before generating preview',
        requiresFieldSetup: true 
      });
    }
    
    console.log('✅ Fields configured:', {
      name: event.certificate.fields.name,
      eventName: event.certificate.fields.eventName,
      date: event.certificate.fields.date
    });
    
    // Create test student data
    const testStudent = {
      name: req.body.testName || 'Sample Student Name',
      email: 'test@example.com',
      studentId: 'TEST123'
    };
    
    // Load template
    const { generateCertificate } = require('../utils/certificateGenerator');
    
    let templatePath;
    if (event.certificate.templateUrl.startsWith('http')) {
      // If using Cloudinary or external URL, download temporarily
      console.log('📥 Downloading template from Cloudinary...');
      const response = await fetch(event.certificate.templateUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      templatePath = path.join(__dirname, '..', 'uploads', 'temp', `temp-${Date.now()}.png`);
      await fs.mkdir(path.dirname(templatePath), { recursive: true });
      await fs.writeFile(templatePath, buffer);
      console.log('✅ Template downloaded to:', templatePath);
    } else {
      // If using local file
      const templateRel = event.certificate.templateUrl.startsWith('/')
        ? event.certificate.templateUrl.slice(1)
        : event.certificate.templateUrl;
      templatePath = path.join(__dirname, '..', templateRel);
      
      // Check if template file exists
      if (!await fs.stat(templatePath).catch(() => false)) {
        return res.status(400).json({ 
          message: 'Certificate template file not found. Please re-upload the template.',
          templateMissing: true 
        });
      }
    }
    
    // Generate test certificate
    const certificateBuffer = await generateCertificate(event, testStudent, templatePath);
    
    // Clean up temp file if it was downloaded
    if (event.certificate.templateUrl.startsWith('http')) {
      try {
        await fs.unlink(templatePath);
        console.log('🗑️ Temp file cleaned up');
      } catch (err) {
        console.log('⚠️ Could not delete temp file:', err.message);
      }
    }
    
    // Send as response
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': 'inline; filename="test-certificate.png"'
    });
    res.send(certificateBuffer);
    
  } catch (error) {
    console.error('Test preview error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message, stack: error.stack });
  }
});

// @route   GET /api/certificates/my-certificates
// @desc    Get all certificates for the logged-in student
// @access  Private (Student only)
router.get('/my-certificates', auth, async (req, res) => {
  try {
    console.log('\n📜 Fetching certificates for student:', req.user.id);
    
    const participations = await Participation.find({
      student: req.user.id,
      'certificate.url': { $exists: true, $ne: null }
    })
    .populate('event', 'title startDate endDate location')
    .sort({ 'certificate.generatedAt': -1 });
    
    // Filter out participations where event might be null/deleted
    const certificates = participations
      .filter(p => p.event)
      .map(p => ({
        id: p._id,
        event: {
          id: p.event._id,
          title: p.event.title,
          startDate: p.event.startDate,
          endDate: p.event.endDate,
          location: p.event.location
        },
        certificate: {
          url: p.certificate.url,
          generatedAt: p.certificate.generatedAt
        }
      }));
    
    console.log(`✅ Found ${certificates.length} certificates`);
    res.json(certificates);
  } catch (error) {
    console.error('❌ Error fetching certificates:', error);
    console.error('   Stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message, stack: error.stack });
  }
});

module.exports = router;

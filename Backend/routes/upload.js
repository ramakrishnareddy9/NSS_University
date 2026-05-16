const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Configure Cloudinary (optional)
let cloudinary = null;
let useCloudinary = false;

try {
  cloudinary = require('cloudinary').v2;
  
  if (process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    useCloudinary = true;
    console.log('Cloudinary configured successfully');
  } else {
    console.log('Cloudinary credentials not found. Using local file storage.');
  }
} catch (error) {
  console.log('Cloudinary not installed. Using local file storage.');
}

// Ensure uploads directory exists for local storage
const uploadsDir = path.join(__dirname, '../uploads');
if (!useCloudinary && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Accept images and documents
    if (file.mimetype.startsWith('image/') || 
        file.mimetype === 'application/pdf' ||
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and documents are allowed.'));
    }
  }
});

// @route   POST /api/upload
// @desc    Upload file to Cloudinary or local storage
// @access  Private
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (useCloudinary && cloudinary) {
      // Upload to Cloudinary
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'nss-portal',
              resource_type: 'auto'
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );

          uploadStream.end(req.file.buffer);
        });

        return res.json({
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          format: uploadResult.format,
          size: uploadResult.bytes
        });
      } catch (cloudinaryError) {
        console.error('Cloudinary upload error:', cloudinaryError);
        // Fall through to local storage
        console.log('Falling back to local storage...');
      }
    }

    // Fallback to local storage
    const fileExtension = path.extname(req.file.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);
    
    fs.writeFileSync(filePath, req.file.buffer);
    
    // Return URL that points to a static file route
    const fileUrl = `/uploads/${fileName}`;
    
    res.json({
      url: fileUrl,
      publicId: fileName, // Use filename as publicId for local storage
      format: fileExtension.replace('.', ''),
      size: req.file.size
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      message: 'File upload failed', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   DELETE /api/upload/:publicId
// @desc    Delete file from Cloudinary or local storage
// @access  Private
router.delete('/:publicId', auth, async (req, res) => {
  try {
    const { publicId } = req.params;

    if (useCloudinary && cloudinary) {
      const result = await cloudinary.uploader.destroy(publicId);
      if (result.result === 'ok') {
        return res.json({ message: 'File deleted successfully' });
      } else {
        return res.status(404).json({ message: 'File not found' });
      }
    } else {
      // Local storage deletion
      const filePath = path.join(uploadsDir, publicId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return res.json({ message: 'File deleted successfully' });
      } else {
        return res.status(404).json({ message: 'File not found' });
      }
    }
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'File deletion failed', error: error.message });
  }
});

module.exports = router;


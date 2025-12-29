// middleware/multer.js - UPDATED FOR BETTER IMAGE UPLOAD HANDLING
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ==================== PROFILE IMAGE CONFIGURATION ====================
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const profileDir = 'uploads/profiles/';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
      console.log('📁 Created profiles directory:', profileDir);
    }
    
    cb(null, profileDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    
    const filename = `profile_${uniqueSuffix}${ext}`;
    
    console.log('📸 Profile image upload:', {
      userId: req.user?.id,
      originalName: file.originalname,
      generatedName: filename,
      size: file.size
    });
    
    cb(null, filename);
  }
});

// ==================== GENERAL UPLOAD CONFIGURATION ====================
const generalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/general/';
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    
    const filename = `${baseName}_${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// ==================== FILE FILTERS ====================
const imageFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedImageTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedImageTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

const documentFilter = (req, file, cb) => {
  const allowedDocTypes = /pdf|doc|docx|txt|xls|xlsx/;
  const extname = allowedDocTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /pdf|msword|openxmlformats-officedocument|text|spreadsheetml/.test(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only document files are allowed (pdf, doc, docx, txt, xls, xlsx)'));
  }
};

const anyFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|xls|xlsx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: images, pdf, docs, spreadsheets'));
  }
};

// ==================== UPLOAD INSTANCES ====================
const uploadProfileImage = multer({
  storage: profileStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for profile images
    files: 1
  }
});

const uploadDocument = multer({
  storage: generalStorage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for documents
    files: 5
  }
});

const uploadAnyFile = multer({
  storage: generalStorage,
  fileFilter: anyFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 5
  }
});

// ==================== MIDDLEWARE FUNCTIONS ====================
const handleProfileImageUpload = (req, res, next) => {
  const upload = uploadProfileImage.single('profileImage');
  
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      console.error('❌ Multer error:', err);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum size is 5MB for profile images.'
        });
      }
      
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Only one profile image can be uploaded at a time.'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
      
    } else if (err) {
      console.error('❌ File filter error:', err);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    // Log successful upload
    if (req.file) {
      console.log('✅ File uploaded successfully:', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        destination: req.file.destination
      });
    }
    
    next();
  });
};

const handleDocumentUpload = (req, res, next) => {
  const upload = uploadDocument.array('documents', 5);
  
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      console.error('❌ Multer error:', err);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum size is 10MB per document.'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
      
    } else if (err) {
      console.error('❌ File filter error:', err);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    next();
  });
};

const handleBulkUpload = (req, res, next) => {
  const upload = uploadAnyFile.single('bulkFile');
  
  upload(req, res, function(err) {
    if (err) {
      console.error('❌ Bulk upload error:', err);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    next();
  });
};

// ==================== FILE VALIDATION MIDDLEWARE ====================
const validateUploadedFile = (req, res, next) => {
  if (!req.file && (!req.files || req.files.length === 0)) {
    return next(); // No files to validate
  }

  const files = req.file ? [req.file] : req.files;

  for (const file of files) {
    // Check file size based on type
    const isImage = file.mimetype.startsWith('image/');
    const maxSize = isImage ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    
    if (file.size > maxSize) {
      // Clean up uploaded file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      const sizeType = isImage ? '5MB' : '10MB';
      return res.status(400).json({
        success: false,
        message: `File '${file.originalname}' exceeds maximum size of ${sizeType}`
      });
    }

    // Additional security checks
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = isImage 
      ? ['.jpg', '.jpeg', '.png', '.gif', '.webp']
      : ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx'];
    
    if (!allowedExts.includes(ext)) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      return res.status(400).json({
        success: false,
        message: `File extension '${ext}' is not allowed for this upload type`
      });
    }
  }

  next();
};

// ==================== FILE CLEANUP MIDDLEWARE ====================
const cleanupUploadedFiles = (req, res, next) => {
  // Store original send function
  const originalSend = res.send;
  
  // Override send to clean up files on error
  res.send = function(data) {
    // If status code indicates error, clean up files
    if (res.statusCode >= 400) {
      cleanupFiles(req);
    }
    originalSend.call(this, data);
  };

  // Clean up on request error
  req.on('error', () => {
    cleanupFiles(req);
  });

  next();
};

const cleanupFiles = (req) => {
  const files = req.file ? [req.file] : (req.files || []);
  
  files.forEach(file => {
    if (file && file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        console.log('🧹 Cleaned up file:', file.path);
      } catch (err) {
        console.error('❌ Error cleaning up file:', err.message);
      }
    }
  });
};

// ==================== DIRECTORY CLEANUP UTILITY ====================
const cleanupOldFiles = (directory, maxAgeHours = 24) => {
  if (!fs.existsSync(directory)) return;
  
  const now = Date.now();
  const maxAge = maxAgeHours * 60 * 60 * 1000;
  
  fs.readdir(directory, (err, files) => {
    if (err) return;
    
    files.forEach(file => {
      const filePath = path.join(directory, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        
        const fileAge = now - stats.mtime.getTime();
        if (fileAge > maxAge) {
          fs.unlink(filePath, err => {
            if (!err) {
              console.log('🧹 Cleaned up old file:', filePath);
            }
          });
        }
      });
    });
  });
};

// Schedule regular cleanup (every 6 hours)
setInterval(() => {
  cleanupOldFiles('uploads/profiles', 24); // Keep profile images for 24 hours
  cleanupOldFiles('uploads/general', 6);   // Keep general uploads for 6 hours
  cleanupOldFiles('uploads/temp', 1);      // Keep temp files for 1 hour
}, 6 * 60 * 60 * 1000);

// Initial cleanup
cleanupOldFiles('uploads/profiles', 24);
cleanupOldFiles('uploads/general', 6);
cleanupOldFiles('uploads/temp', 1);

// ==================== EXPORTS ====================
module.exports = {
  // Upload handlers
  handleProfileImageUpload,
  handleDocumentUpload,
  handleBulkUpload,
  
  // Validation middleware
  validateUploadedFile,
  
  // Cleanup middleware
  cleanupUploadedFiles,
  
  // Utility functions
  cleanupOldFiles,
  
  // Upload instances (for direct use if needed)
  uploadProfileImage,
  uploadDocument,
  uploadAnyFile
};
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Signature = require('./models/Signature');
const { auth } = require('./middleware/auth');

// Import all routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const questionRoutes = require('./routes/questions');
const testRoutes = require('./routes/tests');
const analyticsRoutes = require('./routes/analytics');
const cheatLogRoutes = require('./routes/cheat-logs');
const classRoutes = require('./routes/classes');
const resultsRoutes = require('./routes/results');
const subjectsRoutes = require('./routes/subjects');
const sessionsRoutes = require('./routes/sessions');
const promotionRoutes = require('./routes/promotion');
const transcriptRoutes = require('./routes/transcripts');
const classSetupRoutes = require('./routes/class-setup');
const classSubjectsRoutes = require('./routes/class-subjects');

// TEACHER ROUTES
const teacherRoutes = require('./routes/teacherRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');

// TEACHER QUESTION ROUTES - CRITICAL: This must be mounted BEFORE other routes
const teacherQuestionsRoutes = require('./routes/teacherQuestionsRoutes');

// REPORT CARD ROUTE - FIXED: Changed from reportcards to reportcard
const reportCardsRoutes = require('./routes/reportcard'); // CORRECTED

const app = express();

// Set timezone to West Africa Time
process.env.TZ = 'Africa/Lagos';

// ================================
// UTILITY FUNCTIONS
// ================================

// Ensure uploads directory exists
const ensureUploadDir = () => {
  const uploadsDir = path.join(__dirname, 'Uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Created uploads directory');
  }
  return uploadsDir;
};

// ================================
// MULTER CONFIGURATION
// ================================

// Ensure upload directory exists
const uploadDir = ensureUploadDir();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 2
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png'];
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    const isValidExtension = allowedExtensions.includes(ext);
    const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
    
    if (isValidExtension && isValidMimeType) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, and PNG image files are allowed'), false);
    }
  },
});

// Configure multer for form data
const formDataUpload = multer({
  limits: {
    fieldSize: 1024 * 1024
  }
});

// ================================
// MIDDLEWARE SETUP
// ================================

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// CORS configuration - EXPANDED FOR DEVELOPMENT
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3002'
  ],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'Accept', 'Origin'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  exposedHeaders: ['Authorization', 'x-auth-token']
}));

// Handle pre-flight requests
app.options('*', cors());

// Body parsing middleware - INCREASED LIMITS
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging with more details
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} | IP: ${req.ip || req.connection.remoteAddress} | Auth: ${req.headers.authorization ? 'Yes' : 'No'}`);
  next();
});

// ================================
// EMERGENCY DEBUG ROUTES
// ================================

// Test if server is running at all
app.get('/', (req, res) => {
  res.json({
    message: 'WAEC Server is running on LOCALHOST!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    server: 'Local Development Server',
    status: 'OK',
    teacherEndpoints: {
      questions: '/api/teacher/questions',
      bulkQuestions: '/api/teacher/questions/bulk',
      test: '/api/teacher/questions-test'
    },
    reportEndpoints: {
      reports: '/api/reports/export/report/:studentId/:session',
      results: '/api/results/export/report/:studentId/:session/:term'
    },
    promotionEndpoints: {
      status: '/api/promotions/status',
      eligibility: '/api/promotions/session-eligibility/:classId',
      bulkPromote: '/api/promotions/bulk-promote'
    }
  });
});

// Test database connection specifically
app.get('/api/debug-db', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    // Try to query users collection to verify data exists
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    
    res.json({
      database: {
        state: states[dbState],
        mongooseState: dbState,
        connection: mongoose.connection.host,
        databaseName: mongoose.connection.name
      },
      data: {
        userCount: userCount,
        hasData: userCount > 0,
        message: userCount > 0 ? 'Data found!' : 'No data found in database'
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        usingMongoDBAtlas: mongoose.connection.host ? mongoose.connection.host.includes('mongodb.net') : false
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      connection: mongoose.connection.host,
      state: mongoose.connection.readyState
    });
  }
});

// Test if API routes are working
app.get('/api/debug-routes', (req, res) => {
  const routes = [];
  
  function printRoutes(stack, prefix = '') {
    stack.forEach((middleware) => {
      if (middleware.route) {
        // Direct route
        const path = prefix + middleware.route.path;
        routes.push({
          path: path,
          methods: Object.keys(middleware.route.methods).map(m => m.toUpperCase()),
          type: 'direct'
        });
      } else if (middleware.name === 'router' && middleware.handle.stack) {
        // Router middleware
        printRoutes(middleware.handle.stack, prefix);
      }
    });
  }
  
  if (app._router && app._router.stack) {
    printRoutes(app._router.stack);
  }
  
  res.json({
    message: 'Route debugging',
    totalRoutes: routes.length,
    routes: routes.filter(r => r.path.includes('/api/')),
    teacherRoutes: routes.filter(r => r.path.includes('/api/teacher')),
    promotionRoutes: routes.filter(r => r.path.includes('/api/promotion')),
    reportRoutes: routes.filter(r => r.path.includes('/api/reports')),
    timestamp: new Date().toISOString()
  });
});

// Debug subjects route specifically
app.get('/api/debug-subjects-route', (req, res) => {
  let subjectsRouteFound = false;
  let routesList = [];

  function checkRoutes(layer, basePath = '') {
    if (layer.route) {
      const fullPath = basePath + layer.route.path;
      routesList.push({
        path: fullPath,
        methods: Object.keys(layer.route.methods)
      });
      if (fullPath === '/api/subjects' || fullPath.includes('subjects')) {
        subjectsRouteFound = true;
      }
    } else if (layer.name === 'router' && layer.handle.stack) {
      // This is a router middleware, check its base path
      let routerPath = basePath;
      if (layer.regexp) {
        const match = layer.regexp.toString().match(/\/\\\/([^\\]+)/);
        if (match) {
          routerPath = '/api/' + match[1];
        }
      }
      
      layer.handle.stack.forEach(sublayer => {
        checkRoutes(sublayer, routerPath);
      });
    }
  }

  app._router.stack.forEach(layer => {
    checkRoutes(layer);
  });

  res.json({
    subjectsRouteMounted: subjectsRouteFound,
    allMountedRoutes: routesList.filter(route => route.path.includes('/api/')),
    message: subjectsRouteFound 
      ? '✅ Subjects route is properly mounted' 
      : '❌ Subjects route NOT found in mounted routes'
  });
});

// Debug user info endpoint
app.get('/api/debug/user-info', auth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      teacherAssignments: req.user.teacherAssignments || [],
      subjects: req.user.subjects || [], // For backward compatibility
      permissions: req.user.permissions || [],
      adminPermissions: req.user.adminPermissions || 'N/A'
    },
    endpoints: {
      teacher: {
        assignments: `/api/users/teachers/${req.user.id}/assignments`,
        classes: `/api/users/teachers/${req.user.id}/classes`,
        dashboard: `/api/users/teachers/${req.user.id}/dashboard`,
        schedule: '/api/teacher/schedule',
        questions: '/api/teacher/questions',
        bulkQuestions: '/api/teacher/questions/bulk'
      },
      reports: {
        export: `/api/reports/export/report/:studentId/:session`,
        results: `/api/results/export/report/:studentId/:session/:term`
      },
      promotion: {
        status: '/api/promotions/status',
        eligibility: '/api/promotions/session-eligibility/:classId',
        bulkPromote: '/api/promotions/bulk-promote'
      }
    }
  });
});

// ================================
// TEMPORARY TEACHER TEST ROUTES
// ================================

// Add a simple teacher classes endpoint directly in server.js to test
app.get('/api/users/teachers/classes', auth, async (req, res) => {
  try {
    console.log('📚 GET /api/users/teachers/classes - Direct endpoint');
    
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Only teachers can access this endpoint'
      });
    }
    
    // Try to get teacher data
    const teacher = await mongoose.model('User').findById(req.user.id)
      .select('teacherAssignments name surname username')
      .populate('teacherAssignments.class', 'name level shortName');
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: 'Teacher not found'
      });
    }
    
    const teacherAssignments = teacher.teacherAssignments || [];
    
    if (teacherAssignments.length === 0) {
      return res.json({
        success: true,
        teacher: {
          id: teacher._id,
          name: teacher.name,
          surname: teacher.surname,
          username: teacher.username
        },
        classes: [],
        message: 'No classes assigned to this teacher'
      });
    }
    
    // Simple response
    const classes = teacherAssignments.map((assignment, index) => ({
      id: assignment.class?._id || `class-${index}`,
      name: assignment.className || assignment.class?.name || `Class ${index + 1}`,
      level: assignment.class?.level || 'Unknown',
      subjectCount: assignment.subjects?.length || 0,
      subjects: assignment.subjects?.map(sub => ({
        name: sub.subjectName || 'Unknown Subject'
      })) || []
    }));
    
    res.json({
      success: true,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        surname: teacher.surname,
        username: teacher.username
      },
      classes: classes,
      summary: {
        totalClasses: classes.length,
        totalSubjects: classes.reduce((sum, cls) => sum + cls.subjectCount, 0)
      }
    });
    
  } catch (error) {
    console.error('❌ Direct teacher classes error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
});

// Simple test endpoint for teacher routes
app.get('/api/users/teachers/test', auth, (req, res) => {
  console.log('✅ Teacher test endpoint hit');
  res.json({
    success: true,
    message: 'Teacher routes are working!',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// ✅ CRITICAL FIX: Direct test endpoint for teacher questions
app.post('/api/teacher/questions/simple-test', auth, async (req, res) => {
  try {
    console.log('🧪 /api/teacher/questions/simple-test - Simple test endpoint hit');
    console.log('👤 User:', {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    });
    console.log('📦 Request body:', req.body);
    
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Only teachers can create questions',
        userRole: req.user.role
      });
    }
    
    // Just return success for testing
    res.json({
      success: true,
      message: 'Test endpoint works! Teacher question creation is available.',
      user: {
        id: req.user.id,
        role: req.user.role,
        username: req.user.username,
        subjects: req.user.subjects || []
      },
      requestData: {
        body: req.body,
        headers: req.headers
      },
      endpoints: {
        createSingle: '/api/teacher/questions',
        createBulk: '/api/teacher/questions/bulk',
        getQuestions: '/api/teacher/questions',
        test: '/api/teacher/questions-test'
      }
    });
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ================================
// PROMOTION DEBUG ROUTE - ADD THIS
// ================================

app.get('/api/promotions/test', (req, res) => {
  res.json({
    success: true,
    message: 'Promotion routes are working!',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/promotions/status',
      'GET /api/promotions/session-eligibility/:classId',
      'POST /api/promotions/bulk-promote'
    ]
  });
});

// ================================
// ✅ CRITICAL FIX: ROUTES MOUNTING ORDER
// ================================

console.log('🚀 Mounting application routes...');

// Debug: Check if all routes exist
try {
  console.log('📋 Checking routes availability:');
  console.log('   ✅ authRoutes:', !!authRoutes);
  console.log('   ✅ usersRoutes:', !!usersRoutes);
  console.log('   ✅ classRoutes:', !!classRoutes);
  console.log('   ✅ subjectsRoutes:', !!subjectsRoutes);
  console.log('   ✅ classSetupRoutes:', !!classSetupRoutes);
  console.log('   ✅ teacherRoutes:', !!teacherRoutes);
  console.log('   ✅ scheduleRoutes:', !!scheduleRoutes);
  console.log('   ✅ resultsRoutes:', !!resultsRoutes);
  console.log('   ✅ analyticsRoutes:', !!analyticsRoutes);
  console.log('   ✅ testRoutes:', !!testRoutes);
  console.log('   ✅ teacherQuestionsRoutes:', !!teacherQuestionsRoutes);
  console.log('   ✅ promotionRoutes:', !!promotionRoutes);
  console.log('   ✅ reportCardsRoutes:', !!reportCardsRoutes);
} catch (error) {
  console.log('❌ Error checking routes:', error.message);
}

// ✅ CRITICAL: MOUNT TEACHER QUESTION ROUTES FIRST
// This is the MOST IMPORTANT FIX - teacherQuestionsRoutes must be mounted BEFORE other routes
// to avoid route conflicts with /api/users/teachers/*
console.log('🔧 Mounting teacher question routes FIRST...');
app.use('/api', teacherQuestionsRoutes);
console.log('✅ Teacher question routes mounted at /api/teacher/*');

// Now mount all other routes
console.log('🔧 Mounting other routes...');
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes); // This handles /api/users/* (except teachers)
app.use('/api/users', teacherRoutes); // This handles /api/users/teachers/* routes
app.use('/api', scheduleRoutes);
app.use('/api/questions', formDataUpload.any(), questionRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/cheat-logs', cheatLogRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/promotions', promotionRoutes); // ✅ FIXED: Changed from /api/promotion to /api/promotions
app.use('/api/transcript', transcriptRoutes);
app.use('/api/class-setup', classSetupRoutes);
app.use('/api/class-subjects', classSubjectsRoutes);
app.use('/api/reports', reportCardsRoutes);

console.log('✅ All routes mounted successfully');
console.log('🎯 IMPORTANT: Promotion routes are now accessible at:');
console.log('   📍 /api/promotions/status');
console.log('   📍 /api/promotions/session-eligibility/:classId');
console.log('   📍 /api/promotions/bulk-promote');
console.log('🎯 IMPORTANT: Teacher routes are now accessible at:');
console.log('   📍 /api/teacher/questions-test');
console.log('   📍 /api/teacher/questions');
console.log('   📍 /api/teacher/questions/bulk');
console.log('🎯 IMPORTANT: Report routes are now accessible at:');
console.log('   📍 /api/reports/export/report/:studentId/:session');

// ================================
// TEMPORARY SUBJECTS ROUTE FOR TESTING
// ================================

// Add this temporary route to test if subjects is working
app.get('/api/subjects-test', auth, (req, res) => {
  console.log('🎯 TEMPORARY SUBJECTS TEST ROUTE HIT');
  res.json([
    { id: '1', name: 'Mathematics', code: 'MATH', category: 'Core' },
    { id: '2', name: 'English Language', code: 'ENG', category: 'Core' },
    { id: '3', name: 'Basic Science', code: 'SCI', category: 'Core' }
  ]);
});

// ================================
// DEBUG TEACHER ROUTES
// ================================

// Debug all teacher routes
app.get('/api/debug-teacher-routes', (req, res) => {
  const routes = [];
  
  function processLayer(layer, path = '') {
    if (layer.route) {
      const routePath = path + (layer.route.path === '/' ? '' : layer.route.path);
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
      
      routes.push({
        path: routePath,
        methods: methods,
        type: 'direct'
      });
    } else if (layer.name === 'router' && layer.handle.stack) {
      // This is a router middleware
      layer.handle.stack.forEach(sublayer => {
        processLayer(sublayer, path);
      });
    }
  }
  
  if (app._router && app._router.stack) {
    app._router.stack.forEach(layer => {
      processLayer(layer, '/');
    });
  }
  
  // Filter for teacher and question routes
  const teacherRoutes = routes.filter(r => 
    r.path.includes('teacher') || r.path.includes('question')
  );
  
  res.json({
    success: true,
    totalRoutes: routes.length,
    teacherRoutesCount: teacherRoutes.length,
    teacherRoutes: teacherRoutes.sort((a, b) => a.path.localeCompare(b.path)),
    message: teacherRoutes.length > 0 
      ? 'Teacher routes found!' 
      : 'No teacher routes found! Check route mounting.'
  });
});

// ================================
// TEST ROUTES
// ================================

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Local Server is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    server: 'Local Development Server',
    database: 'MongoDB Connection',
    teacherEndpoints: {
      test: '/api/teacher/questions-test',
      simpleTest: '/api/teacher/questions/simple-test (POST)',
      questions: '/api/teacher/questions',
      bulkQuestions: '/api/teacher/questions/bulk'
    },
    reportEndpoints: {
      reports: '/api/reports/export/report/:studentId/:session?term=First Term',
      results: '/api/results/export/report/:studentId/:session/:term'
    },
    promotionEndpoints: {
      status: '/api/promotions/status',
      eligibility: '/api/promotions/session-eligibility/:classId',
      bulkPromote: '/api/promotions/bulk-promote'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    const healthData = {
      status: 'OK',
      message: 'Local Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      server: 'Local Development',
      port: process.env.PORT || 5000,
      frontendUrl: 'http://localhost:3000',
      teacherRoutes: {
        working: true,
        endpoints: [
          '/api/teacher/questions-test',
          '/api/teacher/questions',
          '/api/teacher/questions/bulk',
          '/api/teacher/questions/simple-test'
        ]
      },
      reportRoutes: {
        working: true,
        endpoints: [
          '/api/reports/export/report/:studentId/:session',
          '/api/results/export/report/:studentId/:session/:term'
        ]
      },
      promotionRoutes: {
        working: true,
        endpoints: [
          '/api/promotions/status',
          '/api/promotions/session-eligibility/:classId',
          '/api/promotions/bulk-promote'
        ]
      }
    };

    res.status(200).json(healthData);
    
  } catch (error) {
    console.error('Health check error:', error.message);
    res.status(503).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Debug route to check uploads
app.get('/api/debug-uploads', (req, res) => {
  res.json({
    uploadDirExists: fs.existsSync(uploadDir),
    files: fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : [],
    uploadDir: uploadDir
  });
});

// ================================
// SIGNATURE UPLOAD ENDPOINT
// ================================

app.post('/api/signatures/upload', 
  auth, 
  (req, res, next) => {
    upload.fields([
      { name: 'classTeacherSignature', maxCount: 1 },
      { name: 'principalSignature', maxCount: 1 },
    ])(req, res, (err) => {
      if (err) {
        console.error('File upload error:', err.message);
        return res.status(400).json({ 
          error: `Upload failed: ${err.message}` 
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { className } = req.body;
      
      if (!className && !req.files?.principalSignature) {
        return res.status(400).json({ 
          error: 'Please select a class or upload a principal signature.' 
        });
      }
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Administrative privileges required' 
        });
      }

      const operations = [];

      if (req.files?.principalSignature) {
        const file = req.files.principalSignature[0];
        const signatureData = {
          class: null,
          principalSignature: file.filename,
          updatedBy: req.user.userId,
          updatedAt: new Date(),
        };
        
        operations.push(
          Signature.findOneAndUpdate(
            { class: null },
            signatureData,
            { upsert: true, new: true }
          )
        );
      }

      if (className && req.files?.classTeacherSignature) {
        const file = req.files.classTeacherSignature[0];
        const signatureData = {
          class: className,
          classTeacherSignature: file.filename,
          updatedBy: req.user.userId,
          updatedAt: new Date(),
        };
        
        operations.push(
          Signature.findOneAndUpdate(
            { class: className },
            signatureData,
            { upsert: true, new: true }
          )
        );
      }

      await Promise.all(operations);

      res.status(201).json({ 
        message: 'Signatures uploaded successfully',
        uploadCount: operations.length
      });
      
    } catch (error) {
      console.error('Signature database error:', error.message);
      res.status(500).json({ 
        error: 'Failed to save signatures. Please try again.' 
      });
    }
  }
);

// ================================
// STATIC FILE SERVING
// ================================

// Serve uploads directory with proper MIME types
app.use('/uploads', express.static(uploadDir, {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
  }
}));

console.log(`✅ Serving uploads from: ${uploadDir}`);

// ================================
// API 404 HANDLER
// ================================

app.use('/api/*', (req, res) => {
  console.log(`❌ API endpoint not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'API endpoint not found', 
    path: req.path, 
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: {
      teacher: [
        '/api/teacher/questions-test',
        '/api/teacher/questions',
        '/api/teacher/questions/bulk',
        '/api/teacher/questions/simple-test (POST)'
      ],
      reports: [
        '/api/reports/export/report/:studentId/:session',
        '/api/results/export/report/:studentId/:session/:term'
      ],
      promotion: [
        '/api/promotions/status',
        '/api/promotions/session-eligibility/:classId',
        '/api/promotions/bulk-promote'
      ],
      auth: '/api/auth/*',
      users: '/api/users/*',
      debug: '/api/debug-*'
    }
  });
});

// ================================
// ERROR HANDLING
// ================================

app.use((err, req, res, next) => {
  const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  
  console.error(`🚨 Global Error [${errorId}]:`, {
    message: err.message,
    url: req.url,
    method: req.method,
    body: req.body,
    headers: req.headers,
    timestamp: new Date().toISOString(),
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.message,
      errorId
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid data format',
      details: `Invalid value for ${err.path}: ${err.value}`,
      errorId
    });
  }
  
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate entry detected',
      errorId
    });
  }

  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred. Please try again later.' 
      : err.message,
    errorId: errorId,
    endpoint: req.url,
    method: req.method
  });
});

// ================================
// DATABASE CONNECTION
// ================================

const connectDB = async (retryCount = 0) => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }
    
    console.log('🔌 Connecting to MongoDB...');
    console.log(`📡 Connection string: ${mongoUri.replace(/mongodb\+srv:\/\/([^:]+):([^@]+)@/, 'mongodb+srv://username:password@')}`);
    
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    
    console.log('✅ MongoDB connected successfully');
    console.log(`🏠 Database: ${mongoose.connection.name}`);
    console.log(`📍 Host: ${mongoose.connection.host}`);
    console.log(`📊 Ready State: ${mongoose.connection.readyState} (1 = connected)`);
    
    // Test the connection with a simple query
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    console.log(`👥 Users in database: ${userCount}`);
    
    mongoose.connection.on('error', (err) => {
      console.error('🔥 MongoDB connection error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });
    
  } catch (error) {
    console.error(`❌ MongoDB connection failed (attempt ${retryCount + 1}):`, error.message);
    
    if (retryCount < 3) {
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`🔄 Retrying connection in ${delay}ms...`);
      setTimeout(() => connectDB(retryCount + 1), delay);
    } else {
      console.error('💀 Max retry attempts reached. Exiting...');
      console.error('💡 TROUBLESHOOTING TIPS:');
      console.error('   1. Check your MONGODB_URI in .env file');
      console.error('   2. Make sure MongoDB Atlas has your IP whitelisted');
      console.error('   3. Verify your MongoDB username/password');
      console.error('   4. Check if MongoDB service is running');
      process.exit(1);
    }
  }
};

// ================================
// GRACEFUL SHUTDOWN
// ================================

const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    console.log('👋 Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ================================
// SERVER STARTUP
// ================================

connectDB();

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🎉 ================================');
  console.log('🎉 LOCAL SERVER STARTED SUCCESSFULLY!');
  console.log('🎉 ================================');
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Timezone: ${process.env.TZ}`);
  console.log(`🔗 CORS Enabled for: http://localhost:3000`);
  console.log(`📅 Started: ${new Date().toISOString()}`);
  console.log('🎉 ================================');
  console.log('');
  console.log('🔍 QUICK TEST ENDPOINTS:');
  console.log(`   📍 Server: http://localhost:${PORT}/`);
  console.log(`   📍 Health: http://localhost:${PORT}/api/health`);
  console.log(`   📍 DB Test: http://localhost:${PORT}/api/debug-db`);
  console.log(`   📍 Routes: http://localhost:${PORT}/api/debug-routes`);
  console.log(`   📍 User Info: http://localhost:${PORT}/api/debug/user-info`);
  console.log(`   📍 Teacher Classes: http://localhost:${PORT}/api/users/teachers/classes`);
  console.log(`   📍 Teacher Test: http://localhost:${PORT}/api/users/teachers/test`);
  console.log(`   📍 Teacher Routes Debug: http://localhost:${PORT}/api/debug-teacher-routes`);
  console.log(`   📍 Promotion Test: http://localhost:${PORT}/api/promotions/test`);
  console.log('');
  console.log('📚 TEACHER QUESTION ENDPOINTS (CRITICAL):');
  console.log(`   📍 Teacher Questions Test: http://localhost:${PORT}/api/teacher/questions-test`);
  console.log(`   📍 Teacher Questions: http://localhost:${PORT}/api/teacher/questions (GET)`);
  console.log(`   📍 Create Single Question: http://localhost:${PORT}/api/teacher/questions (POST)`);
  console.log(`   📍 Bulk Create Questions: http://localhost:${PORT}/api/teacher/questions/bulk (POST)`);
  console.log(`   📍 Teacher Questions Debug: http://localhost:${PORT}/api/teacher/questions-debug`);
  console.log(`   📍 Teacher Simple Test (POST): http://localhost:${PORT}/api/teacher/questions/simple-test`);
  console.log(`   📍 Teacher Classes: http://localhost:${PORT}/api/users/teachers/6931b8ec77ceafcb4e65b2f9/classes`);
  console.log(`   📍 Teacher Assignments: http://localhost:${PORT}/api/users/teachers/6931b8ec77ceafcb4e65b2f9/assignments`);
  console.log('');
  console.log('🎓 PROMOTION ENDPOINTS:');
  console.log(`   📍 Promotion Status: http://localhost:${PORT}/api/promotions/status`);
  console.log(`   📍 Session Eligibility: http://localhost:${PORT}/api/promotions/session-eligibility/692f04ca5bf8dc34546e7623?session=2025/2026`);
  console.log(`   📍 Bulk Promote: http://localhost:${PORT}/api/promotions/bulk-promote (POST)`);
  console.log('');
  console.log('📊 REPORT ENDPOINTS:');
  console.log(`   📍 Reports Export: http://localhost:${PORT}/api/reports/export/report/:studentId/:session`);
  console.log(`   📍 Results Export: http://localhost:${PORT}/api/results/export/report/:studentId/:session/:term`);
  console.log('🎉 ================================');
  console.log('');
  console.log('⚠️  IMPORTANT: Test endpoints in this order:');
  console.log(`   1. 📍 http://localhost:${PORT}/api/teacher/questions-test`);
  console.log(`   2. 📍 http://localhost:${PORT}/api/debug-teacher-routes`);
  console.log(`   3. Use POST to: http://localhost:${PORT}/api/teacher/questions/simple-test`);
  console.log(`   4. Test promotion: http://localhost:${PORT}/api/promotions/test`);
  console.log(`   5. Test reports: http://localhost:${PORT}/api/reports/export/report/69340bb643e15fa3f5b42a6e/2025/2026?term=First Term`);
  console.log('🎉 ================================');
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error('💡 Try:');
    console.error(`   - Killing process on port ${PORT}: lsof -ti:${PORT} | xargs kill -9`);
    console.error(`   - Using a different port: PORT=5001 node server.js`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

module.exports = app;
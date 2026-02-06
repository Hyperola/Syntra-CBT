// routes/classes.js - COMPLETE UPDATED VERSION WITH STREAM REQUIREMENT
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Class = require('../models/Class');
const User = require('../models/User');
const Subject = require('../models/Subject');
const ClassSubject = require('../models/ClassSubject');
const { auth } = require('../middleware/auth');
const { adminOnly, adminOrSuperAdmin } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

console.log('✅ CLASSES ROUTE: File loaded successfully!');

// Debugging middleware
router.use((req, res, next) => {
  console.log(`🔍 CLASSES DEBUG: ${req.method} ${req.originalUrl}`, {
    params: req.params,
    query: req.query,
    user: req.user?.username,
    role: req.user?.role,
    timestamp: new Date().toISOString()
  });
  next();
});

// Validation middleware
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid class ID format',
      classId: req.params.id
    });
  }
  next();
};

// Helper function to format class response
const formatClassResponse = (classData, studentCount = 0) => {
  if (!classData) return null;
  
  return {
    id: classData._id,
    _id: classData._id,
    name: classData.name,
    shortName: classData.shortName,
    level: classData.level,
    grade: classData.grade || classData.level,
    stream: classData.stream || '',
    section: classData.section || '',
    fullName: classData.fullName || 
      `${classData.level}${classData.stream ? ` ${classData.stream}` : ''}${classData.section ? ` (${classData.section})` : ''}`.trim(),
    capacity: classData.capacity,
    classTeacher: classData.classTeacher ? {
      id: classData.classTeacher._id,
      name: `${classData.classTeacher.firstName || classData.classTeacher.name || ''} ${classData.classTeacher.lastName || classData.classTeacher.surname || ''}`.trim(),
      email: classData.classTeacher.email,
      username: classData.classTeacher.username
    } : null,
    subjectAssignments: Array.isArray(classData.subjectAssignments) ? classData.subjectAssignments.map(assignment => ({
      id: assignment._id,
      subject: assignment.subject ? {
        id: assignment.subject._id,
        name: assignment.subject.name,
        code: assignment.subject.code,
        category: assignment.subject.category,
        isCore: assignment.subject.isCore
      } : null,
      isCore: assignment.isCore || false,
      periodCount: assignment.periodCount || 1,
      displayOrder: assignment.displayOrder || 0
    })) : [],
    studentCount: studentCount,
    subjectCount: Array.isArray(classData.subjectAssignments) ? classData.subjectAssignments.length : 0,
    isActive: classData.isActive !== false,
    displayOrder: classData.displayOrder || 0,
    academicYear: classData.academicYear || new Date().getFullYear(),
    createdAt: classData.createdAt,
    updatedAt: classData.updatedAt
  };
};

// ──────────────────────────────────────────────────────────────
// 0. TEST CONNECTION ROUTE
// ──────────────────────────────────────────────────────────────
router.get('/test-connection', (req, res) => {
  console.log('✅ GET /api/classes/test-connection - Connection test');
  res.json({
    success: true,
    message: 'Classes route is working',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// ──────────────────────────────────────────────────────────────
// 1. GET all classes with REAL student counts - UPDATED
// ──────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    console.log('🏫 GET /api/classes - Fetching all classes with student counts');
    
    // Get query parameters
    const { limit = 50, page = 1, level, isActive = 'true', search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter
    const filter = {};
    if (level) filter.level = level.toUpperCase();
    if (isActive !== 'all') filter.isActive = isActive === 'true';
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { shortName: { $regex: search, $options: 'i' } },
        { level: { $regex: search, $options: 'i' } },
        { stream: { $regex: search, $options: 'i' } },
        { section: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Get total count
    const totalClasses = await Class.countDocuments(filter);
    
    // Fetch classes with basic population
    const classes = await Class.find(filter)
      .populate({
        path: 'classTeacher',
        select: 'firstName lastName name surname email username',
        model: 'User'
      })
      .populate({
        path: 'subjectAssignments.subject',
        select: 'name code category isCore',
        model: 'Subject'
      })
      .sort({ level: 1, stream: 1, section: 1, name: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log(`🏫 Found ${classes.length} classes`);

    // Get student counts for each class
    const classesWithStudentCounts = await Promise.all(
      classes.map(async (classData) => {
        // Count students in this class from User collection
        const studentCount = await User.countDocuments({
          class: classData._id,
          role: 'student',
          active: true
        }).maxTimeMS(5000);

        // Also get a few sample students for preview
        const sampleStudents = await User.find({
          class: classData._id,
          role: 'student',
          active: true
        })
          .select('_id firstName lastName name surname username studentId')
          .limit(5)
          .lean();

        return {
          ...classData,
          studentCount,
          sampleStudents: sampleStudents.map(s => ({
            id: s._id,
            _id: s._id,
            name: `${s.firstName || s.name || ''} ${s.lastName || s.surname || ''}`.trim(),
            username: s.username,
            studentId: s.studentId
          }))
        };
      })
    );

    const result = classesWithStudentCounts.map(cls => formatClassResponse(cls, cls.studentCount));

    res.json({
      success: true,
      classes: result,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalClasses / parseInt(limit)),
        totalClasses,
        hasNext: parseInt(page) < Math.ceil(totalClasses / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (err) {
    console.error('❌ GET /classes error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch classes',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 2. GET class by ID with detailed student info - UPDATED
// ──────────────────────────────────────────────────────────────
router.get('/:id', auth, validateObjectId, async (req, res) => {
  try {
    console.log('🏫 GET /api/classes/:id - Fetching class with students:', req.params.id);
    
    const classData = await Class.findById(req.params.id)
      .populate({
        path: 'classTeacher',
        select: 'firstName lastName name surname email phone username',
        model: 'User'
      })
      .populate({
        path: 'subjectAssignments.subject',
        select: 'name code category isCore',
        model: 'Subject'
      })
      .lean();

    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        classId: req.params.id
      });
    }

    // Get ALL students in this class from User collection
    const students = await User.find({
      class: req.params.id,
      role: 'student',
      active: true
    })
      .select('_id firstName lastName name surname studentId email username gender dateOfBirth address phoneNumber')
      .sort('firstName lastName')
      .lean()
      .maxTimeMS(10000);

    const studentCount = students.length;

    // Format students
    const formattedStudents = students.map(student => ({
      id: student._id,
      _id: student._id,
      name: `${student.firstName || student.name || ''} ${student.lastName || student.surname || ''}`.trim(),
      studentId: student.studentId,
      email: student.email,
      username: student.username,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      phoneNumber: student.phoneNumber,
      address: student.address
    }));

    // Format subject assignments
    const formattedSubjectAssignments = Array.isArray(classData.subjectAssignments) ? classData.subjectAssignments.map(assignment => ({
      id: assignment._id,
      subject: assignment.subject ? {
        id: assignment.subject._id,
        name: assignment.subject.name,
        code: assignment.subject.code,
        category: assignment.subject.category,
        isCore: assignment.subject.isCore
      } : null,
      isCore: assignment.isCore || false,
      periodCount: assignment.periodCount || 1,
      displayOrder: assignment.displayOrder || 0
    })) : [];

    res.json({
      success: true,
      class: formatClassResponse(classData, studentCount),
      detailed: {
        students: formattedStudents,
        subjectAssignments: formattedSubjectAssignments,
        summary: {
          totalStudents: studentCount,
          totalSubjects: formattedSubjectAssignments.length,
          capacityUtilization: classData.capacity > 0 
            ? Math.round((studentCount / classData.capacity) * 100)
            : 0,
          genderDistribution: formattedStudents.reduce((acc, student) => {
            const gender = student.gender || 'Not Specified';
            acc[gender] = (acc[gender] || 0) + 1;
            return acc;
          }, {})
        }
      }
    });
  } catch (err) {
    console.error('❌ GET /classes/:id error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch class details',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// NEW: Get students in a specific class
// ──────────────────────────────────────────────────────────────
router.get('/:id/students', auth, validateObjectId, async (req, res) => {
  try {
    console.log('👥 GET /api/classes/:id/students - Fetching students for class:', req.params.id);
    
    const { limit = 50, page = 1, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Verify class exists
    const classExists = await Class.findById(req.params.id).select('_id name level').lean();
    if (!classExists) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        classId: req.params.id
      });
    }

    // Build student filter
    const filter = {
      class: req.params.id,
      role: 'student',
      active: true
    };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { surname: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count
    const totalStudents = await User.countDocuments(filter);
    
    // Fetch students
    const students = await User.find(filter)
      .select('_id firstName lastName name surname username studentId email gender dateOfBirth phoneNumber')
      .sort('firstName lastName')
      .skip(skip)
      .limit(parseInt(limit))
      .lean()
      .maxTimeMS(10000);

    const formattedStudents = students.map(student => ({
      id: student._id,
      _id: student._id,
      name: `${student.firstName || student.name || ''} ${student.lastName || student.surname || ''}`.trim(),
      username: student.username,
      studentId: student.studentId,
      email: student.email,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      phoneNumber: student.phoneNumber,
      className: classExists.name,
      classLevel: classExists.level
    }));

    res.json({
      success: true,
      class: {
        id: classExists._id,
        name: classExists.name,
        level: classExists.level
      },
      students: formattedStudents,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalStudents / parseInt(limit)),
        totalStudents,
        hasNext: parseInt(page) < Math.ceil(totalStudents / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (err) {
    console.error('❌ GET /classes/:id/students error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch students in class',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 3. CREATE new class (Admin/Super Admin only) - UPDATED WITH STREAM REQUIREMENT
// ──────────────────────────────────────────────────────────────
router.post('/', auth, adminOrSuperAdmin, async (req, res) => {
  try {
    const { name, shortName, level, stream, section, capacity, classTeacherId } = req.body;
    
    console.log('🏫 POST /api/classes - Creating class with data:', { 
      name, 
      shortName, 
      level,
      stream,
      section,
      capacity,
      classTeacherId,
      user: req.user.username 
    });

    // Validate required fields
    if (!name || !level) {
      return res.status(400).json({
        success: false,
        error: 'Class name and level are required',
        fields: { name: !name ? 'Required' : 'OK', level: !level ? 'Required' : 'OK' }
      });
    }

    // IMPORTANT: Validate that stream is provided when creating multiple classes at same level
    // Stream is required for uniqueness when creating JSS1 GOLD, JSS1 SILVER, etc.
    if (!stream || stream.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Stream name is required',
        details: 'When creating multiple classes at the same level, you must provide a stream name (e.g., GOLD, SILVER, DIAMOND, SCIENCE, ARTS)',
        suggestion: 'Provide a stream name like "GOLD", "SILVER", "SCIENCE", or "ARTS"'
      });
    }

    // Get academic year
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}/${currentYear + 1}`;

    // Format inputs
    const formattedName = name.trim().toUpperCase();
    const formattedLevel = level.toUpperCase();
    const formattedStream = stream.trim().toUpperCase();
    const formattedSection = section && section !== 'NONE' ? section.trim().toUpperCase() : '';
    const formattedShortName = shortName ? shortName.trim().toUpperCase() : null;

    // Check for existing class with same level+stream+section+academicYear
    // This allows JSS1 EMERALD, JSS1 GOLD, JSS1 DIAMOND, etc.
    const existingClass = await Class.findOne({
      level: formattedLevel,
      stream: formattedStream,
      section: formattedSection || '',
      academicYear: academicYear,
      isActive: true
    });

    if (existingClass) {
      return res.status(400).json({
        success: false,
        error: 'Class already exists',
        details: `A ${formattedLevel} ${formattedStream} class${formattedSection ? ' in section ' + formattedSection : ''} already exists for academic year ${academicYear}`,
        existingClass: {
          name: existingClass.name,
          level: existingClass.level,
          stream: existingClass.stream,
          section: existingClass.section,
          academicYear: existingClass.academicYear
        },
        suggestion: 'Try using a different stream name (e.g., GOLD, SILVER, DIAMOND, SCIENCE, ARTS)'
      });
    }

    // Build class data
    const classData = {
      name: formattedName,
      level: formattedLevel,
      grade: formattedLevel, // Set grade same as level
      stream: formattedStream, // Stream is required
      section: formattedSection || '', // Ensure empty string instead of null
      capacity: capacity || 40,
      academicYear: academicYear,
      metadata: {
        createdBy: req.user.id,
        lastModifiedBy: req.user.id,
        lastModifiedAt: new Date(),
        notes: [`Class created by ${req.user.username} on ${new Date().toLocaleDateString()}`]
      }
    };

    if (formattedShortName) classData.shortName = formattedShortName;
    if (classTeacherId && classTeacherId !== 'NONE') classData.classTeacher = classTeacherId;

    console.log('✅ Creating new class with data:', classData);

    const newClass = new Class(classData);
    await newClass.save();

    console.log('✅ Class created successfully:', {
      id: newClass._id,
      name: newClass.name,
      shortName: newClass.shortName,
      level: newClass.level,
      grade: newClass.grade,
      stream: newClass.stream,
      section: newClass.section,
      academicYear: newClass.academicYear,
      by: req.user.username
    });

    // Get populated class
    const populatedClass = await Class.findById(newClass._id)
      .populate('classTeacher', 'firstName lastName email')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      class: formatClassResponse(populatedClass, 0)
    });
  } catch (err) {
    console.error('❌ POST /classes error details:', err);
    
    if (err.code === 11000) {
      // Check which field caused the duplicate
      let errorMsg = 'Duplicate class combination';
      let duplicateFields = err.keyValue || {};
      
      if (duplicateFields.level && duplicateFields.stream && duplicateFields.section) {
        errorMsg = `A ${duplicateFields.level} ${duplicateFields.stream} class${duplicateFields.section ? ' in section ' + duplicateFields.section : ''} already exists`;
      }
      
      return res.status(409).json({
        success: false,
        error: 'Duplicate entry',
        details: errorMsg,
        duplicateFields: duplicateFields,
        solution: 'Try using a different stream name (e.g., GOLD, SILVER, DIAMOND) or section'
      });
    }
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create class',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Add this route to your routes/classes.js
router.get('/:id/students/count', auth, async (req, res) => {
  try {
    const classId = req.params.id;
    
    // Validate class ID
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID'
      });
    }

    // Find the class with students populated
    const classData = await Class.findById(classId)
      .select('name shortName level capacity students isActive')
      .populate({
        path: 'students',
        select: 'username firstName lastName studentId isActive',
        match: { isActive: true } // Only count active students
      });

    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }

    // Count active students
    const activeStudents = classData.students ? 
      classData.students.filter(student => student.isActive !== false).length : 0;
    
    // Count all students (including inactive)
    const totalStudents = classData.students ? classData.students.length : 0;
    
    // Calculate capacity utilization
    const capacity = classData.capacity || 40;
    const utilization = capacity > 0 ? Math.round((activeStudents / capacity) * 100) : 0;
    const availableSeats = Math.max(0, capacity - activeStudents);

    res.json({
      success: true,
      class: {
        id: classData._id,
        name: classData.name,
        shortName: classData.shortName,
        level: classData.level,
        isActive: classData.isActive
      },
      counts: {
        total: totalStudents,
        active: activeStudents,
        inactive: totalStudents - activeStudents,
        capacity: capacity,
        utilization: utilization,
        availableSeats: availableSeats
      }
    });
  } catch (error) {
    console.error('❌ GET /classes/:id/students/count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get student count'
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 4. UPDATE class (Admin/Super Admin only) - UPDATED VERSION
// ──────────────────────────────────────────────────────────────
router.put('/:id', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    const { name, shortName, level, stream, capacity, classTeacherId, isActive, displayOrder } = req.body;
    
    console.log('🏫 PUT /api/classes/:id - Updating class:', req.params.id);

    // Get current class to check what we're updating
    const currentClass = await Class.findById(req.params.id);
    if (!currentClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        classId: req.params.id
      });
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim().toUpperCase();
    if (shortName !== undefined) updates.shortName = shortName.trim().toUpperCase();
    if (level !== undefined) updates.level = level.toUpperCase();
    if (stream !== undefined) updates.stream = stream.trim().toUpperCase();
    if (capacity !== undefined) updates.capacity = parseInt(capacity);
    if (classTeacherId !== undefined) updates.classTeacher = classTeacherId;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (displayOrder !== undefined) updates.displayOrder = parseInt(displayOrder);
    
    updates['metadata.lastModifiedBy'] = req.user.id;
    updates['metadata.lastModifiedAt'] = new Date();

    // Check if the update would create a duplicate combination
    // Only check if level, stream, section, or academicYear are being changed
    if (level !== undefined || stream !== undefined || req.body.section !== undefined) {
      const checkLevel = level !== undefined ? level.toUpperCase() : currentClass.level;
      const checkStream = stream !== undefined ? stream.trim().toUpperCase() : currentClass.stream || '';
      const checkSection = req.body.section !== undefined ? req.body.section.trim().toUpperCase() : currentClass.section || '';
      const academicYear = currentClass.academicYear;

      // Don't check against ourselves
      const existingClass = await Class.findOne({
        level: checkLevel,
        stream: checkStream,
        section: checkSection,
        academicYear: academicYear,
        isActive: true,
        _id: { $ne: req.params.id } // Exclude current class
      });

      if (existingClass) {
        return res.status(409).json({
          success: false,
          error: 'Class combination already exists',
          details: `A ${checkLevel}${checkStream ? ` ${checkStream}` : ''}${checkSection ? ` (${checkSection})` : ''} class already exists for ${academicYear}`,
          existingClass: {
            name: existingClass.name,
            shortName: existingClass.shortName,
            level: existingClass.level,
            stream: existingClass.stream,
            section: existingClass.section,
            academicYear: existingClass.academicYear
          }
        });
      }
    }

    // Perform the update
    const classData = await Class.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    console.log('✅ Class updated:', {
      id: classData._id,
      name: classData.name,
      by: req.user.username
    });

    // Get student count for updated class
    const studentCount = await User.countDocuments({
      class: req.params.id,
      role: 'student',
      active: true
    });

    // Get populated class
    const populatedClass = await Class.findById(classData._id)
      .populate('classTeacher', 'firstName lastName email')
      .lean();

    res.json({
      success: true,
      message: 'Class updated successfully',
      class: formatClassResponse(populatedClass, studentCount)
    });
  } catch (err) {
    console.error('❌ PUT /classes/:id error:', err);
    
    if (err.code === 11000) {
      // Handle duplicate key error
      let errorMessage = 'Duplicate class entry';
      if (err.keyValue.name && err.keyValue.academicYear) {
        errorMessage = `A class with name "${err.keyValue.name}" already exists for academic year ${err.keyValue.academicYear}`;
      } else if (err.keyValue.level && err.keyValue.stream && err.keyValue.section && err.keyValue.academicYear) {
        errorMessage = `A ${err.keyValue.level}${err.keyValue.stream ? ` ${err.keyValue.stream}` : ''}${err.keyValue.section ? ` (${err.keyValue.section})` : ''} class already exists for ${err.keyValue.academicYear}`;
      }
      
      return res.status(409).json({
        success: false,
        error: 'Class already exists',
        details: errorMessage,
        duplicateFields: err.keyValue
      });
    }
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update class',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 5. HARD DELETE class (permanent - Super Admin only)
// ──────────────────────────────────────────────────────────────
router.delete('/:id/hard', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    console.log('🏫 DELETE /api/classes/:id/hard - Hard deleting class:', req.params.id);
    
    // Check if user is super_admin
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Only super admins can permanently delete classes',
        userRole: req.user.role
      });
    }

    const classData = await Class.findById(req.params.id);
    
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        classId: req.params.id
      });
    }

    // Check if class has students from User collection
    const studentCount = await User.countDocuments({
      class: req.params.id,
      role: 'student',
      active: true
    });
    
    if (studentCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete class with ${studentCount} students. Please remove all students first.`,
        studentCount: studentCount
      });
    }

    // Hard delete - permanently remove
    await Class.findByIdAndDelete(req.params.id);

    console.log('✅ Class permanently deleted:', {
      id: classData._id,
      name: classData.name,
      by: req.user.username
    });

    res.json({
      success: true,
      message: 'Class permanently deleted successfully',
      deletedClass: {
        id: classData._id,
        name: classData.name,
        level: classData.level
      }
    });
  } catch (err) {
    console.error('❌ DELETE /classes/:id/hard error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to delete class',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 6. DELETE class (deactivate - Admin/Super Admin only) - FIXED VERSION
// ──────────────────────────────────────────────────────────────
router.delete('/:id', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    console.log('🏫 DELETE /api/classes/:id - Soft deleting class:', req.params.id);
    
    // First check if class exists
    const classData = await Class.findById(req.params.id);
    
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        classId: req.params.id
      });
    }

    // Check if there are any students in the class
    const studentCount = await User.countDocuments({
      class: req.params.id,
      role: 'student',
      active: true
    });

    if (studentCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete class with active students',
        studentCount,
        suggestion: 'Remove all students first or use the deactivate endpoint'
      });
    }

    // Use a safe update approach
    const updateData = {
      isActive: false,
      'metadata.lastModifiedBy': req.user.id,
      'metadata.lastModifiedAt': new Date()
    };

    // Add note to metadata
    if (!classData.metadata) {
      updateData.metadata = {
        notes: [],
        createdBy: req.user.id,
        lastModifiedBy: req.user.id,
        lastModifiedAt: new Date()
      };
    }

    // Update the class with validation disabled for safety
    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      updateData,
      { 
        new: true,
        runValidators: false // Disable validators to avoid schema conflicts
      }
    );

    // Add a note to metadata
    if (!updatedClass.metadata.notes) {
      updatedClass.metadata.notes = [];
    }
    
    updatedClass.metadata.notes.push(`Deactivated by ${req.user.username} on ${new Date().toLocaleDateString()}`);
    
    // Save without validation
    await updatedClass.save({ validateBeforeSave: false });

    console.log('✅ Class deactivated successfully:', {
      id: updatedClass._id,
      name: updatedClass.name,
      by: req.user.username
    });

    // Get the updated class with populated data
    const populatedClass = await Class.findById(updatedClass._id)
      .populate('classTeacher', 'firstName lastName email')
      .lean();

    res.json({
      success: true,
      message: 'Class deactivated successfully',
      class: formatClassResponse(populatedClass, studentCount)
    });
  } catch (err) {
    console.error('❌ DELETE /classes/:id error:', err);
    
    // More specific error handling
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID format'
      });
    }
    
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate class entry'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete class',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 8. REACTIVATE deactivated class
// ──────────────────────────────────────────────────────────────
router.patch('/:id/reactivate', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    console.log('🏫 PATCH /api/classes/:id/reactivate - Reactivating class:', req.params.id);
    
    // Use findByIdAndUpdate to avoid validation issues
    const classData = await Class.findByIdAndUpdate(
      req.params.id,
      {
        isActive: true,
        $set: {
          'metadata.lastModifiedBy': req.user.id,
          'metadata.lastModifiedAt': new Date()
        }
      },
      { 
        new: true,
        runValidators: false // Disable validators
      }
    );

    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        classId: req.params.id
      });
    }

    // Add note to metadata
    if (!classData.metadata) {
      classData.metadata = {
        notes: [],
        createdBy: req.user.id,
        lastModifiedBy: req.user.id,
        lastModifiedAt: new Date()
      };
    }
    
    if (!Array.isArray(classData.metadata.notes)) {
      classData.metadata.notes = [];
    }
    
    classData.metadata.notes.push(`Reactivated by ${req.user.username} on ${new Date().toLocaleDateString()}`);
    await classData.save({ validateBeforeSave: false });

    console.log('✅ Class reactivated:', {
      id: classData._id,
      name: classData.name,
      by: req.user.username
    });

    // Get student count
    const studentCount = await User.countDocuments({
      class: req.params.id,
      role: 'student',
      active: true
    });

    // Get updated class with populated data
    const updatedClass = await Class.findById(classData._id)
      .populate('classTeacher', 'firstName lastName email')
      .lean();

    res.json({
      success: true,
      message: 'Class reactivated successfully',
      class: formatClassResponse(updatedClass, studentCount)
    });
  } catch (err) {
    console.error('❌ PATCH /classes/:id/reactivate error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to reactivate class',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 9. GET classes by level
// ──────────────────────────────────────────────────────────────
router.get('/level/:level', auth, async (req, res) => {
  try {
    const { level } = req.params;
    
    const classes = await Class.find({ 
      level: level.toUpperCase(),
      isActive: true 
    })
      .populate('classTeacher', 'firstName lastName')
      .populate({
        path: 'subjectAssignments.subject',
        select: 'name code',
        model: 'Subject'
      })
      .sort({ displayOrder: 1, stream: 1, section: 1, name: 1 })
      .lean();

    // Get student counts for each class
    const classesWithStudentCounts = await Promise.all(
      classes.map(async (classData) => {
        const studentCount = await User.countDocuments({
          class: classData._id,
          role: 'student',
          active: true
        });
        return { ...classData, studentCount };
      })
    );

    const formattedClasses = classesWithStudentCounts.map(cls => formatClassResponse(cls, cls.studentCount));

    res.json({
      success: true,
      level,
      classes: formattedClasses,
      total: classes.length,
      summary: {
        totalStudents: classesWithStudentCounts.reduce((sum, cls) => sum + cls.studentCount, 0),
        totalCapacity: classes.reduce((sum, cls) => sum + cls.capacity, 0),
        totalSubjects: classes.reduce((sum, cls) => sum + (cls.subjectAssignments?.length || 0), 0)
      }
    });
  } catch (err) {
    console.error('❌ GET /classes/level/:level error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch classes by level',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 10. ADD student to class
// ──────────────────────────────────────────────────────────────
router.post('/:id/students/:studentId', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    const { id, studentId } = req.params;
    
    // Verify student exists and is a student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(400).json({
        success: false,
        error: 'Invalid student. User must be a student.',
        studentId
      });
    }

    const classData = await Class.findById(id);
    if (!classData) {
      return res.status(404).json({ 
        success: false,
        error: 'Class not found' 
      });
    }

    // Check capacity - get current student count
    const currentStudentCount = await User.countDocuments({
      class: id,
      role: 'student',
      active: true
    });
    
    if (currentStudentCount >= classData.capacity) {
      return res.status(400).json({
        success: false,
        error: 'Class is at full capacity',
        capacity: classData.capacity,
        current: currentStudentCount
      });
    }

    // Check if student is already in a class
    if (student.class) {
      const existingClass = await Class.findById(student.class);
      if (existingClass) {
        return res.status(400).json({
          success: false,
          error: 'Student is already enrolled in another class',
          currentClass: existingClass.name
        });
      }
    }

    // Update student's class reference
    student.class = classData._id;
    await student.save();

    // Add student to class's students array (optional)
    if (!classData.students.includes(studentId)) {
      classData.students.push(studentId);
      await classData.save();
    }

    console.log('✅ Student added to class:', {
      student: student.username,
      class: classData.name,
      by: req.user.username
    });

    // Get updated student count
    const newStudentCount = await User.countDocuments({
      class: id,
      role: 'student',
      active: true
    });

    const updatedClass = await Class.findById(id)
      .populate('classTeacher', 'firstName lastName email')
      .lean();

    res.json({
      success: true,
      message: 'Student added to class successfully',
      class: formatClassResponse(updatedClass, newStudentCount),
      student: {
        id: student._id,
        name: `${student.firstName || student.name || ''} ${student.lastName || student.surname || ''}`.trim(),
        studentId: student.studentId
      }
    });
  } catch (err) {
    console.error('❌ POST /classes/:id/students/:studentId error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to add student to class',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 11. REMOVE student from class
// ──────────────────────────────────────────────────────────────
router.delete('/:id/students/:studentId', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    const { id, studentId } = req.params;

    const classData = await Class.findById(id);
    if (!classData) {
      return res.status(404).json({ 
        success: false,
        error: 'Class not found' 
      });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ 
        success: false,
        error: 'Student not found' 
      });
    }

    // Check if student is actually in this class
    if (student.class?.toString() !== id) {
      return res.status(400).json({
        success: false,
        error: 'Student is not enrolled in this class'
      });
    }

    // Remove class reference from student
    student.class = null;
    await student.save();

    // Remove student from class's students array (optional)
    classData.students = classData.students.filter(sid => sid.toString() !== studentId);
    await classData.save();

    console.log('✅ Student removed from class:', {
      student: student.username,
      class: classData.name,
      by: req.user.username
    });

    // Get updated student count
    const newStudentCount = await User.countDocuments({
      class: id,
      role: 'student',
      active: true
    });

    res.json({
      success: true,
      message: 'Student removed from class successfully',
      class: formatClassResponse(classData.toObject(), newStudentCount),
      student: {
        id: student._id,
        name: `${student.firstName || student.name || ''} ${student.lastName || student.surname || ''}`.trim()
      }
    });
  } catch (err) {
    console.error('❌ DELETE /classes/:id/students/:studentId error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to remove student from class',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 12. GET class summary/statistics - UPDATED
// ──────────────────────────────────────────────────────────────
router.get('/:id/summary', auth, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id)
      .populate({
        path: 'subjectAssignments.subject',
        select: 'name code category isCore',
        model: 'Subject'
      })
      .lean();

    if (!classData) {
      return res.status(404).json({ 
        success: false,
        error: 'Class not found' 
      });
    }

    // Get students from User collection
    const students = await User.find({
      class: req.params.id,
      role: 'student',
      active: true
    })
      .select('firstName lastName name surname studentId gender')
      .lean();

    const studentCount = students.length;

    // Calculate gender distribution
    const genderDistribution = {};
    students.forEach(student => {
      const gender = student.gender || 'Not Specified';
      genderDistribution[gender] = (genderDistribution[gender] || 0) + 1;
    });

    // Calculate category distribution
    const categoryDistribution = {};
    if (Array.isArray(classData.subjectAssignments)) {
      classData.subjectAssignments.forEach(assignment => {
        const category = assignment.subject?.category || 'Uncategorized';
        categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
      });
    }

    const summary = {
      success: true,
      class: formatClassResponse(classData, studentCount),
      students: {
        total: studentCount,
        byGender: genderDistribution
      },
      subjects: {
        total: classData.subjectAssignments?.length || 0,
        core: classData.subjectAssignments?.filter(s => s.isCore).length || 0,
        elective: classData.subjectAssignments?.filter(s => !s.isCore).length || 0,
        byCategory: categoryDistribution
      },
      capacity: {
        total: classData.capacity,
        used: studentCount,
        available: classData.capacity - studentCount,
        utilization: classData.capacity > 0 
          ? Math.round((studentCount / classData.capacity) * 100)
          : 0
      }
    };

    res.json(summary);
  } catch (err) {
    console.error('❌ GET /classes/:id/summary error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch class summary',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 13. Assign subjects to class - FIXED VERSION
// ──────────────────────────────────────────────────────────────
router.post('/:id/subjects', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    const classId = req.params.id;
    const { subjectIds, isCore = true } = req.body;
    
    console.log('📚 Assigning subjects to class:', { classId, subjectIds, isCore });

    // Validate input
    if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'subjectIds must be a non-empty array'
      });
    }

    // Verify class exists
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        classId
      });
    }

    // Verify subjects exist
    const subjects = await Subject.find({ _id: { $in: subjectIds }, isActive: true });
    if (subjects.length !== subjectIds.length) {
      const foundIds = subjects.map(s => s._id.toString());
      const missingIds = subjectIds.filter(id => !foundIds.includes(id));
      return res.status(404).json({
        success: false,
        error: 'Some subjects not found',
        missingSubjects: missingIds
      });
    }

    // Initialize subjectAssignments array if it doesn't exist
    if (!Array.isArray(classData.subjectAssignments)) {
      classData.subjectAssignments = [];
    }

    // Add or update subject assignments
    const newAssignments = [];
    for (const subjectId of subjectIds) {
      // Check if subject is already assigned
      const existingIndex = classData.subjectAssignments.findIndex(
        assignment => assignment.subject && assignment.subject.toString() === subjectId
      );
      
      if (existingIndex >= 0) {
        // Update existing assignment
        classData.subjectAssignments[existingIndex] = {
          ...classData.subjectAssignments[existingIndex].toObject(),
          isCore: isCore,
          updatedAt: new Date()
        };
        newAssignments.push(classData.subjectAssignments[existingIndex]);
      } else {
        // Add new assignment
        const newAssignment = {
          subject: subjectId,
          isCore: isCore,
          assignedDate: new Date(),
          updatedAt: new Date()
        };
        classData.subjectAssignments.push(newAssignment);
        newAssignments.push(newAssignment);
      }
    }

    // Save the updated class
    await classData.save();

    // Also create ClassSubject records for better management
    try {
      await Promise.all(
        subjectIds.map(subjectId => 
          ClassSubject.findOneAndUpdate(
            { class: classId, subject: subjectId },
            { 
              class: classId, 
              subject: subjectId, 
              isCompulsory: isCore,
              periodCount: 3,
              academicYear: classData.academicYear || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`
            },
            { upsert: true, new: true }
          )
        )
      );
    } catch (classSubjectError) {
      console.log('Note: Could not create ClassSubject records, but class assignment was successful:', classSubjectError.message);
    }

    console.log('✅ Subjects assigned successfully to class:', {
      class: classData.name,
      subjects: subjectIds.length,
      newAssignments: newAssignments.length
    });

    // Get updated class with populated data
    const updatedClass = await Class.findById(classId)
      .populate({
        path: 'subjectAssignments.subject',
        select: 'name code category isCore',
        model: 'Subject'
      })
      .populate('classTeacher', 'firstName lastName email')
      .lean();

    // Get student count
    const studentCount = await User.countDocuments({
      class: classId,
      role: 'student',
      active: true
    });

    res.status(200).json({
      success: true,
      message: `${subjectIds.length} subjects assigned to class successfully`,
      class: formatClassResponse(updatedClass, studentCount),
      subjectAssignments: updatedClass.subjectAssignments || []
    });

  } catch (error) {
    console.error('❌ POST /classes/:id/subjects error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to assign subjects to class',
      details: error.message 
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 14. Remove subject from class
// ──────────────────────────────────────────────────────────────
router.delete('/:classId/subjects/:subjectId', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    const { classId, subjectId } = req.params;

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        classId
      });
    }

    await classData.removeSubjectAssignment(subjectId);

    console.log('✅ Subject removed from class:', {
      class: classData.name,
      subjectId
    });

    // Get student count
    const studentCount = await User.countDocuments({
      class: classId,
      role: 'student',
      active: true
    });

    const updatedClass = await Class.findById(classId)
      .populate('subjectAssignments.subject', 'name code category isCore')
      .lean();

    res.json({
      success: true,
      message: 'Subject removed from class successfully',
      class: formatClassResponse(updatedClass, studentCount)
    });

  } catch (err) {
    console.error('❌ DELETE /classes/:classId/subjects/:subjectId error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to remove subject from class',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 15. Get subjects for a class (for teacher assignment)
// ──────────────────────────────────────────────────────────────
router.get('/:id/subjects', auth, validateObjectId, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id)
      .populate('subjectAssignments.subject', 'name code category isCore')
      .lean();

    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        classId: req.params.id
      });
    }

    const subjects = Array.isArray(classData.subjectAssignments) ? classData.subjectAssignments
      .filter(assignment => assignment.subject)
      .map(assignment => ({
        id: assignment.subject._id,
        _id: assignment.subject._id,
        name: assignment.subject.name,
        code: assignment.subject.code,
        category: assignment.subject.category,
        isCore: assignment.isCore || false,
        displayOrder: assignment.displayOrder || 0,
        periodCount: assignment.periodCount || 1
      })) : [];

    res.json({
      success: true,
      class: {
        id: classData._id,
        name: classData.name,
        shortName: classData.shortName,
        level: classData.level
      },
      subjects,
      coreSubjects: subjects.filter(s => s.isCore),
      electiveSubjects: subjects.filter(s => !s.isCore),
      total: subjects.length
    });

  } catch (err) {
    console.error('❌ GET /classes/:id/subjects error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch class subjects',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 16. Update subject core status in class
// ──────────────────────────────────────────────────────────────
router.patch('/:classId/subjects/:subjectId/core', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    const { classId, subjectId } = req.params;
    const { isCore } = req.body;

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        classId
      });
    }

    await classData.updateSubjectCoreStatus(subjectId, isCore);

    // Get student count
    const studentCount = await User.countDocuments({
      class: classId,
      role: 'student',
      active: true
    });

    const updatedClass = await Class.findById(classId)
      .populate('subjectAssignments.subject', 'name code category isCore')
      .lean();

    console.log('✅ Subject core status updated:', {
      class: updatedClass.name,
      subjectId,
      isCore
    });

    res.json({
      success: true,
      message: 'Subject core status updated successfully',
      class: formatClassResponse(updatedClass, studentCount)
    });

  } catch (err) {
    console.error('❌ PATCH /classes/:classId/subjects/:subjectId/core error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update subject core status',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 17. Get classes for assignment dropdown
// ──────────────────────────────────────────────────────────────
router.get('/assignment/classes', auth, async (req, res) => {
  try {
    console.log('📚 GET /api/classes/assignment/classes - Fetching classes for assignment');
    
    const classes = await Class.find({ isActive: true })
      .select('_id name shortName level fullName stream section capacity')
      .sort({ level: 1, stream: 1, section: 1, name: 1 })
      .lean();

    // Get student counts for each class
    const classesWithStudentCounts = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await User.countDocuments({
          class: cls._id,
          role: 'student',
          active: true
        });
        return { ...cls, studentCount };
      })
    );

    res.json({
      success: true,
      classes: classesWithStudentCounts.map(cls => ({
        id: cls._id,
        _id: cls._id,
        name: cls.name,
        shortName: cls.shortName,
        level: cls.level,
        stream: cls.stream,
        section: cls.section,
        fullName: cls.fullName || 
          `${cls.level}${cls.stream ? ` ${cls.stream}` : ''}${cls.section ? ` (${cls.section})` : ''}`.trim(),
        capacity: cls.capacity,
        studentCount: cls.studentCount,
        label: cls.fullName || cls.name
      })),
      total: classes.length
    });
  } catch (err) {
    console.error('❌ GET /classes/assignment/classes error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch classes for assignment',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 18. BULK DELETE multiple classes (Super Admin only)
// ──────────────────────────────────────────────────────────────
router.post('/bulk-delete', auth, adminOrSuperAdmin, async (req, res) => {
  try {
    const { classIds, action = 'deactivate' } = req.body;
    
    if (!Array.isArray(classIds) || classIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No class IDs provided',
        classIds
      });
    }

    console.log('🏫 POST /api/classes/bulk-delete - Bulk action:', {
      action,
      classCount: classIds.length,
      by: req.user.username
    });

    let results = {
      success: true,
      message: '',
      action,
      total: classIds.length,
      processed: 0,
      failed: 0,
      details: []
    };

    for (const classId of classIds) {
      try {
        if (!mongoose.Types.ObjectId.isValid(classId)) {
          results.details.push({
            classId,
            success: false,
            error: 'Invalid class ID format'
          });
          results.failed++;
          continue;
        }

        const classData = await Class.findById(classId);
        if (!classData) {
          results.details.push({
            classId,
            success: false,
            error: 'Class not found'
          });
          results.failed++;
          continue;
        }

        if (action === 'deactivate') {
          // Use findByIdAndUpdate to avoid validation
          await Class.findByIdAndUpdate(
            classId,
            { isActive: false },
            { runValidators: false }
          );
          
          results.details.push({
            classId,
            success: true,
            message: `Class "${classData.name}" deactivated`,
            className: classData.name
          });
        } else if (action === 'delete' && req.user.role === 'super_admin') {
          // Check if class has students from User collection
          const studentCount = await User.countDocuments({
            class: classId,
            role: 'student',
            active: true
          });
          
          if (studentCount > 0) {
            results.details.push({
              classId,
              success: false,
              error: `Cannot delete class with ${studentCount} students`
            });
            results.failed++;
            continue;
          }
          
          await Class.findByIdAndDelete(classId);
          results.details.push({
            classId,
            success: true,
            message: `Class "${classData.name}" permanently deleted`,
            className: classData.name
          });
        } else {
          results.details.push({
            classId,
            success: false,
            error: 'Invalid action or insufficient permissions'
          });
          results.failed++;
          continue;
        }

        results.processed++;
      } catch (err) {
        results.details.push({
          classId,
          success: false,
          error: err.message
        });
        results.failed++;
      }
    }

    results.message = `Processed ${results.processed} classes successfully, ${results.failed} failed`;

    res.json(results);
  } catch (err) {
    console.error('❌ POST /classes/bulk-delete error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to process bulk delete',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 19. GET deleted/inactive classes
// ──────────────────────────────────────────────────────────────
router.get('/inactive', auth, adminOrSuperAdmin, async (req, res) => {
  try {
    console.log('🏫 GET /api/classes/inactive - Fetching inactive classes');
    
    const { limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const filter = { isActive: false };
    
    // Get total count
    const totalClasses = await Class.countDocuments(filter);
    
    // Fetch inactive classes
    const classes = await Class.find(filter)
      .populate('classTeacher', 'firstName lastName email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get student counts for each class
    const classesWithStudentCounts = await Promise.all(
      classes.map(async (classData) => {
        const studentCount = await User.countDocuments({
          class: classData._id,
          role: 'student',
          active: true
        });
        return { ...classData, studentCount };
      })
    );

    const result = classesWithStudentCounts.map(cls => formatClassResponse(cls, cls.studentCount));

    res.json({
      success: true,
      classes: result,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalClasses / parseInt(limit)),
        totalClasses,
        hasNext: parseInt(page) < Math.ceil(totalClasses / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (err) {
    console.error('❌ GET /classes/inactive error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inactive classes',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 20. DEBUG route - Check class metadata
// ──────────────────────────────────────────────────────────────
router.get('/debug/:id', auth, validateObjectId, async (req, res) => {
  try {
    console.log('🔧 GET /api/classes/debug/:id - Debug class:', req.params.id);
    
    const classData = await Class.findById(req.params.id).lean();
    
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        classId: req.params.id
      });
    }

    // Get student count
    const studentCount = await User.countDocuments({
      class: req.params.id,
      role: 'student',
      active: true
    });

    res.json({
      success: true,
      class: classData,
      studentCount: studentCount,
      metadata: classData.metadata || 'No metadata',
      metadataType: typeof classData.metadata,
      metadataStructure: classData.metadata ? {
        hasLastModifiedBy: !!classData.metadata.lastModifiedBy,
        hasLastModifiedAt: !!classData.metadata.lastModifiedAt,
        hasNotes: !!classData.metadata.notes,
        notesIsArray: Array.isArray(classData.metadata.notes),
        notesLength: Array.isArray(classData.metadata.notes) ? classData.metadata.notes.length : 'N/A'
      } : 'No metadata',
      isActive: classData.isActive
    });
  } catch (err) {
    console.error('❌ GET /classes/debug/:id error:', err);
    res.status(500).json({
      success: false,
      error: 'Debug failed',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 21. GET class availability (for student enrollment) - UPDATED
// ──────────────────────────────────────────────────────────────
router.get('/availability/:level', auth, async (req, res) => {
  try {
    const { level } = req.params;
    
    const classes = await Class.find({ 
      level: level.toUpperCase(),
      isActive: true 
    })
      .select('_id name shortName capacity stream section')
      .sort({ stream: 1, section: 1, name: 1 })
      .lean();

    // Get student counts for each class
    const classesWithStudentCounts = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await User.countDocuments({
          class: cls._id,
          role: 'student',
          active: true
        });
        return { ...cls, studentCount };
      })
    );

    const availableClasses = classesWithStudentCounts.map(cls => ({
      id: cls._id,
      name: cls.name,
      shortName: cls.shortName,
      stream: cls.stream,
      section: cls.section,
      capacity: cls.capacity,
      enrolled: cls.studentCount,
      available: cls.capacity - cls.studentCount,
      isFull: cls.capacity <= cls.studentCount
    }));

    res.json({
      success: true,
      level,
      classes: availableClasses,
      totalClasses: classes.length,
      totalAvailable: availableClasses.reduce((sum, cls) => sum + cls.available, 0),
      totalCapacity: availableClasses.reduce((sum, cls) => sum + cls.capacity, 0),
      totalEnrolled: availableClasses.reduce((sum, cls) => sum + cls.enrolled, 0)
    });
  } catch (err) {
    console.error('❌ GET /classes/availability/:level error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch class availability',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 22. GET available streams for a level
// ──────────────────────────────────────────────────────────────
router.get('/streams/available', auth, async (req, res) => {
  try {
    const { level } = req.query;
    
    if (!level) {
      return res.status(400).json({
        success: false,
        error: 'Level is required'
      });
    }

    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}/${currentYear + 1}`;

    // Get existing streams for this level in current academic year
    const existingClasses = await Class.find({
      level: level.toUpperCase(),
      academicYear: academicYear,
      isActive: true
    }).select('stream name');

    // Common stream suggestions
    const commonStreams = ['GOLD', 'SILVER', 'DIAMOND', 'PEARL', 'RUBY', 'SAPPHIRE', 'EMERALD', 'SCIENCE', 'ARTS', 'COMMERCIAL'];

    // Filter out already used streams
    const existingStreams = existingClasses.map(c => c.stream?.toUpperCase()).filter(Boolean);
    const availableStreams = commonStreams.filter(stream => 
      !existingStreams.includes(stream.toUpperCase())
    );

    res.json({
      success: true,
      level: level.toUpperCase(),
      existingClasses: existingClasses.map(c => ({
        name: c.name,
        stream: c.stream
      })),
      availableStreams,
      suggestion: availableStreams.length > 0 
        ? `Try: ${availableStreams.join(', ')}` 
        : 'All common streams are taken. Try a unique stream name.'
    });
  } catch (error) {
    console.error('Error fetching available streams:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available streams'
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 23. TEST ROUTES
// ──────────────────────────────────────────────────────────────
router.get('/test', (req, res) => {
  console.log('✅ GET /api/classes/test - Test route hit');
  res.json({ 
    success: true,
    message: 'Classes route is working!', 
    timestamp: new Date().toISOString(),
    status: 'SUCCESS'
  });
});

router.get('/health', (req, res) => {
  console.log('✅ GET /api/classes/health - Health check');
  res.json({
    success: true,
    status: 'OK',
    message: 'Classes route is healthy',
    timestamp: new Date().toISOString()
  });
});

// ──────────────────────────────────────────────────────────────
// 24. RESET class metadata (for fixing corrupted data)
// ──────────────────────────────────────────────────────────────
router.patch('/:id/reset-metadata', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    console.log('🔄 PATCH /api/classes/:id/reset-metadata - Resetting metadata for class:', req.params.id);
    
    const classData = await Class.findById(req.params.id);
    
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        classId: req.params.id
      });
    }

    // Get student count
    const studentCount = await User.countDocuments({
      class: req.params.id,
      role: 'student',
      active: true
    });

    // Reset metadata to clean state
    classData.metadata = {
      notes: [`Metadata reset by ${req.user.username} on ${new Date().toLocaleDateString()}`],
      lastModifiedBy: req.user.id,
      lastModifiedAt: new Date(),
      createdBy: classData.metadata?.createdBy || req.user.id
    };
    
    await classData.save({ validateBeforeSave: false });

    console.log('✅ Class metadata reset:', {
      id: classData._id,
      name: classData.name,
      by: req.user.username
    });

    res.json({
      success: true,
      message: 'Class metadata reset successfully',
      class: formatClassResponse(classData.toObject(), studentCount),
      metadata: classData.metadata
    });
  } catch (err) {
    console.error('❌ PATCH /classes/:id/reset-metadata error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to reset class metadata',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 25. SIMPLE CREATE route for testing (bypasses some validation)
// ──────────────────────────────────────────────────────────────
router.post('/simple-create', auth, adminOrSuperAdmin, async (req, res) => {
  try {
    const { name, level } = req.body;
    
    console.log('🏫 POST /api/classes/simple-create - Creating simple class:', { name, level });

    if (!name || !level) {
      return res.status(400).json({
        success: false,
        error: 'Name and level are required'
      });
    }

    // Generate a unique short name
    const timestamp = Date.now().toString().slice(-4);
    const shortName = `${level.replace('SS', '')}${timestamp}`;

    const classData = {
      name: name.trim().toUpperCase(),
      shortName: shortName,
      level: level.toUpperCase(),
      stream: 'GENERAL', // Default stream
      metadata: {
        notes: [`Class created via simple-create by ${req.user.username}`],
        createdBy: req.user.id,
        lastModifiedBy: req.user.id,
        lastModifiedAt: new Date()
      }
    };

    const newClass = new Class(classData);
    await newClass.save();

    res.status(201).json({
      success: true,
      message: 'Class created successfully (simple)',
      class: {
        id: newClass._id,
        name: newClass.name,
        shortName: newClass.shortName,
        level: newClass.level,
        stream: newClass.stream
      }
    });
  } catch (err) {
    console.error('❌ POST /classes/simple-create error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to create class',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 26. EMERGENCY FIX: Repair corrupted class data
// ──────────────────────────────────────────────────────────────
router.patch('/:id/repair', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    console.log('🔧 PATCH /api/classes/:id/repair - Repairing class:', req.params.id);
    
    const classData = await Class.findById(req.params.id).lean();
    
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        classId: req.params.id
      });
    }

    // Create update object with minimal required fields
    const updates = {};
    
    // Fix level if it's invalid
    if (classData.level && !['JSS1', 'JSS2', 'JSS3', 'SSS1', 'SSS2', 'SSS3'].includes(classData.level)) {
      console.log('Fixing invalid level:', classData.level);
      // Try to extract level from name
      const name = classData.name || '';
      if (name.includes('JSS1') || name.includes('JSS 1')) {
        updates.level = 'JSS1';
      } else if (name.includes('JSS2') || name.includes('JSS 2')) {
        updates.level = 'JSS2';
      } else if (name.includes('JSS3') || name.includes('JSS 3')) {
        updates.level = 'JSS3';
      } else if (name.includes('SSS1') || name.includes('SSS 1')) {
        updates.level = 'SSS1';
      } else if (name.includes('SSS2') || name.includes('SSS 2')) {
        updates.level = 'SSS2';
      } else if (name.includes('SSS3') || name.includes('SSS 3')) {
        updates.level = 'SSS3';
      } else {
        updates.level = 'JSS1'; // Default
      }
    }

    // Fix stream if missing
    if (!classData.stream || classData.stream.trim() === '') {
      updates.stream = 'GENERAL';
    }

    // Fix shortName if missing
    if (!classData.shortName && classData.name) {
      updates.shortName = classData.name.replace(/\s+/g, '').substring(0, 10).toUpperCase();
    }

    // Fix name if missing
    if (!classData.name && classData.level) {
      updates.name = `${classData.level}${classData.stream ? ` ${classData.stream}` : ''}`;
    }

    // Add metadata if missing
    if (!classData.metadata) {
      updates.metadata = {
        notes: [`Repaired by ${req.user.username} on ${new Date().toLocaleDateString()}`],
        lastModifiedBy: req.user.id,
        lastModifiedAt: new Date(),
        createdBy: classData.metadata?.createdBy || req.user.id
      };
    }

    if (Object.keys(updates).length > 0) {
      const updatedClass = await Class.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true }
      );

      // Get student count
      const studentCount = await User.countDocuments({
        class: req.params.id,
        role: 'student',
        active: true
      });

      console.log('✅ Class repaired:', {
        id: updatedClass._id,
        updates: Object.keys(updates)
      });

      res.json({
        success: true,
        message: 'Class repaired successfully',
        repairs: Object.keys(updates),
        class: formatClassResponse(updatedClass.toObject(), studentCount)
      });
    } else {
      // Get student count even if no repairs needed
      const studentCount = await User.countDocuments({
        class: req.params.id,
        role: 'student',
        active: true
      });
      
      res.json({
        success: true,
        message: 'Class does not need repair',
        class: formatClassResponse(classData, studentCount)
      });
    }
  } catch (err) {
    console.error('❌ PATCH /classes/:id/repair error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to repair class',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 27. BULK add students to class
// ──────────────────────────────────────────────────────────────
router.post('/:id/students/bulk', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    const { studentIds } = req.body;
    const classId = req.params.id;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No student IDs provided'
      });
    }

    console.log('👥 POST /api/classes/:id/students/bulk - Bulk adding students:', {
      classId,
      studentCount: studentIds.length,
      by: req.user.username
    });

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }

    // Get current student count
    const currentStudentCount = await User.countDocuments({
      class: classId,
      role: 'student',
      active: true
    });

    // Check capacity
    if (currentStudentCount + studentIds.length > classData.capacity) {
      return res.status(400).json({
        success: false,
        error: 'Exceeds class capacity',
        capacity: classData.capacity,
        current: currentStudentCount,
        attempting: studentIds.length,
        available: classData.capacity - currentStudentCount
      });
    }

    const results = {
      total: studentIds.length,
      successful: 0,
      failed: 0,
      details: []
    };

    for (const studentId of studentIds) {
      try {
        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
          results.details.push({
            studentId,
            success: false,
            error: 'Not a valid student'
          });
          results.failed++;
          continue;
        }

        if (student.class) {
          results.details.push({
            studentId,
            success: false,
            error: 'Student already in a class',
            currentClass: student.class
          });
          results.failed++;
          continue;
        }

        // Update student's class
        student.class = classId;
        await student.save();

        // Add to class's students array
        if (!classData.students.includes(studentId)) {
          classData.students.push(studentId);
        }

        results.details.push({
          studentId,
          success: true,
          studentName: `${student.firstName || student.name || ''} ${student.lastName || student.surname || ''}`.trim()
        });
        results.successful++;
      } catch (err) {
        results.details.push({
          studentId,
          success: false,
          error: err.message
        });
        results.failed++;
      }
    }

    // Save class with updated students array
    await classData.save();

    // Get updated student count
    const newStudentCount = await User.countDocuments({
      class: classId,
      role: 'student',
      active: true
    });

    console.log('✅ Bulk student addition completed:', {
      class: classData.name,
      successful: results.successful,
      failed: results.failed
    });

    res.json({
      success: true,
      message: `Successfully added ${results.successful} students to class`,
      class: formatClassResponse(classData, newStudentCount),
      results
    });

  } catch (err) {
    console.error('❌ POST /classes/:id/students/bulk error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk add students to class',
      details: err.message
    });
  }
});

console.log('✅ CLASSES ROUTE: All routes defined successfully!');

module.exports = router;
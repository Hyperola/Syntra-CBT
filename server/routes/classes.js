// routes/classes.js - COMPLETE FIXED VERSION
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Class = require('../models/Class');
const User = require('../models/User');
const Subject = require('../models/Subject');
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
const formatClassResponse = (classData) => {
  if (!classData) return null;
  
  return {
    id: classData._id,
    _id: classData._id,
    name: classData.name,
    shortName: classData.shortName,
    level: classData.level,
    stream: classData.stream || '',
    fullName: classData.fullName || `${classData.name} ${classData.stream ? `(${classData.stream})` : ''}`.trim(),
    capacity: classData.capacity,
    classTeacher: classData.classTeacher ? {
      id: classData.classTeacher._id,
      name: `${classData.classTeacher.firstName || ''} ${classData.classTeacher.lastName || ''}`.trim(),
      email: classData.classTeacher.email
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
    studentCount: Array.isArray(classData.students) ? classData.students.length : 0,
    subjectCount: Array.isArray(classData.subjectAssignments) ? classData.subjectAssignments.length : 0,
    isActive: classData.isActive !== false,
    displayOrder: classData.displayOrder || 0,
    academicYear: classData.academicYear || new Date().getFullYear(),
    createdAt: classData.createdAt,
    updatedAt: classData.updatedAt
  };
};

// ──────────────────────────────────────────────────────────────
// 1. GET all classes with subject assignments
// ──────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    console.log('🏫 GET /api/classes - Fetching all classes');
    
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
        { stream: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Get total count
    const totalClasses = await Class.countDocuments(filter);
    
    // Fetch classes
    const classes = await Class.find(filter)
      .populate({
        path: 'classTeacher',
        select: 'firstName lastName email username',
        model: 'User'
      })
      .populate({
        path: 'subjectAssignments.subject',
        select: 'name code category isCore',
        model: 'Subject'
      })
      .sort({ level: 1, displayOrder: 1, name: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log(`🏫 Found ${classes.length} classes`);

    const result = classes.map(formatClassResponse);

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
// 2. GET class by ID
// ──────────────────────────────────────────────────────────────
router.get('/:id', auth, validateObjectId, async (req, res) => {
  try {
    console.log('🏫 GET /api/classes/:id - Fetching class:', req.params.id);
    
    const classData = await Class.findById(req.params.id)
      .populate({
        path: 'classTeacher',
        select: 'firstName lastName email phone username',
        model: 'User'
      })
      .populate({
        path: 'subjectAssignments.subject',
        select: 'name code category isCore',
        model: 'Subject'
      })
      .populate({
        path: 'students',
        select: 'firstName lastName studentId email username',
        model: 'User'
      })
      .lean();

    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        classId: req.params.id
      });
    }

    // Format students
    const formattedStudents = Array.isArray(classData.students) ? classData.students.map(student => ({
      id: student._id,
      name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
      studentId: student.studentId,
      email: student.email,
      username: student.username
    })) : [];

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
      class: formatClassResponse(classData),
      detailed: {
        students: formattedStudents,
        subjects: formattedSubjectAssignments,
        summary: {
          totalStudents: formattedStudents.length,
          totalSubjects: formattedSubjectAssignments.length,
          capacityUtilization: classData.capacity > 0 
            ? Math.round((formattedStudents.length / classData.capacity) * 100)
            : 0
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
// 3. CREATE new class (Admin/Super Admin only)
// ──────────────────────────────────────────────────────────────
router.post('/', auth, adminOrSuperAdmin, async (req, res) => {
  try {
    const { name, shortName, level, stream, capacity, classTeacherId } = req.body;
    
    console.log('🏫 POST /api/classes - Creating class:', { name, level });

    // Validate required fields
    if (!name || !level) {
      return res.status(400).json({
        success: false,
        error: 'Class name and level are required',
        fields: { name: !name ? 'Required' : 'OK', level: !level ? 'Required' : 'OK' }
      });
    }

    // Validate class teacher if provided
    if (classTeacherId) {
      const teacher = await User.findById(classTeacherId);
      if (!teacher || teacher.role !== 'teacher') {
        return res.status(400).json({
          success: false,
          error: 'Invalid class teacher. User must be a teacher.',
          classTeacherId
        });
      }
    }

    const classData = {
      name: name.trim().toUpperCase(),
      level: level.toUpperCase(),
      capacity: capacity || 40,
      metadata: {
        createdBy: req.user.id,
        lastModifiedBy: req.user.id,
        lastModifiedAt: new Date(),
        notes: []
      }
    };

    if (shortName) classData.shortName = shortName.trim().toUpperCase();
    if (stream) classData.stream = stream.trim().toUpperCase();
    if (classTeacherId) classData.classTeacher = classTeacherId;

    const newClass = new Class(classData);
    await newClass.save();

    console.log('✅ Class created:', {
      id: newClass._id,
      name: newClass.name,
      level: newClass.level,
      by: req.user.username
    });

    // Get populated class
    const populatedClass = await Class.findById(newClass._id)
      .populate('classTeacher', 'firstName lastName email')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      class: formatClassResponse(populatedClass)
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Class already exists',
        details: 'A class with the same name or short name already exists'
      });
    }
    
    console.error('❌ POST /classes error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to create class',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 4. UPDATE class (Admin/Super Admin only)
// ──────────────────────────────────────────────────────────────
router.put('/:id', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    const { name, shortName, level, stream, capacity, classTeacherId, isActive, displayOrder } = req.body;
    
    console.log('🏫 PUT /api/classes/:id - Updating class:', req.params.id);

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

    const classData = await Class.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        classId: req.params.id
      });
    }

    console.log('✅ Class updated:', {
      id: classData._id,
      name: classData.name,
      by: req.user.username
    });

    // Get populated class
    const populatedClass = await Class.findById(classData._id)
      .populate('classTeacher', 'firstName lastName email')
      .lean();

    res.json({
      success: true,
      message: 'Class updated successfully',
      class: formatClassResponse(populatedClass)
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Class already exists',
        details: 'Another class with the same name or short name exists'
      });
    }
    
    console.error('❌ PUT /classes/:id error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update class',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 5. HARD DELETE class (permanent - Super Admin only) - FIXED
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

    // Check if class has students
    if (Array.isArray(classData.students) && classData.students.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete class with ${classData.students.length} students. Please remove all students first.`,
        studentCount: classData.students.length
      });
    }

    // Check for any results associated with this class
    const Result = require('../models/Result');
    const resultCount = await Result.countDocuments({ class: req.params.id });
    if (resultCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete class with ${resultCount} exam results. Please delete the results first.`,
        resultCount
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
// 6. SOFT DELETE class (deactivate - Admin/Super Admin only) - FIXED
// ──────────────────────────────────────────────────────────────
router.delete('/:id', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    console.log('🏫 DELETE /api/classes/:id - Soft deleting class:', req.params.id);
    
    const classData = await Class.findById(req.params.id);
    
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        classId: req.params.id
      });
    }

    // Soft delete - mark as inactive
    classData.isActive = false;
    
    // Initialize metadata if it doesn't exist
    if (!classData.metadata) {
      classData.metadata = {
        lastModifiedBy: req.user.id,
        lastModifiedAt: new Date(),
        notes: []
      };
    } else {
      classData.metadata.lastModifiedBy = req.user.id;
      classData.metadata.lastModifiedAt = new Date();
      
      // Initialize notes array if it doesn't exist
      if (!Array.isArray(classData.metadata.notes)) {
        classData.metadata.notes = [];
      }
    }
    
    // Add note about deactivation
    classData.metadata.notes.push(`Deactivated by ${req.user.username} on ${new Date().toLocaleDateString()}`);
    
    await classData.save();

    console.log('✅ Class deactivated:', {
      id: classData._id,
      name: classData.name,
      by: req.user.username
    });

    res.json({
      success: true,
      message: 'Class deactivated successfully',
      class: formatClassResponse(classData.toObject())
    });
  } catch (err) {
    console.error('❌ DELETE /classes/:id error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to delete class',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 7. DEACTIVATE class (alternative PATCH method) - FIXED
// ──────────────────────────────────────────────────────────────
router.patch('/:id/deactivate', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    console.log('🏫 PATCH /api/classes/:id/deactivate - Deactivating class:', req.params.id);
    
    const classData = await Class.findById(req.params.id);
    
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        classId: req.params.id
      });
    }

    // Soft delete - mark as inactive
    classData.isActive = false;
    
    // Initialize metadata if it doesn't exist
    if (!classData.metadata) {
      classData.metadata = {
        lastModifiedBy: req.user.id,
        lastModifiedAt: new Date(),
        notes: []
      };
    } else {
      classData.metadata.lastModifiedBy = req.user.id;
      classData.metadata.lastModifiedAt = new Date();
      
      // Initialize notes array if it doesn't exist
      if (!Array.isArray(classData.metadata.notes)) {
        classData.metadata.notes = [];
      }
    }
    
    // Add note about deactivation
    classData.metadata.notes.push(`Deactivated by ${req.user.username} on ${new Date().toLocaleDateString()}`);
    
    await classData.save();

    console.log('✅ Class deactivated via PATCH:', {
      id: classData._id,
      name: classData.name,
      by: req.user.username
    });

    res.json({
      success: true,
      message: 'Class deactivated successfully',
      class: formatClassResponse(classData.toObject())
    });
  } catch (err) {
    console.error('❌ PATCH /classes/:id/deactivate error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate class',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 8. REACTIVATE deactivated class - FIXED
// ──────────────────────────────────────────────────────────────
router.patch('/:id/reactivate', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    console.log('🏫 PATCH /api/classes/:id/reactivate - Reactivating class:', req.params.id);
    
    const classData = await Class.findById(req.params.id);
    
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        classId: req.params.id
      });
    }

    // Reactivate - mark as active
    classData.isActive = true;
    
    // Initialize metadata if it doesn't exist
    if (!classData.metadata) {
      classData.metadata = {
        lastModifiedBy: req.user.id,
        lastModifiedAt: new Date(),
        notes: []
      };
    } else {
      classData.metadata.lastModifiedBy = req.user.id;
      classData.metadata.lastModifiedAt = new Date();
      
      // Initialize notes array if it doesn't exist
      if (!Array.isArray(classData.metadata.notes)) {
        classData.metadata.notes = [];
      }
    }
    
    // Add note about reactivation
    classData.metadata.notes.push(`Reactivated by ${req.user.username} on ${new Date().toLocaleDateString()}`);
    
    await classData.save();

    console.log('✅ Class reactivated:', {
      id: classData._id,
      name: classData.name,
      by: req.user.username
    });

    res.json({
      success: true,
      message: 'Class reactivated successfully',
      class: formatClassResponse(classData.toObject())
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
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    const formattedClasses = classes.map(formatClassResponse);

    res.json({
      success: true,
      level,
      classes: formattedClasses,
      total: classes.length,
      summary: {
        totalStudents: classes.reduce((sum, cls) => sum + (cls.students?.length || 0), 0),
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

    // Check capacity
    if (classData.students.length >= classData.capacity) {
      return res.status(400).json({
        success: false,
        error: 'Class is at full capacity',
        capacity: classData.capacity,
        current: classData.students.length
      });
    }

    // Check if student is already in a class
    const existingClass = await Class.findOne({ students: studentId, isActive: true });
    if (existingClass) {
      return res.status(400).json({
        success: false,
        error: 'Student is already enrolled in another class',
        currentClass: existingClass.name
      });
    }

    await classData.addStudent(studentId);
    
    // Update student's class reference
    student.class = classData._id;
    await student.save();

    console.log('✅ Student added to class:', {
      student: student.username,
      class: classData.name,
      by: req.user.username
    });

    const updatedClass = await Class.findById(id)
      .populate('students', 'firstName lastName studentId')
      .lean();

    res.json({
      success: true,
      message: 'Student added to class successfully',
      class: formatClassResponse(updatedClass),
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
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

    await classData.removeStudent(studentId);
    
    // Remove class reference from student
    student.class = null;
    await student.save();

    console.log('✅ Student removed from class:', {
      student: student.username,
      class: classData.name,
      by: req.user.username
    });

    res.json({
      success: true,
      message: 'Student removed from class successfully',
      class: formatClassResponse(classData.toObject()),
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`
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
// 12. GET class summary/statistics
// ──────────────────────────────────────────────────────────────
router.get('/:id/summary', auth, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id)
      .populate('students', 'firstName lastName studentId gender')
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

    // Calculate gender distribution
    const genderDistribution = {};
    if (Array.isArray(classData.students)) {
      classData.students.forEach(student => {
        const gender = student.gender || 'Not Specified';
        genderDistribution[gender] = (genderDistribution[gender] || 0) + 1;
      });
    }

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
      class: formatClassResponse(classData),
      students: {
        total: classData.students?.length || 0,
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
        used: classData.students?.length || 0,
        available: classData.capacity - (classData.students?.length || 0),
        utilization: classData.capacity > 0 
          ? Math.round(((classData.students?.length || 0) / classData.capacity) * 100)
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
// 13. Assign subjects to class
// ──────────────────────────────────────────────────────────────
router.post('/:id/subjects', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    const { subjectIds, isCore = true } = req.body;
    const classId = req.params.id;

    console.log('📚 Assigning subjects to class:', { classId, subjectIds, isCore });

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

    // Add each subject to class
    for (const subjectId of subjectIds) {
      await classData.addSubjectAssignment(subjectId, isCore);
    }

    // Get updated class
    const updatedClass = await Class.findById(classId)
      .populate('subjectAssignments.subject', 'name code category isCore')
      .lean();

    console.log('✅ Subjects assigned to class:', {
      class: updatedClass.name,
      subjects: subjectIds.length
    });

    res.json({
      success: true,
      message: `Successfully assigned ${subjectIds.length} subjects to ${updatedClass.name}`,
      class: formatClassResponse(updatedClass),
      subjectAssignments: updatedClass.subjectAssignments
    });

  } catch (err) {
    console.error('❌ POST /classes/:id/subjects error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to assign subjects to class',
      details: err.message
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

    const updatedClass = await Class.findById(classId)
      .populate('subjectAssignments.subject', 'name code category isCore')
      .lean();

    res.json({
      success: true,
      message: 'Subject removed from class successfully',
      class: formatClassResponse(updatedClass)
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
      class: formatClassResponse(updatedClass)
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
      .select('_id name shortName level fullName')
      .sort({ level: 1, name: 1 })
      .lean();

    res.json({
      success: true,
      classes: classes.map(cls => ({
        id: cls._id,
        _id: cls._id,
        name: cls.name,
        shortName: cls.shortName,
        level: cls.level,
        fullName: cls.fullName || `${cls.name} ${cls.shortName ? `(${cls.shortName})` : ''}`.trim(),
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
          classData.isActive = false;
          
          // Initialize metadata if needed
          if (!classData.metadata) {
            classData.metadata = {
              lastModifiedBy: req.user.id,
              lastModifiedAt: new Date(),
              notes: []
            };
          } else {
            classData.metadata.lastModifiedBy = req.user.id;
            classData.metadata.lastModifiedAt = new Date();
            
            if (!Array.isArray(classData.metadata.notes)) {
              classData.metadata.notes = [];
            }
          }
          
          classData.metadata.notes.push(`Bulk deactivated by ${req.user.username} on ${new Date().toLocaleDateString()}`);
          
          await classData.save();
          
          results.details.push({
            classId,
            success: true,
            message: `Class "${classData.name}" deactivated`,
            className: classData.name
          });
        } else if (action === 'delete' && req.user.role === 'super_admin') {
          // Check if class has students
          if (Array.isArray(classData.students) && classData.students.length > 0) {
            results.details.push({
              classId,
              success: false,
              error: `Cannot delete class with ${classData.students.length} students`
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

    const result = classes.map(formatClassResponse);

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

    res.json({
      success: true,
      class: classData,
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
// 21. GET class availability (for student enrollment)
// ──────────────────────────────────────────────────────────────
router.get('/availability/:level', auth, async (req, res) => {
  try {
    const { level } = req.params;
    
    const classes = await Class.find({ 
      level: level.toUpperCase(),
      isActive: true 
    })
      .select('_id name shortName capacity students')
      .lean();

    const availableClasses = classes.map(cls => ({
      id: cls._id,
      name: cls.name,
      shortName: cls.shortName,
      capacity: cls.capacity,
      enrolled: Array.isArray(cls.students) ? cls.students.length : 0,
      available: cls.capacity - (Array.isArray(cls.students) ? cls.students.length : 0),
      isFull: cls.capacity <= (Array.isArray(cls.students) ? cls.students.length : 0)
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
// 22. TEST ROUTES
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
// 23. RESET class metadata (for fixing corrupted data)
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

    // Reset metadata to clean state
    classData.metadata = {
      lastModifiedBy: req.user.id,
      lastModifiedAt: new Date(),
      notes: [`Metadata reset by ${req.user.username} on ${new Date().toLocaleDateString()}`]
    };
    
    await classData.save();

    console.log('✅ Class metadata reset:', {
      id: classData._id,
      name: classData.name,
      by: req.user.username
    });

    res.json({
      success: true,
      message: 'Class metadata reset successfully',
      class: formatClassResponse(classData.toObject()),
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

console.log('✅ CLASSES ROUTE: All routes defined successfully!');

module.exports = router;
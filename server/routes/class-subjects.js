// routes/class-subjects.js - UPDATED VERSION
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ClassSubject = require('../models/ClassSubject');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { adminOnly, adminOrSuperAdmin, adminOrTeacher } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

console.log('✅ CLASS-SUBJECTS ROUTE: File loaded successfully!');

// Request logging middleware
const logClassSubjectRequest = (req, res, next) => {
  console.log(`📚📘 CLASS-SUBJECTS API - ${req.method} ${req.originalUrl}`, {
    user: req.user?.username,
    role: req.user?.role,
    timestamp: new Date().toISOString()
  });
  next();
};

router.use(logClassSubjectRequest);

// Validation middleware
const validateObjectId = (req, res, next) => {
  if (req.params.classId && !mongoose.Types.ObjectId.isValid(req.params.classId)) {
    return res.status(400).json({
      error: 'Invalid class ID format',
      classId: req.params.classId
    });
  }
  if (req.params.assignmentId && !mongoose.Types.ObjectId.isValid(req.params.assignmentId)) {
    return res.status(400).json({
      error: 'Invalid assignment ID format',
      assignmentId: req.params.assignmentId
    });
  }
  next();
};

// ──────────────────────────────────────────────────────────────
// 1. GET all subjects for a class
// ──────────────────────────────────────────────────────────────
router.get('/class/:classId', auth, validateObjectId, async (req, res) => {
  try {
    const { classId } = req.params;

    // Verify class exists
    const classData = await Class.findById(classId).lean();
    if (!classData) {
      return res.status(404).json({ 
        error: 'Class not found', 
        classId 
      });
    }

    const assignments = await ClassSubject.find({ class: classId })
      .populate('subject')
      .populate('teacher', 'firstName lastName username email')
      .sort({ isCompulsory: -1, displayOrder: 1 });

    const response = assignments.map(a => ({
      id: a._id,
      subject: a.subject ? {
        id: a.subject._id,
        name: a.subject.name,
        code: a.subject.code,
        category: a.subject.category,
        description: a.subject.description,
        displayName: a.subject.displayName || a.subject.name
      } : null,
      teacher: a.teacher ? {
        id: a.teacher._id,
        name: `${a.teacher.firstName} ${a.teacher.lastName}`.trim(),
        email: a.teacher.email,
        username: a.teacher.username
      } : null,
      isCompulsory: a.isCompulsory,
      periodCount: a.periodCount,
      hoursPerWeek: a.hoursPerWeek,
      room: a.room,
      academicYear: a.academicYear,
      displayOrder: a.displayOrder,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt
    }));

    res.json({
      class: {
        id: classData._id,
        name: classData.name,
        shortName: classData.shortName,
        level: classData.level,
        stream: classData.stream,
        fullName: classData.fullName || `${classData.level}${classData.stream ? ` ${classData.stream}` : ''}`
      },
      subjects: response,
      summary: {
        totalSubjects: response.length,
        compulsory: response.filter(s => s.isCompulsory).length,
        elective: response.filter(s => !s.isCompulsory).length,
        assignedTeachers: response.filter(s => s.teacher).length
      },
      message: `Found ${response.length} subjects for ${classData.shortName || classData.name}`
    });

  } catch (err) {
    console.error('❌ GET /class-subjects/class/:classId error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch class subjects',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 2. ASSIGN subjects to class (bulk)
// ──────────────────────────────────────────────────────────────
router.post('/class/:classId/bulk', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    const { classId } = req.params;
    const { subjectIds, isCompulsory = true } = req.body;

    console.log('📚📘 POST /class-subjects/class/:classId/bulk', {
      classId,
      subjectCount: subjectIds?.length,
      isCompulsory
    });

    // Verify class exists
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ 
        error: 'Class not found', 
        classId 
      });
    }

    // Validate subjectIds
    if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
      return res.status(400).json({
        error: 'subjectIds must be a non-empty array'
      });
    }

    // Verify subjects exist
    const subjects = await Subject.find({ _id: { $in: subjectIds } });
    if (subjects.length !== subjectIds.length) {
      const foundIds = subjects.map(s => s._id.toString());
      const missingIds = subjectIds.filter(id => !foundIds.includes(id));
      return res.status(404).json({ 
        error: 'Some subjects not found',
        missingSubjects: missingIds
      });
    }

    // Remove existing assignments for this class
    await ClassSubject.deleteMany({ class: classId });
    console.log(`🗑️  Cleared existing assignments for class ${classId}`);

    // Create new assignments
    const assignments = subjectIds.map(subjectId => ({
      class: classId,
      subject: subjectId,
      isCompulsory: Array.isArray(isCompulsory) 
        ? isCompulsory.includes(subjectId)
        : isCompulsory,
      periodCount: 3,
      academicYear: classData.academicYear || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`
    }));

    const results = await ClassSubject.insertMany(assignments);
    console.log(`✅ Created ${results.length} new assignments`);

    // Populate results for response
    const populatedResults = await ClassSubject.find({ class: classId })
      .populate('subject', 'name code category')
      .populate('teacher', 'firstName lastName username')
      .sort({ isCompulsory: -1, displayOrder: 1 });

    console.log('✅ Subjects assigned to class:', {
      class: classData.name,
      subjects: subjectIds.length,
      classId: classId
    });

    res.status(201).json({
      message: `Successfully assigned ${subjectIds.length} subjects to ${classData.name}`,
      assignments: populatedResults.map(a => ({
        id: a._id,
        subject: a.subject,
        teacher: a.teacher,
        isCompulsory: a.isCompulsory,
        periodCount: a.periodCount,
        room: a.room,
        academicYear: a.academicYear
      })),
      class: {
        id: classData._id,
        name: classData.name,
        shortName: classData.shortName
      }
    });

  } catch (err) {
    console.error('❌ POST /class-subjects/class/:classId/bulk error:', err);
    
    if (err.code === 11000) {
      return res.status(409).json({
        error: 'Duplicate assignment detected',
        details: 'Some subjects are already assigned to this class'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to assign subjects to class',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 3. CREATE single subject assignment
// ──────────────────────────────────────────────────────────────
router.post('/class/:classId/subject/:subjectId', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    const { classId, subjectId } = req.params;
    const { isCompulsory = true, periodCount = 3, teacherId, room } = req.body;

    // Verify class exists
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Verify subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Verify teacher exists (if provided)
    if (teacherId) {
      const teacher = await User.findById(teacherId);
      if (!teacher || teacher.role !== 'teacher') {
        return res.status(400).json({ 
          error: 'Invalid teacher. User must be a teacher.',
          teacherId 
        });
      }
    }

    // Check if assignment already exists
    const existingAssignment = await ClassSubject.findOne({ 
      class: classId, 
      subject: subjectId 
    });
    
    if (existingAssignment) {
      return res.status(409).json({
        error: 'Subject already assigned to this class',
        assignment: existingAssignment
      });
    }

    // Create new assignment
    const assignment = new ClassSubject({
      class: classId,
      subject: subjectId,
      isCompulsory,
      periodCount,
      teacher: teacherId || null,
      room: room || null,
      academicYear: classData.academicYear || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`
    });

    await assignment.save();
    
    // Add to class's subjects array
    if (!classData.subjects.includes(assignment._id)) {
      classData.subjects.push(assignment._id);
      await classData.save();
    }

    // Populate for response
    await assignment.populate('subject');
    await assignment.populate('teacher', 'firstName lastName');

    console.log('✅ Subject assigned to class:', {
      class: classData.name,
      subject: subject.name,
      assignmentId: assignment._id
    });

    res.status(201).json({
      message: 'Subject assigned to class successfully',
      assignment: assignment.apiResponse,
      class: {
        id: classData._id,
        name: classData.name,
        subjectCount: classData.subjects.length
      }
    });

  } catch (err) {
    console.error('POST /class-subjects/class/:classId/subject/:subjectId error:', err);
    res.status(500).json({ 
      error: 'Failed to assign subject to class',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 4. UPDATE subject assignment
// ──────────────────────────────────────────────────────────────
router.put('/assignment/:assignmentId', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { isCompulsory, periodCount, teacherId, room, displayOrder } = req.body;

    const updates = {};
    if (isCompulsory !== undefined) updates.isCompulsory = isCompulsory;
    if (periodCount !== undefined) updates.periodCount = periodCount;
    if (teacherId !== undefined) updates.teacher = teacherId;
    if (room !== undefined) updates.room = room;
    if (displayOrder !== undefined) updates.displayOrder = displayOrder;

    // Verify teacher exists (if provided)
    if (teacherId) {
      const teacher = await User.findById(teacherId);
      if (!teacher || teacher.role !== 'teacher') {
        return res.status(400).json({ 
          error: 'Invalid teacher. User must be a teacher.',
          teacherId 
        });
      }
    }

    const assignment = await ClassSubject.findByIdAndUpdate(
      assignmentId,
      updates,
      { new: true, runValidators: true }
    )
      .populate('subject')
      .populate('teacher', 'firstName lastName')
      .populate('class', 'name shortName');

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    console.log('✅ Assignment updated:', {
      assignmentId,
      class: assignment.class.name,
      subject: assignment.subject.name
    });

    res.json({
      message: 'Assignment updated successfully',
      assignment: assignment.apiResponse
    });

  } catch (err) {
    console.error('PUT /class-subjects/assignment/:assignmentId error:', err);
    res.status(500).json({ 
      error: 'Failed to update assignment',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 5. REMOVE subject from class
// ──────────────────────────────────────────────────────────────
router.delete('/assignment/:assignmentId', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await ClassSubject.findById(assignmentId)
      .populate('class', 'name shortName')
      .populate('subject', 'name');

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Remove from class's subjects array
    const classData = await Class.findById(assignment.class._id);
    if (classData) {
      classData.subjects = classData.subjects.filter(
        id => id.toString() !== assignmentId.toString()
      );
      await classData.save();
    }

    await ClassSubject.findByIdAndDelete(assignmentId);

    console.log('✅ Assignment removed:', {
      assignmentId,
      class: assignment.class.name,
      subject: assignment.subject.name
    });

    res.json({
      message: 'Subject successfully removed from class',
      deletedAssignment: {
        id: assignment._id,
        class: assignment.class.name,
        subject: assignment.subject.name
      }
    });

  } catch (err) {
    console.error('DELETE /class-subjects/assignment/:assignmentId error:', err);
    res.status(500).json({ 
      error: 'Failed to remove subject from class',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 6. GET assignments by teacher
// ──────────────────────────────────────────────────────────────
router.get('/teacher/:teacherId', auth, validateObjectId, async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Verify teacher exists
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ 
        error: 'Teacher not found',
        teacherId 
      });
    }

    const assignments = await ClassSubject.find({ teacher: teacherId })
      .populate('class', 'name shortName level')
      .populate('subject', 'name code category')
      .sort({ 'class.level': 1, 'class.name': 1 });

    const response = assignments.map(a => ({
      id: a._id,
      class: a.class,
      subject: a.subject,
      isCompulsory: a.isCompulsory,
      periodCount: a.periodCount,
      room: a.room,
      academicYear: a.academicYear
    }));

    res.json({
      teacher: {
        id: teacher._id,
        name: `${teacher.firstName} ${teacher.lastName}`.trim(),
        username: teacher.username
      },
      assignments: response,
      summary: {
        totalAssignments: response.length,
        totalPeriods: response.reduce((sum, a) => sum + (a.periodCount || 0), 0),
        uniqueClasses: [...new Set(response.map(a => a.class._id.toString()))].length,
        uniqueSubjects: [...new Set(response.map(a => a.subject._id.toString()))].length
      }
    });

  } catch (err) {
    console.error('GET /class-subjects/teacher/:teacherId error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch teacher assignments',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 7. GET unassigned subjects for a class
// ──────────────────────────────────────────────────────────────
router.get('/class/:classId/unassigned', auth, validateObjectId, async (req, res) => {
  try {
    const { classId } = req.params;

    // Get all subjects
    const allSubjects = await Subject.find({ isActive: true }).sort({ name: 1 });
    
    // Get already assigned subject IDs for this class
    const assignedSubjects = await ClassSubject.find({ class: classId })
      .select('subject')
      .lean();
    
    const assignedSubjectIds = assignedSubjects.map(a => a.subject.toString());
    
    // Filter out already assigned subjects
    const unassignedSubjects = allSubjects.filter(
      subject => !assignedSubjectIds.includes(subject._id.toString())
    );

    res.json({
      classId,
      unassignedSubjects: unassignedSubjects.map(s => ({
        id: s._id,
        name: s.name,
        code: s.code,
        category: s.category,
        description: s.description
      })),
      total: unassignedSubjects.length,
      assignedCount: assignedSubjectIds.length,
      totalSubjects: allSubjects.length
    });

  } catch (err) {
    console.error('GET /class-subjects/class/:classId/unassigned error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch unassigned subjects',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 8. ASSIGN teacher to subject in class
// ──────────────────────────────────────────────────────────────
router.post('/assignment/:assignmentId/teacher', auth, adminOrSuperAdmin, validateObjectId, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { teacherId } = req.body;

    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId is required' });
    }

    // Verify teacher exists
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ 
        error: 'Teacher not found',
        teacherId 
      });
    }

    const assignment = await ClassSubject.findByIdAndUpdate(
      assignmentId,
      { teacher: teacherId },
      { new: true }
    )
      .populate('subject')
      .populate('class', 'name')
      .populate('teacher', 'firstName lastName');

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    console.log('✅ Teacher assigned to subject:', {
      assignmentId,
      teacher: teacher.username,
      subject: assignment.subject.name,
      class: assignment.class.name
    });

    res.json({
      message: 'Teacher assigned successfully',
      assignment: assignment.apiResponse
    });

  } catch (err) {
    console.error('POST /class-subjects/assignment/:assignmentId/teacher error:', err);
    res.status(500).json({ 
      error: 'Failed to assign teacher',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 9. TEST ROUTES
// ──────────────────────────────────────────────────────────────
router.get('/test', (req, res) => {
  console.log('✅ GET /api/class-subjects/test - Test route hit');
  res.json({ 
    message: 'Class-Subjects route is working!', 
    timestamp: new Date().toISOString(),
    status: 'SUCCESS'
  });
});

router.get('/health', (req, res) => {
  console.log('✅ GET /api/class-subjects/health - Health check');
  res.json({
    status: 'OK',
    message: 'Class-Subjects route is healthy',
    timestamp: new Date().toISOString()
  });
});

// ──────────────────────────────────────────────────────────────
// 10. GET all class-subject assignments (Admin only)
// ──────────────────────────────────────────────────────────────
router.get('/', auth, adminOrSuperAdmin, async (req, res) => {
  try {
    const assignments = await ClassSubject.find()
      .populate('class', 'name shortName level')
      .populate('subject', 'name code')
      .populate('teacher', 'firstName lastName username')
      .sort({ 'class.level': 1, 'class.name': 1, 'subject.name': 1 })
      .lean();

    res.json({
      assignments: assignments.map(a => ({
        id: a._id,
        class: a.class,
        subject: a.subject,
        teacher: a.teacher,
        isCompulsory: a.isCompulsory,
        periodCount: a.periodCount,
        room: a.room,
        academicYear: a.academicYear
      })),
      total: assignments.length,
      summary: {
        withTeachers: assignments.filter(a => a.teacher).length,
        compulsory: assignments.filter(a => a.isCompulsory).length,
        elective: assignments.filter(a => !a.isCompulsory).length
      }
    });

  } catch (err) {
    console.error('GET /class-subjects error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch all assignments',
      details: err.message
    });
  }
});

console.log('✅ CLASS-SUBJECTS ROUTE: All routes defined successfully!');

module.exports = router;
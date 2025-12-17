const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Class = require('../models/Class');
const Test = require('../models/Test');
const Result = require('../models/Result');
const Subject = require('../models/Subject');
const { auth } = require('../middleware/auth');

// ========== SIMPLE TEACHER CLASSES ENDPOINT ==========
router.get('/teachers/classes', auth, async (req, res) => {
  try {
    console.log('📚 GET /api/users/teachers/classes - Teacher:', {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role
    });

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Only teachers can access this endpoint'
      });
    }

    const teacher = await User.findById(req.user.id)
      .select('teacherAssignments name surname username email')
      .populate('teacherAssignments.class', 'name level shortName code')
      .populate('teacherAssignments.subjects.subject', 'name code');

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
          username: teacher.username,
          email: teacher.email
        },
        classes: [],
        message: 'No classes assigned to this teacher'
      });
    }

    const classes = [];
    const classMap = new Map();

    teacherAssignments.forEach((assignment, index) => {
      if (assignment.class) {
        const classId = assignment.class._id.toString();
        
        if (!classMap.has(classId)) {
          const subjects = assignment.subjects?.map(sub => ({
            id: sub.subject?._id || sub.subject,
            name: sub.subjectName || sub.subject?.name || 'Unknown Subject',
            code: sub.subject?.code || 'N/A'
          })) || [];

          classMap.set(classId, true);
          
          classes.push({
            id: assignment.class._id,
            name: assignment.className || assignment.class.name,
            level: assignment.class.level,
            shortName: assignment.class.shortName,
            code: assignment.class.code,
            subjects: subjects,
            subjectCount: subjects.length,
            assignmentIndex: index + 1
          });
        } else {
          const existingClassIndex = classes.findIndex(c => c.id.toString() === classId);
          if (existingClassIndex !== -1 && assignment.subjects) {
            assignment.subjects.forEach(sub => {
              const subjectExists = classes[existingClassIndex].subjects.some(
                s => s.id.toString() === (sub.subject?._id || sub.subject).toString()
              );
              if (!subjectExists) {
                classes[existingClassIndex].subjects.push({
                  id: sub.subject?._id || sub.subject,
                  name: sub.subjectName || sub.subject?.name || 'Unknown Subject',
                  code: sub.subject?.code || 'N/A'
                });
                classes[existingClassIndex].subjectCount++;
              }
            });
          }
        }
      }
    });

    const classesWithStudents = await Promise.all(
      classes.map(async (cls) => {
        const classDoc = await Class.findById(cls.id).select('students');
        return {
          ...cls,
          studentCount: classDoc?.students?.length || 0,
          subjectsText: cls.subjects.map(s => s.name).join(', ')
        };
      })
    );

    console.log('Sending response with', classesWithStudents.length, 'classes');
    
    res.json({
      success: true,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        surname: teacher.surname,
        username: teacher.username,
        email: teacher.email
      },
      classes: classesWithStudents,
      summary: {
        totalClasses: classesWithStudents.length,
        totalSubjects: classesWithStudents.reduce((sum, cls) => sum + cls.subjectCount, 0),
        totalStudents: classesWithStudents.reduce((sum, cls) => sum + cls.studentCount, 0)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ GET /api/users/teachers/classes error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching teacher classes',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========== TEST ENDPOINT ==========
router.get('/teachers/test', auth, (req, res) => {
  console.log('✅ Test endpoint called by:', req.user);
  res.json({
    success: true,
    message: 'Teacher routes are working!',
    user: {
      id: req.user.id,
      role: req.user.role,
      username: req.user.username,
      name: req.user.name
    },
    timestamp: new Date().toISOString()
  });
});

// ========== PUBLIC TEST ENDPOINT ==========
router.get('/test-public', (req, res) => {
  res.json({
    success: true,
    message: 'Public test endpoint is working!',
    timestamp: new Date().toISOString()
  });
});

// Get teacher's assignments
router.get('/teachers/:teacherId/assignments', auth, async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    console.log('👨‍🏫 GET /api/users/teachers/:teacherId/assignments - Request:', {
      teacherId,
      requesterId: req.user?.id,
      requesterRole: req.user?.role
    });

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid teacher ID format'
      });
    }

    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    const isSelf = req.user?.id === teacherId;
    
    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own assignments'
      });
    }

    const teacher = await User.findById(teacherId)
      .select('teacherAssignments name surname username')
      .populate('teacherAssignments.class', 'name level')
      .populate('teacherAssignments.subjects.subject', 'name code');

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
        assignments: [],
        message: 'No assignments found for this teacher'
      });
    }

    const assignments = teacherAssignments.map(assignment => {
      const subjects = assignment.subjects?.map(sub => ({
        id: sub.subject?._id || sub.subject,
        name: sub.subjectName || sub.subject?.name || 'Unknown Subject',
        code: sub.subject?.code || 'N/A'
      })) || [];

      return {
        class: {
          id: assignment.class?._id || assignment.class,
          name: assignment.className || assignment.class?.name || 'Unknown Class',
          level: assignment.class?.level || 'Unknown'
        },
        subjects,
        assignedAt: assignment.assignedAt || new Date(),
        subjectCount: subjects.length
      };
    });

    const tests = await Test.find({ 
      createdBy: teacherId,
      isActive: true 
    }).select('title subject class status createdAt duration').lean();

    const recentResults = await Result.find({ 
      subject: { $in: assignments.flatMap(a => a.subjects.map(s => s.name)) },
      isActive: true
    })
      .populate('userId', 'name surname')
      .populate('testId', 'title')
      .sort({ submittedAt: -1 })
      .limit(5)
      .lean();

    res.json({
      success: true,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        surname: teacher.surname,
        username: teacher.username
      },
      assignments,
      tests: {
        total: tests.length,
        draft: tests.filter(t => t.status === 'draft').length,
        scheduled: tests.filter(t => t.status === 'scheduled').length,
        active: tests.filter(t => t.status === 'active').length,
        completed: tests.filter(t => t.status === 'completed').length
      },
      recentResults: recentResults.map(r => ({
        id: r._id,
        student: r.userId ? `${r.userId.name} ${r.userId.surname}` : 'Unknown',
        test: r.testId?.title || 'Unknown',
        score: r.score || 0,
        totalMarks: r.totalMarks || 0,
        percentage: r.percentage || 0,
        submittedAt: r.submittedAt
      })),
      summary: {
        totalClasses: new Set(assignments.map(a => a.class.id.toString())).size,
        totalSubjects: assignments.reduce((sum, a) => sum + a.subjectCount, 0),
        totalTests: tests.length,
        totalResults: recentResults.length
      }
    });

  } catch (error) {
    console.error('❌ GET /api/users/teachers/:teacherId/assignments error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching teacher assignments',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get teacher's dashboard data
router.get('/teachers/:teacherId/dashboard', auth, async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    console.log('📊 GET /api/users/teachers/:teacherId/dashboard - Request:', {
      teacherId,
      requesterId: req.user?.id,
      requesterRole: req.user?.role
    });

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid teacher ID format'
      });
    }

    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    const isSelf = req.user?.id === teacherId;
    
    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own dashboard'
      });
    }

    const teacher = await User.findById(teacherId)
      .select('teacherAssignments name surname username')
      .populate('teacherAssignments.class', 'name level');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: 'Teacher not found'
      });
    }

    const teacherAssignments = teacher.teacherAssignments || [];
    
    const [tests, results] = await Promise.all([
      Test.find({
        createdBy: teacherId,
        isActive: true
      }).select('status createdAt').lean(),
      
      Result.find({ 
        $or: teacherAssignments.map(assignment => {
          if (assignment.subjects) {
            return assignment.subjects.map(sub => ({
              subject: sub.subjectName || 'Unknown'
            }));
          }
          return [];
        }).flat()
      })
      .select('score submittedAt')
      .lean()
    ]);

    const testStats = {
      total: tests.length,
      draft: tests.filter(t => t.status === 'draft').length,
      scheduled: tests.filter(t => t.status === 'scheduled').length,
      active: tests.filter(t => t.status === 'active').length,
      completed: tests.filter(t => t.status === 'completed').length
    };

    const resultStats = {
      total: results.length,
      averageScore: results.length > 0 
        ? (results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length).toFixed(2)
        : 0,
      recentCount: results.filter(r => 
        new Date(r.submittedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length
    };

    const uniqueClasses = new Set();
    const uniqueSubjects = new Set();
    
    teacherAssignments.forEach(assignment => {
      if (assignment.class) {
        uniqueClasses.add(assignment.className || assignment.class.name);
      }
      if (assignment.subjects) {
        assignment.subjects.forEach(sub => {
          if (sub.subjectName) {
            uniqueSubjects.add(sub.subjectName);
          }
        });
      }
    });

    res.json({
      success: true,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        surname: teacher.surname,
        username: teacher.username
      },
      overview: {
        classes: uniqueClasses.size,
        subjects: uniqueSubjects.size,
        totalAssignments: teacherAssignments.length
      },
      tests: testStats,
      results: resultStats,
      recentActivity: {
        lastTestCreated: tests.length > 0 
          ? tests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]?.createdAt
          : null,
        lastResultSubmitted: results.length > 0 
          ? results.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0]?.submittedAt
          : null
      }
    });

  } catch (error) {
    console.error('❌ GET /api/users/teachers/:teacherId/dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching teacher dashboard',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Assign subjects to teacher
router.post('/teachers/:teacherId/assign-subjects', auth, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { classId, subjectIds } = req.body;

    console.log('📝 POST /api/users/teachers/:teacherId/assign-subjects - Request:', {
      teacherId,
      classId,
      subjectIds,
      requesterId: req.user?.id,
      requesterRole: req.user?.role
    });

    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    const isSelf = req.user?.id === teacherId;
    
    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to assign subjects'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid teacher ID'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID'
      });
    }

    if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Subject IDs must be a non-empty array'
      });
    }

    for (const subjectId of subjectIds) {
      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({
          success: false,
          error: `Invalid subject ID: ${subjectId}`
        });
      }
    }

    const teacher = await User.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: 'Teacher not found'
      });
    }

    if (teacher.role !== 'teacher') {
      return res.status(400).json({
        success: false,
        error: 'User is not a teacher'
      });
    }

    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }

    const subjects = await Subject.find({ _id: { $in: subjectIds } });
    if (subjects.length !== subjectIds.length) {
      return res.status(400).json({
        success: false,
        error: 'One or more subjects not found'
      });
    }

    const existingAssignmentIndex = teacher.teacherAssignments.findIndex(
      a => a.class.toString() === classId.toString()
    );

    const newSubjects = subjectIds.map(subjectId => {
      const subject = subjects.find(s => s._id.toString() === subjectId.toString());
      return {
        subject: subjectId,
        subjectName: subject.name,
        assignedAt: new Date()
      };
    });

    if (existingAssignmentIndex !== -1) {
      const existingSubjects = teacher.teacherAssignments[existingAssignmentIndex].subjects || [];
      
      newSubjects.forEach(newSubject => {
        const exists = existingSubjects.some(
          s => s.subject.toString() === newSubject.subject.toString()
        );
        if (!exists) {
          existingSubjects.push(newSubject);
        }
      });
      
      teacher.teacherAssignments[existingAssignmentIndex].subjects = existingSubjects;
      teacher.teacherAssignments[existingAssignmentIndex].className = classDoc.name;
      teacher.teacherAssignments[existingAssignmentIndex].assignedAt = new Date();
    } else {
      teacher.teacherAssignments.push({
        class: classId,
        className: classDoc.name,
        subjects: newSubjects,
        assignedAt: new Date()
      });
    }

    await teacher.save();

    res.json({
      success: true,
      message: 'Subjects assigned successfully',
      assignment: {
        class: {
          id: classDoc._id,
          name: classDoc.name,
          level: classDoc.level
        },
        subjects: newSubjects.map(s => ({
          id: s.subject,
          name: s.subjectName
        })),
        assignedAt: new Date()
      }
    });

  } catch (error) {
    console.error('❌ POST /api/users/teachers/:teacherId/assign-subjects error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error assigning subjects',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
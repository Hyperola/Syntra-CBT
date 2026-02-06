// routes/users.js - UPDATED WITH COMPLETE TEACHER MANAGEMENT AND BASE64 IMAGE HANDLING
const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Permission = require('../models/Permission');
const RolePermission = require('../models/RolePermission');
const Result = require('../models/Result'); // Added Result model
const Feedback = require('../models/ParentFeedback'); // Added Feedback model
const Test = require('../models/Test'); // Added Test model
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

const router = express.Router();

// Input validation middleware
const validateUserInput = (req, res, next) => {
  const { firstName, lastName, username, role } = req.body;
  
  if (!firstName || !lastName || !username || !role) {
    return res.status(400).json({ 
      success: false,
      message: 'First name, last name, username, and role are required' 
    });
  }
  
  if (req.method === 'POST' && !req.body.password) {
    return res.status(400).json({ 
      success: false,
      message: 'Password is required for new users' 
    });
  }
  
  const validRoles = ['super_admin', 'admin', 'teacher', 'student', 'parent'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ 
      success: false,
      message: 'Invalid role specified' 
    });
  }
  
  next();
};

// Helper function to clean and validate username
const cleanUsername = (username) => {
  if (!username) return '';
  const cleaned = username.replace(/\s+/g, '_').toLowerCase();
  return cleaned.replace(/[^a-zA-Z0-9_]/g, '');
};

// Helper function to get class name
const getClassName = async (classId) => {
  if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
    return null;
  }
  
  try {
    const classDoc = await Class.findById(classId).select('name').lean();
    return classDoc ? classDoc.name : null;
  } catch (error) {
    console.log('Error getting class name:', error.message);
    return null;
  }
};

// Helper function to handle base64 image
const handleBase64Image = async (base64Data, userId, isUpdate = false, user = null) => {
  try {
    if (!base64Data || !base64Data.startsWith('data:image')) {
      return null;
    }

    console.log('📸 Processing base64 image for user:', userId);
    
    // Extract base64 data
    const matches = base64Data.match(/^data:image\/(\w+);base64,/);
    if (!matches || matches.length < 2) {
      throw new Error('Invalid base64 image format');
    }
    
    const mimeType = matches[1];
    const extension = mimeType === 'jpeg' ? 'jpg' : mimeType;
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Image, 'base64');
    
    // Generate filename with user ID - FIXED: Always use the provided userId
    const fileName = `profile_${userId}_${Date.now()}.${extension}`;
    const uploadDir = path.join(__dirname, '../../uploads/profiles');
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Delete old image if updating
    if (isUpdate && user && user.profileImage) {
      const oldPath = path.join(uploadDir, user.profileImage);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
    
    // Save new image
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);
    
    console.log('✅ Base64 image saved to:', filePath);
    return fileName;
    
  } catch (imageError) {
    console.error('❌ Error saving base64 image:', imageError.message);
    return null;
  }
};

// Add adminAuth middleware (from your auth.js file)
const adminAuth = (req, res, next) => {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// ============================================================
// TEACHER-SPECIFIC ENDPOINTS
// ============================================================

// Get all teachers (for dropdowns and assignment)
router.get('/teachers/list', auth, async (req, res) => {
  try {
    console.log('👨‍🏫 GET /api/users/teachers/list - Fetching all teachers');
    
    const teachers = await User.find({ 
      role: 'teacher',
      active: true 
    })
      .select('_id firstName lastName middleName username email phone specialization qualifications profileImage')
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    // Format for dropdowns
    const formattedTeachers = teachers.map(teacher => ({
      id: teacher._id,
      _id: teacher._id,
      name: `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim(),
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      middleName: teacher.middleName,
      username: teacher.username,
      email: teacher.email,
      phone: teacher.phone || '',
      profileImage: teacher.profileImage,
      displayName: `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.username,
      specialization: teacher.specialization || 'General',
      qualifications: teacher.qualifications || []
    }));

    console.log('✅ Teachers fetched:', formattedTeachers.length);

    res.json({
      success: true,
      teachers: formattedTeachers,
      total: formattedTeachers.length
    });
  } catch (err) {
    console.error('❌ GET /users/teachers/list error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teachers',
      error: err.message
    });
  }
});

// Get teachers with their current assignments
router.get('/teachers/with-assignments', auth, async (req, res) => {
  try {
    console.log('👨‍🏫 GET /api/users/teachers/with-assignments - Fetching teachers with assignments');
    
    const teachers = await User.find({ 
      role: 'teacher',
      active: true 
    })
      .populate({
        path: 'teacherAssignments.class',
        select: 'name shortName level',
        model: 'Class'
      })
      .populate({
        path: 'teacherAssignments.subjects.subject',
        select: 'name code category',
        model: 'Subject'
      })
      .select('_id firstName lastName middleName username email phone teacherAssignments profileImage')
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    // Calculate statistics for each teacher
    const teachersWithStats = teachers.map(teacher => {
      const totalClasses = teacher.teacherAssignments?.length || 0;
      const totalSubjects = teacher.teacherAssignments?.reduce(
        (sum, assignment) => sum + (assignment.subjects?.length || 0), 
        0
      ) || 0;

      // Get unique classes and subjects
      const uniqueClasses = new Set();
      const uniqueSubjects = new Set();
      
      teacher.teacherAssignments?.forEach(assignment => {
        if (assignment.class) {
          uniqueClasses.add(assignment.class._id.toString());
        }
        assignment.subjects?.forEach(subjectItem => {
          if (subjectItem.subject) {
            uniqueSubjects.add(subjectItem.subject._id.toString());
          }
        });
      });

      return {
        ...teacher,
        name: `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.username,
        profileImage: teacher.profileImage,
        stats: {
          totalClasses,
          totalSubjects,
          uniqueClasses: uniqueClasses.size,
          uniqueSubjects: uniqueSubjects.size
        }
      };
    });

    console.log('✅ Teachers with assignments fetched:', teachersWithStats.length);

    res.json({
      success: true,
      teachers: teachersWithStats,
      summary: {
        totalTeachers: teachersWithStats.length,
        totalClasses: teachersWithStats.reduce((sum, t) => sum + t.stats.totalClasses, 0),
        totalSubjects: teachersWithStats.reduce((sum, t) => sum + t.stats.totalSubjects, 0),
        averageClassesPerTeacher: (teachersWithStats.reduce((sum, t) => sum + t.stats.totalClasses, 0) / teachersWithStats.length).toFixed(1),
        averageSubjectsPerTeacher: (teachersWithStats.reduce((sum, t) => sum + t.stats.totalSubjects, 0) / teachersWithStats.length).toFixed(1)
      }
    });
  } catch (err) {
    console.error('❌ GET /users/teachers/with-assignments error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teachers with assignments',
      error: err.message
    });
  }
});

// Get available teachers for a class and subject
router.get('/teachers/available/:classId/:subjectId', auth, async (req, res) => {
  try {
    const { classId, subjectId } = req.params;

    console.log('👨‍🏫 GET /api/users/teachers/available/:classId/:subjectId - Available teachers for subject:', {
      classId,
      subjectId
    });

    // Verify class and subject exist
    const classData = await Class.findById(classId).populate('subjectAssignments.subject');
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    const subjectExists = classData.subjectAssignments?.some(
      assignment => assignment.subject?._id.toString() === subjectId
    );
    
    if (!subjectExists) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found in this class'
      });
    }

    // Get all teachers
    const allTeachers = await User.find({ 
      role: 'teacher',
      active: true 
    })
      .select('_id firstName lastName username email phone specialization qualifications teacherAssignments profileImage')
      .lean();

    // Get teachers who are already assigned to this subject
    const assignedTeachers = [];
    const availableTeachers = [];

    for (const teacher of allTeachers) {
      const teachesSubject = teacher.teacherAssignments?.some(assignment => 
        assignment.class?.toString() === classId &&
        assignment.subjects?.some(subjectItem => subjectItem.subject?.toString() === subjectId)
      );

      if (teachesSubject) {
        assignedTeachers.push({
          id: teacher._id,
          name: `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.username,
          username: teacher.username,
          email: teacher.email,
          phone: teacher.phone || 'N/A',
          profileImage: teacher.profileImage,
          specialization: teacher.specialization || 'General',
          qualifications: teacher.qualifications || []
        });
      } else {
        // Count current assignments
        const currentAssignments = teacher.teacherAssignments?.length || 0;
        const currentSubjects = teacher.teacherAssignments?.reduce(
          (sum, assignment) => sum + (assignment.subjects?.length || 0), 
          0
        ) || 0;

        availableTeachers.push({
          id: teacher._id,
          name: `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.username,
          username: teacher.username,
          email: teacher.email,
          phone: teacher.phone || 'N/A',
          profileImage: teacher.profileImage,
          specialization: teacher.specialization || 'General',
          qualifications: teacher.qualifications || [],
          currentAssignments,
          currentSubjects,
          workload: currentSubjects > 10 ? 'High' : currentSubjects > 5 ? 'Medium' : 'Low'
        });
      }
    }

    console.log('✅ Available teachers fetched:', {
      class: classData.name,
      totalTeachers: allTeachers.length,
      assigned: assignedTeachers.length,
      available: availableTeachers.length
    });

    res.json({
      success: true,
      class: {
        id: classData._id,
        name: classData.name,
        level: classData.level
      },
      subject: {
        id: subjectId,
        name: classData.subjectAssignments?.find(a => a.subject?._id.toString() === subjectId)?.subject?.name || 'Unknown'
      },
      assignedTeachers,
      availableTeachers,
      summary: {
        total: allTeachers.length,
        assigned: assignedTeachers.length,
        available: availableTeachers.length
      }
    });
  } catch (err) {
    console.error('❌ GET /users/teachers/available/:classId/:subjectId error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available teachers',
      error: err.message
    });
  }
});

// Bulk assign teachers to subjects
router.post('/teachers/bulk-assign', auth, checkPermission('manage_users'), async (req, res) => {
  try {
    const { assignments } = req.body; // Array of { teacherId, classId, subjectIds[] }

    console.log('👨‍🏫 POST /api/users/teachers/bulk-assign - Bulk assigning teachers:', {
      assignmentCount: assignments?.length
    });

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Assignments array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const assignment of assignments) {
      const { teacherId, classId, subjectIds } = assignment;

      try {
        // Verify teacher exists
        const teacher = await User.findById(teacherId);
        if (!teacher || teacher.role !== 'teacher') {
          errors.push({
            teacherId,
            error: 'Teacher not found'
          });
          continue;
        }

        // Verify class exists
        const classExists = await Class.exists({ _id: classId });
        if (!classExists) {
          errors.push({
            teacherId,
            classId,
            error: 'Class not found'
          });
          continue;
        }

        // Verify subjects exist and are assigned to the class
        const classData = await Class.findById(classId).populate('subjectAssignments.subject');
        const classSubjectIds = classData.subjectAssignments.map(a => a.subject._id.toString());
        
        const invalidSubjects = subjectIds.filter(
          subjectId => !classSubjectIds.includes(subjectId.toString())
        );
        
        if (invalidSubjects.length > 0) {
          errors.push({
            teacherId,
            classId,
            error: 'Some subjects are not assigned to this class',
            invalidSubjects
          });
          continue;
        }

        // Assign subjects to teacher
        await teacher.addTeacherAssignment(classId, subjectIds);

        results.push({
          teacherId,
          teacherName: `${teacher.firstName} ${teacher.lastName}`.trim(),
          classId,
          classData: classData.name,
          subjectsAssigned: subjectIds.length,
          success: true
        });

      } catch (err) {
        errors.push({
          teacherId: assignment.teacherId,
          classId: assignment.classId,
          error: err.message
        });
      }
    }

    console.log('✅ Bulk assignment completed:', {
      successful: results.length,
      failed: errors.length
    });

    res.json({
      success: true,
      message: `Bulk assignment completed: ${results.length} successful, ${errors.length} failed`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error('❌ POST /users/teachers/bulk-assign error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk assign teachers',
      error: err.message
    });
  }
});

// Remove teacher from all assignments
router.delete('/teachers/:teacherId/clear-assignments', auth, checkPermission('manage_users'), async (req, res) => {
  try {
    const { teacherId } = req.params;

    console.log('👨‍🏫 DELETE /api/users/teachers/:teacherId/clear-assignments - Clearing all assignments for teacher:', teacherId);

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Count assignments before clearing
    const assignmentCount = teacher.teacherAssignments?.length || 0;
    const subjectCount = teacher.teacherAssignments?.reduce(
      (sum, assignment) => sum + (assignment.subjects?.length || 0), 
      0
    ) || 0;

    // Clear assignments
    teacher.teacherAssignments = [];
    await teacher.save();

    console.log('✅ Cleared assignments for teacher:', {
      teacher: teacher.username,
      assignmentsRemoved: assignmentCount,
      subjectsRemoved: subjectCount
    });

    res.json({
      success: true,
      message: `Cleared ${assignmentCount} assignments (${subjectCount} subjects) from teacher`,
      teacher: {
        id: teacher._id,
        name: `${teacher.firstName} ${teacher.lastName}`.trim(),
        username: teacher.username
      },
      stats: {
        assignmentsRemoved: assignmentCount,
        subjectsRemoved: subjectCount
      }
    });
  } catch (err) {
    console.error('❌ DELETE /users/teachers/:teacherId/clear-assignments error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to clear teacher assignments',
      error: err.message
    });
  }
});

// Get teacher's workload summary
router.get('/teachers/:teacherId/workload', auth, async (req, res) => {
  try {
    const { teacherId } = req.params;

    console.log('👨‍🏫 GET /api/users/teachers/:teacherId/workload - Workload summary for teacher:', teacherId);

    const teacher = await User.findById(teacherId)
      .populate({
        path: 'teacherAssignments.class',
        select: 'name shortName level studentCount',
        model: 'Class'
      })
      .populate({
        path: 'teacherAssignments.subjects.subject',
        select: 'name code category periodCount',
        model: 'Subject'
      })
      .select('_id firstName lastName username email teacherAssignments profileImage')
      .lean();

    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Calculate workload
    let totalPeriods = 0;
    let totalStudents = 0;
    const classWorkloads = [];

    teacher.teacherAssignments?.forEach(assignment => {
      const classStudentCount = assignment.class?.studentCount || 0;
      let classPeriods = 0;
      let classSubjects = 0;

      assignment.subjects?.forEach(subjectItem => {
        const periodCount = subjectItem.subject?.periodCount || 3;
        classPeriods += periodCount;
        classSubjects++;
        totalPeriods += periodCount;
      });

      totalStudents += classStudentCount;

      if (assignment.class) {
        classWorkloads.push({
          class: {
            id: assignment.class._id,
            name: assignment.class.name,
            shortName: assignment.class.shortName,
            level: assignment.class.level,
            studentCount: classStudentCount
          },
          subjects: assignment.subjects?.map(s => ({
            id: s.subject?._id,
            name: s.subject?.name,
            code: s.subject?.code,
            periodCount: s.subject?.periodCount || 3
          })) || [],
          totalPeriods: classPeriods,
          totalSubjects: classSubjects
        });
      }
    });

    const workloadLevel = totalPeriods > 30 ? 'High' : totalPeriods > 20 ? 'Medium' : 'Low';

    console.log('✅ Teacher workload calculated:', {
      teacher: teacher.username,
      totalPeriods,
      totalStudents,
      totalClasses: classWorkloads.length
    });

    res.json({
      success: true,
      teacher: {
        id: teacher._id,
        name: `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.username,
        username: teacher.username,
        email: teacher.email,
        profileImage: teacher.profileImage
      },
      workload: {
        totalClasses: classWorkloads.length,
        totalPeriods,
        totalStudents,
        workloadLevel,
        averagePeriodsPerClass: classWorkloads.length > 0 ? (totalPeriods / classWorkloads.length).toFixed(1) : 0,
        averageStudentsPerClass: classWorkloads.length > 0 ? (totalStudents / classWorkloads.length).toFixed(1) : 0
      },
      classWorkloads,
      recommendations: workloadLevel === 'High' 
        ? 'Consider reducing workload or adding another teacher'
        : workloadLevel === 'Medium'
        ? 'Workload is manageable'
        : 'Can take on additional assignments'
    });
  } catch (err) {
    console.error('❌ GET /users/teachers/:teacherId/workload error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate teacher workload',
      error: err.message
    });
  }
});

// ============================================================
// EXISTING ENDPOINTS (with fixes for teacher fetching)
// ============================================================

// Get all users with pagination and filtering
router.get('/', auth, checkPermission('view_users'), async (req, res) => {
  try {
    console.log('👥 GET /api/users API CALLED:', {
      user: req.user.id,
      query: req.query
    });
    
    const { 
      page = 1, 
      limit = 10, 
      role, 
      active,
      search,
      class: classId,
      subject
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (role) filter.role = role;
    if (active !== undefined) filter.active = active === 'true';
    
    // Filter by class
    if (classId) {
      if (mongoose.Types.ObjectId.isValid(classId)) {
        filter.$or = [
          { class: new mongoose.Types.ObjectId(classId) },
          { 'teacherAssignments.class': new mongoose.Types.ObjectId(classId) }
        ];
      } else {
        filter.className = { $regex: classId, $options: 'i' };
      }
    }
    
    // Filter by subject (for teachers)
    if (subject) {
      if (mongoose.Types.ObjectId.isValid(subject)) {
        filter['teacherAssignments.subjects.subject'] = new mongoose.Types.ObjectId(subject);
      }
    }
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    // Get users without population to avoid CastError
    const users = await User.find(filter)
      .select('-password -loginAttempts -lockUntil')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.min(parseInt(limit), 100))
      .lean()
      .maxTimeMS(15000);

    const totalUsers = await User.countDocuments(filter).maxTimeMS(10000);
    const totalPages = Math.ceil(totalUsers / limit);

    console.log('✅ /api/users - Successfully fetched users:', { 
      count: users.length, 
      total: totalUsers 
    });

    // Manually populate class and clean up subjects
    const populatedUsers = await Promise.all(users.map(async (user) => {
      // Populate class if it's a valid ObjectId
      if (user.class && mongoose.Types.ObjectId.isValid(user.class)) {
        const classDoc = await Class.findById(user.class)
          .select('name level shortName fullName')
          .lean();
        user.class = classDoc;
      }

      // Clean up teacher assignments
      if (user.teacherAssignments && user.teacherAssignments.length > 0) {
        user.teacherAssignments = await Promise.all(
          user.teacherAssignments.map(async (assignment) => {
            // Populate class info
            if (assignment.class && mongoose.Types.ObjectId.isValid(assignment.class)) {
              const classDoc = await Class.findById(assignment.class)
                .select('name shortName level')
                .lean();
              assignment.class = classDoc;
            }
            
            // Populate subject info
            if (assignment.subjects && assignment.subjects.length > 0) {
              assignment.subjects = await Promise.all(
                assignment.subjects.map(async (subjectItem) => {
                  if (subjectItem.subject && mongoose.Types.ObjectId.isValid(subjectItem.subject)) {
                    const subjectDoc = await Subject.findById(subjectItem.subject)
                      .select('name code category')
                      .lean();
                    subjectItem.subject = subjectDoc;
                  }
                  return subjectItem;
                })
              );
            }
            return assignment;
          })
        );
      }

      // Clean up enrolled subjects
      if (user.enrolledSubjects && user.enrolledSubjects.length > 0) {
        user.enrolledSubjects = await Promise.all(
          user.enrolledSubjects.map(async (enrolledSubject) => {
            if (enrolledSubject.subject && mongoose.Types.ObjectId.isValid(enrolledSubject.subject)) {
              const subjectDoc = await Subject.findById(enrolledSubject.subject)
                .select('name code category')
                .lean();
              enrolledSubject.subject = subjectDoc;
            }
            if (enrolledSubject.class && mongoose.Types.ObjectId.isValid(enrolledSubject.class)) {
              const classDoc = await Class.findById(enrolledSubject.class)
                .select('name shortName')
                .lean();
              enrolledSubject.class = classDoc;
            }
            return enrolledSubject;
          })
        );
      }

      return user;
    }));

    res.json({
      success: true,
      users: populatedUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalUsers,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('❌ Get users error:', error);
    
    let errorMessage = 'Server error fetching users';
    let statusCode = 500;
    
    if (error.name === 'MongooseError' || error.message.includes('timeout')) {
      errorMessage = 'Database query timeout. Please try with fewer filters or contact administrator.';
      statusCode = 504;
    } else if (error.name === 'CastError') {
      errorMessage = 'Invalid data in database. Running cleanup...';
      
      // Try to get simple user count without population
      try {
        const totalUsers = await User.countDocuments({}).maxTimeMS(5000);
        const simpleUsers = await User.find({})
          .select('_id username firstName lastName role active profileImage')
          .limit(50)
          .lean()
          .maxTimeMS(5000);
        
        // Calculate basic stats
        const students = simpleUsers.filter(u => u.role === 'student').length;
        const teachers = simpleUsers.filter(u => u.role === 'teacher').length;
        const admins = simpleUsers.filter(u => u.role === 'admin' || u.role === 'super_admin').length;
        
        return res.json({
          success: true,
          users: simpleUsers,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalUsers,
            hasNext: false,
            hasPrev: false
          },
          warning: 'Data cleanup needed. Showing limited data.'
        });
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
    
    res.status(statusCode).json({ 
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user by ID
router.get('/:id', auth, checkPermission('view_users'), async (req, res) => {
  try {
    console.log('👤 GET /api/users/:id - User ID:', req.params.id);
    
    // Get user without population first
    const user = await User.findById(req.params.id)
      .select('-password -loginAttempts -lockUntil')
      .lean()
      .maxTimeMS(10000);

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied to super admin details' 
      });
    }

    // Manually populate class
    if (user.class && mongoose.Types.ObjectId.isValid(user.class)) {
      const classDoc = await Class.findById(user.class)
        .select('name level shortName fullName')
        .lean();
      user.class = classDoc;
    }

    // Populate teacher assignments
    if (user.teacherAssignments && user.teacherAssignments.length > 0) {
      user.teacherAssignments = await Promise.all(
        user.teacherAssignments.map(async (assignment) => {
          if (assignment.class && mongoose.Types.ObjectId.isValid(assignment.class)) {
            const classDoc = await Class.findById(assignment.class)
              .select('name shortName level')
              .lean();
            assignment.class = classDoc;
          }
          
          if (assignment.subjects && assignment.subjects.length > 0) {
            assignment.subjects = await Promise.all(
              assignment.subjects.map(async (subjectItem) => {
                if (subjectItem.subject && mongoose.Types.ObjectId.isValid(subjectItem.subject)) {
                  const subjectDoc = await Subject.findById(subjectItem.subject)
                    .select('name code category')
                    .lean();
                  subjectItem.subject = subjectDoc;
                }
                return subjectItem;
              })
            );
          }
          return assignment;
        })
      );
    }

    // Populate enrolled subjects
    if (user.enrolledSubjects && user.enrolledSubjects.length > 0) {
      user.enrolledSubjects = await Promise.all(
        user.enrolledSubjects.map(async (enrolledSubject) => {
          if (enrolledSubject.subject && mongoose.Types.ObjectId.isValid(enrolledSubject.subject)) {
            const subjectDoc = await Subject.findById(enrolledSubject.subject)
              .select('name code category')
              .lean();
            enrolledSubject.subject = subjectDoc;
          }
          if (enrolledSubject.class && mongoose.Types.ObjectId.isValid(enrolledSubject.class)) {
            const classDoc = await Class.findById(enrolledSubject.class)
              .select('name shortName')
              .lean();
            enrolledSubject.class = classDoc;
          }
          return enrolledSubject;
        })
      );
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    
    let errorMessage = 'Server error fetching user';
    if (error.name === 'CastError') {
      errorMessage = 'Invalid user ID format';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Database timeout. Please try again.';
    }
    
    res.status(500).json({ 
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create new user - UPDATED WITH PROPER TEACHER HANDLING AND BASE64 IMAGE SUPPORT
router.post('/', auth, checkPermission('create_users'), validateUserInput, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('🆕 POST /api/users - CREATE USER API CALLED:', {
      body: { ...req.body, password: req.body.password ? '***' : 'missing' },
      user: req.user.id
    });

    // Handle backward compatibility
    let { 
      firstName, 
      lastName, 
      middleName,
      name, // For backward compatibility
      surname, // For backward compatibility
      username: rawUsername, 
      email, 
      password, 
      role, 
      studentId, 
      class: classId, 
      adminPermissions, 
      active = true,
      dateOfBirth,
      address,
      phoneNumber,
      sex,
      age,
      teacherAssignments = [],
      enrolledSubjects = [],
      profileImage // Base64 image data
    } = req.body;

    // Backward compatibility: if firstName/lastName not provided, use name/surname
    if (!firstName && name) {
      firstName = name;
    }
    if (!lastName && surname) {
      lastName = surname;
    }

    // Clean and validate username
    const username = cleanUsername(rawUsername);
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    
    if (!usernameRegex.test(username)) {
      await session.abortTransaction();
      session.endSession();
      console.log('❌ Invalid username format:', rawUsername);
      return res.status(400).json({ 
        success: false,
        message: 'Username can only contain letters, numbers, and underscores. No spaces allowed.' 
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      session.endSession();
      console.log('❌ Username already exists:', username);
      return res.status(400).json({ 
        success: false,
        message: 'Username already exists' 
      });
    }

    // Check email if provided
    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() }).session(session);
      if (existingEmail) {
        await session.abortTransaction();
        session.endSession();
        console.log('❌ Email already exists:', email);
        return res.status(400).json({ 
          success: false,
          message: 'Email already exists' 
      });
    }
    }

    // Prevent creating super_admin users unless current user is super_admin
    if (role === 'super_admin' && req.user.role !== 'super_admin') {
      await session.abortTransaction();
      session.endSession();
      console.log('❌ Cannot create super admin');
      return res.status(403).json({ 
        success: false,
        message: 'Cannot create super admin users' 
      });
    }

    // Validate admin permissions if provided
    if (adminPermissions && role !== 'admin') {
      await session.abortTransaction();
      session.endSession();
      console.log('❌ Admin permissions for non-admin role');
      return res.status(400).json({ 
        success: false,
        message: 'Admin permissions can only be assigned to admin users' 
      });
    }

    // Handle class field
    let classValue = null;
    let className = null;
    if (classId && classId.trim() !== '' && mongoose.Types.ObjectId.isValid(classId)) {
      classValue = classId;
      className = await getClassName(classId);
    }

    // Create new user object first to get the _id
    const userData = {
      username,
      firstName,
      lastName,
      middleName,
      email: email ? email.toLowerCase() : undefined,
      password: password, // Raw password - will be hashed by model
      role,
      studentId,
      class: classValue,
      adminPermissions: role === 'admin' ? adminPermissions : undefined,
      active,
      dateOfBirth: dateOfBirth || undefined,
      address: address || undefined,
      phoneNumber: phoneNumber || undefined,
      sex: sex || undefined,
      age: age ? parseInt(age) : undefined,
      teacherAssignments: [], // Will be populated below
      enrolledSubjects: [], // Will be populated below
      createdBy: req.user.id
    };

    console.log('💾 Creating user with data:', { 
      ...userData, 
      password: '***'
    });

    const user = new User(userData);
    await user.save({ session });

    console.log('✅ User created with ID:', user._id);

    // Now handle base64 profile image with the actual user ID - FIXED
    let profileImageFileName = null;
    if (profileImage && profileImage.startsWith('data:image')) {
      try {
        console.log('📸 Handling base64 profile image during user creation with ID:', user._id);
        
        // Extract base64 data
        const matches = profileImage.match(/^data:image\/(\w+);base64,/);
        if (!matches || matches.length < 2) {
          throw new Error('Invalid base64 image format');
        }
        
        const mimeType = matches[1];
        const extension = mimeType === 'jpeg' ? 'jpg' : mimeType;
        const base64Data = profileImage.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate filename with actual user ID - FIXED
        const fileName = `profile_${user._id}_${Date.now()}.${extension}`;
        const uploadDir = path.join(__dirname, '../../uploads/profiles');
        
        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // Save new image
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, buffer);
        
        profileImageFileName = fileName;
        user.profileImage = fileName;
        user.profilePicture = fileName;
        
        console.log('✅ Base64 image saved for new user:', fileName);
        
      } catch (imageError) {
        console.error('❌ Error saving base64 image:', imageError.message);
      }
    }

    // For teachers, process assignments if provided - FIXED VERSION
    let processedTeacherAssignments = [];
    if (role === 'teacher' && teacherAssignments && Array.isArray(teacherAssignments)) {
      console.log('👨‍🏫 Processing teacher assignments during creation:', teacherAssignments);
      
      for (const assignment of teacherAssignments) {
        console.log('Processing assignment:', assignment);
        
        // Handle different assignment structures from frontend
        const classId = assignment.class || assignment.classId;
        const subjects = assignment.subjects || [];
        
        if (classId && subjects.length > 0) {
          // Verify class exists
          const classExists = await Class.exists({ _id: classId }).session(session);
          if (classExists) {
            // Process subjects
            const validSubjects = [];
            for (const subjectItem of subjects) {
              const subjectId = subjectItem.subject || subjectItem.subjectId;
              
              if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
                // Verify subject exists and get its name
                const subject = await Subject.findById(subjectId).session(session);
                if (subject) {
                  validSubjects.push({
                    subject: subjectId,
                    subjectName: subject.name,
                    assignedAt: new Date()
                  });
                }
              }
            }
            
            if (validSubjects.length > 0) {
              processedTeacherAssignments.push({
                class: classId,
                subjects: validSubjects,
                assignedAt: new Date()
              });
              console.log('✅ Added assignment:', { classId, subjects: validSubjects.length });
            }
          }
        }
      }
    }
    console.log('📦 Final processed assignments:', processedTeacherAssignments);

    // For students, process enrolled subjects if provided
    let processedEnrolledSubjects = [];
    if (role === 'student' && classId && Array.isArray(enrolledSubjects)) {
      // Get class to identify core subjects
      const classData = await Class.findById(classId)
        .populate('subjectAssignments.subject')
        .session(session);
      
      if (classData) {
        // Get core subjects (auto-enrolled)
        const coreSubjectIds = classData.subjectAssignments
          .filter(assignment => assignment.isCore)
          .map(assignment => assignment.subject._id);
        
        // Combine core + selected elective subjects
        const allSubjectIds = [...coreSubjectIds, ...enrolledSubjects];
        
        // Remove duplicates
        const uniqueSubjectIds = [...new Set(allSubjectIds.map(id => id.toString()))];
        
        // Get subject names for each subject ID
        processedEnrolledSubjects = await Promise.all(
          uniqueSubjectIds.map(async (subjectId) => {
            const subject = await Subject.findById(subjectId).session(session);
            const isCore = coreSubjectIds.some(coreId => coreId.toString() === subjectId);
            
            return {
              subject: subjectId,
              subjectName: subject ? subject.name : `Subject ${subjectId}`,
              class: classId,
              isCore: isCore,
              enrolledAt: new Date()
            };
          })
        );
      }
    }

    // Update user with assignments and image
    user.teacherAssignments = processedTeacherAssignments;
    user.enrolledSubjects = processedEnrolledSubjects;
    
    if (profileImageFileName) {
      user.profileImage = profileImageFileName;
      user.profilePicture = profileImageFileName;
    }
    
    await user.save({ session });

    console.log('✅ User saved with assignments:', {
      userId: user._id,
      assignmentCount: user.teacherAssignments?.length || 0,
      assignments: user.teacherAssignments
    });

    await session.commitTransaction();
    session.endSession();

    console.log('✅ User created successfully:', user._id);

    // Get user response without password (with manual population)
    const userResponse = await User.findById(user._id)
      .select('-password -loginAttempts -lockUntil')
      .lean();

    // Populate class
    if (userResponse.class && mongoose.Types.ObjectId.isValid(userResponse.class)) {
      const classDoc = await Class.findById(userResponse.class)
        .select('name level shortName fullName')
        .lean();
      userResponse.class = classDoc;
    }

    // Populate teacher assignments if any
    if (userResponse.teacherAssignments && userResponse.teacherAssignments.length > 0) {
      userResponse.teacherAssignments = await Promise.all(
        userResponse.teacherAssignments.map(async (assignment) => {
          if (assignment.class) {
            const classDoc = await Class.findById(assignment.class)
              .select('name shortName level')
              .lean();
            assignment.class = classDoc;
          }
          return assignment;
        })
      );
    }

    res.status(201).json({ 
      success: true,
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('❌ Create user error:', error);
    
    if (error.code === 11000) {
      const field = error.keyPattern.username ? 'username' : 
                   error.keyPattern.email ? 'email' : 
                   error.keyPattern.studentId ? 'student ID' : 'field';
      return res.status(400).json({ 
        success: false,
        message: `User with this ${field} already exists` 
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error creating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update user - UPDATED WITH PROPER TEACHER ASSIGNMENT HANDLING
router.put('/:id', auth, checkPermission('edit_users'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('🔄 PUT /api/users/:id - UPDATE USER API CALLED:', {
      userId: req.params.id,
      body: { 
        ...req.body, 
        password: req.body.password ? '***' : 'not provided',
        profileImage: req.body.profileImage ? 'BASE64_IMAGE_PROVIDED' : 'no_image'
      },
      user: req.user.id
    });

    // Handle backward compatibility
    let { 
      firstName, 
      lastName, 
      middleName,
      name,
      surname,
      username: rawUsername, 
      email, 
      role, 
      studentId, 
      class: classId, 
      active, 
      adminPermissions,
      dateOfBirth,
      address,
      phoneNumber,
      sex,
      age,
      teacherAssignments = [],
      enrolledSubjects = [],
      profileImage // Base64 image data
    } = req.body;
    
    const user = await User.findById(req.params.id).session(session);
    
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      console.log('❌ User not found:', req.params.id);
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    console.log('👤 Found user:', {
      id: user._id,
      username: user.username,
      role: user.role
    });

    // Handle base64 profile image if provided - UPDATED TO USE HELPER FUNCTION
    if (profileImage !== undefined) {
      if (profileImage && profileImage.startsWith('data:image')) {
        try {
          console.log('📸 Handling base64 profile image update');
          const fileName = await handleBase64Image(profileImage, user._id.toString(), true, user);
          if (fileName) {
            user.profileImage = fileName;
            user.profilePicture = fileName;
            console.log('✅ Base64 image updated:', fileName);
          }
        } catch (imageError) {
          console.error('❌ Error saving base64 image:', imageError.message);
        }
      } else if (profileImage === '' || profileImage === null) {
        // Clear profile image if empty string or null is sent
        const uploadDir = path.join(__dirname, '../../uploads/profiles');
        if (user.profileImage) {
          const oldPath = path.join(uploadDir, user.profileImage);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
        user.profileImage = '';
        user.profilePicture = '';
        console.log('🗑️ Cleared profile image');
      }
    }

    // Prevent modifying super_admin users unless current user is super_admin
    if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
      await session.abortTransaction();
      session.endSession();
      console.log('❌ Cannot modify super admin');
      return res.status(403).json({ 
        success: false,
        message: 'Cannot modify super admin users' 
      });
    }

    // Prevent role escalation
    if (role && role === 'super_admin' && req.user.role !== 'super_admin') {
      await session.abortTransaction();
      session.endSession();
      console.log('❌ Cannot assign super admin role');
      return res.status(403).json({ 
        success: false,
        message: 'Cannot assign super admin role' 
      });
    }

    // Check username if provided
    if (rawUsername !== undefined) {
      const username = cleanUsername(rawUsername);
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      
      if (!usernameRegex.test(username)) {
        await session.abortTransaction();
        session.endSession();
        console.log('❌ Invalid username format:', rawUsername);
        return res.status(400).json({ 
          success: false,
          message: 'Username can only contain letters, numbers, and underscores. No spaces allowed.' 
        });
      }
      
      // Check if new username already exists
      if (username !== user.username) {
        const existingUsername = await User.findOne({ 
          username,
          _id: { $ne: user._id }
        }).session(session);
        
        if (existingUsername) {
          await session.abortTransaction();
          session.endSession();
          console.log('❌ Username already exists:', username);
          return res.status(400).json({ 
            success: false,
            message: 'Username already exists' 
          });
        }
      }
      
      user.username = username;
      console.log('✅ Username updated to:', username);
    }

    // Check email uniqueness if changing
    if (email !== undefined && email !== user.email) {
      const existingEmail = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: user._id }
      }).session(session);
      
      if (existingEmail) {
        await session.abortTransaction();
        session.endSession();
        console.log('❌ Email already exists:', email);
        return res.status(400).json({ 
          success: false,
          message: 'Email already exists' 
        });
      }
      user.email = email.toLowerCase();
    }

    // Update name fields with backward compatibility
    if (firstName !== undefined) {
      user.firstName = firstName;
    } else if (name !== undefined) {
      user.firstName = name;
    }
    
    if (lastName !== undefined) {
      user.lastName = lastName;
    } else if (surname !== undefined) {
      user.lastName = surname;
    }
    
    if (middleName !== undefined) {
      user.middleName = middleName;
    }

    // Update other basic fields
    if (role !== undefined) user.role = role;
    if (studentId !== undefined) user.studentId = studentId;
    if (active !== undefined) user.active = active;
    
    // Update personal information
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    if (address !== undefined) user.address = address;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (sex !== undefined) user.sex = sex;
    if (age !== undefined) user.age = parseInt(age) || null;

    // Handle class field
    if (classId !== undefined) {
      if (classId && classId.trim() !== '' && mongoose.Types.ObjectId.isValid(classId)) {
        user.class = classId;
        const className = await getClassName(classId);
        console.log('✅ Updated class to:', classId, 'Name:', className);
      } else if (classId === '' || classId === null) {
        user.class = null;
        console.log('✅ Removed class assignment');
      } else {
        console.log('⚠️ Invalid class ID provided:', classId);
        user.class = null;
      }
    }

    // Handle password update
    if (req.body.password !== undefined && req.body.password !== '') {
      user.password = req.body.password;
      console.log('✅ Password updated');
    }

    // Handle teacher assignments - USING NEW HELPER METHOD
    if (role === 'teacher' && teacherAssignments !== undefined) {
      console.log('👨‍🏫 Processing teacher assignments:', teacherAssignments);
      
      if (Array.isArray(teacherAssignments) && teacherAssignments.length > 0) {
        const processedAssignments = [];
        
        for (const assignment of teacherAssignments) {
          console.log('Processing assignment:', assignment);
          
          // Handle different assignment structures from frontend
          const classId = assignment.class || assignment.classId;
          const subjects = assignment.subjects || [];
          
          if (classId && subjects.length > 0) {
            // Verify class exists
            const classExists = await Class.exists({ _id: classId }).session(session);
            if (classExists) {
              // Process subjects with subject names
              const validSubjects = [];
              for (const subjectItem of subjects) {
                const subjectId = subjectItem.subject || subjectItem.subjectId || subjectItem;
                
                if (mongoose.Types.ObjectId.isValid(subjectId)) {
                  // Verify subject exists and get its name
                  const subject = await Subject.findById(subjectId).session(session);
                  if (subject) {
                    validSubjects.push({
                      subject: subjectId,
                      subjectName: subject.name,
                      assignedAt: new Date()
                    });
                  }
                }
              }
              
              if (validSubjects.length > 0) {
                processedAssignments.push({
                  class: classId,
                  subjects: validSubjects
                });
              }
            }
          }
        }
        
        user.teacherAssignments = processedAssignments;
        console.log('✅ Updated teacher assignments:', {
          count: processedAssignments.length,
          assignments: processedAssignments.map(a => ({
            class: a.class,
            subjects: a.subjects.map(s => ({ subject: s.subject, subjectName: s.subjectName }))
          }))
        });
      } else {
        // If empty array is sent, clear assignments
        user.teacherAssignments = [];
        console.log('✅ Cleared teacher assignments (empty array provided)');
      }
    } else if (role !== 'teacher') {
      // Clear assignments for non-teachers
      user.teacherAssignments = [];
    }

    // Handle enrolled subjects for students
    if (role === 'student' && enrolledSubjects !== undefined && user.class) {
      if (Array.isArray(enrolledSubjects)) {
        // Get class to identify core subjects
        const classData = await Class.findById(user.class)
          .populate('subjectAssignments.subject')
          .session(session);
        
        if (classData) {
          // Get core subjects (auto-enrolled)
          const coreSubjectIds = classData.subjectAssignments
            .filter(assignment => assignment.isCore)
            .map(assignment => assignment.subject._id);
          
          // Combine core + selected elective subjects
          const allSubjectIds = [...coreSubjectIds, ...enrolledSubjects];
          
          // Remove duplicates
          const uniqueSubjectIds = [...new Set(allSubjectIds.map(id => id.toString()))];
          
          // Add subjectName field by fetching from Subject model
          user.enrolledSubjects = await Promise.all(
            uniqueSubjectIds.map(async (subjectId) => {
              const subject = await Subject.findById(subjectId).session(session);
              const isCore = coreSubjectIds.some(coreId => coreId.toString() === subjectId);
              
              return {
                subject: subjectId,
                subjectName: subject ? subject.name : `Subject ${subjectId}`,
                class: user.class,
                isCore: isCore,
                enrolledAt: new Date()
              };
            })
          );
          
          console.log('✅ Updated student enrolled subjects:', user.enrolledSubjects.length);
        }
      } else {
        user.enrolledSubjects = [];
      }
    } else if (role !== 'student') {
      user.enrolledSubjects = [];
    }

    // Update admin permissions if role is admin
    if (role === 'admin' && adminPermissions !== undefined) {
      if (Array.isArray(adminPermissions)) {
        user.adminPermissions = adminPermissions;
      } else {
        user.adminPermissions = [];
      }
      console.log('✅ Updated admin permissions:', adminPermissions);
    } else if (role !== 'admin') {
      user.adminPermissions = undefined;
    }

    user.updatedBy = req.user.id;
    user.updatedAt = new Date();

    console.log('💾 Saving user updates...');
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    console.log('✅ User updated successfully:', user._id);

    // Get updated user without password
    const updatedUser = await User.findById(user._id)
      .select('-password -loginAttempts -lockUntil')
      .lean();

    // Populate class
    if (updatedUser.class && mongoose.Types.ObjectId.isValid(updatedUser.class)) {
      const classDoc = await Class.findById(updatedUser.class)
        .select('name level shortName fullName')
        .lean();
      updatedUser.class = classDoc;
    }

    // Populate teacher assignments if any
    if (updatedUser.teacherAssignments && updatedUser.teacherAssignments.length > 0) {
      updatedUser.teacherAssignments = await Promise.all(
        updatedUser.teacherAssignments.map(async (assignment) => {
          if (assignment.class) {
            const classDoc = await Class.findById(assignment.class)
              .select('name shortName level')
              .lean();
            assignment.class = classDoc;
          }
          return assignment;
        })
      );
    }

    res.json({ 
      success: true,
      message: 'User updated successfully', 
      user: updatedUser 
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('❌ Update user error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      console.log('❌ Validation errors:', validationErrors);
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    if (error.code === 11000) {
      const field = error.keyPattern.username ? 'username' : 
                   error.keyPattern.email ? 'email' : 
                   error.keyPattern.studentId ? 'student ID' : 'field';
      return res.status(500).json({ 
        success: false,
        message: `User with this ${field} already exists` 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error updating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================
// ASSIGNMENT MANAGEMENT ENDPOINTS
// ============================================================

// Get classes for assignment dropdown
router.get('/assignment/classes', auth, async (req, res) => {
  try {
    console.log('📚 GET /api/users/assignment/classes - Fetching classes for assignment');
    
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
        fullName: cls.fullName,
        label: cls.fullName || cls.name
      })),
      total: classes.length
    });
  } catch (err) {
    console.error('❌ GET /users/assignment/classes error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch classes for assignment',
      error: err.message
    });
  }
});

// Get subjects for a specific class (for teacher assignment)
router.get('/assignment/classes/:classId/subjects', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    
    console.log('📚 GET /api/users/assignment/classes/:classId/subjects - Fetching subjects for class:', classId);

    // Verify class exists
    const classData = await Class.findById(classId)
      .populate('subjectAssignments.subject', 'name code category isCore')
      .lean();

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
        classId
      });
    }

    const subjects = classData.subjectAssignments.map(assignment => ({
      id: assignment.subject._id,
      _id: assignment.subject._id,
      name: assignment.subject.name,
      code: assignment.subject.code,
      category: assignment.subject.category,
      isCore: assignment.isCore,
      periodCount: assignment.periodCount,
      displayOrder: assignment.displayOrder,
      label: `${assignment.subject.name} (${assignment.subject.code}) ${assignment.isCore ? 'Core' : 'Elective'}`
    }));

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
    console.error('❌ GET /users/assignment/classes/:classId/subjects error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects for class',
      error: err.message
    });
  }
});

// Assign subjects to teacher
router.post('/teachers/:teacherId/assign-subjects', auth, checkPermission('manage_users'), async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { classId, subjectIds } = req.body;

    console.log('👨‍🏫 POST /api/users/teachers/:teacherId/assign-subjects - Assigning subjects to teacher:', {
      teacherId,
      classId,
      subjectIds
    });

    // Verify teacher exists and is a teacher
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Verify class exists
    const classExists = await Class.exists({ _id: classId });
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Verify subjects exist and are assigned to the class
    const classData = await Class.findById(classId).populate('subjectAssignments.subject');
    const classSubjectIds = classData.subjectAssignments.map(a => a.subject._id.toString());
    
    const invalidSubjects = subjectIds.filter(
      subjectId => !classSubjectIds.includes(subjectId.toString())
    );
    
    if (invalidSubjects.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some subjects are not assigned to this class',
        invalidSubjects
      });
    }

    // Assign subjects to teacher
    await teacher.addTeacherAssignment(classId, subjectIds);

    // Get updated teacher with assignments
    const updatedTeacher = await User.findById(teacherId)
      .populate('teacherAssignments.class', 'name shortName level')
      .populate('teacherAssignments.subjects.subject', 'name code')
      .select('-password -loginAttempts -lockUntil');

    console.log('✅ Subjects assigned to teacher:', {
      teacher: teacher.username,
      class: classData.name,
      subjects: subjectIds.length
    });

    res.json({
      success: true,
      message: `Successfully assigned ${subjectIds.length} subjects to teacher`,
      teacher: updatedTeacher
    });
  } catch (err) {
    console.error('❌ POST /users/teachers/:teacherId/assign-subjects error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to assign subjects to teacher',
      error: err.message
    });
  }
});

// Remove subject assignment from teacher
router.delete('/teachers/:teacherId/remove-assignment', auth, checkPermission('manage_users'), async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { classId, subjectId } = req.body;

    console.log('👨‍🏫 DELETE /api/users/teachers/:teacherId/remove-assignment - Removing assignment from teacher:', {
      teacherId,
      classId,
      subjectId
    });

    // Verify teacher exists
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Remove assignment
    await teacher.removeTeacherAssignment(classId, subjectId);

    // Get updated teacher
    const updatedTeacher = await User.findById(teacherId)
      .populate('teacherAssignments.class', 'name shortName level')
      .populate('teacherAssignments.subjects.subject', 'name code')
      .select('-password -loginAttempts -lockUntil');

    const message = subjectId 
      ? 'Subject assignment removed successfully'
      : 'All assignments for this class removed successfully';

    console.log('✅ Assignment removed from teacher:', {
      teacher: teacher.username,
      classId,
      subjectId
    });

    res.json({
      success: true,
      message,
      teacher: updatedTeacher
    });
  } catch (err) {
    console.error('❌ DELETE /users/teachers/:teacherId/remove-assignment error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to remove assignment from teacher',
      error: err.message
    });
  }
});

// ============================================================
// SUBJECT TEACHER MANAGEMENT ENDPOINTS
// ============================================================

// Get subject teachers for a specific class
router.get('/subject-teachers/class/:classId', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    
    console.log('👨‍🏫 GET /api/users/subject-teachers/class/:classId - Fetching subject teachers for class:', classId);

    // Verify class exists
    const classData = await Class.findById(classId)
      .populate('subjectAssignments.subject', 'name code category isCore')
      .lean();
    
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
        classId
      });
    }

    // Get all teachers using the new endpoint
    const teachersResponse = await User.find({ 
      role: 'teacher',
      active: true 
    })
      .select('_id firstName lastName username email phone teacherAssignments profileImage')
      .populate('teacherAssignments.class', 'name shortName level')
      .populate('teacherAssignments.subjects.subject', 'name code')
      .lean();

    const subjectTeachers = [];
    
    for (const teacher of teachersResponse) {
      // Check if teacher has assignments for this class
      const classAssignments = teacher.teacherAssignments?.filter(
        assignment => assignment.class && assignment.class._id.toString() === classId
      ) || [];
      
      if (classAssignments.length > 0) {
        // Get all subjects this teacher teaches in this class
        const subjects = [];
        classAssignments.forEach(assignment => {
          if (assignment.subjects) {
            assignment.subjects.forEach(subjectItem => {
              if (subjectItem.subject) {
                subjects.push({
                  id: subjectItem.subject._id,
                  name: subjectItem.subject.name,
                  code: subjectItem.subject.code,
                  assignmentId: assignment._id
                });
              }
            });
          }
        });
        
        if (subjects.length > 0) {
          subjectTeachers.push({
            teacher: {
              id: teacher._id,
              name: `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.username,
              username: teacher.username,
              email: teacher.email,
              phone: teacher.phone || 'N/A',
              profileImage: teacher.profileImage
            },
            subjects,
            totalSubjects: subjects.length
          });
        }
      }
    }

    // Also get class's subject assignments for reference
    const classSubjects = classData.subjectAssignments?.map(assignment => ({
      id: assignment.subject?._id,
      name: assignment.subject?.name,
      code: assignment.subject?.code,
      category: assignment.subject?.category,
      isCore: assignment.isCore || false,
      teacherAssigned: false
    })) || [];

    console.log('✅ Subject teachers fetched:', {
      class: classData.name,
      teachers: subjectTeachers.length,
      totalSubjects: classSubjects.length
    });

    res.json({
      success: true,
      class: {
        id: classData._id,
        name: classData.name,
        shortName: classData.shortName,
        level: classData.level,
        stream: classData.stream,
        fullName: classData.fullName || `${classData.level}${classData.stream ? ` ${classData.stream}` : ''}`
      },
      subjectTeachers,
      classSubjects,
      summary: {
        totalTeachers: subjectTeachers.length,
        totalSubjects: classSubjects.length,
        subjectsWithTeachers: subjectTeachers.reduce((sum, teacher) => sum + teacher.subjects.length, 0),
        subjectsWithoutTeachers: classSubjects.length - subjectTeachers.reduce((sum, teacher) => sum + teacher.subjects.length, 0)
      }
    });

  } catch (err) {
    console.error('❌ GET /users/subject-teachers/class/:classId error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subject teachers',
      error: err.message
    });
  }
});

// Assign teacher to multiple subjects in a class (bulk assignment)
router.post('/subject-teachers/assign', auth, checkPermission('manage_users'), async (req, res) => {
  try {
    const { teacherId, classId, subjectIds } = req.body;

    console.log('👨‍🏫 POST /api/users/subject-teachers/assign - Assigning teacher to subjects:', {
      teacherId,
      classId,
      subjectCount: subjectIds?.length
    });

    if (!teacherId || !classId || !subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'teacherId, classId, and subjectIds (non-empty array) are required'
      });
    }

    // Verify teacher exists
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Verify class exists
    const classExists = await Class.exists({ _id: classId });
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Verify subjects exist and are assigned to the class
    const classData = await Class.findById(classId).populate('subjectAssignments.subject');
    const classSubjectIds = classData.subjectAssignments.map(a => a.subject._id.toString());
    
    const invalidSubjects = subjectIds.filter(
      subjectId => !classSubjectIds.includes(subjectId.toString())
    );
    
    if (invalidSubjects.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some subjects are not assigned to this class',
        invalidSubjects
      });
    }

    // Check if teacher already has assignments for this class
    const existingClassAssignment = teacher.teacherAssignments?.find(
      assignment => assignment.class?.toString() === classId
    );

    if (existingClassAssignment) {
      // Add new subjects to existing assignment
      const existingSubjectIds = existingClassAssignment.subjects?.map(s => s.subject.toString()) || [];
      const newSubjectIds = subjectIds.filter(
        subjectId => !existingSubjectIds.includes(subjectId.toString())
      );

      if (newSubjectIds.length > 0) {
        // Get subject details for new subjects
        const newSubjects = await Promise.all(
          newSubjectIds.map(async (subjectId) => {
            const subject = await Subject.findById(subjectId);
            return {
              subject: subjectId,
              subjectName: subject ? subject.name : `Subject ${subjectId}`,
              assignedAt: new Date()
            };
          })
        );

        existingClassAssignment.subjects = [...(existingClassAssignment.subjects || []), ...newSubjects];
      }
    } else {
      // Create new assignment
      const subjects = await Promise.all(
        subjectIds.map(async (subjectId) => {
          const subject = await Subject.findById(subjectId);
          return {
            subject: subjectId,
            subjectName: subject ? subject.name : `Subject ${subjectId}`,
            assignedAt: new Date()
          };
        })
      );

      teacher.teacherAssignments = teacher.teacherAssignments || [];
      teacher.teacherAssignments.push({
        class: classId,
        subjects,
        assignedAt: new Date()
      });
    }

    await teacher.save();

    // Get updated teacher
    const updatedTeacher = await User.findById(teacherId)
      .populate('teacherAssignments.class', 'name shortName level')
      .populate('teacherAssignments.subjects.subject', 'name code')
      .select('-password -loginAttempts -lockUntil');

    console.log('✅ Teacher assigned to subjects:', {
      teacher: teacher.username,
      class: classData.name,
      subjects: subjectIds.length
    });

    res.json({
      success: true,
      message: `Successfully assigned ${subjectIds.length} subjects to teacher`,
      teacher: updatedTeacher
    });

  } catch (err) {
    console.error('❌ POST /users/subject-teachers/assign error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to assign teacher to subjects',
      error: err.message
    });
  }
});

// Get all subject assignments across all classes
router.get('/subject-teachers/all-assignments', auth, async (req, res) => {
  try {
    console.log('👨‍🏫 GET /api/users/subject-teachers/all-assignments - Fetching all subject assignments');

    // Get all teachers with assignments
    const teachers = await User.find({ 
      role: 'teacher',
      active: true 
    })
      .select('_id firstName lastName username email teacherAssignments profileImage')
      .populate('teacherAssignments.class', 'name shortName level')
      .populate('teacherAssignments.subjects.subject', 'name code')
      .sort('firstName lastName')
      .lean();

    // Process assignments
    const assignments = [];
    
    for (const teacher of teachers) {
      if (teacher.teacherAssignments && teacher.teacherAssignments.length > 0) {
        for (const assignment of teacher.teacherAssignments) {
          if (assignment.class && assignment.subjects) {
            assignment.subjects.forEach(subjectItem => {
              if (subjectItem.subject) {
                assignments.push({
                  teacher: {
                    id: teacher._id,
                    name: `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.username,
                    username: teacher.username,
                    email: teacher.email,
                    profileImage: teacher.profileImage
                  },
                  class: {
                    id: assignment.class._id,
                    name: assignment.class.name,
                    shortName: assignment.class.shortName,
                    level: assignment.class.level
                  },
                  subject: {
                    id: subjectItem.subject._id,
                    name: subjectItem.subject.name,
                    code: subjectItem.subject.code
                  },
                  assignedAt: assignment.assignedAt || new Date()
                });
              }
            });
          }
        }
      }
    }

    // Group by class for summary
    const summaryByClass = {};
    const summaryByTeacher = {};
    
    assignments.forEach(assignment => {
      // By class
      const classKey = assignment.class.id;
      if (!summaryByClass[classKey]) {
        summaryByClass[classKey] = {
          class: assignment.class,
          teachers: new Set(),
          subjects: new Set(),
          assignments: 0
        };
      }
      summaryByClass[classKey].teachers.add(assignment.teacher.id);
      summaryByClass[classKey].subjects.add(assignment.subject.id);
      summaryByClass[classKey].assignments++;
      
      // By teacher
      const teacherKey = assignment.teacher.id;
      if (!summaryByTeacher[teacherKey]) {
        summaryByTeacher[teacherKey] = {
          teacher: assignment.teacher,
          classes: new Set(),
          subjects: new Set(),
          assignments: 0
        };
      }
      summaryByTeacher[teacherKey].classes.add(assignment.class.id);
      summaryByTeacher[teacherKey].subjects.add(assignment.subject.id);
      summaryByTeacher[teacherKey].assignments++;
    });

    console.log('✅ All subject assignments fetched:', {
      totalAssignments: assignments.length,
      teachers: teachers.length,
      classesWithAssignments: Object.keys(summaryByClass).length
    });

    res.json({
      success: true,
      assignments,
      summary: {
        totalAssignments: assignments.length,
        totalTeachers: teachers.length,
        byClass: Object.values(summaryByClass).map(item => ({
          class: item.class,
          teacherCount: item.teachers.size,
          subjectCount: item.subjects.size,
          assignmentCount: item.assignments
        })),
        byTeacher: Object.values(summaryByTeacher).map(item => ({
          teacher: item.teacher,
          classCount: item.classes.size,
          subjectCount: item.subjects.size,
          assignmentCount: item.assignments
        }))
      }
    });

  } catch (err) {
    console.error('❌ GET /users/subject-teachers/all-assignments error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch all subject assignments',
      error: err.message
    });
  }
});

// ============================================================
// STUDENT MANAGEMENT ENDPOINTS
// ============================================================

// Enroll student in subjects
router.post('/students/:studentId/enroll-subjects', auth, checkPermission('manage_users'), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { subjectIds } = req.body; // Only elective subjects (core are auto-added)

    console.log('👨‍🎓 POST /api/users/students/:studentId/enroll-subjects - Enrolling student in subjects:', {
      studentId,
      subjectIds
    });

    // Verify student exists and is a student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (!student.class) {
      return res.status(400).json({
        success: false,
        message: 'Student must be assigned to a class first'
      });
    }

    // Get student's class
    const classData = await Class.findById(student.class).populate('subjectAssignments.subject');
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Student class not found'
      });
    }

    // Get core subjects (auto-enrolled)
    const coreSubjectIds = classData.subjectAssignments
      .filter(assignment => assignment.isCore)
      .map(assignment => assignment.subject._id);

    // Verify elective subjects are assigned to the class
    const classSubjectIds = classData.subjectAssignments.map(a => a.subject._id.toString());
    const electiveSubjectIds = subjectIds || [];
    
    const invalidSubjects = electiveSubjectIds.filter(
      subjectId => !classSubjectIds.includes(subjectId.toString())
    );
    
    if (invalidSubjects.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some subjects are not assigned to this class',
        invalidSubjects
      });
    }

    // All subjects to enroll (core + selected electives)
    const allSubjectIds = [...coreSubjectIds, ...electiveSubjectIds];

    // Enroll student in subjects
    await student.enrollInSubjects(student.class, allSubjectIds);

    // Get updated student
    const updatedStudent = await User.findById(studentId)
      .populate('enrolledSubjects.subject', 'name code category')
      .populate('enrolledSubjects.class', 'name shortName')
      .select('-password -loginAttempts -lockUntil');

    console.log('✅ Student enrolled in subjects:', {
      student: student.username,
      class: classData.name,
      totalSubjects: allSubjectIds.length,
      coreSubjects: coreSubjectIds.length,
      electiveSubjects: electiveSubjectIds.length
    });

    res.json({
      success: true,
      message: `Student enrolled in ${allSubjectIds.length} subjects (${coreSubjectIds.length} core, ${electiveSubjectIds.length} elective)`,
      student: updatedStudent,
      summary: {
        total: allSubjectIds.length,
        core: coreSubjectIds.length,
        elective: electiveSubjectIds.length,
        class: classData.name
      }
    });
  } catch (err) {
    console.error('❌ POST /users/students/:studentId/enroll-subjects error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll student in subjects',
      error: err.message
    });
  }
});

// Get student's enrolled subjects
router.get('/students/:studentId/enrolled-subjects', auth, async (req, res) => {
  try {
    const { studentId } = req.params;

    console.log('👨‍🎓 GET /api/users/students/:studentId/enrolled-subjects - Fetching enrolled subjects for student:', studentId);

    const student = await User.findById(studentId)
      .populate('enrolledSubjects.subject', 'name code category')
      .populate('enrolledSubjects.class', 'name shortName')
      .select('enrolledSubjects firstName lastName middleName username profileImage');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const coreSubjects = student.enrolledSubjects.filter(s => s.isCore);
    const electiveSubjects = student.enrolledSubjects.filter(s => !s.isCore);

    res.json({
      success: true,
      student: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        middleName: student.middleName,
        username: student.username,
        profileImage: student.profileImage
      },
      enrolledSubjects: student.enrolledSubjects,
      coreSubjects,
      electiveSubjects,
      summary: {
        total: student.enrolledSubjects.length,
        core: coreSubjects.length,
        elective: electiveSubjects.length
      }
    });
  } catch (err) {
    console.error('❌ GET /users/students/:studentId/enrolled-subjects error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student enrolled subjects',
      error: err.message
    });
  }
});

// ============================================================
// EXISTING ENDPOINTS (keeping for compatibility)
// ============================================================

// Get teacher's assignments
router.get('/teachers/:teacherId/assignments', auth, async (req, res) => {
  try {
    const { teacherId } = req.params;

    console.log('👨‍🏫 GET /api/users/teachers/:teacherId/assignments - Fetching assignments for teacher:', teacherId);

    // Verify teacher exists
    const teacher = await User.findById(teacherId).select('_id firstName lastName middleName username role profileImage');
    
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Get teacher with assignments
    const teacherWithAssignments = await User.findById(teacherId)
      .populate({
        path: 'teacherAssignments.class',
        select: 'name shortName level fullName',
        model: 'Class'
      })
      .populate({
        path: 'teacherAssignments.subjects.subject',
        select: 'name code category isCore',
        model: 'Subject'
      })
      .select('teacherAssignments firstName lastName middleName username role profileImage')
      .lean();

    if (!teacherWithAssignments) {
      return res.status(404).json({
        success: false,
        message: 'Teacher assignments not found'
      });
    }

    // Format assignments
    const assignments = teacherWithAssignments.teacherAssignments || [];
    
    // Calculate statistics
    const totalClasses = assignments.length;
    const totalSubjects = assignments.reduce(
      (sum, assignment) => sum + (assignment.subjects?.length || 0), 
      0
    );

    // Get student counts for each class
    const assignmentsWithStudentCounts = await Promise.all(
      assignments.map(async (assignment) => {
        if (!assignment.class) {
          return {
            ...assignment,
            studentCount: 0,
            subjectCount: assignment.subjects?.length || 0
          };
        }

        // Get student count for this class
        const studentCount = await User.countDocuments({
          role: 'student',
          class: assignment.class._id,
          active: true
        }).maxTimeMS(5000);

        // Format subjects array
        const formattedSubjects = (assignment.subjects || []).map(sub => ({
          id: sub.subject?._id || sub._id,
          _id: sub.subject?._id || sub._id,
          name: sub.subject?.name || 'Unknown Subject',
          code: sub.subject?.code || '',
          category: sub.subject?.category || '',
          isCore: sub.subject?.isCore || false
        }));

        return {
          ...assignment,
          class: {
            id: assignment.class._id,
            _id: assignment.class._id,
            name: assignment.class.name,
            shortName: assignment.class.shortName,
            level: assignment.class.level,
            fullName: assignment.class.fullName || assignment.class.name
          },
          subjects: formattedSubjects,
          subjectCount: formattedSubjects.length,
          studentCount
        };
      })
    );

    // Prepare response
    const response = {
      success: true,
      teacher: {
        id: teacherWithAssignments._id,
        firstName: teacherWithAssignments.firstName,
        lastName: teacherWithAssignments.lastName,
        middleName: teacherWithAssignments.middleName,
        username: teacherWithAssignments.username,
        role: teacherWithAssignments.role,
        profileImage: teacherWithAssignments.profileImage
      },
      assignments: assignmentsWithStudentCounts,
      summary: {
        totalClasses,
        totalSubjects,
        assignmentsByClass: assignmentsWithStudentCounts.map(assignment => ({
          className: assignment.class?.name || 'Unknown Class',
          subjectCount: assignment.subjectCount || 0,
          studentCount: assignment.studentCount || 0,
          subjects: assignment.subjects?.map(s => s.name) || []
        }))
      }
    };

    console.log('✅ Teacher assignments fetched successfully:', {
      teacher: teacher.username,
      totalClasses,
      totalSubjects,
      assignments: assignmentsWithStudentCounts.length
    });

    res.json(response);
  } catch (err) {
    const { teacherId } = req.params;
    console.error('❌ GET /users/teachers/:teacherId/assignments error:', err);
    
    // Return minimal data on error
    const teacher = await User.findById(teacherId).select('_id firstName lastName middleName username role profileImage').lean();
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.json({
      success: true,
      teacher: {
        id: teacher._id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        middleName: teacher.middleName,
        username: teacher.username,
        role: teacher.role,
        profileImage: teacher.profileImage
      },
      assignments: [],
      summary: {
        totalClasses: 0,
        totalSubjects: 0,
        assignmentsByClass: []
      }
    });
  }
});

// Get teacher's classes (simplified version for dropdowns)
router.get('/teachers/:teacherId/classes', auth, async (req, res) => {
  try {
    const { teacherId } = req.params;

    console.log('👨‍🏫 GET /api/users/teachers/:teacherId/classes - Fetching classes for teacher:', teacherId);

    // Get teacher with assignments
    const teacher = await User.findById(teacherId)
      .populate('teacherAssignments.class', 'name shortName level')
      .populate('teacherAssignments.subjects.subject', 'name code')
      .select('teacherAssignments firstName lastName middleName username profileImage')
      .lean();

    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Extract unique classes
    const classes = [];
    const seenClasses = new Set();

    teacher.teacherAssignments?.forEach(assignment => {
      if (assignment.class && !seenClasses.has(assignment.class._id.toString())) {
        seenClasses.add(assignment.class._id.toString());
        
        // Get subjects for this class assignment
        const subjectsForClass = teacher.teacherAssignments
          .filter(a => a.class?._id?.toString() === assignment.class._id.toString())
          .flatMap(a => a.subjects?.map(s => ({
            id: s.subject?._id,
            name: s.subject?.name,
            code: s.subject?.code
          })) || [])
          .filter(s => s.id);

        classes.push({
          id: assignment.class._id,
          _id: assignment.class._id,
          name: assignment.class.name,
          shortName: assignment.class.shortName,
          level: assignment.class.level,
          subjects: subjectsForClass,
          subjectCount: subjectsForClass.length
        });
      }
    });

    console.log('✅ Teacher classes fetched:', {
      teacher: teacher.username,
      classCount: classes.length
    });

    res.json({
      success: true,
      teacher: {
        id: teacher._id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        middleName: teacher.middleName,
        username: teacher.username,
        profileImage: teacher.profileImage
      },
      classes,
      totalClasses: classes.length
    });
  } catch (err) {
    console.error('❌ GET /users/teachers/:teacherId/classes error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher classes',
      error: err.message
    });
  }
});

// Delete user
router.delete('/:id', auth, checkPermission('delete_users'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('🗑️ DELETE /api/users/:id - Deleting user:', req.params.id);
    
    const user = await User.findById(req.params.id).session(session);
    
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (user.role === 'super_admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ 
        success: false,
        message: 'Cannot delete super admin users' 
      });
    }

    if (user._id.toString() === req.user.id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false,
        message: 'Cannot delete your own account' 
      });
    }

    // Delete profile image if exists
    if (user.profileImage) {
      const uploadDir = path.join(__dirname, '../../uploads/profiles');
      const imagePath = path.join(uploadDir, user.profileImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('🗑️ Deleted profile image:', user.profileImage);
      }
    }

    await User.findByIdAndDelete(req.params.id).session(session);
    await RolePermission.deleteMany({ userId: req.params.id }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.json({ 
      success: true,
      message: 'User deleted successfully',
      deletedUser: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('❌ Delete user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error deleting user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get current user profile
router.get('/profile/me', auth, async (req, res) => {
  try {
    console.log('👤 GET /api/users/profile/me - User ID:', req.user.id);
    
    const user = await User.findById(req.user.id)
      .select('-password -loginAttempts -lockUntil')
      .lean()
      .maxTimeMS(10000);

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Populate class
    if (user.class && mongoose.Types.ObjectId.isValid(user.class)) {
      const classDoc = await Class.findById(user.class)
        .select('name level shortName fullName')
        .lean();
      user.class = classDoc;
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    
    let errorMessage = 'Server error fetching profile';
    if (error.message.includes('timeout')) {
      errorMessage = 'Database timeout. Please try again.';
    }
    
    res.status(500).json({ 
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update current user profile
router.put('/profile/me', auth, async (req, res) => {
  try {
    console.log('📝 PUT /api/users/profile/me - User ID:', req.user.id, 'Data:', req.body);
    
    const { firstName, lastName, middleName, email, phoneNumber, address, dateOfBirth, sex, age, profileImage } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Handle base64 profile image if provided
    if (profileImage !== undefined) {
      if (profileImage && profileImage.startsWith('data:image')) {
        try {
          console.log('📸 Handling base64 profile image update for current user');
          const fileName = await handleBase64Image(profileImage, user._id.toString(), true, user);
          if (fileName) {
            user.profileImage = fileName;
            user.profilePicture = fileName;
            console.log('✅ Base64 image updated for current user:', fileName);
          }
        } catch (imageError) {
          console.error('❌ Error saving base64 image:', imageError.message);
        }
      } else if (profileImage === '' || profileImage === null) {
        // Clear profile image if empty string or null is sent
        const uploadDir = path.join(__dirname, '../../uploads/profiles');
        if (user.profileImage) {
          const oldPath = path.join(uploadDir, user.profileImage);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
        user.profileImage = '';
        user.profilePicture = '';
        console.log('🗑️ Cleared profile image for current user');
      }
    }

    // Update other fields
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.middleName = middleName || user.middleName;
    if (email && email !== user.email) {
      user.email = email.toLowerCase();
    }
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.address = address || user.address;
    user.dateOfBirth = dateOfBirth || user.dateOfBirth;
    user.sex = sex || user.sex;
    user.age = age || user.age;

    await user.save();

    const updatedUser = await User.findById(req.user.id)
      .select('-password -loginAttempts -lockUntil');

    res.json({ 
      success: true,
      message: 'Profile updated successfully', 
      user: updatedUser 
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'Email already exists' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Upload profile image via multipart/form-data (existing route - kept for compatibility)
router.post('/:id/upload-profile-image', auth, checkPermission('edit_users'), async (req, res) => {
  try {
    console.log('🖼️ POST /api/users/:id/upload-profile-image - User ID:', req.params.id);
    
    if (!req.files || !req.files.profileImage) {
      console.log('❌ No profile image uploaded');
      return res.status(400).json({
        success: false,
        message: 'No profile image uploaded'
      });
    }

    const profileImage = req.files.profileImage;
    
    console.log('📄 File upload details:', {
      name: profileImage.name,
      size: profileImage.size,
      mimetype: profileImage.mimetype,
      tempFilePath: profileImage.tempFilePath
    });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(profileImage.mimetype)) {
      console.log('❌ Invalid file type:', profileImage.mimetype);
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.'
      });
    }

    // Validate file size (5MB max)
    if (profileImage.size > 5 * 1024 * 1024) {
      console.log('❌ File too large:', profileImage.size);
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.'
      });
    }

    // Generate unique filename
    const fileExtension = profileImage.name.split('.').pop();
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileName = `profile_${req.params.id}_${timestamp}_${randomString}.${fileExtension}`;
    
    // Define upload path
    const uploadDir = path.join(__dirname, '../../uploads/profiles');
    
    // Ensure upload directory exists
    console.log('📁 Checking upload directory:', uploadDir);
    if (!fs.existsSync(uploadDir)) {
      console.log('📁 Creating upload directory');
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('✅ Upload directory created');
    } else {
      console.log('✅ Upload directory exists');
    }

    const filePath = path.join(uploadDir, fileName);
    console.log('💾 Saving file to:', filePath);
    
    // Move file to upload directory
    await profileImage.mv(filePath);
    console.log('✅ File moved successfully');
    
    // Check if file exists after move
    if (fs.existsSync(filePath)) {
      console.log('✅ File exists on disk after move');
      console.log('📊 File size:', fs.statSync(filePath).size, 'bytes');
    } else {
      console.log('❌ File not found after move!');
    }
    
    // Update user in database
    const user = await User.findById(req.params.id);
    if (!user) {
      console.log('❌ User not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('👤 Found user:', user.username);

    // Delete old profile image if exists
    if (user.profileImage) {
      const oldPath = path.join(uploadDir, user.profileImage);
      console.log('🗑️ Checking old image:', oldPath);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
        console.log('✅ Old image deleted');
      } else {
        console.log('ℹ️ Old image not found');
      }
    }

    // Update user with new profile image
    console.log('💾 Updating user with profileImage:', fileName);
    user.profileImage = fileName;
    user.profilePicture = fileName;
    
    await user.save();
    console.log('✅ User saved with profileImage:', fileName);

    console.log('✅ Profile image uploaded for user:', user.username, 'File:', fileName);

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      profileImage: fileName,
      profileImageUrl: `/uploads/profiles/${fileName}`
    });

  } catch (error) {
    console.error('❌ Profile image upload error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Simple user count for dashboard
router.get('/dashboard/counts', auth, async (req, res) => {
  try {
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const totalUsers = await User.countDocuments({});
    const students = await User.countDocuments({ role: 'student' });
    const teachers = await User.countDocuments({ role: 'teacher' });
    const admins = await User.countDocuments({ role: { $in: ['admin', 'super_admin'] } });
    const activeUsers = await User.countDocuments({ active: true });
    const inactiveUsers = await User.countDocuments({ active: false });

    res.json({
      success: true,
      stats: {
        total: totalUsers,
        students,
        teachers,
        admins,
        active: activeUsers,
        inactive: inactiveUsers,
        byRole: {
          student: students,
          teacher: teachers,
          admin: admins
        }
      }
    });
  } catch (error) {
    console.error('❌ Get dashboard counts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard counts'
    });
  }
});

// routes/users.js - ADD THESE ENDPOINTS

// ============================================================
// ADMIN PARENT CREATION ENDPOINTS
// ============================================================

// Admin: Create parent with children (MOST IMPORTANT - this is what your frontend needs)
router.post('/admin/create-parent', auth, checkPermission('manage_users'), async (req, res) => {
  try {
    console.log('👨‍👧‍👦 POST /api/users/admin/create-parent - Creating parent with children:', req.body);
    
    const {
      firstName,
      lastName,
      username,
      email,
      password,
      phoneNumber,
      address,
      children = [], // Array of student IDs
      notificationPreferences = {
        email: true,
        sms: false,
        push: true,
        frequency: 'immediate'
      },
      active = true
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, username, email, and password are required'
      });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Validate children exist and are students
    const validChildren = [];
    if (children && children.length > 0) {
      try {
        const childUsers = await User.find({
          _id: { $in: children },
          role: 'student',
          active: true
        });
        
        validChildren.push(...childUsers.map(child => child._id));
        
        if (validChildren.length !== children.length) {
          console.warn('⚠️ Some children are invalid:', {
            requested: children.length,
            valid: validChildren.length,
            invalid: children.length - validChildren.length
          });
        }
      } catch (error) {
        console.error('❌ Error validating children:', error);
        // Continue with parent creation even if children validation fails
      }
    }

    console.log('✅ Validated children:', {
      requested: children.length,
      valid: validChildren.length
    });

    // Create parent user
    const parent = new User({
      firstName,
      lastName,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      phoneNumber: phoneNumber || '',
      address: address || '',
      role: 'parent',
      active,
      children: validChildren, // Set children during creation
      notificationPreferences,
      createdBy: req.user.id
    });

    await parent.save();
    console.log('✅ Parent created successfully:', {
      id: parent._id,
      username: parent.username,
      childrenCount: validChildren.length,
      parentCode: parent.parentCode
    });

    // Link children to parent (update children's parents array)
    if (validChildren.length > 0) {
      try {
        await User.updateMany(
          { _id: { $in: validChildren }, role: 'student' },
          { 
            $addToSet: { parents: parent._id },
            $set: { 
              parentEmail: parent.email,
              parentPhoneNumber: parent.phoneNumber 
            }
          }
        );
        console.log('✅ Linked', validChildren.length, 'children to parent');
      } catch (linkError) {
        console.error('❌ Error linking children:', linkError);
        // Don't fail the whole request if linking fails
      }
    }

    // Return the created parent with children populated
    const populatedParent = await User.findById(parent._id)
      .select('-password -loginAttempts -lockUntil -__v')
      .populate({
        path: 'children',
        select: 'firstName lastName studentId className',
        match: { active: true }
      });

    res.status(201).json({
      success: true,
      message: 'Parent created successfully',
      parent: {
        ...populatedParent.toObject(),
        childrenCount: populatedParent.children?.length || 0,
        parentCode: populatedParent.parentCode
      }
    });

  } catch (error) {
    console.error('❌ Parent creation error:', error);
    
    // Format validation errors
    let errorMessages = [];
    if (error.errors) {
      errorMessages = Object.values(error.errors).map(err => err.message);
    } else if (error.message) {
      errorMessages = [error.message];
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create parent',
      error: error.message,
      errors: errorMessages
    });
  }
});

// Admin: Get all parents with children count
router.get('/admin/parents', auth, checkPermission('view_users'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', active = true } = req.query;
    const skip = (page - 1) * limit;

    console.log('📋 GET /api/users/admin/parents - Fetching parents:', {
      search,
      active,
      page,
      limit
    });

    // Build search query
    const query = { role: 'parent' };
    
    if (active !== undefined) {
      query.active = active === 'true';
    }
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { parentCode: { $regex: search, $options: 'i' } }
      ];
    }

    const [parents, total] = await Promise.all([
      User.find(query)
        .select('-password -loginAttempts -lockUntil -__v')
        .populate({
          path: 'children',
          select: 'firstName lastName studentId className',
          match: { active: true }
        })
        .populate('createdBy', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    // Format response with children count
    const formattedParents = parents.map(parent => ({
      ...parent,
      childrenCount: parent.children?.length || 0,
      fullName: `${parent.firstName} ${parent.lastName}`,
      createdByName: parent.createdBy ? 
        `${parent.createdBy.firstName} ${parent.createdBy.lastName}` : 
        'System'
    }));

    console.log('✅ Found', total, 'parents');

    res.json({
      success: true,
      parents: formattedParents,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalParents: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Get parents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parents',
      error: error.message
    });
  }
});

// Admin: Get parent details with children
router.get('/admin/parents/:parentId', auth, checkPermission('view_users'), async (req, res) => {
  try {
    const { parentId } = req.params;
    
    console.log('👤 GET /api/users/admin/parents/:parentId - Fetching parent details:', parentId);

    const parent = await User.findOne({
      _id: parentId,
      role: 'parent'
    })
      .select('-password -loginAttempts -lockUntil -__v')
      .populate({
        path: 'children',
        select: 'firstName lastName studentId className dateOfBirth sex email phoneNumber address',
        match: { active: true },
        populate: {
          path: 'class',
          select: 'name level'
        }
      })
      .populate('createdBy', 'firstName lastName username')
      .populate('parents', 'firstName lastName username email') // If parent has parents (unlikely)
      .lean();

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    // Format response
    const formattedParent = {
      ...parent,
      childrenCount: parent.children?.length || 0,
      fullName: `${parent.firstName} ${parent.lastName}`,
      createdByName: parent.createdBy ? 
        `${parent.createdBy.firstName} ${parent.createdBy.lastName}` : 
        'System',
      children: parent.children?.map(child => ({
        ...child,
        fullName: `${child.firstName} ${child.lastName}`,
        className: child.className || child.class?.name || 'No Class'
      })) || []
    };

    res.json({
      success: true,
      parent: formattedParent
    });

  } catch (error) {
    console.error('❌ Get parent details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parent details',
      error: error.message
    });
  }
});

// Admin: Update parent children (add/remove children)
router.put('/admin/parents/:parentId/children', auth, checkPermission('manage_users'), async (req, res) => {
  try {
    const { parentId } = req.params;
    const { children = [], action = 'set' } = req.body; // action: 'set', 'add', 'remove'
    
    console.log('🔄 PUT /api/users/admin/parents/:parentId/children - Updating parent children:', {
      parentId,
      action,
      childrenCount: children.length
    });

    // Find parent
    const parent = await User.findById(parentId);
    if (!parent || parent.role !== 'parent') {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    // Validate children are students
    const validChildren = [];
    if (children.length > 0) {
      const childUsers = await User.find({
        _id: { $in: children },
        role: 'student',
        active: true
      });
      
      validChildren.push(...childUsers.map(child => child._id));
      
      if (validChildren.length !== children.length) {
        console.warn('⚠️ Some children are invalid');
      }
    }

    // Update children based on action
    let updatedChildren = [];
    let message = '';
    
    switch (action) {
      case 'set':
        // Replace all children
        updatedChildren = validChildren;
        message = 'Children set successfully';
        break;
        
      case 'add':
        // Add children to existing ones
        const existingChildren = parent.children || [];
        const newChildren = validChildren.filter(childId => 
          !existingChildren.includes(childId)
        );
        updatedChildren = [...existingChildren, ...newChildren];
        message = `Added ${newChildren.length} children`;
        break;
        
      case 'remove':
        // Remove specified children
        const currentChildren = parent.children || [];
        updatedChildren = currentChildren.filter(childId => 
          !validChildren.includes(childId)
        );
        message = `Removed ${currentChildren.length - updatedChildren.length} children`;
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Use "set", "add", or "remove"'
        });
    }

    // Update parent's children
    parent.children = updatedChildren;
    await parent.save();

    // Update children's parents array
    if (action === 'set' || action === 'add') {
      // Add parent to children
      await User.updateMany(
        { _id: { $in: validChildren }, role: 'student' },
        { 
          $addToSet: { parents: parent._id },
          $set: { 
            parentEmail: parent.email,
            parentPhoneNumber: parent.phoneNumber 
          }
        }
      );
    }
    
    if (action === 'remove' || action === 'set') {
      // Remove parent from children no longer linked
      const childrenToRemove = [];
      if (action === 'remove') {
        childrenToRemove.push(...validChildren);
      } else if (action === 'set') {
        const previousChildren = parent.children || [];
        const removedChildren = previousChildren.filter(childId => 
          !validChildren.includes(childId)
        );
        childrenToRemove.push(...removedChildren);
      }
      
      if (childrenToRemove.length > 0) {
        await User.updateMany(
          { _id: { $in: childrenToRemove }, role: 'student' },
          { 
            $pull: { parents: parent._id }
          }
        );
      }
    }

    // Get updated parent with children
    const updatedParent = await User.findById(parentId)
      .select('-password -loginAttempts -lockUntil -__v')
      .populate({
        path: 'children',
        select: 'firstName lastName studentId className',
        match: { active: true }
      })
      .lean();

    res.json({
      success: true,
      message,
      parent: {
        ...updatedParent,
        childrenCount: updatedParent.children?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Update parent children error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update parent children',
      error: error.message
    });
  }
});

// ============================================================
// ADMIN FEEDBACK & RESULT VISIBILITY MANAGEMENT
// ============================================================

// Get all parent feedbacks (Admin only)
router.get('/admin/parent-feedbacks', auth, adminAuth, async (req, res) => {
  try {
    console.log('📝 GET /api/users/admin/parent-feedbacks - Fetching all parent feedbacks');
    
    const feedbacks = await Feedback.find()
      .populate('parent', 'name email firstName lastName username profileImage')
      .populate('student', 'name firstName lastName studentId className profileImage')
      .populate('repliedBy', 'firstName lastName username')
      .sort({ createdAt: -1 })
      .lean();

    console.log('✅ Parent feedbacks fetched:', feedbacks.length);

    res.json({ 
      success: true,
      feedbacks,
      total: feedbacks.length 
    });
  } catch (error) {
    console.error('❌ Get parent feedbacks error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Reply to feedback (Admin only)
router.post('/admin/parent-feedbacks/:id/reply', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    
    console.log('📝 POST /api/users/admin/parent-feedbacks/:id/reply - Replying to feedback:', {
      feedbackId: id,
      replyLength: reply?.length
    });

    if (!reply || reply.trim() === '') {
      return res.status(400).json({ 
        success: false,
        message: 'Reply message is required' 
      });
    }

    const feedback = await Feedback.findById(id)
      .populate('parent', 'email firstName lastName')
      .populate('student', 'name studentId');
    
    if (!feedback) {
      return res.status(404).json({ 
        success: false,
        message: 'Feedback not found' 
      });
    }

    feedback.reply = reply.trim();
    feedback.status = 'replied';
    feedback.repliedAt = new Date();
    feedback.repliedBy = req.user._id;
    
    await feedback.save();

    console.log('✅ Reply sent to feedback:', {
      feedbackId: feedback._id,
      parent: feedback.parent?.email,
      status: feedback.status
    });

    // TODO: Uncomment and implement email notification
    // if (feedback.parent?.email) {
    //   await sendFeedbackReplyEmail(feedback);
    // }

    res.json({ 
      success: true,
      message: 'Reply sent successfully', 
      feedback 
    });
  } catch (error) {
    console.error('❌ Reply to feedback error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Archive/Unarchive feedback (Admin only)
router.put('/admin/parent-feedbacks/:id/archive', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'archive' or 'unarchive'
    
    console.log('📝 PUT /api/users/admin/parent-feedbacks/:id/archive - Archive action:', {
      feedbackId: id,
      action
    });

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ 
        success: false,
        message: 'Feedback not found' 
      });
    }

    if (action === 'archive') {
      feedback.status = 'archived';
    } else if (action === 'unarchive') {
      feedback.status = feedback.previousStatus || 'pending';
    } else {
      // Toggle if no action specified
      feedback.status = feedback.status === 'archived' ? 'pending' : 'archived';
    }
    
    await feedback.save();

    console.log('✅ Feedback status updated:', {
      feedbackId: feedback._id,
      newStatus: feedback.status
    });

    res.json({ 
      success: true,
      message: `Feedback ${feedback.status === 'archived' ? 'archived' : 'unarchived'} successfully`, 
      feedback 
    });
  } catch (error) {
    console.error('❌ Archive feedback error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Get all parent feedbacks (Admin only)
router.get('/admin/parent-feedbacks', auth, adminAuth, async (req, res) => {
  try {
    console.log('📝 GET /api/users/admin/parent-feedbacks - Fetching all parent feedbacks');
    
    const feedbacks = await Feedback.find()
      .populate('parent', 'email firstName lastName username profileImage')
      .populate('student', 'firstName lastName studentId className profileImage')
      .populate('repliedBy', 'firstName lastName username')
      .sort({ createdAt: -1 })
      .lean();

    console.log('✅ Parent feedbacks fetched:', feedbacks.length);

    res.json({ 
      success: true,
      feedbacks,
      total: feedbacks.length 
    });
  } catch (error) {
    console.error('❌ Get parent feedbacks error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Reply to feedback (Admin only)
router.post('/admin/parent-feedbacks/:id/reply', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    
    console.log('📝 POST /api/users/admin/parent-feedbacks/:id/reply - Replying to feedback:', {
      feedbackId: id,
      replyLength: reply?.length
    });

    if (!reply || reply.trim() === '') {
      return res.status(400).json({ 
        success: false,
        message: 'Reply message is required' 
      });
    }

    const feedback = await Feedback.findById(id)
      .populate('parent', 'email firstName lastName')
      .populate('student', 'firstName lastName studentId');
    
    if (!feedback) {
      return res.status(404).json({ 
        success: false,
        message: 'Feedback not found' 
      });
    }

    feedback.reply = reply.trim();
    feedback.status = 'replied';
    feedback.repliedAt = new Date();
    feedback.repliedBy = req.user._id;
    
    await feedback.save();

    console.log('✅ Reply sent to feedback:', {
      feedbackId: feedback._id,
      parent: feedback.parent?.email,
      status: feedback.status
    });

    // TODO: Uncomment and implement email notification
    // if (feedback.parent?.email) {
    //   await sendFeedbackReplyEmail(feedback);
    // }

    res.json({ 
      success: true,
      message: 'Reply sent successfully', 
      feedback 
    });
  } catch (error) {
    console.error('❌ Reply to feedback error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Archive/Unarchive feedback (Admin only)
router.put('/admin/parent-feedbacks/:id/archive', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'archive' or 'unarchive'
    
    console.log('📝 PUT /api/users/admin/parent-feedbacks/:id/archive - Archive action:', {
      feedbackId: id,
      action
    });

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ 
        success: false,
        message: 'Feedback not found' 
      });
    }

    if (action === 'archive') {
      feedback.status = 'archived';
    } else if (action === 'unarchive') {
      feedback.status = feedback.previousStatus || 'pending';
    } else {
      // Toggle if no action specified
      feedback.status = feedback.status === 'archived' ? 'pending' : 'archived';
    }
    
    await feedback.save();

    console.log('✅ Feedback status updated:', {
      feedbackId: feedback._id,
      newStatus: feedback.status
    });

    res.json({ 
      success: true,
      message: `Feedback ${feedback.status === 'archived' ? 'archived' : 'unarchived'} successfully`, 
      feedback 
    });
  } catch (error) {
    console.error('❌ Archive feedback error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// ============================================================
// RESULTS VISIBILITY MANAGEMENT ENDPOINTS - FIXED VERSION
// ============================================================

// Get results for visibility management (Admin only) - UPDATED WITH PROPER POPULATION
router.get('/admin/results/visibility', auth, adminAuth, async (req, res) => {
  try {
    const { 
      class: className, 
      examType, 
      term, 
      year, 
      visible,
      page = 1,
      limit = 20,
      studentName,
      search
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    console.log('📊 GET /api/users/admin/results/visibility - Fetching results:', {
      className,
      examType,
      term,
      year,
      visible,
      page,
      limit
    });

    let query = {};
    
    // Handle class name
    if (className) {
      // Try to find class by name first
      const classDoc = await Class.findOne({ 
        $or: [
          { name: className },
          { shortName: className },
          { level: className }
        ]
      }).select('_id').lean();
      
      if (classDoc) {
        query.class = classDoc._id;
      } else {
        query.className = className;
      }
    }
    
    // Handle exam type (test title)
    if (examType) {
      // Find tests with this exam type
      const tests = await Test.find({ 
        title: { $regex: examType, $options: 'i' }
      }).select('_id').lean();
      
      if (tests.length > 0) {
        query.testId = { $in: tests.map(t => t._id) };
      }
    }
    
    if (term) query.term = term;
    if (year) query.session = { $regex: year, $options: 'i' };
    
    // Handle visibility filter
    if (visible !== undefined) {
      if (visible === 'true') {
        query.isVisibleToParent = true;
      } else if (visible === 'false') {
        query.isVisibleToParent = false;
      }
    }
    
    // Search by student name - FIXED THIS PART
    if (studentName || search) {
      const searchTerm = studentName || search;
      const students = await User.find({
        $or: [
          { firstName: { $regex: searchTerm, $options: 'i' } },
          { lastName: { $regex: searchTerm, $options: 'i' } },
          { studentId: { $regex: searchTerm, $options: 'i' } },
          { username: { $regex: searchTerm, $options: 'i' } }
        ],
        role: 'student',
        active: true
      }).select('_id').lean();
      
      if (students.length > 0) {
        query.userId = { $in: students.map(s => s._id) };
      } else {
        // If no students found, return empty results
        query.userId = { $in: [] };
      }
    }

    console.log('🔍 Visibility query:', JSON.stringify(query, null, 2));

    const [results, total] = await Promise.all([
      Result.find(query)
        .populate({
          path: 'userId',
          select: 'firstName lastName middleName username studentId email profileImage',
          match: { role: 'student', active: true }
        })
        .populate('testId', 'title subject totalMarks passingMarks')
        .populate('class', 'name shortName level')
        .populate('updatedBy', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Result.countDocuments(query)
    ]);

    // Format results with proper naming - FIXED THIS PART
    const formattedResults = results.map(result => {
      const student = result.userId || {};
      const classData = result.class || {};
      const testData = result.testId || {};
      
      return {
        _id: result._id,
        userId: student._id, // Keep the ID
        student: { // Add this nested object for frontend compatibility
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          middleName: student.middleName,
          username: student.username,
          studentId: student.studentId,
          email: student.email,
          profileImage: student.profileImage,
          // Combined name for easy display
          fullName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
          displayName: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username
        },
        testId: testData._id,
        testTitle: testData.title,
        subject: result.subject,
        className: classData.name || classData.level || result.className,
        classShortName: classData.shortName,
        classLevel: classData.level,
        session: result.session,
        term: result.term,
        score: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        grade: result.grade,
        isVisibleToParent: result.isVisibleToParent || false,
        scheduledVisibility: result.scheduledVisibility,
        lastUpdated: result.updatedAt || result.createdAt,
        updatedBy: result.updatedBy ? {
          id: result.updatedBy._id,
          name: `${result.updatedBy.firstName || ''} ${result.updatedBy.lastName || ''}`.trim(),
          username: result.updatedBy.username
        } : null,
        submittedAt: result.submittedAt,
        publishedDate: result.isVisibleToParent ? result.updatedAt || result.submittedAt : null
      };
    });

    // Calculate statistics
    const visibleCount = await Result.countDocuments({ ...query, isVisibleToParent: true });
    const scheduledCount = await Result.countDocuments({ 
      ...query, 
      scheduledVisibility: { $ne: null },
      isVisibleToParent: false 
    });
    const hiddenCount = total - visibleCount - scheduledCount;

    console.log('✅ Results fetched for visibility management:', {
      total,
      visibleCount,
      hiddenCount,
      scheduledCount,
      page,
      totalPages: Math.ceil(total / limit)
    });

    res.json({ 
      success: true,
      results: formattedResults,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalResults: total,
        limit: parseInt(limit)
      },
      stats: {
        total,
        visible: visibleCount,
        hidden: hiddenCount,
        scheduled: scheduledCount,
        visiblePercentage: total > 0 ? ((visibleCount / total) * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error('❌ Get results visibility error:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch results for visibility management',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Toggle result visibility (Admin only) - FIXED
router.put('/admin/results/:id/visibility', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { isVisible, notifyParents } = req.body;
    
    console.log('📊 PUT /api/users/admin/results/:id/visibility - Toggling visibility:', {
      resultId: id,
      isVisible,
      notifyParents
    });

    // Find result and populate necessary data
    const result = await Result.findById(id)
      .populate('userId', 'firstName lastName studentId parents email username')
      .populate('testId', 'title subject totalMarks');

    if (!result) {
      return res.status(404).json({ 
        success: false,
        message: 'Result not found' 
      });
    }

    // Update visibility fields
    result.isVisibleToParent = isVisible;
    
    // Clear schedule if manually toggled
    if (isVisible) {
      result.scheduledVisibility = null;
    }
    
    result.updatedAt = new Date();
    result.updatedBy = req.user._id;
    
    await result.save();

    console.log('✅ Result visibility updated:', {
      resultId: result._id,
      student: result.userId?.studentId,
      isVisible,
      previousVisibility: !isVisible
    });

    // Get student's parents if notification is requested
    if (notifyParents && isVisible && result.userId?.parents?.length > 0) {
      try {
        const parents = await User.find({ 
          _id: { $in: result.userId.parents },
          role: 'parent'
        }).select('email firstName lastName');
        
        if (parents.length > 0) {
          // TODO: Implement notification logic
          console.log('📧 Parent notification would be sent for:', {
            student: result.userId.studentId,
            parents: parents.map(p => ({
              name: `${p.firstName} ${p.lastName}`,
              email: p.email
            })),
            result: {
              subject: result.subject,
              score: result.score,
              totalMarks: result.totalMarks,
              percentage: result.percentage,
              grade: result.grade
            }
          });
        }
      } catch (notificationError) {
        console.error('❌ Error preparing parent notification:', notificationError.message);
      }
    }

    res.json({ 
      success: true,
      message: `Result ${isVisible ? 'made visible' : 'hidden'} successfully`,
      result: {
        id: result._id,
        student: result.userId ? {
          id: result.userId._id,
          name: `${result.userId.firstName} ${result.userId.lastName}`,
          studentId: result.userId.studentId
        } : null,
        test: result.testId ? {
          title: result.testId.title,
          subject: result.testId.subject
        } : null,
        score: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        grade: result.grade,
        isVisibleToParent: result.isVisibleToParent,
        scheduledVisibility: result.scheduledVisibility,
        updatedAt: result.updatedAt
      }
    });
  } catch (error) {
    console.error('❌ Toggle result visibility error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update result visibility',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Bulk visibility update (Admin only) - FIXED
router.put('/admin/results/bulk-visibility', auth, adminAuth, async (req, res) => {
  try {
    const { resultIds, isVisible, notifyParents } = req.body;
    
    console.log('📊 PUT /api/users/admin/results/bulk-visibility - Bulk updating visibility:', {
      resultCount: resultIds?.length,
      isVisible,
      notifyParents
    });

    if (!Array.isArray(resultIds) || resultIds.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Result IDs array is required' 
      });
    }

    // Validate result IDs
    const validResultIds = resultIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validResultIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid result IDs provided'
      });
    }

    // Update results with visibility data
    const updateData = {
      isVisibleToParent: isVisible,
      updatedAt: new Date(),
      updatedBy: req.user._id
    };

    // Clear scheduled visibility if making results visible
    if (isVisible) {
      updateData.scheduledVisibility = null;
    }

    const updateResult = await Result.updateMany(
      { _id: { $in: validResultIds } },
      { $set: updateData }
    );

    console.log('✅ Bulk visibility update completed:', {
      requested: resultIds.length,
      valid: validResultIds.length,
      matched: updateResult.matchedCount,
      modified: updateResult.modifiedCount
    });

    // If parents should be notified, get affected students
    if (notifyParents && isVisible) {
      try {
        const affectedResults = await Result.find({
          _id: { $in: validResultIds },
          isVisibleToParent: true
        })
        .populate('userId', 'parents email firstName lastName studentId')
        .select('userId score totalMarks percentage grade subject');
        
        const studentParentMap = new Map();
        
        affectedResults.forEach(result => {
          if (result.userId?.parents?.length > 0) {
            const studentId = result.userId._id.toString();
            if (!studentParentMap.has(studentId)) {
              studentParentMap.set(studentId, {
                student: result.userId,
                results: []
              });
            }
            studentParentMap.get(studentId).results.push({
              subject: result.subject,
              score: result.score,
              totalMarks: result.totalMarks,
              percentage: result.percentage,
              grade: result.grade
            });
          }
        });

        if (studentParentMap.size > 0) {
          // TODO: Implement bulk notification logic
          console.log('📧 Bulk parent notification would be sent for:', {
            affectedStudents: studentParentMap.size,
            totalResults: affectedResults.length
          });
        }
      } catch (notificationError) {
        console.error('❌ Error preparing bulk notification:', notificationError.message);
      }
    }

    res.json({ 
      success: true,
      message: `${updateResult.modifiedCount} results updated successfully`,
      stats: {
        requested: resultIds.length,
        valid: validResultIds.length,
        matched: updateResult.matchedCount,
        modified: updateResult.modifiedCount
      }
    });
  } catch (error) {
    console.error('❌ Bulk visibility update error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to perform bulk visibility update',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Schedule visibility (Admin only) - FIXED
router.post('/admin/results/schedule-visibility', auth, adminAuth, async (req, res) => {
  try {
    const { resultIds, scheduledDate, notifyParents } = req.body;
    
    console.log('📊 POST /api/users/admin/results/schedule-visibility - Scheduling visibility:', {
      resultCount: resultIds?.length,
      scheduledDate,
      notifyParents
    });

    if (!Array.isArray(resultIds) || resultIds.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Result IDs array is required' 
      });
    }

    if (!scheduledDate || new Date(scheduledDate) <= new Date()) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid future date is required for scheduling' 
      });
    }

    // Validate result IDs
    const validResultIds = resultIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validResultIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid result IDs provided'
      });
    }

    const updateResult = await Result.updateMany(
      { _id: { $in: validResultIds } },
      { 
        $set: { 
          scheduledVisibility: new Date(scheduledDate),
          isVisibleToParent: false, // Ensure results are hidden until scheduled time
          updatedAt: new Date(),
          updatedBy: req.user._id
        }
      }
    );

    console.log('✅ Visibility scheduled:', {
      scheduledFor: scheduledDate,
      matched: updateResult.matchedCount,
      modified: updateResult.modifiedCount
    });

    // Schedule a job/cron to make results visible at scheduledDate
    // TODO: Implement scheduling logic
    // scheduleVisibilityJob(validResultIds, scheduledDate, notifyParents);

    res.json({ 
      success: true,
      message: `Visibility scheduled for ${updateResult.modifiedCount} results`,
      scheduledDate,
      stats: {
        requested: resultIds.length,
        valid: validResultIds.length,
        matched: updateResult.matchedCount,
        modified: updateResult.modifiedCount
      }
    });
  } catch (error) {
    console.error('❌ Schedule visibility error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to schedule visibility',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get visibility statistics (Admin only) - FIXED
router.get('/admin/results/visibility-stats', auth, adminAuth, async (req, res) => {
  try {
    console.log('📊 GET /api/users/admin/results/visibility-stats - Fetching visibility statistics');

    // Get total results count
    const totalResults = await Result.countDocuments({ isActive: true });
    
    // Get visibility statistics
    const visibilityStats = await Result.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$isVisibleToParent',
          count: { $sum: 1 },
          averageScore: { $avg: '$score' },
          averagePercentage: { $avg: '$percentage' }
        }
      }
    ]);

    // Get scheduled results count
    const scheduledCount = await Result.countDocuments({
      isActive: true,
      scheduledVisibility: { $ne: null },
      isVisibleToParent: false
    });

    // Calculate visible, hidden, and scheduled counts
    const visibleStats = visibilityStats.find(stat => stat._id === true);
    const hiddenStats = visibilityStats.find(stat => stat._id === false);
    
    const visibleCount = visibleStats ? visibleStats.count : 0;
    const hiddenCount = (hiddenStats ? hiddenStats.count : totalResults) - scheduledCount;

    // Get results by subject with visibility
    const resultsBySubject = await Result.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$subject',
          total: { $sum: 1 },
          visible: { 
            $sum: { 
              $cond: [{ $eq: ['$isVisibleToParent', true] }, 1, 0] 
            } 
          },
          scheduled: { 
            $sum: { 
              $cond: [{ $and: [
                { $ne: ['$scheduledVisibility', null] },
                { $eq: ['$isVisibleToParent', false] }
              ]}, 1, 0] 
            } 
          },
          averageScore: { $avg: '$score' },
          averagePercentage: { $avg: '$percentage' }
        }
      },
      {
        $project: {
          subject: '$_id',
          total: 1,
          visible: 1,
          scheduled: 1,
          hidden: { $subtract: ['$total', { $add: ['$visible', '$scheduled'] }] },
          visiblePercentage: { 
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $multiply: [{ $divide: ['$visible', '$total'] }, 100] }
            ]
          },
          averageScore: { $round: ['$averageScore', 2] },
          averagePercentage: { $round: ['$averagePercentage', 2] },
          _id: 0
        }
      },
      { $sort: { total: -1 } },
      { $limit: 10 } // Top 10 subjects
    ]);

    // Get results by class with visibility
    const resultsByClass = await Result.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'classes',
          localField: 'class',
          foreignField: '_id',
          as: 'classData'
        }
      },
      {
        $unwind: {
          path: '$classData',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$classData.name',
          className: { $first: '$classData.name' },
          total: { $sum: 1 },
          visible: { 
            $sum: { 
              $cond: [{ $eq: ['$isVisibleToParent', true] }, 1, 0] 
            } 
          },
          scheduled: { 
            $sum: { 
              $cond: [{ $and: [
                { $ne: ['$scheduledVisibility', null] },
                { $eq: ['$isVisibleToParent', false] }
              ]}, 1, 0] 
            } 
          },
          averageScore: { $avg: '$score' },
          averagePercentage: { $avg: '$percentage' }
        }
      },
      {
        $project: {
          className: 1,
          total: 1,
          visible: 1,
          scheduled: 1,
          hidden: { $subtract: ['$total', { $add: ['$visible', '$scheduled'] }] },
          visiblePercentage: { 
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $multiply: [{ $divide: ['$visible', '$total'] }, 100] }
            ]
          },
          averageScore: { $round: ['$averageScore', 2] },
          averagePercentage: { $round: ['$averagePercentage', 2] },
          _id: 0
        }
      },
      { $sort: { total: -1 } }
    ]);

    console.log('✅ Visibility statistics fetched');

    res.json({
      success: true,
      stats: {
        total: totalResults,
        visible: visibleCount,
        hidden: hiddenCount,
        scheduled: scheduledCount,
        visiblePercentage: totalResults > 0 ? ((visibleCount / totalResults) * 100).toFixed(1) : 0,
        scheduledPercentage: totalResults > 0 ? ((scheduledCount / totalResults) * 100).toFixed(1) : 0,
        bySubject: resultsBySubject,
        byClass: resultsByClass
      }
    });
  } catch (error) {
    console.error('❌ Get visibility statistics error:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch visibility statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


// ============================================================
// REPORT CARD VISIBILITY MANAGEMENT ENDPOINTS
// ============================================================

// Get report cards for visibility management (Admin only)
router.get('/admin/report-cards/visibility', auth, adminAuth, async (req, res) => {
  try {
    const { 
      class: className, 
      term, 
      year, 
      session,
      visible,
      page = 1,
      limit = 20,
      studentName,
      search,
      hasReportCard = true
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    console.log('📊 GET /api/users/admin/report-cards/visibility - Fetching report cards:', {
      className,
      term,
      year,
      session,
      visible,
      page,
      limit
    });

    // First, get all students
    let studentQuery = { 
      role: 'student',
      active: true 
    };
    
    // Filter by class
    if (className) {
      // Try to find class by name
      const classDoc = await Class.findOne({ 
        $or: [
          { name: className },
          { shortName: className },
          { level: className }
        ]
      }).select('_id').lean();
      
      if (classDoc) {
        studentQuery.class = classDoc._id;
      } else {
        // Try to match class name field
        studentQuery.className = { $regex: className, $options: 'i' };
      }
    }
    
    // Search by student name
    if (studentName || search) {
      const searchTerm = studentName || search;
      studentQuery.$or = [
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { lastName: { $regex: searchTerm, $options: 'i' } },
        { studentId: { $regex: searchTerm, $options: 'i' } },
        { username: { $regex: searchTerm, $options: 'i' } }
      ];
    }
    
    // Get students
    const students = await User.find(studentQuery)
      .populate('class', 'name shortName level')
      .select('_id firstName lastName middleName username studentId email profileImage class')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const totalStudents = await User.countDocuments(studentQuery);
    
    // Now get report card visibility settings for these students
    const studentIds = students.map(s => s._id);
    
    // You'll need to create a ReportCardSettings model or use User model
    // For now, let's assume we're storing report card visibility in User model
    
    // Process each student
    const reportCardsWithVisibility = await Promise.all(students.map(async (student) => {
      // Check if student has results for the specified term/session
      let hasResults = false;
      let canGenerateReportCard = false;
      
      if (term || session || year) {
        const resultQuery = {
          userId: student._id,
          isActive: true
        };
        
        if (term) resultQuery.term = term;
        if (session) resultQuery.session = { $regex: session, $options: 'i' };
        if (year) resultQuery.session = { $regex: year, $options: 'i' };
        
        const resultCount = await Result.countDocuments(resultQuery);
        hasResults = resultCount > 0;
        canGenerateReportCard = resultCount >= 3; // At least 3 results to generate report card
      } else {
        // Check if student has any results at all
        const resultCount = await Result.countDocuments({ userId: student._id, isActive: true });
        hasResults = resultCount > 0;
        canGenerateReportCard = resultCount >= 3;
      }
      
      // Get visibility settings (you'll need to create a ReportCardVisibility model)
      // For now, we'll use a field in User model or create a default object
      const visibilitySettings = {
        isVisibleToParent: student.reportCardVisibleToParent || false,
        scheduledVisibility: student.reportCardScheduledVisibility || null,
        lastUpdated: student.reportCardVisibilityUpdatedAt || null,
        updatedBy: student.reportCardVisibilityUpdatedBy || null
      };
      
      return {
        ...student,
        displayName: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username,
        className: student.class?.name || student.className || 'N/A',
        classLevel: student.class?.level,
        hasResults,
        canGenerateReportCard,
        visibility: visibilitySettings,
        stats: {
          totalResults: await Result.countDocuments({ userId: student._id, isActive: true }),
          visibleResults: await Result.countDocuments({ 
            userId: student._id, 
            isActive: true,
            isVisibleToParent: true 
          }),
          lastResultDate: await Result.findOne({ 
            userId: student._id, 
            isActive: true 
          })
            .sort({ submittedAt: -1 })
            .select('submittedAt')
            .lean()
            .then(r => r?.submittedAt)
        }
      };
    }));
    
    // Filter by visibility if requested
    let filteredReportCards = reportCardsWithVisibility;
    if (visible !== undefined) {
      filteredReportCards = reportCardsWithVisibility.filter(rc => 
        visible === 'true' ? rc.visibility.isVisibleToParent : !rc.visibility.isVisibleToParent
      );
    }
    
    // Filter by hasReportCard if requested
    if (hasReportCard !== undefined) {
      filteredReportCards = filteredReportCards.filter(rc => 
        hasReportCard === 'true' ? rc.canGenerateReportCard : !rc.canGenerateReportCard
      );
    }
    
    // Calculate statistics
    const stats = {
      totalStudents: totalStudents,
      withReportCards: filteredReportCards.filter(rc => rc.canGenerateReportCard).length,
      visibleToParents: filteredReportCards.filter(rc => rc.visibility.isVisibleToParent).length,
      scheduled: filteredReportCards.filter(rc => rc.visibility.scheduledVisibility).length,
      visiblePercentage: filteredReportCards.length > 0 ? 
        ((filteredReportCards.filter(rc => rc.visibility.isVisibleToParent).length / filteredReportCards.length) * 100).toFixed(1) : 0
    };
    
    console.log('✅ Report cards fetched for visibility management:', {
      total: filteredReportCards.length,
      stats,
      page,
      totalPages: Math.ceil(filteredReportCards.length / limit)
    });
    
    res.json({
      success: true,
      reportCards: filteredReportCards,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalStudents / limit),
        totalStudents: totalStudents,
        filteredCount: filteredReportCards.length,
        limit: parseInt(limit)
      },
      stats: stats
    });
    
  } catch (error) {
    console.error('❌ Get report cards visibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report cards for visibility management',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Toggle report card visibility for a student (Admin only)
router.put('/admin/report-cards/:studentId/visibility', auth, adminAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { 
      isVisible, 
      scheduledDate,
      notifyParents,
      term,
      session
    } = req.body;
    
    console.log('📊 PUT /api/users/admin/report-cards/:studentId/visibility - Toggling report card visibility:', {
      studentId,
      isVisible,
      scheduledDate,
      notifyParents,
      term,
      session
    });
    
    // Verify student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Update report card visibility settings
    // You can either store this in User model or create a separate ReportCardVisibility model
    // For now, we'll add fields to User model
    
    student.reportCardVisibleToParent = isVisible;
    
    if (scheduledDate) {
      student.reportCardScheduledVisibility = new Date(scheduledDate);
    } else {
      student.reportCardScheduledVisibility = null;
    }
    
    student.reportCardVisibilityUpdatedAt = new Date();
    student.reportCardVisibilityUpdatedBy = req.user._id;
    
    // Add term and session specific visibility if provided
    if (term || session) {
      if (!student.reportCardVisibilitySettings) {
        student.reportCardVisibilitySettings = [];
      }
      
      const settingIndex = student.reportCardVisibilitySettings.findIndex(s => 
        s.term === term && s.session === session
      );
      
      const visibilitySetting = {
        term: term || 'All Terms',
        session: session || 'All Sessions',
        isVisibleToParent: isVisible,
        scheduledVisibility: scheduledDate ? new Date(scheduledDate) : null,
        updatedAt: new Date(),
        updatedBy: req.user._id
      };
      
      if (settingIndex > -1) {
        student.reportCardVisibilitySettings[settingIndex] = visibilitySetting;
      } else {
        student.reportCardVisibilitySettings.push(visibilitySetting);
      }
    }
    
    await student.save();
    
    console.log('✅ Report card visibility updated:', {
      studentId: student._id,
      studentName: `${student.firstName} ${student.lastName}`,
      isVisible,
      scheduledDate,
      term,
      session
    });
    
    // Notify parents if requested
    if (notifyParents && isVisible && student.parents && student.parents.length > 0) {
      try {
        const parents = await User.find({
          _id: { $in: student.parents },
          role: 'parent',
          active: true
        }).select('email firstName lastName phoneNumber notificationPreferences');
        
        // TODO: Implement notification logic
        console.log('📧 Parent notification would be sent for report card visibility:', {
          student: `${student.firstName} ${student.lastName}`,
          parents: parents.map(p => ({
            name: `${p.firstName} ${p.lastName}`,
            email: p.email,
            phone: p.phoneNumber
          }))
        });
      } catch (notificationError) {
        console.error('❌ Error preparing parent notification:', notificationError.message);
      }
    }
    
    res.json({
      success: true,
      message: `Report card ${isVisible ? 'made visible' : 'hidden'} for parents`,
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        studentId: student.studentId,
        className: student.className,
        visibility: {
          isVisibleToParent: student.reportCardVisibleToParent,
          scheduledVisibility: student.reportCardScheduledVisibility,
          updatedAt: student.reportCardVisibilityUpdatedAt,
          updatedBy: student.reportCardVisibilityUpdatedBy ? {
            id: req.user._id,
            name: `${req.user.firstName} ${req.user.lastName}`
          } : null
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Toggle report card visibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update report card visibility',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Bulk update report card visibility (Admin only)
router.put('/admin/report-cards/bulk-visibility', auth, adminAuth, async (req, res) => {
  try {
    const { 
      studentIds, 
      isVisible, 
      scheduledDate,
      notifyParents,
      term,
      session 
    } = req.body;
    
    console.log('📊 PUT /api/users/admin/report-cards/bulk-visibility - Bulk updating report card visibility:', {
      studentCount: studentIds?.length,
      isVisible,
      scheduledDate,
      notifyParents
    });
    
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Student IDs array is required'
      });
    }
    
    // Validate student IDs
    const validStudentIds = studentIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validStudentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid student IDs provided'
      });
    }
    
    // Update all students
    const updateResult = await User.updateMany(
      { 
        _id: { $in: validStudentIds },
        role: 'student' 
      },
      {
        $set: {
          reportCardVisibleToParent: isVisible,
          reportCardScheduledVisibility: scheduledDate ? new Date(scheduledDate) : null,
          reportCardVisibilityUpdatedAt: new Date(),
          reportCardVisibilityUpdatedBy: req.user._id
        }
      }
    );
    
    console.log('✅ Bulk report card visibility update completed:', {
      requested: studentIds.length,
      valid: validStudentIds.length,
      matched: updateResult.matchedCount,
      modified: updateResult.modifiedCount
    });
    
    // Get updated students for response
    const updatedStudents = await User.find({
      _id: { $in: validStudentIds }
    })
    .select('_id firstName lastName studentId className email parents')
    .populate('parents', 'email firstName lastName')
    .lean();
    
    // Send notifications if requested
    if (notifyParents && isVisible) {
      const studentsWithParents = updatedStudents.filter(s => s.parents && s.parents.length > 0);
      
      // TODO: Implement bulk notification logic
      console.log('📧 Bulk parent notification would be sent for report cards:', {
        affectedStudents: studentsWithParents.length,
        totalParents: studentsWithParents.reduce((sum, s) => sum + s.parents.length, 0)
      });
    }
    
    res.json({
      success: true,
      message: `Report card visibility updated for ${updateResult.modifiedCount} students`,
      stats: {
        requested: studentIds.length,
        valid: validStudentIds.length,
        matched: updateResult.matchedCount,
        modified: updateResult.modifiedCount
      },
      students: updatedStudents.map(s => ({
        id: s._id,
        name: `${s.firstName} ${s.lastName}`,
        studentId: s.studentId,
        className: s.className,
        hasParents: s.parents?.length > 0
      }))
    });
    
  } catch (error) {
    console.error('❌ Bulk report card visibility update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk report card visibility update',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get report card visibility statistics (Admin only)
router.get('/admin/report-cards/visibility-stats', auth, adminAuth, async (req, res) => {
  try {
    console.log('📊 GET /api/users/admin/report-cards/visibility-stats - Fetching visibility statistics');
    
    // Get total students
    const totalStudents = await User.countDocuments({ 
      role: 'student', 
      active: true 
    });
    
    // Get students with report cards (based on results count)
    const studentsWithResults = await User.aggregate([
      { $match: { role: 'student', active: true } },
      {
        $lookup: {
          from: 'results',
          localField: '_id',
          foreignField: 'userId',
          as: 'results'
        }
      },
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          studentId: 1,
          className: 1,
          resultsCount: { $size: '$results' },
          reportCardVisibleToParent: 1,
          reportCardScheduledVisibility: 1
        }
      },
      { $match: { resultsCount: { $gte: 3 } } } // At least 3 results for report card
    ]);
    
    // Calculate statistics
    const studentsWithReportCards = studentsWithResults.length;
    const visibleReportCards = studentsWithResults.filter(s => s.reportCardVisibleToParent).length;
    const scheduledReportCards = studentsWithResults.filter(s => 
      s.reportCardScheduledVisibility && !s.reportCardVisibleToParent
    ).length;
    
    // Group by class
    const classStats = await User.aggregate([
      { $match: { role: 'student', active: true } },
      {
        $lookup: {
          from: 'classes',
          localField: 'class',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$classInfo.name',
          className: { $first: '$classInfo.name' },
          totalStudents: { $sum: 1 },
          visibleReportCards: {
            $sum: { $cond: ['$reportCardVisibleToParent', 1, 0] }
          },
          scheduledReportCards: {
            $sum: { 
              $cond: [
                { 
                  $and: [
                    { $ne: ['$reportCardScheduledVisibility', null] },
                    { $eq: ['$reportCardVisibleToParent', false] }
                  ]
                }, 
                1, 
                0 
              ] 
            }
          }
        }
      },
      {
        $project: {
          className: 1,
          totalStudents: 1,
          visibleReportCards: 1,
          scheduledReportCards: 1,
          visiblePercentage: {
            $cond: [
              { $eq: ['$totalStudents', 0] },
              0,
              { $multiply: [{ $divide: ['$visibleReportCards', '$totalStudents'] }, 100] }
            ]
          },
          _id: 0
        }
      },
      { $sort: { totalStudents: -1 } }
    ]);
    
    // Recent visibility updates
    const recentUpdates = await User.find({
      role: 'student',
      reportCardVisibilityUpdatedAt: { $ne: null }
    })
    .populate('reportCardVisibilityUpdatedBy', 'firstName lastName username')
    .populate('class', 'name')
    .select('firstName lastName studentId className reportCardVisibleToParent reportCardVisibilityUpdatedAt')
    .sort({ reportCardVisibilityUpdatedAt: -1 })
    .limit(10)
    .lean();
    
    console.log('✅ Report card visibility statistics fetched');
    
    res.json({
      success: true,
      stats: {
        totalStudents,
        studentsWithReportCards,
        visibleReportCards,
        scheduledReportCards,
        withoutReportCards: totalStudents - studentsWithReportCards,
        visiblePercentage: studentsWithReportCards > 0 ? 
          ((visibleReportCards / studentsWithReportCards) * 100).toFixed(1) : 0,
        scheduledPercentage: studentsWithReportCards > 0 ? 
          ((scheduledReportCards / studentsWithReportCards) * 100).toFixed(1) : 0
      },
      byClass: classStats,
      recentUpdates: recentUpdates.map(update => ({
        student: `${update.firstName} ${update.lastName}`,
        studentId: update.studentId,
        className: update.class?.name || update.className,
        isVisibleToParent: update.reportCardVisibleToParent,
        updatedAt: update.reportCardVisibilityUpdatedAt,
        updatedBy: update.reportCardVisibilityUpdatedBy ? {
          name: `${update.reportCardVisibilityUpdatedBy.firstName} ${update.reportCardVisibilityUpdatedBy.lastName}`,
          username: update.reportCardVisibilityUpdatedBy.username
        } : null
      }))
    });
    
  } catch (error) {
    console.error('❌ Get report card visibility statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report card visibility statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get student's specific report card visibility settings
router.get('/admin/report-cards/:studentId/visibility-details', auth, adminAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    console.log('📊 GET /api/users/admin/report-cards/:studentId/visibility-details - Fetching visibility details:', studentId);
    
    const student = await User.findById(studentId)
      .populate('class', 'name shortName level')
      .populate('parents', 'firstName lastName email phoneNumber')
      .populate('reportCardVisibilityUpdatedBy', 'firstName lastName username')
      .select('-password -loginAttempts -lockUntil');
    
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Get student's results for each term/session
    const results = await Result.find({ 
      userId: studentId,
      isActive: true 
    })
    .select('session term subject score totalMarks percentage grade isVisibleToParent')
    .sort({ session: -1, term: 1 })
    .lean();
    
    // Group results by session and term
    const resultsBySession = {};
    results.forEach(result => {
      const sessionKey = result.session || 'Unknown Session';
      const termKey = result.term || 'Unknown Term';
      
      if (!resultsBySession[sessionKey]) {
        resultsBySession[sessionKey] = {};
      }
      
      if (!resultsBySession[sessionKey][termKey]) {
        resultsBySession[sessionKey][termKey] = {
          results: [],
          totalScore: 0,
          totalPossible: 0,
          subjects: new Set()
        };
      }
      
      resultsBySession[sessionKey][termKey].results.push(result);
      resultsBySession[sessionKey][termKey].totalScore += result.score || 0;
      resultsBySession[sessionKey][termKey].totalPossible += result.totalMarks || 100;
      resultsBySession[sessionKey][termKey].subjects.add(result.subject);
      
      // Calculate average
      const termData = resultsBySession[sessionKey][termKey];
      termData.averageScore = termData.totalScore / termData.results.length;
      termData.averagePercentage = termData.totalPossible > 0 ? 
        (termData.totalScore / termData.totalPossible) * 100 : 0;
      termData.subjectCount = termData.subjects.size;
    });
    
    // Check if report card can be generated for each term
    const reportCardAvailability = [];
    Object.keys(resultsBySession).forEach(session => {
      Object.keys(resultsBySession[session]).forEach(term => {
        const termData = resultsBySession[session][term];
        const canGenerate = termData.subjectCount >= 3; // At least 3 subjects
        
        // Check specific visibility setting for this term/session
        let termSpecificVisibility = null;
        if (student.reportCardVisibilitySettings) {
          termSpecificVisibility = student.reportCardVisibilitySettings.find(s => 
            s.term === term && s.session === session
          );
        }
        
        reportCardAvailability.push({
          session,
          term,
          canGenerate,
          subjectCount: termData.subjectCount,
          averageScore: termData.averageScore,
          averagePercentage: termData.averagePercentage,
          lastResultDate: termData.results.length > 0 ? 
            termData.results.reduce((latest, r) => 
              r.submittedAt > latest ? r.submittedAt : latest, new Date(0)
            ) : null,
          visibility: termSpecificVisibility || {
            isVisibleToParent: student.reportCardVisibleToParent || false,
            scheduledVisibility: student.reportCardScheduledVisibility || null
          }
        });
      });
    });
    
    res.json({
      success: true,
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        studentId: student.studentId,
        className: student.class?.name || student.className,
        classLevel: student.class?.level,
        parents: student.parents?.map(p => ({
          id: p._id,
          name: `${p.firstName} ${p.lastName}`,
          email: p.email,
          phone: p.phoneNumber
        })) || []
      },
      globalVisibility: {
        isVisibleToParent: student.reportCardVisibleToParent || false,
        scheduledVisibility: student.reportCardScheduledVisibility,
        updatedAt: student.reportCardVisibilityUpdatedAt,
        updatedBy: student.reportCardVisibilityUpdatedBy ? {
          id: student.reportCardVisibilityUpdatedBy._id,
          name: `${student.reportCardVisibilityUpdatedBy.firstName} ${student.reportCardVisibilityUpdatedBy.lastName}`,
          username: student.reportCardVisibilityUpdatedBy.username
        } : null
      },
      termSpecificVisibility: student.reportCardVisibilitySettings || [],
      reportCardAvailability,
      stats: {
        totalResults: results.length,
        uniqueSessions: Object.keys(resultsBySession).length,
        totalTerms: reportCardAvailability.length,
        generatableReportCards: reportCardAvailability.filter(rc => rc.canGenerate).length,
        visibleReportCards: reportCardAvailability.filter(rc => 
          rc.visibility.isVisibleToParent && rc.canGenerate
        ).length
      }
    });
    
  } catch (error) {
    console.error('❌ Get report card visibility details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report card visibility details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


// Bulk create users
router.post('/bulk', auth, checkPermission('create_users'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { users: usersData } = req.body;

    if (!Array.isArray(usersData) || usersData.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Users array is required and cannot be empty'
      });
    }

    const createdUsers = [];
    const errors = [];

    for (const userData of usersData) {
      try {
        const { username: rawUsername, email, password, firstName, lastName, middleName, name, surname, role = 'student', class: classId } = userData;

        // Handle backward compatibility
        const finalFirstName = firstName || name;
        const finalLastName = lastName || surname;

        // Validate required fields
        if (!rawUsername || !email || !password || !finalFirstName || !finalLastName) {
          errors.push({
            username: rawUsername || 'missing',
            error: 'Missing required fields (username, email, password, first name, last name)'
          });
          continue;
        }

        // Clean username
        const username = cleanUsername(rawUsername);
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        
        if (!usernameRegex.test(username)) {
          errors.push({
            username: rawUsername,
            error: 'Username can only contain letters, numbers, and underscores. No spaces allowed.'
          });
          continue;
        }

        // Check for duplicates with timeout
        const existingUser = await User.findOne({
          $or: [
            { username },
            { email: email.toLowerCase() }
          ]
        }).session(session).maxTimeMS(5000);

        if (existingUser) {
          errors.push({
            username,
            error: 'User with this username or email already exists'
          });
          continue;
        }

        // Create user with raw password - model will hash it
        const newUser = new User({
          username,
          email: email.toLowerCase(),
          password: password,
          firstName: finalFirstName,
          lastName: finalLastName,
          middleName,
          role,
          class: classId || null,
          active: true,
          createdBy: req.user.id
        });

        await newUser.save({ session });
        createdUsers.push(newUser._id);

      } catch (error) {
        errors.push({
          username: userData.username || 'unknown',
          error: error.message
        });
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: `Successfully created ${createdUsers.length} users`,
      createdCount: createdUsers.length,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('❌ Bulk create users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating users in bulk',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Test endpoint to verify API is working
router.get('/health/check', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Users API is working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Users API health check failed',
      error: error.message
    });
  }
});

module.exports = router;
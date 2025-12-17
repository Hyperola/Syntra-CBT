// routes/users.js - UPDATED WITH TEACHER AND STUDENT SUBJECT MANAGEMENT
const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Permission = require('../models/Permission');
const RolePermission = require('../models/RolePermission');
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

const router = express.Router();

// Input validation middleware
const validateUserInput = (req, res, next) => {
  const { name, username, role } = req.body;
  
  if (!name || !username || !role) {
    return res.status(400).json({ 
      success: false,
      message: 'Name, username, and role are required' 
    });
  }
  
  if (req.method === 'POST' && !req.body.password) {
    return res.status(400).json({ 
      success: false,
      message: 'Password is required for new users' 
    });
  }
  
  const validRoles = ['super_admin', 'admin', 'teacher', 'student'];
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

// Get all permissions
router.get('/permissions', auth, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Super admin access required.' 
      });
    }

    const permissions = await Permission.find().sort({ category: 1, name: 1 });
    
    res.json({
      success: true,
      permissions,
      count: permissions.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get permissions error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching permissions' 
    });
  }
});

// ==================== FIXED GET / ROUTE ====================
// Get all users with pagination and filtering - FIXED WITH TIMEOUT
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
    
    // Filter by class - FIXED
    if (classId) {
      // Try to parse as ObjectId first
      if (mongoose.Types.ObjectId.isValid(classId)) {
        filter.$or = [
          { class: new mongoose.Types.ObjectId(classId) },
          { 'teacherAssignments.class': new mongoose.Types.ObjectId(classId) }
        ];
      } else {
        // Search by className
        filter.className = { $regex: classId, $options: 'i' };
      }
    }
    
    // Filter by subject (for teachers) - FIXED
    if (subject) {
      if (mongoose.Types.ObjectId.isValid(subject)) {
        filter['teacherAssignments.subjects.subject'] = new mongoose.Types.ObjectId(subject);
      }
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { surname: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    // FIXED: Add timeout and limit to prevent timeouts
    // First, get users without population to avoid CastError
    const users = await User.find(filter)
      .select('-password -loginAttempts -lockUntil')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.min(parseInt(limit), 100)) // Max 100 per page
      .lean()
      .maxTimeMS(15000); // 15 second timeout

    const totalUsers = await User.countDocuments(filter).maxTimeMS(10000);
    const totalPages = Math.ceil(totalUsers / limit);

    console.log('✅ /api/users - Successfully fetched users:', { 
      count: users.length, 
      total: totalUsers 
    });

    // Now manually populate class and clean up subjects
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
      statusCode = 504; // Gateway timeout
    } else if (error.name === 'CastError') {
      errorMessage = 'Invalid data in database. Running cleanup...';
      
      // Try to get simple user count without population
      try {
        const totalUsers = await User.countDocuments({}).maxTimeMS(5000);
        const simpleUsers = await User.find({})
          .select('_id username name surname role active')
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

// Get user by ID - FIXED WITH TIMEOUT
router.get('/:id', auth, checkPermission('view_users'), async (req, res) => {
  try {
    console.log('👤 GET /api/users/:id - User ID:', req.params.id);
    
    // Get user without population first
    const user = await User.findById(req.params.id)
      .select('-password -loginAttempts -lockUntil')
      .lean()
      .maxTimeMS(10000); // 10 second timeout

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

// Create new user - UPDATED WITH ROLE-SPECIFIC HANDLING
router.post('/', auth, checkPermission('create_users'), validateUserInput, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('🆕 POST /api/users - CREATE USER API CALLED:', {
      body: { ...req.body, password: req.body.password ? '***' : 'missing' },
      user: req.user.id
    });

    const { 
      username: rawUsername, 
      name, 
      surname, 
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
      enrolledSubjects = []
    } = req.body;

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

    // For teachers, process assignments if provided
    let processedTeacherAssignments = [];
    if (role === 'teacher' && Array.isArray(teacherAssignments)) {
      for (const assignment of teacherAssignments) {
        if (assignment.classId && assignment.subjectIds && assignment.subjectIds.length > 0) {
          // Verify class exists
          const classExists = await Class.exists({ _id: assignment.classId }).session(session);
          if (classExists) {
            // Verify subjects are assigned to class
            const classData = await Class.findById(assignment.classId)
              .populate('subjectAssignments.subject')
              .session(session);
            
            if (classData) {
              const classSubjectIds = classData.subjectAssignments.map(a => a.subject._id.toString());
              const validSubjectIds = assignment.subjectIds.filter(
                subjectId => classSubjectIds.includes(subjectId.toString())
              );
              
              if (validSubjectIds.length > 0) {
                processedTeacherAssignments.push({
                  class: assignment.classId,
                  subjects: validSubjectIds.map(subjectId => ({
                    subject: subjectId,
                    assignedAt: new Date()
                  }))
                });
              }
            }
          }
        }
      }
    }

    // For students, process enrolled subjects if provided - FIXED WITH SUBJECTNAME
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
        
        // FIX: Get subject names for each subject ID
        processedEnrolledSubjects = await Promise.all(
          uniqueSubjectIds.map(async (subjectId) => {
            const subject = await Subject.findById(subjectId).session(session);
            const isCore = coreSubjectIds.some(coreId => coreId.toString() === subjectId);
            
            return {
              subject: subjectId,
              subjectName: subject ? subject.name : `Subject ${subjectId}`, // ADDED: subjectName field
              class: classId,
              isCore: isCore,
              enrolledAt: new Date()
            };
          })
        );
      }
    }

    // Create new user - password will be hashed by User model
    const userData = {
      username,
      name,
      surname,
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
      teacherAssignments: processedTeacherAssignments,
      enrolledSubjects: processedEnrolledSubjects,
      createdBy: req.user.id
    };

    console.log('💾 Creating user with data:', { ...userData, password: '***' });

    const user = new User(userData);
    await user.save({ session });

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

// Update user - UPDATED WITH NEW TEACHER/STUDENT HANDLING
router.put('/:id', auth, checkPermission('edit_users'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('🔄 PUT /api/users/:id - UPDATE USER API CALLED:', {
      userId: req.params.id,
      body: { ...req.body, password: req.body.password ? '***' : 'not provided' },
      user: req.user.id
    });

    const { 
      username: rawUsername, 
      name, 
      surname, 
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
      enrolledSubjects = []
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

    // Update basic fields
    if (name !== undefined) user.name = name;
    if (surname !== undefined) user.surname = surname;
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
      user.password = req.body.password; // Raw password - model will hash it
      console.log('✅ Password updated');
    }

    // Handle teacher assignments
    if (role === 'teacher' && teacherAssignments !== undefined) {
      if (Array.isArray(teacherAssignments)) {
        const processedAssignments = [];
        for (const assignment of teacherAssignments) {
          if (assignment.classId && assignment.subjectIds && assignment.subjectIds.length > 0) {
            // Verify class exists
            const classExists = await Class.exists({ _id: assignment.classId }).session(session);
            if (classExists) {
              // Verify subjects are assigned to class
              const classData = await Class.findById(assignment.classId)
                .populate('subjectAssignments.subject')
                .session(session);
              
              if (classData) {
                const classSubjectIds = classData.subjectAssignments.map(a => a.subject._id.toString());
                const validSubjectIds = assignment.subjectIds.filter(
                  subjectId => classSubjectIds.includes(subjectId.toString())
                );
                
                if (validSubjectIds.length > 0) {
                  processedAssignments.push({
                    class: assignment.classId,
                    subjects: validSubjectIds.map(subjectId => ({
                      subject: subjectId,
                      assignedAt: new Date()
                    }))
                  });
                }
              }
            }
          }
        }
        user.teacherAssignments = processedAssignments;
        console.log('✅ Updated teacher assignments:', user.teacherAssignments.length);
      } else {
        user.teacherAssignments = [];
      }
    } else if (role !== 'teacher') {
      // Clear assignments for non-teachers
      user.teacherAssignments = [];
    }

    // Handle enrolled subjects for students - FIXED WITH SUBJECTNAME
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
          
          // FIX: Add subjectName field
          user.enrolledSubjects = await Promise.all(
            uniqueSubjectIds.map(async (subjectId) => {
              const subject = await Subject.findById(subjectId).session(session);
              return {
                subject: subjectId,
                subjectName: subject ? subject.name : `Subject ${subjectId}`,
                class: user.class,
                isCore: coreSubjectIds.some(coreId => coreId.toString() === subjectId),
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

// ──────────────────────────────────────────────────────────────
// NEW: Get classes for assignment dropdown
// ──────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────
// NEW: Get subjects for a specific class (for teacher assignment)
// ──────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────
// NEW: Assign subjects to teacher
// ──────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────
// NEW: Remove subject assignment from teacher
// ──────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────
// NEW: Enroll student in subjects
// ──────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────
// NEW: Get student's enrolled subjects
// ──────────────────────────────────────────────────────────────
router.get('/students/:studentId/enrolled-subjects', auth, async (req, res) => {
  try {
    const { studentId } = req.params;

    console.log('👨‍🎓 GET /api/users/students/:studentId/enrolled-subjects - Fetching enrolled subjects for student:', studentId);

    const student = await User.findById(studentId)
      .populate('enrolledSubjects.subject', 'name code category')
      .populate('enrolledSubjects.class', 'name shortName')
      .select('enrolledSubjects name surname username');

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
        name: student.name,
        surname: student.surname,
        username: student.username
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

// ──────────────────────────────────────────────────────────────
// FIXED: Get teacher's assignments - UPDATED TO MATCH TEACHERHOME.JS
// ──────────────────────────────────────────────────────────────
router.get('/teachers/:teacherId/assignments', auth, async (req, res) => {
  try {
    const { teacherId } = req.params;

    console.log('👨‍🏫 GET /api/users/teachers/:teacherId/assignments - Fetching assignments for teacher:', teacherId);

    // Verify teacher exists
    const teacher = await User.findById(teacherId).select('_id name surname username role');
    
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Get teacher with assignments - FIXED: Use proper population
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
      .select('teacherAssignments name surname username role')
      .lean();

    if (!teacherWithAssignments) {
      return res.status(404).json({
        success: false,
        message: 'Teacher assignments not found'
      });
    }

    // Format assignments to match TeacherHome.js expectations
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

    // Prepare response matching TeacherHome.js structure
    const response = {
      success: true,
      teacher: {
        id: teacherWithAssignments._id,
        name: teacherWithAssignments.name,
        surname: teacherWithAssignments.surname,
        username: teacherWithAssignments.username,
        role: teacherWithAssignments.role
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
    
    // Return minimal data on error to prevent TeacherHome from crashing
    const teacher = await User.findById(teacherId).select('_id name surname username role').lean();
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Return empty assignments with teacher info
    res.json({
      success: true,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        surname: teacher.surname,
        username: teacher.username,
        role: teacher.role
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

// ──────────────────────────────────────────────────────────────
// NEW: Get teacher's classes (simplified version for dropdowns)
// ──────────────────────────────────────────────────────────────
router.get('/teachers/:teacherId/classes', auth, async (req, res) => {
  try {
    const { teacherId } = req.params;

    console.log('👨‍🏫 GET /api/users/teachers/:teacherId/classes - Fetching classes for teacher:', teacherId);

    // Get teacher with assignments
    const teacher = await User.findById(teacherId)
      .populate('teacherAssignments.class', 'name shortName level')
      .populate('teacherAssignments.subjects.subject', 'name code')
      .select('teacherAssignments name username')
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
        name: teacher.name,
        username: teacher.username
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

    await User.findByIdAndDelete(req.params.id).session(session);
    await RolePermission.deleteMany({ userId: req.params.id }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.json({ 
      success: true,
      message: 'User deleted successfully',
      deletedUser: {
        id: user._id,
        name: user.name,
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

// Get current user profile - FIXED WITH TIMEOUT
router.get('/profile/me', auth, async (req, res) => {
  try {
    console.log('👤 GET /api/users/profile/me - User ID:', req.user.id);
    
    const user = await User.findById(req.user.id)
      .select('-password -loginAttempts -lockUntil')
      .lean()
      .maxTimeMS(10000); // 10 second timeout

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
    
    const { name, surname, email, phoneNumber, address, dateOfBirth, sex, age } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        name, 
        surname, 
        email: email ? email.toLowerCase() : undefined, 
        phoneNumber, 
        address, 
        dateOfBirth, 
        sex, 
        age 
      },
      { new: true, runValidators: true }
    ).select('-password -loginAttempts -lockUntil');

    res.json({ 
      success: true,
      message: 'Profile updated successfully', 
      user 
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

// Add this route to fix existing invalid data
router.get('/fix/invalid-data', auth, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Super admin access required'
      });
    }

    // Find all users and fix invalid subject references
    const users = await User.find({});
    const results = [];
    
    for (const user of users) {
      let fixed = false;
      let fixedSubjects = 0;
      let fixedEnrolledSubjects = 0;

      // Fix subjects (old format)
      if (user.subjects && user.subjects.length > 0) {
        for (const subjectItem of user.subjects) {
          if (typeof subjectItem.subject === 'string' && !mongoose.Types.ObjectId.isValid(subjectItem.subject)) {
            // Save the string as subjectName
            if (!subjectItem.subjectName) {
              subjectItem.subjectName = subjectItem.subject;
            }
            subjectItem.subject = null;
            fixedSubjects++;
            fixed = true;
          }
        }
      }

      // Fix enrolledSubjects (old format)
      if (user.enrolledSubjects && user.enrolledSubjects.length > 0) {
        for (const enrolledSubject of user.enrolledSubjects) {
          if (typeof enrolledSubject.subject === 'string' && !mongoose.Types.ObjectId.isValid(enrolledSubject.subject)) {
            if (!enrolledSubject.subjectName) {
              enrolledSubject.subjectName = enrolledSubject.subject;
            }
            enrolledSubject.subject = null;
            fixedEnrolledSubjects++;
            fixed = true;
          }
        }
      }

      if (fixed) {
        await user.save();
        results.push({
          username: user.username,
          id: user._id,
          fixedSubjects,
          fixedEnrolledSubjects
        });
      }
    }

    res.json({
      success: true,
      message: 'Fixed invalid data in database',
      totalUsersFixed: results.length,
      results
    });

  } catch (error) {
    console.error('❌ Fix invalid data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fixing invalid data',
      error: error.message
    });
  }
});

// Simple user count for dashboard (doesn't need population)
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

// Bulk create users - FIXED WITH TIMEOUT
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
        const { username: rawUsername, email, password, name, surname, role = 'student', class: classId } = userData;

        // Validate required fields
        if (!rawUsername || !email || !password || !name || !surname) {
          errors.push({
            username: rawUsername || 'missing',
            error: 'Missing required fields (username, email, password, name, surname)'
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
          password: password, // Raw password - model will hash
          name,
          surname,
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
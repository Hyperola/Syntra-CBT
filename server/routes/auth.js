const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// FIXED: Login route - Updated for new schema
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('🔍 POST /api/auth/login - Attempting login for:', username);

    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Username and password are required' 
      });
    }

    // Clean username
    const trimmedUsername = username.trim().toLowerCase();
    console.log('🔍 Looking for user with username:', trimmedUsername);

    // Find user WITH password field
    const user = await User.findOne({ 
      username: trimmedUsername
    }).select('+password'); // Include password field

    if (!user) {
      console.log('❌ POST /api/auth/login - User not found:', trimmedUsername);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid username or password' 
      });
    }

    console.log('✅ POST /api/auth/login - User FOUND:', {
      username: user.username,
      active: user.active,
      blocked: user.blocked,
      _id: user._id
    });

    // Check if user is active and not blocked
    if (!user.active || user.blocked) {
      console.log('❌ POST /api/auth/login - User inactive or blocked');
      return res.status(403).json({ 
        success: false,
        message: 'Account is disabled. Please contact administrator.' 
      });
    }

    // Check password
    console.log('🔍 Checking password...');
    const isMatch = await user.comparePassword(password);
    console.log('🔍 Password match:', isMatch);

    if (!isMatch) {
      console.log('❌ POST /api/auth/login - Password mismatch for:', username);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid username or password' 
      });
    }

    // Get permissions
    const permissions = [];
    if (user.role === 'super_admin') {
      permissions.push('all_permissions');
    } else if (user.role === 'admin' && user.adminPermissions) {
      permissions.push(...user.adminPermissions);
    }

    // FIXED: Update last login WITHOUT triggering validation
    await User.updateOne(
      { _id: user._id },
      { 
        $set: { 
          lastLogin: new Date(),
          loginAttempts: 0 
        },
        $unset: { lockUntil: 1 }
      }
    );

    // Create token
    const token = jwt.sign(
      {
        id: user._id.toString(),
        userId: user._id.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET || 'waec-cbt-secret-123',
      { expiresIn: '24h' }
    );

    console.log('🎉 POST /api/auth/login - SUCCESS:', { 
      username: user.username, 
      userId: user._id, 
      role: user.role 
    });

    // FIXED: Get updated user without password - NO SUBJECT POPULATION
    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('class', 'name level shortName fullName')
      .lean(); // Use lean() to avoid mongoose document overhead

    // Format the response based on user role
    let userResponse = {
      ...updatedUser,
      id: updatedUser._id,
      fullName: `${updatedUser.name || ''} ${updatedUser.surname || ''}`.trim()
    };

    // Remove old fields to avoid confusion
    delete userResponse.__v;
    delete userResponse.loginAttempts;
    delete userResponse.lockUntil;

    // Handle teacher assignments population separately if needed
    if (updatedUser.role === 'teacher' && updatedUser.teacherAssignments && updatedUser.teacherAssignments.length > 0) {
      // If you need to populate teacher assignments, do it separately
      userResponse.teacherAssignments = updatedUser.teacherAssignments;
    }

    // Handle student enrolled subjects
    if (updatedUser.role === 'student' && updatedUser.enrolledSubjects && updatedUser.enrolledSubjects.length > 0) {
      userResponse.enrolledSubjects = updatedUser.enrolledSubjects;
    }

    // Handle parent's children if parent role
    if (updatedUser.role === 'parent' && updatedUser.children && updatedUser.children.length > 0) {
      // Populate children details
      const populatedChildren = await User.find({ 
        _id: { $in: updatedUser.children },
        role: 'student'
      }).select('name surname username email class studentId');
      
      userResponse.children = populatedChildren;
    }

    res.json({
      success: true,
      token,
      user: userResponse,
      permissions
    });
  } catch (error) {
    console.error('💥 POST /api/auth/login - Error:', error.message);
    console.error('💥 Stack trace:', error.stack);
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        message: 'User data validation failed. Please contact administrator.',
        details: error.errors
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error during login' 
    });
  }
});

// PARENT REGISTRATION: Endpoint for parents to register
router.post('/parent/register', async (req, res) => {
  try {
    const { 
      name, 
      surname, 
      email, 
      phone, 
      password, 
      confirmPassword,
      studentUsernames = [], // Array of student usernames to link
      relationship 
    } = req.body;

    console.log('👨‍👩‍👧‍👦 POST /api/auth/parent/register - Attempting parent registration:', { 
      name, surname, email, phone, studentUsernames 
    });

    // Validate required fields
    if (!name || !surname || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, surname, email, phone, and password are required'
      });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ 
      email: email.toLowerCase().trim(),
      role: { $ne: 'student' } // Allow same email for students but not for parents/admins
    });
    
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Check if phone already exists
    const existingPhone = await User.findOne({ 
      phone: phone.trim(),
      role: 'parent' // Phone should be unique for parents
    });
    
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered'
      });
    }

    // Generate username from email
    const username = email.toLowerCase().trim().split('@')[0];
    
    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists. Please use a different email.'
      });
    }

    // Find students by usernames
    const linkedStudents = [];
    if (studentUsernames && studentUsernames.length > 0) {
      for (const studentUsername of studentUsernames) {
        const student = await User.findOne({ 
          username: studentUsername.trim(),
          role: 'student'
        });
        
        if (!student) {
          return res.status(400).json({
            success: false,
            message: `Student with username "${studentUsername}" not found`
          });
        }
        
        // Check if student already has a parent
        if (student.parent && student.parent.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Student "${studentUsername}" is already linked to another parent`
          });
        }
        
        linkedStudents.push(student._id);
      }
    }

    // Create parent user
    const parentData = {
      name: name.trim(),
      surname: surname.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      username,
      password,
      role: 'parent',
      active: true, // Parents are active by default
      blocked: false,
      isEmailVerified: false,
      parentInfo: {
        relationship: relationship || 'Parent',
        occupation: req.body.occupation || '',
        address: req.body.address || ''
      },
      notificationPreferences: {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        weeklyReports: true,
        examResults: true,
        attendanceAlerts: true,
        feeReminders: true
      }
    };

    // Add children if any
    if (linkedStudents.length > 0) {
      parentData.children = linkedStudents;
    }

    const parent = new User(parentData);
    await parent.save();

    console.log('✅ POST /api/auth/parent/register - Parent created:', parent._id);

    // Link parent to students
    if (linkedStudents.length > 0) {
      await User.updateMany(
        { _id: { $in: linkedStudents }, role: 'student' },
        { $addToSet: { parent: parent._id } }
      );
      console.log('✅ Linked parent to', linkedStudents.length, 'students');
    }

    // Create token for auto-login
    const token = jwt.sign(
      {
        id: parent._id.toString(),
        userId: parent._id.toString(),
        role: 'parent',
      },
      process.env.JWT_SECRET || 'waec-cbt-secret-123',
      { expiresIn: '24h' }
    );

    // Get user without password
    const userResponse = await User.findById(parent._id)
      .select('-password -loginAttempts -lockUntil')
      .lean();

    // Format response
    const formattedUser = {
      ...userResponse,
      id: userResponse._id,
      fullName: `${userResponse.name} ${userResponse.surname}`.trim()
    };

    delete formattedUser.__v;

    res.status(201).json({
      success: true,
      message: 'Parent registration successful',
      token,
      user: formattedUser,
      permissions: [] // Parents have basic permissions
    });

  } catch (error) {
    console.error('💥 POST /api/auth/parent/register - Error:', error.message);
    console.error('💥 Stack trace:', error.stack);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during parent registration'
    });
  }
});

// PARENT LOGIN: Separate login for parents (optional, can use main login)
router.post('/parent/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('👨‍👩‍👧‍👦 POST /api/auth/parent/login - Attempting parent login:', email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find parent by email
    const parent = await User.findOne({
      email: email.toLowerCase().trim(),
      role: 'parent'
    }).select('+password');

    if (!parent) {
      console.log('❌ Parent not found:', email);
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if parent is active
    if (!parent.active || parent.blocked) {
      return res.status(403).json({
        success: false,
        message: 'Parent account is disabled. Please contact administrator.'
      });
    }

    // Check password
    const isMatch = await parent.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Password mismatch for parent:', email);
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    await User.updateOne(
      { _id: parent._id },
      {
        $set: {
          lastLogin: new Date(),
          loginAttempts: 0
        },
        $unset: { lockUntil: 1 }
      }
    );

    // Create token
    const token = jwt.sign(
      {
        id: parent._id.toString(),
        userId: parent._id.toString(),
        role: 'parent',
      },
      process.env.JWT_SECRET || 'waec-cbt-secret-123',
      { expiresIn: '24h' }
    );

    // Get parent with populated children
    const parentWithChildren = await User.findById(parent._id)
      .select('-password -loginAttempts -lockUntil')
      .populate({
        path: 'children',
        select: 'name surname username email class studentId active',
        populate: {
          path: 'class',
          select: 'name level shortName'
        }
      })
      .lean();

    // Format response
    const formattedUser = {
      ...parentWithChildren,
      id: parentWithChildren._id,
      fullName: `${parentWithChildren.name} ${parentWithChildren.surname}`.trim()
    };

    delete formattedUser.__v;

    console.log('✅ Parent login successful:', parentWithChildren.email);

    res.json({
      success: true,
      message: 'Parent login successful',
      token,
      user: formattedUser,
      permissions: [] // Parents have basic permissions
    });

  } catch (error) {
    console.error('💥 POST /api/auth/parent/login - Error:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Server error during parent login'
    });
  }
});

// LINK STUDENT: Endpoint for parents to link additional students
router.post('/parent/link-student', async (req, res) => {
  try {
    const { parentId, studentUsername, relationship } = req.body;

    console.log('🔗 POST /api/auth/parent/link-student - Linking student:', {
      parentId, studentUsername, relationship
    });

    if (!parentId || !studentUsername) {
      return res.status(400).json({
        success: false,
        message: 'Parent ID and student username are required'
      });
    }

    // Find parent
    const parent = await User.findOne({
      _id: parentId,
      role: 'parent'
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    // Find student
    const student = await User.findOne({
      username: studentUsername.trim(),
      role: 'student'
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if student is already linked to this parent
    if (parent.children && parent.children.includes(student._id)) {
      return res.status(400).json({
        success: false,
        message: 'Student is already linked to this parent'
      });
    }

    // Check if student already has a parent
    if (student.parent && student.parent.length > 0) {
      // Check if it's the same parent trying to link again
      if (student.parent.includes(parent._id)) {
        return res.status(400).json({
          success: false,
          message: 'Student is already linked to this parent'
        });
      }
      
      // Check if we should allow multiple parents
      const allowMultipleParents = false; // Set this based on your policy
      if (!allowMultipleParents) {
        return res.status(400).json({
          success: false,
          message: 'Student is already linked to another parent'
        });
      }
    }

    // Link student to parent
    parent.children.push(student._id);
    await parent.save();

    // Link parent to student
    if (!student.parent) {
      student.parent = [];
    }
    student.parent.push(parent._id);
    await student.save();

    // Update parent info if relationship provided
    if (relationship && parent.parentInfo) {
      // You might want to store relationship per child
      // For simplicity, updating the general relationship
      parent.parentInfo.relationship = relationship;
      await parent.save();
    }

    console.log('✅ Student linked successfully');

    res.json({
      success: true,
      message: 'Student linked successfully',
      student: {
        id: student._id,
        name: student.name,
        surname: student.surname,
        username: student.username,
        class: student.class
      }
    });

  } catch (error) {
    console.error('💥 POST /api/auth/parent/link-student - Error:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Server error linking student'
    });
  }
});

// FIXED: Get current user route - Updated for new schema
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'waec-cbt-secret-123');
    
    console.log('GET /api/auth/me - User ID:', decoded.id);

    // FIXED: No subject population - use lean()
    const user = await User.findById(decoded.id)
      .select('-password -loginAttempts -lockUntil')
      .populate('class', 'name level shortName fullName')
      .lean(); // Use lean to get plain object

    if (!user) {
      console.log('GET /api/auth/me - User not found in database');
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (!user.active || user.blocked) {
      return res.status(401).json({ 
        success: false,
        message: 'User account is disabled' 
      });
    }

    // Get permissions
    const permissions = [];
    if (user.role === 'super_admin') {
      permissions.push('all_permissions');
    } else if (user.role === 'admin' && user.adminPermissions) {
      permissions.push(...user.adminPermissions);
    }

    console.log('GET /api/auth/me - Success:', user.username);

    // Format response
    let userResponse = {
      ...user,
      id: user._id,
      fullName: `${user.name || ''} ${user.surname || ''}`.trim()
    };

    // Clean up unnecessary fields
    delete userResponse.__v;
    delete userResponse.loginAttempts;
    delete userResponse.lockUntil;

    // Populate children for parent role
    if (user.role === 'parent' && user.children && user.children.length > 0) {
      const children = await User.find({
        _id: { $in: user.children },
        role: 'student'
      }).select('name surname username email class studentId active');
      
      userResponse.children = children;
    }

    res.json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.error('GET /api/auth/me - Error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching user data' 
    });
  }
});

// FIXED: Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        success: false,
        message: 'Token is required' 
      });
    }

    // Verify the old token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'waec-cbt-secret-123');
    
    // Get user
    const user = await User.findById(decoded.id)
      .select('-password')
      .lean();

    if (!user || !user.active || user.blocked) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found or account disabled' 
      });
    }

    // Create new token
    const newToken = jwt.sign(
      {
        id: user._id.toString(),
        userId: user._id.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET || 'waec-cbt-secret-123',
      { expiresIn: '24h' }
    );

    // Get permissions
    const permissions = [];
    if (user.role === 'super_admin') {
      permissions.push('all_permissions');
    } else if (user.role === 'admin' && user.adminPermissions) {
      permissions.push(...user.adminPermissions);
    }

    // Format response
    let userResponse = {
      ...user,
      id: user._id,
      fullName: `${user.name || ''} ${user.surname || ''}`.trim()
    };

    delete userResponse.__v;
    delete userResponse.loginAttempts;
    delete userResponse.lockUntil;

    res.json({ 
      success: true,
      token: newToken,
      user: userResponse
    });
  } catch (error) {
    console.error('POST /api/auth/refresh - Error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error refreshing token' 
    });
  }
});

// Debug endpoint to check database users
router.get('/debug/users', async (req, res) => {
  try {
    const users = await User.find({})
      .select('username name surname email role active blocked')
      .limit(10)
      .lean();
    
    res.json({
      success: true,
      count: users.length,
      users: users.map(u => ({
        id: u._id,
        username: u.username,
        name: u.name,
        surname: u.surname || 'MISSING',
        email: u.email,
        role: u.role,
        active: u.active,
        blocked: u.blocked
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Debug endpoint to check parents
router.get('/debug/parents', async (req, res) => {
  try {
    const parents = await User.find({ role: 'parent' })
      .select('name surname email phone username children parentInfo')
      .populate('children', 'name surname username')
      .lean();
    
    res.json({
      success: true,
      count: parents.length,
      parents: parents.map(p => ({
        id: p._id,
        name: p.name,
        surname: p.surname,
        email: p.email,
        phone: p.phone,
        username: p.username,
        childrenCount: p.children ? p.children.length : 0,
        children: p.children,
        parentInfo: p.parentInfo
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

module.exports = router;
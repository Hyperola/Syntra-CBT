const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
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

module.exports = router;
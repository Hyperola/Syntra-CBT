// middleware/parentAuth.js
const User = require('../models/User');

// Middleware to check if user is a parent
exports.isParent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required' 
    });
  }
  
  if (req.user.role !== 'parent') {
    return res.status(403).json({ 
      error: 'Parent access required' 
    });
  }
  
  next();
};

// Middleware to check if parent has access to specific student
exports.hasAccessToStudent = async (req, res, next) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ 
        error: 'Parent access required' 
      });
    }
    
    const studentId = req.params.studentId || req.body.studentId;
    
    if (!studentId) {
      return res.status(400).json({ 
        error: 'Student ID is required' 
      });
    }
    
    // Check if parent has access to this student
    const parent = await User.findById(req.user.id).select('children');
    
    if (!parent.children || !Array.isArray(parent.children)) {
      return res.status(403).json({ 
        error: 'No children assigned to this parent' 
      });
    }
    
    const hasAccess = parent.children.some(child => 
      child.toString() === studentId.toString()
    );
    
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Parent does not have access to this student' 
      });
    }
    
    // Store student ID in request for later use
    req.studentId = studentId;
    next();
  } catch (error) {
    console.error('Parent access check error:', error);
    res.status(500).json({ 
      error: 'Server error while checking parent access' 
    });
  }
};

// Middleware to validate parent-student relationship for feedback
exports.validateParentStudentRelationship = async (req, res, next) => {
  try {
    const { studentId } = req.body;
    
    if (!studentId) {
      return res.status(400).json({ 
        error: 'Student ID is required' 
      });
    }
    
    // Check if student exists and is active
    const student = await User.findOne({
      _id: studentId,
      role: 'student',
      active: true
    }).select('_id firstName lastName');
    
    if (!student) {
      return res.status(404).json({ 
        error: 'Student not found or inactive' 
      });
    }
    
    // Check if parent has access to this student
    const parent = await User.findById(req.user.id).select('children');
    
    if (!parent.children || !Array.isArray(parent.children)) {
      return res.status(403).json({ 
        error: 'No children assigned to this parent' 
      });
    }
    
    const hasAccess = parent.children.some(child => 
      child.toString() === studentId.toString()
    );
    
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Parent does not have access to this student' 
      });
    }
    
    // Store student info for later use
    req.studentInfo = student;
    next();
  } catch (error) {
    console.error('Parent-student validation error:', error);
    res.status(500).json({ 
      error: 'Server error while validating relationship' 
    });
  }
};
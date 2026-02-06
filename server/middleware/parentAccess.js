// middleware/parentAccess.js
const mongoose = require('mongoose');
const User = require('../models/User');

const validateParentChildRelationship = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID'
      });
    }

    // Get parent
    const parent = await User.findById(req.user.id).select('children').lean();
    
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    // Check if student is one of parent's children
    const isChild = parent.children?.some(child => 
      child.toString() === studentId
    );

    if (!isChild) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this student\'s information'
      });
    }

    req.parent = parent;
    req.studentId = studentId;
    next();
  } catch (error) {
    console.error('Parent-child validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating parent-child relationship'
    });
  }
};

module.exports = { validateParentChildRelationship };
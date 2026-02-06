// models/Class.js - UPDATED VERSION WITH CORRECT UNIQUE INDEX
const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Class name is required'],
    trim: true,
    uppercase: true,
    maxLength: [50, 'Class name too long']
  },
  shortName: {
    type: String,
    required: [true, 'Class short name is required'],
    trim: true,
    uppercase: true,
    maxLength: [10, 'Short name too long']
  },
  level: {
    type: String,
    required: [true, 'Class level is required'],
    enum: {
      values: ['JSS1', 'JSS2', 'JSS3', 'SSS1', 'SSS2', 'SSS3'],
      message: 'Invalid level. Must be JSS1, JSS2, JSS3, SSS1, SSS2, or SSS3'
    }
  },
  grade: {
    type: String,
    trim: true,
    uppercase: true,
    default: function() {
      const gradeMap = {
        'JSS1': 'JSS1',
        'JSS2': 'JSS2', 
        'JSS3': 'JSS3',
        'SSS1': 'SSS1',
        'SSS2': 'SSS2',
        'SSS3': 'SSS3'
      };
      return gradeMap[this.level] || this.level;
    }
  },
  // Stream is required and must be unique within level
  stream: {
    type: String,
    required: [true, 'Stream name is required for class identification'],
    trim: true,
    uppercase: true,
    maxLength: [20, 'Stream name too long']
  },
  section: {
    type: String,
    trim: true,
    uppercase: true,
    maxLength: [10, 'Section name too long'],
    default: null // Changed from '' to null
  },
  fullName: {
    type: String,
    trim: true,
    default: function() {
      const parts = [this.level];
      if (this.stream) parts.push(this.stream);
      if (this.section && this.section.trim() !== '') parts.push(`(${this.section})`);
      return parts.join(' ');
    }
  },
  capacity: {
    type: Number,
    default: 40,
    min: [1, 'Capacity must be at least 1'],
    max: [100, 'Capacity cannot exceed 100']
  },
  classTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  subjectAssignments: {
    type: [{
      subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
      },
      isCore: {
        type: Boolean,
        default: true
      },
      displayOrder: {
        type: Number,
        default: 0
      },
      periodCount: {
        type: Number,
        default: 3,
        min: [1, 'At least 1 period per week required'],
        max: [15, 'Cannot exceed 15 periods per week']
      },
      assignedDate: {
        type: Date,
        default: Date.now
      },
      updatedAt: {
        type: Date,
        default: Date.now
      }
    }],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  metadata: {
    notes: [{
      type: String,
      maxLength: [500, 'Note too long']
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastModifiedAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// CRITICAL FIX: Updated unique index with sparse option
classSchema.index({ 
  level: 1, 
  stream: 1,
  section: 1
}, { 
  unique: true,
  sparse: true, // Allows multiple documents with null/empty section
  name: 'level_stream_section_unique',
  message: function(props) {
    if (props.section) {
      return `A class with level "${props.level}", stream "${props.stream}", and section "${props.section}" already exists. Please use a different stream or section name.`;
    } else {
      return `A class with level "${props.level}" and stream "${props.stream}" already exists. Please use a different stream name.`;
    }
  }
});

// Remove any other unique indexes that might be conflicting
// If you have an index on { level: 1, grade: 1, section: 1, academicYear: 1 }, remove it

// Regular indexes
classSchema.index({ name: 1 }, { unique: false, background: true });
classSchema.index({ shortName: 1 });
classSchema.index({ level: 1 });
classSchema.index({ stream: 1 });
classSchema.index({ grade: 1 });
classSchema.index({ isActive: 1 });
classSchema.index({ displayOrder: 1 });
classSchema.index({ 'metadata.createdBy': 1 });
classSchema.index({ classTeacher: 1 });

// Virtual properties
classSchema.virtual('apiResponse').get(function() {
  return {
    id: this._id,
    name: this.name,
    shortName: this.shortName,
    level: this.level,
    grade: this.grade,
    stream: this.stream,
    section: this.section,
    fullName: this.fullName,
    capacity: this.capacity,
    classTeacher: this.classTeacher,
    subjectCount: this.subjectAssignments ? this.subjectAssignments.length : 0,
    isActive: this.isActive,
    displayOrder: this.displayOrder,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
});

// Pre-save middleware - UPDATED SECTION HANDLING
classSchema.pre('save', function(next) {
  // VALIDATION: Stream is REQUIRED
  if (!this.stream || this.stream.trim() === '') {
    const error = new Error('Stream name is required for class identification');
    error.name = 'ValidationError';
    return next(error);
  }
  
  this.stream = this.stream.trim().toUpperCase();
  
  // CRITICAL FIX: Handle section properly - convert empty to null
  if (this.section === null || this.section === undefined || this.section.trim() === '') {
    this.section = null; // Store as null, not empty string
  } else {
    this.section = this.section.trim().toUpperCase();
  }
  
  // Ensure grade is set
  if (!this.grade || this.grade.trim() === '') {
    const gradeMap = {
      'JSS1': 'JSS1',
      'JSS2': 'JSS2', 
      'JSS3': 'JSS3',
      'SSS1': 'SSS1',
      'SSS2': 'SSS2',
      'SSS3': 'SSS3'
    };
    this.grade = gradeMap[this.level] || this.level;
  }
  this.grade = this.grade.trim().toUpperCase();
  
  // Generate fullName (handles null section)
  const parts = [this.level];
  if (this.stream) parts.push(this.stream);
  if (this.section && this.section.trim() !== '') parts.push(`(${this.section})`);
  this.fullName = parts.join(' ');
  
  // Auto-generate name if not provided
  if (!this.name || this.name.trim() === '') {
    this.name = this.fullName;
  }
  
  // Auto-generate shortName if not provided
  if (!this.shortName || this.shortName.trim() === '') {
    const levelCode = this.level.replace('SS', '');
    const streamCode = this.stream ? this.stream.charAt(0) : '';
    const sectionCode = this.section ? this.section.charAt(0) : '';
    
    if (this.stream) {
      this.shortName = `${levelCode}${streamCode}`;
    } else if (this.section) {
      this.shortName = `${levelCode}${sectionCode}`;
    } else {
      this.shortName = levelCode;
    }
    
    this.shortName = this.shortName.toUpperCase();
  }
  
  // Update timestamps for subject assignments
  if (this.subjectAssignments && Array.isArray(this.subjectAssignments)) {
    this.subjectAssignments.forEach(assignment => {
      if (assignment.isModified && assignment.isModified()) {
        assignment.updatedAt = new Date();
      }
    });
  }
  
  // Update metadata
  if (!this.metadata) {
    this.metadata = {};
  }
  this.metadata.lastModifiedAt = new Date();
  
  next();
});

// Post-init middleware - UPDATED SECTION HANDLING
classSchema.post('init', function(doc) {
  if (!doc) return;
  
  // Ensure grade field exists
  if (doc.grade === undefined || doc.grade === null || doc.grade.trim() === '') {
    const gradeMap = {
      'JSS1': 'JSS1',
      'JSS2': 'JSS2', 
      'JSS3': 'JSS3',
      'SSS1': 'SSS1',
      'SSS2': 'SSS2',
      'SSS3': 'SSS3'
    };
    doc.grade = gradeMap[doc.level] || doc.level || '';
  }
  
  // Ensure stream exists
  if (!doc.stream || doc.stream.trim() === '') {
    const name = doc.name || '';
    if (name.includes('SILVER')) doc.stream = 'SILVER';
    else if (name.includes('EMERALD')) doc.stream = 'EMERALD';
    else if (name.includes('GOLD')) doc.stream = 'GOLD';
    else if (name.includes('DIAMOND')) doc.stream = 'DIAMOND';
    else if (name.includes('SCIENCE')) doc.stream = 'SCIENCE';
    else if (name.includes('ARTS')) doc.stream = 'ARTS';
    else if (name.includes('COMMERCIAL')) doc.stream = 'COMMERCIAL';
    else doc.stream = 'GENERAL';
  }
  
  // CRITICAL FIX: Ensure section is properly handled
  if (doc.section === undefined || doc.section === null || doc.section.trim() === '') {
    doc.section = null; // Set to null, not empty string
  }
  
  // Ensure fullName is set (handles null section)
  if (!doc.fullName) {
    const parts = [doc.level];
    if (doc.stream) parts.push(doc.stream);
    if (doc.section && doc.section.trim() !== '') parts.push(`(${doc.section})`);
    doc.fullName = parts.join(' ');
  }
  
  // Ensure arrays are properly initialized
  if (!doc.subjectAssignments || !Array.isArray(doc.subjectAssignments)) {
    doc.subjectAssignments = [];
  }
});

// Instance methods for subject management
classSchema.methods.addSubjectAssignment = function(subjectId, isCore = true, periodCount = 3, displayOrder = 0) {
  const existingIndex = this.subjectAssignments.findIndex(
    assignment => assignment.subject && assignment.subject.toString() === subjectId
  );
  
  if (existingIndex >= 0) {
    this.subjectAssignments[existingIndex].isCore = isCore;
    this.subjectAssignments[existingIndex].periodCount = periodCount;
    this.subjectAssignments[existingIndex].displayOrder = displayOrder;
    this.subjectAssignments[existingIndex].updatedAt = new Date();
  } else {
    this.subjectAssignments.push({
      subject: subjectId,
      isCore: isCore,
      periodCount: periodCount,
      displayOrder: displayOrder,
      assignedDate: new Date(),
      updatedAt: new Date()
    });
  }
  
  return this.save();
};

classSchema.methods.removeSubjectAssignment = function(subjectId) {
  this.subjectAssignments = this.subjectAssignments.filter(
    assignment => !assignment.subject || assignment.subject.toString() !== subjectId
  );
  return this.save();
};

classSchema.methods.updateSubjectCoreStatus = function(subjectId, isCore) {
  const assignment = this.subjectAssignments.find(
    a => a.subject && a.subject.toString() === subjectId
  );
  
  if (assignment) {
    assignment.isCore = isCore;
    assignment.updatedAt = new Date();
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Static methods
classSchema.statics.findByLevel = function(level) {
  return this.find({ 
    level: level.toUpperCase(), 
    isActive: true 
  })
    .populate('classTeacher', 'firstName lastName email')
    .sort({ stream: 1, section: 1, displayOrder: 1, name: 1 });
};

classSchema.statics.findActiveClasses = function() {
  return this.find({ isActive: true })
    .populate('classTeacher', 'firstName lastName email')
    .sort({ level: 1, stream: 1, section: 1, displayOrder: 1, name: 1 });
};

classSchema.statics.findByStream = function(stream) {
  return this.find({ 
    stream: stream.toUpperCase(),
    isActive: true 
  })
    .populate('classTeacher', 'firstName lastName email')
    .sort({ level: 1, section: 1, displayOrder: 1, name: 1 });
};

classSchema.statics.deactivateClass = function(classId, userId) {
  return this.findByIdAndUpdate(
    classId,
    {
      isActive: false,
      $set: {
        'metadata.lastModifiedBy': userId,
        'metadata.lastModifiedAt': new Date()
      },
      $push: {
        'metadata.notes': `Class deactivated by ${userId} on ${new Date().toLocaleDateString()}`
      }
    },
    { new: true }
  );
};

classSchema.statics.reactivateClass = function(classId, userId) {
  return this.findByIdAndUpdate(
    classId,
    {
      isActive: true,
      $set: {
        'metadata.lastModifiedBy': userId,
        'metadata.lastModifiedAt': new Date()
      },
      $push: {
        'metadata.notes': `Class reactivated by ${userId} on ${new Date().toLocaleDateString()}`
      }
    },
    { new: true }
  );
};

// Check for duplicate class (level + stream + section) - UPDATED SECTION HANDLING
classSchema.statics.checkDuplicate = async function(level, stream, section, excludeId = null) {
  const query = {
    level: level.toUpperCase(),
    stream: stream ? stream.trim().toUpperCase() : '',
    isActive: true
  };
  
  // Handle section properly - treat empty/null as same
  if (section && section.trim() !== '') {
    query.section = section.trim().toUpperCase();
  } else {
    // Check for null, empty string, or undefined
    query.$or = [
      { section: null },
      { section: '' },
      { section: { $exists: false } }
    ];
  }
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return await this.findOne(query);
};

classSchema.statics.getAllStreams = async function() {
  const streams = await this.distinct('stream', { isActive: true });
  return streams.filter(stream => stream !== null && stream !== undefined && stream.trim() !== '');
};

classSchema.statics.getStreamsByLevel = async function(level) {
  const streams = await this.distinct('stream', { 
    level: level.toUpperCase(),
    isActive: true 
  });
  return streams.filter(stream => stream !== null && stream !== undefined && stream.trim() !== '');
};

classSchema.statics.getClassHierarchy = async function() {
  const classes = await this.find({ isActive: true })
    .sort({ level: 1, stream: 1, section: 1 })
    .select('level grade stream section fullName');
  
  const hierarchy = {};
  
  classes.forEach(cls => {
    if (!hierarchy[cls.level]) {
      hierarchy[cls.level] = [];
    }
    
    hierarchy[cls.level].push({
      id: cls._id,
      fullName: cls.fullName,
      stream: cls.stream,
      section: cls.section,
      grade: cls.grade
    });
  });
  
  return hierarchy;
};

// Middleware to handle duplicate key errors - UPDATED ERROR MESSAGES
classSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    let errorMessage = 'Duplicate class detected. ';
    
    if (error.keyPattern) {
      if (error.keyPattern.level && error.keyPattern.stream && error.keyPattern.section) {
        if (doc.section) {
          errorMessage = `A class with level "${doc.level}", stream "${doc.stream}", and section "${doc.section}" already exists. Please use a different stream or section name.`;
        } else {
          errorMessage = `A class with level "${doc.level}" and stream "${doc.stream}" already exists. Please use a different stream name.`;
        }
      } else if (error.keyPattern.name) {
        errorMessage = `Class name "${doc.name}" is already in use.`;
      } else if (error.keyPattern.shortName) {
        errorMessage = `Class short name "${doc.shortName}" already exists.`;
      } else if (error.keyPattern.level && error.keyPattern.grade && error.keyPattern.section && error.keyPattern.academicYear) {
        // Remove this index if it exists - it's causing conflicts
        errorMessage = 'System configuration error. Please contact administrator.';
      }
    }
    
    next(new Error(errorMessage));
  } else {
    next(error);
  }
});

module.exports = mongoose.model('Class', classSchema);
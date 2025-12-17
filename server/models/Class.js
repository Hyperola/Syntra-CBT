const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Class name is required'],
    trim: true,
    uppercase: true,
    unique: true,
    maxLength: [50, 'Class name too long']
  },
  shortName: {
    type: String,
    required: [true, 'Class short name is required'],
    trim: true,
    uppercase: true,
    unique: true,
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
  stream: {
    type: String,
    trim: true,
    uppercase: true,
    maxLength: [20, 'Stream name too long']
  },
  fullName: {
    type: String,
    trim: true,
    default: function() {
      return `${this.level}${this.stream ? ` ${this.stream}` : ''}`;
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
  // ADDED: Direct subject assignments for the class
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
      }
    }],
    default: []
  },
  students: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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
  academicYear: {
    type: String,
    default: () => {
      const year = new Date().getFullYear();
      return `${year}/${year + 1}`;
    }
  },
  metadata: {
    notes: {
      type: String,
      maxLength: [500, 'Notes too long']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
classSchema.index({ level: 1, stream: 1 }, { unique: true });
classSchema.index({ shortName: 1 }, { unique: true });
classSchema.index({ name: 1 }, { unique: true });
classSchema.index({ isActive: 1 });
classSchema.index({ displayOrder: 1 });
classSchema.index({ academicYear: 1 });

// Virtual properties with null checks
classSchema.virtual('studentCount').get(function() {
  return this.students && Array.isArray(this.students) ? this.students.length : 0;
});

classSchema.virtual('subjectCount').get(function() {
  return this.subjectAssignments && Array.isArray(this.subjectAssignments) ? this.subjectAssignments.length : 0;
});

classSchema.virtual('apiResponse').get(function() {
  return {
    id: this._id,
    name: this.name,
    shortName: this.shortName,
    level: this.level,
    stream: this.stream,
    fullName: this.fullName,
    capacity: this.capacity,
    classTeacher: this.classTeacher,
    studentCount: this.studentCount,
    subjectCount: this.subjectCount,
    isActive: this.isActive,
    displayOrder: this.displayOrder,
    academicYear: this.academicYear,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
});

// Static methods
classSchema.statics.findByLevel = function(level) {
  return this.find({ level, isActive: true })
    .populate('classTeacher', 'firstName lastName email')
    .populate('students', 'firstName lastName studentId')
    .populate('subjectAssignments.subject', 'name code category')
    .sort({ displayOrder: 1, name: 1 });
};

classSchema.statics.findActiveClasses = function() {
  return this.find({ isActive: true })
    .populate('classTeacher', 'firstName lastName email')
    .populate('subjectAssignments.subject', 'name code category')
    .sort({ level: 1, displayOrder: 1, name: 1 });
};

// Instance methods for subject management
classSchema.methods.addSubjectAssignment = function(subjectId, isCore = true) {
  // Initialize subjectAssignments if it doesn't exist
  if (!this.subjectAssignments || !Array.isArray(this.subjectAssignments)) {
    this.subjectAssignments = [];
  }
  
  // Check if subject already assigned
  const existingAssignment = this.subjectAssignments.find(
    assignment => assignment.subject && assignment.subject.toString() === subjectId.toString()
  );
  
  if (!existingAssignment) {
    this.subjectAssignments.push({
      subject: subjectId,
      isCore: isCore
    });
  }
  return this.save();
};

classSchema.methods.removeSubjectAssignment = function(subjectId) {
  if (!this.subjectAssignments || !Array.isArray(this.subjectAssignments)) {
    return this.save();
  }
  
  this.subjectAssignments = this.subjectAssignments.filter(
    assignment => assignment.subject && assignment.subject.toString() !== subjectId.toString()
  );
  return this.save();
};

classSchema.methods.updateSubjectCoreStatus = function(subjectId, isCore) {
  if (!this.subjectAssignments || !Array.isArray(this.subjectAssignments)) {
    return this.save();
  }
  
  const assignment = this.subjectAssignments.find(
    a => a.subject && a.subject.toString() === subjectId.toString()
  );
  
  if (assignment) {
    assignment.isCore = isCore;
  }
  return this.save();
};

classSchema.methods.getCoreSubjects = function() {
  if (!this.subjectAssignments || !Array.isArray(this.subjectAssignments)) {
    return [];
  }
  return this.subjectAssignments.filter(assignment => assignment.isCore);
};

classSchema.methods.getElectiveSubjects = function() {
  if (!this.subjectAssignments || !Array.isArray(this.subjectAssignments)) {
    return [];
  }
  return this.subjectAssignments.filter(assignment => !assignment.isCore);
};

// Pre-save middleware
classSchema.pre('save', function(next) {
  // Ensure fullName is properly formatted
  this.fullName = `${this.level}${this.stream ? ` ${this.stream}` : ''}`;
  
  // Generate shortName if not provided
  if (!this.shortName) {
    this.shortName = this.level.replace('SS', '');
  }
  
  // Ensure arrays are initialized
  if (!this.subjectAssignments || !Array.isArray(this.subjectAssignments)) {
    this.subjectAssignments = [];
  }
  
  if (!this.students || !Array.isArray(this.students)) {
    this.students = [];
  }
  
  next();
});

module.exports = mongoose.model('Class', classSchema);
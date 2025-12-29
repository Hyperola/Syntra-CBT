// models/Class.js - UPDATED FOR STREAMS SUPPORT
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
  stream: {
    type: String,
    trim: true,
    uppercase: true,
    maxLength: [20, 'Stream name too long'],
    default: ''
  },
  section: {
    type: String,
    trim: true,
    uppercase: true,
    maxLength: [10, 'Section name too long'],
    default: ''
  },
  fullName: {
    type: String,
    trim: true,
    default: function() {
      const parts = [this.level];
      if (this.stream) parts.push(this.stream);
      if (this.section) parts.push(`(${this.section})`);
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

// UPDATED INDEX: Allow same level with different stream/section
classSchema.index({ 
  level: 1, 
  stream: 1, 
  section: 1, 
  academicYear: 1 
}, { 
  unique: true,
  partialFilterExpression: { isActive: true }
});

// Other indexes
classSchema.index({ name: 1 }, { unique: true });
classSchema.index({ shortName: 1 }, { unique: true });
classSchema.index({ isActive: 1 });
classSchema.index({ displayOrder: 1 });
classSchema.index({ academicYear: 1 });
classSchema.index({ 'metadata.createdBy': 1 });

// Virtual properties
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
    section: this.section,
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

// Pre-save middleware
classSchema.pre('save', function(next) {
  // Ensure fullName is properly formatted
  const parts = [this.level];
  if (this.stream) parts.push(this.stream);
  if (this.section) parts.push(`(${this.section})`);
  this.fullName = parts.join(' ');
  
  // Generate name if not provided
  if (!this.name && this.level) {
    this.name = this.fullName;
  }
  
  // Generate shortName if not provided
  if (!this.shortName) {
    const baseShortName = this.level.replace('SS', '');
    if (this.stream) {
      this.shortName = `${baseShortName}${this.stream.charAt(0)}`;
    } else if (this.section) {
      this.shortName = `${baseShortName}${this.section}`;
    } else {
      this.shortName = baseShortName;
    }
  }
  
  // Ensure arrays are initialized
  if (!this.subjectAssignments || !Array.isArray(this.subjectAssignments)) {
    this.subjectAssignments = [];
  }
  
  if (!this.students || !Array.isArray(this.students)) {
    this.students = [];
  }
  
  // Initialize metadata if not set
  if (!this.metadata) {
    this.metadata = {
      notes: [],
      createdBy: null,
      lastModifiedBy: null,
      lastModifiedAt: new Date()
    };
  }
  
  next();
});

module.exports = mongoose.model('Class', classSchema);
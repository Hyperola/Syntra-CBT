// models/ClassSubject.js
const mongoose = require('mongoose');

const classSubjectSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class reference is required']
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'Subject reference is required']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isCompulsory: { 
    type: Boolean, 
    default: true 
  },
  periodCount: { 
    type: Number, 
    default: 3, 
    min: [1, 'At least 1 period per week required'],
    max: [15, 'Cannot exceed 15 periods per week']
  },
  room: {
    type: String,
    trim: true,
    uppercase: true,
    maxLength: [20, 'Room name too long']
  },
  academicYear: {
    type: String,
    default: () => {
      const year = new Date().getFullYear();
      return `${year}/${year + 1}`;
    },
    trim: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  metadata: { 
    notes: {
      type: String,
      maxLength: [500, 'Notes too long']
    }
  }
}, { 
  timestamps: true, 
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Unique composite index - one subject per class
classSubjectSchema.index({ class: 1, subject: 1 }, { unique: true });

// Performance indexes
classSubjectSchema.index({ teacher: 1 });
classSubjectSchema.index({ class: 1, isCompulsory: 1 });
classSubjectSchema.index({ subject: 1, isCompulsory: 1 });
classSubjectSchema.index({ isCompulsory: 1 });
classSubjectSchema.index({ academicYear: 1 });
classSubjectSchema.index({ displayOrder: 1 });

// Virtual Properties
classSubjectSchema.virtual('isElective').get(function() {
  return !this.isCompulsory;
});

classSubjectSchema.virtual('hoursPerWeek').get(function() {
  // Calculate total hours per week (assuming 40-minute periods)
  return Math.round((this.periodCount * 40 / 60) * 100) / 100; // 2 decimal places
});

classSubjectSchema.virtual('apiResponse').get(function() {
  return {
    id: this._id,
    class: this.class,
    subject: this.subject,
    teacher: this.teacher,
    isCompulsory: this.isCompulsory,
    isElective: this.isElective,
    periodCount: this.periodCount,
    hoursPerWeek: this.hoursPerWeek,
    room: this.room,
    academicYear: this.academicYear,
    displayOrder: this.displayOrder,
    metadata: this.metadata,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
});

// Static Methods
classSubjectSchema.statics.findByClass = function(classId, options = {}) {
  const { populateTeacher = true, populateSubject = true } = options;
  
  let query = this.find({ class: classId });
  
  if (populateSubject) {
    query = query.populate('subject');
  }
  
  if (populateTeacher) {
    query = query.populate('teacher', 'username firstName lastName email');
  }
  
  return query.sort({ isCompulsory: -1, displayOrder: 1, 'subject.name': 1 });
};

classSubjectSchema.statics.findByTeacher = function(teacherId) {
  return this.find({ teacher: teacherId })
    .populate('class')
    .populate('subject')
    .sort({ 'class.name': 1, 'subject.name': 1 });
};

classSubjectSchema.statics.findCompulsorySubjects = function(classId) {
  return this.find({ class: classId, isCompulsory: true })
    .populate('subject')
    .sort({ displayOrder: 1, 'subject.name': 1 });
};

classSubjectSchema.statics.findElectiveSubjects = function(classId) {
  return this.find({ class: classId, isCompulsory: false })
    .populate('subject')
    .sort({ displayOrder: 1, 'subject.name': 1 });
};

classSubjectSchema.statics.getSubjectsByClass = function(classId) {
  return this.find({ class: classId })
    .populate('subject')
    .populate('teacher', 'firstName lastName')
    .then(results => results.map(item => ({
      subject: item.subject,
      teacher: item.teacher,
      isCompulsory: item.isCompulsory,
      periodCount: item.periodCount,
      room: item.room
    })));
};

// Instance Methods
classSubjectSchema.methods.assignTeacher = function(teacherId) {
  this.teacher = teacherId;
  return this.save();
};

classSubjectSchema.methods.updatePeriods = function(newPeriodCount) {
  this.periodCount = Math.max(1, Math.min(15, newPeriodCount));
  return this.save();
};

classSubjectSchema.methods.toggleCompulsory = function() {
  this.isCompulsory = !this.isCompulsory;
  return this.save();
};

// Pre-save middleware to ensure data consistency
classSubjectSchema.pre('save', function(next) {
  // Ensure room is uppercase and trimmed
  if (this.room) {
    this.room = this.room.trim().toUpperCase();
  }
  
  next();
});

module.exports = mongoose.model('ClassSubject', classSubjectSchema);
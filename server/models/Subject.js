// models/Subject.js - UPDATED
const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true,
    uppercase: true,
    unique: true,
    maxLength: [100, 'Subject name too long']
  },
  code: {
    type: String,
    trim: true,
    uppercase: true,
    unique: true,
    maxLength: [10, 'Subject code too long']
  },
  category: {
    type: String,
    default: 'Core',
    enum: {
      values: ['Core', 'Elective', 'Optional', 'General'],
      message: 'Category must be Core, Elective, Optional, or General'
    }
  },
  isCore: { // ADDED: Default core status for new class assignments
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true,
    maxLength: [500, 'Description too long']
  },
  displayName: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
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
subjectSchema.index({ name: 1 }, { unique: true });
subjectSchema.index({ code: 1 }, { unique: true });
subjectSchema.index({ category: 1 });
subjectSchema.index({ isActive: 1 });
subjectSchema.index({ isCore: 1 }); // ADDED

// Virtual properties
subjectSchema.virtual('apiResponse').get(function() {
  return {
    id: this._id,
    name: this.name,
    code: this.code,
    category: this.category,
    isCore: this.isCore, // ADDED
    description: this.description,
    displayName: this.displayName || this.name,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
});

// Pre-save middleware
subjectSchema.pre('save', function(next) {
  // Set displayName if not provided
  if (!this.displayName) {
    this.displayName = this.name;
  }
  
  // Ensure isCore is true for Core category subjects
  if (this.category === 'Core' && !this.isCore) {
    this.isCore = true;
  }
  
  next();
});

// Static methods
subjectSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ name: 1 });
};

subjectSchema.statics.findCoreSubjects = function() {
  return this.find({ isCore: true, isActive: true }).sort({ name: 1 });
};

subjectSchema.statics.findElectiveSubjects = function() {
  return this.find({ isCore: false, isActive: true }).sort({ name: 1 });
};

subjectSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Instance methods
subjectSchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

subjectSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

subjectSchema.methods.toggleCoreStatus = function() {
  this.isCore = !this.isCore;
  return this.save();
};

module.exports = mongoose.model('Subject', subjectSchema);
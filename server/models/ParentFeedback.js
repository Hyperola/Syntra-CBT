// models/ParentFeedback.js - FIXED VERSION
const mongoose = require('mongoose');

const parentFeedbackSchema = new mongoose.Schema({
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  category: {
    type: String,
    required: true,
    enum: ['Academic', 'Behavior', 'Attendance', 'Fee', 'General', 'Technical']
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  reply: {
    type: String,
    maxlength: 2000,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'replied', 'archived'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  repliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  repliedAt: {
    type: Date
  },
  attachments: [{
    filename: String,
    path: String,
    mimeType: String,
    size: Number
  }],
  responseRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Virtual for hasResponse (computed field)
parentFeedbackSchema.virtual('hasResponse').get(function() {
  return !!this.reply;
});

// Ensure virtuals are included in JSON output
parentFeedbackSchema.set('toJSON', { virtuals: true });
parentFeedbackSchema.set('toObject', { virtuals: true });

// Indexes for efficient queries
parentFeedbackSchema.index({ parent: 1, createdAt: -1 });
parentFeedbackSchema.index({ status: 1 });
parentFeedbackSchema.index({ category: 1 });
parentFeedbackSchema.index({ priority: 1 });
parentFeedbackSchema.index({ student: 1 });

// Middleware to update repliedAt when reply is set
parentFeedbackSchema.pre('save', function(next) {
  if (this.isModified('reply') && this.reply && !this.repliedAt) {
    this.repliedAt = new Date();
    this.status = 'replied';
  }
  
  // If reply is removed or cleared, reset repliedAt
  if (this.isModified('reply') && !this.reply && this.repliedAt) {
    this.repliedAt = undefined;
    this.status = 'pending';
    this.repliedBy = undefined;
  }
  
  next();
});

const ParentFeedback = mongoose.model('ParentFeedback', parentFeedbackSchema);

module.exports = ParentFeedback;
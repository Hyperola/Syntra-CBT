// models/ReportCardAccess.js
const mongoose = require('mongoose');

const reportCardAccessSchema = new mongoose.Schema({
  resultId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Result',
    required: true,
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  accessType: {
    type: String,
    enum: ['viewed', 'downloaded'],
    required: true
  },
  accessedAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: String,
  userAgent: String,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for frequent queries
reportCardAccessSchema.index({ resultId: 1, parentId: 1 });
reportCardAccessSchema.index({ studentId: 1, parentId: 1 });
reportCardAccessSchema.index({ parentId: 1, accessedAt: -1 });

module.exports = mongoose.model('ReportCardAccess', reportCardAccessSchema);
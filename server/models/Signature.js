const mongoose = require('mongoose');

const signatureSchema = new mongoose.Schema({
  class: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Class', 
    required: false 
  },
  className: { type: String, required: false },
  teacherSignature: { type: String }, // Fixed: changed from classTeacherSignature
  principalSignature: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Signature', signatureSchema);
const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: [true, 'Test ID is required'],
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    index: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class is required'],
    index: true
  },
  session: {
    type: String,
    required: [true, 'Session is required'],
    trim: true,
    match: [/^\d{4}\/\d{4} (First|Second|Third) Term$/, 'Session must be in format YYYY/YYYY First/Second/Third Term'],
    index: true
  },
  term: {
    type: String,
    required: [true, 'Term is required'],
    enum: {
      values: ['First Term', 'Second Term', 'Third Term'],
      message: 'Term must be First Term, Second Term, or Third Term'
    },
    index: true
  },
  answers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: [true, 'Answers are required'],
    validate: {
      validator: function(answers) {
        return answers.size > 0;
      },
      message: 'Answers cannot be empty'
    }
  },
  correctness: {
    type: Map,
    of: Boolean,
    required: [true, 'Correctness data is required']
  },
  score: {
    type: Number,
    required: [true, 'Score is required'],
    min: [0, 'Score cannot be negative'],
    validate: {
      validator: async function(score) {
        if (this.populated('testId')) {
          return score <= this.testId.totalMarks;
        }
        // If not populated, we'll validate in pre-save
        return true;
      },
      message: 'Score cannot exceed test total marks'
    }
  },
  totalQuestions: {
    type: Number,
    required: [true, 'Total questions count is required'],
    min: [1, 'Total questions must be at least 1']
  },
  totalMarks: {
    type: Number,
    required: [true, 'Total marks is required'],
    min: [1, 'Total marks must be at least 1']
  },
  percentage: {
    type: Number,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100'],
    set: function(val) {
      return Math.round(val * 100) / 100; // Round to 2 decimal places
    }
  },
  grade: {
    type: String,
    trim: true,
    uppercase: true
  },
  position: {
    type: Number,
    min: [1, 'Position must be at least 1']
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  timeSpent: {
    type: Number, // in seconds
    min: [0, 'Time spent cannot be negative']
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [500, 'Remarks cannot exceed 500 characters']
  },
  // New visibility fields
  isVisibleToParent: {
    type: Boolean,
    default: false,
    index: true
  },
  scheduledVisibility: {
    type: Date,
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
resultSchema.index({ userId: 1, subject: 1, class: 1, session: 1, term: 1 });
resultSchema.index({ testId: 1, userId: 1 }, { unique: true }); // Prevent duplicate results
resultSchema.index({ class: 1, subject: 1, session: 1, term: 1 });
resultSchema.index({ session: 1, term: 1, isActive: 1 });
resultSchema.index({ isVisibleToParent: 1, scheduledVisibility: 1 });

// Pre-save middleware to calculate derived fields
resultSchema.pre('save', async function(next) {
  // Calculate percentage
  if (this.score !== undefined && this.totalMarks) {
    this.percentage = (this.score / this.totalMarks) * 100;
  }

  // Calculate grade based on percentage
  if (this.percentage !== undefined) {
    this.grade = calculateGrade(this.percentage);
  }

  // Validate score against test total marks if testId is populated
  if (this.isModified('score') && this.testId && typeof this.testId === 'object') {
    if (this.score > this.testId.totalMarks) {
      return next(new Error(`Score (${this.score}) cannot exceed test total marks (${this.testId.totalMarks})`));
    }
  }

  next();
});

// Pre-validate to ensure test exists and get total marks if not populated
resultSchema.pre('validate', async function(next) {
  if (this.isModified('score') && (!this.populated('testId') || typeof this.testId !== 'object')) {
    try {
      const Test = mongoose.model('Test');
      const test = await Test.findById(this.testId).select('totalMarks');
      if (!test) {
        return next(new Error('Test not found'));
      }
      if (this.score > test.totalMarks) {
        return next(new Error(`Score (${this.score}) cannot exceed test total marks (${test.totalMarks})`));
      }
      // Set totalMarks if not already set
      if (!this.totalMarks) {
        this.totalMarks = test.totalMarks;
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Static method to get results by student and session
resultSchema.statics.getStudentResults = function(studentId, session, term = null) {
  const query = { userId: studentId, session, isActive: true };
  if (term) query.term = term;
  
  return this.find(query)
    .populate('testId', 'title subject class totalMarks type')
    .populate('class', 'name level')
    .sort({ submittedAt: -1 });
};

// Static method to get class results
resultSchema.statics.getClassResults = function(classId, subject, session, term = null) {
  const query = { class: classId, subject, session, isActive: true };
  if (term) query.term = term;
  
  return this.find(query)
    .populate('userId', 'name surname studentId')
    .populate('testId', 'title type totalMarks')
    .populate('class', 'name level')
    .sort({ score: -1 });
};

// Static method to calculate class average
resultSchema.statics.getClassAverage = async function(classId, subject, session, term = null) {
  const query = { class: classId, subject, session, isActive: true };
  if (term) query.term = term;
  
  const result = await this.aggregate([
    { $match: query },
    { $group: { _id: null, averageScore: { $avg: '$score' }, count: { $sum: 1 } } }
  ]);
  
  return result.length > 0 ? {
    averageScore: Math.round(result[0].averageScore * 100) / 100,
    studentCount: result[0].count
  } : { averageScore: 0, studentCount: 0 };
};

// New static method to get results visible to parents
resultSchema.statics.getParentVisibleResults = function(studentId, session = null, term = null) {
  const query = { 
    userId: studentId, 
    isActive: true,
    isVisibleToParent: true,
    $or: [
      { scheduledVisibility: null },
      { scheduledVisibility: { $lte: new Date() } }
    ]
  };
  
  if (session) query.session = session;
  if (term) query.term = term;
  
  return this.find(query)
    .populate('testId', 'title subject class totalMarks type')
    .populate('class', 'name level')
    .populate('updatedBy', 'name surname')
    .sort({ submittedAt: -1 });
};

// New static method to update visibility for multiple results
resultSchema.statics.updateVisibility = async function(resultIds, visibilityData, userId) {
  const updateData = {
    ...visibilityData,
    updatedBy: userId,
    updatedAt: new Date()
  };

  return this.updateMany(
    { _id: { $in: resultIds } },
    { $set: updateData }
  );
};

// New static method to check and apply scheduled visibility
resultSchema.statics.applyScheduledVisibility = async function() {
  const now = new Date();
  
  return this.updateMany(
    {
      isVisibleToParent: false,
      scheduledVisibility: { $lte: now, $ne: null }
    },
    {
      $set: { 
        isVisibleToParent: true,
        updatedAt: now
      }
    }
  );
};


// In models/Result.js, add these methods to the schema:

// Instance method to check if visible to parent
resultSchema.methods.isVisibleToParentNow = function() {
  const now = new Date();
  
  if (!this.isVisibleToParent) {
    return false;
  }
  
  // Check if scheduled visibility has passed
  if (this.scheduledVisibility && this.scheduledVisibility > now) {
    return false;
  }
  
  return true;
};

// Instance method to record parent access
resultSchema.methods.recordParentAccess = async function(parentId, accessType, ipAddress = null, userAgent = null) {
  try {
    const ReportCardAccess = mongoose.model('ReportCardAccess');
    
    // Record the access
    const accessRecord = new ReportCardAccess({
      resultId: this._id,
      studentId: this.userId,
      parentId: parentId,
      accessType: accessType,
      ipAddress: ipAddress,
      userAgent: userAgent,
      metadata: {
        score: this.score,
        subject: this.subject,
        session: this.session,
        term: this.term
      }
    });
    
    await accessRecord.save();
    
    // Update result's download count if it's a download
    if (accessType === 'downloaded') {
      await this.updateDownloadCount(parentId, ipAddress, userAgent);
    }
    
    return accessRecord;
  } catch (error) {
    console.error('Error recording parent access:', error);
    throw error;
  }
};

// Instance method to update download count in Result model
resultSchema.methods.updateDownloadCount = async function(parentId, ipAddress, userAgent) {
  try {
    // Check if parent already downloaded
    const existingDownload = this.reportCardDownloads?.find(
      download => download.parentId?.toString() === parentId.toString()
    );
    
    if (existingDownload) {
      // Update existing download
      existingDownload.downloadedAt = new Date();
      existingDownload.downloadCount += 1;
      existingDownload.ipAddress = ipAddress;
      existingDownload.userAgent = userAgent;
    } else {
      // Add new download record
      if (!this.reportCardDownloads) {
        this.reportCardDownloads = [];
      }
      
      this.reportCardDownloads.push({
        parentId: parentId,
        downloadedAt: new Date(),
        ipAddress: ipAddress,
        userAgent: userAgent,
        downloadCount: 1
      });
    }
    
    this.updatedAt = new Date();
    await this.save();
    
    return this.reportCardDownloads;
  } catch (error) {
    console.error('Error updating download count:', error);
    throw error;
  }
};

// Static method to get visible results for parent
resultSchema.statics.getVisibleResultsForParent = async function(studentId, session = null, term = null) {
  const query = {
    userId: studentId,
    isActive: true,
    isVisibleToParent: true,
    $or: [
      { scheduledVisibility: null },
      { scheduledVisibility: { $lte: new Date() } }
    ]
  };
  
  if (session) query.session = session;
  if (term) query.term = term;
  
  return this.find(query)
    .populate('testId', 'title subject class totalMarks type')
    .populate('class', 'name level')
    .populate('updatedBy', 'name surname')
    .sort({ submittedAt: -1 });
};

// Static method for admin bulk visibility update
resultSchema.statics.updateBulkVisibility = async function(resultIds, visibilityData, adminId) {
  const updateData = {
    isVisibleToParent: visibilityData.isVisible,
    scheduledVisibility: visibilityData.scheduledDate || null,
    updatedBy: adminId,
    updatedAt: new Date()
  };

  return this.updateMany(
    { _id: { $in: resultIds } },
    { $set: updateData }
  );
};


// Instance method to get detailed result analysis
resultSchema.methods.getAnalysis = function() {
  const correctAnswers = Array.from(this.correctness.values()).filter(Boolean).length;
  const incorrectAnswers = this.totalQuestions - correctAnswers;
  const accuracy = (correctAnswers / this.totalQuestions) * 100;
  
  return {
    correctAnswers,
    incorrectAnswers,
    accuracy: Math.round(accuracy * 100) / 100,
    score: this.score,
    totalMarks: this.totalMarks,
    percentage: this.percentage,
    grade: this.grade,
    timeSpent: this.timeSpent,
    submittedAt: this.submittedAt,
    isVisibleToParent: this.isVisibleToParent,
    scheduledVisibility: this.scheduledVisibility
  };
};

// Virtual for display name
resultSchema.virtual('displayInfo').get(function() {
  return {
    studentName: this.userId?.name ? `${this.userId.name} ${this.userId.surname}` : 'Unknown Student',
    testTitle: this.testId?.title || 'Unknown Test',
    subject: this.subject,
    className: this.class?.name || 'Unknown Class',
    session: this.session,
    term: this.term,
    visibility: {
      isVisibleToParent: this.isVisibleToParent,
      scheduledVisibility: this.scheduledVisibility,
      updatedBy: this.updatedBy
    }
  };
});

// Helper function to calculate grade
function calculateGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  if (percentage >= 40) return 'E';
  return 'F';
}

// Ensure virtual fields are serialized
resultSchema.set('toJSON', { virtuals: true });
resultSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Result', resultSchema);
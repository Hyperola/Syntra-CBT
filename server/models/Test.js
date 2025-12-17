const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Test title is required'],
    trim: true,
    enum: {
      values: ['Continuous Assessment 1 (CA 1)', 'Continuous Assessment 2 (CA 2)', 'Examination'],
      message: 'Title must be Continuous Assessment 1 (CA 1), Continuous Assessment 2 (CA 2), or Examination'
    },
    index: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    index: true
  },
  class: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Class is required'],
    index: true,
    set: function(classValue) {
      if (mongoose.isValidObjectId(classValue)) {
        return classValue.toString();
      }
      return classValue;
    },
    get: function(classValue) {
      return classValue;
    }
  },
  session: {
    type: String,
    required: [true, 'Session is required'],
    trim: true,
    match: [/^\d{4}\/\d{4}$/, 'Session must be in format YYYY/YYYY (e.g., 2025/2026)'],
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
  instructions: {
    type: String,
    trim: true,
    maxlength: [2000, 'Instructions cannot exceed 2000 characters']
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 minute'],
    max: [480, 'Duration cannot exceed 8 hours']
  },
  questionCount: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Question count cannot be negative'],
    max: [200, 'Question count cannot exceed 200'],
    validate: {
      validator: function(value) {
        if (this.status === 'draft') {
          return value >= 0;
        }
        return value >= 1;
      },
      message: 'Question count must be at least 1 for non-draft tests'
    }
  },
  totalMarks: {
    type: Number,
    required: [true, 'Total marks are required'],
    min: [1, 'Total marks must be at least 1'],
    validate: {
      validator: function(totalMarks) {
        if (this.title.includes('CA') && totalMarks !== 20) {
          return false;
        }
        if (this.title === 'Examination' && totalMarks !== 60) {
          return false;
        }
        return true;
      },
      message: 'Continuous Assessments must have 20 marks, Examinations must have 60 marks'
    }
  },
  passingMarks: {
    type: Number,
    min: [0, 'Passing marks cannot be negative'],
    validate: {
      validator: function(value) {
        return value <= this.totalMarks;
      },
      message: 'Passing marks cannot exceed total marks'
    },
    default: function() {
      return Math.ceil((this.totalMarks || 20) * 0.4);
    }
  },
  randomize: {
    type: Boolean,
    default: false
  },
  showResults: {
    type: Boolean,
    default: false
  },
  allowRetakes: {
    type: Boolean,
    default: false
  },
  maxAttempts: {
    type: Number,
    min: [1, 'Maximum attempts must be at least 1'],
    default: 1
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'approved', 'scheduled', 'active', 'completed', 'cancelled'],
      message: 'Status must be draft, approved, scheduled, active, completed, or cancelled'
    },
    default: 'draft',
    index: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  approvedAt: {
    type: Date
  },
  batches: [{
    name: {
      type: String,
      required: [true, 'Batch name is required'],
      trim: true
    },
    students: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }],
    schedule: {
      start: {
        type: Date,
        required: [true, 'Start time is required'],
        validate: {
          validator: function(start) {
            return start > new Date();
          },
          message: 'Start time must be in the future'
        }
      },
      end: {
        type: Date,
        required: [true, 'End time is required'],
        validate: {
          validator: function(end) {
            return end > this.schedule.start;
          },
          message: 'End time must be after start time'
        }
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required'],
    index: true
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  questionMarks: [{
    type: Number,
    min: [1, 'Question mark must be at least 1'],
    validate: {
      validator: function(mark) {
        return mark <= 100;
      },
      message: 'Question mark cannot exceed 100'
    }
  }],
  settings: {
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    shuffleOptions: {
      type: Boolean,
      default: false
    },
    showProgress: {
      type: Boolean,
      default: true
    },
    allowReview: {
      type: Boolean,
      default: false
    },
    timeLimitPerQuestion: {
      type: Number,
      min: [0, 'Time limit per question cannot be negative']
    },
    requireFullScreen: {
      type: Boolean,
      default: false
    },
    disableCopyPaste: {
      type: Boolean,
      default: false
    }
  },
  analytics: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },
    lastAttempt: {
      type: Date
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true }
});

// Compound indexes
testSchema.index({ subject: 1, class: 1, session: 1, term: 1 });
testSchema.index({ createdBy: 1, status: 1 });
testSchema.index({ 'batches.schedule.start': 1, 'batches.schedule.end': 1 });

// Virtual for full session string
testSchema.virtual('fullSession').get(function() {
  return `${this.session} ${this.term}`;
});

// Virtual for active status
testSchema.virtual('isCurrentlyActive').get(function() {
  if (this.status !== 'scheduled') return false;
  const now = new Date();
  return this.batches.some(batch => 
    batch.isActive &&
    now >= new Date(batch.schedule.start) && 
    now <= new Date(batch.schedule.end)
  );
});

// Virtual for upcoming status
testSchema.virtual('isUpcoming').get(function() {
  if (this.status !== 'scheduled') return false;
  const now = new Date();
  return this.batches.some(batch => 
    batch.isActive &&
    now < new Date(batch.schedule.start)
  );
});

// Virtual for time remaining
testSchema.virtual('timeRemaining').get(function() {
  if (!this.isCurrentlyActive) return null;
  const now = new Date();
  const activeBatch = this.batches.find(batch => 
    batch.isActive &&
    now >= new Date(batch.schedule.start) && 
    now <= new Date(batch.schedule.end)
  );
  if (!activeBatch) return null;
  return new Date(activeBatch.schedule.end) - now;
});

// Virtual to get class name
testSchema.virtual('className').get(async function() {
  try {
    // If class is already a string name, return it
    if (typeof this.class === 'string' && !mongoose.isValidObjectId(this.class)) {
      return this.class;
    }
    
    // If class is ObjectId, try to get class name from Class model
    const Class = mongoose.model('Class');
    const classDoc = await Class.findById(this.class);
    return classDoc ? classDoc.name : this.class;
  } catch (error) {
    return this.class;
  }
});

// Pre-save validation - FIXED VERSION
testSchema.pre('save', function(next) {
  console.log('🔍 Test model pre-save hook:', {
    title: this.title,
    totalMarks: this.totalMarks,
    passingMarks: this.passingMarks,
    status: this.status
  });

  // FIXED: Ensure passingMarks doesn't exceed totalMarks
  if (this.passingMarks > this.totalMarks) {
    console.log('⚠️ Adjusting passing marks in pre-save:', {
      originalPassing: this.passingMarks,
      total: this.totalMarks,
      newPassing: Math.ceil(this.totalMarks * 0.4)
    });
    this.passingMarks = Math.ceil(this.totalMarks * 0.4);
  }

  // Validate question marks sum equals total marks (if questions exist)
  if (this.questionMarks && this.questionMarks.length > 0) {
    const marksSum = this.questionMarks.reduce((sum, mark) => sum + mark, 0);
    if (marksSum !== this.totalMarks) {
      return next(new Error(`Sum of question marks (${marksSum}) must equal total marks (${this.totalMarks})`));
    }
  }

  // Validate questions count matches questionCount (if questions exist)
  if (this.questions && this.questions.length > this.questionCount) {
    return next(new Error(`Number of questions (${this.questions.length}) exceeds specified question count (${this.questionCount})`));
  }

  console.log('✅ Test model pre-save validation passed');
  next();
});

// Pre-validate to ensure questions belong to correct subject/class (if questions exist)
testSchema.pre('validate', async function(next) {
  if (this.questions && this.questions.length > 0) {
    try {
      const Question = mongoose.model('Question');
      const questions = await Question.find({ _id: { $in: this.questions } });
      
      // Normalize class values for comparison
      const normalizeClass = (cls) => {
        if (mongoose.isValidObjectId(cls)) {
          return cls.toString();
        }
        return cls;
      };
      
      const testClass = normalizeClass(this.class);
      
      const invalidQuestions = questions.filter(q => {
        const questionClass = normalizeClass(q.class);
        return q.subject !== this.subject || questionClass !== testClass;
      });
      
      if (invalidQuestions.length > 0) {
        return next(new Error('All questions must belong to the test subject and class'));
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Static method to get current active session
testSchema.statics.getCurrentSession = function() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  let term;
  if (month >= 1 && month <= 4) term = 'First Term';
  else if (month >= 5 && month <= 8) term = 'Second Term';
  else term = 'Third Term';
  
  const session = `${year-1}/${year}`;
  
  return { session, term };
};

// Static method to normalize class value for queries
testSchema.statics.normalizeClass = function(classValue) {
  if (mongoose.isValidObjectId(classValue)) {
    return classValue.toString();
  }
  return classValue;
};

// Static method to get tests by teacher with flexible class matching
testSchema.statics.getByTeacher = async function(teacherId, subject = null, classValue = null) {
  const query = { createdBy: teacherId, status: { $ne: 'cancelled' }, isActive: true };
  
  if (subject) query.subject = subject;
  
  if (classValue) {
    // Normalize class value for flexible matching
    const normalizedClass = this.normalizeClass(classValue);
    
    // Try to find matching class by name if classValue is string
    if (typeof classValue === 'string' && !mongoose.isValidObjectId(classValue)) {
      const Class = mongoose.model('Class');
      const classDoc = await Class.findOne({ 
        $or: [
          { name: classValue },
          { shortName: classValue },
          { level: classValue }
        ]
      });
      
      if (classDoc) {
        query.class = { $in: [classDoc._id.toString(), classValue, classDoc.name] };
      } else {
        query.class = classValue;
      }
    } else {
      query.class = normalizedClass;
    }
  }
  
  return this.find(query)
    .populate('createdBy', 'username name')
    .populate('questions', 'text type difficulty marks')
    .sort({ createdAt: -1 });
};

// Static method to get active tests for student
testSchema.statics.getActiveForStudent = async function(studentId, subject = null, classValue = null) {
  const query = {
    status: 'scheduled',
    isActive: true,
    'batches.students': studentId,
    'batches.isActive': true,
    'batches.schedule.start': { $lte: new Date() },
    'batches.schedule.end': { $gte: new Date() }
  };
  
  if (subject) query.subject = subject;
  
  if (classValue) {
    // Normalize class value
    const normalizedClass = this.normalizeClass(classValue);
    
    if (typeof classValue === 'string' && !mongoose.isValidObjectId(classValue)) {
      const Class = mongoose.model('Class');
      const classDoc = await Class.findOne({ 
        $or: [
          { name: classValue },
          { shortName: classValue },
          { level: classValue }
        ]
      });
      
      if (classDoc) {
        query.class = { $in: [classDoc._id.toString(), classValue, classDoc.name] };
      } else {
        query.class = classValue;
      }
    } else {
      query.class = normalizedClass;
    }
  }
  
  return this.find(query)
    .populate('class', 'name level')
    .select('-questions -questionMarks -batches.students')
    .sort({ 'batches.schedule.start': 1 });
};

// Instance method to check if user has access
testSchema.methods.hasUserAccess = async function(user) {
  // Admin and super admin have access to all tests
  if (user.role === 'admin' || user.role === 'super_admin') {
    return true;
  }
  
  // Teacher can access tests they created
  if (user.role === 'teacher') {
    if (this.createdBy.toString() === user.id.toString()) {
      return true;
    }
    
    // Also check if teacher is assigned to the subject/class
    const normalizeClass = (cls) => {
      if (mongoose.isValidObjectId(cls)) {
        return cls.toString();
      }
      return cls;
    };
    
    const testClass = normalizeClass(this.class);
    
    const hasAccess = user.subjects?.some(subjectAssignment => {
      const matchesSubject = subjectAssignment.subject === this.subject;
      
      // Check various class formats
      let matchesClass = false;
      
      if (subjectAssignment.class) {
        const assignmentClass = normalizeClass(subjectAssignment.class);
        matchesClass = assignmentClass === testClass;
      }
      
      if (!matchesClass && subjectAssignment.classId) {
        const assignmentClassId = normalizeClass(subjectAssignment.classId);
        matchesClass = assignmentClassId === testClass;
      }
      
      if (!matchesClass && subjectAssignment.className) {
        matchesClass = subjectAssignment.className === testClass;
      }
      
      return matchesSubject && matchesClass;
    });
    
    return hasAccess || false;
  }
  
  // Students can access tests they're assigned to
  if (user.role === 'student') {
    return this.isStudentAssigned(user.id);
  }
  
  return false;
};

// Instance method to add batch
testSchema.methods.addBatch = function(batchData) {
  this.batches.push(batchData);
  return this.save();
};

// Instance method to approve test
testSchema.methods.approve = function(adminId) {
  if (this.status !== 'draft') {
    throw new Error('Only draft tests can be approved');
  }
  
  if (this.questionCount < 1 || this.questions.length < 1) {
    throw new Error('Test must have at least 1 question to be approved');
  }
  
  this.status = 'approved';
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  
  return this.save();
};

// Instance method to schedule test
testSchema.methods.schedule = function(batches) {
  if (this.status !== 'approved') {
    throw new Error('Only approved tests can be scheduled');
  }
  
  this.batches = batches;
  this.status = 'scheduled';
  
  return this.save();
};

// Instance method to update analytics
testSchema.methods.updateAnalytics = async function() {
  const Result = mongoose.model('Result');
  const stats = await Result.aggregate([
    { $match: { testId: this._id } },
    {
      $group: {
        _id: null,
        totalAttempts: { $sum: 1 },
        averageScore: { $avg: '$score' },
        lastAttempt: { $max: '$submittedAt' }
      }
    }
  ]);
  
  if (stats.length > 0) {
    this.analytics = {
      totalAttempts: stats[0].totalAttempts,
      averageScore: Math.round(stats[0].averageScore * 100) / 100,
      completionRate: (stats[0].totalAttempts / this.getTotalStudents()) * 100,
      lastAttempt: stats[0].lastAttempt
    };
  }
  
  return this.save();
};

// Instance method to get total students
testSchema.methods.getTotalStudents = function() {
  return this.batches.reduce((total, batch) => total + batch.students.length, 0);
};

// Instance method to check if student is assigned
testSchema.methods.isStudentAssigned = function(studentId) {
  return this.batches.some(batch => 
    batch.students.some(student => student.equals(studentId))
  );
};

// Instance method to get student batch
testSchema.methods.getStudentBatch = function(studentId) {
  return this.batches.find(batch => 
    batch.students.some(student => student.equals(studentId))
  );
};

module.exports = mongoose.model('Test', testSchema);
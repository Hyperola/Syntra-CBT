const mongoose = require('mongoose');

const termSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['First Term', 'Second Term', 'Third Term']
  },
  isActive: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  sequence: {
    type: Number,
    required: true,
    enum: [1, 2, 3]
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const sessionSchema = new mongoose.Schema({
  sessionName: {
    type: String,
    required: [true, 'Session name is required'],
    trim: true,
    unique: true,
    match: [/^\d{4}\/\d{4}$/, 'Session must be in format YYYY/YYYY'],
    index: true
  },
  isActive: {
    type: Boolean,
    default: false,
    index: true
  },
  startDate: {
    type: Date,
    validate: {
      validator: function(date) {
        return !this.endDate || date < this.endDate;
      },
      message: 'Start date must be before end date'
    }
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(date) {
        return !this.startDate || date > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  terms: [termSchema],
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  // ADDED: Promotion lock field
  promotionCompleted: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true 
});

// Pre-save middleware to automatically create terms
sessionSchema.pre('save', function(next) {
  // Only create terms if this is a new session and terms array is empty
  if (this.isNew && (!this.terms || this.terms.length === 0)) {
    this.terms = [
      { name: 'First Term', sequence: 1, isActive: false },
      { name: 'Second Term', sequence: 2, isActive: false },
      { name: 'Third Term', sequence: 3, isActive: false }
    ];
    console.log(`Automatically created 3 terms for session: ${this.sessionName}`);
  }
  
  // Reset promotionCompleted when new session is created
  if (this.isNew) {
    this.promotionCompleted = false;
  }
  next();
});

// Ensure only one session is active at a time
sessionSchema.pre('save', async function(next) {
  if (this.isActive && this.isModified('isActive')) {
    try {
      await this.constructor.updateMany(
        { 
          _id: { $ne: this._id }, 
          isActive: true 
        }, 
        { 
          isActive: false,
          updatedBy: this.updatedBy || this.createdBy
        }
      );
      console.log(`Deactivated other sessions, activated: ${this.sessionName}`);
    } catch (error) {
      console.error('Error deactivating other sessions:', error);
      return next(error);
    }
  }
  next();
});

// Ensure only one term is active per session
sessionSchema.pre('save', function(next) {
  if (this.isModified('terms')) {
    const activeTerms = this.terms.filter(term => term.isActive);
    if (activeTerms.length > 1) {
      return next(new Error('Only one term can be active per session'));
    }
  }
  next();
});

// Validate session has all required terms
sessionSchema.pre('save', function(next) {
  if (this.terms && this.terms.length > 0) {
    const expectedSequences = [1, 2, 3];
    const existingSequences = this.terms.map(term => term.sequence);
    const missingSequences = expectedSequences.filter(seq => !existingSequences.includes(seq));
    
    if (missingSequences.length > 0) {
      console.error('Session missing terms with sequences:', missingSequences);
      return next(new Error(`Session is missing terms with sequences: ${missingSequences.join(', ')}`));
    }
  }
  next();
});

// Static method to get active session
sessionSchema.statics.getActiveSession = function() {
  return this.findOne({ isActive: true, isArchived: false });
};

// Static method to get active term
sessionSchema.statics.getActiveTerm = async function() {
  const activeSession = await this.findOne({ 
    isActive: true, 
    isArchived: false,
    'terms.isActive': true 
  });
  
  if (activeSession) {
    const activeTerm = activeSession.terms.find(term => term.isActive);
    return {
      session: activeSession.sessionName,
      term: activeTerm ? activeTerm.name : null,
      termObject: activeTerm,
      sessionId: activeSession._id
    };
  }
  return null;
};

// Static method to check if session name exists
sessionSchema.statics.sessionExists = function(sessionName, excludeId = null) {
  const query = { sessionName: sessionName.trim() };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  return this.findOne(query);
};

// Instance method to check if session can be deleted
sessionSchema.methods.canDelete = async function() {
  const AcademicRecord = mongoose.model('AcademicRecord');
  const Test = mongoose.model('Test');
  
  const [academicRecordsCount, testsCount] = await Promise.all([
    AcademicRecord.countDocuments({ session: this.sessionName }),
    Test.countDocuments({ session: this.sessionName })
  ]);
  
  return {
    canDelete: academicRecordsCount === 0 && testsCount === 0,
    dependencies: {
      academicRecords: academicRecordsCount,
      tests: testsCount
    }
  };
};

// Instance method to activate a term
sessionSchema.methods.activateTerm = async function(termName) {
  // Validate term name
  const validTerms = ['First Term', 'Second Term', 'Third Term'];
  if (!validTerms.includes(termName)) {
    throw new Error(`Invalid term name: ${termName}. Must be one of: ${validTerms.join(', ')}`);
  }

  // Check if term exists in this session
  const termExists = this.terms.some(term => term.name === termName);
  if (!termExists) {
    throw new Error(`Term ${termName} not found in session ${this.sessionName}`);
  }

  // Deactivate all terms in this session and activate the specified one
  this.terms.forEach(term => {
    term.isActive = term.name === termName;
  });

  this.updatedAt = new Date();
  
  console.log(`Activated term: ${termName} in session: ${this.sessionName}`);
  return this.save();
};

// Instance method to get active term
sessionSchema.methods.getActiveTerm = function() {
  return this.terms.find(term => term.isActive);
};

// Instance method to fix missing terms
sessionSchema.methods.fixTerms = function() {
  const existingSequences = this.terms.map(term => term.sequence);
  const expectedTerms = [
    { name: 'First Term', sequence: 1, isActive: false },
    { name: 'Second Term', sequence: 2, isActive: false },
    { name: 'Third Term', sequence: 3, isActive: false }
  ];

  let termsFixed = false;

  expectedTerms.forEach(expectedTerm => {
    if (!existingSequences.includes(expectedTerm.sequence)) {
      this.terms.push(expectedTerm);
      termsFixed = true;
      console.log(`Added missing term: ${expectedTerm.name}`);
    }
  });

  if (termsFixed) {
    this.terms.sort((a, b) => a.sequence - b.sequence);
    console.log(`Fixed terms for session: ${this.sessionName}`);
  }

  return termsFixed;
};

// Virtual for formatted display
sessionSchema.virtual('displayName').get(function() {
  return this.sessionName;
});

// Virtual for duration
sessionSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} days`;
  }
  return 'Not specified';
});

// Virtual for active term
sessionSchema.virtual('activeTerm').get(function() {
  return this.terms.find(term => term.isActive);
});

// Virtual for formatted terms display
sessionSchema.virtual('formattedTerms').get(function() {
  return this.terms.map(term => ({
    name: term.name,
    isActive: term.isActive,
    sequence: term.sequence,
    startDate: term.startDate,
    endDate: term.endDate
  })).sort((a, b) => a.sequence - b.sequence);
});

// Ensure virtual fields are serialized
sessionSchema.set('toJSON', { virtuals: true });
sessionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Session', sessionSchema);
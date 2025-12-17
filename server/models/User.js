// models/User.js - COMPLETELY UPDATED WITH FIXES
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [50, 'Username cannot exceed 50 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  surname: {
    type: String,
    required: [true, 'Surname is required'],
    trim: true,
    maxlength: [100, 'Surname cannot exceed 100 characters']
  },
  studentId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true
  },
  role: {
    type: String,
    enum: {
      values: ['super_admin', 'admin', 'teacher', 'student'],
      message: 'Role must be super_admin, admin, teacher, or student'
    },
    required: [true, 'Role is required'],
    default: 'student'
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    validate: {
      validator: function(classValue) {
        if (this.role === 'student') {
          return classValue != null;
        }
        return true;
      },
      message: 'Students must be assigned to a class'
    }
  },
  className: {
    type: String,
    trim: true
  },
  // FIXED: Added subjects field for backward compatibility and teacher assignments
  subjects: [{
    subject: {
      type: String,
      required: true,
      trim: true
    },
    class: {
      type: String,
      required: true,
      trim: true
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    },
    assignedDate: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Teacher assignments (new structure)
  teacherAssignments: [{
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true
    },
    className: {
      type: String,
      trim: true
    },
    subjects: [{
      subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
      },
      subjectName: {
        type: String,
        trim: true,
        required: true
      },
      assignedAt: {
        type: Date,
        default: Date.now
      }
    }],
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Student enrolled subjects
  enrolledSubjects: [{
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    subjectName: {
      type: String,
      trim: true,
      required: true
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true
    },
    className: {
      type: String,
      trim: true
    },
    isCore: {
      type: Boolean,
      default: true
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  
  adminPermissions: [{
    type: String,
    enum: [
      'MANAGE_USERS',
      'APPROVE_TESTS', 
      'MANAGE_RESULTS',
      'SYSTEM_CONFIG',
      'VIEW_ANALYTICS',
      'MANAGE_ADMINS'
    ]
  }],
  
  blocked: {
    type: Boolean,
    default: false
  },
  
  active: {
    type: Boolean,
    default: true
  },
  
  picture: {
    type: String,
    default: ''
  },
  
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(date) {
        return !date || date < new Date();
      },
      message: 'Date of birth cannot be in the future'
    }
  },
  
  address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-()]+$/, 'Please enter a valid phone number']
  },
  
  sex: {
    type: String,
    enum: {
      values: ['male', 'female', 'other'],
      message: 'Sex must be male, female, or other'
    }
  },
  
  age: {
    type: Number,
    min: [3, 'Age must be at least 3'],
    max: [120, 'Age cannot exceed 120']
  },
  
  lastLogin: {
    type: Date
  },
  
  loginAttempts: {
    type: Number,
    default: 0
  },
  
  lockUntil: {
    type: Date
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Indexes
userSchema.index({ role: 1, active: 1 });
userSchema.index({ adminPermissions: 1 });
userSchema.index({ className: 1 });
userSchema.index({ subjects: 1 }); // Added index for subjects
userSchema.index({ 'teacherAssignments.class': 1 });
userSchema.index({ 'teacherAssignments.subjects.subject': 1 });
userSchema.index({ 'enrolledSubjects.class': 1 });
userSchema.index({ 'enrolledSubjects.subject': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.name} ${this.surname}`.trim();
});

// Virtual for isLocked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual to get teacher's assigned classes
userSchema.virtual('assignedClasses').get(function() {
  if (this.role !== 'teacher') return [];
  
  if (this.teacherAssignments && this.teacherAssignments.length > 0) {
    return this.teacherAssignments.map(assignment => ({
      class: assignment.class,
      className: assignment.className
    }));
  }
  
  // Fallback to old subjects structure
  if (this.subjects && this.subjects.length > 0) {
    const uniqueClasses = [...new Set(this.subjects.map(s => s.class))];
    return uniqueClasses.map(className => ({
      class: className,
      className: className
    }));
  }
  
  return [];
});

// Virtual to get teacher's assigned subjects (compatibility)
userSchema.virtual('assignedSubjects').get(function() {
  if (this.role !== 'teacher') return [];
  
  const subjects = [];
  
  // From new structure
  if (this.teacherAssignments && this.teacherAssignments.length > 0) {
    this.teacherAssignments.forEach(assignment => {
      assignment.subjects.forEach(subject => {
        subjects.push({
          subject: subject.subjectName || 'Unknown',
          class: assignment.className || 'Unknown',
          classId: assignment.class
        });
      });
    });
  }
  
  // From old structure (for backward compatibility)
  if (subjects.length === 0 && this.subjects && this.subjects.length > 0) {
    this.subjects.forEach(subject => {
      subjects.push({
        subject: subject.subject,
        class: subject.class,
        classId: subject.classId
      });
    });
  }
  
  return subjects;
});

// Pre-save middleware with enhanced subject handling
userSchema.pre('save', async function(next) {
  console.log(`🔄 User pre-save: ${this.username}, role: ${this.role}`);
  
  // Ensure subjects array exists for teachers (backward compatibility)
  if (this.role === 'teacher') {
    if (!this.subjects || !Array.isArray(this.subjects)) {
      console.log(`📝 Initializing subjects array for teacher: ${this.username}`);
      this.subjects = [];
    }
    
    // Sync subjects from teacherAssignments to the old subjects field
    if (this.teacherAssignments && this.teacherAssignments.length > 0 && this.subjects.length === 0) {
      console.log(`🔄 Syncing subjects from teacherAssignments for: ${this.username}`);
      this.subjects = this.teacherAssignments.flatMap(assignment => {
        return assignment.subjects.map(subject => ({
          subject: subject.subjectName || 'Unknown',
          class: assignment.className || 'Unknown',
          classId: assignment.class,
          assignedDate: subject.assignedAt || new Date(),
          isActive: true
        }));
      });
    }
  }

  // Update className if class is set
  if (this.isModified('class') && this.class) {
    if (mongoose.Types.ObjectId.isValid(this.class)) {
      try {
        const Class = mongoose.model('Class');
        const classDoc = await Class.findById(this.class);
        if (classDoc) {
          this.className = classDoc.name;
        }
      } catch (error) {
        console.log('Could not populate className from Class document:', error.message);
      }
    } else if (typeof this.class === 'string') {
      this.className = this.class;
    }
  }

  // Update teacher assignment class names
  if (this.role === 'teacher' && this.teacherAssignments && this.teacherAssignments.length > 0) {
    for (const assignment of this.teacherAssignments) {
      if (assignment.class && mongoose.Types.ObjectId.isValid(assignment.class) && !assignment.className) {
        try {
          const Class = mongoose.model('Class');
          const classDoc = await Class.findById(assignment.class);
          if (classDoc) {
            assignment.className = classDoc.name;
          }
        } catch (error) {
          console.log('Could not populate class name for teacher assignment:', error.message);
        }
      }
      
      // Ensure subject names are set
      for (const subject of assignment.subjects) {
        if (subject.subject && mongoose.Types.ObjectId.isValid(subject.subject) && !subject.subjectName) {
          try {
            const Subject = mongoose.model('Subject');
            const subjectDoc = await Subject.findById(subject.subject);
            if (subjectDoc) {
              subject.subjectName = subjectDoc.name;
            }
          } catch (error) {
            console.log('Could not populate subject name for teacher assignment:', error.message);
          }
        }
      }
    }
  }

  // Update enrolled subject names
  if (this.role === 'student' && this.enrolledSubjects && this.enrolledSubjects.length > 0) {
    for (const enrolledSubject of this.enrolledSubjects) {
      if (enrolledSubject.subject && mongoose.Types.ObjectId.isValid(enrolledSubject.subject) && !enrolledSubject.subjectName) {
        try {
          const Subject = mongoose.model('Subject');
          const subjectDoc = await Subject.findById(enrolledSubject.subject);
          if (subjectDoc) {
            enrolledSubject.subjectName = subjectDoc.name;
          }
        } catch (error) {
          console.log('Could not populate subject name for enrolled subject:', error.message);
        }
      }
    }
  }

  // Hash password if modified
  if (this.isModified('password')) {
    if (!this.password.startsWith('$2b$') && !this.password.startsWith('$2a$')) {
      try {
        console.log(`🔐 Hashing password for user: ${this.username}`);
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
      } catch (error) {
        return next(error);
      }
    }
  }
  
  next();
});

// Post-save middleware to ensure subjects are always initialized for teachers
userSchema.post('save', function(doc, next) {
  if (doc.role === 'teacher' && (!doc.subjects || doc.subjects.length === 0)) {
    console.log(`⚠️  Teacher ${doc.username} has no subjects assigned`);
  }
  next();
});

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!candidatePassword || !this.password) {
    return false;
  }
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// UPDATED: Method to add teacher assignment (with backward compatibility)
userSchema.methods.addTeacherAssignment = async function(classId, subjectIds) {
  if (this.role !== 'teacher') {
    throw new Error('Only teachers can have assignments');
  }

  console.log(`👨‍🏫 Adding assignment for teacher ${this.username}: class=${classId}, subjects=${subjectIds}`);

  // Find the class
  const Class = mongoose.model('Class');
  const classDoc = await Class.findById(classId).populate('subjectAssignments.subject');
  
  if (!classDoc) {
    throw new Error('Class not found');
  }

  // Check if subjects are assigned to the class
  const validSubjectIds = classDoc.subjectAssignments
    .map(assignment => assignment.subject._id.toString());
  
  const invalidSubjects = subjectIds.filter(
    subjectId => !validSubjectIds.includes(subjectId.toString())
  );
  
  if (invalidSubjects.length > 0) {
    throw new Error(`Subjects not assigned to class: ${invalidSubjects.join(', ')}`);
  }

  // Get subject names
  const Subject = mongoose.model('Subject');
  const subjects = await Subject.find({ _id: { $in: subjectIds } });
  const subjectMap = subjects.reduce((map, subject) => {
    map[subject._id.toString()] = subject.name;
    return map;
  }, {});

  // Check if assignment for this class already exists
  let assignment = this.teacherAssignments.find(
    a => a.class.toString() === classId.toString()
  );

  const newSubjectsForOldStructure = [];

  if (assignment) {
    // Add new subjects to existing assignment
    for (const subjectId of subjectIds) {
      const subjectExists = assignment.subjects.some(
        s => s.subject.toString() === subjectId.toString()
      );
      
      if (!subjectExists) {
        const subjectName = subjectMap[subjectId] || 'Unknown Subject';
        assignment.subjects.push({
          subject: subjectId,
          subjectName: subjectName,
          assignedAt: new Date()
        });
        
        // Also add to old subjects structure for backward compatibility
        newSubjectsForOldStructure.push({
          subject: subjectName,
          class: classDoc.name,
          classId: classId,
          assignedDate: new Date(),
          isActive: true
        });
      }
    }
  } else {
    // Create new assignment
    assignment = {
      class: classId,
      className: classDoc.name,
      subjects: subjectIds.map(subjectId => ({
        subject: subjectId,
        subjectName: subjectMap[subjectId] || 'Unknown Subject',
        assignedAt: new Date()
      })),
      assignedAt: new Date()
    };
    this.teacherAssignments.push(assignment);
    
    // Also add to old subjects structure for backward compatibility
    newSubjectsForOldStructure.push(...subjectIds.map(subjectId => ({
      subject: subjectMap[subjectId] || 'Unknown Subject',
      class: classDoc.name,
      classId: classId,
      assignedDate: new Date(),
      isActive: true
    })));
  }

  // Ensure subjects array exists
  if (!this.subjects) {
    this.subjects = [];
  }
  
  // Add to old subjects structure for backward compatibility
  newSubjectsForOldStructure.forEach(newSubject => {
    const alreadyExists = this.subjects.some(s => 
      s.subject === newSubject.subject && s.class === newSubject.class
    );
    
    if (!alreadyExists) {
      this.subjects.push(newSubject);
    }
  });

  console.log(`✅ Added ${newSubjectsForOldStructure.length} subjects to teacher ${this.username}`);
  return this.save();
};

// UPDATED: Method to get teacher's subjects (for backward compatibility)
userSchema.methods.getSubjects = function() {
  if (this.role !== 'teacher') return [];
  
  // Return from old structure if exists
  if (this.subjects && this.subjects.length > 0) {
    return this.subjects;
  }
  
  // Fallback to new structure
  if (this.teacherAssignments && this.teacherAssignments.length > 0) {
    return this.teacherAssignments.flatMap(assignment => {
      return assignment.subjects.map(subject => ({
        subject: subject.subjectName || 'Unknown',
        class: assignment.className || 'Unknown',
        classId: assignment.class,
        assignedDate: subject.assignedAt || new Date(),
        isActive: true
      }));
    });
  }
  
  return [];
};

// UPDATED: Method to get teacher's classes (unique classes they teach)
userSchema.methods.getClasses = function() {
  if (this.role !== 'teacher') return [];
  
  const classes = [];
  
  // From old structure
  if (this.subjects && this.subjects.length > 0) {
    const uniqueClasses = [...new Set(this.subjects.map(s => s.class))];
    uniqueClasses.forEach(className => {
      const classSubjects = this.subjects.filter(s => s.class === className);
      classes.push({
        class: className,
        className: className,
        subjects: [...new Set(classSubjects.map(s => s.subject))],
        subjectCount: classSubjects.length
      });
    });
    return classes;
  }
  
  // From new structure
  if (this.teacherAssignments && this.teacherAssignments.length > 0) {
    return this.teacherAssignments.map(assignment => ({
      class: assignment.class,
      className: assignment.className,
      subjects: assignment.subjects.map(s => s.subjectName),
      subjectCount: assignment.subjects.length
    }));
  }
  
  return [];
};

// Method to remove teacher assignment
userSchema.methods.removeTeacherAssignment = function(classId, subjectId = null) {
  if (this.role !== 'teacher') {
    throw new Error('Only teachers can have assignments');
  }
  
  console.log(`🗑️  Removing assignment for teacher ${this.username}: class=${classId}, subject=${subjectId || 'all'}`);

  if (subjectId) {
    // Remove specific subject from assignment
    const assignment = this.teacherAssignments.find(
      a => a.class.toString() === classId.toString()
    );
    
    if (assignment) {
      const subjectToRemove = assignment.subjects.find(
        s => s.subject.toString() === subjectId.toString()
      );
      
      if (subjectToRemove) {
        // Remove from old structure
        this.subjects = this.subjects.filter(s => 
          !(s.subject === subjectToRemove.subjectName && s.classId && s.classId.toString() === classId.toString())
        );
        
        // Remove from new structure
        assignment.subjects = assignment.subjects.filter(
          s => s.subject.toString() !== subjectId.toString()
        );
        
        // If no subjects left, remove the entire assignment
        if (assignment.subjects.length === 0) {
          this.teacherAssignments = this.teacherAssignments.filter(
            a => a.class.toString() !== classId.toString()
          );
        }
      }
    }
  } else {
    // Remove entire class assignment
    // Remove from old structure
    this.subjects = this.subjects.filter(s => 
      !(s.classId && s.classId.toString() === classId.toString())
    );
    
    // Remove from new structure
    this.teacherAssignments = this.teacherAssignments.filter(
      a => a.class.toString() !== classId.toString()
    );
  }
  
  return this.save();
};

// Method to enroll student in subjects
userSchema.methods.enrollInSubjects = async function(classId, subjectIds) {
  if (this.role !== 'student') {
    throw new Error('Only students can enroll in subjects');
  }

  // Check if student is in the right class
  if (this.class.toString() !== classId.toString()) {
    throw new Error('Student is not in this class');
  }

  const Class = mongoose.model('Class');
  const classDoc = await Class.findById(classId).populate('subjectAssignments.subject');
  
  if (!classDoc) {
    throw new Error('Class not found');
  }

  // Get core subjects (auto-enrolled)
  const coreSubjects = classDoc.subjectAssignments
    .filter(assignment => assignment.isCore)
    .map(assignment => assignment.subject._id);

  // Get elective subjects (selected by admin)
  const electiveSubjects = subjectIds || [];

  // All subjects to enroll in
  const allSubjectIds = [...coreSubjects, ...electiveSubjects];

  // Get subject names
  const Subject = mongoose.model('Subject');
  const subjects = await Subject.find({ _id: { $in: allSubjectIds } });
  const subjectMap = subjects.reduce((map, subject) => {
    map[subject._id.toString()] = {
      name: subject.name,
      isCore: coreSubjects.includes(subject._id.toString())
    };
    return map;
  }, {});

  // Clear existing enrolled subjects for this class
  this.enrolledSubjects = this.enrolledSubjects.filter(
    es => es.class.toString() !== classId.toString()
  );

  // Add new enrolled subjects
  for (const subjectId of allSubjectIds) {
    this.enrolledSubjects.push({
      subject: subjectId,
      subjectName: subjectMap[subjectId]?.name || 'Unknown Subject',
      class: classId,
      className: classDoc.name,
      isCore: subjectMap[subjectId]?.isCore || false,
      enrolledAt: new Date()
    });
  }

  return this.save();
};

// Method to check permission
userSchema.methods.hasPermission = function(permissionName) {
  if (this.role === 'super_admin') {
    return true;
  }

  if (this.role === 'admin' && this.adminPermissions && this.adminPermissions.includes(permissionName)) {
    return true;
  }
 
  if (!this.permissions || !Array.isArray(this.permissions)) {
    return false;
  }
 
  return this.permissions.some(perm =>
    perm.name === permissionName || perm._id.toString() === permissionName
  );
};

// Static method to fix all teachers' subjects (run once after updating model)
userSchema.statics.fixTeacherSubjects = async function() {
  const teachers = await this.find({ role: 'teacher' });
  let fixedCount = 0;
  
  for (const teacher of teachers) {
    // Initialize subjects array if it doesn't exist
    if (!teacher.subjects || !Array.isArray(teacher.subjects)) {
      teacher.subjects = [];
      await teacher.save();
      fixedCount++;
      console.log(`✅ Fixed teacher ${teacher.username}: initialized subjects array`);
    }
  }
  
  console.log(`🎯 Fixed ${fixedCount} teachers' subjects arrays`);
  return fixedCount;
};

// Static method to migrate teacher assignments to subjects (for backward compatibility)
userSchema.statics.migrateTeacherAssignments = async function() {
  const teachers = await this.find({ 
    role: 'teacher',
    teacherAssignments: { $exists: true, $not: { $size: 0 } }
  }).populate('teacherAssignments.subjects.subject');
  
  let migratedCount = 0;
  
  for (const teacher of teachers) {
    if ((!teacher.subjects || teacher.subjects.length === 0) && teacher.teacherAssignments.length > 0) {
      teacher.subjects = teacher.teacherAssignments.flatMap(assignment => {
        return assignment.subjects.map(subject => ({
          subject: subject.subject?.name || subject.subjectName || 'Unknown',
          class: assignment.className || 'Unknown',
          classId: assignment.class,
          assignedDate: subject.assignedAt || new Date(),
          isActive: true
        }));
      });
      
      await teacher.save();
      migratedCount++;
      console.log(`🔄 Migrated ${teacher.subjects.length} subjects for teacher ${teacher.username}`);
    }
  }
  
  console.log(`🚀 Migrated ${migratedCount} teachers' assignments to subjects`);
  return migratedCount;
};

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.loginAttempts;
    delete ret.lockUntil;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
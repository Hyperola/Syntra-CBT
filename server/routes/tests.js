// tests.js - COMPLETE UPDATED FILE WITH ENHANCED SCORING FOR TEXT-BASED ANSWERS
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Test = require('../models/Test');
const Question = require('../models/Question');
const Result = require('../models/Result');
const User = require('../models/User');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const { auth, teacherOnly } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// Middleware to validate MongoDB ObjectId
const validateObjectId = (paramName) => (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params[paramName])) {
    console.log(`Tests route - Invalid ${paramName}:`, { [paramName]: req.params[paramName] });
    return res.status(400).json({ error: `Invalid ${paramName} format.` });
  }
  next();
};

// Helper function to normalize class value
const normalizeClass = (classValue) => {
  if (mongoose.isValidObjectId(classValue)) {
    return classValue.toString();
  }
  return classValue;
};

// Helper function to normalize class for comparison (handles both objects and strings)
const normalizeClassForComparison = (classValue) => {
  if (!classValue) return null;
  
  // If it's an object with _id
  if (classValue._id) return classValue._id.toString();
  
  // If it's an object with id
  if (classValue.id) return classValue.id.toString();
  
  // If it's already a string
  if (typeof classValue === 'string') return classValue;
  
  // Try to convert to string
  try {
    return classValue.toString();
  } catch (err) {
    console.error('Error normalizing class for comparison:', classValue, err);
    return null;
  }
};

// NEW: Helper function to normalize subject for comparison
const normalizeSubjectForComparison = async (subjectValue) => {
  if (!subjectValue) return null;
  
  // If it's already a string (subject name), return it
  if (typeof subjectValue === 'string') {
    return subjectValue;
  }
  
  // If it's an object with _id, try to get the subject name
  if (subjectValue._id) {
    try {
      const subjectDoc = await Subject.findById(subjectValue._id);
      return subjectDoc ? subjectDoc.name : subjectValue._id.toString();
    } catch (err) {
      return subjectValue._id.toString();
    }
  }
  
  // If it's an ObjectId string, try to get the subject name
  if (typeof subjectValue === 'string' && mongoose.isValidObjectId(subjectValue)) {
    try {
      const subjectDoc = await Subject.findById(subjectValue);
      return subjectDoc ? subjectDoc.name : subjectValue;
    } catch (err) {
      return subjectValue;
    }
  }
  
  // Try to convert to string
  try {
    return subjectValue.toString();
  } catch (err) {
    console.error('Error normalizing subject for comparison:', subjectValue, err);
    return null;
  }
};

// Helper function to check teacher access with flexible class matching
const checkTeacherAccess = async (user, subject, classId) => {
  console.log('🔍 Checking teacher access:', {
    teacherId: user.id,
    username: user.username,
    subject,
    classId
  });

  // Convert classId to string for comparison
  const normalizedClassId = normalizeClass(classId);
  
  // Check if teacher is assigned to this subject and class
  const hasAccess = user.subjects?.some(subjectAssignment => {
    console.log('📋 Comparing assignment:', {
      assignment: subjectAssignment,
      requested: { subject, class: normalizedClassId }
    });
    
    const matchesSubject = subjectAssignment.subject === subject;
    
    // Check various class formats
    let matchesClass = false;
    
    // Check direct class string match (e.g., "JSS2")
    if (subjectAssignment.class && typeof subjectAssignment.class === 'string') {
      matchesClass = subjectAssignment.class === normalizedClassId;
      console.log('✅ Checking string class match:', {
        assignmentClass: subjectAssignment.class,
        requestedClass: normalizedClassId,
        matches: matchesClass
      });
    }
    
    // Check classId match (ObjectId)
    if (!matchesClass && subjectAssignment.classId) {
      const assignmentClassId = normalizeClass(subjectAssignment.classId);
      matchesClass = assignmentClassId === normalizedClassId;
      console.log('✅ Checking classId match:', {
        assignmentClassId,
        requestedClass: normalizedClassId,
        matches: matchesClass
      });
    }
    
    // Check className match
    if (!matchesClass && subjectAssignment.className) {
      matchesClass = subjectAssignment.className === normalizedClassId;
      console.log('✅ Checking className match:', {
        assignmentClassName: subjectAssignment.className,
        requestedClass: normalizedClassId,
        matches: matchesClass
      });
    }
    
    // If still no match, try to find class by name
    if (!matchesClass && typeof normalizedClassId === 'string' && !mongoose.isValidObjectId(normalizedClassId)) {
      // This handles cases where teacher has ObjectId but we're sending class name
      // We'll let the database query handle this later
      console.log('ℹ️ Will check class by name in database');
    }
    
    console.log('📊 Final match result:', { matchesSubject, matchesClass });
    
    return matchesSubject && matchesClass;
  });

  // If we couldn't match by direct comparison, try to find the class
  if (!hasAccess && typeof classId === 'string' && !mongoose.isValidObjectId(classId)) {
    console.log('🔍 Trying to find class by name:', classId);
    
    const classDoc = await Class.findOne({ 
      $or: [
        { name: classId },
        { shortName: classId },
        { level: classId }
      ]
    });
    
    if (classDoc) {
      console.log('✅ Found class document:', classDoc);
      
      // Check if teacher is assigned to this class ID
      const classAccess = user.subjects?.some(subjectAssignment => {
        const assignmentClassId = subjectAssignment.classId ? 
          normalizeClass(subjectAssignment.classId) : null;
        
        return subjectAssignment.subject === subject && 
               assignmentClassId === classDoc._id.toString();
      });
      
      if (classAccess) {
        console.log('✅ Teacher has access via class name lookup');
        return true;
      }
    }
  }

  console.log('📊 Teacher access result:', hasAccess ? '✅ Granted' : '❌ Denied');
  return hasAccess || false;
};

// ENHANCED SCORING FUNCTION - Handles text-based correct answers
const calculateScoreWithDebug = (questions, answers) => {
  let score = 0;
  let totalPossibleMarks = 0;
  const correctness = {};
  
  console.log('🎯 ENHANCED SCORING - Starting calculation:', {
    questionCount: questions.length,
    answerCount: Object.keys(answers).length
  });
  
  for (const question of questions) {
    const questionId = question._id.toString();
    const selectedAnswer = answers[questionId];
    
    console.log(`\n🔍 Question ${questionId}:`);
    console.log('  Text:', question.text?.substring(0, 50) + '...');
    console.log('  Options:', question.options);
    console.log('  User selected index:', selectedAnswer);
    
    // Skip if no answer provided
    if (selectedAnswer === undefined || selectedAnswer === null) {
      correctness[questionId] = false;
      totalPossibleMarks += (question.marks || 1);
      console.log('  ❓ No answer provided');
      continue;
    }
    
    // Convert user's answer to integer index
    const userAnswerIndex = parseInt(selectedAnswer);
    
    if (isNaN(userAnswerIndex) || userAnswerIndex < 0 || userAnswerIndex >= question.options.length) {
      correctness[questionId] = false;
      totalPossibleMarks += (question.marks || 1);
      console.log('  ⚠️ Invalid answer index:', selectedAnswer);
      continue;
    }
    
    // Get the text of the user's selected option
    const userSelectedText = question.options[userAnswerIndex];
    console.log('  User selected text:', userSelectedText);
    console.log('  Correct answer in DB:', question.correctAnswer);
    
    // Check if correct answer matches
    let isCorrect = false;
    
    if (question.correctAnswer) {
      // Handle different types of correctAnswer
      const correctAnswer = String(question.correctAnswer).trim();
      
      // Strategy 1: Direct text comparison
      if (userSelectedText && correctAnswer === userSelectedText.trim()) {
        isCorrect = true;
        console.log(`  🎯 CORRECT! Text match: "${userSelectedText}" = "${correctAnswer}"`);
      }
      // Strategy 2: Check if correctAnswer is an index (0,1,2,3)
      else if (/^[0-3]$/.test(correctAnswer)) {
        const correctIndex = parseInt(correctAnswer);
        if (userAnswerIndex === correctIndex) {
          isCorrect = true;
          console.log(`  🎯 CORRECT! Index match: ${userAnswerIndex} = ${correctIndex}`);
        }
      }
      // Strategy 3: Check if correctAnswer is a letter (A,B,C,D)
      else if (/^[A-D]$/.test(correctAnswer.toUpperCase())) {
        // Convert letter to index (A=0, B=1, C=2, D=3)
        const letterIndex = correctAnswer.toUpperCase().charCodeAt(0) - 65;
        if (userAnswerIndex === letterIndex) {
          isCorrect = true;
          console.log(`  🎯 CORRECT! Letter match: ${userAnswerIndex} = ${correctAnswer} (index ${letterIndex})`);
        }
      }
      
      if (!isCorrect) {
        console.log(`  ❌ INCORRECT. User: "${userSelectedText}" (index ${userAnswerIndex}), DB: "${correctAnswer}"`);
      }
    } else {
      console.log(`  ⚠️ No correct answer found in database`);
      isCorrect = false;
    }
    
    correctness[questionId] = isCorrect;
    const questionMarks = question.marks || 1;
    totalPossibleMarks += questionMarks;
    
    if (isCorrect) {
      score += questionMarks;
      console.log(`  💰 Added ${questionMarks} marks. Total: ${score}`);
    }
  }
  
  console.log('\n📊 FINAL SCORING RESULTS:');
  console.log('  Score:', score);
  console.log('  Total Possible Marks:', totalPossibleMarks);
  console.log('  Correct Answers:', Object.values(correctness).filter(v => v).length);
  console.log('  Total Questions:', questions.length);
  console.log('  Percentage:', totalPossibleMarks > 0 ? ((score / totalPossibleMarks) * 100).toFixed(2) + '%' : '0%');
  
  return { score, correctness, totalPossibleMarks };
};

// ==================== NEW ENDPOINTS FOR FRONTEND ====================

// START TEST SESSION
router.post('/:id/start', [auth, validateObjectId('id')], async (req, res) => {
  try {
    console.log('🚀 Tests route - Starting test:', { testId: req.params.id, userId: req.user.id });

    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, error: 'Test not found' });

    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, error: 'Only students can start tests' });
    }

    res.json({
      success: true,
      message: 'Test started',
      test: {
        id: test._id,
        title: test.title,
        duration: test.duration
      }
    });
  } catch (error) {
    console.error('Start test error:', error);
    res.status(500).json({ success: false, error: 'Server error starting test' });
  }
});

// SAVE TEST PROGRESS
router.post('/:id/save-progress', [auth, validateObjectId('id')], async (req, res) => {
  try {
    console.log('💾 Saving progress:', { testId: req.params.id, userId: req.user.id });

    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, error: 'Test not found' });

    res.json({
      success: true,
      message: 'Progress saved',
      savedAt: new Date()
    });
  } catch (error) {
    console.error('Save progress error:', error);
    res.status(500).json({ success: false, error: 'Server error saving progress' });
  }
});

// GET STUDENT SUBMISSIONS
router.get('/submissions/student', auth, async (req, res) => {
  try {
    console.log('📋 Getting student submissions:', { userId: req.user.id });

    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, error: 'Only students can access their submissions' });
    }

    const submissions = await Result.find({ userId: req.user.id })
      .populate('testId', 'title subject class')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      count: submissions.length,
      submissions: submissions
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ success: false, error: 'Server error getting submissions' });
  }
});

// GET STUDENT SUBMISSIONS BY STUDENT ID
router.get('/submissions/student/:studentId', auth, async (req, res) => {
  try {
    console.log('📋 Getting student submissions by ID:', { studentId: req.params.studentId });

    if (req.user.role === 'student' && req.user.id !== req.params.studentId) {
      return res.status(403).json({ success: false, error: 'You can only view your own submissions' });
    }

    const submissions = await Result.find({ userId: req.params.studentId })
      .populate('testId', 'title subject class')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      count: submissions.length,
      submissions: submissions
    });
  } catch (error) {
    console.error('Get student submissions error:', error);
    res.status(500).json({ success: false, error: 'Server error getting student submissions' });
  }
});

// ==================== TEACHER ENDPOINTS ====================

// Teacher creates a draft test - FIXED VERSION
router.post('/', auth, async (req, res) => {
  try {
    const { 
      title, subject, class: classId, instructions, 
      duration, randomize, session, term,
      totalMarks, passingMarks, allowRetakes, maxAttempts, status
    } = req.body;
    
    console.log('📝 Tests route - Teacher creating test:', {
      user: req.user.id,
      username: req.user.username,
      role: req.user.role,
      title, subject, class: classId,
      body: req.body
    });

    // Validate required fields
    const missingFields = [];
    if (!title || typeof title !== 'string' || title.trim() === '') missingFields.push('title');
    if (!subject || typeof subject !== 'string' || subject.trim() === '') missingFields.push('subject');
    if (!classId || (typeof classId !== 'string' && typeof classId !== 'object')) missingFields.push('class');
    if (!duration && duration !== 0) missingFields.push('duration');
    if (missingFields.length > 0) {
      console.log('❌ Tests route - Missing or invalid fields:', missingFields);
      return res.status(400).json({ 
        success: false,
        error: `Missing or invalid fields: ${missingFields.join(', ')}` 
      });
    }

    // Parse numeric values
    const parsedDuration = Number(duration);
    if (isNaN(parsedDuration) || parsedDuration < 1) {
      console.log('❌ Tests route - Invalid duration:', duration);
      return res.status(400).json({ 
        success: false,
        error: 'Duration must be a positive number.' 
      });
    }

    // Check if user has permission to create tests
    if (req.user.role === 'student') {
      console.log('❌ Tests route - Students cannot create tests');
      return res.status(403).json({ 
        success: false,
        error: 'Students cannot create tests.' 
      });
    }

    // For teachers: check if they're assigned to this subject/class
    if (req.user.role === 'teacher') {
      const hasAccess = await checkTeacherAccess(req.user, subject, classId);
      
      if (!hasAccess) {
        console.log('❌ Tests route - Teacher not assigned:', { 
          user: req.user.username, 
          subject, 
          class: classId,
          userSubjects: req.user.subjects 
        });
        
        // Get class name for better error message
        let className = classId;
        try {
          if (mongoose.isValidObjectId(classId)) {
            const classDoc = await Class.findById(classId);
            if (classDoc) className = classDoc.name;
          }
        } catch (error) {
          // Ignore error, use original classId
        }
        
        return res.status(403).json({ 
          success: false,
          error: `You are not assigned to teach ${subject} for class ${className}. Please contact administrator to update your assignments.` 
        });
      }
      
      console.log('✅ Teacher has access to create test');
    }

    // Calculate total marks based on title
    let finalTotalMarks = 20;
    let finalPassingMarks = 8;
    
    if (title.includes('CA')) {
      finalTotalMarks = 20;
      finalPassingMarks = 8; // 40% of 20
    } else if (title === 'Examination') {
      finalTotalMarks = 60;
      finalPassingMarks = 24; // 40% of 60
    } else {
      // For custom tests, use provided values with defaults
      finalTotalMarks = parseInt(totalMarks) || 20;
      finalPassingMarks = parseInt(passingMarks) || Math.ceil(finalTotalMarks * 0.4);
    }

    // FIXED: Ensure passing marks don't exceed total marks
    if (finalPassingMarks > finalTotalMarks) {
      console.log('⚠️ Adjusting passing marks:', {
        originalPassing: finalPassingMarks,
        total: finalTotalMarks,
        newPassing: Math.ceil(finalTotalMarks * 0.4)
      });
      finalPassingMarks = Math.ceil(finalTotalMarks * 0.4);
    }

    console.log('📊 Final marks calculation:', {
      title,
      totalMarks: finalTotalMarks,
      passingMarks: finalPassingMarks,
      percentage: ((finalPassingMarks / finalTotalMarks) * 100).toFixed(1) + '%'
    });

    // Get current session and term if not provided
    const currentSession = session || Test.getCurrentSession().session;
    const currentTerm = term || Test.getCurrentSession().term;

    // Normalize class value for storage
    let normalizedClassId = normalizeClass(classId);
    
    // If class is a name (not ObjectId), try to find the class
    if (typeof normalizedClassId === 'string' && !mongoose.isValidObjectId(normalizedClassId)) {
      console.log('🔍 Looking up class by name:', normalizedClassId);
      const classDoc = await Class.findOne({ 
        $or: [
          { name: normalizedClassId },
          { shortName: normalizedClassId },
          { level: normalizedClassId }
        ]
      });
      
      if (classDoc) {
        console.log('✅ Found class, using ObjectId:', classDoc._id);
        normalizedClassId = classDoc._id.toString();
      } else {
        console.log('⚠️ Class not found, storing as string:', normalizedClassId);
      }
    }

    // Create test data with explicit marks
    const testData = {
      title: title.trim(),
      subject: subject.trim(),
      class: normalizedClassId,
      instructions: instructions ? instructions.trim() : '',
      duration: parsedDuration,
      randomize: randomize || false,
      session: currentSession,
      term: currentTerm,
      questionCount: 0,
      totalMarks: finalTotalMarks,
      passingMarks: finalPassingMarks,
      allowRetakes: allowRetakes || false,
      maxAttempts: maxAttempts || 1,
      status: status || 'draft',
      createdBy: req.user.id,
      createdAt: new Date()
    };

    console.log('📦 Creating test with final data:', testData);

    // Create test
    const test = new Test(testData);
    
    // FIXED: Handle validation errors gracefully
    try {
      await test.save();
    } catch (validationError) {
      console.error('💥 Mongoose validation error:', {
        error: validationError.message,
        errors: validationError.errors
      });
      
      if (validationError.name === 'ValidationError') {
        const errors = Object.values(validationError.errors).map(err => err.message);
        
        // Check specifically for passing marks error
        const passingMarksError = errors.find(err => err.includes('Passing marks cannot exceed total marks'));
        if (passingMarksError) {
          console.error('🔍 Debug passing marks error:', {
            submitted: { total: finalTotalMarks, passing: finalPassingMarks },
            isValid: finalPassingMarks <= finalTotalMarks
          });
        }
        
        return res.status(400).json({ 
          success: false,
          error: `Validation failed: ${errors.join(', ')}` 
        });
      }
      throw validationError;
    }

    console.log('✅ Test created successfully:', {
      testId: test._id,
      title: test.title,
      subject: test.subject,
      class: test.class,
      totalMarks: test.totalMarks,
      passingMarks: test.passingMarks,
      createdBy: req.user.username,
      status: test.status
    });
    
    res.status(201).json({
      success: true,
      message: 'Test created successfully',
      test: {
        _id: test._id,
        title: test.title,
        subject: test.subject,
        class: test.class,
        session: test.session,
        term: test.term,
        duration: test.duration,
        totalMarks: test.totalMarks,
        passingMarks: test.passingMarks,
        status: test.status,
        createdBy: test.createdBy,
        createdAt: test.createdAt
      }
    });
  } catch (error) {
    console.error('💥 Tests route - Error creating test:', {
      error: error.message,
      code: error.code,
      request: req.body,
      stack: error.stack,
      user: req.user?.username
    });
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        error: 'Duplicate test entry detected.' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Server error creating test' 
    });
  }
});

// Teacher updates a draft test
router.put('/:id', [auth, validateObjectId('id')], async (req, res) => {
  try {
    const { 
      title, subject, class: classId, instructions, 
      duration, randomize, session, term,
      totalMarks, passingMarks, allowRetakes, maxAttempts, status
    } = req.body;
    
    console.log('📝 Tests route - Teacher updating test:', { 
      id: req.params.id, 
      user: req.user.id,
      username: req.user.username,
      role: req.user.role
    });

    const test = await Test.findById(req.params.id);
    if (!test) {
      console.log('❌ Tests route - Test not found:', { id: req.params.id });
      return res.status(404).json({ 
        success: false,
        error: 'Test not found.' 
      });
    }

    // Check if user can edit this test
    if (req.user.role === 'student') {
      console.log('❌ Tests route - Students cannot edit tests');
      return res.status(403).json({ 
        success: false,
        error: 'Students cannot edit tests.' 
      });
    }

    if (req.user.role === 'teacher') {
      // Teacher can only edit their own draft tests
      if (test.createdBy.toString() !== req.user.id.toString()) {
        console.log('❌ Tests route - Not the creator:', { 
          creator: test.createdBy, 
          user: req.user.id 
        });
        return res.status(403).json({ 
          success: false,
          error: 'You can only edit tests you created.' 
        });
      }
      
      if (test.status !== 'draft') {
        console.log('❌ Tests route - Cannot edit non-draft test:', { 
          testId: test._id, 
          status: test.status 
        });
        return res.status(403).json({ 
          success: false,
          error: 'Only draft tests can be edited.' 
        });
      }
      
      // Check if teacher has access to the subject/class
      const testSubject = subject || test.subject;
      const testClass = classId || test.class;
      
      const hasAccess = await checkTeacherAccess(req.user, testSubject, testClass);

      if (!hasAccess) {
        console.log('❌ Tests route - Not assigned:', { 
          user: req.user.username, 
          subject: testSubject, 
          class: testClass 
        });
        return res.status(403).json({ 
          success: false,
          error: 'You are not assigned to this test\'s subject/class.' 
        });
      }
    }

    // Update fields
    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (subject !== undefined) updates.subject = subject.trim();
    if (classId !== undefined) updates.class = normalizeClass(classId);
    if (instructions !== undefined) updates.instructions = instructions.trim();
    if (duration !== undefined) updates.duration = Number(duration);
    if (randomize !== undefined) updates.randomize = randomize;
    if (session !== undefined) updates.session = session;
    if (term !== undefined) updates.term = term;
    if (totalMarks !== undefined) updates.totalMarks = totalMarks;
    if (passingMarks !== undefined) updates.passingMarks = passingMarks;
    if (allowRetakes !== undefined) updates.allowRetakes = allowRetakes;
    if (maxAttempts !== undefined) updates.maxAttempts = maxAttempts;
    if (status !== undefined) updates.status = status;
    
    // Recalculate marks if title changed
    if (title && title.includes('CA')) {
      updates.totalMarks = 20;
      updates.passingMarks = Math.ceil(20 * 0.4);
    } else if (title === 'Examination') {
      updates.totalMarks = 60;
      updates.passingMarks = Math.ceil(60 * 0.4);
    }

    Object.assign(test, updates);
    
    // FIXED: Handle validation errors on update
    try {
      await test.save();
    } catch (validationError) {
      console.error('💥 Mongoose validation error on update:', {
        error: validationError.message,
        errors: validationError.errors
      });
      
      if (validationError.name === 'ValidationError') {
        const errors = Object.values(validationError.errors).map(err => err.message);
        return res.status(400).json({ 
          success: false,
          error: `Validation failed: ${errors.join(', ')}` 
        });
      }
      throw validationError;
    }

    console.log('✅ Tests route - Test updated:', { 
      testId: test._id, 
      status: test.status
    });
    
    res.json({
      success: true,
      message: 'Test updated successfully',
      test: test
    });
  } catch (error) {
    console.error('💥 Tests route - Error updating test:', {
      error: error.message,
      testId: req.params.id,
      user: req.user?.username,
      stack: error.stack
    });
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        error: `Validation failed: ${errors.join(', ')}` 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Server error updating test' 
    });
  }
});

// ==================== ADMIN ENDPOINTS ====================

// Admin approves a test
router.put('/:id/approve', [auth, checkPermission('approve_tests'), validateObjectId('id')], async (req, res) => {
  try {
    console.log('✅ Tests route - Admin approving test:', { 
      id: req.params.id, 
      user: req.user.username 
    });

    const test = await Test.findById(req.params.id);
    if (!test) {
      console.log('❌ Tests route - Test not found:', { id: req.params.id });
      return res.status(404).json({ 
        success: false,
        error: 'Test not found.' 
      });
    }

    // Check if test is ready for approval
    if (test.status !== 'draft') {
      console.log('❌ Tests route - Test not in draft status:', { status: test.status });
      return res.status(400).json({ 
        success: false,
        error: 'Only draft tests can be approved.' 
      });
    }

    if (test.questionCount === 0) {
      console.log('❌ Tests route - No questions in test');
      return res.status(400).json({ 
        success: false,
        error: 'Cannot approve test with no questions.' 
      });
    }

    // Approve the test
    test.status = 'approved';
    test.approvedBy = req.user.id;
    test.approvedAt = new Date();

    await test.save();

    console.log('✅ Tests route - Test approved:', { 
      testId: test._id, 
      approvedBy: req.user.username,
      approvedAt: test.approvedAt 
    });

    res.json({
      success: true,
      message: 'Test approved successfully',
      test: {
        id: test._id,
        title: test.title,
        subject: test.subject,
        class: test.class,
        status: test.status,
        approvedBy: req.user.username,
        approvedAt: test.approvedAt
      }
    });
  } catch (error) {
    console.error('💥 Tests route - Approval Error:', {
      error: error.message,
      testId: req.params.id,
      user: req.user.username,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false,
      error: 'Server error approving test' 
    });
  }
});

// Admin schedules a test with batches - FIXED VERSION
router.put('/:id/schedule', [auth, checkPermission('manage_tests'), validateObjectId('id')], async (req, res) => {
  try {
    const { batches, settings } = req.body;
    console.log('📅 Tests route - Admin scheduling test:', { 
      id: req.params.id, 
      user: req.user.username, 
      batchesCount: batches?.length || 0 
    });

    // Populate test with class
    const test = await Test.findById(req.params.id).populate('class', 'name');
    if (!test) {
      console.log('❌ Tests route - Test not found:', { id: req.params.id });
      return res.status(404).json({ 
        success: false,
        error: 'Test not found.' 
      });
    }

    // Check if test is approved
    if (test.status !== 'approved') {
      console.log('❌ Tests route - Test not approved for scheduling:', { status: test.status });
      return res.status(400).json({ 
        success: false,
        error: 'Only approved tests can be scheduled.' 
      });
    }

    // Validate batches
    if (!batches || !Array.isArray(batches) || batches.length === 0) {
      console.log('❌ Tests route - Invalid batches:', batches);
      return res.status(400).json({ 
        success: false,
        error: 'Batches must be a non-empty array.' 
      });
    }

    for (const [index, batch] of batches.entries()) {
      if (!batch.name || !batch.schedule?.start || !batch.schedule?.end) {
        console.log('❌ Tests route - Invalid batch data:', batch);
        return res.status(400).json({ 
          success: false,
          error: `Batch ${index + 1}: Each batch requires name, start, and end time.` 
        });
      }
      
      if (new Date(batch.schedule.start) >= new Date(batch.schedule.end)) {
        console.log('❌ Tests route - Invalid schedule:', batch.schedule);
        return res.status(400).json({ 
          success: false,
          error: `Batch ${batch.name}: End time must be after start time.` 
        });
      }
      
      if (new Date(batch.schedule.start) <= new Date()) {
        console.log('❌ Tests route - Start time not in future:', batch.schedule.start);
        return res.status(400).json({ 
          success: false,
          error: `Batch ${batch.name}: Start time must be in the future.` 
        });
      }
      
      // Validate students if provided
      if (batch.students && Array.isArray(batch.students)) {
        for (const studentId of batch.students) {
          if (!mongoose.isValidObjectId(studentId)) {
            console.log('❌ Tests route - Invalid student ID:', studentId);
            return res.status(400).json({ 
              success: false,
              error: `Batch ${batch.name}: Invalid student ID: ${studentId}` 
            });
          }
          
          // Check if student exists and is a student
          const student = await User.findById(studentId);
          if (!student || student.role !== 'student') {
            console.log('❌ Tests route - Invalid student:', studentId);
            return res.status(400).json({ 
              success: false,
              error: `Batch ${batch.name}: Student ${studentId} not found or not a student.` 
            });
          }
          
          // Populate student with enrolledSubjects
          const populatedStudent = await User.findById(studentId)
            .populate('enrolledSubjects.subject', 'name _id')
            .populate('enrolledSubjects.class', 'name _id');
            
          console.log('🔍 DEBUG - Enrollment check:', {
            student: populatedStudent.username,
            testSubject: test.subject,
            testClass: test.class,
            testClassId: normalizeClassForComparison(test.class)
          });
          
          // Check if student is enrolled in the test's subject and class
          let isEnrolled = false;
          let enrollmentDetails = null;
          
          if (populatedStudent.enrolledSubjects && populatedStudent.enrolledSubjects.length > 0) {
            for (const enrollment of populatedStudent.enrolledSubjects) {
              // Get subject from enrollment (could be ObjectId or string)
              let enrollmentSubject = '';
              if (enrollment.subject) {
                if (enrollment.subject._id) {
                  // If populated, get the name
                  enrollmentSubject = enrollment.subject.name || enrollment.subject._id.toString();
                } else if (typeof enrollment.subject === 'string') {
                  enrollmentSubject = enrollment.subject;
                } else {
                  enrollmentSubject = enrollment.subject.toString();
                }
              }
              
              // Get class from enrollment
              let enrollmentClassId = '';
              if (enrollment.class) {
                if (enrollment.class._id) {
                  enrollmentClassId = enrollment.class._id.toString();
                } else if (typeof enrollment.class === 'string') {
                  enrollmentClassId = enrollment.class;
                } else {
                  enrollmentClassId = enrollment.class.toString();
                }
              }
              
              const testClassId = normalizeClassForComparison(test.class);
              const subjectMatches = enrollmentSubject === test.subject;
              const classMatches = enrollmentClassId === testClassId;
              
              console.log('🔍 DEBUG - Comparison details:', {
                enrollmentSubject,
                testSubject: test.subject,
                enrollmentClassId,
                testClassId,
                subjectMatches,
                classMatches,
                enrollmentSubjectType: typeof enrollmentSubject,
                enrollmentClassIdType: typeof enrollmentClassId
              });
              
              if (subjectMatches && classMatches) {
                isEnrolled = true;
                enrollmentDetails = {
                  subject: enrollmentSubject,
                  class: enrollmentClassId
                };
                break;
              }
            }
          }
          
          if (!isEnrolled) {
            console.log('❌ Tests route - Student not enrolled:', { 
              student: populatedStudent.username,
              testSubject: test.subject,
              testClass: test.class,
              enrolledSubjects: populatedStudent.enrolledSubjects?.map(e => ({
                subject: e.subject?.name || e.subject,
                class: e.class?.name || e.class,
                subjectId: e.subject?._id || e.subject,
                classId: e.class?._id || e.class
              }))
            });
            
            // Get readable names for error message
            let testSubjectName = test.subject;
            let testClassName = test.class?.name || test.class;
            
            return res.status(400).json({ 
              success: false,
              error: `Batch ${batch.name}: Student ${populatedStudent.username} is not enrolled in ${testSubjectName} for class ${testClassName}.`
            });
          }
          
          console.log('✅ Student is enrolled:', {
            student: populatedStudent.username,
            details: enrollmentDetails
          });
        }
      }
    }

    // Update test with batches and settings
    test.batches = batches.map(batch => ({
      name: batch.name,
      students: (batch.students || []).map(id => new mongoose.Types.ObjectId(id)),
      schedule: {
        start: new Date(batch.schedule.start),
        end: new Date(batch.schedule.end),
      },
      isActive: batch.isActive !== false
    }));

    if (settings) {
      test.settings = {
        ...test.settings,
        ...settings
      };
    }

    test.status = 'scheduled';

    await test.save();
    
    console.log('✅ Tests route - Test scheduled:', { 
      testId: test._id, 
      status: test.status, 
      batches: test.batches.map(b => ({ 
        name: b.name, 
        studentCount: b.students.length,
        start: b.schedule.start,
        end: b.schedule.end 
      })) 
    });
    
    res.json({
      success: true,
      message: 'Test scheduled successfully',
      test: test
    });
  } catch (error) {
    console.error('💥 Tests route - Error scheduling test:', {
      error: error.message,
      testId: req.params.id,
      user: req.user.username,
      stack: error.stack
    });
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        error: `Validation failed: ${errors.join(', ')}` 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Server error scheduling test' 
    });
  }
});

// Admin updates test status
router.put('/:id/status', [auth, checkPermission('manage_tests'), validateObjectId('id')], async (req, res) => {
  try {
    const { status } = req.body;
    console.log('🔄 Tests route - Admin updating test status:', { 
      id: req.params.id, 
      user: req.user.username, 
      newStatus: status 
    });

    if (!status || typeof status !== 'string') {
      console.log('❌ Tests route - Invalid status:', status);
      return res.status(400).json({ 
        success: false,
        error: 'Status is required and must be a string.' 
      });
    }

    if (!['draft', 'approved', 'scheduled', 'active', 'completed', 'cancelled'].includes(status)) {
      console.log('❌ Tests route - Invalid status value:', status);
      return res.status(400).json({ 
        success: false,
        error: 'Status must be draft, approved, scheduled, active, completed, or cancelled.' 
      });
    }

    const test = await Test.findById(req.params.id);
    if (!test) {
      console.log('❌ Tests route - Test not found:', { id: req.params.id });
      return res.status(404).json({ 
        success: false,
        error: 'Test not found.' 
      });
    }

    // Status transition validation
    const validTransitions = {
      draft: ['approved', 'cancelled'],
      approved: ['scheduled', 'cancelled'],
      scheduled: ['active', 'completed', 'cancelled'],
      active: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    };

    if (!validTransitions[test.status]?.includes(status)) {
      console.log('❌ Tests route - Invalid status transition:', { from: test.status, to: status });
      return res.status(400).json({ 
        success: false,
        error: `Cannot change status from ${test.status} to ${status}.` 
      });
    }

    test.status = status;
    
    // If marking as active, check if any batch is currently active
    if (status === 'active') {
      const now = new Date();
      const hasActiveBatch = test.batches.some(batch => 
        batch.isActive &&
        now >= new Date(batch.schedule.start) && 
        now <= new Date(batch.schedule.end)
      );
      
      if (!hasActiveBatch) {
        console.log('❌ Tests route - No active batch found for activation');
        return res.status(400).json({ 
          success: false,
          error: 'Cannot activate test - no batch is currently active.' 
        });
      }
    }

    await test.save();
    
    console.log('✅ Tests route - Test status updated:', { 
      testId: test._id, 
      oldStatus: test.previous('status'), 
      newStatus: test.status 
    });
    
    res.json({
      success: true,
      message: 'Test status updated successfully',
      test: {
        id: test._id,
        title: test.title,
        status: test.status
      }
    });
  } catch (error) {
    console.error('💥 Tests route - Error updating status:', {
      error: error.message,
      testId: req.params.id,
      user: req.user.username,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false,
      error: 'Server error updating test status' 
    });
  }
});

// ==================== FETCH ENDPOINTS ====================

// Get all tests for current user
router.get('/', auth, async (req, res) => {
  try {
    console.log('📋 Tests route - Fetching tests:', { 
      user: req.user.username, 
      role: req.user.role 
    });
    
    let query = { isActive: true };
    
    if (req.user.role === 'teacher') {
      // Teacher sees their own tests
      query.createdBy = req.user.id;
      
      // Filter by subject if provided
      if (req.query.subject) query.subject = req.query.subject;
      
      // Filter by class with flexible matching
      if (req.query.class) {
        const classValue = req.query.class;
        const normalizedClass = normalizeClass(classValue);
        
        // If class is a string name, try to find matching classes
        if (typeof classValue === 'string' && !mongoose.isValidObjectId(classValue)) {
          const classDoc = await Class.findOne({ 
            $or: [
              { name: classValue },
              { shortName: classValue },
              { level: classValue }
            ]
          });
          
          if (classDoc) {
            // Match either by ObjectId or name
            query.$or = [
              { class: classDoc._id.toString() },
              { class: classValue },
              { class: classDoc.name }
            ];
          } else {
            query.class = classValue;
          }
        } else {
          query.class = normalizedClass;
        }
      }
      
      // Filter by status
      if (req.query.status) query.status = req.query.status;
      
    } 
    else if (req.user.role === 'student') {
      // Student sees scheduled tests they're assigned to
      query.status = 'scheduled';
      query['batches.students'] = { $in: [req.user.id] };
      query['batches.isActive'] = true;
      
      // Filter by subject if provided
      if (req.query.subject) query.subject = req.query.subject;
      
      // Filter by class if provided
      if (req.query.class) {
        const classValue = req.query.class;
        const normalizedClass = normalizeClass(classValue);
        
        if (typeof classValue === 'string' && !mongoose.isValidObjectId(classValue)) {
          const classDoc = await Class.findOne({ 
            $or: [
              { name: classValue },
              { shortName: classValue },
              { level: classValue }
            ]
          });
          
          if (classDoc) {
            query.$or = [
              { class: classDoc._id.toString() },
              { class: classValue },
              { class: classDoc.name }
            ];
          } else {
            query.class = classValue;
          }
        } else {
          query.class = normalizedClass;
        }
      }
    } 
    else if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      // Admin sees all tests
      if (req.query.status) query.status = req.query.status;
      if (req.query.subject) query.subject = req.query.subject;
      if (req.query.class) query.class = normalizeClass(req.query.class);
      if (req.query.createdBy) query.createdBy = req.query.createdBy;
    } 
    else {
      console.log('❌ Tests route - Access denied:', { user: req.user.username });
      return res.status(403).json({ 
        success: false,
        error: 'Access restricted to authorized users.' 
      });
    }

    console.log('🔍 Final query:', JSON.stringify(query, null, 2));

    const tests = await Test.find(query)
      .populate('createdBy', 'username name')
      .populate('approvedBy', 'username name')
      .populate('class', 'name')
      .sort({ createdAt: -1 });
    
    console.log('✅ Tests route - Fetched:', { 
      count: tests.length
    });
    
    return res.json({
      success: true,
      count: tests.length,
      tests: tests
    });
  } catch (error) {
    console.error('💥 Tests route - Error fetching tests:', {
      error: error.message,
      user: req.user.username,
      stack: error.stack
    });
    return res.status(500).json({ 
      success: false,
      error: 'Server error fetching tests' 
    });
  }
});

// Get a specific test - UPDATED VERSION with class population
router.get('/:testId', [auth, validateObjectId('testId')], async (req, res) => {
  try {
    console.log('🔍 Tests route - Fetching test:', { 
      testId: req.params.testId, 
      user: req.user.username, 
      role: req.user.role 
    });

    const test = await Test.findById(req.params.testId)
      .populate('createdBy', 'username name')
      .populate('approvedBy', 'username name')
      .populate('class', 'name')
      .lean();

    if (!test) {
      console.log('❌ Tests route - Test not found:', { testId: req.params.testId });
      return res.status(404).json({ 
        success: false,
        error: 'Test not found.' 
      });
    }

    // BACKWARD COMPATIBILITY: If class is still an ObjectId string, populate it
    if (test.class && typeof test.class === 'string' && mongoose.isValidObjectId(test.class)) {
      console.log('🔄 Test class is ObjectId string, populating manually...');
      const classDoc = await Class.findById(test.class).select('name').lean();
      if (classDoc) {
        test.class = { _id: classDoc._id, name: classDoc.name };
        console.log('✅ Manually populated class:', test.class);
      }
    }

    // Role-based access control
    if (req.user.role === 'teacher') {
      if (test.createdBy._id.toString() !== req.user.id.toString()) {
        console.log('❌ Tests route - Teacher not the creator:', { 
          creator: test.createdBy._id, 
          user: req.user.id 
        });
        return res.status(403).json({ 
          success: false,
          error: 'You can only view tests you created.' 
        });
      }
    } 
    else if (req.user.role === 'student') {
      // Check if student is assigned to this test
      const isAssigned = test.batches.some(batch => 
        batch.students && batch.students.some(student => 
          student && student.toString() === req.user.id.toString()
        )
      );
      
      if (!isAssigned) {
        console.log('❌ Tests route - Student not assigned:', { 
          userId: req.user.id 
        });
        return res.status(403).json({ 
          success: false,
          error: 'You are not assigned to this test.' 
        });
      }
      
      // Check if test is available
      const now = new Date();
      const studentBatch = test.batches.find(batch => 
        batch.students && batch.students.some(student => 
          student && student.toString() === req.user.id.toString()
        )
      );
      
      if (studentBatch) {
        const start = new Date(studentBatch.schedule.start);
        const end = new Date(studentBatch.schedule.end);
        
        if (now < start || now > end) {
          console.log('❌ Tests route - Test not available:', { 
            now, start, end 
          });
          return res.status(403).json({ 
            success: false,
            error: 'Test not available at this time.' 
          });
        }
      }
    }

    console.log('✅ Tests route - Fetch success:', { 
      testId: test._id, 
      status: test.status,
      class: test.class,
      hasClassName: !!test.class?.name
    });
    
    res.json({
      success: true,
      test: test
    });
  } catch (error) {
    console.error('💥 Tests route - Error fetching test:', {
      error: error.message,
      testId: req.params.testId,
      user: req.user.username,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false,
      error: 'Server error fetching test' 
    });
  }
});

// ============== GET QUESTIONS FOR A TEST - FIXED VERSION ==============

// Get questions for a specific test - FIXED AND WORKING VERSION
router.get('/:testId/questions', [auth, validateObjectId('testId')], async (req, res) => {
  try {
    console.log('📝 Tests route - Fetching test questions:', { 
      testId: req.params.testId, 
      user: req.user.username, 
      role: req.user.role 
    });

    // Fetch test with populated questions
    const test = await Test.findById(req.params.testId)
      .populate({
        path: 'questions',
        select: '_id text type options marks difficulty explanation createdAt isActive correctAnswer',
        match: { isActive: true }
      })
      .lean();

    if (!test) {
      console.log('❌ Tests route - Test not found:', { testId: req.params.testId });
      return res.status(404).json({ 
        success: false,
        error: 'Test not found.' 
      });
    }

    // Role-based access control
    if (req.user.role === 'student') {
      // Check if student is assigned to this test
      const isAssigned = test.batches.some(batch => 
        batch.students && batch.students.some(student => 
          student && student.toString() === req.user.id.toString()
        )
      );
      
      if (!isAssigned) {
        console.log('❌ Tests route - Student not assigned:', { userId: req.user.id });
        return res.status(403).json({ 
          success: false,
          error: 'You are not assigned to this test.' 
        });
      }
      
      // Check if test is currently available
      const now = new Date();
      const studentBatch = test.batches.find(batch => 
        batch.students && batch.students.some(student => 
          student && student.toString() === req.user.id.toString()
        )
      );
      
      if (studentBatch) {
        const start = new Date(studentBatch.schedule.start);
        const end = new Date(studentBatch.schedule.end);
        
        if (now < start) {
          console.log('❌ Tests route - Test not started:', { now, start });
          return res.status(403).json({ 
            success: false,
            error: 'Test has not started yet.' 
          });
        }
        
        if (now > end) {
          console.log('❌ Tests route - Test ended:', { now, end });
          return res.status(403).json({ 
            success: false,
            error: 'Test has ended.' 
          });
        }
      }
    } 
    else if (req.user.role === 'teacher') {
      // Teacher can only view questions for tests they created
      if (test.createdBy.toString() !== req.user.id.toString()) {
        console.log('❌ Tests route - Teacher not the creator:', { 
          creator: test.createdBy, 
          user: req.user.id 
        });
        return res.status(403).json({ 
          success: false,
          error: 'You can only view questions for tests you created.' 
        });
      }
    }

    // Check if test has questions
    if (!test.questions || test.questions.length === 0) {
      console.log('❌ Tests route - No questions in test:', { testId: req.params.testId });
      return res.status(404).json({ 
        success: false,
        error: 'No questions found for this test.' 
      });
    }

    // For students, remove correct answers and only show question data
    let questions = test.questions;
    if (req.user.role === 'student') {
      questions = questions.map(question => {
        // Create a sanitized copy without correctAnswer
        const sanitizedQuestion = { 
          _id: question._id,
          text: question.text,
          type: question.type || 'multiple-choice',
          options: question.options || [],
          marks: question.marks || 1,
          difficulty: question.difficulty || 'medium',
          explanation: question.explanation || '',
          createdAt: question.createdAt,
          isActive: question.isActive
        };
        
        return sanitizedQuestion;
      });
    }

    // Shuffle questions if test.randomize is true (for students only)
    if (req.user.role === 'student' && test.randomize) {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    console.log('✅ Tests route - Questions fetched:', { 
      testId: test._id, 
      questionCount: questions.length,
      userRole: req.user.role,
      randomized: test.randomize && req.user.role === 'student'
    });
    
    res.json({
      success: true,
      questions: questions,
      totalQuestions: questions.length,
      testTitle: test.title,
      testDuration: test.duration,
      testSettings: {
        randomize: test.randomize,
        showResults: test.showResults,
        allowRetakes: test.allowRetakes,
        maxAttempts: test.maxAttempts
      }
    });
  } catch (error) {
    console.error('💥 Tests route - Error fetching questions:', {
      error: error.message,
      testId: req.params.testId,
      user: req.user.username,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false,
      error: 'Server error fetching questions' 
    });
  }
});

// Get teacher's tests
router.get('/teacher/:teacherId', auth, async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // Check if requesting teacher is accessing their own data
    if (req.user.role === 'teacher' && req.user.id !== teacherId) {
      return res.status(403).json({
        success: false,
        error: 'Can only view your own tests'
      });
    }

    // Check if teacher exists
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({
        success: false,
        error: 'Teacher not found'
      });
    }

    // Get teacher's tests for their assigned subjects
    const teacherSubjects = teacher.subjects || [];
    let query = { 
      createdBy: teacherId,
      isActive: true 
    };

    if (teacherSubjects.length > 0) {
      const subjectConditions = teacherSubjects.map(sub => ({
        subject: sub.subject,
        class: normalizeClass(sub.class)
      }));
      query.$or = subjectConditions;
    }

    const tests = await Test.find(query)
      .populate('class', 'name level')
      .populate('subject', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      tests
    });

  } catch (error) {
    console.error('Teacher tests error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching teacher tests'
    });
  }
});

// ==================== TEST SUBMISSION ENDPOINT (FIXED WITH ENHANCED SCORING) ====================

// Submit test answers - UPDATED WITH ENHANCED SCORING FOR TEXT-BASED ANSWERS
router.post('/:id/submit', [auth, validateObjectId('id')], async (req, res) => {
  try {
    const { answers, timeSpent } = req.body;
    
    console.log('🎯 SUBMIT DEBUG - Starting submission:', {
      testId: req.params.id,
      userId: req.user.id,
      username: req.user.username,
      answersCount: Object.keys(answers || {}).length,
      timeSpent: timeSpent || 0
    });

    // Fetch test with questions
    const test = await Test.findById(req.params.id)
      .populate({
        path: 'questions',
        select: '_id text type options marks correctAnswer correctOption answer'
      });

    if (!test) {
      console.log('❌ Tests route - Test not found:', { testId: req.params.id });
      return res.status(404).json({ 
        success: false,
        error: 'Test not found.' 
      });
    }

    // Check if user is a student
    if (req.user.role !== 'student') {
      console.log('❌ Tests route - Only students can submit tests:', { role: req.user.role });
      return res.status(403).json({ 
        success: false,
        error: 'Only students can submit tests.' 
      });
    }

    // Check if test is available
    if (test.status !== 'scheduled' && test.status !== 'active') {
      console.log('❌ Tests route - Test not available:', { status: test.status });
      return res.status(403).json({ 
        success: false,
        error: 'Test is not available for submission.' 
      });
    }

    // Check if student is in any batch (simplified check)
    const isAssigned = test.batches && test.batches.some(batch => 
      batch.students && batch.students.some(student => 
        student && student.toString() === req.user.id.toString()
      )
    );

    if (!isAssigned) {
      console.log('❌ Tests route - Student not assigned:', { userId: req.user.id });
      return res.status(403).json({ 
        success: false,
        error: 'You are not assigned to this test.' 
      });
    }

    // Check if student can submit/retake this test
    const existingResults = await Result.find({
      testId: req.params.id,
      userId: req.user.id
    }).sort({ submittedAt: -1 });

    console.log('📊 SUBMIT DEBUG - Existing results check:', {
      userId: req.user.id,
      testId: req.params.id,
      existingResultsCount: existingResults.length,
      allowRetakes: test.allowRetakes,
      maxAttempts: test.maxAttempts
    });

    if (existingResults.length > 0) {
      // Check if retakes are allowed
      if (!test.allowRetakes) {
        console.log('❌ Tests route - Retakes not allowed:', {
          userId: req.user.id,
          testId: req.params.id,
          allowRetakes: test.allowRetakes,
          existingResultId: existingResults[0]._id,
          submittedAt: existingResults[0].submittedAt
        });
        return res.status(400).json({ 
          success: false,
          error: 'You have already submitted this test. Retakes are not allowed.',
          submittedAt: existingResults[0].submittedAt,
          score: existingResults[0].score,
          totalMarks: existingResults[0].totalMarks,
          percentage: existingResults[0].percentage,
          allowRetakes: false
        });
      }

      // Check if max attempts reached
      if (test.maxAttempts && existingResults.length >= test.maxAttempts) {
        console.log('❌ Tests route - Max attempts reached:', {
          userId: req.user.id,
          testId: req.params.id,
          attempts: existingResults.length,
          maxAttempts: test.maxAttempts
        });
        return res.status(400).json({ 
          success: false,
          error: `Maximum attempts (${test.maxAttempts}) reached. You cannot take this test again.`,
          attempts: existingResults.length,
          maxAttempts: test.maxAttempts,
          lastSubmittedAt: existingResults[0].submittedAt
        });
      }

      console.log('✅ Tests route - Retake allowed:', {
        userId: req.user.id,
        testId: req.params.id,
        currentAttempt: existingResults.length + 1,
        maxAttempts: test.maxAttempts || 'unlimited'
      });
    }

    // Check if test is within schedule
    const now = new Date();
    const studentBatch = test.batches.find(batch => 
      batch.students && batch.students.some(student => 
        student && student.toString() === req.user.id.toString()
      )
    );

    if (studentBatch) {
      const start = new Date(studentBatch.schedule.start);
      const end = new Date(studentBatch.schedule.end);
      
      if (now < start) {
        console.log('❌ Tests route - Test not started:', { now, start });
        return res.status(403).json({ 
          success: false,
          error: 'Test has not started yet.' 
        });
      }

      if (now > end) {
        console.log('❌ Tests route - Test ended:', { now, end });
        return res.status(403).json({ 
          success: false,
          error: 'Test has ended.' 
        });
      }
    }

    // Validate answers
    if (!answers || typeof answers !== 'object') {
      console.log('❌ Tests route - No answers provided');
      return res.status(400).json({ 
        success: false,
        error: 'No answers provided.' 
      });
    }

    // Use the ENHANCED scoring function for text-based answers
    const { score, correctness, totalPossibleMarks } = calculateScoreWithDebug(test.questions || [], answers);
    
    // Use test total marks if available, otherwise calculate from possible marks
    const totalMarks = test.totalMarks || totalPossibleMarks;
    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const passed = score >= (test.passingMarks || Math.ceil(totalMarks * 0.4));

    // Format session correctly for Result model validation
    let session = test.session;
    let term = test.term;
    
    console.log('📅 SUBMIT DEBUG - Session/Term from test:', {
      originalSession: session,
      originalTerm: term,
      sessionType: typeof session,
      termType: typeof term
    });
    
    // Format session properly for Result model
    if (session && typeof session === 'string') {
      // Check if session already includes term (in correct format)
      const hasTerm = session.includes('First') || session.includes('Second') || session.includes('Third');
      
      if (!hasTerm) {
        // Add term to session to create correct format
        if (term && typeof term === 'string') {
          // Remove "Term" if already in term string to avoid duplication
          const cleanTerm = term.replace(' Term', '').trim();
          session = `${session} ${cleanTerm} Term`;
          console.log('🔄 Formatted session with term:', session);
        } else {
          // Default to First Term if term not specified
          session = `${session} First Term`;
          console.log('🔄 Added default term to session:', session);
        }
      }
    } else {
      // Use default session if not provided
      const currentYear = new Date().getFullYear();
      session = `${currentYear}/${currentYear + 1} First Term`;
      console.log('🔄 Using default session:', session);
    }

    // Ensure term exists (for Result model)
    if (!term || typeof term !== 'string') {
      term = 'First Term';
    }

    // Calculate attempt number
    const attemptNumber = existingResults.length + 1;

    // Create result
    const resultData = {
      userId: req.user.id,
      testId: req.params.id,
      answers: answers,
      correctness: correctness,
      score: score,
      totalQuestions: test.questions ? test.questions.length : 0,
      totalMarks: totalMarks,
      percentage: percentage,
      passed: passed,
      subject: test.subject,
      class: test.class,
      session: session, // Use formatted session
      term: term, // Ensure term exists
      submittedAt: new Date(),
      timeSpent: timeSpent || 0,
      attemptNumber: attemptNumber,
      isRetake: attemptNumber > 1
    };

    console.log('📝 SUBMIT DEBUG - Result data to save:', {
      session: resultData.session,
      term: resultData.term,
      subject: resultData.subject,
      class: resultData.class,
      score: resultData.score,
      totalMarks: resultData.totalMarks,
      percentage: resultData.percentage,
      attemptNumber: resultData.attemptNumber,
      isRetake: resultData.isRetake,
      correctAnswers: Object.values(correctness).filter(v => v).length
    });

    const result = new Result(resultData);
    await result.save();

    console.log('✅ Tests route - Submission successful:', { 
      testId: req.params.id, 
      score, 
      totalMarks,
      percentage,
      passed,
      resultId: result._id,
      correctAnswers: Object.values(correctness).filter(v => v).length,
      totalQuestions: test.questions?.length || 0,
      session: result.session,
      attemptNumber: result.attemptNumber,
      isRetake: result.isRetake
    });

    res.json({
      success: true,
      message: 'Test submitted successfully',
      result: {
        id: result._id,
        score: score,
        totalMarks: totalMarks,
        percentage: percentage,
        passed: passed,
        totalQuestions: result.totalQuestions,
        correctAnswers: Object.values(correctness).filter(v => v).length,
        session: result.session,
        attemptNumber: result.attemptNumber,
        isRetake: result.isRetake,
        remainingAttempts: test.maxAttempts ? test.maxAttempts - attemptNumber : null
      }
    });

  } catch (error) {
    console.error('💥 Tests route - Error submitting test:', {
      error: error.message,
      testId: req.params.id,
      userId: req.user?.id,
      stack: error.stack
    });
    
    // Specific error handling
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      console.error('💥 Validation errors:', errors);
      
      // Check for specific session validation error
      const sessionError = errors.find(err => err.includes('Session must be in format'));
      if (sessionError) {
        console.error('🔍 Session format issue detected. Current session from test:', {
          testId: req.params.id,
          session: (await Test.findById(req.params.id).select('session term')).session,
          term: (await Test.findById(req.params.id).select('session term')).term
        });
        
        return res.status(400).json({ 
          success: false,
          error: `Session format error: ${sessionError}. Test session needs to be in format "YYYY/YYYY First/Second/Third Term".` 
        });
      }
      
      return res.status(400).json({ 
        success: false,
        error: `Validation failed: ${errors.join(', ')}` 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        error: 'Duplicate submission detected.' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Server error submitting test. Please try again.' 
    });
  }
});

// ==================== CHECK TEST AVAILABILITY ENDPOINT ====================

// Check if student can take a test (for frontend to check before starting)
router.get('/:id/can-take', [auth, validateObjectId('id')], async (req, res) => {
  try {
    console.log('🔍 Tests route - Checking if student can take test:', { 
      testId: req.params.id, 
      userId: req.user.id,
      username: req.user.username
    });

    const test = await Test.findById(req.params.id);

    if (!test) {
      console.log('❌ Tests route - Test not found:', { testId: req.params.id });
      return res.status(404).json({ 
        success: false,
        error: 'Test not found.' 
      });
    }

    // Check if user is a student
    if (req.user.role !== 'student') {
      console.log('❌ Tests route - Only students can take tests:', { role: req.user.role });
      return res.status(403).json({ 
        success: false,
        error: 'Only students can take tests.' 
      });
    }

    // Check if test is available
    if (test.status !== 'scheduled' && test.status !== 'active') {
      console.log('❌ Tests route - Test not available:', { status: test.status });
      return res.json({
        success: true,
        canTake: false,
        reason: 'Test is not available for taking.',
        testStatus: test.status
      });
    }

    // Check if student is assigned to this test
    const isAssigned = test.batches && test.batches.some(batch => 
      batch.students && batch.students.some(student => 
        student && student.toString() === req.user.id.toString()
      )
    );

    if (!isAssigned) {
      console.log('❌ Tests route - Student not assigned:', { userId: req.user.id });
      return res.json({
        success: true,
        canTake: false,
        reason: 'You are not assigned to this test.'
      });
    }

    // Check if test is within schedule
    const now = new Date();
    const studentBatch = test.batches.find(batch => 
      batch.students && batch.students.some(student => 
        student && student.toString() === req.user.id.toString()
      )
    );

    let scheduleInfo = {};
    if (studentBatch) {
      const start = new Date(studentBatch.schedule.start);
      const end = new Date(studentBatch.schedule.end);
      scheduleInfo = { start, end, now };
      
      if (now < start) {
        console.log('❌ Tests route - Test not started:', { now, start });
        return res.json({
          success: true,
          canTake: false,
          reason: 'Test has not started yet.',
          schedule: {
            start,
            end,
            startsIn: Math.ceil((start - now) / (1000 * 60)) // minutes
          }
        });
      }

      if (now > end) {
        console.log('❌ Tests route - Test ended:', { now, end });
        return res.json({
          success: true,
          canTake: false,
          reason: 'Test has ended.',
          schedule: {
            start,
            end,
            endedAgo: Math.ceil((now - end) / (1000 * 60)) // minutes
          }
        });
      }
    }

    // Check existing submissions
    const existingResults = await Result.find({
      testId: req.params.id,
      userId: req.user.id
    }).sort({ submittedAt: -1 });

    const canRetake = test.allowRetakes;
    const maxAttempts = test.maxAttempts || 1;
    const attemptsUsed = existingResults.length;
    const attemptsRemaining = maxAttempts - attemptsUsed;

    console.log('📊 Tests route - Attempts check:', {
      allowRetakes: canRetake,
      maxAttempts,
      attemptsUsed,
      attemptsRemaining,
      existingResultsCount: existingResults.length
    });

    if (existingResults.length > 0) {
      if (!canRetake) {
        console.log('❌ Tests route - Retakes not allowed:', {
          attemptsUsed,
          allowRetakes: canRetake
        });
        return res.json({
          success: true,
          canTake: false,
          reason: 'You have already submitted this test. Retakes are not allowed.',
          lastSubmission: existingResults[0].submittedAt,
          lastScore: existingResults[0].score,
          totalMarks: existingResults[0].totalMarks,
          percentage: existingResults[0].percentage,
          allowRetakes: false,
          attemptsUsed,
          maxAttempts
        });
      }

      if (maxAttempts && attemptsUsed >= maxAttempts) {
        console.log('❌ Tests route - Max attempts reached:', {
          attemptsUsed,
          maxAttempts
        });
        return res.json({
          success: true,
          canTake: false,
          reason: `Maximum attempts (${maxAttempts}) reached. You cannot take this test again.`,
          attemptsUsed,
          maxAttempts,
          lastSubmission: existingResults[0].submittedAt,
          allowRetakes: true
        });
      }

      console.log('✅ Tests route - Can retake test:', {
        attemptsUsed,
        attemptsRemaining,
        maxAttempts
      });
    }

    console.log('✅ Tests route - Student can take test:', {
      testId: req.params.id,
      userId: req.user.id,
      canRetake,
      attemptsUsed,
      attemptsRemaining,
      maxAttempts,
      scheduleInfo
    });

    res.json({
      success: true,
      canTake: true,
      testDetails: {
        id: test._id,
        title: test.title,
        duration: test.duration,
        totalMarks: test.totalMarks,
        totalQuestions: test.questionCount || 0,
        allowRetakes: canRetake,
        maxAttempts,
        attemptsUsed,
        attemptsRemaining: maxAttempts ? attemptsRemaining : 'unlimited',
        isRetake: attemptsUsed > 0,
        nextAttemptNumber: attemptsUsed + 1
      },
      schedule: scheduleInfo.start ? {
        start: scheduleInfo.start,
        end: scheduleInfo.end,
        timeRemaining: Math.max(0, Math.ceil((scheduleInfo.end - now) / (1000 * 60))) // minutes
      } : null
    });

  } catch (error) {
    console.error('💥 Tests route - Error checking test availability:', {
      error: error.message,
      testId: req.params.id,
      userId: req.user?.id,
      stack: error.stack
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Server error checking test availability. Please try again.' 
    });
  }
});

// Debug endpoint for testing
router.post('/:id/debug', [auth, validateObjectId('id')], async (req, res) => {
  try {
    console.log('🔍 Debug endpoint called:', {
      testId: req.params.id,
      userId: req.user.id,
      body: req.body
    });
    
    res.json({
      success: true,
      message: 'Debug endpoint working',
      data: {
        testId: req.params.id,
        userId: req.user.id,
        answersCount: Object.keys(req.body.answers || {}).length,
        timeSpent: req.body.timeSpent || 0
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== OTHER ENDPOINTS ====================

// Delete a test
router.delete('/:testId', [auth, validateObjectId('testId')], async (req, res) => {
  try {
    console.log('🗑️ Tests route - Deleting test:', { 
      testId: req.params.testId, 
      user: req.user.username, 
      role: req.user.role 
    });

    const test = await Test.findById(req.params.testId);
    if (!test) {
      console.log('❌ Tests route - Test not found:', { testId: req.params.testId });
      return res.status(404).json({ 
        success: false,
        error: 'Test not found.' 
      });
    }

    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
    
    if (!isAdmin) {
      // Teacher can only delete their own draft tests
      if (test.createdBy.toString() !== req.user.id.toString()) {
        console.log('❌ Tests route - Not the creator:', { 
          creator: test.createdBy, 
          user: req.user.id 
        });
        return res.status(403).json({ 
          success: false,
          error: 'You can only delete tests you created.' 
        });
      }
      
      if (test.status !== 'draft') {
        console.log('❌ Tests route - Cannot delete non-draft test:', { 
          testId: req.params.testId, 
          status: test.status 
        });
        return res.status(403).json({ 
          success: false,
          error: 'Only draft tests can be deleted by non-admins.' 
        });
      }
    }

    await Test.deleteOne({ _id: req.params.testId });
    await Result.deleteMany({ testId: req.params.testId });
    
    console.log('✅ Tests route - Deleted test and results:', { testId: req.params.testId });
    
    res.json({ 
      success: true,
      message: 'Test and related results deleted successfully.' 
    });
  } catch (error) {
    console.error('💥 Tests route - Error deleting test:', {
      error: error.message,
      testId: req.params.testId,
      user: req.user.username,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false,
      error: 'Server error deleting test' 
    });
  }
});

// ==================== GET TEST RESULTS - UPDATED WITH TEACHER PERMISSIONS ====================

// Get test results - UPDATED TO WORK WITH TEACHER PERMISSIONS
router.get('/:testId/results', [auth, validateObjectId('testId')], async (req, res) => {
  try {
    console.log('📊 Tests route - Fetching results:', { 
      testId: req.params.testId, 
      user: req.user.username, 
      role: req.user.role 
    });

    const test = await Test.findById(req.params.testId)
      .populate('createdBy', 'username name')
      .populate('class', 'name');
    
    if (!test) {
      console.log('❌ Tests route - Test not found:', { testId: req.params.testId });
      return res.status(404).json({ 
        success: false,
        error: 'Test not found.' 
      });
    }

    // Access control
    if (req.user.role === 'student') {
      console.log('❌ Tests route - Students cannot view results:', { user: req.user.username });
      return res.status(403).json({ 
        success: false,
        error: 'Students cannot view test results.' 
      });
    }
    
    if (req.user.role === 'teacher') {
      // Check if teacher created the test OR is assigned to the subject/class
      const isCreator = test.createdBy._id.toString() === req.user.id.toString();
      
      if (!isCreator) {
        // Check if teacher is assigned to this subject/class
        const teacherSubjects = req.user.subjects || [];
        const testSubject = test.subject;
        const testClass = test.class?._id || test.class;
        
        const isAssigned = teacherSubjects.some(assignment => {
          const subjectMatch = assignment.subject === testSubject;
          
          let classMatch = false;
          if (assignment.class && assignment.class.toString() === testClass.toString()) {
            classMatch = true;
          } else if (assignment.className && assignment.className === testClass) {
            classMatch = true;
          } else if (assignment.classId && assignment.classId.toString() === testClass.toString()) {
            classMatch = true;
          }
          
          return subjectMatch && classMatch;
        });
        
        if (!isAssigned) {
          console.log('❌ Tests route - Teacher not authorized:', { 
            creator: test.createdBy._id, 
            user: req.user.id,
            teacherSubjects,
            testSubject,
            testClass
          });
          return res.status(403).json({ 
            success: false,
            error: 'You can only view results for tests you created or are assigned to teach.' 
          });
        }
      }
    }

    const results = await Result.find({ testId: req.params.testId })
      .populate('userId', 'username name studentId')
      .sort({ score: -1, submittedAt: -1 });

    console.log('✅ Tests route - Results fetched:', { 
      count: results.length, 
      testId: req.params.testId 
    });
    
    res.json({
      success: true,
      count: results.length,
      results: results
    });
  } catch (error) {
    console.error('💥 Tests route - Error fetching results:', {
      error: error.message,
      testId: req.params.testId,
      user: req.user.username,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false,
      error: 'Server error fetching results' 
    });
  }
});

// ==================== ADD QUESTIONS TO TEST ====================

// Add questions to a test
router.put('/:id/questions', [auth, validateObjectId('id')], async (req, res) => {
  try {
    const { questions, questionMarks } = req.body;
    
    console.log('📝 Tests route - Adding questions to test:', { 
      testId: req.params.id, 
      user: req.user.username,
      role: req.user.role,
      questionCount: questions?.length || 0
    });

    const test = await Test.findById(req.params.id);
    if (!test) {
      console.log('❌ Tests route - Test not found:', { id: req.params.id });
      return res.status(404).json({ 
        success: false,
        error: 'Test not found.' 
      });
    }

    // Check permissions
    if (req.user.role === 'student') {
      console.log('❌ Tests route - Students cannot add questions');
      return res.status(403).json({ 
        success: false,
        error: 'Students cannot add questions to tests.' 
      });
    }

    if (req.user.role === 'teacher') {
      // Teacher can only add to their own draft tests
      if (test.createdBy.toString() !== req.user.id.toString()) {
        console.log('❌ Tests route - Not the creator:', { 
          creator: test.createdBy, 
          user: req.user.id 
        });
        return res.status(403).json({ 
          success: false,
          error: 'You can only add questions to tests you created.' 
        });
      }
      
      if (test.status !== 'draft') {
        console.log('❌ Tests route - Cannot add to non-draft test:', { 
          testId: test._id, 
          status: test.status 
        });
        return res.status(403).json({ 
          success: false,
          error: 'Questions can only be added to draft tests.' 
        });
      }
    }

    // Validate questions array
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      console.log('❌ Tests route - Invalid questions array:', questions);
      return res.status(400).json({ 
        success: false,
        error: 'Questions must be a non-empty array.' 
      });
    }

    // Validate each question ID
    const validatedQuestions = [];
    for (const questionId of questions) {
      if (!mongoose.isValidObjectId(questionId)) {
        console.log('❌ Tests route - Invalid question ID:', questionId);
        return res.status(400).json({ 
          success: false,
          error: `Invalid question ID: ${questionId}` 
        });
      }

      // Check if question exists
      const question = await Question.findById(questionId);
      if (!question) {
        console.log('❌ Tests route - Question not found:', questionId);
        return res.status(404).json({ 
          success: false,
          error: `Question ${questionId} not found.` 
        });
      }

      // Check if question belongs to teacher (for teachers)
      if (req.user.role === 'teacher') {
        if (question.createdBy.toString() !== req.user.id.toString()) {
          console.log('❌ Tests route - Question not owned by teacher:', { 
            questionId, 
            creator: question.createdBy, 
            user: req.user.id 
          });
          return res.status(403).json({ 
            success: false,
            error: `You don't own question ${questionId}.` 
          });
        }
      }

      // Check if question matches test subject/class
      if (question.subject !== test.subject) {
        console.log('❌ Tests route - Question subject mismatch:', {
          questionSubject: question.subject,
          testSubject: test.subject
        });
        return res.status(400).json({ 
          success: false,
          error: `Question ${questionId} subject (${question.subject}) doesn't match test subject (${test.subject}).` 
        });
      }

      // Check class match
      const testClass = typeof test.class === 'object' ? test.class.toString() : test.class;
      const questionClass = typeof question.class === 'object' ? question.class.toString() : question.class;
      
      // Try to normalize class names
      let normalizedTestClass = testClass;
      let normalizedQuestionClass = questionClass;
      
      // If class is ObjectId, try to get class name
      if (mongoose.isValidObjectId(testClass)) {
        const testClassDoc = await Class.findById(testClass);
        if (testClassDoc) normalizedTestClass = testClassDoc.name;
      }
      
      if (mongoose.isValidObjectId(questionClass)) {
        const questionClassDoc = await Class.findById(questionClass);
        if (questionClassDoc) normalizedQuestionClass = questionClassDoc.name;
      }
      
      // Compare normalized class names
      if (normalizedQuestionClass !== normalizedTestClass) {
        console.log('❌ Tests route - Question class mismatch:', {
          questionClass: normalizedQuestionClass,
          testClass: normalizedTestClass
        });
        
        return res.status(400).json({ 
          success: false,
          error: `Question class (${normalizedQuestionClass}) doesn't match test class (${normalizedTestClass}).` 
        });
      }
      
      validatedQuestions.push(question);
    }

    // Validate questionMarks array
    if (!questionMarks || !Array.isArray(questionMarks)) {
      console.log('❌ Tests route - Invalid questionMarks:', questionMarks);
      return res.status(400).json({ 
        success: false,
        error: 'Question marks must be an array.' 
      });
    }

    if (questionMarks.length !== questions.length) {
      console.log('❌ Tests route - Marks count mismatch:', {
        questions: questions.length,
        marks: questionMarks.length
      });
      return res.status(400).json({ 
        success: false,
        error: `Number of marks (${questionMarks.length}) must match number of questions (${questions.length}).` 
      });
    }

    // Validate each mark value
    let totalMarks = 0;
    for (let i = 0; i < questionMarks.length; i++) {
      const mark = questionMarks[i];
      if (typeof mark !== 'number' || mark < 1 || mark > 10) {
        console.log('❌ Tests route - Invalid mark value:', {
          index: i,
          mark: mark,
          questionId: questions[i]
        });
        return res.status(400).json({ 
          success: false,
          error: `Mark for question ${i + 1} must be between 1 and 10.` 
        });
      }
      totalMarks += mark;
    }

    // Check total marks based on test type
    const isCA = test.title.toLowerCase().includes('ca');
    const requiredMarks = isCA ? 20 : 60;
    
    if (totalMarks !== requiredMarks) {
      console.log('❌ Tests route - Total marks mismatch:', {
        totalMarks,
        requiredMarks,
        testTitle: test.title,
        isCA
      });
      return res.status(400).json({ 
        success: false,
        error: `Total marks (${totalMarks}) must equal ${requiredMarks} for ${isCA ? 'CA' : 'Examination'}.` 
      });
    }

    // Update the test
    test.questions = questions;
    test.questionMarks = questionMarks;
    test.questionCount = questions.length;
    test.totalMarks = totalMarks;
    test.updatedAt = new Date();

    await test.save();

    console.log('✅ Tests route - Questions added successfully:', {
      testId: test._id,
      questionCount: test.questionCount,
      totalMarks: test.totalMarks,
      passingMarks: test.passingMarks,
      status: test.status
    });

    res.json({
      success: true,
      message: 'Questions added to test successfully',
      test: {
        _id: test._id,
        title: test.title,
        subject: test.subject,
        class: test.class,
        questionCount: test.questionCount,
        questions: test.questions,
        questionMarks: test.questionMarks,
        totalMarks: test.totalMarks,
        passingMarks: test.passingMarks,
        status: test.status
      }
    });

  } catch (error) {
    console.error('💥 Tests route - Error adding questions:', {
      error: error.message,
      testId: req.params.id,
      user: req.user.username,
      stack: error.stack
    });
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        error: `Validation failed: ${errors.join(', ')}` 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Server error adding questions' 
    });
  }
});

module.exports = router;
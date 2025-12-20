const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const User = require('../models/User');
const Test = require('../models/Test');
const Class = require('../models/Class');
const Session = require('../models/Session');
const { auth } = require('../middleware/auth');
const { checkPermission, teacherOnly } = require('../middleware/permissions');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const mongoose = require('mongoose');

// Input validation middleware
const validateResultParams = (req, res, next) => {
  const { testId, studentId, session, term } = req.params;
 
  if (testId && !mongoose.Types.ObjectId.isValid(testId)) {
    return res.status(400).json({ error: 'Invalid test ID format' });
  }
 
  if (studentId && !mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({ error: 'Invalid student ID format' });
  }
 
  if (session && !session.match(/^\d{4}\/\d{4} (First|Second|Third) Term$/)) {
    return res.status(400).json({ error: 'Invalid session format' });
  }
 
  if (term && !['First Term', 'Second Term', 'Third Term'].includes(term)) {
    return res.status(400).json({ error: 'Invalid term' });
  }
 
  next();
};

// Helper function to convert class name to ObjectId if needed
const getClassForQuery = async (className) => {
  if (!className) return null;
  
  if (mongoose.Types.ObjectId.isValid(className)) {
    return className; // Already an ObjectId
  }
  
  // Try to find class by name
  const classDoc = await Class.findOne({
    $or: [
      { name: className },
      { shortName: className },
      { level: className }
    ]
  }).select('_id');
  
  return classDoc ? classDoc._id : className; // Return ObjectId if found, otherwise string
};

// Helper function to check if teacher has access to test results - COMPLETELY FIXED VERSION
const checkTeacherTestAccess = async (teacher, testId) => {
  try {
    console.log('🔍 Checking teacher test access:', {
      teacherId: teacher?._id || teacher?.id,
      username: teacher?.username,
      testId
    });

    if (!teacher) {
      console.log('❌ Teacher object is undefined');
      return false;
    }

    // Get the test
    const test = await Test.findById(testId)
      .populate('createdBy', 'username name _id')
      .populate('class', 'name _id');
    
    if (!test) {
      console.log('❌ Test not found');
      return false;
    }

    const teacherSubjects = teacher.subjects || [];
    const testSubject = test.subject;
    
    // Get test class information SAFELY
    let testClass = test.class;
    let testClassId = null;
    let testClassName = null;
    
    if (testClass) {
      if (testClass._id) {
        // Populated class object
        testClassId = testClass._id.toString();
        testClassName = testClass.name;
      } else if (mongoose.Types.ObjectId.isValid(testClass)) {
        // String/ObjectId
        testClassId = testClass.toString();
        // Get class name from database
        try {
          const classDoc = await Class.findById(testClass).select('name').lean();
          testClassName = classDoc?.name;
        } catch (err) {
          console.log('⚠️ Could not fetch class name:', err.message);
        }
      } else if (typeof testClass === 'string') {
        // String class name
        testClassId = testClass;
        testClassName = testClass;
      }
    }
    
    // Check if teacher created the test
    let isCreator = false;
    if (test.createdBy && test.createdBy._id && teacher._id) {
      isCreator = test.createdBy._id.toString() === teacher._id.toString();
    }

    console.log('📊 Access check details:', {
      testSubject,
      testClass,
      testClassId,
      testClassName,
      isCreator,
      teacherSubjectsCount: teacherSubjects.length,
      teacherUsername: teacher.username,
      testCreator: test.createdBy?.username,
      testCreatorId: test.createdBy?._id,
      teacherId: teacher._id
    });

    // If teacher created the test, grant access
    if (isCreator) {
      console.log('✅ Teacher created this test, granting access');
      return true;
    }

    // If no teacher subjects, deny access
    if (teacherSubjects.length === 0) {
      console.log('❌ Teacher has no subjects assigned');
      return false;
    }

    // Check if teacher is assigned to this test's subject/class
    const hasAccess = teacherSubjects.some(assignment => {
      const subjectMatch = assignment.subject === testSubject;
      
      // If no test class, only check subject
      if (!testClassId) {
        console.log('⚠️ No test class found, only checking subject');
        return subjectMatch;
      }
      
      let classMatch = false;
      
      // Check assignment.class
      if (assignment.class) {
        try {
          const assignmentClass = assignment.class.toString();
          
          // Direct comparison
          if (assignmentClass === testClassId) {
            classMatch = true;
          }
          // Compare with class name
          else if (testClassName && assignmentClass === testClassName) {
            classMatch = true;
          }
          // If assignment.class is ObjectId and testClass is string ObjectId
          else if (mongoose.Types.ObjectId.isValid(assignmentClass) && typeof testClassId === 'string') {
            if (assignmentClass === testClassId) {
              classMatch = true;
            }
          }
        } catch (err) {
          console.log('⚠️ Error checking assignment.class:', err.message);
        }
      }
      
      // Check assignment.className
      if (!classMatch && assignment.className) {
        try {
          if (assignment.className === testClassId) {
            classMatch = true;
          }
          else if (testClassName && assignment.className === testClassName) {
            classMatch = true;
          }
        } catch (err) {
          console.log('⚠️ Error checking assignment.className:', err.message);
        }
      }
      
      // Check assignment.classId
      if (!classMatch && assignment.classId) {
        try {
          const classIdStr = assignment.classId.toString();
          if (classIdStr === testClassId) {
            classMatch = true;
          }
        } catch (err) {
          console.log('⚠️ Error checking assignment.classId:', err.message);
        }
      }
      
      console.log('📊 Assignment check result:', {
        assignmentSubject: assignment.subject,
        testSubject,
        subjectMatch,
        classMatch,
        finalMatch: subjectMatch && (classMatch || !testClassId)
      });
      
      return subjectMatch && (classMatch || !testClassId);
    });

    console.log('✅ Teacher access final result:', hasAccess);
    return hasAccess;
  } catch (error) {
    console.error('❌ Error in checkTeacherTestAccess:', {
      message: error.message,
      stack: error.stack,
      teacherId: teacher?._id,
      testId
    });
    return false;
  }
};

// ==================== TEACHER-SPECIFIC ROUTES ====================

// Get teacher's own results (for their classes only) - FIXED VERSION
router.get('/teacher', auth, teacherOnly, async (req, res) => {
  try {
    console.log('📊 Teacher results request:', {
      teacherId: req.user.id,
      username: req.user.username,
      subjects: req.user.subjects
    });

    const {
      page = 1,
      limit = 10,
      subject,
      class: className,
      session: sessionName,
      term,
      studentId,
      testId
    } = req.query;

    const skip = (page - 1) * limit;

    // Build query based on teacher's subjects
    let query = { isActive: true };

    // Teacher can only see results for their assigned subjects/classes
    const teacherSubjects = req.user.subjects || [];
    if (teacherSubjects.length === 0) {
      return res.json({
        success: true,
        results: [],
        message: 'No subjects assigned to teacher'
      });
    }

    // Create OR conditions for all teacher's subjects
    const subjectConditions = [];
    
    for (const sub of teacherSubjects) {
      const condition = {
        subject: sub.subject
      };
      
      // Handle class in different formats - SAFELY
      try {
        if (sub.class) {
          if (mongoose.Types.ObjectId.isValid(sub.class)) {
            condition.class = sub.class;
          } else if (typeof sub.class === 'string') {
            condition.class = sub.class;
          }
        } else if (sub.className) {
          condition.class = sub.className;
        } else if (sub.classId) {
          condition.class = sub.classId;
        }
      } catch (err) {
        console.log('⚠️ Error processing subject condition:', err.message);
      }
      
      subjectConditions.push(condition);
    }

    if (subjectConditions.length > 0) {
      query.$or = subjectConditions;
    }

    // Apply additional filters
    if (subject) {
      const hasSubject = teacherSubjects.some(subj => subj.subject === subject);
      if (!hasSubject) {
        return res.status(403).json({
          success: false,
          error: 'Not assigned to this subject'
        });
      }
      query.subject = subject;
    }

    if (className) {
      const hasClass = teacherSubjects.some(subj => 
        subj.class === className || subj.className === className
      );
      if (!hasClass) {
        return res.status(403).json({
          success: false,
          error: 'Not assigned to this class'
        });
      }
      
      // Convert class name to ObjectId if possible
      const classForQuery = await getClassForQuery(className);
      if (classForQuery) {
        query.class = classForQuery;
      }
    }

    if (sessionName) query.session = sessionName;
    if (term) query.term = term;
    if (studentId) query.userId = studentId;
    if (testId) query.testId = testId;

    console.log('🔍 Teacher results query:', JSON.stringify(query, null, 2));

    let results, total;
    try {
      [results, total] = await Promise.all([
        Result.find(query)
          .populate('userId', 'name surname studentId')
          .populate('testId', 'title subject class totalMarks type')
          .populate({
            path: 'class',
            select: 'name level stream'
          })
          .sort({ submittedAt: -1 })
          .skip(parseInt(skip))
          .limit(parseInt(limit))
          .lean(),
        Result.countDocuments(query)
      ]);
    } catch (queryError) {
      if (queryError.name === 'CastError' && queryError.path === 'class') {
        console.log('⚠️ CastError occurred, trying to fix query...');
        // Try without class filter in $or conditions
        if (query.$or) {
          const fixedConditions = query.$or.map(condition => {
            // Remove class field if it causes issues
            const { class: classField, ...rest } = condition;
            return rest;
          }).filter(condition => Object.keys(condition).length > 0);
          
          if (fixedConditions.length > 0) {
            query.$or = fixedConditions;
          } else {
            delete query.$or;
          }
        }
        
        // Retry query
        [results, total] = await Promise.all([
          Result.find(query)
            .populate('userId', 'name surname studentId')
            .populate('testId', 'title subject class totalMarks type')
            .populate({
              path: 'class',
              select: 'name level stream'
            })
            .sort({ submittedAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .lean(),
          Result.countDocuments(query)
        ]);
      } else {
        throw queryError;
      }
    }

    // Filter out results where class doesn't match teacher's assignments
    const filteredResults = results.filter(result => {
      try {
        const resultClass = result.class?._id?.toString() || result.class?.toString() || result.class;
        const resultClassName = result.class?.name || result.class;
        
        return teacherSubjects.some(sub => {
          const subjectMatch = sub.subject === result.subject;
          
          let classMatch = false;
          
          // Compare class IDs
          if (sub.class) {
            if (mongoose.Types.ObjectId.isValid(sub.class)) {
              classMatch = sub.class.toString() === resultClass;
            } else if (typeof sub.class === 'string') {
              classMatch = sub.class === resultClassName || sub.class === resultClass;
            }
          }
          
          // Compare class name from className field
          if (!classMatch && sub.className) {
            classMatch = sub.className === resultClassName || sub.className === resultClass;
          }
          
          // Compare classId field
          if (!classMatch && sub.classId) {
            const classIdStr = sub.classId.toString();
            classMatch = classIdStr === resultClass || classIdStr === resultClassName;
          }
          
          return subjectMatch && classMatch;
        });
      } catch (err) {
        console.log('⚠️ Error filtering result:', err.message);
        return false;
      }
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      results: filteredResults,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalResults: filteredResults.length,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('❌ Teacher results error:', error);
    
    // Handle CastError specifically
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format in query. Please check your filter values.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error fetching teacher results',
      details: error.message
    });
  }
});

// ==================== MAIN RESULTS ROUTE FOR TestResults.js ====================

// Get results for specific test - COMPLETELY FIXED VERSION
router.get('/test/:testId', auth, async (req, res) => {
  const { testId } = req.params;
  
  try {
    const { includeAnalysis = false } = req.query;

    console.log('GET /api/results/test/:testId - Request:', {
      testId,
      user: req.user.username,
      role: req.user.role
    });

    // Verify test exists with proper population
    const test = await Test.findById(testId)
      .populate('createdBy', 'username name _id')
      .populate('class', 'name _id');
    
    if (!test) {
      return res.status(404).json({ 
        success: false,
        error: 'Test not found' 
      });
    }

    console.log('🔍 Test found with details:', {
      testId: test._id,
      title: test.title,
      subject: test.subject,
      class: test.class,
      classType: typeof test.class,
      classId: test.class?._id || test.class,
      createdBy: test.createdBy,
      createdById: test.createdBy?._id,
      createdByUsername: test.createdBy?.username
    });

    // Authorization checks
    if (req.user.role === 'teacher') {
      // Check if teacher has access to this test
      const hasAccess = await checkTeacherTestAccess(req.user, testId);
      
      if (!hasAccess) {
        console.log('❌ Teacher does not have access to this test');
        return res.status(403).json({ 
          success: false,
          error: 'You are not assigned to this test\'s subject/class.' 
        });
      }
    } else if (req.user.role === 'student') {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied. Students cannot view test results.' 
      });
    }

    // Build query - handle both ObjectId and string class values
    const query = { 
      testId, 
      isActive: true,
      subject: test.subject
    };

    // Add class condition - handle all possible formats
    const testClass = test.class;
    
    if (testClass) {
      if (testClass._id) {
        // Populated class object
        query.class = testClass._id;
      } else if (mongoose.Types.ObjectId.isValid(testClass)) {
        // String/ObjectId
        query.class = testClass;
      } else if (typeof testClass === 'string') {
        // String class name, try to convert to ObjectId
        const classForQuery = await getClassForQuery(testClass);
        if (classForQuery) {
          query.class = classForQuery;
        } else {
          query.class = testClass;
        }
      }
    } else {
      // If class is undefined or null, find results without class filter
      console.warn('⚠️ Class is undefined or null in test:', testId);
      delete query.class;
    }

    console.log('🔍 Final query for results:', query);

    // Try to find results - with error handling
    let results;
    try {
      results = await Result.find(query)
        .populate('userId', 'name surname username studentId')
        .populate({
          path: 'class',
          select: 'name level'
        })
        .sort({ score: -1, submittedAt: -1 });
    } catch (findError) {
      console.error('❌ Error finding results:', findError);
      if (findError.name === 'CastError' && findError.path === 'class') {
        console.log('⚠️ CastError occurred, trying alternative query...');
        // Try without class filter
        delete query.class;
        results = await Result.find(query)
          .populate('userId', 'name surname username studentId')
          .populate({
            path: 'class',
            select: 'name level'
          })
          .sort({ score: -1, submittedAt: -1 });
      } else {
        throw findError;
      }
    }

    console.log('✅ Found results:', results.length);

    // Add analysis if requested
    let enhancedResults = results;
    if (includeAnalysis === 'true') {
      enhancedResults = results.map(result => ({
        ...result,
        analysis: {
          correctAnswers: Array.from(result.correctness?.values() || []).filter(Boolean).length,
          totalQuestions: result.totalQuestions,
          accuracy: result.totalQuestions > 0 ?
            (Array.from(result.correctness?.values() || []).filter(Boolean).length / result.totalQuestions * 100).toFixed(2) : 0,
          percentage: result.percentage,
          grade: result.grade
        }
      }));
    }

    // Calculate test statistics
    const statistics = {
      totalStudents: results.length,
      averageScore: results.length > 0 ?
        (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(2) : 0,
      highestScore: results.length > 0 ? Math.max(...results.map(r => r.score)) : 0,
      lowestScore: results.length > 0 ? Math.min(...results.map(r => r.score)) : 0,
      passRate: results.length > 0 ?
        (results.filter(r => r.score >= (test.passingMarks || test.totalMarks * 0.5)).length / results.length * 100).toFixed(2) : 0
    };

    res.json({
      success: true,
      test: {
        id: test._id,
        title: test.title,
        subject: test.subject,
        class: test.class,
        totalMarks: test.totalMarks,
        passingMarks: test.passingMarks,
        createdBy: test.createdBy
      },
      results: enhancedResults,
      statistics
    });
  } catch (error) {
    console.error('GET /api/results/test/:testId - Error:', {
      message: error.message,
      testId,
      stack: error.stack
    });
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        error: 'Data format error. Please contact administrator.' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Server error fetching test results' 
    });
  }
});

// ==================== ADMIN ROUTES ====================

// Get all results with advanced filtering and pagination - ADMIN ONLY
router.get('/', auth, checkPermission('view_results'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      subject,
      class: className,
      session: sessionName,
      term,
      studentId,
      testId,
      sortBy = 'submittedAt',
      sortOrder = 'desc'
    } = req.query;
   
    const skip = (page - 1) * limit;
   
    // Build query
    let query = { isActive: true };

    // Apply filters
    if (subject) query.subject = subject;
    
    if (className) {
      // Handle both ObjectId and string class values
      const classForQuery = await getClassForQuery(className);
      if (classForQuery) {
        query.class = classForQuery;
      } else {
        query.class = className;
      }
    }
    
    if (sessionName) query.session = sessionName;
    if (term) query.term = term;
    if (studentId) query.userId = studentId;
    if (testId) query.testId = testId;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    let results, total;
    try {
      [results, total] = await Promise.all([
        Result.find(query)
          .populate('userId', 'name surname studentId')
          .populate('testId', 'title subject class totalMarks type')
          .populate('class', 'name level')
          .sort(sort)
          .skip(parseInt(skip))
          .limit(parseInt(limit))
          .lean(),
        Result.countDocuments(query)
      ]);
    } catch (queryError) {
      if (queryError.name === 'CastError' && queryError.path === 'class') {
        console.log('⚠️ CastError occurred, trying without class filter...');
        delete query.class;
        [results, total] = await Promise.all([
          Result.find(query)
            .populate('userId', 'name surname studentId')
            .populate('testId', 'title subject class totalMarks type')
            .populate('class', 'name level')
            .sort(sort)
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .lean(),
          Result.countDocuments(query)
        ]);
      } else {
        throw queryError;
      }
    }

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      results,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalResults: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Admin results error:', error);
    
    // Handle CastError specifically
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format in query. Please check your filter values.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error fetching results'
    });
  }
});

// Get detailed result analysis
router.get('/details/:resultId', auth, async (req, res) => {
  const { resultId } = req.params;
  
  try {
    if (!mongoose.Types.ObjectId.isValid(resultId)) {
      return res.status(400).json({ error: 'Invalid result ID format' });
    }

    const result = await Result.findById(resultId)
      .populate('userId', 'name surname studentId email')
      .populate('testId', 'title subject class totalMarks questions passingMarks')
      .populate('class', 'name level')
      .populate('reviewedBy', 'name surname');

    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    // Authorization check
    if (req.user.role === 'teacher') {
      const hasAccess = await checkTeacherTestAccess(req.user, result.testId._id);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Not assigned to this subject/class' });
      }
    } else if (req.user.role === 'student') {
      return res.status(403).json({ 
        error: 'Access denied. Students cannot view detailed results.' 
      });
    }

    // Convert Map to Object for response
    const answers = result.answers instanceof Map ?
      Object.fromEntries(result.answers) : result.answers || {};
   
    const correctness = result.correctness instanceof Map ?
      Object.fromEntries(result.correctness) : result.correctness || {};

    // Detailed question analysis
    const questionAnalysis = result.testId?.questions?.map((question, index) => {
      const questionId = question._id?.toString() || index.toString();
      const selectedAnswer = answers[questionId];
      const isCorrect = correctness[questionId];
     
      return {
        questionNumber: index + 1,
        questionText: question.text,
        options: question.options,
        correctAnswer: question.correctAnswer,
        selectedAnswer: selectedAnswer || 'Not answered',
        isCorrect: isCorrect || false,
        marks: isCorrect ? question.marks || 1 : 0
      };
    }) || [];

    const analysis = result.getAnalysis();

    res.json({
      result: {
        id: result._id,
        student: result.userId,
        test: result.testId,
        class: result.class,
        session: result.session,
        term: result.term,
        score: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        grade: result.grade,
        position: result.position,
        submittedAt: result.submittedAt,
        timeSpent: result.timeSpent,
        reviewedBy: result.reviewedBy,
        reviewedAt: result.reviewedAt,
        remarks: result.remarks
      },
      analysis,
      questionAnalysis,
      summary: {
        totalQuestions: result.totalQuestions,
        correctAnswers: analysis.correctAnswers,
        incorrectAnswers: analysis.incorrectAnswers,
        accuracy: analysis.accuracy,
        timePerQuestion: result.timeSpent && result.totalQuestions ?
          (result.timeSpent / result.totalQuestions).toFixed(2) : null
      }
    });
  } catch (error) {
    console.error('GET /api/results/details/:resultId - Error:', {
      message: error.message,
      resultId
    });
    res.status(500).json({ error: 'Server error fetching result details' });
  }
});

// Update result score - ADMIN ONLY
router.put('/:resultId', auth, checkPermission('manage_results'), async (req, res) => {
  const { resultId } = req.params;
  const session = await mongoose.startSession();
  
  session.startTransaction();
  try {
    // ONLY ADMINS CAN UPDATE RESULTS
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ 
        error: 'Access denied. Only administrators can update results.' 
      });
    }

    const { score, remarks } = req.body;

    if (!mongoose.Types.ObjectId.isValid(resultId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Invalid result ID format' });
    }

    if (score === undefined || isNaN(score) || score < 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Score must be a non-negative number' });
    }

    const result = await Result.findById(resultId)
      .populate('testId', 'totalMarks')
      .session(session);

    if (!result) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Result not found' });
    }

    // Validate score against test total marks
    if (score > result.testId.totalMarks) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        error: `Score cannot exceed test total marks (${result.testId.totalMarks})`
      });
    }

    // Update result
    result.score = score;
    if (remarks !== undefined) result.remarks = remarks;
    result.reviewedBy = req.user.id;
    result.reviewedAt = new Date();

    await result.save({ session });
    await session.commitTransaction();
    session.endSession();

    console.log('PUT /api/results/:resultId - Updated:', {
      resultId,
      score,
      reviewedBy: req.user.username
    });

    res.json({
      success: true,
      message: 'Result updated successfully',
      result: {
        id: result._id,
        score: result.score,
        percentage: result.percentage,
        grade: result.grade,
        reviewedBy: result.reviewedBy,
        reviewedAt: result.reviewedAt,
        remarks: result.remarks
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
   
    console.error('PUT /api/results/:resultId - Error:', {
      message: error.message,
      resultId
    });
   
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
   
    res.status(500).json({ 
      success: false,
      error: 'Server error updating result' 
    });
  }
});

// Delete result (admin only)
router.delete('/:resultId', auth, checkPermission('manage_results'), async (req, res) => {
  const { resultId } = req.params;
  const session = await mongoose.startSession();
  
  session.startTransaction();
  try {
    if (!mongoose.Types.ObjectId.isValid(resultId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Invalid result ID format' });
    }

    // Only admins can delete results
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await Result.findById(resultId).session(session);
    if (!result) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Result not found' });
    }

    // Soft delete by setting isActive to false
    result.isActive = false;
    await result.save({ session });

    await session.commitTransaction();
    session.endSession();

    console.log('DELETE /api/results/:resultId - Soft deleted:', {
      resultId,
      deletedBy: req.user.username
    });

    res.json({
      success: true,
      message: 'Result deleted successfully',
      deletedResult: {
        id: result._id,
        student: result.userId,
        test: result.testId,
        score: result.score
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
   
    console.error('DELETE /api/results/:resultId - Error:', {
      message: error.message,
      resultId
    });
    res.status(500).json({ 
      success: false,
      error: 'Server error deleting result' 
    });
  }
});

// Get student performance overview
router.get('/student/:studentId/performance', auth, validateResultParams, async (req, res) => {
  const { studentId } = req.params;
  
  try {
    const { session: sessionName, term } = req.query;

    // Authorization check - STUDENTS CAN ONLY VIEW THEIR OWN PERFORMANCE
    if (req.user.role === 'student') {
      if (!req.user._id.equals(studentId)) {
        return res.status(403).json({ 
          error: 'Access denied. Students can only view their own performance.' 
        });
      }
    }

    if (req.user.role === 'teacher') {
      // Teachers can only view students in their assigned classes
      const student = await User.findById(studentId).select('class');
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
     
      const teacherSubjects = req.user.subjects || [];
      const hasAccess = teacherSubjects.some(sub => {
        const studentClass = student.class?.toString() || student.class;
        
        if (sub.class) {
          if (mongoose.Types.ObjectId.isValid(sub.class)) {
            return sub.class.toString() === studentClass;
          } else {
            return sub.class === studentClass;
          }
        }
        
        if (sub.className) {
          return sub.className === studentClass;
        }
        
        if (sub.classId) {
          const classIdStr = sub.classId.toString();
          return classIdStr === studentClass;
        }
        
        return false;
      });
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Not authorized to view this student\'s performance' });
      }
    }

    const query = { userId: studentId, isActive: true };
    if (sessionName) query.session = sessionName;
    if (term) query.term = term;

    const results = await Result.find(query)
      .populate('testId', 'title type subject totalMarks')
      .populate('class', 'name level')
      .sort({ submittedAt: -1 });

    if (results.length === 0) {
      return res.status(404).json({ error: 'No results found for the specified criteria' });
    }

    // Calculate performance metrics
    const performance = {
      totalTests: results.length,
      averageScore: (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(2),
      averagePercentage: (results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length).toFixed(2),
      bestScore: Math.max(...results.map(r => r.score)),
      worstScore: Math.min(...results.map(r => r.score)),
      subjects: {},
      testTypes: {}
    };

    // Group by subject
    results.forEach(result => {
      const subject = result.subject;
      if (!performance.subjects[subject]) {
        performance.subjects[subject] = {
          totalTests: 0,
          averageScore: 0,
          totalScore: 0
        };
      }
      performance.subjects[subject].totalTests++;
      performance.subjects[subject].totalScore += result.score;
    });

    // Calculate subject averages
    Object.keys(performance.subjects).forEach(subject => {
      performance.subjects[subject].averageScore =
        (performance.subjects[subject].totalScore / performance.subjects[subject].totalTests).toFixed(2);
    });

    // Get student details
    const student = await User.findById(studentId).select('name surname studentId class');

    res.json({
      student,
      performance,
      results: results.slice(0, 10),
      period: {
        session: sessionName || 'all',
        term: term || 'all'
      }
    });
  } catch (error) {
    console.error('GET /api/results/student/:studentId/performance - Error:', {
      message: error.message,
      studentId
    });
    res.status(500).json({ error: 'Server error fetching student performance' });
  }
});

// ==================== REPORT CARD GENERATION ENDPOINTS ====================

// Generate report card PDF for student by term - FIXED VERSION
router.get('/export/report/:studentId/:session/:term', auth, async (req, res) => {
  try {
    const { studentId, session, term } = req.params;
    
    console.log('📊 Report card request:', {
      studentId,
      session,
      term,
      user: req.user.username,
      role: req.user.role
    });

    // Validate session format
    const sessionRegex = /^\d{4}\/\d{4} (First|Second|Third) Term$/;
    if (!sessionRegex.test(session)) {
      return res.status(400).json({ 
        error: 'Session must be in format: "YYYY/YYYY First/Second/Third Term"' 
      });
    }

    // Extract year and term from session
    const [yearPart, termPart] = session.split(' ');
    const termName = term || termPart || 'First Term';

    // Validate student ID
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ error: 'Invalid student ID format' });
    }

    // Check permissions
    if (req.user.role === 'student') {
      if (req.user._id.toString() !== studentId) {
        return res.status(403).json({ 
          error: 'Students can only view their own report cards' 
        });
      }
    }

    // Get student details
    const student = await User.findById(studentId)
      .populate('class', 'name level')
      .populate('enrolledSubjects.subject', 'name')
      .populate('enrolledSubjects.class', 'name');

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get student's class
    const studentClass = student.class;
    if (!studentClass) {
      return res.status(400).json({ error: 'Student is not assigned to any class' });
    }

    // Get all results for the student for the specific session and term
    const query = {
      userId: studentId,
      session: session, // Use full session format
      term: termName,
      isActive: true
    };

    console.log('🔍 Query for results:', query);

    const results = await Result.find(query)
      .populate('testId', 'title type subject totalMarks')
      .populate('class', 'name')
      .sort({ subject: 1, submittedAt: -1 });

    if (results.length === 0) {
      console.log('❌ No results found for query:', query);
      return res.status(404).json({ 
        error: `No results found for ${session} - ${termName}` 
      });
    }

    console.log('✅ Found results:', results.length);

    // Group results by subject
    const subjectResults = {};
    results.forEach(result => {
      const subject = result.subject;
      if (!subjectResults[subject]) {
        subjectResults[subject] = [];
      }
      subjectResults[subject].push(result);
    });

    // Calculate subject averages
    const subjectAverages = {};
    Object.keys(subjectResults).forEach(subject => {
      const subjectRes = subjectResults[subject];
      const totalScore = subjectRes.reduce((sum, r) => sum + r.score, 0);
      const totalMarks = subjectRes.reduce((sum, r) => sum + r.totalMarks, 0);
      const averageScore = totalScore / subjectRes.length;
      const averagePercentage = totalMarks > 0 ? (totalScore / totalMarks) * 100 : 0;
      
      subjectAverages[subject] = {
        averageScore: averageScore.toFixed(2),
        averagePercentage: averagePercentage.toFixed(2),
        totalTests: subjectRes.length,
        latestGrade: subjectRes[0].grade || 'N/A'
      };
    });

    // Calculate overall statistics
    const overallStats = {
      totalSubjects: Object.keys(subjectResults).length,
      totalTests: results.length,
      averageScore: (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(2),
      averagePercentage: (results.reduce((sum, r) => sum + r.percentage, 0) / results.length).toFixed(2),
      bestSubject: Object.keys(subjectAverages).reduce((best, subject) => 
        parseFloat(subjectAverages[subject].averagePercentage) > parseFloat(subjectAverages[best]?.averagePercentage || 0) 
          ? subject 
          : best, Object.keys(subjectAverages)[0] || 'N/A'),
      worstSubject: Object.keys(subjectAverages).reduce((worst, subject) => 
        parseFloat(subjectAverages[subject].averagePercentage) < parseFloat(subjectAverages[worst]?.averagePercentage || 100) 
          ? subject 
          : worst, Object.keys(subjectAverages)[0] || 'N/A')
    };

    // Generate PDF
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      info: {
        Title: `Report Card - ${student.name} ${student.surname}`,
        Author: 'School Management System',
        Subject: 'Academic Report Card'
      }
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report_${student.username}_${session.replace(/\//g, '_')}_${termName.replace(/\s/g, '_')}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Header
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor('#4B5320') // Brand color
       .text('ACADEMIC REPORT CARD', { align: 'center' });

    doc.moveDown(0.5);

    // School Info
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#000000')
       .text('SCHOOL MANAGEMENT SYSTEM', { align: 'center' });

    doc.fontSize(10)
       .text('123 Education Street, Academic City, 100001', { align: 'center' });

    doc.moveDown(1);

    // Student Information Table
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('STUDENT INFORMATION', { underline: true });

    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.font('Helvetica');

    const studentInfo = [
      ['Student Name:', `${student.name} ${student.surname}`],
      ['Student ID:', student.studentId || student.username],
      ['Class:', studentClass.name],
      ['Session:', session],
      ['Term:', termName],
      ['Date Generated:', new Date().toLocaleDateString('en-GB')]
    ];

    let studentInfoY = doc.y;
    studentInfo.forEach(([label, value], i) => {
      doc.text(label, 50, studentInfoY + (i * 20));
      doc.text(value, 200, studentInfoY + (i * 20));
    });

    doc.moveDown(2);

    // Academic Performance Section
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('ACADEMIC PERFORMANCE', { underline: true });

    doc.moveDown(0.5);

    // Table headers
    const tableTop = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('SUBJECT', 50, tableTop);
    doc.text('AVG SCORE', 200, tableTop);
    doc.text('AVG %', 280, tableTop);
    doc.text('GRADE', 350, tableTop);
    doc.text('TESTS', 400, tableTop);

    // Table rows
    doc.font('Helvetica');
    let currentY = tableTop + 20;

    Object.keys(subjectResults).forEach((subject, index) => {
      const avg = subjectAverages[subject];
      
      // Alternate row colors
      if (index % 2 === 0) {
        doc.rect(45, currentY - 5, 410, 20).fill('#F8F9FA');
      }

      doc.fillColor('#000000');
      doc.text(subject, 50, currentY, { width: 140 });
      doc.text(avg.averageScore, 200, currentY);
      doc.text(`${avg.averagePercentage}%`, 280, currentY);
      doc.text(avg.latestGrade, 350, currentY);
      doc.text(avg.totalTests.toString(), 400, currentY);

      currentY += 20;
    });

    doc.moveDown(1);

    // Overall Statistics
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#4B5320')
       .text('OVERALL STATISTICS', { underline: true });

    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#000000');

    const stats = [
      ['Total Subjects:', overallStats.totalSubjects],
      ['Total Tests Taken:', overallStats.totalTests],
      ['Average Score:', overallStats.averageScore],
      ['Average Percentage:', `${overallStats.averagePercentage}%`],
      ['Best Performing Subject:', overallStats.bestSubject],
      ['Needs Improvement:', overallStats.worstSubject]
    ];

    let statsY = doc.y;
    stats.forEach(([label, value], i) => {
      doc.text(label, 50, statsY + (i * 20));
      doc.text(value.toString(), 250, statsY + (i * 20));
    });

    doc.moveDown(2);

    // Performance Summary
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#4B5320')
       .text('PERFORMANCE SUMMARY', { underline: true });

    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#000000');

    const avgPercentage = parseFloat(overallStats.averagePercentage);
    let summary = '';
    if (avgPercentage >= 75) {
      summary = 'EXCELLENT: Student is performing exceptionally well across all subjects.';
    } else if (avgPercentage >= 60) {
      summary = 'GOOD: Student shows good understanding of the subjects.';
    } else if (avgPercentage >= 50) {
      summary = 'SATISFACTORY: Student meets the minimum requirements.';
    } else {
      summary = 'NEEDS IMPROVEMENT: Student requires additional support and practice.';
    }

    doc.text(summary, { width: 450, align: 'justify' });

    doc.moveDown(1);

    // Teacher Comments
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#4B5320')
       .text('TEACHER COMMENTS', { underline: true });

    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#000000');
    doc.text('This report reflects the student\'s academic performance for the term. Parents/Guardians are encouraged to discuss this report with the student and provide necessary support for improvement.', { width: 450, align: 'justify' });

    doc.moveDown(2);

    // Signatures Section
    const signatureY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    
    // Class Teacher
    doc.text('Class Teacher:', 50, signatureY);
    doc.font('Helvetica');
    doc.text('________________________', 50, signatureY + 20);
    doc.text('Signature/Stamp', 50, signatureY + 40);

    // Principal
    doc.font('Helvetica-Bold');
    doc.text('Principal:', 300, signatureY);
    doc.font('Helvetica');
    doc.text('________________________', 300, signatureY + 20);
    doc.text('Signature/Stamp', 300, signatureY + 40);

    // Footer
    doc.moveDown(4);
    doc.fontSize(8)
       .font('Helvetica-Oblique')
       .fillColor('#666666')
       .text('Generated by School Management System • This is an official document', { align: 'center' });

    // Finalize PDF
    doc.end();

    console.log('✅ Report card generated successfully:', {
      student: student.username,
      session,
      term: termName,
      subjects: Object.keys(subjectResults).length,
      results: results.length
    });

  } catch (error) {
    console.error('❌ Report card generation error:', {
      message: error.message,
      stack: error.stack,
      params: req.params,
      user: req.user?.username
    });
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to generate report card',
        details: error.message 
      });
    }
  }
});

// Generate report card for entire class by term
router.get('/export/report/class/:classId/:session/:term', auth, async (req, res) => {
  try {
    const { classId, session, term } = req.params;
    
    console.log('📊 Class report cards request:', {
      classId,
      session,
      term,
      user: req.user.username,
      role: req.user.role
    });

    // Only admins and teachers can generate class reports
    if (!['admin', 'super_admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Only administrators and teachers can generate class reports' 
      });
    }

    // If teacher, check if assigned to this class
    if (req.user.role === 'teacher') {
      const teacherSubjects = req.user.subjects || [];
      const isAssigned = teacherSubjects.some(subject => {
        const subjectClass = subject.classId || subject.class || subject.className;
        return subjectClass && subjectClass.toString() === classId;
      });
      
      if (!isAssigned) {
        return res.status(403).json({ 
          error: 'You are not assigned to this class' 
        });
      }
    }

    // Validate session format
    const sessionRegex = /^\d{4}\/\d{4} (First|Second|Third) Term$/;
    if (!sessionRegex.test(session)) {
      return res.status(400).json({ 
        error: 'Session must be in format: "YYYY/YYYY First/Second/Third Term"' 
      });
    }

    // Get class details
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Get all students in the class
    const students = await User.find({ 
      class: classId,
      role: 'student',
      isActive: true
    }).select('_id name surname studentId username');

    if (students.length === 0) {
      return res.status(404).json({ error: 'No students found in this class' });
    }

    // Create a zip file containing all report cards
    const archiver = require('archiver');
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Set response headers for zip download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="class_reports_${classDoc.name.replace(/\s/g, '_')}_${session.replace(/\//g, '_')}_${term.replace(/\s/g, '_')}.zip"`);

    archive.pipe(res);

    // Generate report card for each student
    let generatedCount = 0;
    let failedCount = 0;

    for (const student of students) {
      try {
        // Get student's results for the term
        const results = await Result.find({
          userId: student._id,
          session: session,
          term: term,
          isActive: true
        });

        if (results.length === 0) {
          console.log(`⚠️ No results for student ${student.username}`);
          failedCount++;
          continue;
        }

        // Generate PDF for this student
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'A4'
        });

        const pdfBuffers = [];
        doc.on('data', chunk => pdfBuffers.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(pdfBuffers);
          archive.append(pdfBuffer, { 
            name: `report_${student.username}_${session.replace(/\//g, '_')}_${term.replace(/\s/g, '_')}.pdf` 
          });
        });

        // Generate PDF content (simplified version)
        doc.fontSize(20).text('REPORT CARD', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Name: ${student.name} ${student.surname}`);
        doc.text(`Student ID: ${student.studentId || student.username}`);
        doc.text(`Class: ${classDoc.name}`);
        doc.text(`Session: ${session}`);
        doc.text(`Term: ${term}`);
        doc.moveDown(1);
        doc.text(`Total Tests: ${results.length}`);
        doc.end();

        generatedCount++;
      } catch (error) {
        console.error(`Error generating report for ${student.username}:`, error.message);
        failedCount++;
      }
    }

    // Finalize zip file
    archive.finalize();

    console.log('✅ Class reports generated:', {
      class: classDoc.name,
      totalStudents: students.length,
      generated: generatedCount,
      failed: failedCount
    });

  } catch (error) {
    console.error('❌ Class report cards error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to generate class report cards',
        details: error.message 
      });
    }
  }
});

// Alternative endpoint with query parameters (for frontend compatibility)
router.get('/export/report', auth, async (req, res) => {
  try {
    const { studentId, session, term } = req.query;
    
    console.log('📊 Alternative report card endpoint:', {
      studentId,
      session,
      term,
      user: req.user.username
    });

    if (!studentId || !session || !term) {
      return res.status(400).json({ 
        error: 'Missing required parameters: studentId, session, term' 
      });
    }

    // Redirect to the main endpoint
    const redirectUrl = `/api/results/export/report/${studentId}/${encodeURIComponent(session)}/${encodeURIComponent(term)}`;
    console.log('🔄 Redirecting to:', redirectUrl);
    
    return req.app.get('router').handle(req, res);

  } catch (error) {
    console.error('❌ Alternative report endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to process report request',
      details: error.message 
    });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const User = require('../models/User');
const Test = require('../models/Test');
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
      class: className, // Changed from classId to className
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
    // FIX: Use class string (className) instead of ObjectId
    query.$or = teacherSubjects.map(sub => {
      const condition = {
        subject: sub.subject
      };
      
      // Handle both ObjectId and string class formats
      if (sub.class) {
        if (mongoose.Types.ObjectId.isValid(sub.class)) {
          // If it's an ObjectId, populate to get class name
          condition.$or = [
            { class: sub.class }, // Match by ObjectId
            { 'class._id': sub.class } // Match in populated field
          ];
        } else {
          // If it's a string, match directly
          condition.class = sub.class;
        }
      }
      
      return condition;
    });

    // Apply additional filters
    if (subject) {
      // Ensure teacher has access to this subject
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
      // Ensure teacher has access to this class (match by string name)
      const hasClass = teacherSubjects.some(subj => 
        subj.class === className || subj.className === className
      );
      if (!hasClass) {
        return res.status(403).json({
          success: false,
          error: 'Not assigned to this class'
        });
      }
      // Handle both ObjectId and string class formats
      if (mongoose.Types.ObjectId.isValid(className)) {
        query.$or = [
          { class: className },
          { 'class._id': className }
        ];
      } else {
        query.class = className;
      }
    }

    if (sessionName) query.session = sessionName;
    if (term) query.term = term;
    if (studentId) {
      query.userId = studentId;
    }
    
    if (testId) query.testId = testId;

    console.log('🔍 Teacher results query:', JSON.stringify(query, null, 2));

    const [results, total] = await Promise.all([
      Result.find(query)
        .populate('userId', 'name surname studentId')
        .populate('testId', 'title subject class totalMarks type')
        .populate({
          path: 'class',
          select: 'name level stream',
          // Handle both string and ObjectId class references
          match: teacherSubjects.length > 0 ? {
            $or: teacherSubjects.map(sub => ({
              $or: [
                { _id: sub.class },
                { name: sub.class }
              ]
            }))
          } : {}
        })
        .sort({ submittedAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .lean(),
      Result.countDocuments(query)
    ]);

    // Filter out results where class population failed (teacher doesn't have access)
    const filteredResults = results.filter(result => {
      // If class is populated and exists, check if teacher has access
      if (result.class && result.class._id) {
        return teacherSubjects.some(sub => 
          (sub.class && sub.class.toString() === result.class._id.toString()) ||
          (sub.className === result.class.name)
        );
      }
      // If class is a string, check directly
      if (typeof result.class === 'string') {
        return teacherSubjects.some(sub => 
          sub.class === result.class || sub.className === result.class
        );
      }
      return false;
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      results: filteredResults,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalResults: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('❌ Teacher results error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching teacher results',
      details: error.message
    });
  }
});

// Get teacher's test results - FIXED VERSION
router.get('/teacher/test/:testId', auth, teacherOnly, async (req, res) => {
  try {
    const { testId } = req.params;
    const { includeAnalysis = false } = req.query;

    console.log('Teacher test results request:', {
      testId,
      teacherId: req.user.id,
      username: req.user.username
    });

    // Verify test exists
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ 
        success: false,
        error: 'Test not found' 
      });
    }

    // Check if teacher has access to this test's subject/class
    const teacherSubjects = req.user.subjects || [];
    const hasAccess = teacherSubjects.some(sub => {
      // Match subject
      if (sub.subject !== test.subject) return false;
      
      // Match class - handle both ObjectId and string
      if (mongoose.Types.ObjectId.isValid(test.class)) {
        // Test class is ObjectId
        return sub.class && sub.class.toString() === test.class.toString();
      } else {
        // Test class is string
        return sub.class === test.class || sub.className === test.class;
      }
    });

    if (!hasAccess) {
      return res.status(403).json({ 
        success: false,
        error: 'Not assigned to this subject/class' 
      });
    }

    // Build query - handle both ObjectId and string class formats
    const query = { 
      testId, 
      isActive: true,
      subject: test.subject
    };

    // Add class condition based on test.class type
    if (mongoose.Types.ObjectId.isValid(test.class)) {
      query.$or = [
        { class: test.class },
        { 'class._id': test.class }
      ];
    } else {
      query.class = test.class;
    }

    const results = await Result.find(query)
      .populate('userId', 'name surname studentId')
      .populate({
        path: 'class',
        select: 'name level',
        match: teacherSubjects.length > 0 ? {
          $or: teacherSubjects.map(sub => ({
            $or: [
              { _id: sub.class },
              { name: sub.class }
            ]
          }))
        } : {}
      })
      .sort({ score: -1 })
      .lean();

    // Filter results to only those teacher has access to
    const accessibleResults = results.filter(result => {
      if (!result.class) return false;
      
      return teacherSubjects.some(sub => {
        if (result.class._id) {
          return sub.class && sub.class.toString() === result.class._id.toString();
        }
        return sub.class === result.class || sub.className === result.class;
      });
    });

    // Calculate statistics
    const statistics = {
      totalStudents: accessibleResults.length,
      averageScore: accessibleResults.length > 0 ?
        (accessibleResults.reduce((sum, r) => sum + (r.score || 0), 0) / accessibleResults.length).toFixed(2) : 0,
      highestScore: accessibleResults.length > 0 ? 
        Math.max(...accessibleResults.map(r => r.score || 0)) : 0,
      lowestScore: accessibleResults.length > 0 ? 
        Math.min(...accessibleResults.map(r => r.score || 0)) : 0,
      passRate: accessibleResults.length > 0 ?
        (accessibleResults.filter(r => (r.score || 0) >= (test.passingMarks || test.totalMarks * 0.5)).length / accessibleResults.length * 100).toFixed(2) : 0
    };

    // Add analysis if requested
    let enhancedResults = accessibleResults;
    if (includeAnalysis === 'true') {
      enhancedResults = accessibleResults.map(result => ({
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

    res.json({
      success: true,
      test: {
        id: test._id,
        title: test.title,
        subject: test.subject,
        class: test.class,
        totalMarks: test.totalMarks,
        passingMarks: test.passingMarks
      },
      results: enhancedResults,
      statistics
    });

  } catch (error) {
    console.error('❌ Teacher test results error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching teacher test results',
      details: error.message
    });
  }
});

// Get teacher's student performance - FIXED VERSION
router.get('/teacher/student/:studentId/performance', auth, teacherOnly, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { session: sessionName, term } = req.query;

    console.log('Teacher student performance request:', {
      studentId,
      teacherId: req.user.id,
      username: req.user.username
    });

    // Check if student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ 
        success: false,
        error: 'Student not found' 
      });
    }

    // Check if teacher has access to student's class
    const teacherSubjects = req.user.subjects || [];
    const hasAccess = teacherSubjects.some(sub => {
      // Handle both ObjectId and string class formats
      if (mongoose.Types.ObjectId.isValid(student.class)) {
        return sub.class && sub.class.toString() === student.class.toString();
      } else {
        return sub.class === student.class || sub.className === student.class;
      }
    });

    if (!hasAccess) {
      return res.status(403).json({ 
        success: false,
        error: 'Student not in your assigned classes' 
      });
    }

    // Build query with teacher's subjects
    const query = { 
      userId: studentId, 
      isActive: true
    };

    // Add OR conditions for teacher's subjects
    if (teacherSubjects.length > 0) {
      query.$or = teacherSubjects.map(sub => ({
        subject: sub.subject,
        // Handle class condition based on type
        ...(sub.class ? (mongoose.Types.ObjectId.isValid(sub.class) ? {
          $or: [
            { class: sub.class },
            { 'class._id': sub.class }
          ]
        } : {
          class: sub.class
        }) : {})
      }));
    }
    
    if (sessionName) query.session = sessionName;
    if (term) query.term = term;

    const results = await Result.find(query)
      .populate('testId', 'title type subject totalMarks')
      .populate({
        path: 'class',
        select: 'name level',
        match: teacherSubjects.length > 0 ? {
          $or: teacherSubjects.map(sub => ({
            $or: [
              { _id: sub.class },
              { name: sub.class }
            ]
          }))
        } : {}
      })
      .sort({ submittedAt: -1 })
      .lean();

    // Filter to only accessible results
    const accessibleResults = results.filter(result => {
      if (!result.subject) return false;
      
      return teacherSubjects.some(sub => {
        if (sub.subject !== result.subject) return false;
        
        if (!result.class) return false;
        
        if (result.class._id) {
          return sub.class && sub.class.toString() === result.class._id.toString();
        }
        return sub.class === result.class || sub.className === result.class;
      });
    });

    if (accessibleResults.length === 0) {
      return res.json({
        success: true,
        student: {
          id: student._id,
          name: student.name,
          surname: student.surname,
          studentId: student.studentId
        },
        performance: {
          totalTests: 0,
          averageScore: 0,
          averagePercentage: 0,
          bestScore: 0,
          worstScore: 0
        },
        results: []
      });
    }

    // Calculate performance metrics
    const scores = accessibleResults.map(r => r.score || 0);
    const percentages = accessibleResults.map(r => r.percentage || 0);
    
    const performance = {
      totalTests: accessibleResults.length,
      averageScore: (scores.reduce((sum, score) => sum + score, 0) / accessibleResults.length).toFixed(2),
      averagePercentage: (percentages.reduce((sum, perc) => sum + perc, 0) / accessibleResults.length).toFixed(2),
      bestScore: Math.max(...scores),
      worstScore: Math.min(...scores)
    };

    res.json({
      success: true,
      student: {
        id: student._id,
        name: student.name,
        surname: student.surname,
        studentId: student.studentId,
        class: student.class
      },
      performance,
      results: accessibleResults.slice(0, 10) // Recent 10 results
    });

  } catch (error) {
    console.error('❌ Teacher student performance error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching student performance',
      details: error.message
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

    // Apply filters - handle class as both string and ObjectId
    if (subject) query.subject = subject;
    
    if (className) {
      if (mongoose.Types.ObjectId.isValid(className)) {
        query.$or = [
          { class: className },
          { 'class._id': className }
        ];
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

    const [results, total] = await Promise.all([
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
    res.status(500).json({
      success: false,
      error: 'Server error fetching results'
    });
  }
});

// Get results for specific test - ADMIN/TEACHER ACCESS
router.get('/test/:testId', auth, validateResultParams, async (req, res) => {
  const { testId } = req.params;
  
  try {
    const { includeAnalysis = false } = req.query;

    console.log('GET /api/results/test/:testId - Request:', {
      testId,
      user: req.user.username
    });

    // Verify test exists
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Authorization checks
    if (req.user.role === 'teacher') {
      const teacherSubjects = req.user.subjects || [];
      const hasAccess = teacherSubjects.some(sub => {
        if (sub.subject !== test.subject) return false;
        
        // Handle class matching
        if (mongoose.Types.ObjectId.isValid(test.class)) {
          return sub.class && sub.class.toString() === test.class.toString();
        } else {
          return sub.class === test.class || sub.className === test.class;
        }
      });
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Not assigned to this subject/class' });
      }
    } else if (req.user.role === 'student') {
      return res.status(403).json({ 
        error: 'Access denied. Students cannot view test results.' 
      });
    }

    // Build query
    const query = { testId, isActive: true };
    
    // Add class condition
    if (mongoose.Types.ObjectId.isValid(test.class)) {
      query.$or = [
        { class: test.class },
        { 'class._id': test.class }
      ];
    } else {
      query.class = test.class;
    }

    const results = await Result.find(query)
      .populate('userId', 'name surname studentId')
      .populate('class', 'name level')
      .sort({ score: -1 });

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
      test: {
        id: test._id,
        title: test.title,
        subject: test.subject,
        class: test.class,
        totalMarks: test.totalMarks,
        passingMarks: test.passingMarks
      },
      results: enhancedResults,
      statistics
    });
  } catch (error) {
    console.error('GET /api/results/test/:testId - Error:', {
      message: error.message,
      testId
    });
    res.status(500).json({ error: 'Server error fetching test results' });
  }
});

// Get detailed result analysis - ADMIN/TEACHER ACCESS
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
      const teacherSubjects = req.user.subjects || [];
      const hasAccess = teacherSubjects.some(sub => {
        if (sub.subject !== result.subject) return false;
        
        // Handle class matching
        if (mongoose.Types.ObjectId.isValid(result.class)) {
          return sub.class && sub.class.toString() === result.class.toString();
        } else if (typeof result.class === 'string') {
          return sub.class === result.class || sub.className === result.class;
        } else if (result.class && result.class._id) {
          return sub.class && sub.class.toString() === result.class._id.toString();
        }
        return false;
      });
      
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
   
    res.status(500).json({ error: 'Server error updating result' });
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
    res.status(500).json({ error: 'Server error deleting result' });
  }
});

// Get student performance overview - TEACHERS/ADMINS/STUDENTS
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
        if (mongoose.Types.ObjectId.isValid(student.class)) {
          return sub.class && sub.class.toString() === student.class.toString();
        } else {
          return sub.class === student.class || sub.className === student.class;
        }
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
      results: results.slice(0, 10), // Recent 10 results
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

module.exports = router;
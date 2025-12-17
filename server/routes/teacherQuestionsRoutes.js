// teacherQuestionsRoutes.js - CLEAN VERSION
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

console.log('📚 Teacher Questions Routes loaded');

// IMPORTANT: This router will be mounted at /api
// So all routes here are prefixed with /api

// ====================================
// PUBLIC TEST ENDPOINTS
// ====================================

// Test endpoint - NO AUTH
router.get('/teacher/questions-test', (req, res) => {
  console.log('✅ GET /api/teacher/questions-test - Public test');
  res.json({
    success: true,
    message: 'Teacher questions API is working!',
    endpoints: {
      public: '/api/teacher/questions-test',
      getQuestions: '/api/teacher/questions (GET)',
      createSingle: '/api/teacher/questions (POST)',
      createBulk: '/api/teacher/questions/bulk (POST)',
      getQuestion: '/api/teacher/questions/:id (GET)',
      updateQuestion: '/api/teacher/questions/:id (PUT)',
      deleteQuestion: '/api/teacher/questions/:id (DELETE)'
    },
    timestamp: new Date().toISOString()
  });
});

// ====================================
// MIDDLEWARE - Validate teacher access
// ====================================

const validateTeacherAccess = async (req, res, next) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Only teachers can access this endpoint'
      });
    }
    next();
  } catch (error) {
    console.error('Teacher access validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Access validation error'
    });
  }
};

// ====================================
// GET TEACHER'S QUESTIONS
// ====================================

router.get('/teacher/questions', auth, validateTeacherAccess, async (req, res) => {
  try {
    console.log('📚 GET /api/teacher/questions - Teacher:', req.user.username);
    
    // Get query parameters
    const { subject, class: classId, search, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = {
      createdBy: req.user.id,
      isActive: true
    };
    
    if (subject) filter.subject = { $regex: subject, $options: 'i' };
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      filter.class = classId;
    }
    if (search) {
      filter.$or = [
        { text: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Get questions with pagination
    const [questions, total] = await Promise.all([
      Question.find(filter)
        .select('text subject class marks options correctAnswer type difficulty createdAt')
        .populate('class', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Question.countDocuments(filter)
    ]);
    
    console.log(`✅ Found ${questions.length} questions for teacher ${req.user.username}`);
    
    res.json({
      success: true,
      questions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalQuestions: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error('❌ GET /api/teacher/questions error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching questions',
      message: error.message
    });
  }
});

// ====================================
// CREATE SINGLE QUESTION
// ====================================

router.post('/teacher/questions', auth, validateTeacherAccess, async (req, res) => {
  try {
    const {
      subject,
      class: classId,
      text,
      type = 'multiple_choice',
      options = [],
      correctAnswer,
      marks = 1,
      difficulty = 'medium',
      formula = '',
      explanation = '',
      saveToBank = true,
      inQuestionBank = true,
      testId
    } = req.body;
    
    console.log('📝 POST /api/teacher/questions - Teacher:', req.user.username);
    console.log('📦 Question data:', {
      subject,
      classId,
      textLength: text?.length,
      optionsCount: options?.length,
      correctAnswer: correctAnswer?.substring(0, 50)
    });
    
    // Validation
    const errors = [];
    if (!subject || !subject.trim()) errors.push('Subject is required');
    if (!classId) errors.push('Class is required');
    if (!text || !text.trim()) errors.push('Question text is required');
    if (!options || !Array.isArray(options) || options.length < 2) {
      errors.push('At least 2 options are required');
    }
    if (options && Array.isArray(options)) {
      const validOptions = options.filter(opt => opt && opt.trim());
      if (validOptions.length < 2) errors.push('Options cannot be empty');
      if (!correctAnswer || !validOptions.includes(correctAnswer.trim())) {
        errors.push('Correct answer must be one of the options');
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors
      });
    }
    
    // Validate class ObjectId
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID format'
      });
    }
    
    // Create question
    const question = new Question({
      subject: subject.toUpperCase().trim(),
      class: classId,
      text: text.trim(),
      type,
      options: options.map(opt => opt.trim()),
      correctAnswer: correctAnswer.trim(),
      marks: parseInt(marks) || 1,
      difficulty,
      formula: formula?.trim() || '',
      explanation: explanation?.trim() || '',
      createdBy: req.user.id,
      isActive: true,
      saveToBank: saveToBank !== false,
      inQuestionBank: inQuestionBank !== false,
      ...(testId && { testId })
    });
    
    await question.save();
    
    // Populate for response
    await question.populate('class', 'name');
    
    console.log(`✅ Question created: ${question._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      question: {
        id: question._id,
        subject: question.subject,
        class: {
          id: question.class._id,
          name: question.class.name
        },
        text: question.text.substring(0, 100) + (question.text.length > 100 ? '...' : ''),
        options: question.options,
        correctAnswer: question.correctAnswer,
        marks: question.marks,
        difficulty: question.difficulty,
        saveToBank: question.saveToBank,
        inQuestionBank: question.inQuestionBank,
        createdAt: question.createdAt
      }
    });
    
  } catch (error) {
    console.error('❌ POST /api/teacher/questions error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error creating question',
      message: error.message
    });
  }
});

// ====================================
// BULK CREATE QUESTIONS
// ====================================

router.post('/teacher/questions/bulk', auth, validateTeacherAccess, async (req, res) => {
  try {
    const questionsData = req.body;
    
    console.log('📦 POST /api/teacher/questions/bulk - Teacher:', req.user.username);
    console.log('📦 Questions count:', questionsData?.length || 0);
    
    // Validation
    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Questions data must be a non-empty array'
      });
    }
    
    if (questionsData.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 questions allowed per bulk request'
      });
    }
    
    // Validate and prepare questions
    const validQuestions = [];
    const errors = [];
    
    for (let i = 0; i < questionsData.length; i++) {
      const q = questionsData[i];
      
      try {
        // Basic validation
        if (!q.subject || !q.subject.trim()) {
          throw new Error('Subject is required');
        }
        
        if (!q.class) {
          throw new Error('Class is required');
        }
        
        if (!q.text || !q.text.trim()) {
          throw new Error('Question text is required');
        }
        
        if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
          throw new Error('At least 2 options are required');
        }
        
        const validOptions = q.options.filter(opt => opt && opt.trim());
        if (validOptions.length < 2) {
          throw new Error('Options cannot be empty');
        }
        
        if (!q.correctAnswer || !validOptions.includes(q.correctAnswer.trim())) {
          throw new Error('Correct answer must be one of the options');
        }
        
        // Validate class ObjectId
        if (!mongoose.Types.ObjectId.isValid(q.class)) {
          throw new Error('Invalid class ID format');
        }
        
        // Add to valid questions
        validQuestions.push({
          subject: q.subject.toUpperCase().trim(),
          class: q.class,
          text: q.text.trim(),
          type: q.type || 'multiple_choice',
          options: validOptions,
          correctAnswer: q.correctAnswer.trim(),
          marks: parseInt(q.marks) || 1,
          difficulty: q.difficulty || 'medium',
          formula: q.formula?.trim() || '',
          explanation: q.explanation?.trim() || '',
          createdBy: req.user.id,
          isActive: true,
          saveToBank: q.saveToBank !== false,
          inQuestionBank: q.inQuestionBank !== false,
          ...(q.testId && { testId: q.testId })
        });
        
      } catch (error) {
        errors.push({
          index: i,
          subject: q.subject || 'Unknown',
          class: q.class || 'Unknown',
          error: error.message
        });
      }
    }
    
    if (validQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid questions to create',
        errors
      });
    }
    
    console.log(`✅ Valid questions: ${validQuestions.length}, Errors: ${errors.length}`);
    
    // Create questions
    const createdQuestions = await Question.insertMany(validQuestions);
    
    console.log(`✅ Created ${createdQuestions.length} questions`);
    
    res.status(201).json({
      success: true,
      message: `Successfully created ${createdQuestions.length} questions`,
      createdCount: createdQuestions.length,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      questionIds: createdQuestions.map(q => q._id)
    });
    
  } catch (error) {
    console.error('❌ POST /api/teacher/questions/bulk error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error creating questions',
      message: error.message
    });
  }
});

// ====================================
// GET SINGLE QUESTION
// ====================================

router.get('/teacher/questions/:id', auth, validateTeacherAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 GET /api/teacher/questions/:id - Teacher:', req.user.username);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid question ID'
      });
    }
    
    const question = await Question.findOne({
      _id: id,
      createdBy: req.user.id,
      isActive: true
    })
    .populate('class', 'name')
    .lean();
    
    if (!question) {
      return res.status(404).json({
        success: false,
        error: 'Question not found or you do not have permission to view it'
      });
    }
    
    res.json({
      success: true,
      question
    });
    
  } catch (error) {
    console.error('❌ GET /api/teacher/questions/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching question'
    });
  }
});

// ====================================
// UPDATE QUESTION
// ====================================

router.put('/teacher/questions/:id', auth, validateTeacherAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log('✏️ PUT /api/teacher/questions/:id - Teacher:', req.user.username);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid question ID'
      });
    }
    
    // Find question
    const question = await Question.findOne({
      _id: id,
      createdBy: req.user.id,
      isActive: true
    });
    
    if (!question) {
      return res.status(404).json({
        success: false,
        error: 'Question not found or you do not have permission to edit it'
      });
    }
    
    // Validate updates
    if (updates.subject) question.subject = updates.subject.toUpperCase().trim();
    if (updates.class) {
      if (!mongoose.Types.ObjectId.isValid(updates.class)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid class ID'
        });
      }
      question.class = updates.class;
    }
    if (updates.text) question.text = updates.text.trim();
    if (updates.options && Array.isArray(updates.options)) {
      const validOptions = updates.options.filter(opt => opt && opt.trim());
      if (validOptions.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'At least 2 non-empty options are required'
        });
      }
      question.options = validOptions;
    }
    if (updates.correctAnswer) {
      if (!question.options.includes(updates.correctAnswer.trim())) {
        return res.status(400).json({
          success: false,
          error: 'Correct answer must be one of the options'
        });
      }
      question.correctAnswer = updates.correctAnswer.trim();
    }
    if (updates.marks) question.marks = parseInt(updates.marks) || 1;
    if (updates.difficulty) question.difficulty = updates.difficulty;
    if (updates.formula !== undefined) question.formula = updates.formula?.trim() || '';
    if (updates.explanation !== undefined) question.explanation = updates.explanation?.trim() || '';
    if (updates.saveToBank !== undefined) question.saveToBank = updates.saveToBank;
    if (updates.inQuestionBank !== undefined) question.inQuestionBank = updates.inQuestionBank;
    
    await question.save();
    
    console.log(`✅ Question ${id} updated`);
    
    res.json({
      success: true,
      message: 'Question updated successfully',
      question: {
        id: question._id,
        subject: question.subject,
        class: question.class,
        text: question.text,
        marks: question.marks,
        saveToBank: question.saveToBank,
        inQuestionBank: question.inQuestionBank
      }
    });
    
  } catch (error) {
    console.error('❌ PUT /api/teacher/questions/:id error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error updating question'
    });
  }
});

// ====================================
// DELETE QUESTION (SOFT DELETE)
// ====================================

router.delete('/teacher/questions/:id', auth, validateTeacherAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ DELETE /api/teacher/questions/:id - Teacher:', req.user.username);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid question ID'
      });
    }
    
    const question = await Question.findOneAndUpdate(
      {
        _id: id,
        createdBy: req.user.id,
        isActive: true
      },
      { isActive: false },
      { new: true }
    );
    
    if (!question) {
      return res.status(404).json({
        success: false,
        error: 'Question not found or already deleted'
      });
    }
    
    console.log(`✅ Question ${id} soft deleted`);
    
    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ DELETE /api/teacher/questions/:id error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error deleting question'
    });
  }
});

// ====================================
// DEBUG ENDPOINT
// ====================================

router.get('/teacher/questions-debug', (req, res) => {
  const routes = router.stack
    .filter(layer => layer.route)
    .map(layer => ({
      method: Object.keys(layer.route.methods)[0].toUpperCase(),
      path: layer.route.path
    }));
  
  res.json({
    success: true,
    message: 'Teacher Questions Routes Debug',
    totalRoutes: routes.length,
    basePath: '/api',
    routes,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
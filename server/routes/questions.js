const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Papa = require('papaparse');
const Question = require('../models/Question');
const User = require('../models/User');
const Class = require('../models/Class');
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// Middleware to validate teacher access to subject/class
const validateTeacherAccess = async (req, res, next) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only teachers can manage questions' 
      });
    }

    const { subject, class: classId } = req.body;

    // Check if teacher is assigned to this subject and class
    const teacher = await User.findById(req.user.id);
    
    let hasAccess = false;
    
    // Check teacher assignments
    if (teacher.teacherAssignments && teacher.teacherAssignments.length > 0) {
      hasAccess = teacher.teacherAssignments.some(assignment => {
        const classMatch = assignment.class.toString() === classId.toString();
        if (!classMatch) return false;
        
        // Check if any subject in this assignment matches
        return assignment.subjects.some(sub => {
          const subjectObj = sub.subject;
          const subjectId = subjectObj._id || subjectObj;
          return subjectId.toString() === subject.toString();
        });
      });
    }

    // Check old format (subjects array)
    if (!hasAccess && teacher.subjects && teacher.subjects.length > 0) {
      hasAccess = teacher.subjects.some(subjectItem => {
        return subjectItem.subject === subject && 
               subjectItem.class && 
               subjectItem.class.toString() === classId.toString();
      });
    }

    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not assigned to this subject and class combination' 
      });
    }

    next();
  } catch (error) {
    console.error('Validate teacher access error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error validating access' 
    });
  }
};

// Test endpoint - NO AUTH REQUIRED
router.get('/questions-test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Questions API is working',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Get all questions (with filtering) - FIXED
router.get('/', auth, async (req, res) => {
  try {
    console.log('📚 GET /api/questions - Fetching questions');
    
    const { 
      page = 1, 
      limit = 20, 
      subject, 
      class: classId,
      type,
      difficulty,
      tags,
      search,
      inQuestionBank = true,
      createdBy,
      testId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    const filter = { isActive: true };

    // Apply filters
    if (subject) filter.subject = subject;
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      filter.class = new mongoose.Types.ObjectId(classId);
    }
    if (type) filter.type = type;
    if (difficulty) filter.difficulty = difficulty;
    if (inQuestionBank !== undefined) filter.inQuestionBank = inQuestionBank === 'true';
    if (createdBy) filter.createdBy = createdBy;
    if (testId) filter.testId = testId;
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      filter.tags = { $in: tagArray };
    }
    
    if (search) {
      filter.$or = [
        { text: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Apply role-based filtering
    if (req.user.role === 'teacher') {
      filter.createdBy = req.user.id;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const questions = await Question.find(filter)
      .populate('class', 'name shortName level')
      .populate('createdBy', 'name username')
      .populate('testId', 'title subject class')
      .sort(sort)
      .skip(skip)
      .limit(Math.min(parseInt(limit), 100))
      .lean()
      .maxTimeMS(10000);

    const totalQuestions = await Question.countDocuments(filter).maxTimeMS(5000);

    res.json({
      success: true,
      questions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalQuestions / limit),
        totalQuestions,
        hasNext: page < Math.ceil(totalQuestions / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('❌ Get questions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching questions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get question by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('class', 'name shortName level')
      .populate('createdBy', 'name username')
      .populate('testId', 'title subject class')
      .lean();

    if (!question) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question not found' 
      });
    }

    // Hide correct answer for students
    if (req.user.role === 'student') {
      delete question.correctAnswer;
    }

    res.json({ success: true, question });
  } catch (error) {
    console.error('❌ Get question error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching question' 
    });
  }
});

// Create a single question - FIXED
router.post('/', auth, validateTeacherAccess, async (req, res) => {
  try {
    console.log('🆕 POST /api/questions - Creating question:', {
      user: req.user.id,
      body: req.body
    });

    const {
      subject,
      class: classId,
      text,
      type = 'multiple_choice',
      options = [],
      correctAnswer,
      marks = 1,
      difficulty = 'medium',
      tags = [],
      formula = '',
      explanation = '',
      imageUrl = '',
      testId,
      saveToBank = true,
      inQuestionBank = true
    } = req.body;

    // Validate required fields
    if (!subject || !classId || !text) {
      return res.status(400).json({ 
        success: false, 
        message: 'Subject, class, and question text are required' 
      });
    }

    // Validate multiple choice questions
    if (type === 'multiple_choice') {
      if (!options || options.length < 2 || options.length > 6) {
        return res.status(400).json({ 
          success: false, 
          message: 'Multiple choice questions must have 2-6 options' 
        });
      }
      if (!correctAnswer || !options.includes(correctAnswer)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Correct answer must be one of the provided options' 
        });
      }
    }

    // Validate true/false questions
    if (type === 'true_false') {
      if (!['true', 'false', true, false].includes(correctAnswer)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Correct answer must be true or false' 
        });
      }
    }

    const questionData = {
      subject: subject.trim(),
      class: classId,
      text: text.trim(),
      type,
      options: type === 'multiple_choice' ? options.map(opt => opt.trim()) : undefined,
      correctAnswer,
      marks: parseInt(marks) || 1,
      difficulty,
      tags: Array.isArray(tags) ? tags.map(tag => tag.trim().toLowerCase()) : [],
      formula: formula.trim() || null,
      explanation: explanation.trim() || '',
      imageUrl: imageUrl.trim() || '',
      createdBy: req.user.id,
      testId: testId || undefined,
      saveToBank: saveToBank !== false,
      inQuestionBank: inQuestionBank !== false,
      isActive: true
    };

    const question = new Question(questionData);
    await question.save();

    // Populate response
    const populatedQuestion = await Question.findById(question._id)
      .populate('class', 'name shortName level')
      .populate('createdBy', 'name username')
      .lean();

    console.log('✅ Question created:', question._id);

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      question: populatedQuestion
    });
  } catch (error) {
    console.error('❌ Create question error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: messages 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Duplicate question detected' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error creating question',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Bulk create questions - FIXED
router.post('/bulk', auth, async (req, res) => {
  try {
    console.log('📚 POST /api/questions/bulk - Creating bulk questions:', {
      user: req.user.id,
      count: req.body.length
    });

    const questionsData = req.body;
    
    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Questions array is required and cannot be empty' 
      });
    }

    if (questionsData.length > 50) {
      return res.status(400).json({ 
        success: false, 
        message: 'Maximum 50 questions allowed per bulk request' 
      });
    }

    const createdQuestions = [];
    const errors = [];

    // Validate teacher access for each question first
    for (const questionData of questionsData) {
      try {
        // Create fake request for validation middleware
        const fakeReq = {
          user: req.user,
          body: questionData
        };
        
        // Check teacher access
        if (req.user.role === 'teacher') {
          const teacher = await User.findById(req.user.id);
          const { subject, class: classId } = questionData;
          
          let hasAccess = false;
          
          if (teacher.teacherAssignments && teacher.teacherAssignments.length > 0) {
            hasAccess = teacher.teacherAssignments.some(assignment => {
              const classMatch = assignment.class.toString() === classId.toString();
              if (!classMatch) return false;
              
              return assignment.subjects.some(sub => {
                const subjectObj = sub.subject;
                const subjectId = subjectObj._id || subjectObj;
                return subjectId.toString() === subject.toString();
              });
            });
          }

          if (!hasAccess) {
            errors.push({
              subject: questionData.subject,
              class: questionData.class,
              error: 'You are not assigned to this subject and class combination'
            });
            continue;
          }
        }

        // Validate question data
        const { subject, class: classId, text, type = 'multiple_choice', options, correctAnswer } = questionData;

        if (!subject || !classId || !text) {
          errors.push({
            subject: subject || 'missing',
            class: classId || 'missing',
            error: 'Subject, class, and question text are required'
          });
          continue;
        }

        if (type === 'multiple_choice') {
          if (!options || options.length < 2 || options.length > 6) {
            errors.push({
              subject,
              class: classId,
              error: 'Multiple choice questions must have 2-6 options'
            });
            continue;
          }
          if (!correctAnswer || !options.includes(correctAnswer)) {
            errors.push({
              subject,
              class: classId,
              error: 'Correct answer must be one of the provided options'
            });
            continue;
          }
        }

        const question = new Question({
          ...questionData,
          subject: subject.trim(),
          class: classId,
          text: text.trim(),
          options: type === 'multiple_choice' ? options.map(opt => opt.trim()) : undefined,
          correctAnswer,
          marks: parseInt(questionData.marks) || 1,
          tags: Array.isArray(questionData.tags) ? 
            questionData.tags.map(tag => tag.trim().toLowerCase()) : [],
          formula: questionData.formula ? questionData.formula.trim() : null,
          explanation: questionData.explanation ? questionData.explanation.trim() : '',
          createdBy: req.user.id,
          saveToBank: questionData.saveToBank !== false,
          inQuestionBank: questionData.inQuestionBank !== false,
          isActive: true
        });

        await question.save();
        createdQuestions.push(question._id);

      } catch (error) {
        errors.push({
          subject: questionData.subject || 'unknown',
          class: questionData.class || 'unknown',
          error: error.message
        });
      }
    }

    // Get created questions with populated data
    const populatedQuestions = await Question.find({ _id: { $in: createdQuestions } })
      .populate('class', 'name shortName level')
      .populate('createdBy', 'name username')
      .lean();

    console.log('✅ Bulk questions created:', {
      created: createdQuestions.length,
      errors: errors.length
    });

    res.json({
      success: true,
      message: `Successfully created ${createdQuestions.length} questions`,
      createdCount: createdQuestions.length,
      errorCount: errors.length,
      questions: populatedQuestions,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Bulk create questions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error creating questions in bulk',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 🔧 Helper Function: Parse Questions from Text
function parseQuestionsFromText(text) {
  const questions = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let currentQuestion = null;
  let inOptions = false;
  let options = [];
  let optionPrefixes = ['A.', 'B.', 'C.', 'D.', 'E.', 'a.', 'b.', 'c.', 'd.', 'e.'];
  let answerPatterns = ['Correct Answer:', 'Answer:', 'Correct:', 'Ans:'];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is a new question (starts with "Question", "Q", or number)
    if (line.match(/^(Question\s*\d+|Q\d+|^\d+[\.\)])/i)) {
      // Save previous question if exists
      if (currentQuestion && currentQuestion.text && options.length >= 2 && currentQuestion.correctAnswer) {
        questions.push({
          ...currentQuestion,
          options: options
        });
      }
      
      // Start new question
      currentQuestion = {
        text: '',
        options: [],
        correctAnswer: '',
        explanation: '',
        marks: 1,
        difficulty: 'medium',
        tags: []
      };
      inOptions = false;
      options = [];
      
      // Extract question text (remove the "Question X:" prefix)
      const text = line.replace(/^(Question\s*\d+|Q\d+|^\d+[\.\)])\s*[:\.]?\s*/i, '').trim();
      if (text) {
        currentQuestion.text = text;
      }
      continue;
    }
    
    // If we have a current question
    if (currentQuestion) {
      // Check if this line is an option
      const isOption = optionPrefixes.some(prefix => line.startsWith(prefix));
      
      if (isOption) {
        inOptions = true;
        const optionText = line.replace(/^[A-Ea-e][\.\)]\s*/, '').trim();
        if (optionText) {
          options.push(optionText);
        }
        continue;
      }
      
      // Check if this line contains the correct answer
      const isAnswerLine = answerPatterns.some(pattern => line.toLowerCase().includes(pattern.toLowerCase()));
      
      if (isAnswerLine) {
        inOptions = false;
        const answerMatch = line.match(/:?\s*([A-Ea-e])\b/);
        if (answerMatch) {
          const answerLetter = answerMatch[1].toUpperCase();
          const optionIndex = answerLetter.charCodeAt(0) - 65; // A=0, B=1, etc.
          
          if (options[optionIndex]) {
            currentQuestion.correctAnswer = options[optionIndex];
          }
        } else {
          // Try to extract answer from text after the pattern
          const pattern = answerPatterns.find(p => line.toLowerCase().includes(p.toLowerCase()));
          if (pattern) {
            const answerText = line.substring(line.toLowerCase().indexOf(pattern.toLowerCase()) + pattern.length).trim();
            if (answerText) {
              currentQuestion.correctAnswer = answerText;
            }
          }
        }
        continue;
      }
      
      // Check for explanation (optional)
      if (line.toLowerCase().startsWith('explanation:')) {
        currentQuestion.explanation = line.substring('explanation:'.length).trim();
        continue;
      }
      
      // Check for marks (optional)
      const marksMatch = line.match(/marks?:\s*(\d+)/i);
      if (marksMatch) {
        currentQuestion.marks = parseInt(marksMatch[1]) || 1;
        continue;
      }
      
      // Check for difficulty (optional)
      const difficultyMatch = line.match(/difficulty:\s*(easy|medium|hard)/i);
      if (difficultyMatch) {
        currentQuestion.difficulty = difficultyMatch[1].toLowerCase();
        continue;
      }
      
      // If we're not in options and not processing special fields, append to question text
      if (!inOptions && !isAnswerLine && !line.toLowerCase().startsWith('explanation:')) {
        if (currentQuestion.text) {
          currentQuestion.text += ' ' + line;
        } else {
          currentQuestion.text = line;
        }
      }
    }
  }
  
  // Don't forget the last question
  if (currentQuestion && currentQuestion.text && options.length >= 2 && currentQuestion.correctAnswer) {
    questions.push({
      ...currentQuestion,
      options: options
    });
  }
  
  return questions;
}

// 📝 Parse Word Document (extract questions)
router.post('/parse/word', auth, async (req, res) => {
  try {
    console.log('📄 POST /api/questions/parse/word - Parsing Word document');
    
    if (!req.files || !req.files.document) {
      return res.status(400).json({
        success: false,
        message: 'No Word document uploaded'
      });
    }

    const document = req.files.document;
    
    // Validate file type
    if (!document.name.endsWith('.docx')) {
      return res.status(400).json({
        success: false,
        message: 'Only .docx files are supported'
      });
    }

    // Parse Word document using mammoth
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer: document.data });
    const text = result.value;
    
    // Parse questions from the text
    const parsedQuestions = parseQuestionsFromText(text);
    
    if (parsedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid questions found in the document. Please ensure proper formatting.'
      });
    }

    res.json({
      success: true,
      message: `Successfully parsed ${parsedQuestions.length} questions`,
      questions: parsedQuestions,
      rawText: text // Optional: for debugging
    });

  } catch (error) {
    console.error('❌ Parse Word document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to parse Word document',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 📝 Parse Text Content (for manual text input)
router.post('/parse/text', auth, async (req, res) => {
  try {
    console.log('📝 POST /api/questions/parse/text - Parsing text content');
    
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No text content provided'
      });
    }

    // Parse questions from the text
    const parsedQuestions = parseQuestionsFromText(text);
    
    if (parsedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid questions found in the text. Please ensure proper formatting.'
      });
    }

    res.json({
      success: true,
      message: `Successfully parsed ${parsedQuestions.length} questions`,
      questions: parsedQuestions
    });

  } catch (error) {
    console.error('❌ Parse text error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to parse text content',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 📝 Preview & Save Questions (after parsing)
router.post('/preview/save', auth, validateTeacherAccess, async (req, res) => {
  try {
    console.log('💾 POST /api/questions/preview/save - Saving previewed questions');
    
    const { 
      questions, 
      subject, 
      class: classId,
      options = {}
    } = req.body;
    
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Questions array is required'
      });
    }

    if (!subject || !classId) {
      return res.status(400).json({
        success: false,
        message: 'Subject and class are required'
      });
    }

    const createdQuestions = [];
    const errors = [];
    const defaultMarks = options.defaultMarks || 1;

    // Validate and save each question
    for (const q of questions) {
      try {
        // Validate required fields
        if (!q.text || q.text.trim().length === 0) {
          errors.push({
            question: q.text || 'Unknown',
            error: 'Question text is required'
          });
          continue;
        }

        if (!q.options || q.options.length < 2) {
          errors.push({
            question: q.text.substring(0, 50) + '...',
            error: 'At least 2 options are required'
          });
          continue;
        }

        if (!q.correctAnswer || q.correctAnswer.trim().length === 0) {
          errors.push({
            question: q.text.substring(0, 50) + '...',
            error: 'Correct answer is required'
          });
          continue;
        }

        // Ensure correct answer is in options
        if (!q.options.includes(q.correctAnswer)) {
          errors.push({
            question: q.text.substring(0, 50) + '...',
            error: `Correct answer "${q.correctAnswer}" not found in options`
          });
          continue;
        }

        // Create question object
        const questionData = {
          subject: subject.trim(),
          class: classId,
          text: q.text.trim(),
          type: 'multiple_choice',
          options: q.options.map(opt => opt.trim()),
          correctAnswer: q.correctAnswer.trim(),
          marks: q.marks || defaultMarks,
          difficulty: q.difficulty || 'medium',
          tags: Array.isArray(q.tags) ? q.tags.map(tag => tag.trim().toLowerCase()) : [],
          explanation: q.explanation ? q.explanation.trim() : '',
          createdBy: req.user.id,
          saveToBank: true,
          inQuestionBank: true,
          isActive: true
        };

        const question = new Question(questionData);
        await question.save();
        createdQuestions.push(question._id);

      } catch (error) {
        errors.push({
          question: q.text ? q.text.substring(0, 50) + '...' : 'Unknown',
          error: error.message
        });
      }
    }

    // Get created questions with populated data
    const populatedQuestions = await Question.find({ _id: { $in: createdQuestions } })
      .populate('class', 'name shortName level')
      .populate('createdBy', 'name username')
      .lean();

    console.log('✅ Preview questions saved:', {
      created: createdQuestions.length,
      errors: errors.length
    });

    res.json({
      success: true,
      message: `Successfully saved ${createdQuestions.length} questions`,
      savedCount: createdQuestions.length,
      errorCount: errors.length,
      questions: populatedQuestions,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Save preview questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save questions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update question
router.put('/:id', auth, validateTeacherAccess, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question not found' 
      });
    }

    // Check ownership (teachers can only update their own questions)
    if (req.user.role === 'teacher' && question.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only update your own questions' 
      });
    }

    const updateData = { ...req.body };
    
    // Clean up data
    if (updateData.subject) updateData.subject = updateData.subject.trim();
    if (updateData.text) updateData.text = updateData.text.trim();
    if (updateData.formula) updateData.formula = updateData.formula.trim();
    if (updateData.explanation) updateData.explanation = updateData.explanation.trim();
    if (updateData.tags && Array.isArray(updateData.tags)) {
      updateData.tags = updateData.tags.map(tag => tag.trim().toLowerCase());
    }
    if (updateData.options && Array.isArray(updateData.options)) {
      updateData.options = updateData.options.map(opt => opt.trim());
    }
    if (updateData.marks) updateData.marks = parseInt(updateData.marks) || 1;

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('class', 'name shortName level').populate('createdBy', 'name username');

    res.json({
      success: true,
      message: 'Question updated successfully',
      question: updatedQuestion
    });
  } catch (error) {
    console.error('❌ Update question error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: messages 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating question' 
    });
  }
});

// Delete question (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question not found' 
      });
    }

    // Check ownership
    if (req.user.role === 'teacher' && question.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only delete your own questions' 
      });
    }

    // Soft delete by marking as inactive
    question.isActive = false;
    await question.save();

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete question error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error deleting question' 
    });
  }
});

// Get question statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const matchStage = { isActive: true };
    
    if (req.user.role === 'teacher') {
      matchStage.createdBy = req.user.id;
    }

    const stats = await Question.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          totalUsage: { $sum: '$usageCount' },
          inQuestionBankCount: { 
            $sum: { $cond: [{ $eq: ['$inQuestionBank', true] }, 1, 0] } 
          },
          bySubject: { 
            $push: { 
              subject: '$subject',
              class: '$class'
            }
          },
          byDifficulty: { $push: '$difficulty' },
          byType: { $push: '$type' }
        }
      },
      {
        $project: {
          totalQuestions: 1,
          totalUsage: 1,
          inQuestionBankCount: 1,
          subjectDistribution: {
            $reduce: {
              input: '$bySubject',
              initialValue: {},
              in: {
                $let: {
                  vars: {
                    key: { $concat: ['$$this.subject', ':', { $toString: '$$this.class' }] }
                  },
                  in: {
                    $mergeObjects: [
                      '$$value',
                      {
                        $arrayToObject: [[
                          {
                            k: '$$key',
                            v: {
                              $add: [
                                { $ifNull: [{ $arrayElemAt: [{ $objectToArray: '$$value' }, 0] }, 0] },
                                1
                              ]
                            }
                          }
                        ]]
                      }
                    ]
                  }
                }
              }
            }
          },
          difficultyDistribution: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ['$byDifficulty', []] },
                as: 'difficulty',
                in: {
                  k: '$$difficulty',
                  v: {
                    $size: {
                      $filter: {
                        input: '$byDifficulty',
                        as: 'd',
                        cond: { $eq: ['$$d', '$$difficulty'] }
                      }
                    }
                  }
                }
              }
            }
          },
          typeDistribution: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ['$byType', []] },
                as: 'type',
                in: {
                  k: '$$type',
                  v: {
                    $size: {
                      $filter: {
                        input: '$byType',
                        as: 't',
                        cond: { $eq: ['$$t', '$$type'] }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalQuestions: 0,
        totalUsage: 0,
        inQuestionBankCount: 0,
        subjectDistribution: {},
        difficultyDistribution: {},
        typeDistribution: {}
      }
    });
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching statistics' 
    });
  }
});

// Export questions (CSV/JSON)
router.get('/export/:format', auth, async (req, res) => {
  try {
    const { format = 'json' } = req.params;
    const { subject, class: classId } = req.query;

    const filter = { isActive: true, createdBy: req.user.id };
    if (subject) filter.subject = subject;
    if (classId) filter.class = classId;

    const questions = await Question.find(filter)
      .populate('class', 'name shortName')
      .lean();

    if (format === 'csv') {
      // Convert to CSV
      const csvData = questions.map(q => ({
        Subject: q.subject,
        Class: q.class?.name || '',
        Question: q.text,
        Type: q.type,
        Options: q.options ? q.options.join('|') : '',
        CorrectAnswer: q.correctAnswer,
        Marks: q.marks,
        Difficulty: q.difficulty,
        Tags: q.tags?.join(',') || '',
        Formula: q.formula || '',
        Explanation: q.explanation || ''
      }));

      // Convert to CSV string
      const csv = Papa.unparse(csvData);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=questions.csv');
      return res.send(csv);
    }

    // Default to JSON
    res.json({
      success: true,
      questions,
      count: questions.length,
      exportedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Export questions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error exporting questions' 
    });
  }
});

// Import questions from file
router.post('/import', auth, async (req, res) => {
  try {
    // This endpoint would handle file upload and parsing
    // Implementation depends on your file upload setup
    res.json({ 
      success: true, 
      message: 'Import endpoint - implement file upload logic' 
    });
  } catch (error) {
    console.error('❌ Import questions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error importing questions' 
    });
  }
});

// Health check
router.get('/health/check', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Questions API is working',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

module.exports = router;
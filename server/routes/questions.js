const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// Middleware to validate MongoDB ObjectId
const validateObjectId = (paramName) => (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params[paramName])) {
    return res.status(400).json({ error: `Invalid ${paramName} format.` });
  }
  next();
};

// Create a new question - TEACHERS ONLY SEE THEIR OWN QUESTIONS
router.post('/', auth, async (req, res) => {
  try {
    const { text, options, correctAnswer, subject, class: className, marks = 1, explanation } = req.body;
    
    console.log('Questions route - Creating question:', {
      subject,
      class: className,
      user: req.user.username,
      role: req.user.role
    });

    // Validate required fields
    const missingFields = [];
    if (!text || typeof text !== 'string' || text.trim() === '') missingFields.push('text');
    if (!options || !Array.isArray(options) || options.length === 0) missingFields.push('options');
    if (!correctAnswer || typeof correctAnswer !== 'string' || correctAnswer.trim() === '') missingFields.push('correctAnswer');
    if (!subject || typeof subject !== 'string' || subject.trim() === '') missingFields.push('subject');
    if (!className || typeof className !== 'string' || className.trim() === '') missingFields.push('class');
    
    if (missingFields.length > 0) {
      return res.status(400).json({ error: `Missing or invalid fields: ${missingFields.join(', ')}` });
    }

    // Validate options array
    if (!options.every(opt => typeof opt === 'string' && opt.trim())) {
      return res.status(400).json({ error: 'All options must be non-empty strings.' });
    }

    // Validate correct answer exists in options
    if (!options.includes(correctAnswer)) {
      return res.status(400).json({ error: 'Correct answer must be one of the provided options.' });
    }

    // Authorization check for teachers
    if (req.user.role === 'teacher') {
      if (!Array.isArray(req.user.subjects) || !req.user.subjects.some(sub => 
        sub.subject === subject && sub.class === className)) {
        return res.status(403).json({ error: 'You are not assigned to this subject/class.' });
      }
    }

    const question = new Question({
      text: text.trim(),
      options: options.map(opt => opt.trim()),
      correctAnswer: correctAnswer.trim(),
      subject,
      class: className,
      marks: Number(marks) || 1,
      explanation: explanation?.trim() || '',
      createdBy: req.user.id,
      isActive: true
    });

    await question.save();
    
    console.log('Questions route - Question created:', {
      questionId: question._id,
      subject,
      class: className,
      createdBy: req.user.username
    });

    res.status(201).json({
      message: 'Question created successfully',
      question: {
        id: question._id,
        text: question.text,
        options: question.options,
        correctAnswer: question.correctAnswer,
        subject: question.subject,
        class: question.class,
        marks: question.marks,
        explanation: question.explanation,
        createdBy: req.user.username
      }
    });
  } catch (error) {
    console.error('Questions route - Create Error:', {
      error: error.message,
      user: req.user.username
    });
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: `Validation failed: ${errors.join(', ')}` });
    }
    
    res.status(500).json({ error: 'Server error creating question' });
  }
});

// Get all questions - TEACHERS ONLY SEE THEIR OWN QUESTIONS
router.get('/', auth, async (req, res) => {
  try {
    const { subject, class: className, page = 1, limit = 10 } = req.query;
    
    console.log('Questions route - Fetching questions:', {
      user: req.user.username,
      role: req.user.role,
      subject,
      class: className
    });

    let query = { isActive: true };
    let population = '';

    // Role-based filtering
    if (req.user.role === 'teacher') {
      // Teachers can only see their own questions
      query.createdBy = req.user.id;
      
      // Filter by assigned subjects if specified
      if (subject && className) {
        if (!req.user.subjects?.some(sub => sub.subject === subject && sub.class === className)) {
          return res.status(403).json({ error: 'Not assigned to this subject/class' });
        }
        query.subject = subject;
        query.class = className;
      } else {
        // If no specific subject/class, show all questions from teacher's assigned subjects
        const teacherSubjects = req.user.subjects || [];
        if (teacherSubjects.length > 0) {
          query.$or = teacherSubjects.map(sub => ({
            subject: sub.subject,
            class: sub.class
          }));
        } else {
          return res.status(403).json({ error: 'No subjects assigned to teacher' });
        }
      }
    } else if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      // Admins can see all questions and filter if needed
      if (subject) query.subject = subject;
      if (className) query.class = className;
      population = 'createdBy'; // Populate creator info for admins
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    const skip = (page - 1) * limit;
    
    let questionsQuery = Question.find(query);
    
    if (population) {
      questionsQuery = questionsQuery.populate(population, 'username name');
    }
    
    const [questions, total] = await Promise.all([
      questionsQuery
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .lean(),
      Question.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    console.log('Questions route - Questions fetched:', {
      count: questions.length,
      user: req.user.username,
      role: req.user.role
    });

    res.json({
      questions,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalQuestions: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Questions route - Fetch Error:', {
      error: error.message,
      user: req.user.username
    });
    res.status(500).json({ error: 'Server error fetching questions' });
  }
});

// Get specific question - TEACHERS ONLY SEE THEIR OWN QUESTIONS
router.get('/:questionId', [auth, validateObjectId('questionId')], async (req, res) => {
  const { questionId } = req.params;
  
  try {
    console.log('Questions route - Fetching question:', {
      questionId,
      user: req.user.username,
      role: req.user.role
    });

    let query = { _id: questionId, isActive: true };
    let population = '';

    // Role-based access control
    if (req.user.role === 'teacher') {
      query.createdBy = req.user.id; // Teachers can only see their own questions
    } else if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      population = 'createdBy'; // Admins can see all questions with creator info
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    let questionQuery = Question.findOne(query);
    
    if (population) {
      questionQuery = questionQuery.populate(population, 'username name');
    }

    const question = await questionQuery;

    if (!question) {
      return res.status(404).json({ error: 'Question not found or access denied' });
    }

    // Additional authorization check for teachers
    if (req.user.role === 'teacher') {
      const hasAccess = req.user.subjects?.some(sub => 
        sub.subject === question.subject && sub.class === question.class
      );
      if (!hasAccess) {
        return res.status(403).json({ error: 'Not assigned to this question\'s subject/class' });
      }
    }

    console.log('Questions route - Question fetched:', {
      questionId,
      user: req.user.username
    });

    res.json(question);
  } catch (error) {
    console.error('Questions route - Fetch Single Error:', {
      error: error.message,
      questionId,
      user: req.user.username
    });
    res.status(500).json({ error: 'Server error fetching question' });
  }
});

// Update question - TEACHERS CAN ONLY UPDATE THEIR OWN QUESTIONS
router.put('/:questionId', [auth, validateObjectId('questionId')], async (req, res) => {
  const { questionId } = req.params;
  
  try {
    const { text, options, correctAnswer, marks, explanation } = req.body;
    
    console.log('Questions route - Updating question:', {
      questionId,
      user: req.user.username,
      role: req.user.role
    });

    // Find the question first
    const question = await Question.findOne({ _id: questionId, isActive: true });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Authorization check - teachers can only update their own questions
    if (req.user.role === 'teacher') {
      if (!question.createdBy.equals(req.user.id)) {
        return res.status(403).json({ error: 'You can only update your own questions' });
      }
      
      // Check if teacher is still assigned to this subject/class
      const hasAccess = req.user.subjects?.some(sub => 
        sub.subject === question.subject && sub.class === question.class
      );
      if (!hasAccess) {
        return res.status(403).json({ error: 'No longer assigned to this subject/class' });
      }
    }

    // Validate updates
    if (text !== undefined) {
      if (typeof text !== 'string' || text.trim() === '') {
        return res.status(400).json({ error: 'Text must be a non-empty string' });
      }
      question.text = text.trim();
    }

    if (options !== undefined) {
      if (!Array.isArray(options) || options.length === 0) {
        return res.status(400).json({ error: 'Options must be a non-empty array' });
      }
      if (!options.every(opt => typeof opt === 'string' && opt.trim())) {
        return res.status(400).json({ error: 'All options must be non-empty strings' });
      }
      question.options = options.map(opt => opt.trim());
    }

    if (correctAnswer !== undefined) {
      if (typeof correctAnswer !== 'string' || correctAnswer.trim() === '') {
        return res.status(400).json({ error: 'Correct answer must be a non-empty string' });
      }
      // Validate that correct answer exists in options (if options were also updated)
      const currentOptions = options !== undefined ? options.map(opt => opt.trim()) : question.options;
      if (!currentOptions.includes(correctAnswer.trim())) {
        return res.status(400).json({ error: 'Correct answer must be one of the provided options' });
      }
      question.correctAnswer = correctAnswer.trim();
    }

    if (marks !== undefined) {
      const parsedMarks = Number(marks);
      if (isNaN(parsedMarks) || parsedMarks < 0) {
        return res.status(400).json({ error: 'Marks must be a non-negative number' });
      }
      question.marks = parsedMarks;
    }

    if (explanation !== undefined) {
      question.explanation = explanation?.trim() || '';
    }

    await question.save();

    console.log('Questions route - Question updated:', {
      questionId,
      user: req.user.username
    });

    res.json({
      message: 'Question updated successfully',
      question: {
        id: question._id,
        text: question.text,
        options: question.options,
        correctAnswer: question.correctAnswer,
        subject: question.subject,
        class: question.class,
        marks: question.marks,
        explanation: question.explanation
      }
    });
  } catch (error) {
    console.error('Questions route - Update Error:', {
      error: error.message,
      questionId,
      user: req.user.username
    });
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: `Validation failed: ${errors.join(', ')}` });
    }
    
    res.status(500).json({ error: 'Server error updating question' });
  }
});

// Delete question - TEACHERS CAN ONLY DELETE THEIR OWN QUESTIONS
router.delete('/:questionId', [auth, validateObjectId('questionId')], async (req, res) => {
  const { questionId } = req.params;
  
  try {
    console.log('Questions route - Deleting question:', {
      questionId,
      user: req.user.username,
      role: req.user.role
    });

    // Find the question first
    const question = await Question.findOne({ _id: questionId, isActive: true });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Authorization check - teachers can only delete their own questions
    if (req.user.role === 'teacher') {
      if (!question.createdBy.equals(req.user.id)) {
        return res.status(403).json({ error: 'You can only delete your own questions' });
      }
    }

    // Soft delete by setting isActive to false
    question.isActive = false;
    await question.save();

    console.log('Questions route - Question deleted:', {
      questionId,
      user: req.user.username
    });

    res.json({ 
      message: 'Question deleted successfully',
      deletedQuestion: {
        id: question._id,
        text: question.text,
        subject: question.subject,
        class: question.class
      }
    });
  } catch (error) {
    console.error('Questions route - Delete Error:', {
      error: error.message,
      questionId,
      user: req.user.username
    });
    res.status(500).json({ error: 'Server error deleting question' });
  }
});

// Bulk create questions - TEACHERS ONLY (THEIR OWN QUESTIONS)
router.post('/bulk', auth, async (req, res) => {
  try {
    const { questions } = req.body;
    
    console.log('Questions route - Bulk creating questions:', {
      count: questions?.length,
      user: req.user.username,
      role: req.user.role
    });

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions must be a non-empty array' });
    }

    // Validate all questions and check authorization for teachers
    const questionsToInsert = [];
    
    for (const qData of questions) {
      const { text, options, correctAnswer, subject, class: className, marks = 1, explanation } = qData;

      // Validate required fields
      if (!text || !options || !correctAnswer || !subject || !className) {
        continue; // Skip invalid entries
      }

      // Authorization check for teachers
      if (req.user.role === 'teacher') {
        if (!req.user.subjects?.some(sub => sub.subject === subject && sub.class === className)) {
          continue; // Skip if teacher not assigned to this subject/class
        }
      }

      // Validate options and correct answer
      if (!Array.isArray(options) || options.length === 0) {
        continue;
      }
      if (!options.every(opt => typeof opt === 'string' && opt.trim())) {
        continue;
      }
      if (!options.includes(correctAnswer)) {
        continue;
      }

      questionsToInsert.push({
        text: text.trim(),
        options: options.map(opt => opt.trim()),
        correctAnswer: correctAnswer.trim(),
        subject,
        class: className,
        marks: Number(marks) || 1,
        explanation: explanation?.trim() || '',
        createdBy: req.user.id,
        isActive: true
      });
    }

    if (questionsToInsert.length === 0) {
      return res.status(400).json({ error: 'No valid questions to create' });
    }

    const result = await Question.insertMany(questionsToInsert);

    console.log('Questions route - Bulk creation successful:', {
      created: result.length,
      user: req.user.username
    });

    res.status(201).json({
      message: `Successfully created ${result.length} questions`,
      createdCount: result.length,
      questions: result.map(q => ({
        id: q._id,
        text: q.text,
        subject: q.subject,
        class: q.class
      }))
    });
  } catch (error) {
    console.error('Questions route - Bulk Create Error:', {
      error: error.message,
      user: req.user.username
    });
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: `Validation failed: ${errors.join(', ')}` });
    }
    
    res.status(500).json({ error: 'Server error creating questions in bulk' });
  }
});

module.exports = router;
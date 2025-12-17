// routes/subjects.js - UPDATED WITH CORE STATUS
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Try to import Subject model
let Subject;
try {
  Subject = require('../models/Subject');
  console.log('✅ Subject model loaded successfully');
} catch (err) {
  console.error('❌ Failed to load Subject model:', err.message);
  // Create a mock Subject model for development
  Subject = class MockSubject {
    static find() { return { sort: () => ({ lean: () => [] }) }; }
    static findOne() { return null; }
    static findById() { return null; }
    static findByIdAndUpdate() { return null; }
    static findByIdAndDelete() { return null; }
    static countDocuments() { return 0; }
    save() { return Promise.resolve(this); }
    populate() { return this; }
  };
}

const Class = require('../models/Class');
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

console.log('✅ SUBJECTS ROUTE: File loaded successfully!');

// Request logging middleware
const logSubjectRequest = (req, res, next) => {
  console.log(`📚 SUBJECTS API - ${req.method} ${req.originalUrl}`, {
    user: req.user?.username,
    role: req.user?.role,
    timestamp: new Date().toISOString()
  });
  next();
};

router.use(logSubjectRequest);

// Validation middleware
const validateObjectId = (req, res, next) => {
  if (req.params.id && !mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      error: 'Invalid subject ID format',
      subjectId: req.params.id
    });
  }
  next();
};

// Health check route
router.get('/health', (req, res) => {
  console.log('✅ GET /api/subjects/health - Health check');
  res.json({
    status: 'OK',
    message: 'Subjects route is healthy',
    timestamp: new Date().toISOString(),
    modelLoaded: !!Subject && Subject.name !== 'MockSubject'
  });
});

// Test route
router.get('/test', (req, res) => {
  console.log('✅ GET /api/subjects/test - Test route hit');
  res.json({ 
    message: 'Subjects route is working!', 
    timestamp: new Date().toISOString(),
    status: 'SUCCESS',
    modelStatus: Subject && Subject.name !== 'MockSubject' ? 'Loaded' : 'Mock'
  });
});

// ──────────────────────────────────────────────────────────────
// 1. GET all subjects with core status
// ──────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    console.log('📚 GET /api/subjects - Fetching all subjects');
    
    if (!Subject || Subject.name === 'MockSubject') {
      const sampleSubjects = [
        { id: '1', name: 'MATHEMATICS', code: 'MATH', category: 'Core', isCore: true, isActive: true },
        { id: '2', name: 'ENGLISH LANGUAGE', code: 'ENG', category: 'Core', isCore: true, isActive: true },
        { id: '3', name: 'PHYSICS', code: 'PHY', category: 'Science', isCore: true, isActive: true },
        { id: '4', name: 'CHEMISTRY', code: 'CHEM', category: 'Science', isCore: true, isActive: true },
        { id: '5', name: 'BIOLOGY', code: 'BIO', category: 'Science', isCore: true, isActive: true },
        { id: '6', name: 'FRENCH', code: 'FRE', category: 'Elective', isCore: false, isActive: true },
        { id: '7', name: 'ECONOMICS', code: 'ECO', category: 'Elective', isCore: false, isActive: true }
      ];
      return res.json(sampleSubjects);
    }
    
    const subjects = await Subject.find({ isActive: true })
      .sort({ name: 1 })
      .lean();
    
    console.log(`📚 Found ${subjects.length} subjects in database`);
    
    const result = subjects.map(s => ({
      id: s._id,
      name: s.name,
      code: s.code,
      category: s.category,
      isCore: s.isCore,
      description: s.description,
      isActive: s.isActive,
      displayName: s.displayName || s.name,
      metadata: s.metadata,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));
    
    return res.json(result);
    
  } catch (err) {
    console.error('❌ GET /subjects error:', err);
    res.status(500).json({
      error: 'Failed to fetch subjects',
      message: err.message,
      subjects: []
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 2. CREATE new subject with core status
// ──────────────────────────────────────────────────────────────
router.post('/', auth, checkPermission('manage_subjects'), async (req, res) => {
  try {
    const { name, code, category = 'Core', isCore = true, description = '' } = req.body;
    
    console.log('📚 POST /api/subjects - Creating subject:', { name, code, category, isCore });
    
    if (!name || name.trim() === '') {
      return res.status(400).json({
        error: 'Subject name is required',
        field: 'name'
      });
    }
    
    if (!Subject || Subject.name === 'MockSubject') {
      console.error('❌ Subject model not loaded properly');
      return res.status(500).json({
        error: 'Subject model not available',
        message: 'Please check if models/Subject.js exists and is properly exported'
      });
    }
    
    const subjectData = {
      name: name.trim().toUpperCase(),
      category,
      isCore: category === 'Core' ? true : isCore,
      description: description.trim(),
      metadata: {
        createdBy: req.user?.id,
        lastModifiedBy: req.user?.id
      }
    };
    
    if (code && code.trim() !== '') {
      subjectData.code = code.trim().toUpperCase();
    }
    
    console.log('📚 Creating subject with data:', subjectData);
    
    const newSubject = new Subject(subjectData);
    await newSubject.save();
    
    console.log('✅ Subject created:', {
      id: newSubject._id,
      name: newSubject.name,
      code: newSubject.code,
      isCore: newSubject.isCore,
      by: req.user?.username
    });
    
    res.status(201).json({
      message: 'Subject created successfully',
      subject: {
        id: newSubject._id,
        name: newSubject.name,
        code: newSubject.code,
        category: newSubject.category,
        isCore: newSubject.isCore,
        description: newSubject.description,
        isActive: newSubject.isActive
      }
    });
  } catch (err) {
    console.error('❌ POST /subjects error:', err);
    
    if (err.code === 11000) {
      return res.status(409).json({
        error: 'Subject already exists',
        details: 'A subject with the same name or code already exists'
      });
    }
    
    res.status(500).json({
      error: 'Failed to create subject',
      details: err.message,
      code: err.code
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 3. UPDATE subject with core status
// ──────────────────────────────────────────────────────────────
router.put('/:id', auth, checkPermission('manage_subjects'), validateObjectId, async (req, res) => {
  try {
    const { name, code, category, isCore, description, isActive } = req.body;
    
    console.log('📚 PUT /api/subjects/:id - Updating subject:', req.params.id);
    
    if (!Subject || Subject.name === 'MockSubject') {
      return res.status(500).json({
        error: 'Subject model not available'
      });
    }
    
    const updates = {};
    if (name !== undefined) updates.name = name.trim().toUpperCase();
    if (code !== undefined) updates.code = code.trim().toUpperCase();
    if (category !== undefined) updates.category = category;
    if (isCore !== undefined) updates.isCore = Boolean(isCore);
    if (description !== undefined) updates.description = description.trim();
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    
    // Ensure Core category subjects are always core
    if (category === 'Core') {
      updates.isCore = true;
    }
    
    updates.metadata = {
      lastModifiedBy: req.user?.id,
      lastModifiedAt: new Date()
    };
    
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!subject) {
      return res.status(404).json({
        error: 'Subject not found',
        subjectId: req.params.id
      });
    }
    
    console.log('✅ Subject updated:', {
      id: subject._id,
      name: subject.name,
      isCore: subject.isCore,
      by: req.user?.username
    });
    
    res.json({
      message: 'Subject updated successfully',
      subject: {
        id: subject._id,
        name: subject.name,
        code: subject.code,
        category: subject.category,
        isCore: subject.isCore,
        description: subject.description,
        isActive: subject.isActive
      }
    });
  } catch (err) {
    console.error('❌ PUT /subjects/:id error:', err);
    
    if (err.code === 11000) {
      return res.status(409).json({
        error: 'Subject already exists',
        details: 'Another subject with the same name or code exists'
      });
    }
    
    res.status(500).json({
      error: 'Failed to update subject',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 4. DELETE subject (HARD DELETE)
// ──────────────────────────────────────────────────────────────
router.delete('/:id', auth, checkPermission('manage_subjects'), validateObjectId, async (req, res) => {
  try {
    if (!Subject || Subject.name === 'MockSubject') {
      return res.status(500).json({
        error: 'Subject model not available'
      });
    }
    
    const subject = await Subject.findById(req.params.id);
    
    if (!subject) {
      return res.status(404).json({
        error: 'Subject not found',
        subjectId: req.params.id
      });
    }
    
    // HARD DELETE - Remove from database completely
    await Subject.findByIdAndDelete(req.params.id);
    
    console.log('✅ Subject permanently deleted:', {
      id: subject._id,
      name: subject.name,
      by: req.user?.username
    });
    
    res.json({
      message: 'Subject permanently deleted successfully',
      deletedSubject: {
        id: subject._id,
        name: subject.name,
        code: subject.code,
        isCore: subject.isCore
      }
    });
  } catch (err) {
    console.error('❌ DELETE /subjects/:id error:', err);
    res.status(500).json({
      error: 'Failed to delete subject',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 5. GET subjects for class assignment (with usage info)
// ──────────────────────────────────────────────────────────────
router.get('/for-class-assignment', auth, checkPermission('manage_subjects'), async (req, res) => {
  try {
    console.log('📚 GET /api/subjects/for-class-assignment - Fetching subjects for assignment');
    
    if (!Subject || Subject.name === 'MockSubject') {
      const sampleSubjects = [
        { id: '1', name: 'MATHEMATICS', code: 'MATH', category: 'Core', isCore: true, assignedToClasses: 0 },
        { id: '2', name: 'ENGLISH LANGUAGE', code: 'ENG', category: 'Core', isCore: true, assignedToClasses: 0 },
        { id: '3', name: 'PHYSICS', code: 'PHY', category: 'Science', isCore: true, assignedToClasses: 0 },
        { id: '4', name: 'CHEMISTRY', code: 'CHEM', category: 'Science', isCore: true, assignedToClasses: 0 },
        { id: '5', name: 'BIOLOGY', code: 'BIO', category: 'Science', isCore: true, assignedToClasses: 0 },
        { id: '6', name: 'FRENCH', code: 'FRE', category: 'Elective', isCore: false, assignedToClasses: 0 },
        { id: '7', name: 'ECONOMICS', code: 'ECO', category: 'Elective', isCore: false, assignedToClasses: 0 }
      ];
      return res.json({
        subjects: sampleSubjects,
        total: sampleSubjects.length,
        summary: { core: 5, elective: 2, other: 0 }
      });
    }
    
    const subjects = await Subject.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    // Get class assignments for each subject
    const subjectsWithAssignments = await Promise.all(
      subjects.map(async (subject) => {
        const classAssignments = await Class.countDocuments({ 
          'subjectAssignments.subject': subject._id 
        });
        
        return {
          id: subject._id,
          name: subject.name,
          code: subject.code,
          category: subject.category,
          isCore: subject.isCore,
          description: subject.description,
          assignedToClasses: classAssignments,
          displayName: subject.displayName || subject.name
        };
      })
    );

    res.json({
      subjects: subjectsWithAssignments,
      total: subjectsWithAssignments.length,
      summary: {
        core: subjectsWithAssignments.filter(s => s.isCore).length,
        elective: subjectsWithAssignments.filter(s => !s.isCore).length,
        byCategory: subjectsWithAssignments.reduce((acc, subject) => {
          const category = subject.category || 'Other';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {})
      }
    });
  } catch (err) {
    console.error('❌ GET /subjects/for-class-assignment error:', err);
    res.status(500).json({
      error: 'Failed to fetch subjects for assignment',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 6. GET subject by ID
// ──────────────────────────────────────────────────────────────
router.get('/:id', auth, validateObjectId, async (req, res) => {
  try {
    if (!Subject || Subject.name === 'MockSubject') {
      return res.status(404).json({
        error: 'Subject model not available'
      });
    }
    
    const subject = await Subject.findById(req.params.id);
    
    if (!subject) {
      return res.status(404).json({
        error: 'Subject not found',
        subjectId: req.params.id
      });
    }
    
    res.json({
      subject: {
        id: subject._id,
        name: subject.name,
        code: subject.code,
        category: subject.category,
        isCore: subject.isCore,
        description: subject.description,
        isActive: subject.isActive,
        displayName: subject.displayName || subject.name
      },
      message: 'Subject retrieved successfully'
    });
  } catch (err) {
    console.error('❌ GET /subjects/:id error:', err);
    res.status(500).json({
      error: 'Failed to retrieve subject',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 7. REACTIVATE deactivated subject
// ──────────────────────────────────────────────────────────────
router.patch('/:id/reactivate', auth, checkPermission('manage_subjects'), validateObjectId, async (req, res) => {
  try {
    if (!Subject || Subject.name === 'MockSubject') {
      return res.status(500).json({
        error: 'Subject model not available'
      });
    }
    
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      {
        isActive: true,
        $push: {
          'metadata.notes': `Reactivated by ${req.user?.username} on ${new Date().toLocaleDateString()}`
        }
      },
      { new: true, runValidators: true }
    );
    
    if (!subject) {
      return res.status(404).json({
        error: 'Subject not found',
        subjectId: req.params.id
      });
    }
    
    console.log('✅ Subject reactivated:', {
      id: subject._id,
      name: subject.name,
      by: req.user?.username
    });
    
    res.json({
      message: 'Subject reactivated successfully',
      subject: {
        id: subject._id,
        name: subject.name,
        code: subject.code,
        isCore: subject.isCore,
        isActive: subject.isActive
      }
    });
  } catch (err) {
    console.error('❌ PATCH /subjects/:id/reactivate error:', err);
    res.status(500).json({
      error: 'Failed to reactivate subject',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 8. GET subjects by category
// ──────────────────────────────────────────────────────────────
router.get('/category/:category', auth, async (req, res) => {
  try {
    const { category } = req.params;
    
    if (!Subject || Subject.name === 'MockSubject') {
      const sampleSubjects = [
        { id: '1', name: 'MATHEMATICS', code: 'MATH', category: 'Core', isCore: true },
        { id: '2', name: 'ENGLISH LANGUAGE', code: 'ENG', category: 'Core', isCore: true }
      ];
      return res.json({
        category,
        subjects: sampleSubjects,
        total: sampleSubjects.length
      });
    }
    
    const subjects = await Subject.find({ 
      category: category,
      isActive: true 
    }).sort({ name: 1 });
    
    const formattedSubjects = subjects.map(s => ({
      id: s._id,
      name: s.name,
      code: s.code,
      category: s.category,
      isCore: s.isCore,
      description: s.description,
      isActive: s.isActive,
      displayName: s.displayName || s.name
    }));
    
    res.json({
      category,
      subjects: formattedSubjects,
      total: formattedSubjects.length
    });
  } catch (err) {
    console.error('❌ GET /subjects/category/:category error:', err);
    res.status(500).json({
      error: 'Failed to fetch subjects by category',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 9. NEW: Toggle subject core status
// ──────────────────────────────────────────────────────────────
router.patch('/:id/toggle-core', auth, checkPermission('manage_subjects'), validateObjectId, async (req, res) => {
  try {
    if (!Subject || Subject.name === 'MockSubject') {
      return res.status(500).json({
        error: 'Subject model not available'
      });
    }
    
    const subject = await Subject.findById(req.params.id);
    
    if (!subject) {
      return res.status(404).json({
        error: 'Subject not found',
        subjectId: req.params.id
      });
    }
    
    // Don't allow toggling core status for Core category subjects
    if (subject.category === 'Core') {
      return res.status(400).json({
        error: 'Core category subjects cannot be made elective',
        message: 'Change category first to toggle core status'
      });
    }
    
    subject.isCore = !subject.isCore;
    subject.metadata.lastModifiedBy = req.user?.id;
    subject.metadata.lastModifiedAt = new Date();
    
    await subject.save();
    
    console.log('✅ Subject core status toggled:', {
      id: subject._id,
      name: subject.name,
      isCore: subject.isCore,
      by: req.user?.username
    });
    
    res.json({
      message: `Subject marked as ${subject.isCore ? 'Core' : 'Elective'} successfully`,
      subject: {
        id: subject._id,
        name: subject.name,
        code: subject.code,
        category: subject.category,
        isCore: subject.isCore,
        description: subject.description
      }
    });
  } catch (err) {
    console.error('❌ PATCH /subjects/:id/toggle-core error:', err);
    res.status(500).json({
      error: 'Failed to toggle subject core status',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 10. NEW: Get core subjects only
// ──────────────────────────────────────────────────────────────
router.get('/core', auth, async (req, res) => {
  try {
    if (!Subject || Subject.name === 'MockSubject') {
      const sampleSubjects = [
        { id: '1', name: 'MATHEMATICS', code: 'MATH', category: 'Core', isCore: true },
        { id: '2', name: 'ENGLISH LANGUAGE', code: 'ENG', category: 'Core', isCore: true },
        { id: '3', name: 'PHYSICS', code: 'PHY', category: 'Science', isCore: true }
      ];
      return res.json({
        subjects: sampleSubjects,
        total: sampleSubjects.length
      });
    }
    
    const subjects = await Subject.find({ 
      isCore: true,
      isActive: true 
    }).sort({ name: 1 });
    
    const formattedSubjects = subjects.map(s => ({
      id: s._id,
      name: s.name,
      code: s.code,
      category: s.category,
      isCore: s.isCore,
      description: s.description,
      displayName: s.displayName || s.name
    }));
    
    res.json({
      subjects: formattedSubjects,
      total: formattedSubjects.length,
      message: `Found ${formattedSubjects.length} core subjects`
    });
  } catch (err) {
    console.error('❌ GET /subjects/core error:', err);
    res.status(500).json({
      error: 'Failed to fetch core subjects',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 11. NEW: Get elective subjects only
// ──────────────────────────────────────────────────────────────
router.get('/elective', auth, async (req, res) => {
  try {
    if (!Subject || Subject.name === 'MockSubject') {
      const sampleSubjects = [
        { id: '6', name: 'FRENCH', code: 'FRE', category: 'Elective', isCore: false },
        { id: '7', name: 'ECONOMICS', code: 'ECO', category: 'Elective', isCore: false }
      ];
      return res.json({
        subjects: sampleSubjects,
        total: sampleSubjects.length
      });
    }
    
    const subjects = await Subject.find({ 
      isCore: false,
      isActive: true 
    }).sort({ name: 1 });
    
    const formattedSubjects = subjects.map(s => ({
      id: s._id,
      name: s.name,
      code: s.code,
      category: s.category,
      isCore: s.isCore,
      description: s.description,
      displayName: s.displayName || s.name
    }));
    
    res.json({
      subjects: formattedSubjects,
      total: formattedSubjects.length,
      message: `Found ${formattedSubjects.length} elective subjects`
    });
  } catch (err) {
    console.error('❌ GET /subjects/elective error:', err);
    res.status(500).json({
      error: 'Failed to fetch elective subjects',
      details: err.message
    });
  }
});

// ──────────────────────────────────────────────────────────────
// 12. Sample data endpoint (for development only)
// ──────────────────────────────────────────────────────────────
router.get('/sample/data', (req, res) => {
  console.log('✅ GET /api/subjects/sample/data - Sample data route hit');
  const sampleData = [
    { id: '1', name: 'MATHEMATICS', code: 'MATH', category: 'Core', isCore: true, description: 'Mathematics subject' },
    { id: '2', name: 'ENGLISH LANGUAGE', code: 'ENG', category: 'Core', isCore: true, description: 'English Language subject' },
    { id: '3', name: 'PHYSICS', code: 'PHY', category: 'Science', isCore: true, description: 'Physics subject' },
    { id: '4', name: 'CHEMISTRY', code: 'CHEM', category: 'Science', isCore: true, description: 'Chemistry subject' },
    { id: '5', name: 'BIOLOGY', code: 'BIO', category: 'Science', isCore: true, description: 'Biology subject' },
    { id: '6', name: 'FRENCH', code: 'FRE', category: 'Elective', isCore: false, description: 'French language' },
    { id: '7', name: 'ECONOMICS', code: 'ECO', category: 'Elective', isCore: false, description: 'Economics subject' },
    { id: '8', name: 'GEOGRAPHY', code: 'GEO', category: 'Social Sciences', isCore: true, description: 'Geography subject' },
    { id: '9', name: 'HISTORY', code: 'HIS', category: 'Social Sciences', isCore: true, description: 'History subject' },
    { id: '10', name: 'COMPUTER SCIENCE', code: 'COMP', category: 'Science', isCore: false, description: 'Computer Science subject' }
  ];
  res.json(sampleData);
});

console.log('✅ SUBJECTS ROUTE: All routes defined successfully!');

module.exports = router;
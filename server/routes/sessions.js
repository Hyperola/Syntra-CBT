const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Session = require('../models/Session');
const AcademicRecord = require('../models/AcademicRecord');
const Test = require('../models/Test');
const { auth } = require('../middleware/auth');

// Input validation middleware
const validateSessionInput = (req, res, next) => {
  const { sessionName, isActive, startDate, endDate } = req.body;

  if (!sessionName || typeof sessionName !== 'string') {
    return res.status(400).json({ 
      error: 'Session name is required and must be a string',
      field: 'sessionName'
    });
  }

  const sessionNameRegex = /^\d{4}\/\d{4}$/;
  if (!sessionName.match(sessionNameRegex)) {
    return res.status(400).json({ 
      error: 'Session must be in format: YYYY/YYYY',
      example: '2024/2025',
      field: 'sessionName'
    });
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format. Use ISO format (YYYY-MM-DD)',
        field: 'startDate|endDate'
      });
    }

    if (start >= end) {
      return res.status(400).json({ 
        error: 'Start date must be before end date',
        field: 'startDate|endDate'
      });
    }
  }

  req.body.sessionName = sessionName.trim();
  if (typeof isActive === 'string') {
    req.body.isActive = isActive === 'true';
  }

  next();
};

// Check for duplicate sessions
const checkDuplicateSession = async (req, res, next) => {
  try {
    const { sessionName } = req.body;
    const { id } = req.params;

    const query = { sessionName: sessionName.trim() };
    if (id) {
      query._id = { $ne: id };
    }

    const existingSession = await Session.findOne(query);
    if (existingSession) {
      return res.status(409).json({ 
        error: 'Session with this name already exists',
        existingSessionId: existingSession._id,
        field: 'sessionName'
      });
    }

    next();
  } catch (error) {
    console.error('Duplicate session check error:', error);
    res.status(500).json({ error: 'Server error during validation' });
  }
};

// Validate term input
const validateTermInput = (req, res, next) => {
  const { startDate, endDate } = req.body;

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format. Use ISO format (YYYY-MM-DD)',
        field: 'startDate|endDate'
      });
    }

    if (start >= end) {
      return res.status(400).json({ 
        error: 'Start date must be before end date',
        field: 'startDate|endDate'
      });
    }
  }

  next();
};

// Admin authorization middleware
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ 
      error: 'Admin access required',
      userRole: req.user.role,
      requiredRoles: ['admin', 'super_admin']
    });
  }

  next();
};

// ==================== ROUTES ====================

// Get all sessions with pagination and filtering
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      isActive, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      search 
    } = req.query;

    const skip = (page - 1) * limit;
    
    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    if (search) {
      filter.sessionName = { $regex: search, $options: 'i' };
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [sessions, total, activeCount, inactiveCount] = await Promise.all([
      Session.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v')
        .lean(),
      Session.countDocuments(filter),
      Session.countDocuments({ isActive: true }),
      Session.countDocuments({ isActive: false })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      sessions,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalSessions: total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        activeCount,
        inactiveCount
      },
      filters: {
        isActive: isActive || 'all',
        search: search || '',
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('GET /api/sessions - Error:', error);
    res.status(500).json({ 
      error: 'Server error fetching sessions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get active session and term
router.get('/active', auth, async (req, res) => {
  try {
    const activeSession = await Session.findOne({ isActive: true });
    
    if (!activeSession) {
      return res.status(404).json({ 
        error: 'No active session found',
        suggestion: 'Please set a session as active in the system'
      });
    }

    const activeTermInfo = await Session.getActiveTerm();

    res.json({
      session: activeSession,
      activeTerm: activeTermInfo,
      message: 'Active session and term retrieved successfully'
    });

  } catch (error) {
    console.error('GET /api/sessions/active - Error:', error);
    res.status(500).json({ error: 'Server error fetching active session' });
  }
});

// GET /api/sessions/promotion-status - FIXED VERSION
router.get('/promotion-status', auth, async (req, res) => {
  try {
    console.log('🔍 Checking promotion status...');
    
    const active = await Session.getActiveTerm();
    console.log('📊 Active term result:', active);
    
    if (!active) {
      return res.json({
        canPromote: false,
        activeTerm: null,
        session: null,
        promotionCompleted: false,
        message: 'No active session or term found. Please set up an active session first.'
      });
    }

    const sessionDoc = await Session.findOne({ 
      sessionName: active.session,
      isActive: true 
    });

    console.log('📊 Session document found:', {
      sessionName: active.session,
      sessionDocExists: !!sessionDoc,
      promotionCompleted: sessionDoc?.promotionCompleted
    });

    const canPromote = !!active && active.term === 'Third Term' && !sessionDoc?.promotionCompleted;
    
    let message = '';
    if (!active) {
      message = 'No active session found';
    } else if (active.term !== 'Third Term') {
      message = `Promotion is only available during Third Term (Current: ${active.term})`;
    } else if (sessionDoc?.promotionCompleted) {
      message = `Promotion has already been completed for session ${active.session}`;
    } else {
      message = 'Ready for promotion';
    }

    res.json({
      canPromote,
      activeTerm: active?.term || null,
      session: active?.session || null,
      promotionCompleted: sessionDoc?.promotionCompleted || false,
      message,
      details: {
        hasActiveSession: !!active,
        hasActiveTerm: !!active?.term,
        isThirdTerm: active?.term === 'Third Term',
        promotionLocked: sessionDoc?.promotionCompleted || false
      }
    });

  } catch (error) {
    console.error('❌ GET /api/sessions/promotion-status - Error:', error);
    res.status(500).json({ 
      error: 'Server error checking promotion status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get session by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        error: 'Invalid session ID format',
        field: 'id'
      });
    }

    const session = await Session.findById(id);
    
    if (!session) {
      return res.status(404).json({ 
        error: 'Session not found',
        sessionId: id
      });
    }

    // Get session statistics
    const [academicRecordsCount, testsCount] = await Promise.all([
      AcademicRecord.countDocuments({ session: session.sessionName }),
      Test.countDocuments({ session: session.sessionName })
    ]);

    const sessionWithStats = {
      ...session.toObject(),
      statistics: {
        academicRecords: academicRecordsCount,
        tests: testsCount,
        isDeletable: academicRecordsCount === 0 && testsCount === 0
      }
    };

    res.json({
      session: sessionWithStats,
      message: 'Session retrieved successfully'
    });

  } catch (error) {
    console.error('GET /api/sessions/:id - Error:', error);
    res.status(500).json({ error: 'Server error fetching session' });
  }
});

// Create new session (automatically creates 3 terms)
router.post('/', auth, requireAdmin, validateSessionInput, checkDuplicateSession, async (req, res) => {
  try {
    const { sessionName, isActive = false, startDate, endDate, description } = req.body;

    console.log('POST /api/sessions - Creating session:', { 
      sessionName, 
      isActive,
      user: req.user.username 
    });

    // If setting as active, deactivate all other sessions
    if (isActive) {
      await Session.updateMany(
        { isActive: true },
        { isActive: false }
      );
      console.log('Deactivated all other sessions for new active session');
    }

    // Create new session (terms will be automatically created by pre-save middleware)
    const newSession = new Session({
      sessionName,
      isActive,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      description,
      createdBy: req.user.id
    });

    await newSession.save();

    console.log('POST /api/sessions - Success:', { 
      sessionId: newSession._id,
      sessionName: newSession.sessionName,
      termsCreated: newSession.terms.length,
      terms: newSession.terms.map(t => t.name)
    });

    res.status(201).json({
      message: 'Session created successfully with all three terms',
      session: newSession,
      terms: newSession.terms,
      action: isActive ? 'New session set as active' : 'Session created (inactive)'
    });

  } catch (error) {
    console.error('POST /api/sessions - Error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors 
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Session with this name already exists',
        field: 'sessionName'
      });
    }

    res.status(500).json({ 
      error: 'Server error creating session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update session
router.put('/:id', auth, requireAdmin, validateSessionInput, checkDuplicateSession, async (req, res) => {
  try {
    const { id } = req.params;
    const { sessionName, isActive, startDate, endDate, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    const existingSession = await Session.findById(id);
    
    if (!existingSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // If setting as active, deactivate all other sessions
    if (isActive && !existingSession.isActive) {
      await Session.updateMany(
        { _id: { $ne: id }, isActive: true },
        { isActive: false }
      );
      console.log(`Deactivated other sessions, activating: ${sessionName}`);
    }

    // Update session fields
    existingSession.sessionName = sessionName;
    existingSession.isActive = isActive;
    if (startDate) existingSession.startDate = new Date(startDate);
    if (endDate) existingSession.endDate = new Date(endDate);
    if (description !== undefined) existingSession.description = description;
    existingSession.updatedBy = req.user.id;

    await existingSession.save();

    res.json({
      message: 'Session updated successfully',
      session: existingSession,
      action: isActive ? 'Session set as active' : 'Session updated'
    });

  } catch (error) {
    console.error('PUT /api/sessions/:id - Error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors 
      });
    }

    res.status(500).json({ error: 'Server error updating session' });
  }
});

// Set session as active - FIXED VERSION with term deactivation
router.patch('/:id/activate', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 ACTIVATE SESSION - Session ID:', id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    const targetSession = await Session.findById(id);
    
    if (!targetSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    console.log('🔍 ACTIVATE SESSION - Found session:', {
      id: targetSession._id,
      sessionName: targetSession.sessionName,
      isActive: targetSession.isActive,
      termsCount: targetSession.terms?.length,
      terms: targetSession.terms?.map(t => ({ name: t.name, isActive: t.isActive, sequence: t.sequence }))
    });

    if (targetSession.isActive) {
      return res.status(400).json({ error: 'Session is already active' });
    }

    // Check if session has all required terms
    if (!targetSession.terms || targetSession.terms.length !== 3) {
      console.log('⚠️ Session missing terms, attempting to fix...');
      const termsFixed = targetSession.fixTerms();
      if (termsFixed) {
        await targetSession.save();
        console.log('✅ Fixed session terms:', targetSession.terms.map(t => t.name));
      } else {
        return res.status(400).json({ 
          error: 'Session is missing required terms',
          suggestion: 'Please ensure the session has First, Second, and Third terms'
        });
      }
    }

    // CRITICAL FIX: Find and deactivate all terms in currently active session
    console.log('🔍 ACTIVATE SESSION - Finding and deactivating terms in currently active session...');
    const activeSession = await Session.findOne({ isActive: true });
    
    if (activeSession) {
      console.log('🔍 Currently active session found:', {
        sessionName: activeSession.sessionName,
        activeTerms: activeSession.terms.filter(t => t.isActive).map(t => t.name)
      });
      
      // Deactivate all terms in the old active session
      let termsDeactivated = false;
      activeSession.terms.forEach(term => {
        if (term.isActive) {
          term.isActive = false;
          termsDeactivated = true;
        }
      });
      
      if (termsDeactivated) {
        await activeSession.save();
        console.log('✅ Deactivated all terms in old active session');
      } else {
        console.log('ℹ️ No active terms found in old session');
      }
    }

    // Deactivate all other sessions
    console.log('🔍 ACTIVATE SESSION - Deactivating other sessions...');
    const deactivateResult = await Session.updateMany(
      { _id: { $ne: id }, isActive: true },
      { isActive: false }
    );
    console.log('🔍 ACTIVATE SESSION - Deactivated sessions:', deactivateResult.modifiedCount);

    // CRITICAL FIX: Deactivate all terms in the target session before activation
    console.log('🔍 ACTIVATE SESSION - Deactivating all terms in target session...');
    let targetTermsDeactivated = false;
    targetSession.terms.forEach(term => {
      if (term.isActive) {
        term.isActive = false;
        targetTermsDeactivated = true;
      }
    });
    
    if (targetTermsDeactivated) {
      console.log('✅ Deactivated previously active terms in target session');
    }

    // Activate target session
    console.log('🔍 ACTIVATE SESSION - Activating target session...');
    targetSession.isActive = true;
    targetSession.updatedBy = req.user.id;

    await targetSession.save();

    console.log('✅ ACTIVATE SESSION - Successfully activated:', {
      sessionName: targetSession.sessionName,
      sessionActive: targetSession.isActive,
      termsStatus: targetSession.terms.map(t => ({ name: t.name, isActive: t.isActive }))
    });

    res.json({
      message: 'Session activated successfully',
      session: targetSession,
      previousActiveSessionsDeactivated: deactivateResult.modifiedCount > 0,
      termsStatus: {
        message: 'All terms have been deactivated. Please activate a specific term.',
        terms: targetSession.terms.map(t => ({ 
          name: t.name, 
          isActive: t.isActive 
        }))
      }
    });

  } catch (error) {
    console.error('❌ ACTIVATE SESSION - Error:', error);
    console.error('❌ ACTIVATE SESSION - Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed during activation',
        details: errors 
      });
    }
    
    if (error.message.includes('terms')) {
      return res.status(400).json({ 
        error: 'Session term configuration error',
        suggestion: 'Check if the session has all three terms properly configured'
      });
    }

    res.status(500).json({ 
      error: 'Server error activating session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Activate a term in a session - FIXED VERSION
router.patch('/:id/terms/:termName/activate', auth, requireAdmin, async (req, res) => {
  try {
    const { id, termName } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    const validTerms = ['First Term', 'Second Term', 'Third Term'];
    if (!validTerms.includes(termName)) {
      return res.status(400).json({ 
        error: 'Invalid term name',
        validTerms: validTerms
      });
    }

    const targetSession = await Session.findById(id);
    
    if (!targetSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!targetSession.isActive) {
      return res.status(400).json({ 
        error: 'Session is not active',
        suggestion: 'Activate the session first before activating a term'
      });
    }

    console.log('🔍 ACTIVATE TERM - Before activation:', {
      sessionName: targetSession.sessionName,
      targetTerm: termName,
      currentTerms: targetSession.terms.map(t => ({ name: t.name, isActive: t.isActive }))
    });

    // CRITICAL FIX: Check if there's another active session with active terms
    const otherActiveSession = await Session.findOne({
      _id: { $ne: id },
      isActive: true,
      'terms.isActive': true
    });

    if (otherActiveSession) {
      console.log('⚠️ Found another active session with active terms:', {
        sessionName: otherActiveSession.sessionName,
        activeTerms: otherActiveSession.terms.filter(t => t.isActive).map(t => t.name)
      });
      
      // Deactivate all terms in the other active session
      otherActiveSession.terms.forEach(term => {
        term.isActive = false;
      });
      await otherActiveSession.save();
      console.log('✅ Deactivated terms in other active session');
    }

    // Activate the term using the instance method
    await targetSession.activateTerm(termName);

    console.log('✅ ACTIVATE TERM - After activation:', {
      sessionName: targetSession.sessionName,
      targetTerm: termName,
      currentTerms: targetSession.terms.map(t => ({ name: t.name, isActive: t.isActive }))
    });

    res.json({
      message: `Term ${termName} activated successfully`,
      session: {
        id: targetSession._id,
        sessionName: targetSession.sessionName,
        isActive: targetSession.isActive
      },
      activeTerm: termName,
      allTerms: targetSession.terms.map(term => ({
        name: term.name,
        isActive: term.isActive,
        sequence: term.sequence
      }))
    });

  } catch (error) {
    console.error('❌ PATCH /api/sessions/:id/terms/:termName/activate - Error:', error);
    res.status(500).json({ 
      error: error.message || 'Server error activating term',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Fix session terms (emergency endpoint)
router.patch('/:id/fix-terms', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    const session = await Session.findById(id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    console.log('🔧 FIXING TERMS - Before:', {
      termsCount: session.terms?.length,
      terms: session.terms?.map(t => t.name)
    });

    // Use the instance method to fix terms
    const termsFixed = session.fixTerms();

    if (termsFixed) {
      await session.save();
      console.log('✅ FIXING TERMS - After:', {
        termsCount: session.terms.length,
        terms: session.terms.map(t => t.name)
      });

      res.json({
        message: 'Session terms fixed successfully',
        termsFixed: true,
        session: {
          id: session._id,
          sessionName: session.sessionName,
          terms: session.terms
        }
      });
    } else {
      res.json({
        message: 'No terms needed fixing',
        termsFixed: false,
        session: {
          id: session._id,
          sessionName: session.sessionName,
          terms: session.terms
        }
      });
    }

  } catch (error) {
    console.error('Error fixing terms:', error);
    res.status(500).json({ error: 'Failed to fix session terms' });
  }
});

// Update term dates
router.put('/:id/terms/:termName', auth, requireAdmin, validateTermInput, async (req, res) => {
  try {
    const { id, termName } = req.params;
    const { startDate, endDate } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    const validTerms = ['First Term', 'Second Term', 'Third Term'];
    if (!validTerms.includes(termName)) {
      return res.status(400).json({ 
        error: 'Invalid term name',
        validTerms: validTerms
      });
    }

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const termIndex = session.terms.findIndex(term => term.name === termName);
    if (termIndex === -1) {
      return res.status(404).json({ 
        error: 'Term not found in session',
        sessionTerms: session.terms.map(t => t.name)
      });
    }

    // Update term dates
    if (startDate) session.terms[termIndex].startDate = new Date(startDate);
    if (endDate) session.terms[termIndex].endDate = new Date(endDate);

    session.updatedBy = req.user.id;
    await session.save();

    res.json({
      message: `Term ${termName} dates updated successfully`,
      term: session.terms[termIndex],
      session: {
        id: session._id,
        sessionName: session.sessionName
      }
    });

  } catch (error) {
    console.error('PUT /api/sessions/:id/terms/:termName - Error:', error);
    res.status(500).json({ error: 'Server error updating term dates' });
  }
});

// Get specific term details
router.get('/:id/terms/:termName', auth, async (req, res) => {
  try {
    const { id, termName } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    const validTerms = ['First Term', 'Second Term', 'Third Term'];
    if (!validTerms.includes(termName)) {
      return res.status(400).json({ 
        error: 'Invalid term name',
        validTerms: validTerms
      });
    }

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const term = session.terms.find(t => t.name === termName);
    if (!term) {
      return res.status(404).json({ error: 'Term not found in session' });
    }

    // Get term statistics
    const [academicRecordsCount, testsCount] = await Promise.all([
      AcademicRecord.countDocuments({ 
        session: session.sessionName,
        term: termName 
      }),
      Test.countDocuments({ 
        session: session.sessionName,
        term: termName 
      })
    ]);

    res.json({
      term: {
        ...term.toObject(),
        statistics: {
          academicRecords: academicRecordsCount,
          tests: testsCount
        }
      },
      session: {
        id: session._id,
        sessionName: session.sessionName,
        isActive: session.isActive
      }
    });

  } catch (error) {
    console.error('GET /api/sessions/:id/terms/:termName - Error:', error);
    res.status(500).json({ error: 'Server error fetching term details' });
  }
});

// Get all terms for a session
router.get('/:id/terms', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get statistics for each term
    const termsWithStats = await Promise.all(
      session.terms.map(async (term) => {
        const [academicRecordsCount, testsCount] = await Promise.all([
          AcademicRecord.countDocuments({ 
            session: session.sessionName,
            term: term.name 
          }),
          Test.countDocuments({ 
            session: session.sessionName,
            term: term.name 
          })
        ]);

        return {
          ...term.toObject(),
          statistics: {
            academicRecords: academicRecordsCount,
            tests: testsCount
          }
        };
      })
    );

    res.json({
      session: {
        id: session._id,
        sessionName: session.sessionName,
        isActive: session.isActive
      },
      terms: termsWithStats
    });

  } catch (error) {
    console.error('GET /api/sessions/:id/terms - Error:', error);
    res.status(500).json({ error: 'Server error fetching session terms' });
  }
});

// Delete session with force option
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    const targetSession = await Session.findById(id);
    
    if (!targetSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if session has dependencies
    const [academicRecordsCount, testsCount] = await Promise.all([
      AcademicRecord.countDocuments({ session: targetSession.sessionName }),
      Test.countDocuments({ session: targetSession.sessionName })
    ]);

    const hasDependencies = academicRecordsCount > 0 || testsCount > 0;

    if (hasDependencies && !force) {
      return res.status(409).json({
        error: 'Cannot delete session with existing data',
        dependencies: {
          academicRecords: academicRecordsCount,
          tests: testsCount
        },
        message: 'Session has associated academic records and/or tests. Use force=true to delete anyway.',
        forceDeleteAvailable: true
      });
    }

    // If force delete, remove associated data first
    if (hasDependencies && force) {
      console.log(`Force deleting session ${targetSession.sessionName}, removing associated data...`);
      
      // Delete associated academic records
      const deletedRecords = await AcademicRecord.deleteMany({ 
        session: targetSession.sessionName 
      });
      
      // Delete associated tests
      const deletedTests = await Test.deleteMany({ 
        session: targetSession.sessionName 
      });
      
      console.log(`Force delete removed: ${deletedRecords.deletedCount} academic records, ${deletedTests.deletedCount} tests`);
    }

    await Session.findByIdAndDelete(id);

    res.json({
      message: 'Session deleted successfully',
      deletedSession: {
        id: targetSession._id,
        sessionName: targetSession.sessionName
      },
      dependenciesRemoved: hasDependencies ? {
        academicRecords: academicRecordsCount,
        tests: testsCount
      } : null,
      forceDeleted: hasDependencies
    });

  } catch (error) {
    console.error('DELETE /api/sessions/:id - Error:', error);
    res.status(500).json({ error: 'Server error deleting session' });
  }
});

// Debug endpoint to check term status
router.get('/debug/term-status', auth, async (req, res) => {
  try {
    const allSessions = await Session.find({});
    
    const sessionStatus = allSessions.map(session => ({
      sessionName: session.sessionName,
      isActive: session.isActive,
      terms: session.terms.map(term => ({
        name: term.name,
        isActive: term.isActive,
        sequence: term.sequence
      }))
    }));

    // Find truly active session and term
    const activeSession = sessionStatus.find(s => s.isActive);
    let activeTerm = null;
    
    if (activeSession) {
      const term = activeSession.terms.find(t => t.isActive);
      if (term) {
        activeTerm = {
          session: activeSession.sessionName,
          term: term.name
        };
      }
    }

    // Use the getActiveTerm static method
    const staticActiveTerm = await Session.getActiveTerm();

    res.json({
      allSessions: sessionStatus,
      activeSession: activeSession ? activeSession.sessionName : null,
      activeTerm: activeTerm,
      staticMethodResult: staticActiveTerm,
      message: activeTerm 
        ? `Active: ${activeTerm.session} - ${activeTerm.term}`
        : 'No active term found',
      debug: {
        totalSessions: allSessions.length,
        activeSessions: sessionStatus.filter(s => s.isActive).length,
        sessionsWithActiveTerms: sessionStatus.filter(s => 
          s.terms.some(t => t.isActive)
        ).length
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: 'Debug failed' });
  }
});

// Emergency cleanup endpoint for tests
router.delete('/tests/emergency/cleanup', auth, requireAdmin, async (req, res) => {
  try {
    const { sessionName } = req.body;
    
    if (!sessionName) {
      return res.status(400).json({ error: 'Session name is required' });
    }

    // Delete all tests for this session
    const result = await Test.deleteMany({ session: sessionName });
    
    console.log(`Emergency cleanup: Deleted ${result.deletedCount} tests for session ${sessionName}`);
    
    res.json({
      message: 'Emergency cleanup completed',
      deletedTests: result.deletedCount,
      session: sessionName
    });
  } catch (error) {
    console.error('Emergency cleanup error:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

// Get session statistics
router.get('/:id/statistics', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const statistics = await Promise.all([
      AcademicRecord.countDocuments({ session: session.sessionName }),
      Test.countDocuments({ session: session.sessionName }),
      AcademicRecord.aggregate([
        { $match: { session: session.sessionName } },
        { $group: { _id: '$term', count: { $sum: 1 } } }
      ]),
      Test.aggregate([
        { $match: { session: session.sessionName } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);

    const [academicRecordsCount, testsCount, recordsByTerm, testsByType] = statistics;

    res.json({
      session: {
        id: session._id,
        sessionName: session.sessionName,
        isActive: session.isActive
      },
      statistics: {
        academicRecords: {
          total: academicRecordsCount,
          byTerm: recordsByTerm.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
          }, {})
        },
        tests: {
          total: testsCount,
          byType: testsByType.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
          }, {})
        }
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('GET /api/sessions/:id/statistics - Error:', error);
    res.status(500).json({ error: 'Server error fetching session statistics' });
  }
});

// Get active term (simple endpoint)
router.get('/active-term/current', auth, async (req, res) => {
  try {
    const activeTerm = await Session.getActiveTerm();
    
    if (!activeTerm) {
      return res.status(404).json({ 
        error: 'No active term found',
        suggestion: 'Please activate a session and a term'
      });
    }

    res.json({
      message: 'Active term retrieved successfully',
      activeTerm: activeTerm
    });
  } catch (error) {
    console.error('GET /api/sessions/active-term/current - Error:', error);
    res.status(500).json({ error: 'Server error fetching active term' });
  }
});

module.exports = router;
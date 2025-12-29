const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const AcademicRecord = require('../models/AcademicRecord');
const User = require('../models/User');
const Class = require('../models/Class');
const PromotionHistory = require('../models/PromotionHistory');
const Result = require('../models/Result');
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// ==================== HELPER FUNCTIONS ====================

function getCurrentSession() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 8) {
    return `${year}/${year + 1}`;
  } else {
    return `${year - 1}/${year}`;
  }
}

function getCurrentTerm() {
  const now = new Date();
  const month = now.getMonth();
  
  if (month >= 0 && month <= 3) return 'First Term';
  if (month >= 4 && month <= 7) return 'Second Term';
  return 'Third Term';
}

// ==================== PROMOTION ENDPOINTS ====================

// Get promotion status for frontend
router.get('/status', auth, checkPermission('view_promotion'), async (req, res) => {
  try {
    const currentSession = getCurrentSession();
    const currentTerm = getCurrentTerm();
    
    // Check if promotion season (Third Term)
    const isPromotionSeason = currentTerm === 'Third Term';
    
    // Check if promotion already completed for this session
    const existingPromotions = await PromotionHistory.find({
      session: currentSession
    }).limit(1);
    
    const promotionCompleted = existingPromotions.length > 0;
    
    res.json({
      canPromote: isPromotionSeason && !promotionCompleted,
      message: isPromotionSeason 
        ? (promotionCompleted ? 'Promotion already completed for this session' : 'Ready for promotion processing')
        : 'Promotion only available during Third Term',
      session: currentSession,
      activeTerm: currentTerm,
      promotionCompleted,
      details: {
        isThirdTerm: isPromotionSeason,
        promotionAllowed: isPromotionSeason && !promotionCompleted
      }
    });
  } catch (error) {
    console.error('❌ Promotion status error:', error);
    res.status(500).json({ 
      message: 'Error checking promotion status',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// Get eligibility based on SESSION AVERAGE (with 40% criteria)
router.get('/session-eligibility/:classId', auth, checkPermission('view_promotion'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { session } = req.query;
    const currentSession = session || getCurrentSession();
    const currentTerm = getCurrentTerm();

    console.log('🔍 Session eligibility check:', {
      classId,
      session: currentSession,
      term: currentTerm,
      user: req.user.username
    });

    // Validate promotion season (only Third Term)
    if (currentTerm !== 'Third Term') {
      return res.status(400).json({ 
        message: 'Promotion eligibility check is only available during Third Term',
        currentTerm,
        requiredTerm: 'Third Term'
      });
    }

    // Validate class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Get all students in the specified class
    const students = await User.find({ 
      class: classId, 
      role: 'student' 
    })
    .select('name studentId class role')
    .populate('class', 'name level grade')
    .lean();

    if (students.length === 0) {
      return res.json([]);
    }

    const studentIds = students.map(student => student._id);

    // Check promotion history to avoid duplicate promotions
    const existingPromotions = await PromotionHistory.find({
      studentId: { $in: studentIds },
      session: currentSession
    }).lean();

    const promotedStudentIds = new Set(
      existingPromotions.map(p => p.studentId.toString())
    );

    // Process each student with 40% criteria
    const eligibilityResults = await Promise.all(
      students.map(async (student) => {
        const studentId = student._id;
        const isAlreadyPromoted = promotedStudentIds.has(studentId.toString());
        
        if (isAlreadyPromoted) {
          return {
            student: {
              _id: studentId,
              name: student.name,
              studentId: student.studentId,
              class: student.class
            },
            status: 'already_promoted',
            reason: 'Student has already been promoted for this session',
            canManuallyPromote: false
          };
        }

        // Get student's results for all terms in this session
        const studentResults = await Result.find({
          userId: studentId,
          session: { $regex: `^${currentSession}`, $options: 'i' },
          isActive: true
        })
        .select('score totalMarks percentage grade term subject testId')
        .lean();

        console.log(`📊 Student ${student.studentId} - Results found:`, studentResults.length);

        if (studentResults.length === 0) {
          return {
            student: {
              _id: studentId,
              name: student.name,
              studentId: student.studentId,
              class: student.class
            },
            status: 'ineligible',
            reason: 'No academic results found for this session',
            canManuallyPromote: true, // Can be manually promoted
            details: {
              sessionAverage: 0,
              hasResults: false
            }
          };
        }

        // Group results by term
        const resultsByTerm = {
          'First Term': studentResults.filter(r => r.term === 'First Term'),
          'Second Term': studentResults.filter(r => r.term === 'Second Term'),
          'Third Term': studentResults.filter(r => r.term === 'Third Term')
        };

        // Calculate averages per term
        const termAverages = {};
        let totalScore = 0;
        let termCount = 0;
        let hasAllTerms = true;

        const terms = ['First Term', 'Second Term', 'Third Term'];
        terms.forEach(term => {
          const termResults = resultsByTerm[term];
          if (termResults && termResults.length > 0) {
            // Calculate average percentage for this term
            const termTotalPercentage = termResults.reduce((sum, result) => {
              if (result.percentage) {
                return sum + result.percentage;
              } else if (result.score && result.totalMarks) {
                return sum + (result.score / result.totalMarks * 100);
              }
              return sum;
            }, 0);
            
            const termAverage = termResults.length > 0 ? termTotalPercentage / termResults.length : 0;
            
            termAverages[term] = {
              average: termAverage,
              count: termResults.length,
              subjects: [...new Set(termResults.map(r => r.subject))]
            };
            
            totalScore += termAverage;
            termCount++;
          } else {
            hasAllTerms = false;
          }
        });

        // Calculate session average
        const sessionAverage = termCount > 0 ? totalScore / termCount : 0;

        // Check if all three terms are completed
        if (!hasAllTerms || termCount < 3) {
          return {
            student: {
              _id: studentId,
              name: student.name,
              studentId: student.studentId,
              class: student.class
            },
            status: 'ineligible',
            reason: `Student does not have complete results for all three terms (found: ${termCount}/3 terms)`,
            canManuallyPromote: true, // Can be manually promoted
            details: {
              termsCompleted: Object.keys(termAverages),
              sessionAverage: sessionAverage.toFixed(2),
              termAverages,
              resultsCount: studentResults.length,
              hasPartialResults: true
            }
          };
        }

        // ==== 40% PASSING CRITERIA ====
        // Student is eligible if session average is 40% or higher
        const isEligible = sessionAverage >= 40;

        console.log(`🎯 Student ${student.studentId} - Eligibility:`, {
          sessionAverage: sessionAverage.toFixed(2),
          required: '40%',
          isEligible
        });

        return {
          student: {
            _id: studentId,
            name: student.name,
            studentId: student.studentId,
            class: student.class
          },
          status: isEligible ? 'eligible' : 'ineligible',
          canManuallyPromote: true, // ALWAYS allow manual promotion
          details: {
            sessionAverage: parseFloat(sessionAverage.toFixed(2)),
            firstTermAverage: termAverages['First Term']?.average?.toFixed(2) || 0,
            secondTermAverage: termAverages['Second Term']?.average?.toFixed(2) || 0,
            thirdTermAverage: termAverages['Third Term']?.average?.toFixed(2) || 0,
            meetsCriteria: sessionAverage >= 40,
            requiredPercentage: 40,
            totalResults: studentResults.length,
            subjectsPerTerm: {
              firstTerm: termAverages['First Term']?.subjects?.length || 0,
              secondTerm: termAverages['Second Term']?.subjects?.length || 0,
              thirdTerm: termAverages['Third Term']?.subjects?.length || 0
            }
          },
          reason: isEligible 
            ? `Meets promotion criteria: Session average ${sessionAverage.toFixed(2)}% ≥ 40%` 
            : `Session average (${sessionAverage.toFixed(2)}%) below 40% requirement`
        };
      })
    );

    const eligibleCount = eligibilityResults.filter(r => r.status === 'eligible').length;
    const alreadyPromotedCount = eligibilityResults.filter(r => r.status === 'already_promoted').length;
    const canManuallyPromoteCount = eligibilityResults.filter(r => r.canManuallyPromote === true).length;
    
    console.log(`🎯 Session eligibility results:`, {
      totalStudents: students.length,
      eligible: eligibleCount,
      ineligible: students.length - eligibleCount - alreadyPromotedCount,
      alreadyPromoted: alreadyPromotedCount,
      canManuallyPromote: canManuallyPromoteCount
    });

    res.json(eligibilityResults);

  } catch (error) {
    console.error('❌ Session eligibility error:', error);
    res.status(500).json({ 
      message: 'Server error fetching session eligibility',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// ==== NEW: GET ALL STUDENTS FOR MANUAL PROMOTION ====
router.get('/manual-promotion/:classId', auth, checkPermission('promote_students'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { session } = req.query;
    const currentSession = session || getCurrentSession();

    console.log('🔍 Manual promotion list:', {
      classId,
      session: currentSession,
      user: req.user.username
    });

    // Validate class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Get all students in the specified class
    const students = await User.find({ 
      class: classId, 
      role: 'student' 
    })
    .select('name studentId class role')
    .populate('class', 'name level grade')
    .lean();

    if (students.length === 0) {
      return res.json([]);
    }

    const studentIds = students.map(student => student._id);

    // Check promotion history to avoid duplicate promotions
    const existingPromotions = await PromotionHistory.find({
      studentId: { $in: studentIds },
      session: currentSession
    }).lean();

    const promotedStudentIds = new Set(
      existingPromotions.map(p => p.studentId.toString())
    );

    // Get student results for display
    const studentsWithResults = await Promise.all(
      students.map(async (student) => {
        const studentId = student._id;
        const isAlreadyPromoted = promotedStudentIds.has(studentId.toString());
        
        if (isAlreadyPromoted) {
          return {
            student: {
              _id: studentId,
              name: student.name,
              studentId: student.studentId,
              class: student.class
            },
            status: 'already_promoted',
            canPromote: false,
            reason: 'Already promoted'
          };
        }

        // Get student results
        const studentResults = await Result.find({
          userId: studentId,
          session: { $regex: `^${currentSession}`, $options: 'i' },
          isActive: true
        })
        .select('score totalMarks percentage grade term subject')
        .lean();

        // Calculate session average
        let sessionAverage = 0;
        if (studentResults.length > 0) {
          const totalPercentage = studentResults.reduce((sum, result) => {
            if (result.percentage) return sum + result.percentage;
            if (result.score && result.totalMarks) return sum + (result.score / result.totalMarks * 100);
            return sum;
          }, 0);
          sessionAverage = studentResults.length > 0 ? totalPercentage / studentResults.length : 0;
        }

        return {
          student: {
            _id: studentId,
            name: student.name,
            studentId: student.studentId,
            class: student.class
          },
          status: 'available', // Always available for manual promotion
          canPromote: true, // Can always be manually promoted
          details: {
            sessionAverage: parseFloat(sessionAverage.toFixed(2)),
            resultsCount: studentResults.length,
            hasResults: studentResults.length > 0
          },
          reason: 'Available for manual promotion'
        };
      })
    );

    const availableCount = studentsWithResults.filter(s => s.canPromote === true).length;
    
    console.log(`📋 Manual promotion list:`, {
      totalStudents: students.length,
      availableForManualPromotion: availableCount
    });

    res.json(studentsWithResults);

  } catch (error) {
    console.error('❌ Manual promotion list error:', error);
    res.status(500).json({ 
      message: 'Server error fetching manual promotion list',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// ==== BULK PROMOTE (STANDARD) ====
router.post('/bulk-promote', auth, checkPermission('promote_students'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { studentIds, targetClassId, session: promotionSession, term: promotionTerm } = req.body;

    console.log('🚀 Starting bulk promotion process:', {
      studentCount: studentIds.length,
      targetClassId,
      session: promotionSession,
      term: promotionTerm,
      user: req.user.username
    });

    // Validate promotion season
    if (promotionTerm !== 'Third Term') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        message: 'Bulk promotion is only allowed during Third Term',
        currentTerm: promotionTerm,
        requiredTerm: 'Third Term'
      });
    }

    // Input validation
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'studentIds must be a non-empty array' });
    }

    if (!targetClassId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'targetClassId is required' });
    }

    const currentSession = promotionSession || getCurrentSession();
    const currentTerm = promotionTerm || getCurrentTerm();

    // Validate target class exists
    const targetClass = await Class.findById(targetClassId).session(session);
    if (!targetClass) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Target class not found' });
    }

    // Validate all student IDs exist and are students
    const existingStudents = await User.find({
      _id: { $in: studentIds },
      role: 'student'
    })
    .populate('class')
    .session(session);

    if (existingStudents.length !== studentIds.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        message: 'One or more student IDs are invalid or not students',
        found: existingStudents.length,
        requested: studentIds.length
      });
    }

    // Check for duplicate promotions
    const existingPromotions = await PromotionHistory.find({
      studentId: { $in: studentIds },
      session: currentSession
    }).session(session);

    if (existingPromotions.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        message: 'Some students have already been promoted for this session',
        alreadyPromoted: existingPromotions.map(p => p.studentId)
      });
    }

    // Get original class IDs for promotion history
    const studentClassMap = {};
    existingStudents.forEach(student => {
      studentClassMap[student._id.toString()] = student.class._id.toString();
    });

    // Bulk update users (promotion)
    const userUpdateResult = await User.updateMany(
      { _id: { $in: studentIds }, role: 'student' },
      { 
        $set: { 
          class: targetClassId,
          lastPromoted: new Date(),
          promotedBy: req.user.id,
          promotionType: 'standard' // Track promotion type
        } 
      },
      { session }
    );

    // Create promotion history records
    const promotionHistoryRecords = studentIds.map(studentId => ({
      studentId,
      previousClassId: studentClassMap[studentId.toString()],
      newClassId: targetClassId,
      session: currentSession,
      term: currentTerm,
      promotedBy: req.user.id,
      promotionDate: new Date(),
      promotionType: 'standard'
    }));

    await PromotionHistory.insertMany(promotionHistoryRecords, { session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    console.log('✅ Bulk promotion completed successfully:', {
      studentsPromoted: userUpdateResult.modifiedCount,
      historyRecords: promotionHistoryRecords.length
    });

    res.json({ 
      success: true,
      message: 'Students promoted successfully to next academic session',
      details: {
        studentsPromoted: userUpdateResult.modifiedCount,
        promotionHistoryCreated: promotionHistoryRecords.length,
        targetClass: targetClass.name,
        promotionType: 'standard'
      }
    });

  } catch (error) {
    // Abort transaction on any error
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    
    console.error('❌ Bulk promotion error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error: ' + error.message });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error promoting students',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// ==== NEW: MANUAL PROMOTION (OVERRIDE) ====
router.post('/manual-promote', auth, checkPermission('promote_students'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      studentIds, 
      targetClassId, 
      session: promotionSession, 
      term: promotionTerm,
      reason = 'Manual promotion override' 
    } = req.body;

    console.log('🚀 Starting MANUAL promotion override:', {
      studentCount: studentIds.length,
      targetClassId,
      session: promotionSession,
      term: promotionTerm,
      reason,
      user: req.user.username
    });

    // Input validation
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false,
        message: 'studentIds must be a non-empty array' 
      });
    }

    if (!targetClassId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false,
        message: 'targetClassId is required' 
      });
    }

    const currentSession = promotionSession || getCurrentSession();
    const currentTerm = promotionTerm || getCurrentTerm();

    // Validate target class exists
    const targetClass = await Class.findById(targetClassId).session(session);
    if (!targetClass) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        success: false,
        message: 'Target class not found' 
      });
    }

    // Validate all student IDs exist and are students
    const existingStudents = await User.find({
      _id: { $in: studentIds },
      role: 'student'
    })
    .populate('class')
    .session(session);

    if (existingStudents.length !== studentIds.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false,
        message: 'One or more student IDs are invalid or not students',
        found: existingStudents.length,
        requested: studentIds.length
      });
    }

    // Check for duplicate promotions
    const existingPromotions = await PromotionHistory.find({
      studentId: { $in: studentIds },
      session: currentSession
    }).session(session);

    if (existingPromotions.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false,
        message: 'Some students have already been promoted for this session',
        alreadyPromoted: existingPromotions.map(p => p.studentId)
      });
    }

    // Get original class IDs for promotion history
    const studentClassMap = {};
    existingStudents.forEach(student => {
      studentClassMap[student._id.toString()] = student.class._id.toString();
    });

    // Bulk update users (promotion)
    const userUpdateResult = await User.updateMany(
      { _id: { $in: studentIds }, role: 'student' },
      { 
        $set: { 
          class: targetClassId,
          lastPromoted: new Date(),
          promotedBy: req.user.id,
          promotionType: 'manual_override',
          promotionReason: reason
        } 
      },
      { session }
    );

    // Create promotion history records with manual override flag
    const promotionHistoryRecords = studentIds.map(studentId => ({
      studentId,
      previousClassId: studentClassMap[studentId.toString()],
      newClassId: targetClassId,
      session: currentSession,
      term: currentTerm,
      promotedBy: req.user.id,
      promotionDate: new Date(),
      promotionType: 'manual_override',
      overrideReason: reason,
      overriddenBy: req.user.id
    }));

    await PromotionHistory.insertMany(promotionHistoryRecords, { session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    console.log('✅ MANUAL promotion override completed successfully:', {
      studentsPromoted: userUpdateResult.modifiedCount,
      historyRecords: promotionHistoryRecords.length,
      reason,
      overriddenBy: req.user.username
    });

    res.json({ 
      success: true,
      message: 'Students manually promoted successfully (override)',
      details: {
        studentsPromoted: userUpdateResult.modifiedCount,
        promotionHistoryCreated: promotionHistoryRecords.length,
        targetClass: targetClass.name,
        promotionType: 'manual_override',
        overrideReason: reason,
        overriddenBy: {
          id: req.user.id,
          username: req.user.username
        }
      }
    });

  } catch (error) {
    // Abort transaction on any error
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    
    console.error('❌ Manual promotion error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        message: 'Validation error: ' + error.message 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error during manual promotion',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// ==== NEW: PROMOTE ENTIRE CLASS ====
router.post('/promote-class/:classId', auth, checkPermission('promote_students'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { classId } = req.params;
    const { 
      targetClassId, 
      session: promotionSession, 
      term: promotionTerm,
      includeAll = true, // Promote all students regardless of eligibility
      reason = 'Class-wide promotion'
    } = req.body;

    console.log('🚀 Starting CLASS-WIDE promotion:', {
      classId,
      targetClassId,
      session: promotionSession,
      term: promotionTerm,
      includeAll,
      reason,
      user: req.user.username
    });

    // Get all students in the class
    const students = await User.find({
      class: classId,
      role: 'student'
    })
    .populate('class')
    .session(session);

    if (students.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'No students found in this class'
      });
    }

    const studentIds = students.map(s => s._id);
    const currentSession = promotionSession || getCurrentSession();
    const currentTerm = promotionTerm || getCurrentTerm();

    // Check for duplicate promotions
    const existingPromotions = await PromotionHistory.find({
      studentId: { $in: studentIds },
      session: currentSession
    }).session(session);

    if (existingPromotions.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false,
        message: 'Some students have already been promoted for this session',
        alreadyPromoted: existingPromotions.map(p => p.studentId)
      });
    }

    // Validate target class exists
    const targetClass = await Class.findById(targetClassId).session(session);
    if (!targetClass) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        success: false,
        message: 'Target class not found' 
      });
    }

    // Bulk update all students
    const userUpdateResult = await User.updateMany(
      { _id: { $in: studentIds }, role: 'student' },
      { 
        $set: { 
          class: targetClassId,
          lastPromoted: new Date(),
          promotedBy: req.user.id,
          promotionType: 'class_wide',
          promotionReason: reason
        } 
      },
      { session }
    );

    // Create promotion history records
    const promotionHistoryRecords = studentIds.map(studentId => ({
      studentId,
      previousClassId: classId,
      newClassId: targetClassId,
      session: currentSession,
      term: currentTerm,
      promotedBy: req.user.id,
      promotionDate: new Date(),
      promotionType: 'class_wide',
      overrideReason: reason,
      overriddenBy: req.user.id
    }));

    await PromotionHistory.insertMany(promotionHistoryRecords, { session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    console.log('✅ CLASS-WIDE promotion completed successfully:', {
      studentsPromoted: userUpdateResult.modifiedCount,
      originalClass: classId,
      targetClass: targetClass.name,
      reason
    });

    res.json({ 
      success: true,
      message: `Entire class promoted successfully (${students.length} students)`,
      details: {
        studentsPromoted: userUpdateResult.modifiedCount,
        originalClass: classId,
        targetClass: targetClass.name,
        promotionType: 'class_wide',
        overrideReason: reason,
        overriddenBy: {
          id: req.user.id,
          username: req.user.username
        }
      }
    });

  } catch (error) {
    // Abort transaction on any error
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    
    console.error('❌ Class-wide promotion error:', error);
    
    res.status(500).json({ 
      success: false,
      message: 'Server error during class-wide promotion',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

module.exports = router;
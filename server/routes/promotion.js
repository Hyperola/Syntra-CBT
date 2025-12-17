const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const AcademicRecord = require('../models/AcademicRecord');
const User = require('../models/User');
const Class = require('../models/Class');
const PromotionHistory = require('../models/PromotionHistory');
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// Get promotion dashboard data
router.get('/dashboard', auth, checkPermission('view_promotion'), async (req, res) => {
  try {
    const currentSession = getCurrentSession();
    const currentTerm = getCurrentTerm();
    
    console.log('📊 Promotion dashboard - START:', {
      currentSession,
      currentTerm,
      user: req.user.username
    });

    // Get all classes
    const classes = await Class.find().sort({ level: 1, name: 1 }).lean();
    
    // Get promotion statistics for each class
    const promotionStats = await Promise.all(
      classes.map(async (classObj) => {
        const students = await User.find({ 
          class: classObj._id, 
          role: 'student' 
        }).lean();

        const studentIds = students.map(s => s._id);
        
        // Get academic records for current session and term
        const academicRecords = await AcademicRecord.find({
          studentId: { $in: studentIds },
          classId: classObj._id,
          session: currentSession,
          term: currentTerm
        }).lean();

        const recordsByStudent = {};
        academicRecords.forEach(record => {
          recordsByStudent[record.studentId] = record;
        });

        let eligibleCount = 0;
        let ineligibleCount = 0;
        let noRecordCount = 0;

        students.forEach(student => {
          const record = recordsByStudent[student._id.toString()];
          if (!record) {
            noRecordCount++;
            return;
          }

          const finalScore = record.finalScore || record.average || 0;
          const attendancePercentage = record.attendancePercentage || 
            (record.attendance && record.attendance.percentage) || 0;
          
          const isEligible = finalScore >= 60 && attendancePercentage >= 75;
          
          if (isEligible) {
            eligibleCount++;
          } else {
            ineligibleCount++;
          }
        });

        return {
          class: classObj,
          totalStudents: students.length,
          eligibleCount,
          ineligibleCount,
          noRecordCount,
          promotionReady: currentTerm === 'Third Term' // Only ready in third term
        };
      })
    );

    // Get next class for each current class
    const classesWithNext = promotionStats.map(stat => {
      const currentLevel = stat.class.level || 0;
      const nextClass = classes.find(c => c.level === currentLevel + 1);
      
      return {
        ...stat,
        nextClass: nextClass || null
      };
    });

    res.json({
      currentSession,
      currentTerm,
      classes: classesWithNext,
      summary: {
        totalClasses: classes.length,
        totalStudents: classesWithNext.reduce((sum, c) => sum + c.totalStudents, 0),
        totalEligible: classesWithNext.reduce((sum, c) => sum + c.eligibleCount, 0),
        promotionSeason: currentTerm === 'Third Term'
      }
    });

  } catch (error) {
    console.error('❌ Promotion dashboard error:', error);
    res.status(500).json({ 
      message: 'Server error fetching promotion dashboard',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// Get students eligible for promotion from a specific class
router.get('/:classId', auth, checkPermission('view_promotion'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { session, term } = req.query;

    console.log('🔍 Promotion eligibility check - START:', {
      classId,
      session: session || getCurrentSession(),
      term: term || getCurrentTerm(),
      user: req.user.username
    });

    const currentSession = session || getCurrentSession();
    const currentTerm = term || getCurrentTerm();

    // Validate promotion season (only Third Term)
    if (currentTerm !== 'Third Term') {
      return res.status(400).json({ 
        message: 'Promotion is only available during Third Term',
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

    // Get academic records for these students
    const academicRecords = await AcademicRecord.find({
      studentId: { $in: studentIds },
      classId: classId,
      session: currentSession,
      term: currentTerm
    }).lean();

    // Map records by student ID for easy lookup
    const recordsByStudent = {};
    academicRecords.forEach(record => {
      recordsByStudent[record.studentId] = record;
    });

    // Check promotion history to avoid duplicate promotions
    const existingPromotions = await PromotionHistory.find({
      studentId: { $in: studentIds },
      session: currentSession
    }).lean();

    const promotedStudentIds = new Set(
      existingPromotions.map(p => p.studentId.toString())
    );

    // Check each student's eligibility
    const eligibilityResults = students.map(student => {
      const studentRecords = recordsByStudent[student._id.toString()];
      const isAlreadyPromoted = promotedStudentIds.has(student._id.toString());
      
      if (isAlreadyPromoted) {
        return {
          student: {
            _id: student._id,
            name: student.name,
            studentId: student.studentId,
            class: student.class
          },
          status: 'already_promoted',
          reason: 'Student has already been promoted for this session'
        };
      }

      if (!studentRecords) {
        return {
          student: {
            _id: student._id,
            name: student.name,
            studentId: student.studentId,
            class: student.class
          },
          status: 'ineligible',
          reason: 'No academic record found for the specified session/term'
        };
      }

      // Enhanced eligibility criteria
      const finalScore = studentRecords.finalScore || studentRecords.average || 0;
      const attendancePercentage = studentRecords.attendancePercentage || 
        (studentRecords.attendance && studentRecords.attendance.percentage) || 0;
      
      // Check if student meets promotion criteria
      const meetsAcademicCriteria = finalScore >= 60;
      const meetsAttendanceCriteria = attendancePercentage >= 75;
      const hasNoCriticalFails = !studentRecords.remarks || 
        !studentRecords.remarks.toLowerCase().includes('fail');
      
      const isEligible = meetsAcademicCriteria && 
                        meetsAttendanceCriteria && 
                        hasNoCriticalFails;

      return {
        student: {
          _id: student._id,
          name: student.name,
          studentId: student.studentId,
          class: student.class
        },
        status: isEligible ? 'eligible' : 'ineligible',
        details: {
          finalScore,
          attendancePercentage,
          meetsAcademicCriteria,
          meetsAttendanceCriteria,
          hasNoCriticalFails,
          passingGrade: 60,
          minAttendance: 75
        },
        reason: isEligible ? 'Meets all promotion criteria' : 
          `Does not meet promotion criteria: ${
            !meetsAcademicCriteria ? 'Academic score below 60%' :
            !meetsAttendanceCriteria ? 'Attendance below 75%' :
            'Critical academic remarks'
          }`
      };
    });

    const eligibleCount = eligibilityResults.filter(r => r.status === 'eligible').length;
    console.log(`🎯 Promotion results: ${eligibleCount} eligible out of ${students.length} students`);

    res.json(eligibilityResults);

  } catch (error) {
    console.error('❌ Promotion eligibility error:', error);
    res.status(500).json({ 
      message: 'Server error fetching promotion candidates',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// Enhanced promotion with session management
router.post('/bulk-promote', auth, checkPermission('promote_students'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { studentIds, targetClassId, session: promotionSession, term: promotionTerm, promotionDate } = req.body;

    console.log('🚀 Starting bulk promotion process:', {
      studentCount: studentIds.length,
      targetClassId,
      session: promotionSession,
      term: promotionTerm,
      promotionDate,
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
          promotedBy: req.user.id
        } 
      },
      { session }
    );

    // Update academic records to mark as completed for the session
    const academicRecordUpdateResult = await AcademicRecord.updateMany(
      { 
        studentId: { $in: studentIds }, 
        session: currentSession,
        term: currentTerm
      },
      { 
        $set: { 
          promotionStatus: 'promoted',
          promotedTo: targetClassId,
          promotionDate: new Date()
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
      promotionDate: promotionDate || new Date()
    }));

    await PromotionHistory.insertMany(promotionHistoryRecords, { session });

    // Create placeholder academic records for next session in target class
    const nextSession = getNextSession(currentSession);
    const newAcademicRecords = studentIds.map(studentId => ({
      studentId,
      classId: targetClassId,
      session: nextSession,
      term: 'First Term',
      status: 'pending',
      createdDate: new Date(),
      createdBy: req.user.id
    }));

    await AcademicRecord.insertMany(newAcademicRecords, { session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    console.log('✅ Bulk promotion completed successfully:', {
      studentsPromoted: userUpdateResult.modifiedCount,
      recordsUpdated: academicRecordUpdateResult.modifiedCount,
      historyRecords: promotionHistoryRecords.length,
      nextSessionRecords: newAcademicRecords.length
    });

    res.json({ 
      message: 'Students promoted successfully to next academic session',
      details: {
        studentsPromoted: userUpdateResult.modifiedCount,
        academicRecordsUpdated: academicRecordUpdateResult.modifiedCount,
        promotionHistoryCreated: promotionHistoryRecords.length,
        nextSession: nextSession,
        targetClass: targetClass.name
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
      message: 'Server error promoting students',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// Get promotion history for a student or class
router.get('/history/:type/:id', auth, checkPermission('view_promotion'), async (req, res) => {
  try {
    const { type, id } = req.params;
    const { session } = req.query;

    let query = {};
    
    if (type === 'student') {
      query.studentId = id;
    } else if (type === 'class') {
      query.previousClassId = id;
    } else {
      return res.status(400).json({ message: 'Invalid type. Use "student" or "class"' });
    }

    if (session) {
      query.session = session;
    }

    const history = await PromotionHistory.find(query)
      .populate('studentId', 'name studentId')
      .populate('previousClassId', 'name level')
      .populate('newClassId', 'name level')
      .populate('promotedBy', 'username name')
      .sort({ promotionDate: -1 })
      .lean();

    res.json(history);

  } catch (error) {
    console.error('❌ Promotion history error:', error);
    res.status(500).json({ message: 'Server error fetching promotion history' });
  }
});

// Helper functions
function getCurrentSession() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 8) { // September onwards
    return `${year}/${year + 1}`;
  } else {
    return `${year - 1}/${year}`;
  }
}

function getCurrentTerm() {
  const now = new Date();
  const month = now.getMonth();
  
  if (month >= 0 && month <= 3) return 'First Term';   // Jan-Apr
  if (month >= 4 && month <= 7) return 'Second Term';  // May-Aug
  return 'Third Term'; // Sep-Dec
}

function getNextSession(currentSession) {
  const years = currentSession.split('/');
  if (years.length === 2) {
    const startYear = parseInt(years[0]);
    const endYear = parseInt(years[1]);
    return `${startYear + 1}/${endYear + 1}`;
  }
  return currentSession;
}

// Session management endpoint
router.get('/session/current', auth, (req, res) => {
  const currentSession = getCurrentSession();
  const currentTerm = getCurrentTerm();
  const nextSession = getNextSession(currentSession);
  
  res.json({
    currentSession,
    currentTerm,
    nextSession,
    isPromotionSeason: currentTerm === 'Third Term',
    promotionDeadline: getPromotionDeadline(currentSession)
  });
});

function getPromotionDeadline(session) {
  const year = parseInt(session.split('/')[1]);
  return new Date(year, 11, 31); // December 31st of the end year
}

module.exports = router;
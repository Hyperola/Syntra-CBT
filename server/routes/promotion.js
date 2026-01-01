const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const AcademicRecord = require('../models/AcademicRecord');
const User = require('../models/User');
const Class = require('../models/Class');
const PromotionHistory = require('../models/PromotionHistory');
const Result = require('../models/Result');
const AcademicTerm = require('../models/AcademicRecord');
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

function calculateNextSession(currentSession) {
  const [startYear, endYear] = currentSession.split('/').map(Number);
  return `${startYear + 1}/${endYear + 1}`;
}

function getCurrentTerm() {
  const now = new Date();
  const month = now.getMonth();
  
  if (month >= 0 && month <= 3) return 'First Term';
  if (month >= 4 && month <= 7) return 'Second Term';
  return 'Third Term';
}

function calculateGrade(percentage) {
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  if (percentage >= 40) return 'E';
  return 'F';
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
            canManuallyPromote: true,
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
            canManuallyPromote: true,
            details: {
              termsCompleted: Object.keys(termAverages),
              sessionAverage: sessionAverage.toFixed(2),
              termAverages,
              resultsCount: studentResults.length,
              hasPartialResults: true
            }
          };
        }

        // 40% PASSING CRITERIA
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
          canManuallyPromote: true,
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

// Get all students for manual promotion
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
          status: 'available',
          canPromote: true,
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

// ==================== COMPLETE BULK PROMOTION WITH ACADEMIC RECORDS ====================

router.post('/bulk-promote', auth, checkPermission('promote_students'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { studentIds, targetClassId, session: promotionSession, term: promotionTerm } = req.body;

    console.log('🚀 Starting bulk promotion with academic records:', {
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
    const nextSession = calculateNextSession(currentSession);

    // Validate target class exists
    const targetClass = await Class.findById(targetClassId).session(session);
    if (!targetClass) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Target class not found' });
    }

    // Get academic term info
    const academicTerm = await AcademicTerm.findOne({
      name: currentTerm,
      session: currentSession
    }).session(session);

    if (!academicTerm) {
      console.warn('⚠️ No academic term found, creating one...');
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
    const studentOriginalClass = {};
    
    existingStudents.forEach(student => {
      studentClassMap[student._id.toString()] = student.class._id.toString();
      studentOriginalClass[student._id.toString()] = student.class;
    });

    // ========== STEP 1: Archive current academic records ==========
    const archivedAcademicRecords = [];
    
    for (const studentId of studentIds) {
      const student = existingStudents.find(s => s._id.toString() === studentId.toString());
      
      // Get all active results for this student in current session
      const currentResults = await Result.find({
        userId: studentId,
        session: { $regex: `^${currentSession}`, $options: 'i' },
        isActive: true
      }).session(session);

      if (currentResults.length === 0) {
        console.log(`⚠️ No results found for student ${student.studentId} in session ${currentSession}`);
        continue;
      }

      // Calculate summary statistics
      const totalScore = currentResults.reduce((sum, result) => sum + (result.score || 0), 0);
      const totalMarks = currentResults.reduce((sum, result) => sum + (result.totalMarks || 0), 0);
      const averagePercentage = totalMarks > 0 ? (totalScore / totalMarks * 100) : 0;
      
      // Get unique subjects
      const subjects = [...new Set(currentResults.map(r => r.subject))];
      
      // Group results by term
      const resultsByTerm = {
        'First Term': currentResults.filter(r => r.term === 'First Term'),
        'Second Term': currentResults.filter(r => r.term === 'Second Term'),
        'Third Term': currentResults.filter(r => r.term === 'Third Term')
      };

      // Calculate term averages
      const termAverages = {};
      Object.keys(resultsByTerm).forEach(term => {
        const termResults = resultsByTerm[term];
        if (termResults.length > 0) {
          const termTotal = termResults.reduce((sum, r) => sum + (r.score || 0), 0);
          const termMax = termResults.reduce((sum, r) => sum + (r.totalMarks || 0), 0);
          termAverages[term] = termMax > 0 ? (termTotal / termMax * 100) : 0;
        }
      });

      // Determine promotion status based on 40% criteria
      const promotionStatus = averagePercentage >= 40 ? 'promoted' : 'retained';

      // Create archived academic record
      const archivedRecord = new AcademicRecord({
        studentId: studentId,
        studentName: student.name,
        studentIdNumber: student.studentId,
        session: currentSession,
        academicYear: currentSession,
        class: studentOriginalClass[studentId.toString()]._id,
        className: studentOriginalClass[studentId.toString()].name,
        level: studentOriginalClass[studentId.toString()].level,
        grade: studentOriginalClass[studentId.toString()].grade,
        section: studentOriginalClass[studentId.toString()].section || 'N/A',
        
        // Academic performance data
        totalSubjects: subjects.length,
        subjects: subjects,
        
        // Term-wise performance
        firstTermResults: resultsByTerm['First Term'].map(r => ({
          subject: r.subject,
          score: r.score,
          totalMarks: r.totalMarks,
          percentage: r.percentage || (r.totalMarks > 0 ? (r.score / r.totalMarks * 100) : 0),
          grade: r.grade || calculateGrade(r.percentage || (r.totalMarks > 0 ? (r.score / r.totalMarks * 100) : 0)),
          remarks: getRemarks(r.percentage || (r.totalMarks > 0 ? (r.score / r.totalMarks * 100) : 0))
        })),
        
        secondTermResults: resultsByTerm['Second Term'].map(r => ({
          subject: r.subject,
          score: r.score,
          totalMarks: r.totalMarks,
          percentage: r.percentage || (r.totalMarks > 0 ? (r.score / r.totalMarks * 100) : 0),
          grade: r.grade || calculateGrade(r.percentage || (r.totalMarks > 0 ? (r.score / r.totalMarks * 100) : 0)),
          remarks: getRemarks(r.percentage || (r.totalMarks > 0 ? (r.score / r.totalMarks * 100) : 0))
        })),
        
        thirdTermResults: resultsByTerm['Third Term'].map(r => ({
          subject: r.subject,
          score: r.score,
          totalMarks: r.totalMarks,
          percentage: r.percentage || (r.totalMarks > 0 ? (r.score / r.totalMarks * 100) : 0),
          grade: r.grade || calculateGrade(r.percentage || (r.totalMarks > 0 ? (r.score / r.totalMarks * 100) : 0)),
          remarks: getRemarks(r.percentage || (r.totalMarks > 0 ? (r.score / r.totalMarks * 100) : 0))
        })),
        
        // Summary statistics
        termAverages: {
          firstTerm: termAverages['First Term'] || 0,
          secondTerm: termAverages['Second Term'] || 0,
          thirdTerm: termAverages['Third Term'] || 0
        },
        
        finalScore: totalScore,
        totalMarks: totalMarks,
        averagePercentage: averagePercentage,
        finalGrade: calculateGrade(averagePercentage),
        overallRemarks: getRemarks(averagePercentage),
        promotionStatus: promotionStatus,
        promotionEligibility: averagePercentage >= 40,
        
        // Attendance and behavior (if available)
        totalDaysPresent: 0, // You can add actual attendance tracking
        totalDaysAbsent: 0,
        attendancePercentage: 0,
        behaviorRemarks: 'Satisfactory',
        
        // Teacher comments
        teacherComments: `Successfully completed ${currentSession} academic session.`,
        principalComments: `Promotion status: ${promotionStatus.toUpperCase()}`,
        
        // Metadata
        recordType: 'archived',
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: req.user.id,
        academicTerm: academicTerm ? academicTerm._id : null,
        
        // For reference
        originalResults: currentResults.map(r => r._id),
        promotionBatch: new mongoose.Types.ObjectId() // Unique batch ID for this promotion
      });

      const savedRecord = await archivedRecord.save({ session });
      archivedAcademicRecords.push(savedRecord);
    }

    console.log(`📚 Archived ${archivedAcademicRecords.length} academic records`);

    // ========== STEP 2: Create empty academic records for new session ==========
    const newAcademicRecords = [];
    
    for (const studentId of studentIds) {
      const student = existingStudents.find(s => s._id.toString() === studentId.toString());
      
      // Check if student already has an academic record for next session
      const existingNextSessionRecord = await AcademicRecord.findOne({
        studentId: studentId,
        session: nextSession,
        isActive: true
      }).session(session);

      if (existingNextSessionRecord) {
        console.log(`ℹ️ Student ${student.studentId} already has academic record for ${nextSession}`);
        newAcademicRecords.push(existingNextSessionRecord);
        continue;
      }

      // Create new academic record for next session
      const newAcademicRecord = new AcademicRecord({
        studentId: studentId,
        studentName: student.name,
        studentIdNumber: student.studentId,
        session: nextSession,
        academicYear: nextSession,
        class: targetClassId,
        className: targetClass.name,
        level: targetClass.level,
        grade: targetClass.grade,
        section: targetClass.section || 'N/A',
        
        // Empty results for new session
        totalSubjects: 0,
        subjects: [],
        
        firstTermResults: [],
        secondTermResults: [],
        thirdTermResults: [],
        
        // No results yet
        termAverages: {
          firstTerm: 0,
          secondTerm: 0,
          thirdTerm: 0
        },
        
        finalScore: 0,
        totalMarks: 0,
        averagePercentage: 0,
        finalGrade: 'N/A',
        overallRemarks: 'New session - no results yet',
        promotionStatus: 'pending',
        promotionEligibility: false,
        
        // Default attendance
        totalDaysPresent: 0,
        totalDaysAbsent: 0,
        attendancePercentage: 0,
        behaviorRemarks: 'Good',
        
        // Default comments
        teacherComments: `Beginning ${nextSession} academic session in ${targetClass.name}`,
        principalComments: 'New academic year begins',
        
        // Metadata
        recordType: 'current',
        isActive: true,
        isCurrent: true,
        createdAt: new Date(),
        createdBy: req.user.id,
        academicTerm: null, // Will be set when term starts
        
        // Reference to previous record
        previousAcademicRecord: archivedAcademicRecords.find(r => r.studentId.toString() === studentId.toString())?._id
      });

      const savedRecord = await newAcademicRecord.save({ session });
      newAcademicRecords.push(savedRecord);
    }

    console.log(`📝 Created ${newAcademicRecords.length} new academic records for ${nextSession}`);

    // ========== STEP 3: Update student class and metadata ==========
    const updatedStudents = [];
    
    for (const studentId of studentIds) {
      const student = existingStudents.find(s => s._id.toString() === studentId.toString());
      const archivedRecord = archivedAcademicRecords.find(r => r.studentId.toString() === studentId.toString());
      const newRecord = newAcademicRecords.find(r => r.studentId.toString() === studentId.toString());
      
      // Get existing academic records
      const existingAcademicRecords = await AcademicRecord.find({
        studentId: studentId,
        isArchived: true
      }).session(session);

      // Update student document
      const updatedStudent = await User.findByIdAndUpdate(
        studentId,
        { 
          $set: { 
            class: targetClassId,
            lastPromoted: new Date(),
            promotedBy: req.user.id,
            promotionType: 'standard',
            promotionDate: new Date(),
            
            // Academic tracking
            currentSession: nextSession,
            currentAcademicRecord: newRecord ? newRecord._id : null,
            $push: {
              previousAcademicRecords: {
                $each: archivedRecord ? [archivedRecord._id] : [],
                $position: 0
              }
            }
          },
          $inc: { promotionCount: 1 }
        },
        { 
          new: true,
          session 
        }
      ).select('name studentId class role promotionCount');

      if (updatedStudent) {
        updatedStudents.push(updatedStudent);
      }
    }

    // ========== STEP 4: Create promotion history ==========
    const promotionHistoryRecords = [];
    
    for (const studentId of studentIds) {
      const archivedRecord = archivedAcademicRecords.find(r => r.studentId.toString() === studentId.toString());
      const newRecord = newAcademicRecords.find(r => r.studentId.toString() === studentId.toString());
      const student = existingStudents.find(s => s._id.toString() === studentId.toString());
      
      const promotionRecord = new PromotionHistory({
        studentId,
        studentName: student.name,
        studentIdNumber: student.studentId,
        previousClassId: studentClassMap[studentId.toString()],
        newClassId: targetClassId,
        previousClassName: studentOriginalClass[studentId.toString()].name,
        newClassName: targetClass.name,
        previousClassLevel: studentOriginalClass[studentId.toString()].level,
        newClassLevel: targetClass.level,
        session: currentSession,
        term: currentTerm,
        promotedBy: req.user.id,
        promotionDate: new Date(),
        promotionType: 'standard',
        
        // Academic performance data
        finalAverage: archivedRecord ? archivedRecord.averagePercentage : 0,
        finalGrade: archivedRecord ? archivedRecord.finalGrade : 'N/A',
        promotionStatus: archivedRecord ? archivedRecord.promotionStatus : 'unknown',
        meetsCriteria: archivedRecord ? archivedRecord.averagePercentage >= 40 : false,
        
        // Academic references
        archivedAcademicRecordId: archivedRecord ? archivedRecord._id : null,
        newAcademicRecordId: newRecord ? newRecord._id : null,
        
        // Additional metadata
        promotionBatch: archivedRecord ? archivedRecord.promotionBatch : new mongoose.Types.ObjectId(),
        remarks: `Promoted from ${studentOriginalClass[studentId.toString()].name} to ${targetClass.name}`,
        promotionMethod: 'automatic_bulk',
        processedBy: req.user.username
      });

      const savedHistory = await promotionRecord.save({ session });
      promotionHistoryRecords.push(savedHistory);
    }

    // ========== STEP 5: Update academic record references ==========
    for (const record of newAcademicRecords) {
      const correspondingHistory = promotionHistoryRecords.find(
        h => h.studentId.toString() === record.studentId.toString()
      );
      
      if (correspondingHistory) {
        record.promotionHistoryId = correspondingHistory._id;
        await record.save({ session });
      }
    }

    // ========== STEP 6: Create next session results placeholder ==========
    // Optionally create empty result placeholders for next session
    // This helps in tracking expected subjects for the new class

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    console.log('✅ Bulk promotion completed successfully:', {
      studentsPromoted: updatedStudents.length,
      archivedRecords: archivedAcademicRecords.length,
      newRecords: newAcademicRecords.length,
      historyRecords: promotionHistoryRecords.length,
      targetClass: targetClass.name,
      fromSession: currentSession,
      toSession: nextSession
    });

    res.json({ 
      success: true,
      message: `Successfully promoted ${updatedStudents.length} students to ${nextSession}`,
      details: {
        studentsPromoted: updatedStudents.length,
        archivedRecords: archivedAcademicRecords.length,
        newAcademicRecords: newAcademicRecords.length,
        promotionHistory: promotionHistoryRecords.length,
        targetClass: {
          id: targetClass._id,
          name: targetClass.name,
          level: targetClass.level,
          grade: targetClass.grade
        },
        academicSessions: {
          from: currentSession,
          to: nextSession
        },
        promotionType: 'standard_with_records',
        timestamp: new Date()
      },
      summary: {
        eligibleCount: archivedAcademicRecords.filter(r => r.promotionStatus === 'promoted').length,
        retainedCount: archivedAcademicRecords.filter(r => r.promotionStatus === 'retained').length,
        averagePerformance: archivedAcademicRecords.length > 0 ? 
          archivedAcademicRecords.reduce((sum, r) => sum + r.averagePercentage, 0) / archivedAcademicRecords.length : 0
      }
    });

  } catch (error) {
    // Abort transaction on any error
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    
    console.error('❌ Bulk promotion with records error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        message: 'Validation error: ' + error.message,
        errors: error.errors
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error promoting students with academic records',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ==================== MANUAL PROMOTION (OVERRIDE) ====================

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
    const nextSession = calculateNextSession(currentSession);

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
    const studentOriginalClass = {};
    
    existingStudents.forEach(student => {
      studentClassMap[student._id.toString()] = student.class._id.toString();
      studentOriginalClass[student._id.toString()] = student.class;
    });

    // ========== ARCHIVE EXISTING ACADEMIC RECORDS ==========
    const archivedAcademicRecords = [];
    
    for (const studentId of studentIds) {
      const student = existingStudents.find(s => s._id.toString() === studentId.toString());
      
      // Check for existing academic records
      const currentResults = await Result.find({
        userId: studentId,
        session: { $regex: `^${currentSession}`, $options: 'i' },
        isActive: true
      }).session(session);

      if (currentResults.length > 0) {
        // Calculate statistics
        const totalScore = currentResults.reduce((sum, result) => sum + (result.score || 0), 0);
        const totalMarks = currentResults.reduce((sum, result) => sum + (result.totalMarks || 0), 0);
        const averagePercentage = totalMarks > 0 ? (totalScore / totalMarks * 100) : 0;
        const subjects = [...new Set(currentResults.map(r => r.subject))];

        const archivedRecord = new AcademicRecord({
          studentId: studentId,
          studentName: student.name,
          studentIdNumber: student.studentId,
          session: currentSession,
          class: studentOriginalClass[studentId.toString()]._id,
          className: studentOriginalClass[studentId.toString()].name,
          level: studentOriginalClass[studentId.toString()].level,
          grade: studentOriginalClass[studentId.toString()].grade,
          
          // Academic data
          totalSubjects: subjects.length,
          subjects: subjects,
          finalScore: totalScore,
          totalMarks: totalMarks,
          averagePercentage: averagePercentage,
          finalGrade: calculateGrade(averagePercentage),
          promotionStatus: 'manually_promoted',
          
          // Metadata
          isArchived: true,
          archivedAt: new Date(),
          archivedBy: req.user.id,
          archiveReason: reason,
          overridePromotion: true
        });

        const savedRecord = await archivedRecord.save({ session });
        archivedAcademicRecords.push(savedRecord);
      }
    }

    // ========== CREATE NEW ACADEMIC RECORDS ==========
    const newAcademicRecords = [];
    
    for (const studentId of studentIds) {
      const student = existingStudents.find(s => s._id.toString() === studentId.toString());
      
      const newAcademicRecord = new AcademicRecord({
        studentId: studentId,
        studentName: student.name,
        studentIdNumber: student.studentId,
        session: nextSession,
        class: targetClassId,
        className: targetClass.name,
        level: targetClass.level,
        grade: targetClass.grade,
        
        // Empty data
        totalSubjects: 0,
        subjects: [],
        finalScore: 0,
        totalMarks: 0,
        averagePercentage: 0,
        finalGrade: 'N/A',
        promotionStatus: 'pending',
        
        // Metadata
        isActive: true,
        createdBy: req.user.id,
        isOverride: true,
        overrideReason: reason
      });

      const savedRecord = await newAcademicRecord.save({ session });
      newAcademicRecords.push(savedRecord);
    }

    // ========== UPDATE STUDENTS ==========
    const updatedStudents = [];
    
    for (const studentId of studentIds) {
      const updatedStudent = await User.findByIdAndUpdate(
        studentId,
        { 
          $set: { 
            class: targetClassId,
            lastPromoted: new Date(),
            promotedBy: req.user.id,
            promotionType: 'manual_override',
            promotionReason: reason,
            promotionDate: new Date(),
            currentSession: nextSession
          } 
        },
        { 
          new: true,
          session 
        }
      );

      updatedStudents.push(updatedStudent);
    }

    // ========== CREATE PROMOTION HISTORY ==========
    const promotionHistoryRecords = studentIds.map(studentId => {
      const student = existingStudents.find(s => s._id.toString() === studentId.toString());
      const archivedRecord = archivedAcademicRecords.find(r => r.studentId.toString() === studentId.toString());
      const newRecord = newAcademicRecords.find(r => r.studentId.toString() === studentId.toString());
      
      return {
        studentId,
        studentName: student.name,
        studentIdNumber: student.studentId,
        previousClassId: studentClassMap[studentId.toString()],
        newClassId: targetClassId,
        session: currentSession,
        term: currentTerm,
        promotedBy: req.user.id,
        promotionDate: new Date(),
        promotionType: 'manual_override',
        overrideReason: reason,
        overriddenBy: req.user.id,
        
        // Academic references
        archivedAcademicRecordId: archivedRecord ? archivedRecord._id : null,
        newAcademicRecordId: newRecord ? newRecord._id : null,
        
        remarks: `Manual override: ${reason}`
      };
    });

    await PromotionHistory.insertMany(promotionHistoryRecords, { session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    console.log('✅ MANUAL promotion override completed successfully:', {
      studentsPromoted: updatedStudents.length,
      archivedRecords: archivedAcademicRecords.length,
      newRecords: newAcademicRecords.length
    });

    res.json({ 
      success: true,
      message: 'Students manually promoted successfully (override)',
      details: {
        studentsPromoted: updatedStudents.length,
        archivedRecords: archivedAcademicRecords.length,
        newAcademicRecords: newAcademicRecords.length,
        promotionHistory: promotionHistoryRecords.length,
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
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    
    console.error('❌ Manual promotion error:', error);
    
    res.status(500).json({ 
      success: false,
      message: 'Server error during manual promotion',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// ==================== PROMOTE ENTIRE CLASS ====================

router.post('/promote-class/:classId', auth, checkPermission('promote_students'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { classId } = req.params;
    const { 
      targetClassId, 
      session: promotionSession, 
      term: promotionTerm,
      includeAll = true,
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
    const nextSession = calculateNextSession(currentSession);

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

    // ========== ARCHIVE ACADEMIC RECORDS ==========
    const archivedRecords = [];
    
    for (const student of students) {
      const currentResults = await Result.find({
        userId: student._id,
        session: { $regex: `^${currentSession}`, $options: 'i' },
        isActive: true
      }).session(session);

      if (currentResults.length > 0) {
        const totalScore = currentResults.reduce((sum, result) => sum + (result.score || 0), 0);
        const totalMarks = currentResults.reduce((sum, result) => sum + (result.totalMarks || 0), 0);
        const averagePercentage = totalMarks > 0 ? (totalScore / totalMarks * 100) : 0;
        const subjects = [...new Set(currentResults.map(r => r.subject))];

        const archivedRecord = new AcademicRecord({
          studentId: student._id,
          studentName: student.name,
          studentIdNumber: student.studentId,
          session: currentSession,
          class: classId,
          className: student.class.name,
          level: student.class.level,
          grade: student.class.grade,
          
          totalSubjects: subjects.length,
          subjects: subjects,
          finalScore: totalScore,
          totalMarks: totalMarks,
          averagePercentage: averagePercentage,
          finalGrade: calculateGrade(averagePercentage),
          promotionStatus: 'class_promoted',
          
          isArchived: true,
          archivedAt: new Date(),
          archivedBy: req.user.id,
          archiveReason: reason
        });

        const savedRecord = await archivedRecord.save({ session });
        archivedRecords.push(savedRecord);
      }
    }

    // ========== CREATE NEW ACADEMIC RECORDS ==========
    const newRecords = [];
    
    for (const student of students) {
      const newRecord = new AcademicRecord({
        studentId: student._id,
        studentName: student.name,
        studentIdNumber: student.studentId,
        session: nextSession,
        class: targetClassId,
        className: targetClass.name,
        level: targetClass.level,
        grade: targetClass.grade,
        
        totalSubjects: 0,
        subjects: [],
        finalScore: 0,
        totalMarks: 0,
        averagePercentage: 0,
        finalGrade: 'N/A',
        promotionStatus: 'pending',
        
        isActive: true,
        createdBy: req.user.id,
        isClassPromotion: true
      });

      const savedRecord = await newRecord.save({ session });
      newRecords.push(savedRecord);
    }

    // ========== UPDATE STUDENTS ==========
    const updatePromises = studentIds.map(studentId =>
      User.updateOne(
        { _id: studentId },
        { 
          $set: { 
            class: targetClassId,
            lastPromoted: new Date(),
            promotedBy: req.user.id,
            promotionType: 'class_wide',
            promotionReason: reason,
            promotionDate: new Date(),
            currentSession: nextSession
          } 
        },
        { session }
      )
    );

    await Promise.all(updatePromises);

    // ========== CREATE PROMOTION HISTORY ==========
    const promotionHistoryRecords = studentIds.map(studentId => {
      const student = students.find(s => s._id.toString() === studentId.toString());
      const archivedRecord = archivedRecords.find(r => r.studentId.toString() === studentId.toString());
      const newRecord = newRecords.find(r => r.studentId.toString() === studentId.toString());
      
      return {
        studentId,
        studentName: student.name,
        studentIdNumber: student.studentId,
        previousClassId: classId,
        newClassId: targetClassId,
        session: currentSession,
        term: currentTerm,
        promotedBy: req.user.id,
        promotionDate: new Date(),
        promotionType: 'class_wide',
        overrideReason: reason,
        overriddenBy: req.user.id,
        
        archivedAcademicRecordId: archivedRecord ? archivedRecord._id : null,
        newAcademicRecordId: newRecord ? newRecord._id : null,
        
        remarks: `Class-wide promotion: ${reason}`
      };
    });

    await PromotionHistory.insertMany(promotionHistoryRecords, { session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    console.log('✅ CLASS-WIDE promotion completed successfully:', {
      studentsPromoted: students.length,
      archivedRecords: archivedRecords.length,
      newRecords: newRecords.length
    });

    res.json({ 
      success: true,
      message: `Entire class promoted successfully (${students.length} students)`,
      details: {
        studentsPromoted: students.length,
        archivedRecords: archivedRecords.length,
        newAcademicRecords: newRecords.length,
        originalClass: classId,
        targetClass: targetClass.name,
        promotionType: 'class_wide',
        overrideReason: reason
      }
    });

  } catch (error) {
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

// ==================== PROMOTION HISTORY ====================

router.get('/history/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const user = req.user;

    console.log('🔍 Promotion history request:', {
      studentId,
      requestingUser: user.username,
      userRole: user.role
    });

    // Validate student ID
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid student ID format' 
      });
    }

    // Authorization check
    if (user.role === 'student' && user.id !== studentId) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. You can only view your own promotion history.' 
      });
    }

    // Verify student exists
    const student = await User.findById(studentId)
      .select('username firstName lastName name studentId email class role admissionDate')
      .populate('class', 'name level grade section')
      .lean();
    
    if (!student || student.role !== 'student') {
      return res.status(404).json({ 
        success: false,
        message: 'Student not found' 
      });
    }

    // Get student name
    const studentName = student.name || 
                       (student.firstName && student.lastName ? 
                        `${student.firstName} ${student.lastName}` : 
                        student.username || 'Unknown');

    // Get promotion history
    const promotionHistory = await PromotionHistory.find({ studentId })
      .populate('previousClassId', 'name level grade section')
      .populate('newClassId', 'name level grade section')
      .populate('promotedBy', 'username firstName lastName name')
      .sort({ promotionDate: -1 })
      .lean();

    // Get academic records for each promotion
    const historyWithRecords = await Promise.all(
      promotionHistory.map(async (history) => {
        let archivedRecord = null;
        let newRecord = null;
        
        if (history.archivedAcademicRecordId) {
          archivedRecord = await AcademicRecord.findById(history.archivedAcademicRecordId)
            .select('session averagePercentage finalGrade totalSubjects subjects promotionStatus')
            .lean();
        }
        
        if (history.newAcademicRecordId) {
          newRecord = await AcademicRecord.findById(history.newAcademicRecordId)
            .select('session className level grade')
            .lean();
        }

        // Format promotedBy name
        let promotedByName = 'Unknown';
        if (history.promotedBy) {
          if (typeof history.promotedBy === 'object') {
            promotedByName = history.promotedBy.name || 
                            (history.promotedBy.firstName && history.promotedBy.lastName ? 
                             `${history.promotedBy.firstName} ${history.promotedBy.lastName}` : 
                             history.promotedBy.username || 'Unknown');
          }
        }

        // Get class names
        const previousClassName = history.previousClassId ? 
          (typeof history.previousClassId === 'object' ? 
           history.previousClassId.name : 'Unknown Class') : 
          'Not recorded';
        
        const newClassName = history.newClassId ? 
          (typeof history.newClassId === 'object' ? 
           history.newClassId.name : 'Unknown Class') : 
          'Not recorded';

        return {
          ...history,
          previousClassName,
          newClassName,
          promotionDateFormatted: new Date(history.promotionDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          promotionTypeLabel: history.promotionType === 'standard' ? 'Automatic' : 
                             history.promotionType === 'manual_override' ? 'Manual Override' :
                             history.promotionType === 'class_wide' ? 'Class-wide' : 'Regular',
          promotedByName,
          overrideReason: history.overrideReason || 'Not specified',
          
          // Academic records
          archivedAcademicRecord: archivedRecord ? {
            session: archivedRecord.session,
            averagePercentage: archivedRecord.averagePercentage,
            finalGrade: archivedRecord.finalGrade,
            totalSubjects: archivedRecord.totalSubjects,
            subjects: archivedRecord.subjects,
            promotionStatus: archivedRecord.promotionStatus
          } : null,
          
          newAcademicRecord: newRecord ? {
            session: newRecord.session,
            className: newRecord.className,
            level: newRecord.level,
            grade: newRecord.grade
          } : null
        };
      })
    );

    // Get all academic records for the student
    const academicRecords = await AcademicRecord.find({ studentId })
      .select('session className level grade averagePercentage finalGrade promotionStatus isArchived createdAt')
      .sort({ session: -1 })
      .lean();

    res.json({
      success: true,
      history: historyWithRecords,
      academicRecords: academicRecords,
      count: promotionHistory.length,
      student: {
        id: student._id,
        name: studentName,
        studentId: student.studentId,
        email: student.email,
        currentClass: student.class ? {
          id: student.class._id,
          name: student.class.name,
          level: student.class.level,
          grade: student.class.grade,
          section: student.class.section
        } : null,
        admissionDate: student.admissionDate
      },
      summary: {
        totalPromotions: promotionHistory.length,
        latestPromotion: promotionHistory.length > 0 ? 
          new Date(promotionHistory[0].promotionDate).toLocaleDateString() : 'Never',
        firstPromotion: promotionHistory.length > 0 ? 
          new Date(promotionHistory[promotionHistory.length - 1].promotionDate).toLocaleDateString() : 'Never',
        promotionTypes: promotionHistory.reduce((acc, curr) => {
          acc[curr.promotionType] = (acc[curr.promotionType] || 0) + 1;
          return acc;
        }, {}),
        academicSessions: [...new Set(academicRecords.map(r => r.session))].sort(),
        totalAcademicRecords: academicRecords.length
      }
    });
  } catch (error) {
    console.error('❌ Promotion history error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching promotion history',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// ==================== GET ACADEMIC HISTORY FOR REACT FRONTEND ====================
// THIS IS THE ENDPOINT YOUR REACT FRONTEND IS TRYING TO ACCESS

router.get('/academic-history/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const user = req.user;
    const { includeResults = 'false' } = req.query;

    console.log('📚 Academic history request:', {
      studentId,
      includeResults,
      user: user.username
    });

    // Authorization check
    if (user.role === 'student' && user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      });
    }

    // Get student info
    const student = await User.findById(studentId)
      .select('name studentId firstName lastName')
      .populate('class', 'name level grade section')
      .lean();
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get academic records
    const academicRecords = await AcademicRecord.find({
      studentId: studentId,
      isActive: true
    })
    .populate('classId', 'name level grade section')
    .sort({ session: -1 })
    .lean();

    // Get promotion history
    const promotionHistory = await PromotionHistory.find({ studentId })
      .populate('previousClassId', 'name level')
      .populate('newClassId', 'name level')
      .populate('promotedBy', 'username name')
      .sort({ promotionDate: -1 })
      .lean();

    // Get results if requested
    let testResults = [];
    if (includeResults === 'true') {
      testResults = await Result.find({
        studentId: studentId,
        isActive: true
      })
      .populate('testId', 'title type')
      .populate('class', 'name level')
      .sort({ session: -1, term: -1 })
      .lean();
    }

    const studentName = student.name ||
                       (student.firstName && student.lastName ?
                        `${student.firstName} ${student.lastName}` : 'Unknown');

    // Format the response
    const response = {
      success: true,
      student: {
        name: studentName,
        studentId: student.studentId,
        currentClass: student.class ? {
          name: student.class.name,
          level: student.class.level,
          grade: student.class.grade,
          section: student.class.section
        } : null,
        admissionDate: student.admissionDate
      },
      academicHistory: {
        academicRecords: academicRecords,
        promotionHistory: promotionHistory,
        testResults: testResults,
        count: academicRecords.length
      },
      summary: {
        totalAcademicRecords: academicRecords.length,
        totalPromotions: promotionHistory.length,
        totalTestResults: testResults.length,
        sessions: [...new Set(academicRecords.map(r => r.session))].sort(),
        latestPromotion: promotionHistory.length > 0 ?
          new Date(promotionHistory[0].promotionDate).toLocaleDateString() : 'Never',
        overallAverage: academicRecords.length > 0 ?
          academicRecords.reduce((sum, r) => sum + (r.averagePercentage || 0), 0) / academicRecords.length : 0
      },
      generatedAt: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Error in academic-history endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching academic history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================== BACKFILL ACADEMIC RECORDS ====================
// This endpoint creates academic records for students who were promoted before this system was implemented

router.post('/backfill-records', auth, checkPermission('manage_academics'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { studentIds, session: academicSession } = req.body;
    
    console.log('🔧 Starting academic records backfill:', {
      studentCount: studentIds?.length || 'all',
      session: academicSession,
      user: req.user.username
    });

    // If no specific student IDs provided, get all students
    const query = { role: 'student' };
    if (studentIds && studentIds.length > 0) {
      query._id = { $in: studentIds };
    }

    const students = await User.find(query)
      .populate('class')
      .session(session);

    console.log(`📊 Found ${students.length} students to process`);

    let createdRecords = 0;
    let updatedStudents = 0;
    let skippedRecords = 0;

    for (const student of students) {
      try {
        const studentId = student._id;
        
        // Determine which session to backfill
        let targetSession = academicSession;
        if (!targetSession) {
          // Try to determine session from promotion date or current year
          if (student.lastPromoted) {
            const year = student.lastPromoted.getFullYear();
            targetSession = `${year - 1}/${year}`;
          } else {
            // Use current session minus 1 year
            const currentYear = new Date().getFullYear();
            targetSession = `${currentYear - 1}/${currentYear}`;
          }
        }

        console.log(`🔄 Processing student ${student.studentId} for session ${targetSession}`);

        // Check if academic record already exists for this session
        const existingRecord = await AcademicRecord.findOne({
          studentId: studentId,
          session: targetSession
        }).session(session);

        if (existingRecord) {
          console.log(`⏭️ Academic record already exists for ${student.studentId} - session ${targetSession}`);
          skippedRecords++;
          continue;
        }

        // Get all results for this student in the target session
        const studentResults = await Result.find({
          userId: studentId,
          session: { $regex: `^${targetSession}`, $options: 'i' },
          isActive: true
        })
        .populate('class', 'name level grade')
        .session(session);

        if (studentResults.length === 0) {
          console.log(`⚠️ No results found for ${student.studentId} in session ${targetSession}`);
          
          // Create empty academic record for history purposes
          const emptyRecord = new AcademicRecord({
            studentId: studentId,
            studentName: student.name,
            studentIdNumber: student.studentId,
            session: targetSession,
            academicYear: targetSession,
            class: student.class ? student.class._id : null,
            className: student.class ? student.class.name : 'Unknown',
            level: student.class ? student.class.level : 'Unknown',
            grade: student.class ? student.class.grade : 'Unknown',
            
            totalSubjects: 0,
            subjects: [],
            
            firstTermResults: [],
            secondTermResults: [],
            thirdTermResults: [],
            
            termAverages: {
              firstTerm: 0,
              secondTerm: 0,
              thirdTerm: 0
            },
            
            finalScore: 0,
            totalMarks: 0,
            averagePercentage: 0,
            finalGrade: 'N/A',
            overallRemarks: 'No results available',
            promotionStatus: 'unknown',
            promotionEligibility: false,
            
            // Metadata
            recordType: 'backfilled',
            isArchived: true,
            isBackfill: true,
            backfilledAt: new Date(),
            backfilledBy: req.user.id,
            notes: 'Backfilled academic record - no results found'
          });

          await emptyRecord.save({ session });
          createdRecords++;
          console.log(`📝 Created empty backfill record for ${student.studentId}`);
          
        } else {
          // Calculate statistics from existing results
          const totalScore = studentResults.reduce((sum, result) => sum + (result.score || 0), 0);
          const totalMarks = studentResults.reduce((sum, result) => sum + (result.totalMarks || 0), 0);
          const averagePercentage = totalMarks > 0 ? (totalScore / totalMarks * 100) : 0;
          
          // Get unique subjects
          const subjects = [...new Set(studentResults.map(r => r.subject))];
          
          // Group results by term
          const resultsByTerm = {
            'First Term': studentResults.filter(r => r.term === 'First Term'),
            'Second Term': studentResults.filter(r => r.term === 'Second Term'),
            'Third Term': studentResults.filter(r => r.term === 'Third Term')
          };

          // Calculate term averages
          const termAverages = {};
          Object.keys(resultsByTerm).forEach(term => {
            const termResults = resultsByTerm[term];
            if (termResults.length > 0) {
              const termTotal = termResults.reduce((sum, r) => sum + (r.score || 0), 0);
              const termMax = termResults.reduce((sum, r) => sum + (r.totalMarks || 0), 0);
              termAverages[term] = termMax > 0 ? (termTotal / termMax * 100) : 0;
            }
          });

          // Determine promotion status
          let promotionStatus = 'unknown';
          if (averagePercentage > 0) {
            promotionStatus = averagePercentage >= 40 ? 'promoted' : 'retained';
          }

          // Get the class info from results or student
          const classFromResults = studentResults[0]?.class || student.class;
          
          // Create backfilled academic record
          const backfilledRecord = new AcademicRecord({
            studentId: studentId,
            studentName: student.name,
            studentIdNumber: student.studentId,
            session: targetSession,
            academicYear: targetSession,
            class: classFromResults ? classFromResults._id : null,
            className: classFromResults ? classFromResults.name : 'Unknown',
            level: classFromResults ? classFromResults.level : 'Unknown',
            grade: classFromResults ? classFromResults.grade : 'Unknown',
            section: classFromResults ? classFromResults.section : 'N/A',
            
            totalSubjects: subjects.length,
            subjects: subjects,
            
            firstTermResults: resultsByTerm['First Term'].map(r => ({
              subject: r.subject,
              score: r.score,
              totalMarks: r.totalMarks,
              percentage: r.percentage || (r.totalMarks > 0 ? (r.score / r.totalMarks * 100) : 0),
              grade: r.grade || calculateGrade(r.percentage || (r.totalMarks > 0 ? (r.score / r.totalMarks * 100) : 0)),
              remarks: getRemarks(r.percentage || (r.totalMarks > 0 ? (r.score / r.totalMarks * 100) : 0))
            })),
            
            secondTermResults: resultsByTerm['Second Term'].map(r => ({
              subject: r.subject,
              score: r.score,
              totalMarks: r.totalMarks,
              percentage: r.percentage || (r.totalMarks > 0 ? (r.score / r.totalMarks * 100) : 0),
              grade: r.grade || calculateGrade(r.percentage || (r.totalMarks > 0 ? (r.score / r.totalMarks * 100) : 0)),
              remarks: getRemarks(r.percentage || (r.totalMarks > 0 ? (r.score / r.totalMarks * 100) : 0))
            })),
            
            thirdTermResults: resultsByTerm['Third Term'].map(r => ({
              subject: r.subject,
              score: r.score,
              totalMarks: r.totalMarks,
              percentage: r.percentage || (r.totalMarks > 0 ? (r.score / r.totalMarks * 100) : 0),
              grade: r.grade || calculateGrade(r.percentage || (r.totalMarks > 0 ? (r.score / r.totalMarks * 100) : 0)),
              remarks: getRemarks(r.percentage || (r.totalMarks > 0 ? (r.score / r.totalMarks * 100) : 0))
            })),
            
            termAverages: {
              firstTerm: termAverages['First Term'] || 0,
              secondTerm: termAverages['Second Term'] || 0,
              thirdTerm: termAverages['Third Term'] || 0
            },
            
            finalScore: totalScore,
            totalMarks: totalMarks,
            averagePercentage: averagePercentage,
            finalGrade: calculateGrade(averagePercentage),
            overallRemarks: getRemarks(averagePercentage),
            promotionStatus: promotionStatus,
            promotionEligibility: averagePercentage >= 40,
            
            // Attendance (default values)
            totalDaysPresent: 0,
            totalDaysAbsent: 0,
            attendancePercentage: 0,
            behaviorRemarks: 'Satisfactory',
            
            // Teacher comments
            teacherComments: `Backfilled academic record for ${targetSession}`,
            principalComments: `Promotion status: ${promotionStatus.toUpperCase()}`,
            
            // Metadata
            recordType: 'backfilled',
            isArchived: true,
            isBackfill: true,
            backfilledAt: new Date(),
            backfilledBy: req.user.id,
            backfillNotes: `Created from ${studentResults.length} existing result records`,
            
            // Reference to original results
            originalResults: studentResults.map(r => r._id)
          });

          await backfilledRecord.save({ session });
          createdRecords++;
          console.log(`✅ Backfilled academic record for ${student.studentId} with ${studentResults.length} results`);
        }

        // Update student document to reference this academic record
        const existingAcademicRecords = await AcademicRecord.find({
          studentId: studentId,
          isArchived: true
        })
        .sort({ session: -1 })
        .session(session);

        if (existingAcademicRecords.length > 0) {
          // Find the most recent academic record for current session
          const currentAcademicRecord = await AcademicRecord.findOne({
            studentId: studentId,
            isActive: true
          }).session(session);

          await User.findByIdAndUpdate(
            studentId,
            {
              $addToSet: {
                previousAcademicRecords: {
                  $each: existingAcademicRecords.map(r => r._id)
                }
              },
              ...(currentAcademicRecord && {
                $set: { currentAcademicRecord: currentAcademicRecord._id }
              })
            },
            { session }
          );
          
          updatedStudents++;
        }

      } catch (error) {
        console.error(`❌ Error processing student ${student.studentId}:`, error.message);
        // Continue with next student
      }
    }

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    console.log('✅ Academic records backfill completed:', {
      processed: students.length,
      created: createdRecords,
      skipped: skippedRecords,
      updatedStudents: updatedStudents
    });

    res.json({
      success: true,
      message: `Successfully backfilled academic records`,
      details: {
        totalStudentsProcessed: students.length,
        academicRecordsCreated: createdRecords,
        studentsUpdated: updatedStudents,
        recordsSkipped: skippedRecords
      }
    });

  } catch (error) {
    // Abort transaction on any error
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    
    console.error('❌ Academic records backfill error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error during academic records backfill',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// ==================== GET STUDENT'S COMPLETE ACADEMIC HISTORY ====================

router.get('/complete-history/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const user = req.user;

    // Authorization check
    if (user.role === 'student' && user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own academic history.'
      });
    }

    // Validate student ID
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID format'
      });
    }

    // Get student info
    const student = await User.findById(studentId)
      .select('name studentId firstName lastName email dateOfBirth gender admissionDate class')
      .populate('class', 'name level grade section')
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get ALL academic records for this student
    const academicRecords = await AcademicRecord.find({ studentId: studentId })
      .sort({ session: 1 }) // Sort by session ascending (oldest first)
      .lean();

    // Get promotion history
    const promotionHistory = await PromotionHistory.find({ studentId: studentId })
      .populate('previousClassId', 'name level')
      .populate('newClassId', 'name level')
      .populate('promotedBy', 'username name')
      .sort({ promotionDate: 1 })
      .lean();

    // Get all results (for backward compatibility)
    const allResults = await Result.find({ userId: studentId })
      .select('subject score totalMarks percentage grade term session createdAt')
      .sort({ session: 1, term: 1 })
      .lean();

    // Group results by session
    const resultsBySession = {};
    allResults.forEach(result => {
      if (!resultsBySession[result.session]) {
        resultsBySession[result.session] = {};
      }
      if (!resultsBySession[result.session][result.term]) {
        resultsBySession[result.session][result.term] = [];
      }
      resultsBySession[result.session][result.term].push(result);
    });

    // Format complete academic history
    const completeHistory = {
      studentInfo: {
        id: student._id,
        name: student.name || `${student.firstName} ${student.lastName}`,
        studentId: student.studentId,
        email: student.email,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        admissionDate: student.admissionDate,
        currentClass: student.class ? {
          name: student.class.name,
          level: student.class.level,
          grade: student.class.grade,
          section: student.class.section
        } : null
      },
      
      academicTimeline: academicRecords.map(record => {
        // Find promotion entry for this session
        const promotion = promotionHistory.find(p => 
          p.session === record.session || 
          (record.archivedAcademicRecordId && p.archivedAcademicRecordId && 
           p.archivedAcademicRecordId.toString() === record._id.toString())
        );

        return {
          session: record.session,
          academicYear: record.academicYear,
          class: {
            name: record.className,
            level: record.level,
            grade: record.grade,
            section: record.section
          },
          
          academicPerformance: {
            averagePercentage: record.averagePercentage,
            finalGrade: record.finalGrade,
            totalSubjects: record.totalSubjects,
            subjects: record.subjects,
            
            termAverages: record.termAverages,
            termResults: {
              firstTerm: record.firstTermResults,
              secondTerm: record.secondTermResults,
              thirdTerm: record.thirdTermResults
            },
            
            finalScore: record.finalScore,
            totalMarks: record.totalMarks
          },
          
          promotionDetails: promotion ? {
            promotionDate: promotion.promotionDate,
            promotionType: promotion.promotionType,
            fromClass: promotion.previousClassName || (promotion.previousClassId?.name || 'Unknown'),
            toClass: promotion.newClassName || (promotion.newClassId?.name || 'Unknown'),
            promotedBy: promotion.promotedBy?.name || promotion.promotedBy?.username || 'Unknown'
          } : null,
          
          recordMetadata: {
            isArchived: record.isArchived,
            isBackfill: record.isBackfill || false,
            createdAt: record.createdAt || record.backfilledAt,
            recordType: record.recordType
          }
        };
      }),
      
      // Include raw results for sessions without academic records
      rawResults: Object.keys(resultsBySession).map(session => {
        // Check if we already have an academic record for this session
        const hasAcademicRecord = academicRecords.some(record => 
          record.session === session
        );

        if (hasAcademicRecord) {
          return null; // Skip, already included in academic timeline
        }

        // Calculate averages for this session
        const sessionResults = Object.values(resultsBySession[session]).flat();
        const totalScore = sessionResults.reduce((sum, r) => sum + (r.score || 0), 0);
        const totalMarks = sessionResults.reduce((sum, r) => sum + (r.totalMarks || 0), 0);
        const averagePercentage = totalMarks > 0 ? (totalScore / totalMarks * 100) : 0;

        return {
          session: session,
          hasAcademicRecord: false,
          summary: {
            totalResults: sessionResults.length,
            averagePercentage: averagePercentage,
            finalGrade: calculateGrade(averagePercentage)
          },
          termResults: resultsBySession[session]
        };
      }).filter(Boolean), // Remove null entries
      
      // Calculate overall statistics
      overallStatistics: {
        totalSessions: academicRecords.length + Object.keys(resultsBySession).length,
        sessionsWithAcademicRecords: academicRecords.length,
        sessionsWithOnlyResults: Object.keys(resultsBySession).filter(session => 
          !academicRecords.some(record => record.session === session)
        ).length,
        
        overallAverage: academicRecords.length > 0 ? 
          academicRecords.reduce((sum, r) => sum + r.averagePercentage, 0) / academicRecords.length : 0,
        
        promotionCount: academicRecords.filter(r => 
          r.promotionStatus === 'promoted' || 
          r.promotionStatus === 'manually_promoted'
        ).length,
        
        bestSession: academicRecords.length > 0 ? 
          academicRecords.reduce((best, current) => 
            current.averagePercentage > best.averagePercentage ? current : best
          ).session : null,
        
        worstSession: academicRecords.length > 0 ? 
          academicRecords.reduce((worst, current) => 
            current.averagePercentage < worst.averagePercentage ? current : worst
          ).session : null
      }
    };

    res.json({
      success: true,
      completeHistory,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('❌ Complete academic history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching complete academic history',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// ==================== HELPER FUNCTIONS ====================

function getRemarks(percentage) {
  if (percentage >= 80) return 'Excellent';
  if (percentage >= 70) return 'Very Good';
  if (percentage >= 60) return 'Good';
  if (percentage >= 50) return 'Average';
  if (percentage >= 40) return 'Pass';
  return 'Needs Improvement';
}

module.exports = router;
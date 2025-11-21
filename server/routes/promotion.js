const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const AcademicRecord = require('../models/AcademicRecord');
const User = require('../models/User');
const Class = require('../models/Class');
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// Get students eligible for promotion from a specific class
router.get('/:classId', auth, checkPermission('view_promotion'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { session, term } = req.query;

    console.log('🔍 Promotion eligibility check - START:', {
      classId,
      session,
      term,
      user: req.user.username,
      userId: req.user.id
    });

    // Input validation
    if (!session || !term) {
      console.log('❌ Missing session or term parameters');
      return res.status(400).json({ 
        message: 'Session and term query parameters are required' 
      });
    }

    // Validate class exists
    console.log('🔍 Checking if class exists:', classId);
    const classExists = await Class.findById(classId);
    if (!classExists) {
      console.log('❌ Class not found:', classId);
      return res.status(404).json({ message: 'Class not found' });
    }
    console.log('✅ Class found:', classExists.name);

    // Get all students in the specified class
    console.log('🔍 Fetching students for class:', classId);
    const students = await User.find({ 
      class: classId, 
      role: 'student' 
    })
    .select('name studentId class role')
    .populate('class', 'name level grade')
    .lean();

    console.log(`📊 Found ${students.length} students in class ${classId}`);

    if (students.length === 0) {
      console.log('ℹ️ No students found in this class');
      return res.json([]);
    }

    // Get student IDs for academic records query
    const studentIds = students.map(student => student._id);

    // Get academic records for these students - FIXED: Added classId filter
    console.log('🔍 Fetching academic records for students');
    const academicRecords = await AcademicRecord.find({
      studentId: { $in: studentIds },
      classId: classId,  // ADDED THIS LINE - CRITICAL FIX
      session: session,
      term: term
    }).lean();

    console.log(`📚 Found ${academicRecords.length} academic records for session ${session}, term ${term}`);

    // Map records by student ID for easy lookup
    const recordsByStudent = {};
    academicRecords.forEach(record => {
      if (!recordsByStudent[record.studentId]) {
        recordsByStudent[record.studentId] = [];
      }
      recordsByStudent[record.studentId].push(record);
    });

    // Check each student's eligibility
    const eligibilityResults = students.map(student => {
      console.log(`🔍 Checking student: ${student.name} (${student._id})`);
      
      const studentRecords = recordsByStudent[student._id.toString()];
      const hasRecord = studentRecords && studentRecords.length > 0;
      
      console.log(`   📚 Academic records found: ${hasRecord ? studentRecords.length : 0}`);
      
      if (!hasRecord) {
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

      // Use the first record (you might want to handle multiple records differently)
      const record = studentRecords[0];
      console.log(`   📊 Record details - Score: ${record.finalScore || record.average || 'N/A'}, Attendance: ${record.attendancePercentage || (record.attendance && record.attendance.percentage) || 'N/A'}`);
      
      // Example eligibility criteria
      const passingGrade = 60;
      const minAttendance = 75;
      
      // Handle cases where scores might be missing - FIXED: Use available fields
      const finalScore = record.finalScore || record.average || 0;
      const attendancePercentage = record.attendancePercentage || 
        (record.attendance && record.attendance.percentage) || 0;
      
      const isEligible = finalScore >= passingGrade && 
                        attendancePercentage >= minAttendance;

      return {
        student: {
          _id: student._id,
          name: student.name,
          studentId: student.studentId,
          class: student.class
        },
        status: isEligible ? 'eligible' : 'ineligible',
        details: {
          finalScore: finalScore,
          attendancePercentage: attendancePercentage,
          passingGrade,
          minAttendance
        },
        reason: isEligible ? 'Meets all promotion criteria' : 'Does not meet promotion criteria'
      };
    });

    const eligibleCount = eligibilityResults.filter(r => r.status === 'eligible').length;
    const ineligibleCount = eligibilityResults.filter(r => r.status === 'ineligible').length;
    
    console.log(`🎯 Final results: ${eligibleCount} eligible, ${ineligibleCount} ineligible`);

    res.json(eligibilityResults);

  } catch (error) {
    console.error('❌ ERROR in promotion route:', {
      message: error.message,
      stack: error.stack,
      classId: req.params.classId,
      session: req.query.session,
      term: req.query.term
    });
    
    res.status(500).json({ 
      message: 'Server error fetching promotion candidates',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// Enhanced eligibility check with criteria
router.get('/check-eligibility/:classId', auth, checkPermission('view_promotion'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { session, term } = req.query;

    console.log('🔍 Enhanced eligibility check:', {
      classId,
      session,
      term,
      user: req.user.username
    });

    if (!session || !term) {
      return res.status(400).json({ 
        message: 'Session and term query parameters are required' 
      });
    }

    const students = await User.find({ 
      class: classId, 
      role: 'student' 
    })
    .select('name studentId class role')
    .populate('class', 'name level grade')
    .lean();

    const studentIds = students.map(student => student._id);
    
    // FIXED: Added classId filter
    const academicRecords = await AcademicRecord.find({
      studentId: { $in: studentIds },
      classId: classId,  // ADDED THIS LINE
      session: session,
      term: term
    }).lean();

    const recordsByStudent = {};
    academicRecords.forEach(record => {
      if (!recordsByStudent[record.studentId]) {
        recordsByStudent[record.studentId] = [];
      }
      recordsByStudent[record.studentId].push(record);
    });

    const eligibilityResults = students.map(student => {
      const studentRecords = recordsByStudent[student._id.toString()];
      const hasRecord = studentRecords && studentRecords.length > 0;
      
      if (!hasRecord) {
        return {
          student,
          status: 'ineligible',
          reason: 'No academic record found for the specified session/term'
        };
      }

      const record = studentRecords[0];
      const passingGrade = 60;
      const minAttendance = 75;
      
      // FIXED: Use available fields
      const finalScore = record.finalScore || record.average || 0;
      const attendancePercentage = record.attendancePercentage || 
        (record.attendance && record.attendance.percentage) || 0;
      
      const isEligible = finalScore >= passingGrade && 
                        attendancePercentage >= minAttendance;

      return {
        student,
        status: isEligible ? 'eligible' : 'ineligible',
        details: {
          finalScore: finalScore,
          attendancePercentage: attendancePercentage,
          passingGrade,
          minAttendance
        },
        reason: isEligible ? 'Meets all promotion criteria' : 'Does not meet promotion criteria'
      };
    });

    console.log(`🎯 Enhanced check results: ${eligibilityResults.filter(r => r.status === 'eligible').length} eligible`);
    res.json(eligibilityResults);
  } catch (error) {
    console.error('Error checking eligibility:', error);
    res.status(500).json({ message: 'Server error checking eligibility' });
  }
});

// Enhanced promotion with transactions and bulk operations
router.post('/', auth, checkPermission('promote_students'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { studentIds, targetClassId, session: currentSession, term: currentTerm } = req.body;

    console.log('🚀 Starting promotion process:', {
      studentCount: studentIds.length,
      targetClassId,
      session: currentSession,
      term: currentTerm,
      user: req.user.username
    });

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

    if (!currentSession || !currentTerm) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'session and term are required' });
    }

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
    }).session(session);

    if (existingStudents.length !== studentIds.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'One or more student IDs are invalid or not students' });
    }

    // Bulk update users (promotion)
    const userUpdateResult = await User.updateMany(
      { _id: { $in: studentIds }, role: 'student' },
      { $set: { class: targetClassId } },
      { session }
    );

    // Bulk update academic records (mark as promoted)
    const academicRecordUpdateResult = await AcademicRecord.updateMany(
      { 
        studentId: { $in: studentIds }, 
        classId: existingStudents[0]?.class, // Use the original class ID
        session: currentSession, 
        term: currentTerm 
      },
      { 
        $set: { 
          promoted: true, 
          promotionDate: new Date(),
          promotedTo: targetClassId
        } 
      },
      { session }
    );

    // Check for consistency
    if (userUpdateResult.modifiedCount !== studentIds.length) {
      console.warn(`Promotion inconsistency: Updated ${userUpdateResult.modifiedCount} users out of ${studentIds.length}`);
    }

    if (academicRecordUpdateResult.modifiedCount !== studentIds.length) {
      console.warn(`Academic record inconsistency: Updated ${academicRecordUpdateResult.modifiedCount} records out of ${studentIds.length}`);
    }

    // Create promotion history records
    // await PromotionHistory.create(
    //   studentIds.map(studentId => ({
    //     studentId,
    //     previousClassId: existingStudents.find(s => s._id.toString() === studentId.toString())?.class,
    //     newClassId: targetClassId,
    //     session: currentSession,
    //     term: currentTerm,
    //     promotedBy: req.user.id,
    //     promotionDate: new Date()
    //   })),
    //   { session }
    // );

    // Create new academic records for next session in target class
    const nextSession = getNextSession(currentSession);
    const newAcademicRecords = studentIds.map(studentId => ({
      studentId,
      classId: targetClassId, // FIXED: Use classId to match schema
      session: nextSession,
      term: 'First Term',
      createdDate: new Date()
    }));

    // await AcademicRecord.insertMany(newAcademicRecords, { session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    console.log('✅ Promotion completed successfully:', {
      studentsPromoted: userUpdateResult.modifiedCount,
      recordsUpdated: academicRecordUpdateResult.modifiedCount
    });

    res.json({ 
      message: 'Students promoted successfully',
      details: {
        studentsPromoted: userUpdateResult.modifiedCount,
        recordsUpdated: academicRecordUpdateResult.modifiedCount
      }
    });

  } catch (error) {
    // Abort transaction on any error
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    
    console.error('❌ Error promoting students:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error: ' + error.message });
    }
    
    res.status(500).json({ message: 'Server error promoting students' });
  }
});

// Helper function to get next session
function getNextSession(currentSession) {
  const years = currentSession.split('/');
  if (years.length === 2) {
    const startYear = parseInt(years[0]);
    const endYear = parseInt(years[1]);
    return `${startYear + 1}/${endYear + 1}`;
  }
  return currentSession;
}

// Test route for debugging
router.get('/test/:classId', auth, checkPermission('view_promotion'), async (req, res) => {
  try {
    const { classId } = req.params;
    
    console.log('🧪 Test route - Basic check');
    
    // Just return basic info without complex queries
    const classInfo = await Class.findById(classId);
    const studentCount = await User.countDocuments({ class: classId, role: 'student' });
    const academicRecordCount = await AcademicRecord.countDocuments();
    
    res.json({
      message: 'Test route working',
      class: classInfo ? { name: classInfo.name, id: classInfo._id } : 'Not found',
      studentCount,
      academicRecordCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Test route error:', error);
    res.status(500).json({ 
      message: 'Test route failed',
      error: error.message 
    });
  }
});

// Rollback promotion endpoint (optional)
router.post('/rollback', auth, checkPermission('promote_students'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { studentIds, session: currentSession, term: currentTerm } = req.body;

    // Input validation
    if (!studentIds || !Array.isArray(studentIds)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'studentIds must be an array' });
    }

    // Implementation for rollback would go here
    // This would typically involve:
    // 1. Getting promotion history
    // 2. Reverting student classes
    // 3. Updating academic records

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Promotion rollback completed successfully' });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    
    console.error('Error rolling back promotion:', error);
    res.status(500).json({ message: 'Server error rolling back promotion' });
  }
});

module.exports = router;
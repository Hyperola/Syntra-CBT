const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const AcademicRecord = require('../models/AcademicRecord');
const User = require('../models/User');
const Class = require('../models/Class');
const Result = require('../models/Result');
const { auth } = require('../middleware/auth');

// Get student transcript - COMPLETELY FIXED FOR CA1(20)/CA2(20)/EXAM(60) SYSTEM
router.get('/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const user = req.user;
    const { session: specificSession, term: specificTerm, rebuild = 'false', includePromotion = 'false' } = req.query;

    console.log('📄 Transcript request for student:', studentId);
    console.log('🔍 Query params:', { specificSession, specificTerm, rebuild, includePromotion });

    // Authorization check
    if (user.role === 'student' && user.id !== studentId) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. You can only view your own transcript.' 
      });
    }

    // Get student details
    const student = await User.findById(studentId)
      .populate('class', 'name level')
      .select('name surname studentId username email class admissionDate dateOfBirth gender');

    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: 'Student not found' 
      });
    }

    const studentName = student.name && student.surname ? 
      `${student.name} ${student.surname}` : 
      student.name || student.username;

    console.log('👤 Student:', studentName, 'ID:', student.studentId);

    // Build query for results
    const resultsQuery = {
      userId: studentId,
      isActive: true
    };

    if (specificSession) {
      resultsQuery.session = specificSession;
      console.log('📅 Filtering by session:', specificSession);
    }
    
    if (specificTerm) {
      resultsQuery.term = specificTerm;
      console.log('📅 Filtering by term:', specificTerm);
    }

    // Get all test results for this student
    const testResults = await Result.find(resultsQuery)
      .populate('testId', 'title type subject class totalMarks')
      .populate('class', 'name level')
      .sort({ session: 1, term: 1, submittedAt: 1 })
      .lean();

    console.log(`📊 Found ${testResults.length} test results`);

    if (testResults.length === 0) {
      console.log('⚠️ No test results found');
      return res.json({
        success: true,
        student: {
          name: studentName,
          studentId: student.studentId || student.username,
          currentClass: student.class?.name || 'Not assigned',
          level: student.class?.level || 'N/A',
          admissionDate: student.admissionDate,
          dateOfBirth: student.dateOfBirth,
          gender: student.gender,
          email: student.email
        },
        records: [],
        summary: {
          message: 'No academic data found for this student'
        },
        generatedAt: new Date().toISOString(),
        isOfficial: false,
        dataSource: 'none'
      });
    }

    // GROUP RESULTS PROPERLY FOR CA1(20)/CA2(20)/EXAM(60) SYSTEM
    console.log('🔍 Grouping results by session, term, and subject...');
    
    // First, group by session -> term -> subject -> test type
    const groupedResults = {};
    
    testResults.forEach(result => {
      if (!result.session || !result.term || !result.subject) {
        console.log('⚠️ Skipping result without session/term/subject:', result._id);
        return;
      }
      
      const sessionTermKey = `${result.session}|${result.term}`;
      if (!groupedResults[sessionTermKey]) {
        groupedResults[sessionTermKey] = {
          session: result.session,
          term: result.term,
          class: result.class?._id || student.class?._id,
          className: result.class?.name || student.class?.name || 'Unknown',
          level: result.class?.level || student.class?.level || 'N/A',
          subjects: {}
        };
      }
      
      const subject = result.subject;
      if (!groupedResults[sessionTermKey].subjects[subject]) {
        groupedResults[sessionTermKey].subjects[subject] = {
          ca1: null,    // Continuous Assessment 1 (max 20)
          ca2: null,    // Continuous Assessment 2 (max 20)
          exam: null,   // Examination (max 60)
          otherTests: []
        };
      }
      
      // Identify test type from title or type
      const testTitle = (result.testId?.title || '').toLowerCase();
      const testType = result.testId?.type?.toLowerCase() || '';
      const score = result.score || 0;
      
      console.log(`   ${result.session} - ${result.term} - ${subject}: ${testTitle} (${testType}) = ${score}/${result.totalMarks}`);
      
      // Determine test type and store score
      if (testTitle.includes('ca1') || testType.includes('ca1') || 
          testTitle.includes('continuous assessment 1') || testTitle.includes('ca 1')) {
        // CA1 - should be out of 20
        groupedResults[sessionTermKey].subjects[subject].ca1 = Math.min(score, 20);
      } 
      else if (testTitle.includes('ca2') || testType.includes('ca2') || 
               testTitle.includes('continuous assessment 2') || testTitle.includes('ca 2')) {
        // CA2 - should be out of 20
        groupedResults[sessionTermKey].subjects[subject].ca2 = Math.min(score, 20);
      } 
      else if (testTitle.includes('exam') || testType.includes('exam') || 
               testTitle.includes('examination') || testTitle.includes('final')) {
        // Exam - should be out of 60
        groupedResults[sessionTermKey].subjects[subject].exam = Math.min(score, 60);
      } 
      else {
        // Unknown test type - add to other tests
        groupedResults[sessionTermKey].subjects[subject].otherTests.push({
          title: testTitle,
          type: testType,
          score: score,
          totalMarks: result.totalMarks || 100
        });
      }
    });

    // Process grouped results to calculate subject totals
    const termRecords = [];
    
    Object.values(groupedResults).forEach(termData => {
      const subjectGrades = {};
      let totalScore = 0;
      let totalPossible = 0;
      let subjectCount = 0;
      
      Object.entries(termData.subjects).forEach(([subject, scores]) => {
        // Get scores (default to 0 if not found)
        const ca1 = scores.ca1 !== null ? scores.ca1 : 0;
        const ca2 = scores.ca2 !== null ? scores.ca2 : 0;
        const exam = scores.exam !== null ? scores.exam : 0;
        
        // Calculate subject total (CA1 + CA2 + Exam)
        const subjectTotal = ca1 + ca2 + exam;
        const maxPossible = 100; // CA1(20) + CA2(20) + Exam(60)
        
        // If we have other tests, include them proportionally
        if (scores.otherTests.length > 0) {
          console.log(`   ${subject} has ${scores.otherTests.length} other tests, adjusting...`);
          // For now, add them to the total proportionally
          scores.otherTests.forEach(test => {
            const testPercentage = test.totalMarks > 0 ? (test.score / test.totalMarks) : 0;
            // Assume other tests contribute to the remaining portion
            const adjustedScore = testPercentage * (maxPossible - subjectTotal);
            subjectTotal += adjustedScore;
          });
        }
        
        // Ensure total doesn't exceed max possible
        const finalTotal = Math.min(subjectTotal, maxPossible);
        const percentage = (finalTotal / maxPossible) * 100;
        
        // Calculate grade
        let grade, gradePoint;
        if (percentage >= 90) { grade = 'A+'; gradePoint = 5.0; }
        else if (percentage >= 80) { grade = 'A'; gradePoint = 4.0; }
        else if (percentage >= 70) { grade = 'B'; gradePoint = 3.5; }
        else if (percentage >= 65) { grade = 'B-'; gradePoint = 3.0; }
        else if (percentage >= 60) { grade = 'C+'; gradePoint = 2.5; }
        else if (percentage >= 55) { grade = 'C'; gradePoint = 2.0; }
        else if (percentage >= 50) { grade = 'C-'; gradePoint = 1.5; }
        else if (percentage >= 45) { grade = 'D+'; gradePoint = 1.0; }
        else if (percentage >= 40) { grade = 'D'; gradePoint = 0.5; }
        else { grade = 'F'; gradePoint = 0.0; }
        
        // Store subject grade
        subjectGrades[subject] = {
          subject: subject,
          ca1: ca1.toFixed(1),
          ca2: ca2.toFixed(1),
          exam: exam.toFixed(1),
          total: finalTotal.toFixed(1),
          percentage: percentage.toFixed(1),
          grade: grade,
          gradePoint: gradePoint,
          credits: getSubjectCredits(subject),
          maxPossible: maxPossible,
          remark: getRemark(percentage),
          hasCa1: scores.ca1 !== null,
          hasCa2: scores.ca2 !== null,
          hasExam: scores.exam !== null
        };
        
        // Update term totals
        totalScore += finalTotal;
        totalPossible += maxPossible;
        subjectCount++;
      });
      
      // Calculate term average
      const termAverage = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
      
      // Calculate term GPA
      let totalGradePoints = 0;
      let totalCredits = 0;
      
      Object.values(subjectGrades).forEach(grade => {
        totalGradePoints += grade.gradePoint * grade.credits;
        totalCredits += grade.credits;
      });
      
      const termGPA = totalCredits > 0 ? (totalGradePoints / totalCredits) : 0;
      
      // Determine promotion (40% criteria)
      const promoted = termAverage >= 40;
      
      termRecords.push({
        session: termData.session,
        term: termData.term,
        class: termData.className,
        level: termData.level,
        grades: subjectGrades,
        totalScore: Math.round(totalScore),
        totalPossible: Math.round(totalPossible),
        average: termAverage.toFixed(1),
        gpa: termGPA.toFixed(2),
        promoted: promoted,
        promotionEligibility: promoted,
        subjectCount: subjectCount,
        dataType: 'calculated',
        summary: {
          totalSubjects: subjectCount,
          averageScore: `${termAverage.toFixed(1)}%`,
          bestSubject: Object.keys(subjectGrades).reduce((best, subject) => {
            const current = subjectGrades[subject];
            const bestSubject = best ? subjectGrades[best] : { gradePoint: 0 };
            return current.gradePoint > bestSubject.gradePoint ? subject : best;
          }, null),
          worstSubject: Object.keys(subjectGrades).reduce((worst, subject) => {
            const current = subjectGrades[subject];
            const worstSubject = worst ? subjectGrades[worst] : { gradePoint: 5 };
            return current.gradePoint < worstSubject.gradePoint ? subject : worst;
          }, null)
        }
      });
    });

    // Sort records (newest first)
    termRecords.sort((a, b) => {
      const sessionA = a.session || '';
      const sessionB = b.session || '';
      if (sessionA !== sessionB) return sessionB.localeCompare(sessionA);
      
      const termOrder = { 'First Term': 1, 'Second Term': 2, 'Third Term': 3 };
      return (termOrder[b.term] || 0) - (termOrder[a.term] || 0);
    });

    // Calculate cumulative statistics
    const cumulativeStats = calculateCumulativeStats(termRecords);

    console.log('\n✅ Transcript generated successfully:');
    console.log(`   Student: ${studentName}`);
    console.log(`   Terms: ${termRecords.length}`);
    console.log(`   Cumulative Average: ${cumulativeStats.cumulativeAverage}`);

    // Format response
    const transcript = {
      success: true,
      student: {
        name: studentName,
        studentId: student.studentId || student.username,
        currentClass: student.class?.name || 'Not assigned',
        level: student.class?.level || 'N/A',
        admissionDate: student.admissionDate,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender || 'Not specified',
        email: student.email
      },
      academicInfo: {
        academicYear: getCurrentAcademicYear(),
        schoolName: "School Management System",
        note: "Official Academic Transcript - CA1(20) + CA2(20) + Exam(60) = Total(100)",
        calculationMethod: "Continuous Assessment 1 (20 marks) + Continuous Assessment 2 (20 marks) + Examination (60 marks) = Total (100 marks)",
        promotionCriteria: "40% minimum average required for promotion"
      },
      records: termRecords,
      summary: cumulativeStats,
      generatedAt: new Date().toISOString(),
      generatedBy: user.name || user.username || user.email,
      isOfficial: true,
      status: "Official Transcript",
      dataSources: {
        testResults: testResults.length,
        totalRecords: termRecords.length
      },
      metadata: {
        scoreSystem: "CA1 (20 marks) + CA2 (20 marks) + Exam (60 marks) = Total (100 marks)",
        gradingScale: "A+ (90-100), A (80-89), B (70-79), C (60-69), D (50-59), E (40-49), F (0-39)"
      }
    };

    res.json(transcript);

  } catch (error) {
    console.error('❌ Error generating transcript:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error generating transcript.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get specific term transcript
router.get('/:studentId/:session/:term', auth, async (req, res) => {
  try {
    const { studentId, session, term } = req.params;
    const user = req.user;
    
    console.log(`📄 Single term transcript: ${studentId} - ${session} - ${term}`);

    // Authorization check
    if (user.role === 'student' && user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own transcript.'
      });
    }

    // Get student info
    const student = await User.findById(studentId)
      .populate('class', 'name level')
      .select('name surname studentId username class');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get results for specific term
    const testResults = await Result.find({
      userId: studentId,
      session: session,
      term: term,
      isActive: true
    })
    .populate('testId', 'title type subject class totalMarks')
    .populate('class', 'name level')
    .sort({ submittedAt: 1 })
    .lean();

    if (testResults.length === 0) {
      return res.json({
        success: true,
        student: {
          name: student.name && student.surname ? `${student.name} ${student.surname}` : student.name,
          studentId: student.studentId || student.username,
          class: student.class?.name
        },
        term: {
          session,
          term,
          message: 'No results found for this term'
        },
        source: 'none',
        generatedAt: new Date().toISOString()
      });
    }

    // Group results by subject
    const groupedSubjects = {};
    
    testResults.forEach(result => {
      const subject = result.subject;
      if (!subject) return;
      
      if (!groupedSubjects[subject]) {
        groupedSubjects[subject] = {
          ca1: null,
          ca2: null,
          exam: null,
          otherTests: []
        };
      }
      
      // Identify test type
      const testTitle = (result.testId?.title || '').toLowerCase();
      const testType = result.testId?.type?.toLowerCase() || '';
      const score = result.score || 0;
      
      if (testTitle.includes('ca1') || testType.includes('ca1') || 
          testTitle.includes('continuous assessment 1')) {
        groupedSubjects[subject].ca1 = Math.min(score, 20);
      } 
      else if (testTitle.includes('ca2') || testType.includes('ca2') || 
               testTitle.includes('continuous assessment 2')) {
        groupedSubjects[subject].ca2 = Math.min(score, 20);
      } 
      else if (testTitle.includes('exam') || testType.includes('exam') || 
               testTitle.includes('examination')) {
        groupedSubjects[subject].exam = Math.min(score, 60);
      } 
      else {
        groupedSubjects[subject].otherTests.push({
          title: testTitle,
          score: score,
          totalMarks: result.totalMarks || 100
        });
      }
    });

    // Calculate subject grades
    const subjectGrades = {};
    let totalScore = 0;
    let totalPossible = 0;
    
    Object.entries(groupedSubjects).forEach(([subject, scores]) => {
      const ca1 = scores.ca1 !== null ? scores.ca1 : 0;
      const ca2 = scores.ca2 !== null ? scores.ca2 : 0;
      const exam = scores.exam !== null ? scores.exam : 0;
      
      const subjectTotal = ca1 + ca2 + exam;
      const maxPossible = 100;
      
      // Handle other tests
      if (scores.otherTests.length > 0) {
        scores.otherTests.forEach(test => {
          const testPercentage = test.totalMarks > 0 ? (test.score / test.totalMarks) : 0;
          const adjustedScore = testPercentage * (maxPossible - subjectTotal);
          subjectTotal += adjustedScore;
        });
      }
      
      const finalTotal = Math.min(subjectTotal, maxPossible);
      const percentage = (finalTotal / maxPossible) * 100;
      
      // Calculate grade
      let grade, gradePoint;
      if (percentage >= 90) { grade = 'A+'; gradePoint = 5.0; }
      else if (percentage >= 80) { grade = 'A'; gradePoint = 4.0; }
      else if (percentage >= 70) { grade = 'B'; gradePoint = 3.5; }
      else if (percentage >= 65) { grade = 'B-'; gradePoint = 3.0; }
      else if (percentage >= 60) { grade = 'C+'; gradePoint = 2.5; }
      else if (percentage >= 55) { grade = 'C'; gradePoint = 2.0; }
      else if (percentage >= 50) { grade = 'C-'; gradePoint = 1.5; }
      else if (percentage >= 45) { grade = 'D+'; gradePoint = 1.0; }
      else if (percentage >= 40) { grade = 'D'; gradePoint = 0.5; }
      else { grade = 'F'; gradePoint = 0.0; }
      
      subjectGrades[subject] = {
        subject: subject,
        ca1: ca1.toFixed(1),
        ca2: ca2.toFixed(1),
        exam: exam.toFixed(1),
        total: finalTotal.toFixed(1),
        percentage: percentage.toFixed(1),
        grade: grade,
        gradePoint: gradePoint,
        credits: getSubjectCredits(subject),
        maxPossible: maxPossible,
        remark: getRemark(percentage)
      };
      
      totalScore += finalTotal;
      totalPossible += maxPossible;
    });

    // Calculate term average
    const termAverage = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
    
    // Calculate term GPA
    let totalGradePoints = 0;
    let totalCredits = 0;
    
    Object.values(subjectGrades).forEach(grade => {
      totalGradePoints += grade.gradePoint * grade.credits;
      totalCredits += grade.credits;
    });
    
    const termGPA = totalCredits > 0 ? (totalGradePoints / totalCredits) : 0;

    const termData = {
      session: session,
      term: term,
      class: testResults[0]?.class?.name || student.class?.name || 'Not assigned',
      level: testResults[0]?.class?.level || student.class?.level || 'N/A',
      grades: subjectGrades,
      totalScore: Math.round(totalScore),
      totalPossible: Math.round(totalPossible),
      average: termAverage.toFixed(1),
      gpa: termGPA.toFixed(2),
      promoted: termAverage >= 40,
      promotionEligibility: termAverage >= 40,
      subjectCount: Object.keys(subjectGrades).length,
      dataType: 'calculated'
    };

    res.json({
      success: true,
      student: {
        name: student.name && student.surname ? `${student.name} ${student.surname}` : student.name,
        studentId: student.studentId || student.username,
        class: student.class?.name
      },
      term: termData,
      source: 'test_results',
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching term transcript:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching term transcript' 
    });
  }
});

// Get student results summary
router.get('/:studentId/summary', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const user = req.user;
    
    // Authorization check
    if (user.role === 'student' && user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own summary.'
      });
    }

    // Get student info
    const student = await User.findById(studentId)
      .select('name surname studentId')
      .populate('class', 'name level')
      .lean();

    // Get all results
    const results = await Result.find({
      userId: studentId,
      isActive: true
    })
    .sort({ session: 1, term: 1 })
    .lean();

    const hasData = results.length > 0;

    if (!hasData) {
      return res.json({
        success: true,
        student: {
          name: student?.name && student?.surname ? 
            `${student.name} ${student.surname}` : 
            student?.name || 'Unknown',
          studentId: student?.studentId
        },
        summary: {
          message: 'No academic data found'
        }
      });
    }

    // Group by session and term
    const groupedResults = {};
    
    results.forEach(result => {
      const key = `${result.session}|${result.term}`;
      if (!groupedResults[key]) {
        groupedResults[key] = {
          session: result.session,
          term: result.term,
          totalScore: 0,
          totalPossible: 0,
          count: 0,
          subjects: new Set()
        };
      }
      
      groupedResults[key].totalScore += result.score || 0;
      groupedResults[key].totalPossible += result.totalMarks || 0;
      groupedResults[key].count++;
      if (result.subject) groupedResults[key].subjects.add(result.subject);
    });

    // Calculate summary statistics
    const allRecords = Object.values(groupedResults).map(sessionData => {
      const percentage = sessionData.totalPossible > 0 ? 
        (sessionData.totalScore / sessionData.totalPossible * 100) : 0;
      
      return {
        session: sessionData.session,
        term: sessionData.term,
        average: percentage.toFixed(1),
        subjectCount: sessionData.subjects.size,
        testCount: sessionData.count,
        promoted: percentage >= 40
      };
    });

    const totalTests = results.length;
    const totalSessions = new Set(allRecords.map(r => r.session)).size;
    const overallAverage = allRecords.length > 0 ? 
      allRecords.reduce((sum, r) => sum + parseFloat(r.average), 0) / allRecords.length : 0;
    
    const totalSubjects = new Set(
      results.map(r => r.subject).filter(Boolean)
    ).size;
    
    const promotionCount = allRecords.filter(r => r.promoted === true).length;

    res.json({
      success: true,
      student: {
        name: student?.name && student?.surname ? 
          `${student.name} ${student.surname}` : 
          student?.name || 'Unknown',
        studentId: student?.studentId,
        currentClass: student?.class?.name
      },
      summary: {
        totalTests,
        totalSessions,
        totalSubjects,
        overallAverage: `${overallAverage.toFixed(1)}%`,
        promotionCount,
        promotionRate: allRecords.length > 0 ? 
          ((promotionCount / allRecords.length) * 100).toFixed(0) + '%' : '0%',
        terms: allRecords
      }
    });

  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching summary' 
    });
  }
});

// Helper functions
function getSubjectCredits(subject) {
  if (!subject) return 2;
  
  const creditMap = {
    'mathematiics': 3, 'mathematics': 3, 'maths': 3, 'math': 3,
    'english': 3, 'english language': 3,
    'basic science': 3, 'science': 3,
    'social studies': 2, 'social': 2,
    'computer studies': 2, 'computer': 2, 'ict': 2,
    'french': 2,
    'creative arts': 2, 'arts': 2,
    'physical education': 1, 'p.e.': 1,
    'physics': 3,
    'chemistry': 3,
    'biology': 3,
    'economics': 2,
    'geography': 2,
    'history': 2,
    'civic education': 2, 'civics': 2
  };
  
  const lowerSubject = subject.toLowerCase().trim();
  return creditMap[lowerSubject] || 2;
}

function getSubjectCode(subject) {
  if (!subject) return 'N/A';
  
  const codes = {
    'mathematiics': 'MATH', 'mathematics': 'MATH', 'maths': 'MATH', 'math': 'MATH',
    'english': 'ENG', 'english language': 'ENG',
    'basic science': 'BSC', 'science': 'BSC',
    'social studies': 'SST', 'social': 'SST',
    'computer studies': 'COM', 'computer': 'COM', 'ict': 'ICT',
    'french': 'FRE',
    'creative arts': 'CRA', 'arts': 'CRA',
    'physical education': 'PE', 'p.e.': 'PE',
    'physics': 'PHY',
    'chemistry': 'CHEM',
    'biology': 'BIO',
    'economics': 'ECO',
    'geography': 'GEO',
    'history': 'HIS',
    'civic education': 'CIV', 'civics': 'CIV'
  };
  
  const lowerSubject = subject.toLowerCase().trim();
  return codes[lowerSubject] || subject.substring(0, 4).toUpperCase();
}

function getRemark(percentage) {
  if (percentage >= 90) return "Outstanding";
  if (percentage >= 80) return "Excellent";
  if (percentage >= 70) return "Very Good";
  if (percentage >= 60) return "Good";
  if (percentage >= 50) return "Satisfactory";
  if (percentage >= 40) return "Pass";
  return "Needs Improvement";
}

function calculateGradeFromScore(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  if (score >= 50) return 'C-';
  if (score >= 45) return 'D+';
  if (score >= 40) return 'D';
  return 'F';
}

function getConduct(average) {
  if (average >= 80) return 'excellent';
  if (average >= 70) return 'good';
  if (average >= 60) return 'satisfactory';
  if (average >= 40) return 'needs_improvement';
  return 'poor';
}

function calculateCumulativeStats(records) {
  if (!records || records.length === 0) {
    return {
      totalTerms: 0,
      cumulativeAverage: "0%",
      cumulativeGPA: "0.00",
      totalSubjects: 0,
      promotionRate: "0%",
      totalTests: 0,
      overallRemark: "No records available"
    };
  }

  // Calculate weighted averages
  let totalWeightedAverage = 0;
  let totalTests = 0;
  let promotionCount = 0;
  const allSubjects = new Set();
  
  records.forEach(record => {
    const avg = parseFloat(record.average) || 0;
    totalWeightedAverage += avg;
    
    if (record.grades) {
      Object.keys(record.grades).forEach(subject => {
        allSubjects.add(subject);
      });
    }
    
    totalTests += record.testCount || 0;
    if (record.promoted === true) {
      promotionCount++;
    }
  });

  const cumulativeAverage = (totalWeightedAverage / records.length).toFixed(1);
  const promotionRate = ((promotionCount / records.length) * 100).toFixed(0);
  const overallRemark = parseFloat(cumulativeAverage) >= 40 ? 
    "ELIGIBLE FOR PROMOTION" : "NEEDS IMPROVEMENT";

  return {
    totalTerms: records.length,
    cumulativeAverage: `${cumulativeAverage}%`,
    totalSubjects: allSubjects.size,
    promotionRate: `${promotionRate}%`,
    totalTests,
    overallRemark,
    promotionCriteria: "40% minimum average",
    bestTerm: records.reduce((best, current) => 
      parseFloat(current.average) > parseFloat(best?.average || 0) ? current : best, 
      records[0]
    ),
    worstTerm: records.reduce((worst, current) => 
      parseFloat(current.average) < parseFloat(worst?.average || 100) ? current : worst, 
      records[0]
    )
  };
}

function getCurrentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 8 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

module.exports = router;
// routes/analytics.js - COMPLETE WORKING VERSION
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Result = require('../models/Result');
const Test = require('../models/Test');
const User = require('../models/User');
const Class = require('../models/Class');
const { auth } = require('../middleware/auth');
const { teacherOnly } = require('../middleware/permissions');

// Helper function to get class name from ID or name
const getClassName = async (classValue) => {
  if (!classValue) return 'Unknown Class';
  
  try {
    if (mongoose.Types.ObjectId.isValid(classValue)) {
      const classDoc = await Class.findById(classValue).select('name shortName level').lean();
      if (classDoc) {
        return classDoc.name || classDoc.shortName || classDoc.level || 'Unknown Class';
      }
    } else if (typeof classValue === 'object' && classValue !== null) {
      // If classValue is a populated object
      return classValue.name || classValue.shortName || classValue.level || 'Unknown Class';
    }
    return String(classValue);
  } catch (error) {
    console.error('Error getting class name:', error);
    return String(classValue);
  }
};

// Helper to get teacher's assigned subjects and classes (from your tests.js)
const getTeacherAssignments = async (teacherId) => {
  try {
    const teacher = await User.findById(teacherId).select('subjects teacherAssignments').lean();
    
    if (!teacher) return [];
    
    const assignments = [];
    
    // Old format: subjects array (from your tests.js)
    if (teacher.subjects && Array.isArray(teacher.subjects)) {
      teacher.subjects.forEach(sub => {
        if (sub.subject) {
          assignments.push({
            subject: sub.subject,
            class: sub.class || sub.className || sub.classId
          });
        }
      });
    }
    
    // New format: teacherAssignments
    if (teacher.teacherAssignments && Array.isArray(teacher.teacherAssignments)) {
      teacher.teacherAssignments.forEach(assignment => {
        if (assignment.class && assignment.subjects && Array.isArray(assignment.subjects)) {
          assignment.subjects.forEach(sub => {
            if (sub.subject) {
              assignments.push({
                subject: sub.subject,
                class: assignment.class
              });
            }
          });
        }
      });
    }
    
    return assignments;
  } catch (error) {
    console.error('Error getting teacher assignments:', error);
    return [];
  }
};

// ==================== MAIN ANALYTICS ENDPOINT ====================

// Get teacher analytics - MAIN ENDPOINT
router.get('/teacher', auth, async (req, res) => {
  try {
    console.log('📊 TEACHER ANALYTICS REQUEST:', {
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role
    });

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Only teachers can access teacher analytics'
      });
    }

    // Get teacher's assignments
    const teacherAssignments = await getTeacherAssignments(req.user.id);
    
    if (teacherAssignments.length === 0) {
      return res.json({
        success: true,
        analytics: [],
        summary: {
          totalTests: 0,
          totalResults: 0,
          averageScore: 0,
          totalStudents: 0,
          passRate: 0,
          avgTimeSpent: 0,
          improvement: 0
        },
        message: 'No subjects/classes assigned to teacher'
      });
    }

    // Extract unique classes and subjects
    const assignedClasses = [...new Set(teacherAssignments.map(a => a.class).filter(Boolean))];
    const assignedSubjects = [...new Set(teacherAssignments.map(a => a.subject).filter(Boolean))];

    console.log('📊 Teacher assignments:', {
      classes: assignedClasses,
      subjects: assignedSubjects,
      totalAssignments: teacherAssignments.length
    });

    // Build query for tests
    const testsQuery = {
      $or: teacherAssignments.map(assignment => ({
        subject: assignment.subject,
        class: assignment.class
      })),
      isActive: true
    };

    // Build query for results
    const resultsQuery = {
      $or: teacherAssignments.map(assignment => ({
        subject: assignment.subject,
        class: assignment.class
      })),
      isActive: true
    };

    console.log('🔍 Query for tests:', JSON.stringify(testsQuery, null, 2));
    console.log('🔍 Query for results:', JSON.stringify(resultsQuery, null, 2));

    // Fetch tests and results
    const [tests, results] = await Promise.all([
      Test.find(testsQuery)
        .populate('createdBy', 'username name')
        .populate('class', 'name shortName')
        .sort({ createdAt: -1 })
        .lean(),
      Result.find(resultsQuery)
        .populate('userId', 'name surname studentId')
        .populate('testId', 'title subject class totalMarks passingMarks')
        .populate('class', 'name shortName')
        .lean()
    ]);

    console.log('📊 Data fetched:', {
      testsCount: tests.length,
      resultsCount: results.length
    });

    if (tests.length === 0 && results.length === 0) {
      return res.json({
        success: true,
        analytics: [],
        summary: {
          totalTests: 0,
          totalResults: 0,
          averageScore: 0,
          totalStudents: 0,
          passRate: 0,
          avgTimeSpent: 0,
          improvement: 0
        },
        message: 'No data found for your assignments'
      });
    }

    // Process analytics data
    const testAnalytics = [];
    const classMap = {};

    // First, fetch class names for all unique classes
    const uniqueClasses = [...new Set([
      ...tests.map(t => t.class),
      ...results.map(r => r.class)
    ].filter(Boolean))];

    for (const classValue of uniqueClasses) {
      const className = await getClassName(classValue);
      const classId = typeof classValue === 'object' ? classValue._id?.toString() : classValue.toString();
      classMap[classId] = className;
    }

    // Process each test
    for (const test of tests) {
      const testId = test._id.toString();
      
      // Get class name
      let className = 'Unknown Class';
      if (test.class) {
        const classId = typeof test.class === 'object' ? test.class._id?.toString() : test.class.toString();
        className = classMap[classId] || await getClassName(test.class);
      }

      // Get results for this test
      const testResults = results.filter(r => {
        if (!r.testId) return false;
        const resultTestId = r.testId._id ? r.testId._id.toString() : r.testId.toString();
        return resultTestId === testId;
      });

      // Calculate metrics
      const scores = testResults.map(r => r.score || 0).filter(score => !isNaN(score));
      const averageScore = scores.length > 0 ? 
        scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

      // Calculate completion rate
      const totalStudentsForTest = testResults.length;
      const completedStudents = testResults.filter(r => r.submittedAt).length;
      const completionRate = totalStudentsForTest > 0 ? 
        (completedStudents / totalStudentsForTest) * 100 : 0;

      // Find top performer
      let topStudent = 'N/A';
      let topScore = 0;
      if (testResults.length > 0) {
        testResults.forEach(result => {
          const score = result.score || 0;
          if (score > topScore) {
            topScore = score;
            if (result.userId) {
              topStudent = `${result.userId.name || ''} ${result.userId.surname || ''}`.trim() || 
                          result.userId.studentId || 'Unknown Student';
            }
          }
        });
      }

      // Get test status
      const now = new Date();
      const startDate = test.startDate ? new Date(test.startDate) : null;
      const endDate = test.endDate ? new Date(test.endDate) : null;
      
      let status = test.status || 'unknown';
      if (!test.status && startDate && endDate) {
        if (now < startDate) status = 'scheduled';
        else if (now >= startDate && now <= endDate) status = 'active';
        else if (now > endDate) status = 'completed';
      }

      testAnalytics.push({
        testId: testId,
        testTitle: test.title || 'Untitled Test',
        subject: test.subject || 'Unknown Subject',
        class: className, // This will show "JSS 1", not ObjectId
        className: className,
        averageScore: parseFloat(averageScore.toFixed(2)),
        completionRate: parseFloat(completionRate.toFixed(2)),
        totalStudents: totalStudentsForTest,
        completedStudents: completedStudents,
        topStudent: topStudent,
        createdAt: test.createdAt,
        updatedAt: test.updatedAt || test.createdAt,
        session: test.session || 'Unknown',
        term: test.term || 'Unknown',
        status: status,
        totalMarks: test.totalMarks || 100,
        passingMarks: test.passingMarks || 50,
        type: test.type || 'test',
        hasResults: testResults.length > 0
      });
    }

    console.log('📊 Processed analytics:', testAnalytics.length, 'tests');

    // Calculate overall statistics
    const allScores = results.map(r => r.score || 0).filter(score => !isNaN(score) && score > 0);
    const overallAverageScore = allScores.length > 0 ? 
      allScores.reduce((sum, score) => sum + score, 0) / allScores.length : 0;

    // Calculate pass rate
    const passingResults = results.filter(result => {
      const score = result.score || 0;
      const test = tests.find(t => t._id.toString() === result.testId?._id?.toString());
      if (!test) return false;
      const totalMarks = test.totalMarks || 100;
      const passingMarks = test.passingMarks || totalMarks * 0.5;
      return score >= passingMarks;
    });

    const passRate = results.length > 0 ? 
      (passingResults.length / results.length) * 100 : 0;

    // Calculate average time spent
    const validTimeResults = results.filter(r => r.timeSpent && r.timeSpent > 0);
    const avgTimeSpent = validTimeResults.length > 0 ? 
      validTimeResults.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / validTimeResults.length : 0;

    // Get unique students
    const uniqueStudentIds = [...new Set(
      results.map(r => r.userId?._id?.toString()).filter(id => id)
    )];

    // Subject performance analysis
    const subjectPerformance = {};
    results.forEach(result => {
      const subject = result.testId?.subject || result.subject || 'Unknown';
      const score = result.score || 0;
      
      if (!subjectPerformance[subject]) {
        subjectPerformance[subject] = {
          totalScore: 0, 
          count: 0,
          students: new Set()
        };
      }
      subjectPerformance[subject].totalScore += score;
      subjectPerformance[subject].count += 1;
      if (result.userId?._id) {
        subjectPerformance[subject].students.add(result.userId._id.toString());
      }
    });

    const subjectRanking = Object.entries(subjectPerformance)
      .map(([subject, data]) => ({
        subject,
        averageScore: parseFloat((data.totalScore / data.count).toFixed(2)),
        totalTests: data.count,
        totalStudents: data.students.size
      }))
      .sort((a, b) => b.averageScore - a.averageScore);

    // Student performance distribution
    const studentDistribution = {
      excellent: results.filter(r => {
        const score = r.score || 0;
        const test = tests.find(t => t._id.toString() === r.testId?._id?.toString());
        const totalMarks = test?.totalMarks || 100;
        return (score / totalMarks) * 100 >= 90;
      }).length,
      good: results.filter(r => {
        const score = r.score || 0;
        const test = tests.find(t => t._id.toString() === r.testId?._id?.toString());
        const totalMarks = test?.totalMarks || 100;
        const percentage = (score / totalMarks) * 100;
        return percentage >= 75 && percentage < 90;
      }).length,
      average: results.filter(r => {
        const score = r.score || 0;
        const test = tests.find(t => t._id.toString() === r.testId?._id?.toString());
        const totalMarks = test?.totalMarks || 100;
        const percentage = (score / totalMarks) * 100;
        return percentage >= 50 && percentage < 75;
      }).length,
      poor: results.filter(r => {
        const score = r.score || 0;
        const test = tests.find(t => t._id.toString() === r.testId?._id?.toString());
        const totalMarks = test?.totalMarks || 100;
        return (score / totalMarks) * 100 < 50;
      }).length
    };

    // Calculate improvement trend
    let improvement = 0;
    const testsWithResults = testAnalytics.filter(a => a.hasResults && a.averageScore > 0);
    if (testsWithResults.length >= 6) {
      const sortedByDate = [...testsWithResults].sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );
      
      const firstThree = sortedByDate.slice(0, 3);
      const lastThree = sortedByDate.slice(-3);
      
      if (firstThree.length > 0 && lastThree.length > 0) {
        const firstAvg = firstThree.reduce((sum, t) => sum + (t.averageScore || 0), 0) / firstThree.length;
        const lastAvg = lastThree.reduce((sum, t) => sum + (t.averageScore || 0), 0) / lastThree.length;
        
        if (firstAvg > 0) {
          improvement = parseFloat(((lastAvg - firstAvg) / firstAvg * 100).toFixed(2));
        }
      }
    }

    // Prepare response in the format your frontend expects
    const response = {
      success: true,
      analytics: testAnalytics,
      summary: {
        totalTests: tests.length,
        totalResults: results.length,
        totalStudents: uniqueStudentIds.length,
        overallAverageScore: parseFloat(overallAverageScore.toFixed(2)),
        passRate: parseFloat(passRate.toFixed(2)),
        avgTimeSpent: parseFloat(avgTimeSpent.toFixed(0)),
        improvement: improvement
      },
      rankings: {
        bySubject: subjectRanking,
        topPerformers: testAnalytics
          .filter(a => a.averageScore > 0)
          .sort((a, b) => b.averageScore - a.averageScore)
          .slice(0, 5)
          .map(test => ({
            testId: test.testId,
            testTitle: test.testTitle,
            subject: test.subject,
            class: test.class,
            averageScore: test.averageScore,
            topStudent: test.topStudent
          }))
      },
      distribution: studentDistribution,
      generatedAt: new Date().toISOString(),
      teacherInfo: {
        name: req.user.name || req.user.username,
        assignedSubjects: assignedSubjects,
        assignedClasses: assignedClasses.map(id => classMap[id] || id)
      }
    };

    console.log('✅ Analytics response prepared:', {
      analyticsCount: testAnalytics.length,
      summary: response.summary
    });

    res.json(response);

  } catch (error) {
    console.error('❌ ANALYTICS ERROR:', {
      message: error.message,
      stack: error.stack,
      teacherId: req.user?.id,
      username: req.user?.username
    });
    
    res.status(500).json({
      success: false,
      error: 'Server error generating analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================== ADDITIONAL ANALYTICS ENDPOINTS ====================

// Get test analytics by subject
router.get('/subject/:subject', auth, async (req, res) => {
  try {
    const { subject } = req.params;
    const { class: className, startDate, endDate } = req.query;
    
    console.log('📊 Subject analytics for:', { subject, className });

    // For teachers, verify they have access to this subject
    if (req.user.role === 'teacher') {
      const teacherAssignments = await getTeacherAssignments(req.user.id);
      const hasAccess = teacherAssignments.some(a => 
        a.subject === subject && (!className || a.class === className)
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view analytics for this subject'
        });
      }
    }

    // Build query
    const query = { subject, isActive: true };
    if (className && className !== 'all') {
      query.class = className;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Get tests and results
    const [tests, results] = await Promise.all([
      Test.find(query)
        .populate('class', 'name shortName')
        .sort({ createdAt: -1 })
        .lean(),
      Result.find(query)
        .populate('userId', 'name surname studentId')
        .populate('testId', 'title subject')
        .lean()
    ]);

    // Group results by test
    const testPerformance = {};
    results.forEach(result => {
      if (result.testId) {
        const testId = result.testId._id.toString();
        if (!testPerformance[testId]) {
          testPerformance[testId] = {
            testTitle: result.testId.title,
            scores: [],
            students: new Set()
          };
        }
        testPerformance[testId].scores.push(result.score || 0);
        if (result.userId) {
          testPerformance[testId].students.add(result.userId._id.toString());
        }
      }
    });

    // Format analytics
    const analytics = Object.entries(testPerformance).map(([testId, data]) => ({
      testId,
      testTitle: data.testTitle,
      averageScore: parseFloat((data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(2)),
      totalStudents: data.students.size,
      highestScore: Math.max(...data.scores),
      lowestScore: Math.min(...data.scores)
    }));

    // Calculate subject statistics
    const allScores = results.map(r => r.score || 0).filter(score => !isNaN(score));
    const subjectStats = {
      totalTests: tests.length,
      totalResults: results.length,
      uniqueStudents: new Set(results.map(r => r.userId?._id?.toString()).filter(id => id)).size,
      averageScore: allScores.length > 0 ? 
        parseFloat((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)) : 0,
      scoreRange: allScores.length > 0 ? {
        min: Math.min(...allScores),
        max: Math.max(...allScores)
      } : { min: 0, max: 0 }
    };

    res.json({
      success: true,
      subject,
      className: className || 'All Classes',
      analytics,
      statistics: subjectStats,
      tests: tests.slice(0, 10).map(test => ({
        id: test._id,
        title: test.title,
        class: test.class?.name || test.class,
        status: test.status,
        createdAt: test.createdAt
      }))
    });

  } catch (error) {
    console.error('Subject analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error generating subject analytics'
    });
  }
});

// Get class performance analytics
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const { subject, startDate, endDate } = req.query;
    
    console.log('📊 Class analytics for:', { classId, subject });

    // Get class info
    const classDoc = await Class.findById(classId).select('name shortName level').lean();
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }

    // Build query
    const query = { class: classId, isActive: true };
    if (subject && subject !== 'all') query.subject = subject;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Get data
    const [tests, results, students] = await Promise.all([
      Test.find(query).lean(),
      Result.find(query)
        .populate('userId', 'name surname studentId')
        .populate('testId', 'title subject')
        .lean(),
      User.find({ class: classId, role: 'student', isActive: true })
        .select('name surname studentId')
        .lean()
    ]);

    // Calculate class performance by subject
    const subjectPerformance = {};
    results.forEach(result => {
      const subjectName = result.testId?.subject || result.subject || 'Unknown';
      const score = result.score || 0;
      
      if (!subjectPerformance[subjectName]) {
        subjectPerformance[subjectName] = {
          totalScore: 0,
          count: 0,
          students: new Set()
        };
      }
      subjectPerformance[subjectName].totalScore += score;
      subjectPerformance[subjectName].count += 1;
      if (result.userId) {
        subjectPerformance[subjectName].students.add(result.userId._id.toString());
      }
    });

    const subjectAnalytics = Object.entries(subjectPerformance).map(([subject, data]) => ({
      subject,
      averageScore: parseFloat((data.totalScore / data.count).toFixed(2)),
      totalTests: data.count,
      totalStudents: data.students.size,
      studentParticipation: students.length > 0 ? 
        parseFloat((data.students.size / students.length * 100).toFixed(2)) : 0
    }));

    // Student ranking
    const studentScores = {};
    results.forEach(result => {
      if (result.userId) {
        const studentId = result.userId._id.toString();
        if (!studentScores[studentId]) {
          studentScores[studentId] = {
            name: `${result.userId.name || ''} ${result.userId.surname || ''}`.trim(),
            studentId: result.userId.studentId,
            totalScore: 0,
            count: 0
          };
        }
        studentScores[studentId].totalScore += result.score || 0;
        studentScores[studentId].count += 1;
      }
    });

    const studentRanking = Object.values(studentScores)
      .map(student => ({
        ...student,
        averageScore: student.count > 0 ? 
          parseFloat((student.totalScore / student.count).toFixed(2)) : 0
      }))
      .sort((a, b) => b.averageScore - a.averageScore);

    res.json({
      success: true,
      class: {
        id: classId,
        name: classDoc.name,
        shortName: classDoc.shortName,
        level: classDoc.level
      },
      statistics: {
        totalStudents: students.length,
        totalTests: tests.length,
        totalResults: results.length,
        subjectCount: Object.keys(subjectPerformance).length,
        participationRate: students.length > 0 ? 
          parseFloat((Object.keys(studentScores).length / students.length * 100).toFixed(2)) : 0
      },
      subjectPerformance: subjectAnalytics,
      topStudents: studentRanking.slice(0, 10),
      recentTests: tests
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(test => ({
          id: test._id,
          title: test.title,
          subject: test.subject,
          status: test.status,
          date: test.createdAt
        }))
    });

  } catch (error) {
    console.error('Class analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error generating class analytics'
    });
  }
});

// Get student performance analytics
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { subject, startDate, endDate } = req.query;
    
    console.log('📊 Student analytics for:', studentId);

    // Get student info
    const student = await User.findById(studentId)
      .select('name surname studentId class')
      .populate('class', 'name shortName')
      .lean();
    
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Build query
    const query = { userId: studentId, isActive: true };
    if (subject && subject !== 'all') query.subject = subject;
    
    if (startDate || endDate) {
      query.submittedAt = {};
      if (startDate) query.submittedAt.$gte = new Date(startDate);
      if (endDate) query.submittedAt.$lte = new Date(endDate);
    }

    // Get student results
    const results = await Result.find(query)
      .populate('testId', 'title subject totalMarks passingMarks')
      .populate('class', 'name shortName')
      .sort({ submittedAt: -1 })
      .lean();

    if (results.length === 0) {
      return res.json({
        success: true,
        student,
        analytics: [],
        statistics: {
          totalTests: 0,
          averageScore: 0,
          passRate: 0
        },
        message: 'No test results found for this student'
      });
    }

    // Calculate performance by subject
    const subjectPerformance = {};
    results.forEach(result => {
      const subjectName = result.testId?.subject || result.subject || 'Unknown';
      const score = result.score || 0;
      const totalMarks = result.testId?.totalMarks || 100;
      const passingMarks = result.testId?.passingMarks || totalMarks * 0.5;
      
      if (!subjectPerformance[subjectName]) {
        subjectPerformance[subjectName] = {
          totalScore: 0,
          count: 0,
          passed: 0
        };
      }
      subjectPerformance[subjectName].totalScore += score;
      subjectPerformance[subjectName].count += 1;
      
      if (score >= passingMarks) {
        subjectPerformance[subjectName].passed += 1;
      }
    });

    const subjectAnalytics = Object.entries(subjectPerformance).map(([subject, data]) => ({
      subject,
      averageScore: parseFloat((data.totalScore / data.count).toFixed(2)),
      totalTests: data.count,
      passRate: data.count > 0 ? 
        parseFloat((data.passed / data.count * 100).toFixed(2)) : 0
    }));

    // Overall statistics
    const allScores = results.map(r => r.score || 0).filter(score => !isNaN(score));
    const averageScore = allScores.length > 0 ? 
      allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;

    const passedResults = results.filter(result => {
      const score = result.score || 0;
      const totalMarks = result.testId?.totalMarks || 100;
      const passingMarks = result.testId?.passingMarks || totalMarks * 0.5;
      return score >= passingMarks;
    });

    const passRate = results.length > 0 ? 
      (passedResults.length / results.length) * 100 : 0;

    // Performance over time
    const performanceOverTime = results
      .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
      .map((result, index) => ({
        testNumber: index + 1,
        testTitle: result.testId?.title || 'Unknown Test',
        score: result.score || 0,
        percentage: result.percentage || 0,
        date: result.submittedAt,
        passed: (result.score || 0) >= (result.testId?.passingMarks || (result.testId?.totalMarks || 100) * 0.5)
      }));

    res.json({
      success: true,
      student,
      statistics: {
        totalTests: results.length,
        averageScore: parseFloat(averageScore.toFixed(2)),
        passRate: parseFloat(passRate.toFixed(2)),
        bestScore: allScores.length > 0 ? Math.max(...allScores) : 0,
        worstScore: allScores.length > 0 ? Math.min(...allScores) : 0,
        totalTimeSpent: results.reduce((sum, r) => sum + (r.timeSpent || 0), 0)
      },
      subjectPerformance: subjectAnalytics,
      performanceOverTime: performanceOverTime,
      recentResults: results.slice(0, 10).map(result => ({
        testTitle: result.testId?.title || 'Unknown Test',
        subject: result.testId?.subject || result.subject,
        score: result.score || 0,
        totalMarks: result.testId?.totalMarks || result.totalMarks || 100,
        percentage: result.percentage || 0,
        passed: (result.score || 0) >= (result.testId?.passingMarks || (result.testId?.totalMarks || 100) * 0.5),
        date: result.submittedAt
      }))
    });

  } catch (error) {
    console.error('Student analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error generating student analytics'
    });
  }
});

// Get dashboard overview (quick stats)
router.get('/overview', auth, async (req, res) => {
  try {
    console.log('📊 Dashboard overview for:', req.user.username, 'Role:', req.user.role);
    
    let query = { isActive: true };
    
    // For teachers, filter by their assignments
    if (req.user.role === 'teacher') {
      const teacherAssignments = await getTeacherAssignments(req.user.id);
      if (teacherAssignments.length > 0) {
        const conditions = teacherAssignments.map(a => ({
          subject: a.subject,
          class: a.class
        }));
        query.$or = conditions;
      }
    }

    // Get counts
    const [totalTests, totalResults, activeTests, recentTests] = await Promise.all([
      Test.countDocuments(query),
      Result.countDocuments(query),
      Test.countDocuments({ ...query, status: 'active' }),
      Test.find(query)
        .populate('class', 'name shortName')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title subject class status createdAt')
        .lean()
    ]);

    // Get average score
    const results = await Result.find(query).select('score').lean();
    const scores = results.map(r => r.score || 0).filter(s => !isNaN(s) && s > 0);
    const averageScore = scores.length > 0 ? 
      scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    res.json({
      success: true,
      overview: {
        totalTests,
        totalResults,
        activeTests,
        averageScore: parseFloat(averageScore.toFixed(2)),
        completionRate: totalTests > 0 ? 
          parseFloat((totalResults / (totalTests * 10) * 100).toFixed(2)) : 0
      },
      recentTests: recentTests.map(test => ({
        id: test._id,
        title: test.title,
        subject: test.subject,
        class: test.class?.name || test.class,
        status: test.status,
        date: test.createdAt
      }))
    });

  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error generating dashboard overview'
    });
  }
});

// Test endpoint for development (mock data)
router.get('/test', auth, (req, res) => {
  console.log('📊 Test analytics endpoint hit by:', req.user.username);
  
  // Return mock data for testing
  const mockData = {
    success: true,
    analytics: [
      {
        testId: 'mock-1',
        testTitle: 'Mathematics Midterm Test',
        subject: 'Mathematics',
        class: 'JSS 1',
        className: 'JSS 1',
        averageScore: 78.5,
        completionRate: 95.2,
        totalStudents: 42,
        completedStudents: 40,
        topStudent: 'John Doe',
        createdAt: new Date('2024-01-15'),
        session: '2023/2024',
        term: 'First Term',
        status: 'completed',
        totalMarks: 100,
        passingMarks: 50
      },
      {
        testId: 'mock-2',
        testTitle: 'English Language Quiz',
        subject: 'English',
        class: 'JSS 2',
        className: 'JSS 2',
        averageScore: 82.3,
        completionRate: 88.7,
        totalStudents: 38,
        completedStudents: 34,
        topStudent: 'Jane Smith',
        createdAt: new Date('2024-01-20'),
        session: '2023/2024',
        term: 'First Term',
        status: 'completed',
        totalMarks: 50,
        passingMarks: 25
      }
    ],
    summary: {
      totalTests: 2,
      totalResults: 76,
      totalStudents: 45,
      overallAverageScore: 80.4,
      passRate: 92.1,
      avgTimeSpent: 45,
      improvement: 5.2
    }
  };
  
  res.json(mockData);
});

module.exports = router;
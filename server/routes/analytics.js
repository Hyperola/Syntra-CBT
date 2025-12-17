const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Result = require('../models/Result');
const Test = require('../models/Test');
const User = require('../models/User');
const Class = require('../models/Class');
const { auth } = require('../middleware/auth');
const { teacherOnly } = require('../middleware/permissions');

// ==================== TEACHER-SPECIFIC ANALYTICS ====================

// GET teacher analytics
router.get('/teacher', auth, teacherOnly, async (req, res) => {
  try {
    console.log('📊 Teacher analytics request:', {
      teacherId: req.user.id,
      username: req.user.username,
      subjects: req.user.subjects
    });

    // Get teacher's assigned subjects
    const teacherSubjects = req.user.subjects || [];
    if (teacherSubjects.length === 0) {
      return res.json({
        success: true,
        analytics: [],
        summary: {
          totalStudents: 0,
          totalTests: 0,
          averageScore: 0
        }
      });
    }

    // Build query for teacher's subjects
    const subjectConditions = teacherSubjects.map(sub => ({
      subject: sub.subject,
      class: sub.class
    }));

    // Fetch data in parallel
    const [tests, results] = await Promise.all([
      Test.find({ $or: subjectConditions })
        .sort({ createdAt: -1 })
        .lean(),
      Result.find({ $or: subjectConditions })
        .populate('userId', 'name surname')
        .populate('testId', 'title subject class')
        .lean()
    ]);

    // If no data found
    if (tests.length === 0 && results.length === 0) {
      return res.json({
        success: true,
        analytics: [],
        summary: {
          totalTests: 0,
          totalResults: 0,
          averageScore: 0
        }
      });
    }

    // Calculate test analytics for teacher
    const testAnalytics = tests.map(test => {
      const testResults = results.filter(r => 
        r.testId && r.testId._id.toString() === test._id.toString()
      );
      
      const totalStudentsInTest = testResults.length;
      const scores = testResults.map(r => r.score || 0);
      const averageScore = scores.length > 0 ? 
        (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0;
      
      return {
        testId: test._id,
        testTitle: test.title || 'Untitled Test',
        subject: test.subject || 'Unknown Subject',
        class: test.class || 'Unknown Class',
        averageScore: parseFloat(averageScore),
        totalStudents: totalStudentsInTest,
        createdAt: test.createdAt
      };
    });

    // Calculate overall metrics
    const allScores = results.map(r => r.score || 0).filter(score => score > 0);
    const overallAverageScore = allScores.length > 0 ? 
      (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2) : 0;

    // Subject performance
    const subjectPerformance = {};
    results.forEach(result => {
      const subject = result.testId?.subject || 'Unknown';
      if (!subjectPerformance[subject]) {
        subjectPerformance[subject] = { total: 0, count: 0 };
      }
      subjectPerformance[subject].total += result.score || 0;
      subjectPerformance[subject].count += 1;
    });

    const subjectRanking = Object.entries(subjectPerformance)
      .map(([subject, data]) => ({
        subject,
        averageScore: (data.total / data.count).toFixed(2),
        totalTests: data.count
      }))
      .sort((a, b) => parseFloat(b.averageScore) - parseFloat(a.averageScore));

    // Class performance
    const classPerformance = {};
    results.forEach(result => {
      const className = result.testId?.class || 'Unknown';
      if (!classPerformance[className]) {
        classPerformance[className] = { total: 0, count: 0 };
      }
      classPerformance[className].total += result.score || 0;
      classPerformance[className].count += 1;
    });

    const classRanking = Object.entries(classPerformance)
      .map(([className, data]) => ({
        className,
        averageScore: (data.total / data.count).toFixed(2),
        totalTests: data.count
      }))
      .sort((a, b) => parseFloat(b.averageScore) - parseFloat(a.averageScore));

    const response = {
      success: true,
      analytics: testAnalytics,
      summary: {
        totalTests: tests.length,
        totalResults: results.length,
        overallAverageScore: parseFloat(overallAverageScore)
      },
      rankings: {
        bySubject: subjectRanking,
        byClass: classRanking
      },
      generatedAt: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Teacher analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error generating teacher analytics'
    });
  }
});

// GET comprehensive analytics dashboard for teachers AND admins
router.get('/dashboard', auth, async (req, res) => {
  try {
    console.log('📊 Analytics Dashboard Request for:', req.user.username);
    
    // Only teachers and admins can access analytics
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only teachers and admins can view analytics.'
      });
    }

    // Build base query for teacher's subjects and classes
    const teacherQuery = {};
    
    // If user is a teacher, filter by their assigned subjects
    if (req.user.role === 'teacher' && req.user.subjects && req.user.subjects.length > 0) {
      const subjectConditions = req.user.subjects.map(sub => ({
        subject: sub.subject,
        class: sub.class
      }));
      
      if (subjectConditions.length > 0) {
        teacherQuery.$or = subjectConditions;
      }
    }

    // Fetch data in parallel
    const [tests, results, questions, totalStudents] = await Promise.all([
      Test.find(teacherQuery)
        .sort({ createdAt: -1 })
        .lean(),
      Result.find(teacherQuery)
        .populate('userId', 'name surname')
        .populate('testId', 'title subject class')
        .lean(),
      // Assuming you have a Question model
      // Question.countDocuments(teacherQuery).catch(() => 0),
      Promise.resolve(0), // Placeholder if you don't have questions
      User.countDocuments({ role: 'student' }).catch(() => 0)
    ]);

    console.log('📊 Analytics Data:', {
      testsCount: tests.length,
      resultsCount: results.length,
      questionsCount: questions,
      totalStudents
    });

    // If no data found
    if (tests.length === 0 && results.length === 0) {
      return res.json({
        success: true,
        analytics: [],
        summary: {
          totalStudents: 0,
          totalTests: 0,
          totalQuestions: questions,
          overallAverageScore: 0
        }
      });
    }

    // Calculate test analytics
    const testAnalytics = tests.map(test => {
      const testResults = results.filter(r => 
        r.testId && r.testId._id.toString() === test._id.toString()
      );
      
      const totalStudentsInTest = testResults.length;
      const completed = testResults.filter(r => r.submittedAt).length;
      const completionRate = totalStudentsInTest > 0 ? 
        ((completed / totalStudentsInTest) * 100).toFixed(2) : 0;
      
      const scores = testResults.map(r => r.score || 0);
      const averageScore = scores.length > 0 ? 
        (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0;
      
      // Find top performer
      let topStudent = 'N/A';
      let topScore = 0;
      if (testResults.length > 0) {
        const sortedResults = [...testResults].sort((a, b) => (b.score || 0) - (a.score || 0));
        topStudent = `${sortedResults[0].userId?.name || 'N/A'} ${sortedResults[0].userId?.surname || ''}`.trim();
        topScore = sortedResults[0].score || 0;
      }

      return {
        testId: test._id,
        testTitle: test.title || 'Untitled Test',
        subject: test.subject || 'Unknown Subject',
        class: test.class || 'Unknown Class',
        averageScore: parseFloat(averageScore),
        completionRate: parseFloat(completionRate),
        totalStudents: totalStudentsInTest,
        completedStudents: completed,
        topStudent,
        topScore,
        createdAt: test.createdAt
      };
    });

    // Calculate overall metrics
    const allScores = results.map(r => r.score || 0).filter(score => score > 0);
    const overallAverageScore = allScores.length > 0 ? 
      (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2) : 0;

    // Subject performance
    const subjectPerformance = {};
    results.forEach(result => {
      const subject = result.testId?.subject || 'Unknown';
      if (!subjectPerformance[subject]) {
        subjectPerformance[subject] = { total: 0, count: 0, totalStudents: new Set() };
      }
      subjectPerformance[subject].total += result.score || 0;
      subjectPerformance[subject].count += 1;
      if (result.userId) {
        subjectPerformance[subject].totalStudents.add(result.userId._id.toString());
      }
    });

    const subjectRanking = Object.entries(subjectPerformance)
      .map(([subject, data]) => ({
        subject,
        averageScore: (data.total / data.count).toFixed(2),
        totalTests: data.count,
        totalStudents: data.totalStudents.size
      }))
      .sort((a, b) => parseFloat(b.averageScore) - parseFloat(a.averageScore));

    // Class performance
    const classPerformance = {};
    results.forEach(result => {
      const className = result.testId?.class || 'Unknown';
      if (!classPerformance[className]) {
        classPerformance[className] = { total: 0, count: 0 };
      }
      classPerformance[className].total += result.score || 0;
      classPerformance[className].count += 1;
    });

    const classRanking = Object.entries(classPerformance)
      .map(([className, data]) => ({
        className,
        averageScore: (data.total / data.count).toFixed(2),
        totalTests: data.count
      }))
      .sort((a, b) => parseFloat(b.averageScore) - parseFloat(a.averageScore));

    // Student performance distribution
    const studentPerformance = {
      excellent: results.filter(r => (r.score || 0) >= 90).length,
      good: results.filter(r => (r.score || 0) >= 75 && (r.score || 0) < 90).length,
      average: results.filter(r => (r.score || 0) >= 50 && (r.score || 0) < 75).length,
      poor: results.filter(r => (r.score || 0) < 50).length
    };

    // Recent tests (last 10)
    const recentTests = tests
      .slice(0, 10)
      .map(test => {
        const testResults = results.filter(r => 
          r.testId && r.testId._id.toString() === test._id.toString()
        );
        const avgScore = testResults.length > 0 ? 
          (testResults.reduce((sum, r) => sum + (r.score || 0), 0) / testResults.length).toFixed(2) : 0;
        
        return {
          testId: test._id,
          title: test.title || 'Untitled Test',
          subject: test.subject,
          class: test.class,
          averageScore: parseFloat(avgScore),
          studentCount: testResults.length,
          date: test.createdAt
        };
      });

    const response = {
      success: true,
      analytics: testAnalytics,
      summary: {
        totalStudents,
        totalTests: tests.length,
        totalQuestions: questions,
        overallAverageScore: parseFloat(overallAverageScore),
        totalResults: results.length
      },
      rankings: {
        bySubject: subjectRanking,
        byClass: classRanking
      },
      distribution: studentPerformance,
      recentTests,
      generatedAt: new Date().toISOString()
    };

    console.log('📊 Analytics Response:', {
      tests: response.summary.totalTests,
      analyticsCount: response.analytics.length
    });

    res.json(response);

  } catch (error) {
    console.error('❌ Analytics Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error generating analytics',
      message: error.message
    });
  }
});

// GET subject-specific analytics
router.get('/subject/:subject', auth, async (req, res) => {
  try {
    const { subject } = req.params;
    const { className } = req.query;

    // Build query
    const query = { subject };
    if (className) query.class = className;

    // If teacher, filter by their assigned classes
    if (req.user.role === 'teacher' && req.user.subjects) {
      const teacherSubjects = req.user.subjects
        .filter(s => s.subject === subject)
        .map(s => s.class);
      
      if (teacherSubjects.length > 0) {
        query.class = { $in: teacherSubjects };
      }
    }

    const results = await Result.find(query)
      .populate('userId', 'name surname studentId')
      .populate('testId', 'title type session term')
      .lean();

    if (results.length === 0) {
      return res.json({
        success: true,
        subject,
        className: className || 'all',
        analytics: [],
        summary: {
          totalStudents: 0,
          averageScore: 0,
          totalTests: 0
        }
      });
    }

    // Calculate statistics
    const scores = results.map(r => r.score || 0);
    const averageScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
    
    // Group by test
    const tests = {};
    results.forEach(result => {
      if (result.testId) {
        const testId = result.testId._id;
        if (!tests[testId]) {
          tests[testId] = {
            testTitle: result.testId.title || 'Unknown Test',
            testType: result.testId.type || 'test',
            scores: [],
            totalStudents: 0
          };
        }
        tests[testId].scores.push(result.score || 0);
        tests[testId].totalStudents += 1;
      }
    });

    // Calculate test averages
    const testAnalytics = Object.values(tests).map(test => ({
      testTitle: test.testTitle,
      testType: test.testType,
      averageScore: (test.scores.reduce((a, b) => a + b, 0) / test.scores.length).toFixed(2),
      totalStudents: test.totalStudents
    }));

    const response = {
      success: true,
      subject,
      className: className || 'all',
      analytics: testAnalytics,
      summary: {
        totalStudents: new Set(results.map(r => r.userId?._id?.toString())).size,
        averageScore: parseFloat(averageScore),
        totalTests: Object.keys(tests).length,
        scoreRange: {
          min: Math.min(...scores),
          max: Math.max(...scores)
        }
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Subject Analytics Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error generating subject analytics'
    });
  }
});

// GET simple analytics for dropdowns/quick view
router.get('/overview', auth, async (req, res) => {
  try {
    // Only teachers and admins
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.json({
        success: true,
        overview: {
          averageScore: 0,
          totalTests: 0,
          totalStudents: 0,
          completionRate: 0
        }
      });
    }

    // Build teacher query
    const teacherQuery = {};
    if (req.user.role === 'teacher' && req.user.subjects) {
      const subjectConditions = req.user.subjects.map(sub => ({
        subject: sub.subject,
        class: sub.class
      }));
      
      if (subjectConditions.length > 0) {
        teacherQuery.$or = subjectConditions;
      }
    }

    const [tests, results] = await Promise.all([
      Test.find(teacherQuery).lean(),
      Result.find(teacherQuery).lean()
    ]);

    // Calculate quick overview
    const totalTests = tests.length;
    const totalResults = results.length;
    
    const averageScore = totalResults > 0 ? 
      (results.reduce((sum, r) => sum + (r.score || 0), 0) / totalResults).toFixed(2) : 0;
    
    const completionRate = totalTests > 0 ? 
      ((totalResults / (totalTests * 10)) * 100).toFixed(2) : 0; // Assuming 10 students per test average

    res.json({
      success: true,
      overview: {
        averageScore: parseFloat(averageScore),
        totalTests,
        totalResults,
        completionRate: parseFloat(completionRate),
        activeTests: tests.filter(t => t.status === 'active').length
      }
    });

  } catch (error) {
    console.error('Overview Analytics Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error generating overview'
    });
  }
});

module.exports = router;
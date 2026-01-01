
// routes/analytics.js - UPDATED VERSION WITHOUT TEST STATUS AND PASS RATES
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Result = require('../models/Result');
const Test = require('../models/Test');
const User = require('../models/User');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const { auth } = require('../middleware/auth');

// ==================== SIMPLE ANALYTICS ENDPOINTS ====================

// GET SIMPLE OVERVIEW - MAIN DASHBOARD ENDPOINT (UPDATED)
router.get('/overview', auth, async (req, res) => {
  try {
    console.log('📊 GET /api/analytics/overview - Requested by:', req.user.username);

    // Only admins can access institutional overview
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Get REAL counts from database
    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      totalTests,
      totalResults
    ] = await Promise.all([
      User.countDocuments({ 
        role: 'student',
        $or: [
          { isActive: true },
          { active: true },
          { isActive: { $exists: false } },
          { active: { $exists: false } }
        ]
      }),
      
      User.countDocuments({ 
        role: 'teacher',
        $or: [
          { isActive: true },
          { active: true },
          { isActive: { $exists: false } },
          { active: { $exists: false } }
        ]
      }),
      
      Class.countDocuments({
        $or: [
          { isActive: true },
          { active: true },
          { isActive: { $exists: false } },
          { active: { $exists: false } }
        ]
      }),
      
      Test.countDocuments({
        $or: [
          { isActive: true },
          { active: true },
          { isActive: { $exists: false } },
          { active: { $exists: false } }
        ]
      }),
      
      Result.countDocuments({
        $or: [
          { isActive: true },
          { active: true },
          { isActive: { $exists: false } },
          { active: { $exists: false } }
        ]
      })
    ]);

    // Calculate ACTIVE users
    const activeUsers = await User.countDocuments({
      lastLogin: { 
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        $ne: null 
      },
      $or: [
        { isActive: true },
        { active: true },
        { isActive: { $exists: false } },
        { active: { $exists: false } }
      ]
    });

    // Get all results with marks data for calculations
    const allResults = await Result.find({
      $or: [
        { isActive: true },
        { active: true },
        { isActive: { $exists: false } },
        { active: { $exists: false } }
      ]
    })
    .select('score totalMarks')
    .lean();

    // Calculate average score
    let averageScore = 0;
    let totalScoreSum = 0;
    let totalMarksSum = 0;
    
    if (allResults.length > 0) {
      // Calculate sums
      allResults.forEach(result => {
        const score = result.score || 0;
        const totalMarks = result.totalMarks || 100;
        
        totalScoreSum += score;
        totalMarksSum += totalMarks;
      });
      
      averageScore = totalMarksSum > 0 ? (totalScoreSum / totalMarksSum) * 100 : 0;
    }

    // Get average score in format like "18/20" or "45/60"
    const averageScoreFormatted = await getAverageScoreFormatted();

    // Calculate COMPLETION RATE
    const completedTests = await Test.aggregate([
      {
        $match: {
          $or: [
            { isActive: true },
            { active: true },
            { isActive: { $exists: false } },
            { active: { $exists: false } }
          ]
        }
      },
      {
        $lookup: {
          from: 'results',
          let: { testId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$testId', '$$testId'] },
                $or: [
                  { isActive: true },
                  { active: true },
                  { isActive: { $exists: false } },
                  { active: { $exists: false } }
                ]
              }
            },
            { $count: 'count' }
          ],
          as: 'resultCount'
        }
      },
      {
        $match: {
          $or: [
            { 'resultCount.0.count': { $exists: true, $gt: 0 } },
            { results: { $exists: true, $not: { $size: 0 } } }
          ]
        }
      },
      { $count: 'completedCount' }
    ]);

    const completionRate = totalTests > 0 
      ? ((completedTests[0]?.completedCount || 0) / totalTests) * 100 
      : 0;

    // Get recent tests (for the table) - UPDATED WITHOUT PASS RATE
    const recentTests = await Test.find({
      $or: [
        { isActive: true },
        { active: true },
        { isActive: { $exists: false } },
        { active: { $exists: false } }
      ]
    })
      .populate({
        path: 'class',
        select: 'name shortName level',
        model: 'Class'
      })
      .populate('createdBy', 'username name')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Format recent tests WITHOUT PASS RATE
    const formattedRecentTests = [];
    for (const test of recentTests) {
      // Get results for this test
      const testResults = await Result.find({ 
        testId: test._id,
        $or: [
          { isActive: true },
          { active: true },
          { isActive: { $exists: false } },
          { active: { $exists: false } }
        ]
      }).lean();
      
      // Calculate average score in format "X/Y"
      let testAverageScore = 0;
      let testTotalMarks = test.totalMarks || 100;
      let testAverageScoreFormatted = '0/100';
      
      if (testResults.length > 0) {
        const totalTestScore = testResults.reduce((sum, r) => sum + (r.score || 0), 0);
        const avgScore = totalTestScore / testResults.length;
        testAverageScore = (avgScore / testTotalMarks) * 100;
        
        // Format as "average/total" (e.g., "45/60")
        const averageActualScore = Math.round(avgScore);
        testAverageScoreFormatted = `${averageActualScore}/${testTotalMarks}`;
      }

      // Get proper class name
      let className = 'N/A';
      if (test.class) {
        if (typeof test.class === 'object' && test.class !== null) {
          className = test.class.name || test.class.shortName || test.class.level || 'N/A';
        } else if (typeof test.class === 'string') {
          try {
            const classDoc = await Class.findById(test.class).select('name shortName level').lean();
            if (classDoc) {
              className = classDoc.name || classDoc.shortName || classDoc.level || test.class;
            } else {
              className = test.class;
            }
          } catch (err) {
            className = test.class;
          }
        }
      }

      // Determine test type from title
      let testType = 'Test';
      if (test.title) {
        const titleLower = test.title.toLowerCase();
        if (titleLower.includes('exam') || titleLower === 'examination') {
          testType = 'Exam';
        } else if (titleLower.includes('ca') || titleLower.includes('continuous')) {
          testType = 'CA';
        } else if (titleLower.includes('assignment')) {
          testType = 'Assignment';
        } else if (titleLower.includes('quiz')) {
          testType = 'Quiz';
        }
      }

      // Get REAL status from test
      let testStatus = test.status || 'draft';
      const validStatuses = ['draft', 'approved', 'scheduled', 'active', 'completed', 'cancelled'];
      if (!validStatuses.includes(testStatus)) {
        testStatus = 'draft';
      }

      formattedRecentTests.push({
        id: test._id,
        title: test.title || 'Untitled Test',
        subject: test.subject || 'General',
        class: className,
        type: testType,
        averageScore: parseFloat(testAverageScore.toFixed(1)),
        averageScoreFormatted: testAverageScoreFormatted,
        totalMarks: testTotalMarks,
        status: testStatus, // REAL status from test
        createdAt: test.createdAt,
        createdBy: test.createdBy?.name || test.createdBy?.username || 'Unknown'
      });
    }

    // Prepare response WITHOUT PASS RATE
    const response = {
      success: true,
      overview: {
        totalStudents,
        totalTeachers,
        totalClasses,
        totalTests,
        totalResults,
        activeUsers,
        averageScore: parseFloat(averageScore.toFixed(1)),
        averageScoreFormatted: averageScoreFormatted,
        completionRate: parseFloat(completionRate.toFixed(1))
      },
      recentTests: formattedRecentTests,
      summary: {
        studentTeacherRatio: totalTeachers > 0 ? parseFloat((totalStudents / totalTeachers).toFixed(1)) : 0,
        averageTestScore: averageScoreFormatted,
        resultsPerStudent: totalStudents > 0 ? parseFloat((totalResults / totalStudents).toFixed(1)) : 0,
        totalScoreSum: totalScoreSum,
        totalMarksSum: totalMarksSum
      },
      timestamp: new Date().toISOString(),
      dataStatus: 'Real data from database'
    };

    console.log('✅ Overview generated successfully:', {
      students: totalStudents,
      teachers: totalTeachers,
      classes: totalClasses,
      tests: totalTests,
      results: totalResults,
      averageScoreFormatted: averageScoreFormatted
    });

    res.json(response);

  } catch (error) {
    console.error('❌ Error in overview:', error);
    res.status(500).json({
      success: false,
      error: 'Server error generating overview',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// NEW HELPER FUNCTION: Get average score in formatted string
async function getAverageScoreFormatted() {
  try {
    // Get all tests that have results
    const testsWithResults = await Test.aggregate([
      {
        $match: {
          $or: [
            { isActive: true },
            { active: true },
            { isActive: { $exists: false } },
            { active: { $exists: false } }
          ]
        }
      },
      {
        $lookup: {
          from: 'results',
          let: { testId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$testId', '$$testId'] },
                $or: [
                  { isActive: true },
                  { active: true },
                  { isActive: { $exists: false } },
                  { active: { $exists: false } }
                ]
              }
            }
          ],
          as: 'testResults'
        }
      },
      {
        $match: {
          testResults: { $ne: [] }
        }
      },
      {
        $project: {
          title: 1,
          totalMarks: 1,
          testResults: 1
        }
      }
    ]);

    if (testsWithResults.length === 0) {
      return '0/100';
    }

    // Calculate weighted average
    let totalWeightedScore = 0;
    let totalWeightedMarks = 0;

    for (const test of testsWithResults) {
      const testTotalMarks = test.totalMarks || 100;
      const testResults = test.testResults || [];
      
      if (testResults.length > 0) {
        const testTotalScore = testResults.reduce((sum, r) => sum + (r.score || 0), 0);
        const testAverageScore = testTotalScore / testResults.length;
        
        // Weight by number of results
        const weight = testResults.length;
        totalWeightedScore += testAverageScore * weight;
        totalWeightedMarks += testTotalMarks * weight;
      }
    }

    if (totalWeightedMarks === 0) {
      return '0/100';
    }

    // Calculate overall average
    const overallAverageScore = totalWeightedScore / totalWeightedMarks;
    
    // Find most common total marks (20 for CA, 60 for Exam, etc.)
    const marksFrequency = {};
    testsWithResults.forEach(test => {
      const marks = test.totalMarks || 100;
      marksFrequency[marks] = (marksFrequency[marks] || 0) + 1;
    });
    
    // Find the most frequent total marks
    let mostCommonMarks = 100;
    let maxFrequency = 0;
    for (const [marks, freq] of Object.entries(marksFrequency)) {
      if (freq > maxFrequency) {
        maxFrequency = freq;
        mostCommonMarks = parseInt(marks);
      }
    }

    // Calculate average score based on most common marks
    const averageActualScore = Math.round(overallAverageScore * mostCommonMarks);
    
    return `${averageActualScore}/${mostCommonMarks}`;
  } catch (error) {
    console.error('Error calculating formatted average score:', error);
    return '0/100';
  }
}

// GET RECENT TESTS WITH DETAILED SCORES - UPDATED WITHOUT PASS RATES
router.get('/recent-tests-detailed', auth, async (req, res) => {
  try {
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { limit = 10 } = req.query;

    // Get recent tests with detailed information
    const recentTests = await Test.find({
      $or: [
        { isActive: true },
        { active: true },
        { isActive: { $exists: false } },
        { active: { $exists: false } }
      ]
    })
      .populate({
        path: 'class',
        select: 'name shortName level',
        model: 'Class'
      })
      .populate('createdBy', 'username name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Format tests WITHOUT pass rates
    const detailedTests = await Promise.all(recentTests.map(async (test) => {
      // Get results for this test
      const testResults = await Result.find({ 
        testId: test._id,
        $or: [
          { isActive: true },
          { active: true },
          { isActive: { $exists: false } },
          { active: { $exists: false } }
        ]
      }).lean();
      
      // Calculate score metrics WITHOUT pass rate
      let stats = {
        totalStudents: testResults.length,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        averageScoreFormatted: '0/' + (test.totalMarks || 100)
      };
      
      if (testResults.length > 0) {
        const scores = testResults.map(r => r.score || 0);
        const totalMarks = test.totalMarks || 100;
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        
        stats.averageScore = (totalScore / scores.length / totalMarks) * 100;
        stats.highestScore = Math.max(...scores);
        stats.lowestScore = Math.min(...scores);
        
        // Format average score as "X/Y"
        const averageActualScore = Math.round(totalScore / scores.length);
        stats.averageScoreFormatted = `${averageActualScore}/${totalMarks}`;
      }

      // Determine test type
      let testType = 'Test';
      if (test.title) {
        const titleLower = test.title.toLowerCase();
        if (titleLower.includes('exam') || titleLower === 'examination') {
          testType = 'Exam';
        } else if (titleLower.includes('ca') || titleLower.includes('continuous')) {
          testType = 'CA';
        } else if (titleLower.includes('assignment')) {
          testType = 'Assignment';
        } else if (titleLower.includes('quiz')) {
          testType = 'Quiz';
        }
      }

      // Get class name
      let className = 'N/A';
      if (test.class) {
        if (typeof test.class === 'object' && test.class !== null) {
          className = test.class.name || test.class.shortName || test.class.level || 'N/A';
        } else if (typeof test.class === 'string') {
          try {
            const classDoc = await Class.findById(test.class).select('name shortName level').lean();
            if (classDoc) {
              className = classDoc.name || classDoc.shortName || classDoc.level || test.class;
            } else {
              className = test.class;
            }
          } catch (err) {
            className = test.class;
          }
        }
      }

      // Get REAL status from test
      let testStatus = test.status || 'draft';
      const validStatuses = ['draft', 'approved', 'scheduled', 'active', 'completed', 'cancelled'];
      if (!validStatuses.includes(testStatus)) {
        testStatus = 'draft';
      }

      return {
        id: test._id,
        title: test.title || 'Untitled Test',
        subject: test.subject || 'General',
        class: className,
        type: testType,
        totalMarks: test.totalMarks || 100,
        status: testStatus, // REAL status
        createdAt: test.createdAt,
        createdBy: test.createdBy?.name || test.createdBy?.username || 'Unknown',
        stats: stats
      };
    }));

    res.json({
      success: true,
      count: detailedTests.length,
      tests: detailedTests
    });

  } catch (error) {
    console.error('Recent tests detailed error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching recent tests'
    });
  }
});

// GET TEST SCORES SUMMARY - UPDATED WITHOUT PASS RATES
router.get('/test-scores-summary', auth, async (req, res) => {
  try {
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Get all tests with results
    const testsWithResults = await Test.aggregate([
      {
        $match: {
          $or: [
            { isActive: true },
            { active: true },
            { isActive: { $exists: false } },
            { active: { $exists: false } }
          ]
        }
      },
      {
        $lookup: {
          from: 'results',
          let: { testId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$testId', '$$testId'] },
                $or: [
                  { isActive: true },
                  { active: true },
                  { isActive: { $exists: false } },
                  { active: { $exists: false } }
                ]
              }
            }
          ],
          as: 'results'
        }
      },
      {
        $match: {
          results: { $ne: [] }
        }
      },
      {
        $project: {
          title: 1,
          subject: 1,
          class: 1,
          type: { $literal: '' },
          totalMarks: 1,
          status: 1,
          createdAt: 1,
          results: 1,
          resultCount: { $size: '$results' }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    // Process each test WITHOUT pass rates
    const testSummaries = await Promise.all(testsWithResults.map(async (test) => {
      // Determine test type from title
      let testType = 'Test';
      if (test.title) {
        const titleLower = test.title.toLowerCase();
        if (titleLower.includes('exam') || titleLower === 'examination') {
          testType = 'Exam';
        } else if (titleLower.includes('ca') || titleLower.includes('continuous')) {
          testType = 'CA';
        } else if (titleLower.includes('assignment')) {
          testType = 'Assignment';
        } else if (titleLower.includes('quiz')) {
          testType = 'Quiz';
        }
      }

      // Get class name
      let className = 'N/A';
      if (test.class) {
        if (mongoose.isValidObjectId(test.class)) {
          const classDoc = await Class.findById(test.class).select('name shortName level').lean();
          if (classDoc) {
            className = classDoc.name || classDoc.shortName || classDoc.level || 'N/A';
          }
        } else if (typeof test.class === 'string') {
          className = test.class;
        }
      }

      // Calculate score statistics WITHOUT pass rates
      const results = test.results || [];
      const totalMarks = test.totalMarks || 100;
      
      let stats = {
        totalStudents: results.length,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        averageScoreFormatted: '0/' + totalMarks
      };

      if (results.length > 0) {
        const scores = results.map(r => r.score || 0);
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        
        stats.averageScore = (totalScore / scores.length / totalMarks) * 100;
        stats.highestScore = Math.max(...scores);
        stats.lowestScore = Math.min(...scores);
        
        // Format average score as "X/Y"
        const averageActualScore = Math.round(totalScore / scores.length);
        stats.averageScoreFormatted = `${averageActualScore}/${totalMarks}`;
      }

      // Get REAL status
      let testStatus = test.status || 'draft';
      const validStatuses = ['draft', 'approved', 'scheduled', 'active', 'completed', 'cancelled'];
      if (!validStatuses.includes(testStatus)) {
        testStatus = 'draft';
      }

      return {
        id: test._id,
        title: test.title || 'Untitled Test',
        subject: test.subject || 'General',
        class: className,
        type: testType,
        totalMarks: totalMarks,
        status: testStatus, // REAL status
        createdAt: test.createdAt,
        stats: stats
      };
    }));

    // Group by test type
    const byType = {
      Exam: testSummaries.filter(t => t.type === 'Exam'),
      CA: testSummaries.filter(t => t.type === 'CA'),
      Test: testSummaries.filter(t => t.type === 'Test'),
      Assignment: testSummaries.filter(t => t.type === 'Assignment'),
      Quiz: testSummaries.filter(t => t.type === 'Quiz')
    };

    // Calculate overall statistics WITHOUT pass rates
    const overallStats = {
      totalTests: testSummaries.length,
      totalStudents: testSummaries.reduce((sum, test) => sum + test.stats.totalStudents, 0),
      averageScoreFormatted: calculateOverallAverageFormatted(testSummaries)
    };

    res.json({
      success: true,
      summary: {
        byType: byType,
        overall: overallStats,
        recentTests: testSummaries.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('Test scores summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching test scores summary'
    });
  }
});

// Helper function to calculate overall average formatted
function calculateOverallAverageFormatted(tests) {
  if (tests.length === 0) return '0/100';
  
  let totalWeightedScore = 0;
  let totalWeightedMarks = 0;
  
  tests.forEach(test => {
    const testStats = test.stats;
    if (testStats.totalStudents > 0) {
      const averageScore = parseInt(testStats.averageScoreFormatted.split('/')[0]);
      const totalMarks = test.totalMarks || 100;
      const weight = testStats.totalStudents;
      
      totalWeightedScore += averageScore * weight;
      totalWeightedMarks += totalMarks * weight;
    }
  });
  
  if (totalWeightedMarks === 0) return '0/100';
  
  const overallAverage = Math.round(totalWeightedScore / tests.length);
  const mostCommonMarks = 100;
  
  return `${overallAverage}/${mostCommonMarks}`;
}

// GET SIMPLE PERFORMANCE TREND (UPDATED WITHOUT PASS RATES)
router.get('/performance-trend', auth, async (req, res) => {
  try {
    // Only admins can access
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { months = 6 } = req.query;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendData = [];
    
    const now = new Date();
    
    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      // Get results for this month
      const monthResults = await Result.find({
        submittedAt: {
          $gte: startDate,
          $lte: endDate
        },
        $or: [
          { isActive: true },
          { active: true },
          { isActive: { $exists: false } },
          { active: { $exists: false } }
        ]
      }).lean();

      // Calculate average score
      let averageScore = 0;
      if (monthResults.length > 0) {
        const totalScore = monthResults.reduce((sum, r) => sum + (r.score || 0), 0);
        const totalMarks = monthResults.reduce((sum, r) => sum + (r.totalMarks || 100), 0);
        averageScore = totalMarks > 0 ? (totalScore / totalMarks) * 100 : 0;
      }

      const monthIndex = (now.getMonth() - i + 12) % 12;
      const year = now.getFullYear() - Math.floor((now.getMonth() - i) / 12);

      trendData.push({
        month: `${monthNames[monthIndex]} ${year}`,
        score: parseFloat(averageScore.toFixed(1)),
        testsTaken: monthResults.length
      });
    }

    // Filter out zero scores for summary calculations
    const validScores = trendData.filter(d => d.score > 0).map(d => d.score);
    
    res.json({
      success: true,
      trendData,
      summary: {
        currentScore: trendData[trendData.length - 1]?.score || 0,
        highestScore: validScores.length > 0 ? Math.max(...validScores) : 0,
        lowestScore: validScores.length > 0 ? Math.min(...validScores) : 0,
        averageScore: validScores.length > 0 
          ? parseFloat((validScores.reduce((sum, s) => sum + s, 0) / validScores.length).toFixed(1))
          : 0
      }
    });

  } catch (error) {
    console.error('Performance trend error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error generating performance trend'
    });
  }
});

// GET SIMPLE SUBJECT PERFORMANCE (UPDATED WITHOUT PASS RATES)
router.get('/subject-performance', auth, async (req, res) => {
  try {
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Get all results grouped by subject
    const subjectResults = await Result.aggregate([
      { 
        $match: { 
          subject: { $exists: true, $ne: null, $ne: '' },
          $or: [
            { isActive: true },
            { active: true },
            { isActive: { $exists: false } },
            { active: { $exists: false } }
          ]
        } 
      },
      { $group: {
        _id: '$subject',
        averageScore: { $avg: '$score' },
        totalStudents: { $addToSet: '$userId' },
        totalTests: { $sum: 1 },
        highestScore: { $max: '$score' },
        lowestScore: { $min: '$score' }
      }},
      { $sort: { averageScore: -1 } },
      { $limit: 10 }
    ]);

    // Format data WITHOUT pass rates
    const subjectData = subjectResults.map(item => ({
      subject: item._id || 'Unknown',
      averageScore: parseFloat((item.averageScore || 0).toFixed(1)),
      totalStudents: item.totalStudents?.length || 0,
      totalTests: item.totalTests || 0,
      highestScore: item.highestScore || 0,
      lowestScore: item.lowestScore || 0,
      color: getSubjectColor(item._id)
    }));

    res.json({
      success: true,
      subjects: subjectData,
      summary: {
        totalSubjects: subjectData.length,
        overallAverage: subjectData.length > 0 
          ? parseFloat((subjectData.reduce((sum, s) => sum + s.averageScore, 0) / subjectData.length).toFixed(1))
          : 0
      }
    });

  } catch (error) {
    console.error('Subject performance error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error generating subject performance'
    });
  }
});

// GET TEACHER ANALYTICS (UPDATED WITHOUT PASS RATES)
router.get('/teacher-analytics', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Teacher access required'
      });
    }

    const teacherId = req.user.id;

    // Get tests created by this teacher
    const teacherTests = await Test.find({
      createdBy: teacherId,
      $or: [
        { isActive: true },
        { active: true },
        { isActive: { $exists: false } },
        { active: { $exists: false } }
      ]
    })
    .populate('class', 'name shortName')
    .lean();

    // Get results for teacher's tests
    const testIds = teacherTests.map(test => test._id);
    const teacherResults = await Result.find({
      testId: { $in: testIds },
      $or: [
        { isActive: true },
        { active: true },
        { isActive: { $exists: false } },
        { active: { $exists: false } }
      ]
    }).lean();

    // Calculate statistics WITHOUT pass rates
    const totalTests = teacherTests.length;
    const totalResults = teacherResults.length;
    
    let averageScore = 0;
    let averageScoreFormatted = '0/100';
    
    if (teacherResults.length > 0) {
      const totalScore = teacherResults.reduce((sum, r) => sum + (r.score || 0), 0);
      const totalMarksSum = teacherResults.reduce((sum, r) => sum + (r.totalMarks || 100), 0);
      averageScore = totalMarksSum > 0 ? (totalScore / totalMarksSum) * 100 : 0;
      
      // Calculate formatted average score
      const avgActualScore = Math.round(totalScore / teacherResults.length);
      const avgTotalMarks = Math.round(totalMarksSum / teacherResults.length);
      averageScoreFormatted = `${avgActualScore}/${avgTotalMarks}`;
    }

    // Get top performing test with formatted scores
    let topTest = null;
    if (teacherTests.length > 0) {
      const testWithScores = await Promise.all(teacherTests.map(async (test) => {
        const testResults = teacherResults.filter(r => r.testId.toString() === test._id.toString());
        let testAverage = 0;
        let testAverageFormatted = '0/100';
        
        if (testResults.length > 0) {
          const testTotalScore = testResults.reduce((sum, r) => sum + (r.score || 0), 0);
          const testTotalMarks = test.totalMarks || 100;
          testAverage = (testTotalScore / testResults.length / testTotalMarks) * 100;
          
          // Format as "X/Y"
          const avgScore = Math.round(testTotalScore / testResults.length);
          testAverageFormatted = `${avgScore}/${testTotalMarks}`;
        }
        
        // Get class name
        let className = 'N/A';
        if (test.class) {
          if (typeof test.class === 'object') {
            className = test.class.name || test.class.shortName || className;
          } else {
            className = test.class;
          }
        }
        
        return { 
          test: { ...test, className }, 
          average: testAverage,
          averageFormatted: testAverageFormatted
        };
      }));
      
      testWithScores.sort((a, b) => b.average - a.average);
      if (testWithScores[0]) {
        topTest = {
          title: testWithScores[0].test.title || 'Untitled',
          subject: testWithScores[0].test.subject || 'General',
          class: testWithScores[0].test.className,
          averageScore: parseFloat(testWithScores[0].average.toFixed(1)),
          averageScoreFormatted: testWithScores[0].averageFormatted
        };
      }
    }

    // Format recent tests WITHOUT pass rates
    const recentTestsFormatted = await Promise.all(teacherTests.slice(0, 5).map(async (test) => {
      const testResults = teacherResults.filter(r => r.testId.toString() === test._id.toString());
      let averageScoreFormatted = '0/100';
      
      if (testResults.length > 0) {
        const totalScore = testResults.reduce((sum, r) => sum + (r.score || 0), 0);
        const totalMarks = test.totalMarks || 100;
        const avgScore = Math.round(totalScore / testResults.length);
        averageScoreFormatted = `${avgScore}/${totalMarks}`;
      }
      
      // Determine test type
      let testType = 'Test';
      if (test.title) {
        const titleLower = test.title.toLowerCase();
        if (titleLower.includes('exam') || titleLower === 'examination') {
          testType = 'Exam';
        } else if (titleLower.includes('ca') || titleLower.includes('continuous')) {
          testType = 'CA';
        }
      }
      
      // Get REAL status
      let testStatus = test.status || 'draft';
      const validStatuses = ['draft', 'approved', 'scheduled', 'active', 'completed', 'cancelled'];
      if (!validStatuses.includes(testStatus)) {
        testStatus = 'draft';
      }
      
      return {
        id: test._id,
        title: test.title || 'Untitled Test',
        subject: test.subject || 'General',
        class: test.className || test.class || 'N/A',
        type: testType,
        totalMarks: test.totalMarks || 100,
        averageScoreFormatted: averageScoreFormatted,
        status: testStatus, // REAL status
        createdAt: test.createdAt
      };
    }));

    res.json({
      success: true,
      analytics: {
        teacherId,
        teacherName: req.user.name || req.user.username,
        totalTests,
        totalResults,
        averageScore: parseFloat(averageScore.toFixed(1)),
        averageScoreFormatted: averageScoreFormatted,
        topTest,
        recentTests: recentTestsFormatted
      }
    });

  } catch (error) {
    console.error('Teacher analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error generating teacher analytics'
    });
  }
});

// GET TEST STATUS SUMMARY - NEW ENDPOINT FOR REAL STATUS
router.get('/test-status-summary', auth, async (req, res) => {
  try {
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Get all tests with their REAL status
    const tests = await Test.find({
      $or: [
        { isActive: true },
        { active: true },
        { isActive: { $exists: false } },
        { active: { $exists: false } }
      ]
    })
    .select('title subject class status createdAt')
    .populate('class', 'name')
    .lean();

    // Count tests by status
    const statusCounts = {
      draft: 0,
      approved: 0,
      scheduled: 0,
      active: 0,
      completed: 0,
      cancelled: 0
    };

    const statusDetails = {
      draft: [],
      approved: [],
      scheduled: [],
      active: [],
      completed: [],
      cancelled: []
    };

    // Organize tests by status
    tests.forEach(test => {
      const status = test.status || 'draft';
      const validStatus = ['draft', 'approved', 'scheduled', 'active', 'completed', 'cancelled'].includes(status) 
        ? status 
        : 'draft';
      
      statusCounts[validStatus]++;
      
      statusDetails[validStatus].push({
        title: test.title || 'Untitled',
        subject: test.subject || 'General',
        class: test.class?.name || test.class || 'N/A',
        createdAt: test.createdAt,
        resultCount: 0 // You can add actual result count if needed
      });
    });

    res.json({
      success: true,
      statusSummary: {
        totalTests: tests.length,
        counts: statusCounts,
        details: statusDetails
      }
    });

  } catch (error) {
    console.error('Test status summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching test status summary'
    });
  }
});

// GET HEALTH CHECK
router.get('/health', async (req, res) => {
  try {
    const counts = await Promise.all([
      User.countDocuments().maxTimeMS(5000),
      Test.countDocuments().maxTimeMS(5000),
      Result.countDocuments().maxTimeMS(5000),
      Class.countDocuments().maxTimeMS(5000)
    ]);

    // Test database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    res.json({
      success: true,
      health: {
        users: counts[0],
        tests: counts[1],
        results: counts[2],
        classes: counts[3],
        database: dbStatus,
        serverTime: new Date().toISOString(),
        uptime: process.uptime()
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Analytics service health check failed',
      details: error.message
    });
  }
});

// HELPER FUNCTION: Get subject color
function getSubjectColor(subjectName) {
  if (!subjectName) return '#4B5320';
  
  const subject = subjectName.toLowerCase();
  
  const colorMap = {
    'mathematics': '#4B5320',
    'math': '#4B5320',
    'english': '#00FF00',
    'language': '#00FF00',
    'science': '#FFA500',
    'biology': '#2E7D32',
    'chemistry': '#1565C0',
    'physics': '#6A1B9A',
    'history': '#6B8E23',
    'geography': '#28A745',
    'computer': '#17A2B8',
    'ict': '#17A2B8',
    'technology': '#17A2B8',
    'french': '#D81B60',
    'yoruba': '#F57C00',
    'hausa': '#5D4037',
    'igbo': '#795548',
    'economics': '#7B1FA2',
    'commerce': '#7B1FA2',
    'accounting': '#00838F',
    'government': '#5D4037',
    'civic': '#5D4037'
  };
  
  for (const [key, color] of Object.entries(colorMap)) {
    if (subject.includes(key)) {
      return color;
    }
  }
  
  // Generate consistent color based on subject name
  const colors = ['#4B5320', '#00FF00', '#FFA500', '#6B8E23', '#28A745', 
                  '#17A2B8', '#D81B60', '#F57C00', '#5D4037', '#7B1FA2'];
  const index = subject.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}

module.exports = router;

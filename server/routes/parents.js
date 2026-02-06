// routes/parents.js - PARENT PORTAL ROUTES (UPDATED FOR Result MODEL WITH VISIBILITY CHECKS)
const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const ParentFeedback = require('../models/ParentFeedback');
const Result = require('../models/Result'); // Changed from ExamResult to Result
const ReportCardAccess = require('../models/ReportCardAccess'); // Added for download tracking
const Test = require('../models/Test');
const Class = require('../models/Class'); // Added Class model
const { auth, parentOnly, parentAccessToStudent } = require('../middleware/auth');

const router = express.Router();

// Helper functions for test data
function getSubjectIcon(subject) {
  const iconMap = {
    'mathematics': '🧮',
    'english': '📚',
    'science': '🔬',
    'physics': '⚛️',
    'chemistry': '🧪',
    'biology': '🧬',
    'history': '📜',
    'geography': '🌍',
    'computer': '💻',
    'french': '🇫🇷',
    'art': '🎨',
    'music': '🎵',
    'pe': '⚽',
    'economics': '💰',
    'accounting': '📊'
  };
  
  const lowerSubject = subject.toLowerCase();
  for (const [key, icon] of Object.entries(iconMap)) {
    if (lowerSubject.includes(key)) {
      return icon;
    }
  }
  return '📝';
}

function formatDate(date) {
  const d = new Date(date);
  const now = new Date();
  const diffTime = Math.abs(d - now);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days`;
  
  return d.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

// Helper function to calculate average grade for a set of results
function calculateAverageGrade(results) {
  if (results.length === 0) return 'N/A';
  
  const gradePoints = { 'A+': 5.5, 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, 'F': 0 };
  let totalPoints = 0;
  let validGrades = 0;
  
  results.forEach(result => {
    const grade = result.grade || result.overallGrade;
    if (grade && gradePoints[grade] !== undefined) {
      totalPoints += gradePoints[grade];
      validGrades++;
    }
  });
  
  if (validGrades === 0) return 'N/A';
  
  const averagePoint = totalPoints / validGrades;
  
  if (averagePoint >= 5.0) return 'A+';
  if (averagePoint >= 4.5) return 'A';
  else if (averagePoint >= 3.5) return 'B';
  else if (averagePoint >= 2.5) return 'C';
  else if (averagePoint >= 1.5) return 'D';
  else if (averagePoint >= 0.5) return 'E';
  else return 'F';
}

// Helper function to determine performance level
function getPerformanceLevel(percentage) {
  if (percentage >= 85) return 'Excellent';
  if (percentage >= 70) return 'Good';
  if (percentage >= 55) return 'Average';
  if (percentage >= 40) return 'Below Average';
  return 'Needs Improvement';
}

// Helper function for subject recommendations
function getSubjectRecommendation(percentage, trend) {
  if (percentage >= 85) {
    return trend === 'Improving' 
      ? 'Outstanding performance! Continue the excellent work.'
      : 'Excellent performance. Maintain consistency.';
  }
  
  if (percentage >= 70) {
    return trend === 'Improving'
      ? 'Good performance and improving. Aim for excellence.'
      : 'Good performance. Focus on weak areas to improve.';
  }
  
  if (percentage >= 55) {
    return trend === 'Improving'
      ? 'Average performance with positive trend. Keep improving.'
      : 'Average performance. Consider additional practice or tutoring.';
  }
  
  if (percentage >= 40) {
    return 'Below average performance. Requires attention and additional support.';
  }
  
  return 'Needs significant improvement. Consider intensive tutoring or additional resources.';
}

// Helper function for visibility messages
function getVisibilityMessage(percentage, totalResults) {
  if (totalResults === 0) {
    return 'No exam results have been published yet.';
  }
  
  if (percentage === 0) {
    return 'No results are currently visible. Results may be scheduled for future release.';
  }
  
  if (percentage === 100) {
    return 'All published results are visible to you.';
  }
  
  if (percentage >= 75) {
    return `Most results (${percentage}%) are visible. Some may be scheduled for future release.`;
  }
  
  if (percentage >= 50) {
    return `About ${percentage}% of results are visible. Check back for more results.`;
  }
  
  return `Limited results (${percentage}%) are currently visible. More may be released soon.`;
}

// ============================================================
// PARENT DASHBOARD ENDPOINTS
// ============================================================

// Get parent dashboard
router.get('/dashboard', auth, parentOnly, async (req, res) => {
  try {
    console.log('🏠 GET /api/parents/dashboard - Parent dashboard:', req.user.id);
    
    const parent = await User.findById(req.user.id)
      .select('firstName lastName username email parentCode phone notificationPreferences')
      .populate({
        path: 'children',
        select: 'firstName lastName studentId className dateOfBirth sex profileImage',
        match: { active: true },
        populate: {
          path: 'class',
          select: 'name shortName level'
        }
      })
      .lean();

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    // Get recent exam results for all children (only visible results)
    const childIds = parent.children?.map(child => child._id) || [];
    let recentResults = [];
    
    if (childIds.length > 0) {
      recentResults = await Result.find({
        userId: { $in: childIds },
        isActive: true,
        isVisibleToParent: true, // Only show results visible to parents
        $or: [
          { scheduledVisibility: null },
          { scheduledVisibility: { $lte: new Date() } }
        ]
      })
        .select('subject session term score totalMarks percentage grade submittedAt')
        .populate('userId', 'firstName lastName studentId')
        .populate('class', 'name shortName level')
        .populate('testId', 'title')
        .sort({ submittedAt: -1 })
        .limit(10)
        .lean();
    }

    // Get unread feedback responses
    const unreadFeedbackCount = await ParentFeedback.countDocuments({
      parentId: req.user.id,
      hasResponse: true,
      responseRead: false
    });

    // Get children statistics
    const children = parent.children || [];
    const childrenByClass = {};
    let totalChildren = children.length;
    
    children.forEach(child => {
      const className = child.class?.name || 'No Class';
      if (!childrenByClass[className]) {
        childrenByClass[className] = {
          className,
          count: 0,
          children: []
        };
      }
      childrenByClass[className].count++;
      childrenByClass[className].children.push({
        id: child._id,
        name: `${child.firstName} ${child.lastName}`,
        studentId: child.studentId,
        profileImage: child.profileImage
      });
    });

    res.json({
      success: true,
      parent: {
        id: parent._id,
        name: `${parent.firstName} ${parent.lastName}`,
        username: parent.username,
        email: parent.email,
        parentCode: parent.parentCode,
        phone: parent.phone,
        notificationPreferences: parent.notificationPreferences || {}
      },
      dashboard: {
        totalChildren,
        childrenByClass: Object.values(childrenByClass),
        recentResults: recentResults.map(result => ({
          id: result._id,
          student: result.userId,
          testTitle: result.testId?.title || 'Test',
          subject: result.subject,
          session: result.session,
          term: result.term,
          score: result.score,
          totalMarks: result.totalMarks,
          percentage: result.percentage,
          grade: result.grade,
          submittedAt: result.submittedAt
        })),
        unreadFeedbackCount,
        lastLogin: req.user.lastLogin,
        children: children.map(child => ({
          id: child._id,
          name: `${child.firstName} ${child.lastName}`,
          studentId: child.studentId,
          className: child.className,
          class: child.class,
          dateOfBirth: child.dateOfBirth,
          sex: child.sex,
          profileImage: child.profileImage
        }))
      }
    });
  } catch (err) {
    console.error('❌ GET /parents/dashboard error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to load parent dashboard',
      error: err.message
    });
  }
});

// ============================================================
// CHILDREN MANAGEMENT ENDPOINTS (VIEW ONLY)
// ============================================================

// Get all children linked to parent
router.get('/children', auth, parentOnly, async (req, res) => {
  try {
    console.log('👨‍👧‍👦 GET /api/parents/children - Parent fetching children:', req.user.id);
    
    const parent = await User.findById(req.user.id)
      .select('children')
      .populate({
        path: 'children',
        select: 'firstName lastName studentId className dateOfBirth sex address phoneNumber email profileImage',
        match: { active: true },
        populate: {
          path: 'class',
          select: 'name shortName level'
        }
      })
      .lean();

    const children = parent.children || [];

    res.json({
      success: true,
      children: children.map(child => ({
        id: child._id,
        name: `${child.firstName} ${child.lastName}`,
        studentId: child.studentId,
        className: child.className,
        class: child.class,
        dateOfBirth: child.dateOfBirth,
        age: child.dateOfBirth ? calculateAge(child.dateOfBirth) : null,
        sex: child.sex,
        address: child.address,
        phoneNumber: child.phoneNumber,
        email: child.email,
        profileImage: child.profileImage
      })),
      total: children.length
    });
  } catch (err) {
    console.error('❌ GET /parents/children error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch children',
      error: err.message
    });
  }
});

// Get specific child details
router.get('/children/:studentId', auth, parentAccessToStudent, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    console.log('👦 GET /api/parents/children/:studentId - Parent fetching child details:', {
      parentId: req.user.id,
      studentId
    });

    const child = await User.findById(studentId)
      .select('firstName lastName studentId className dateOfBirth sex address phoneNumber email profileImage enrolledSubjects')
      .populate({
        path: 'class',
        select: 'name shortName level fullName'
      })
      .populate({
        path: 'enrolledSubjects.subject',
        select: 'name code category'
      })
      .lean();

    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Child not found'
      });
    }

    // Get child's recent exam results (only visible ones)
    const recentResults = await Result.find({
      userId: studentId,
      isActive: true,
      isVisibleToParent: true, // Only show results visible to parents
      $or: [
        { scheduledVisibility: null },
        { scheduledVisibility: { $lte: new Date() } }
      ]
    })
      .select('subject session term score totalMarks percentage grade submittedAt')
      .populate('testId', 'title')
      .sort({ submittedAt: -1 })
      .limit(5)
      .lean();

    res.json({
      success: true,
      child: {
        id: child._id,
        name: `${child.firstName} ${child.lastName}`,
        studentId: child.studentId,
        className: child.className,
        class: child.class,
        dateOfBirth: child.dateOfBirth,
        age: child.dateOfBirth ? calculateAge(child.dateOfBirth) : null,
        sex: child.sex,
        address: child.address,
        phoneNumber: child.phoneNumber,
        email: child.email,
        profileImage: child.profileImage,
        enrolledSubjects: child.enrolledSubjects || []
      },
      academic: {
        recentResults: recentResults.map(result => ({
          id: result._id,
          testTitle: result.testId?.title || 'Test',
          subject: result.subject,
          session: result.session,
          term: result.term,
          score: result.score,
          totalMarks: result.totalMarks,
          percentage: result.percentage,
          grade: result.grade,
          submittedAt: result.submittedAt
        })),
        totalExams: recentResults.length
      }
    });
  } catch (err) {
    console.error('❌ GET /parents/children/:studentId error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch child details',
      error: err.message
    });
  }
});

// ============================================================
// EXAM RESULTS ENDPOINTS WITH VISIBILITY CHECKS
// ============================================================

// Get all exam results for a specific child (UPDATED WITH VISIBILITY CHECK)
router.get('/children/:studentId/results', auth, parentAccessToStudent, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { subject, term, year, page = 1, limit = 10 } = req.query;
    
    console.log('📊 GET /api/parents/children/:studentId/results - Parent fetching child results:', {
      parentId: req.user.id,
      studentId,
      subject,
      term,
      year
    });

    // Build filter - ONLY SHOW VISIBLE RESULTS
    const filter = {
      userId: studentId,
      isActive: true,
      isVisibleToParent: true,
      $or: [
        { scheduledVisibility: null },
        { scheduledVisibility: { $lte: new Date() } }
      ]
    };
    
    if (subject) filter.subject = subject;
    if (term) filter.term = term;
    if (year) filter.session = { $regex: year, $options: 'i' };

    const skip = (page - 1) * limit;
    
    // Get exam results with pagination
    const results = await Result.find(filter)
      .select('subject session term score totalMarks percentage grade position submittedAt timeSpent')
      .populate('userId', 'firstName lastName studentId')
      .populate('class', 'name shortName level')
      .populate('testId', 'title type totalMarks')
      .populate('reviewedBy', 'firstName lastName username')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalResults = await Result.countDocuments(filter);
    const totalPages = Math.ceil(totalResults / limit);

    // Record view access for each result
    try {
      await Promise.all(
        results.map(result => {
          const ResultModel = mongoose.model('Result');
          const resultDoc = new ResultModel(result);
          return resultDoc.recordParentAccess(
            req.user.id,
            'viewed',
            req.ip,
            req.headers['user-agent']
          );
        })
      );
    } catch (accessError) {
      console.warn('⚠️ Error recording parent access:', accessError.message);
      // Don't fail the request if access recording fails
    }

    // Calculate statistics
    const statistics = {
      totalResults,
      bySubject: {},
      byYear: {},
      averageGrade: 'N/A',
      bestResult: null,
      latestResult: results.length > 0 ? results[0] : null
    };

    if (results.length > 0) {
      // Group by subject
      results.forEach(result => {
        if (!statistics.bySubject[result.subject]) {
          statistics.bySubject[result.subject] = 0;
        }
        statistics.bySubject[result.subject]++;
        
        // Extract year from session
        const yearMatch = result.session?.match(/\d{4}/);
        if (yearMatch) {
          const year = yearMatch[0];
          if (!statistics.byYear[year]) {
            statistics.byYear[year] = 0;
          }
          statistics.byYear[year]++;
        }
      });

      // Find best result by percentage
      statistics.bestResult = results.reduce((best, current) => {
        if (!best) return current;
        return current.percentage > best.percentage ? current : best;
      }, null);
    }

    // Format results for response
    const formattedResults = results.map(result => ({
      id: result._id,
      testTitle: result.testId?.title || 'Test',
      subject: result.subject,
      session: result.session,
      term: result.term,
      score: result.score,
      totalMarks: result.totalMarks,
      percentage: result.percentage,
      grade: result.grade,
      position: result.position,
      timeSpent: result.timeSpent ? `${Math.floor(result.timeSpent / 60)}m ${result.timeSpent % 60}s` : null,
      submittedAt: result.submittedAt,
      reviewedBy: result.reviewedBy,
      class: result.class,
      student: result.userId,
      isVisibleToParent: result.isVisibleToParent,
      scheduledVisibility: result.scheduledVisibility
    }));

    res.json({
      success: true,
      studentId,
      results: formattedResults,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalResults,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      statistics,
      filter: {
        subject: subject || 'All',
        term: term || 'All',
        year: year || 'All'
      },
      visibilityInfo: {
        visibleResults: totalResults,
        message: `Showing ${totalResults} visible result(s)`
      }
    });
  } catch (err) {
    console.error('❌ GET /parents/children/:studentId/results error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exam results',
      error: err.message
    });
  }
});

// Get specific exam result details
router.get('/children/:studentId/results/:resultId', auth, parentAccessToStudent, async (req, res) => {
  try {
    const { studentId, resultId } = req.params;
    
    console.log('📄 GET /api/parents/children/:studentId/results/:resultId - Parent fetching result details:', {
      parentId: req.user.id,
      studentId,
      resultId
    });

    const result = await Result.findOne({
      _id: resultId,
      userId: studentId,
      isActive: true,
      isVisibleToParent: true,
      $or: [
        { scheduledVisibility: null },
        { scheduledVisibility: { $lte: new Date() } }
      ]
    })
      .populate('userId', 'firstName lastName studentId className')
      .populate('class', 'name shortName level')
      .populate('testId', 'title type totalMarks passingMarks')
      .populate('reviewedBy', 'firstName lastName username')
      .populate('updatedBy', 'firstName lastName username')
      .lean();

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Exam result not found or not visible'
      });
    }

    // Record view access
    try {
      const ResultModel = mongoose.model('Result');
      const resultDoc = new ResultModel(result);
      await resultDoc.recordParentAccess(
        req.user.id,
        'viewed',
        req.ip,
        req.headers['user-agent']
      );
    } catch (accessError) {
      console.warn('⚠️ Error recording view access:', accessError.message);
    }

    // Get detailed analysis
    const correctAnswers = result.correctness ? 
      Array.from(result.correctness.values()).filter(Boolean).length : 0;
    const accuracy = result.totalQuestions > 0 ? 
      (correctAnswers / result.totalQuestions) * 100 : 0;

    res.json({
      success: true,
      result: {
        id: result._id,
        testTitle: result.testId?.title || 'Test',
        subject: result.subject,
        session: result.session,
        term: result.term,
        student: result.userId,
        class: result.class,
        answers: result.answers ? Object.fromEntries(result.answers) : {},
        correctness: result.correctness ? Object.fromEntries(result.correctness) : {},
        score: result.score,
        totalMarks: result.totalMarks,
        totalQuestions: result.totalQuestions,
        percentage: result.percentage,
        grade: result.grade,
        position: result.position,
        timeSpent: result.timeSpent,
        ipAddress: result.ipAddress,
        submittedAt: result.submittedAt,
        reviewedBy: result.reviewedBy,
        reviewedAt: result.reviewedAt,
        remarks: result.remarks,
        isVisibleToParent: result.isVisibleToParent,
        scheduledVisibility: result.scheduledVisibility,
        updatedBy: result.updatedBy,
        updatedAt: result.updatedAt,
        analysis: {
          correctAnswers,
          incorrectAnswers: result.totalQuestions - correctAnswers,
          accuracy: Math.round(accuracy * 100) / 100,
          performanceLevel: getPerformanceLevel(result.percentage || 0),
          recommendation: getSubjectRecommendation(result.percentage || 0, 'Stable')
        }
      }
    });
  } catch (err) {
    console.error('❌ GET /parents/children/:studentId/results/:resultId error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exam result details',
      error: err.message
    });
  }
});

// Add a new endpoint for downloading report cards with visibility check
router.get('/children/:studentId/results/:resultId/download', auth, parentAccessToStudent, async (req, res) => {
  try {
    const { studentId, resultId } = req.params;
    
    console.log('📥 GET /api/parents/children/:studentId/results/:resultId/download - Parent downloading result:', {
      parentId: req.user.id,
      studentId,
      resultId
    });

    // Check if result is visible
    const result = await Result.findOne({
      _id: resultId,
      userId: studentId,
      isActive: true,
      isVisibleToParent: true,
      $or: [
        { scheduledVisibility: null },
        { scheduledVisibility: { $lte: new Date() } }
      ]
    })
      .populate('userId', 'firstName lastName studentId className')
      .populate('class', 'name shortName level')
      .populate('testId', 'title type totalMarks')
      .lean();

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found or not visible'
      });
    }

    // Record download access
    try {
      const ResultModel = mongoose.model('Result');
      const resultDoc = new ResultModel(result);
      await resultDoc.recordParentAccess(
        req.user.id,
        'downloaded',
        req.ip,
        req.headers['user-agent']
      );
    } catch (accessError) {
      console.warn('⚠️ Error recording download access:', accessError.message);
    }

    // Generate PDF report card
    // This would use your existing PDF generation logic from reportcards.js
    // For now, return success response
    res.json({
      success: true,
      message: 'Report card download initiated',
      downloadInfo: {
        resultId: result._id,
        student: result.userId,
        subject: result.subject,
        session: result.session,
        term: result.term,
        downloadTime: new Date(),
        downloadCount: result.reportCardDownloads?.length || 0
      }
    });

  } catch (err) {
    console.error('❌ GET /parents/children/:studentId/results/:resultId/download error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to download report card',
      error: err.message
    });
  }
});

// Add endpoint to get download history
router.get('/children/:studentId/download-history', auth, parentAccessToStudent, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    console.log('📋 GET /api/parents/children/:studentId/download-history - Parent fetching download history:', {
      parentId: req.user.id,
      studentId
    });

    const skip = (page - 1) * limit;

    // Get download access records for this parent and student
    const [downloads, total] = await Promise.all([
      ReportCardAccess.find({
        studentId,
        parentId: req.user.id,
        accessType: 'downloaded'
      })
        .populate('resultId', 'subject session term score percentage grade')
        .sort({ accessedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ReportCardAccess.countDocuments({
        studentId,
        parentId: req.user.id,
        accessType: 'downloaded'
      })
    ]);

    // Get result download counts from Result model
    const resultsWithDownloads = await Result.find({
      userId: studentId,
      'reportCardDownloads.parentId': req.user.id
    })
      .select('subject session term score percentage grade reportCardDownloads')
      .lean();

    const formattedDownloads = downloads.map(download => {
      const result = download.resultId || {};
      return {
        id: download._id,
        resultId: result._id,
        subject: result.subject,
        session: result.session,
        term: result.term,
        score: result.score,
        percentage: result.percentage,
        grade: result.grade,
        downloadedAt: download.accessedAt,
        ipAddress: download.ipAddress
      };
    });

    const downloadStats = resultsWithDownloads.map(result => ({
      subject: result.subject,
      session: result.session,
      term: result.term,
      downloadCount: result.reportCardDownloads?.find(d => d.parentId?.toString() === req.user.id)?.downloadCount || 0,
      lastDownloaded: result.reportCardDownloads?.find(d => d.parentId?.toString() === req.user.id)?.downloadedAt
    }));

    res.json({
      success: true,
      downloads: formattedDownloads,
      stats: {
        totalDownloads: total,
        bySubject: downloadStats.reduce((acc, stat) => {
          acc[stat.subject] = (acc[stat.subject] || 0) + stat.downloadCount;
          return acc;
        }, {}),
        byTerm: downloadStats.reduce((acc, stat) => {
          const key = `${stat.session} - ${stat.term}`;
          acc[key] = (acc[key] || 0) + stat.downloadCount;
          return acc;
        }, {})
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalDownloads: total,
        limit: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('❌ GET /parents/children/:studentId/download-history error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch download history',
      error: err.message
    });
  }
});

// Get results summary for dashboard
router.get('/children/:studentId/results-summary', auth, parentAccessToStudent, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    console.log('📈 GET /api/parents/children/:studentId/results-summary - Parent fetching results summary:', {
      parentId: req.user.id,
      studentId
    });

    // Get all visible results for this student
    const allResults = await Result.find({
      userId: studentId,
      isActive: true,
      isVisibleToParent: true,
      $or: [
        { scheduledVisibility: null },
        { scheduledVisibility: { $lte: new Date() } }
      ]
    })
      .select('subject session term score totalMarks percentage grade submittedAt')
      .sort({ submittedAt: 1 })
      .lean();

    if (allResults.length === 0) {
      return res.json({
        success: true,
        studentId,
        summary: {
          totalExams: 0,
          message: 'No exam results available yet'
        }
      });
    }

    // Calculate performance trends
    const performanceByTerm = {};
    const performanceByYear = {};
    const performanceBySubject = {};
    
    allResults.forEach(result => {
      // By term
      const termKey = `${result.session || 'Unknown'} - ${result.term || 'Unknown Term'}`;
      if (!performanceByTerm[termKey]) {
        performanceByTerm[termKey] = [];
      }
      performanceByTerm[termKey].push(result);
      
      // Extract year from session
      const yearMatch = result.session?.match(/\d{4}/);
      if (yearMatch) {
        const year = yearMatch[0];
        if (!performanceByYear[year]) {
          performanceByYear[year] = [];
        }
        performanceByYear[year].push(result);
      }
      
      // By subject
      if (!performanceBySubject[result.subject]) {
        performanceBySubject[result.subject] = [];
      }
      performanceBySubject[result.subject].push(result);
    });

    // Calculate averages
    const gradePoints = { 'A+': 5.5, 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, 'F': 0 };
    
    let totalGradePoints = 0;
    let totalPercentage = 0;
    let validGrades = 0;
    
    allResults.forEach(result => {
      if (result.grade && gradePoints[result.grade] !== undefined) {
        totalGradePoints += gradePoints[result.grade];
        validGrades++;
      }
      if (result.percentage) {
        totalPercentage += result.percentage;
      }
    });

    const averageGradePoint = validGrades > 0 ? totalGradePoints / validGrades : 0;
    const averagePercentage = allResults.length > 0 ? totalPercentage / allResults.length : 0;

    // Determine average grade
    let averageGrade = 'N/A';
    if (averageGradePoint >= 5.0) averageGrade = 'A+';
    else if (averageGradePoint >= 4.5) averageGrade = 'A';
    else if (averageGradePoint >= 3.5) averageGrade = 'B';
    else if (averageGradePoint >= 2.5) averageGrade = 'C';
    else if (averageGradePoint >= 1.5) averageGrade = 'D';
    else if (averageGradePoint >= 0.5) averageGrade = 'E';
    else if (averageGradePoint > 0) averageGrade = 'F';

    // Get latest result
    const latestResult = allResults[allResults.length - 1];

    // Find best and worst results by percentage
    const bestResult = allResults.reduce((best, current) => {
      if (!best) return current;
      return current.percentage > best.percentage ? current : best;
    }, null);

    const worstResult = allResults.reduce((worst, current) => {
      if (!worst) return current;
      return current.percentage < worst.percentage ? current : worst;
    }, null);

    // Calculate subject averages
    const subjectAverages = Object.entries(performanceBySubject).map(([subject, results]) => {
      const subjectTotal = results.reduce((sum, result) => sum + (result.percentage || 0), 0);
      const subjectAverage = results.length > 0 ? subjectTotal / results.length : 0;
      
      return {
        subject,
        averagePercentage: Math.round(subjectAverage * 100) / 100,
        examCount: results.length,
        performanceLevel: getPerformanceLevel(subjectAverage)
      };
    }).sort((a, b) => b.averagePercentage - a.averagePercentage);

    res.json({
      success: true,
      studentId,
      summary: {
        totalExams: allResults.length,
        averageGrade,
        averageGradePoint: averageGradePoint.toFixed(2),
        averagePercentage: averagePercentage.toFixed(1),
        performanceLevel: getPerformanceLevel(averagePercentage),
        latestResult: latestResult ? {
          subject: latestResult.subject,
          session: latestResult.session,
          term: latestResult.term,
          score: latestResult.score,
          totalMarks: latestResult.totalMarks,
          percentage: latestResult.percentage,
          grade: latestResult.grade,
          submittedAt: latestResult.submittedAt
        } : null,
        bestResult: bestResult ? {
          subject: bestResult.subject,
          session: bestResult.session,
          term: bestResult.term,
          score: bestResult.score,
          totalMarks: bestResult.totalMarks,
          percentage: bestResult.percentage,
          grade: bestResult.grade
        } : null,
        worstResult: worstResult ? {
          subject: worstResult.subject,
          session: worstResult.session,
          term: worstResult.term,
          score: worstResult.score,
          totalMarks: worstResult.totalMarks,
          percentage: worstResult.percentage,
          grade: worstResult.grade
        } : null,
        subjectAverages,
        performanceByTerm: Object.keys(performanceByTerm).map(term => ({
          term,
          exams: performanceByTerm[term].length,
          averageGrade: calculateAverageGrade(performanceByTerm[term]),
          averagePercentage: performanceByTerm[term].reduce((sum, result) => sum + (result.percentage || 0), 0) / performanceByTerm[term].length
        })),
        performanceByYear: Object.keys(performanceByYear).map(year => ({
          year,
          exams: performanceByYear[year].length,
          averageGrade: calculateAverageGrade(performanceByYear[year]),
          averagePercentage: performanceByYear[year].reduce((sum, result) => sum + (result.percentage || 0), 0) / performanceByYear[year].length
        }))
      }
    });
  } catch (err) {
    console.error('❌ GET /parents/children/:studentId/results-summary error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch results summary',
      error: err.message
    });
  }
});

// ============================================================
// PARENT SPECIFIC RESULTS VISIBILITY ENDPOINTS
// ============================================================

// Get all visible results summary for parent dashboard
router.get('/visible-results/summary', auth, parentOnly, async (req, res) => {
  try {
    console.log('📊 GET /api/parents/visible-results/summary - Fetching visible results summary for parent:', req.user.id);
    
    const parent = await User.findById(req.user.id)
      .select('children')
      .populate({
        path: 'children',
        select: '_id firstName lastName studentId className',
        match: { active: true }
      })
      .lean();

    const children = parent.children || [];
    const childIds = children.map(child => child._id);

    if (childIds.length === 0) {
      return res.json({
        success: true,
        summary: {
          totalVisibleResults: 0,
          childrenWithResults: 0,
          latestResults: [],
          message: 'No children linked to your account'
        }
      });
    }

    // Get all visible results for all children
    const visibleResults = await Result.find({
      userId: { $in: childIds },
      isActive: true,
      isVisibleToParent: true,
      $or: [
        { scheduledVisibility: null },
        { scheduledVisibility: { $lte: new Date() } }
      ]
    })
      .select('subject session term score totalMarks percentage grade submittedAt userId')
      .populate('userId', 'firstName lastName studentId className')
      .sort({ submittedAt: -1 })
      .lean();

    // Group results by child
    const resultsByChild = {};
    const latestResults = [];
    
    children.forEach(child => {
      resultsByChild[child._id] = {
        child: {
          id: child._id,
          name: `${child.firstName} ${child.lastName}`,
          studentId: child.studentId,
          className: child.className
        },
        results: [],
        totalVisible: 0,
        latestResult: null
      };
    });

    // Process results
    visibleResults.forEach(result => {
      const childId = result.userId?._id?.toString();
      if (childId && resultsByChild[childId]) {
        resultsByChild[childId].results.push(result);
        resultsByChild[childId].totalVisible++;
        
        // Track latest result
        if (!resultsByChild[childId].latestResult || 
            new Date(result.submittedAt) > new Date(resultsByChild[childId].latestResult.submittedAt)) {
          resultsByChild[childId].latestResult = result;
          
          // Add to global latest results
          if (latestResults.length < 5) {
            latestResults.push({
              childName: `${result.userId.firstName} ${result.userId.lastName}`,
              subject: result.subject,
              session: result.session,
              term: result.term,
              grade: result.grade,
              percentage: result.percentage,
              submittedAt: result.submittedAt
            });
          }
        }
      }
    });

    // Convert to array and filter children with results
    const childrenWithResults = Object.values(resultsByChild)
      .filter(childData => childData.totalVisible > 0)
      .map(childData => ({
        ...childData,
        results: childData.results.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      }));

    const totalVisibleResults = visibleResults.length;
    const childrenWithResultsCount = childrenWithResults.length;

    res.json({
      success: true,
      summary: {
        totalVisibleResults,
        totalChildren: children.length,
        childrenWithResults: childrenWithResultsCount,
        childrenWithoutResults: children.length - childrenWithResultsCount,
        latestResults: latestResults.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)),
        childrenWithResults: childrenWithResults.map(child => ({
          childId: child.child.id,
          childName: child.child.name,
          studentId: child.child.studentId,
          totalVisibleResults: child.totalVisible,
          latestResult: child.latestResult ? {
            subject: child.latestResult.subject,
            session: child.latestResult.session,
            term: child.latestResult.term,
            grade: child.latestResult.grade,
            percentage: child.latestResult.percentage,
            submittedAt: child.latestResult.submittedAt
          } : null,
          averageGrade: calculateAverageGrade(child.results)
        }))
      }
    });

  } catch (err) {
    console.error('❌ GET /parents/visible-results/summary error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch visible results summary',
      error: err.message
    });
  }
});

// Get detailed subject performance for a child
router.get('/children/:studentId/subject-performance', auth, parentAccessToStudent, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    console.log('📈 GET /api/parents/children/:studentId/subject-performance - Fetching subject performance:', {
      parentId: req.user.id,
      studentId
    });

    // Get all visible results for this student
    const results = await Result.find({
      userId: studentId,
      isActive: true,
      isVisibleToParent: true,
      $or: [
        { scheduledVisibility: null },
        { scheduledVisibility: { $lte: new Date() } }
      ]
    })
      .select('subject session term score totalMarks percentage grade submittedAt')
      .sort({ submittedAt: 1 })
      .lean();

    if (results.length === 0) {
      return res.json({
        success: true,
        studentId,
        subjectPerformance: [],
        summary: {
          totalResults: 0,
          message: 'No visible results available for this student'
        }
      });
    }

    // Calculate subject performance
    const subjectPerformance = {};
    const examHistory = [];
    
    results.forEach(result => {
      // Track exam history
      examHistory.push({
        subject: result.subject,
        session: result.session,
        term: result.term,
        grade: result.grade,
        percentage: result.percentage,
        submittedAt: result.submittedAt
      });
      
      // Process subjects
      const subjectName = result.subject || 'Unknown Subject';
      
      if (!subjectPerformance[subjectName]) {
        subjectPerformance[subjectName] = {
          subjectName,
          totalScore: 0,
          totalMarks: 0,
          examsCount: 0,
          grades: [],
          scores: [],
          performanceTrend: []
        };
      }
      
      subjectPerformance[subjectName].totalScore += result.score || 0;
      subjectPerformance[subjectName].totalMarks += result.totalMarks || 0;
      subjectPerformance[subjectName].examsCount++;
      subjectPerformance[subjectName].grades.push(result.grade);
      subjectPerformance[subjectName].scores.push({
        score: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        session: result.session,
        term: result.term
      });
      
      // Add to performance trend
      subjectPerformance[subjectName].performanceTrend.push({
        session: result.session,
        term: result.term,
        score: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        grade: result.grade
      });
    });

    // Convert to array and calculate averages
    const subjectPerformanceArray = Object.values(subjectPerformance).map(subject => {
      const averageScore = subject.examsCount > 0 ? 
        Math.round(subject.totalScore / subject.examsCount) : 0;
      const averageMarks = subject.examsCount > 0 ? 
        Math.round(subject.totalMarks / subject.examsCount) : 0;
      const averagePercentage = averageMarks > 0 ? 
        Math.round((averageScore / averageMarks) * 100) : 0;
      
      // Calculate most common grade
      const gradeFrequency = {};
      subject.grades.forEach(grade => {
        if (grade && grade !== 'N/A') {
          gradeFrequency[grade] = (gradeFrequency[grade] || 0) + 1;
        }
      });
      
      let mostCommonGrade = 'N/A';
      let maxFrequency = 0;
      Object.entries(gradeFrequency).forEach(([grade, freq]) => {
        if (freq > maxFrequency) {
          mostCommonGrade = grade;
          maxFrequency = freq;
        }
      });
      
      // Calculate grade improvement
      let improvement = 'Stable';
      if (subject.scores.length >= 2) {
        const firstScore = subject.scores[0];
        const lastScore = subject.scores[subject.scores.length - 1];
        const firstPercentage = firstScore.percentage || 0;
        const lastPercentage = lastScore.percentage || 0;
        
        if (lastPercentage > firstPercentage + 5) improvement = 'Improving';
        else if (lastPercentage < firstPercentage - 5) improvement = 'Declining';
      }
      
      return {
        ...subject,
        averageScore,
        averageMarks,
        averagePercentage,
        mostCommonGrade,
        improvement,
        overallPerformance: getPerformanceLevel(averagePercentage),
        scores: subject.scores.sort((a, b) => {
          // Sort by session, then term
          if (a.session !== b.session) return a.session.localeCompare(b.session);
          return a.term.localeCompare(b.term);
        }),
        performanceTrend: subject.performanceTrend.sort((a, b) => {
          // Sort by session, then term
          if (a.session !== b.session) return a.session.localeCompare(b.session);
          return a.term.localeCompare(b.term);
        })
      };
    });

    // Sort subjects by average percentage (highest first)
    subjectPerformanceArray.sort((a, b) => b.averagePercentage - a.averagePercentage);

    // Calculate overall statistics
    const totalExams = results.length;
    const totalSubjects = subjectPerformanceArray.length;
    const overallAveragePercentage = subjectPerformanceArray.length > 0 ?
      Math.round(subjectPerformanceArray.reduce((sum, sub) => sum + sub.averagePercentage, 0) / subjectPerformanceArray.length) : 0;

    res.json({
      success: true,
      studentId,
      subjectPerformance: subjectPerformanceArray,
      examHistory: examHistory.sort((a, b) => {
        // Sort by submitted date
        return new Date(a.submittedAt) - new Date(b.submittedAt);
      }),
      summary: {
        totalExams,
        totalSubjects,
        overallAveragePercentage,
        performanceLevel: getPerformanceLevel(overallAveragePercentage),
        bestSubject: subjectPerformanceArray.length > 0 ? subjectPerformanceArray[0] : null,
        needsImprovement: subjectPerformanceArray.filter(sub => sub.averagePercentage < 50).map(sub => ({
          subjectName: sub.subjectName,
          averagePercentage: sub.averagePercentage
        })),
        strongSubjects: subjectPerformanceArray.filter(sub => sub.averagePercentage >= 75).map(sub => ({
          subjectName: sub.subjectName,
          averagePercentage: sub.averagePercentage
        }))
      }
    });
  } catch (err) {
    console.error('❌ GET /parents/children/:studentId/subject-performance error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subject performance',
      error: err.message
    });
  }
});

// Get visibility status for a specific child's results
router.get('/children/:studentId/visibility-status', auth, parentAccessToStudent, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    console.log('👁️ GET /api/parents/children/:studentId/visibility-status - Checking result visibility:', {
      parentId: req.user.id,
      studentId
    });

    // Get child details
    const child = await User.findById(studentId)
      .select('firstName lastName studentId className class')
      .populate('class', 'name shortName level')
      .lean();

    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Child not found'
      });
    }

    // Count all results vs visible results
    const [totalResults, visibleResults, scheduledResults] = await Promise.all([
      Result.countDocuments({ 
        userId: studentId, 
        isActive: true 
      }),
      Result.countDocuments({ 
        userId: studentId, 
        isActive: true,
        isVisibleToParent: true,
        $or: [
          { scheduledVisibility: null },
          { scheduledVisibility: { $lte: new Date() } }
        ]
      }),
      Result.countDocuments({ 
        userId: studentId, 
        isActive: true,
        scheduledVisibility: { $ne: null },
        isVisibleToParent: false
      })
    ]);

    // Get the latest visible result
    const latestVisibleResult = await Result.findOne({
      userId: studentId,
      isActive: true,
      isVisibleToParent: true,
      $or: [
        { scheduledVisibility: null },
        { scheduledVisibility: { $lte: new Date() } }
      ]
    })
      .select('subject session term score totalMarks percentage grade submittedAt')
      .sort({ submittedAt: -1 })
      .lean();

    // Get upcoming scheduled results
    const upcomingScheduledResults = await Result.find({
      userId: studentId,
      isActive: true,
      scheduledVisibility: { $ne: null, $gte: new Date() },
      isVisibleToParent: false
    })
      .select('subject session term scheduledVisibility')
      .sort({ scheduledVisibility: 1 })
      .limit(5)
      .lean();

    const visibilityPercentage = totalResults > 0 ? 
      Math.round((visibleResults / totalResults) * 100) : 0;

    res.json({
      success: true,
      child: {
        id: child._id,
        name: `${child.firstName} ${child.lastName}`,
        studentId: child.studentId,
        className: child.className || child.class?.name || 'No Class'
      },
      visibility: {
        totalResults,
        visibleResults,
        hiddenResults: totalResults - visibleResults - scheduledResults,
        scheduledResults,
        visibilityPercentage,
        latestVisibleResult: latestVisibleResult ? {
          subject: latestVisibleResult.subject,
          session: latestVisibleResult.session,
          term: latestVisibleResult.term,
          grade: latestVisibleResult.grade,
          percentage: latestVisibleResult.percentage,
          submittedAt: latestVisibleResult.submittedAt,
          daysAgo: Math.floor((new Date() - new Date(latestVisibleResult.submittedAt)) / (1000 * 60 * 60 * 24))
        } : null,
        upcomingScheduledResults: upcomingScheduledResults.map(result => ({
          subject: result.subject,
          session: result.session,
          term: result.term,
          scheduledFor: result.scheduledVisibility,
          daysUntil: Math.ceil((new Date(result.scheduledVisibility) - new Date()) / (1000 * 60 * 60 * 24))
        })),
        message: getVisibilityMessage(visibilityPercentage, totalResults)
      }
    });
  } catch (err) {
    console.error('❌ GET /parents/children/:studentId/visibility-status error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch visibility status',
      error: err.message
    });
  }
});

// Get specific subject results over time for graphing
router.get('/children/:studentId/subject/:subjectName/results-timeline', auth, parentAccessToStudent, async (req, res) => {
  try {
    const { studentId, subjectName } = req.params;
    
    console.log('📈 GET /api/parents/children/:studentId/subject/:subjectName/results-timeline - Fetching subject timeline:', {
      parentId: req.user.id,
      studentId,
      subjectName
    });

    // URL decode subject name
    const decodedSubjectName = decodeURIComponent(subjectName);
    
    // Get all visible results for this student and subject
    const results = await Result.find({
      userId: studentId,
      subject: decodedSubjectName,
      isActive: true,
      isVisibleToParent: true,
      $or: [
        { scheduledVisibility: null },
        { scheduledVisibility: { $lte: new Date() } }
      ]
    })
      .select('session term score totalMarks percentage grade submittedAt')
      .sort({ submittedAt: 1 })
      .lean();

    if (results.length === 0) {
      return res.json({
        success: true,
        studentId,
        subjectName: decodedSubjectName,
        timeline: [],
        message: 'No visible results found for this subject'
      });
    }

    // Create timeline data
    const timeline = results.map(result => ({
      session: result.session,
      term: result.term,
      score: result.score || 0,
      totalMarks: result.totalMarks || 100,
      grade: result.grade || 'N/A',
      percentage: result.percentage || 0,
      submittedAt: result.submittedAt,
      termLabel: `${result.session} - ${result.term}`
    }));

    // Calculate statistics
    const scores = timeline.map(item => item.score);
    const percentages = timeline.map(item => item.percentage);
    const averageScore = scores.length > 0 ? 
      Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
    const averagePercentage = percentages.length > 0 ? 
      Math.round(percentages.reduce((sum, perc) => sum + perc, 0) / percentages.length) : 0;
    
    // Calculate trend
    let trend = 'Stable';
    if (timeline.length >= 2) {
      const firstScore = timeline[0].score;
      const lastScore = timeline[timeline.length - 1].score;
      const diff = lastScore - firstScore;
      const percentageDiff = firstScore > 0 ? (diff / firstScore) * 100 : 0;
      
      if (percentageDiff > 10) trend = 'Improving';
      else if (percentageDiff < -10) trend = 'Declining';
    }

    // Get best and worst performances
    const bestResult = timeline.reduce((best, current) => 
      current.percentage > best.percentage ? current : best, timeline[0] || { percentage: 0 });
    
    const worstResult = timeline.reduce((worst, current) => 
      current.percentage < worst.percentage ? current : worst, timeline[0] || { percentage: 100 });

    res.json({
      success: true,
      studentId,
      subjectName: decodedSubjectName,
      timeline,
      statistics: {
        totalExams: timeline.length,
        averageScore,
        averagePercentage,
        trend,
        bestResult: {
          score: bestResult.score,
          percentage: bestResult.percentage,
          grade: bestResult.grade,
          termLabel: bestResult.termLabel
        },
        worstResult: {
          score: worstResult.score,
          percentage: worstResult.percentage,
          grade: worstResult.grade,
          termLabel: worstResult.termLabel
        },
        performanceLevel: getPerformanceLevel(averagePercentage),
        recommendation: getSubjectRecommendation(averagePercentage, trend)
      }
    });
  } catch (err) {
    console.error('❌ GET /parents/children/:studentId/subject/:subjectName/results-timeline error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subject timeline',
      error: err.message
    });
  }
});

// ============================================================
// CHECK IF SPECIFIC RESULT IS VISIBLE TO PARENT
// ============================================================

// Check visibility of a specific result
router.get('/children/:studentId/results/:resultId/check-visibility', auth, parentAccessToStudent, async (req, res) => {
  try {
    const { studentId, resultId } = req.params;
    
    console.log('👁️ GET /api/parents/children/:studentId/results/:resultId/check-visibility - Checking result visibility:', {
      parentId: req.user.id,
      studentId,
      resultId
    });

    const result = await Result.findOne({
      _id: resultId,
      userId: studentId,
      isActive: true
    })
      .select('isVisibleToParent scheduledVisibility submittedAt reviewedBy updatedBy')
      .populate('reviewedBy', 'firstName lastName username')
      .populate('updatedBy', 'firstName lastName username')
      .lean();

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    const isVisible = result.isVisibleToParent === true;
    const isScheduled = result.scheduledVisibility && new Date(result.scheduledVisibility) > new Date();
    const scheduledDate = result.scheduledVisibility;
    const canView = isVisible && !isScheduled;

    res.json({
      success: true,
      visibility: {
        isVisible,
        isScheduled,
        scheduledDate,
        canView,
        submittedAt: result.submittedAt,
        reviewedBy: result.reviewedBy,
        updatedBy: result.updatedBy,
        message: canView 
          ? 'This result is visible to parents.'
          : isScheduled
            ? `This result will be visible on ${new Date(scheduledDate).toLocaleDateString()}`
            : 'This result is not currently visible to parents.'
      }
    });
  } catch (err) {
    console.error('❌ GET /parents/children/:studentId/results/:resultId/check-visibility error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to check result visibility',
      error: err.message
    });
  }
});

// ============================================================
// GET UPCOMING RESULT RELEASES
// ============================================================

// Get scheduled result releases for a child
router.get('/children/:studentId/upcoming-releases', auth, parentAccessToStudent, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    console.log('📅 GET /api/parents/children/:studentId/upcoming-releases - Fetching upcoming result releases:', {
      parentId: req.user.id,
      studentId
    });

    const now = new Date();
    const oneMonthFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    const scheduledResults = await Result.find({
      userId: studentId,
      isActive: true,
      scheduledVisibility: { $gte: now, $lte: oneMonthFromNow },
      isVisibleToParent: false
    })
      .select('subject session term scheduledVisibility')
      .sort({ scheduledVisibility: 1 })
      .lean();

    const upcomingReleases = scheduledResults.map(result => ({
      subject: result.subject,
      session: result.session,
      term: result.term,
      scheduledDate: result.scheduledVisibility,
      daysUntil: Math.ceil((new Date(result.scheduledVisibility) - now) / (1000 * 60 * 60 * 24)),
      formattedDate: formatDate(result.scheduledVisibility)
    }));

    res.json({
      success: true,
      studentId,
      upcomingReleases,
      summary: {
        totalUpcoming: upcomingReleases.length,
        nextRelease: upcomingReleases.length > 0 ? upcomingReleases[0] : null,
        releasesThisWeek: upcomingReleases.filter(r => r.daysUntil <= 7).length,
        releasesThisMonth: upcomingReleases.filter(r => r.daysUntil <= 30).length
      }
    });
  } catch (err) {
    console.error('❌ GET /parents/children/:studentId/upcoming-releases error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming releases',
      error: err.message
    });
  }
});

// ============================================================
// PARENT FEEDBACK ENDPOINTS
// ============================================================

// Submit feedback
router.post('/feedback', auth, parentOnly, async (req, res) => {
  try {
    const { title, message, feedbackType, studentId, priority = 'medium' } = req.body;
    
    console.log('💬 POST /api/parents/feedback - Parent submitting feedback:', {
      parentId: req.user.id,
      studentId,
      feedbackType,
      priority
    });

    // Validate input
    if (!title || !message || !feedbackType) {
      return res.status(400).json({
        success: false,
        message: 'Title, message, and feedback type are required'
      });
    }

    // Validate feedback type
    const validFeedbackTypes = ['academic', 'behavior', 'facility', 'general', 'suggestion', 'complaint'];
    if (!validFeedbackTypes.includes(feedbackType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid feedback type. Must be one of: ${validFeedbackTypes.join(', ')}`
      });
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
      });
    }

    // If studentId is provided, verify the parent has access to this student
    if (studentId) {
      const parent = await User.findById(req.user.id).select('children').lean();
      const hasAccess = parent.children?.some(child => 
        child.toString() === studentId.toString()
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this student'
        });
      }
    }

    // Check rate limiting
    const recentFeedbackCount = await ParentFeedback.countDocuments({
      parentId: req.user.id,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    const maxDailyFeedback = process.env.MAX_DAILY_PARENT_FEEDBACK || 10;
    if (recentFeedbackCount >= maxDailyFeedback) {
      return res.status(429).json({
        success: false,
        message: `Too many feedback submissions. Limit is ${maxDailyFeedback} per day.`
      });
    }

    // Create feedback
    const feedback = new ParentFeedback({
      parentId: req.user.id,
      studentId: studentId || null,
      title,
      message,
      feedbackType,
      priority,
      status: 'submitted'
    });

    await feedback.save();

    console.log('✅ Feedback submitted:', {
      feedbackId: feedback._id,
      parent: req.user.username,
      type: feedbackType
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: {
        id: feedback._id,
        title: feedback.title,
        feedbackType: feedback.feedbackType,
        priority: feedback.priority,
        status: feedback.status,
        submittedAt: feedback.createdAt,
        referenceNumber: `FB-${feedback._id.toString().slice(-8).toUpperCase()}`
      }
    });
  } catch (err) {
    console.error('❌ POST /parents/feedback error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: err.message
    });
  }
});

// Get all feedback submitted by parent
router.get('/feedback', auth, parentOnly, async (req, res) => {
  try {
    const { status, feedbackType, page = 1, limit = 10 } = req.query;
    
    console.log('💬 GET /api/parents/feedback - Parent fetching feedback:', {
      parentId: req.user.id,
      status,
      feedbackType
    });

    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = { parentId: req.user.id };
    if (status) filter.status = status;
    if (feedbackType) filter.feedbackType = feedbackType;

    // Get feedback with pagination
    const feedback = await ParentFeedback.find(filter)
      .select('title message feedbackType priority status response responseRead createdAt updatedAt')
      .populate('studentId', 'firstName lastName studentId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalFeedback = await ParentFeedback.countDocuments(filter);
    const totalPages = Math.ceil(totalFeedback / limit);

    // Count by status
    const statusCounts = await ParentFeedback.aggregate([
      { $match: { parentId: new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Count by type
    const typeCounts = await ParentFeedback.aggregate([
      { $match: { parentId: new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: '$feedbackType', count: { $sum: 1 } } }
    ]);

    // Count unread responses
    const unreadResponses = await ParentFeedback.countDocuments({
      parentId: req.user.id,
      hasResponse: true,
      responseRead: false
    });

    res.json({
      success: true,
      feedback,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalFeedback,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      statistics: {
        total: totalFeedback,
        byStatus: statusCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byType: typeCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        unreadResponses
      }
    });
  } catch (err) {
    console.error('❌ GET /parents/feedback error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
      error: err.message
    });
  }
});

// Get specific feedback details
router.get('/feedback/:feedbackId', auth, parentOnly, async (req, res) => {
  try {
    const { feedbackId } = req.params;
    
    console.log('💬 GET /api/parents/feedback/:feedbackId - Parent fetching feedback details:', {
      parentId: req.user.id,
      feedbackId
    });

    const feedback = await ParentFeedback.findOne({
      _id: feedbackId,
      parentId: req.user.id
    })
      .populate('studentId', 'firstName lastName studentId className')
      .populate('respondedBy', 'firstName lastName username role')
      .lean();

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Mark as read if there's a response
    if (feedback.hasResponse && !feedback.responseRead) {
      await ParentFeedback.findByIdAndUpdate(feedbackId, {
        responseRead: true
      });
      feedback.responseRead = true;
    }

    res.json({
      success: true,
      feedback: {
        id: feedback._id,
        title: feedback.title,
        message: feedback.message,
        feedbackType: feedback.feedbackType,
        priority: feedback.priority,
        status: feedback.status,
        student: feedback.studentId,
        submittedAt: feedback.createdAt,
        response: feedback.response,
        respondedBy: feedback.respondedBy,
        respondedAt: feedback.updatedAt,
        hasResponse: feedback.hasResponse,
        responseRead: feedback.responseRead,
        referenceNumber: `FB-${feedback._id.toString().slice(-8).toUpperCase()}`
      }
    });
  } catch (err) {
    console.error('❌ GET /parents/feedback/:feedbackId error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback details',
      error: err.message
    });
  }
});

// Mark all responses as read
router.post('/feedback/mark-all-read', auth, parentOnly, async (req, res) => {
  try {
    console.log('👁️ POST /api/parents/feedback/mark-all-read - Marking all responses as read:', req.user.id);

    const result = await ParentFeedback.updateMany(
      {
        parentId: req.user.id,
        hasResponse: true,
        responseRead: false
      },
      {
        responseRead: true
      }
    );

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} responses as read`
    });
  } catch (err) {
    console.error('❌ POST /parents/feedback/mark-all-read error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to mark responses as read',
      error: err.message
    });
  }
});

// ============================================================
// UPCOMING TESTS ENDPOINTS FOR PARENTS
// ============================================================

// Get upcoming tests count for dashboard (UPDATED VERSION)
router.get('/upcoming-tests/count', auth, parentOnly, async (req, res) => {
  try {
    console.log('📅 GET /api/parents/upcoming-tests/count - Parent fetching upcoming tests count:', req.user.id);

    const parent = await User.findById(req.user.id)
      .select('children')
      .populate({
        path: 'children',
        select: '_id firstName lastName studentId',
        match: { isActive: true }
      })
      .lean();

    const children = parent.children || [];
    const childIds = children.map(child => child._id);

    if (childIds.length === 0) {
      return res.json({
        success: true,
        count: 0,
        byChild: {},
        message: 'No children linked to your account'
      });
    }

    const now = new Date();
    const oneMonthFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    // Get all upcoming tests for these children
    const upcomingTests = await Test.find({
      status: { $in: ['scheduled', 'active'] },
      'batches.students': { $in: childIds },
      'batches.schedule.start': { $gte: now, $lte: oneMonthFromNow },
      'batches.isActive': true
    })
    .select('title subject batches')
    .lean();

    // Count tests per child
    const testsByChild = {};
    children.forEach(child => {
      testsByChild[child._id] = {
        childId: child._id,
        childName: `${child.firstName} ${child.lastName}`,
        studentId: child.studentId,
        count: 0,
        tests: []
      };
    });

    // Process each test
    upcomingTests.forEach(test => {
      test.batches.forEach(batch => {
        if (!batch.students || batch.students.length === 0) return;
        
        batch.students.forEach(studentId => {
          if (testsByChild[studentId]) {
            testsByChild[studentId].count++;
            testsByChild[studentId].tests.push({
              testId: test._id,
              title: test.title,
              subject: test.subject,
              batchName: batch.name,
              startDate: batch.schedule.start,
              endDate: batch.schedule.end
            });
          }
        });
      });
    });

    // Convert to array and sort by count
    const childTestsArray = Object.values(testsByChild)
      .map(child => ({
        ...child,
        tests: child.tests.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      }))
      .sort((a, b) => b.count - a.count);

    const totalTests = childTestsArray.reduce((sum, child) => sum + child.count, 0);

    // Get test subjects breakdown
    const subjectsCount = {};
    childTestsArray.forEach(child => {
      child.tests.forEach(test => {
        subjectsCount[test.subject] = (subjectsCount[test.subject] || 0) + 1;
      });
    });

    // Get upcoming tests in next 7 days
    const nextWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    const upcomingThisWeek = childTestsArray.reduce((count, child) => {
      const weekTests = child.tests.filter(test => 
        new Date(test.startDate) <= nextWeek
      );
      return count + weekTests.length;
    }, 0);

    res.json({
      success: true,
      count: totalTests,
      upcomingThisWeek: upcomingThisWeek,
      byChild: childTestsArray,
      subjects: Object.entries(subjectsCount).map(([subject, count]) => ({
        subject,
        count,
        percentage: Math.round((count / totalTests) * 100)
      })).sort((a, b) => b.count - a.count),
      summary: {
        totalChildren: children.length,
        totalUpcomingTests: totalTests,
        averagePerChild: children.length > 0 ? (totalTests / children.length).toFixed(1) : 0,
        hasUpcomingTests: totalTests > 0,
        nextTestDate: totalTests > 0 ? 
          childTestsArray[0].tests[0]?.startDate : null
      }
    });
  } catch (err) {
    console.error('❌ GET /parents/upcoming-tests/count error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming tests count',
      error: err.message
    });
  }
});

// Get detailed upcoming tests for a specific child
router.get('/children/:childId/upcoming-tests', auth, parentAccessToStudent, async (req, res) => {
  try {
    const { childId } = req.params;
    const { limit = 10, page = 1, status = 'upcoming' } = req.query;
    
    console.log('📅 GET /api/parents/children/:childId/upcoming-tests - Parent fetching child tests:', {
      parentId: req.user.id,
      childId,
      status
    });

    // Get child details
    const child = await User.findById(childId)
      .select('firstName lastName studentId className class')
      .populate('class', 'name shortName')
      .lean();

    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Child not found'
      });
    }

    const now = new Date();
    const skip = (page - 1) * limit;

    // Build query based on status
    let query = {
      'batches.students': childId,
      'batches.isActive': true
    };

    if (status === 'upcoming') {
      query.status = { $in: ['scheduled', 'active'] };
      query['batches.schedule.start'] = { $gte: now };
    } else if (status === 'active') {
      query.status = 'active';
      query['batches.schedule.start'] = { $lte: now };
      query['batches.schedule.end'] = { $gte: now };
    } else if (status === 'completed') {
      query['batches.schedule.end'] = { $lt: now };
    }

    // Get tests with pagination
    const tests = await Test.find(query)
      .populate('class', 'name shortName')
      .populate('createdBy', 'username name')
      .select('title subject class duration totalMarks passingMarks instructions batches createdAt')
      .sort({ 'batches.schedule.start': 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Format tests with child-specific batch info
    const formattedTests = tests.map(test => {
      // Find the specific batch for this child
      const childBatch = test.batches.find(batch => 
        batch.students && batch.students.some(student => 
          student && student.toString() === childId
        )
      );

      // Calculate time until test
      const startDate = childBatch ? new Date(childBatch.schedule.start) : null;
      const daysUntil = startDate ? Math.ceil((startDate - now) / (1000 * 60 * 60 * 24)) : null;
      
      // Determine test status
      let testStatus = 'upcoming';
      if (startDate && startDate <= now) {
        const endDate = new Date(childBatch.schedule.end);
        if (now <= endDate) {
          testStatus = 'active';
        } else {
          testStatus = 'completed';
        }
      }

      return {
        testId: test._id,
        title: test.title,
        subject: test.subject,
        class: test.class,
        duration: test.duration,
        totalMarks: test.totalMarks,
        passingMarks: test.passingMarks,
        instructions: test.instructions,
        batchInfo: childBatch ? {
          name: childBatch.name,
          start: childBatch.schedule.start,
          end: childBatch.schedule.end,
          durationHours: Math.round((new Date(childBatch.schedule.end) - new Date(childBatch.schedule.start)) / (1000 * 60 * 60))
        } : null,
        daysUntil: daysUntil,
        status: testStatus,
        isActive: testStatus === 'active',
        canTake: testStatus === 'active' || (testStatus === 'upcoming' && daysUntil <= 1),
        createdBy: test.createdBy,
        createdAt: test.createdAt
      };
    });

    // Get total count for pagination
    const totalTests = await Test.countDocuments(query);

    // Get statistics
    const activeTests = formattedTests.filter(t => t.status === 'active').length;
    const upcomingTests = formattedTests.filter(t => t.status === 'upcoming').length;
    const completedTests = formattedTests.filter(t => t.status === 'completed').length;

    // Get subject breakdown
    const subjects = {};
    formattedTests.forEach(test => {
      subjects[test.subject] = (subjects[test.subject] || 0) + 1;
    });

    res.json({
      success: true,
      child: {
        id: child._id,
        name: `${child.firstName} ${child.lastName}`,
        studentId: child.studentId,
        className: child.className,
        class: child.class
      },
      tests: formattedTests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTests / limit),
        totalTests,
        hasNext: page < Math.ceil(totalTests / limit),
        hasPrev: page > 1,
        limit: parseInt(limit)
      },
      statistics: {
        total: totalTests,
        active: activeTests,
        upcoming: upcomingTests,
        completed: completedTests,
        subjects: Object.entries(subjects).map(([subject, count]) => ({
          subject,
          count,
          percentage: Math.round((count / formattedTests.length) * 100)
        }))
      },
      summary: {
        nextTest: formattedTests.find(t => t.status === 'upcoming'),
        activeNow: formattedTests.find(t => t.status === 'active'),
        totalUpcoming: upcomingTests
      }
    });
  } catch (err) {
    console.error('❌ GET /parents/children/:childId/upcoming-tests error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch child upcoming tests',
      error: err.message
    });
  }
});

// Get upcoming tests summary for dashboard cards
router.get('/upcoming-tests/summary', auth, parentOnly, async (req, res) => {
  try {
    console.log('📊 GET /api/parents/upcoming-tests/summary - Parent fetching tests summary:', req.user.id);

    const parent = await User.findById(req.user.id)
      .select('children')
      .populate({
        path: 'children',
        select: '_id firstName lastName studentId className',
        match: { isActive: true }
      })
      .lean();

    const children = parent.children || [];
    const childIds = children.map(child => child._id);

    if (childIds.length === 0) {
      return res.json({
        success: true,
        summary: {
          totalUpcomingTests: 0,
          upcomingThisWeek: 0,
          childrenWithTests: 0,
          nextTestDate: null,
          subjects: []
        },
        children: []
      });
    }

    const now = new Date();
    const nextWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    const nextMonth = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    // Get upcoming tests for next month
    const upcomingTests = await Test.find({
      status: { $in: ['scheduled', 'active'] },
      'batches.students': { $in: childIds },
      'batches.schedule.start': { $gte: now, $lte: nextMonth },
      'batches.isActive': true
    })
    .select('title subject batches')
    .lean();

    // Process tests for summary
    let totalUpcomingTests = 0;
    let upcomingThisWeek = 0;
    const childrenWithTests = new Set();
    const subjectsSet = new Set();
    let nextTestDate = null;

    upcomingTests.forEach(test => {
      test.batches.forEach(batch => {
        if (!batch.students || batch.students.length === 0) return;
        
        // Check if batch is in the next week
        const batchStart = new Date(batch.schedule.start);
        const isThisWeek = batchStart <= nextWeek;
        
        if (isThisWeek) {
          upcomingThisWeek++;
        }
        
        // Update next test date
        if (!nextTestDate || batchStart < nextTestDate) {
          nextTestDate = batchStart;
        }
        
        // Add subjects
        subjectsSet.add(test.subject);
        
        // Add to students with tests
        batch.students.forEach(studentId => {
          if (childIds.includes(studentId.toString())) {
            childrenWithTests.add(studentId.toString());
            totalUpcomingTests++;
          }
        });
      });
    });

    // Format subjects array
    const subjects = Array.from(subjectsSet).map(subject => ({
      subject,
      icon: getSubjectIcon(subject)
    }));

    res.json({
      success: true,
      summary: {
        totalUpcomingTests,
        upcomingThisWeek,
        childrenWithTests: childrenWithTests.size,
        nextTestDate: nextTestDate ? {
          date: nextTestDate,
          daysUntil: Math.ceil((nextTestDate - now) / (1000 * 60 * 60 * 24)),
          formatted: formatDate(nextTestDate)
        } : null,
        subjects: subjects.slice(0, 5), // Top 5 subjects
        totalSubjects: subjects.length,
        hasTests: totalUpcomingTests > 0
      },
      children: children.map(child => ({
        id: child._id,
        name: `${child.firstName} ${child.lastName}`,
        hasUpcomingTests: childrenWithTests.has(child._id.toString())
      }))
    });
  } catch (err) {
    console.error('❌ GET /parents/upcoming-tests/summary error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming tests summary',
      error: err.message
    });
  }
});

// ============================================================
// NOTIFICATION ENDPOINTS
// ============================================================

// Get parent notifications
router.get('/notifications', auth, parentOnly, async (req, res) => {
  try {
    const { unreadOnly = false, limit = 20 } = req.query;
    
    console.log('🔔 GET /api/parents/notifications - Parent fetching notifications:', {
      parentId: req.user.id,
      unreadOnly
    });

    // In a real app, you would have a Notification model
    // For now, we'll return a simulated response
    const notifications = [
      {
        id: '1',
        type: 'exam_result',
        title: 'New Exam Result Published',
        message: 'Term 1 exam results for John Doe have been published.',
        studentId: req.user.children?.[0] || null,
        data: { examType: 'Term 1', year: '2024' },
        read: false,
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        icon: '📊'
      },
      {
        id: '2',
        type: 'feedback_response',
        title: 'Feedback Response Received',
        message: 'Your feedback about school facilities has been responded to.',
        read: true,
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        icon: '💬'
      }
    ];

    // Filter unread if requested
    const filteredNotifications = unreadOnly === 'true' 
      ? notifications.filter(n => !n.read)
      : notifications;

    // Count unread
    const unreadCount = notifications.filter(n => !n.read).length;

    res.json({
      success: true,
      notifications: filteredNotifications.slice(0, parseInt(limit)),
      unreadCount,
      total: filteredNotifications.length
    });
  } catch (err) {
    console.error('❌ GET /parents/notifications error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: err.message
    });
  }
});

// Update notification preferences
router.put('/notification-preferences', auth, parentOnly, async (req, res) => {
  try {
    const { preferences } = req.body;
    
    console.log('🔔 PUT /api/parents/notification-preferences - Updating preferences:', {
      parentId: req.user.id,
      preferences
    });

    const parent = await User.findById(req.user.id);
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    // Update preferences
    parent.notificationPreferences = {
      ...parent.notificationPreferences,
      ...preferences
    };

    await parent.save();

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      notificationPreferences: parent.notificationPreferences
    });
  } catch (err) {
    console.error('❌ PUT /parents/notification-preferences error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: err.message
    });
  }
});

// ============================================================
// PARENT PROFILE ENDPOINTS
// ============================================================

// Get parent profile
router.get('/profile', auth, parentOnly, async (req, res) => {
  try {
    console.log('👤 GET /api/parents/profile - Parent fetching profile:', req.user.id);

    const parent = await User.findById(req.user.id)
      .select('firstName lastName username email phone address parentCode notificationPreferences profileImage createdAt')
      .lean();

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    res.json({
      success: true,
      profile: {
        id: parent._id,
        name: `${parent.firstName} ${parent.lastName}`,
        username: parent.username,
        email: parent.email,
        phone: parent.phone,
        address: parent.address,
        parentCode: parent.parentCode,
        notificationPreferences: parent.notificationPreferences || {},
        profileImage: parent.profileImage,
        accountCreated: parent.createdAt,
        lastLogin: req.user.lastLogin
      }
    });
  } catch (err) {
    console.error('❌ GET /parents/profile error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: err.message
    });
  }
});

// Update parent profile (limited fields)
router.put('/profile', auth, parentOnly, async (req, res) => {
  try {
    const { phone, address, notificationPreferences } = req.body;
    
    console.log('📝 PUT /api/parents/profile - Parent updating profile:', req.user.id);

    const parent = await User.findById(req.user.id);
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    // Only allow updating specific fields
    if (phone !== undefined) parent.phone = phone;
    if (address !== undefined) parent.address = address;
    if (notificationPreferences !== undefined) {
      parent.notificationPreferences = {
        ...parent.notificationPreferences,
        ...notificationPreferences
      };
    }

    await parent.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        phone: parent.phone,
        address: parent.address,
        notificationPreferences: parent.notificationPreferences
      }
    });
  } catch (err) {
    console.error('❌ PUT /parents/profile error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: err.message
    });
  }
});



// ============================================================
// PARENT FEEDBACK ENDPOINTS (FIXED VERSION)
// ============================================================

// Submit feedback - UPDATED VERSION
router.post('/feedback', auth, parentOnly, async (req, res) => {
  try {
    const { title, message, category = 'General', student, priority = 'medium' } = req.body;
    
    console.log('💬 POST /api/parents/feedback - Parent submitting feedback:', {
      parent: req.user.id,
      student,
      category,
      title,
      priority
    });

    // Validate input
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    // Validate category
    const validCategories = ['Academic', 'Behavior', 'Attendance', 'Fee', 'General', 'Technical'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
      });
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
      });
    }

    // If student is provided, verify it's a valid ObjectId
    if (student && !mongoose.Types.ObjectId.isValid(student)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID format'
      });
    }

    // If student is provided, verify the parent has access to this student
    if (student) {
      const parentUser = await User.findById(req.user.id).select('children').lean();
      const hasAccess = parentUser.children?.some(child => 
        child.toString() === student.toString()
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this student'
        });
      }
    }

    // Check rate limiting
    const recentFeedbackCount = await ParentFeedback.countDocuments({
      parent: req.user.id,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    const maxDailyFeedback = process.env.MAX_DAILY_PARENT_FEEDBACK || 10;
    if (recentFeedbackCount >= maxDailyFeedback) {
      return res.status(429).json({
        success: false,
        message: `Too many feedback submissions. Limit is ${maxDailyFeedback} per day.`
      });
    }

    // Create feedback
    const feedback = new ParentFeedback({
      parent: req.user.id,
      student: student || null,
      title: title.trim(),
      message: message.trim(),
      category,
      priority,
      status: 'pending'
    });

    await feedback.save();

    console.log('✅ Feedback submitted successfully:', {
      feedbackId: feedback._id,
      parent: req.user.username,
      category
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: {
        id: feedback._id,
        title: feedback.title,
        category: feedback.category,
        priority: feedback.priority,
        status: feedback.status,
        submittedAt: feedback.createdAt,
        referenceNumber: `FB-${feedback._id.toString().slice(-8).toUpperCase()}`
      }
    });
  } catch (err) {
    console.error('❌ POST /parents/feedback error:', err);
    
    // Handle duplicate key errors or validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: err.message
      });
    }
    
    // Handle MongoDB duplicate key errors
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate feedback detected'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: err.message
    });
  }
});

// Get all feedback submitted by parent
router.get('/feedback', auth, parentOnly, async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;
    
    console.log('💬 GET /api/parents/feedback - Parent fetching feedback:', {
      parentId: req.user.id,
      status,
      category
    });

    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = { parent: req.user.id };
    if (status) filter.status = status;
    if (category) filter.category = category;

    // Get feedback with pagination
    const feedback = await ParentFeedback.find(filter)
      .select('title message category priority status reply responseRead createdAt updatedAt repliedAt')
      .populate('student', 'firstName lastName studentId className')
      .populate('repliedBy', 'firstName lastName username role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalFeedback = await ParentFeedback.countDocuments(filter);
    const totalPages = Math.ceil(totalFeedback / limit);

    // Count by status
    const statusCounts = await ParentFeedback.aggregate([
      { $match: { parent: new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Count by category
    const categoryCounts = await ParentFeedback.aggregate([
      { $match: { parent: new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Count unread responses
    const unreadResponses = await ParentFeedback.countDocuments({
      parent: req.user.id,
      reply: { $exists: true, $ne: '' },
      responseRead: false
    });

    res.json({
      success: true,
      feedback: feedback.map(fb => ({
        ...fb,
        hasResponse: !!fb.reply
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalFeedback,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        limit: parseInt(limit)
      },
      statistics: {
        total: totalFeedback,
        byStatus: statusCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byCategory: categoryCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        unreadResponses
      }
    });
  } catch (err) {
    console.error('❌ GET /parents/feedback error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
      error: err.message
    });
  }
});

// Get specific feedback details
router.get('/feedback/:feedbackId', auth, parentOnly, async (req, res) => {
  try {
    const { feedbackId } = req.params;
    
    console.log('💬 GET /api/parents/feedback/:feedbackId - Parent fetching feedback details:', {
      parentId: req.user.id,
      feedbackId
    });

    const feedback = await ParentFeedback.findOne({
      _id: feedbackId,
      parent: req.user.id
    })
      .populate('student', 'firstName lastName studentId className')
      .populate('repliedBy', 'firstName lastName username role')
      .populate('parent', 'firstName lastName email phone')
      .lean();

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Mark as read if there's a response
    if (feedback.reply && !feedback.responseRead) {
      await ParentFeedback.findByIdAndUpdate(feedbackId, {
        responseRead: true
      });
      feedback.responseRead = true;
    }

    res.json({
      success: true,
      feedback: {
        id: feedback._id,
        title: feedback.title,
        message: feedback.message,
        category: feedback.category,
        priority: feedback.priority,
        status: feedback.status,
        student: feedback.student,
        parent: feedback.parent,
        submittedAt: feedback.createdAt,
        reply: feedback.reply,
        repliedBy: feedback.repliedBy,
        repliedAt: feedback.repliedAt,
        hasResponse: !!feedback.reply,
        responseRead: feedback.responseRead,
        referenceNumber: `FB-${feedback._id.toString().slice(-8).toUpperCase()}`
      }
    });
  } catch (err) {
    console.error('❌ GET /parents/feedback/:feedbackId error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback details',
      error: err.message
    });
  }
});

// Mark all responses as read
router.post('/feedback/mark-all-read', auth, parentOnly, async (req, res) => {
  try {
    console.log('👁️ POST /api/parents/feedback/mark-all-read - Marking all responses as read:', req.user.id);

    const result = await ParentFeedback.updateMany(
      {
        parent: req.user.id,
        reply: { $exists: true, $ne: '' },
        responseRead: false
      },
      {
        responseRead: true
      }
    );

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} responses as read`
    });
  } catch (err) {
    console.error('❌ POST /parents/feedback/mark-all-read error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to mark responses as read',
      error: err.message
    });
  }
});

// Get feedback statistics for dashboard
router.get('/feedback/statistics', auth, parentOnly, async (req, res) => {
  try {
    console.log('📊 GET /api/parents/feedback/statistics - Parent fetching feedback statistics:', req.user.id);

    // Get total feedback count
    const total = await ParentFeedback.countDocuments({ parent: req.user.id });
    
    // Get feedback by status
    const byStatus = await ParentFeedback.aggregate([
      { $match: { parent: new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Get feedback by category
    const byCategory = await ParentFeedback.aggregate([
      { $match: { parent: new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    // Get unread responses count
    const unreadResponses = await ParentFeedback.countDocuments({
      parent: req.user.id,
      reply: { $exists: true, $ne: '' },
      responseRead: false
    });
    
    // Get recent feedback (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentFeedback = await ParentFeedback.countDocuments({
      parent: req.user.id,
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.json({
      success: true,
      statistics: {
        total,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byCategory: byCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        unreadResponses,
        recentFeedback,
        responseRate: total > 0 ? 
          Math.round((byStatus.find(s => s._id === 'replied')?.count || 0) / total * 100) : 0
      }
    });
  } catch (err) {
    console.error('❌ GET /parents/feedback/statistics error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback statistics',
      error: err.message
    });
  }
});


module.exports = router;
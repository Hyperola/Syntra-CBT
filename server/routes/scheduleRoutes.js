const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Test = require('../models/Test');
const { auth } = require('../middleware/auth');

// Get teacher's schedule
router.get('/teacher/schedule', auth, async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    console.log('📅 GET /api/teacher/schedule - Request:', {
      teacherId: req.user.id,
      username: req.user.username,
      startDate,
      endDate,
      status
    });

    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Only teachers can view their schedule'
      });
    }

    // Build query
    const query = {
      createdBy: req.user.id,
      isActive: true
    };

    // Add status filter
    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['scheduled', 'active'] };
    }

    // Get teacher's tests with batches
    const tests = await Test.find(query)
      .populate('class', 'name level')
      .sort({ 'batches.schedule.start': 1 })
      .lean();

    // Extract and format schedule from batches
    const schedule = [];
    
    tests.forEach(test => {
      if (test.batches && Array.isArray(test.batches)) {
        test.batches.forEach(batch => {
          if (batch.isActive && batch.schedule && batch.schedule.start && batch.schedule.end) {
            const batchStart = new Date(batch.schedule.start);
            
            // Apply date filter if provided
            if (startDate && batchStart < new Date(startDate)) return;
            if (endDate && batchStart > new Date(endDate)) return;
            
            schedule.push({
              id: `${test._id}-${batch.name}`,
              testId: test._id,
              title: test.title || 'Untitled Test',
              subject: test.subject || 'Unknown',
              class: test.class || { name: 'Unknown Class' },
              batchName: batch.name || 'Default Batch',
              startTime: batch.schedule.start,
              endTime: batch.schedule.end,
              status: test.status || 'scheduled',
              testType: test.title?.includes('CA') ? 'CA' : 'Examination',
              studentCount: batch.students?.length || 0,
              duration: test.duration || 60
            });
          }
        });
      }
    });

    // Sort by start time
    schedule.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    // Categorize by date
    const scheduleByDate = {};
    schedule.forEach(item => {
      const date = new Date(item.startTime).toISOString().split('T')[0];
      if (!scheduleByDate[date]) {
        scheduleByDate[date] = [];
      }
      scheduleByDate[date].push(item);
    });

    res.json({
      success: true,
      schedule,
      scheduleByDate,
      summary: {
        total: schedule.length,
        upcoming: schedule.filter(s => new Date(s.startTime) > new Date()).length,
        ongoing: schedule.filter(s => 
          new Date() >= new Date(s.startTime) && new Date() <= new Date(s.endTime)
        ).length,
        completed: schedule.filter(s => new Date(s.endTime) < new Date()).length
      }
    });

  } catch (error) {
    console.error('❌ GET /api/teacher/schedule error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching teacher schedule',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get upcoming schedule (next 7 days)
router.get('/teacher/schedule/upcoming', auth, async (req, res) => {
  try {
    console.log('📅 GET /api/teacher/schedule/upcoming - Request:', {
      teacherId: req.user.id,
      username: req.user.username
    });

    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Only teachers can view upcoming schedule'
      });
    }

    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Get upcoming tests
    const tests = await Test.find({
      createdBy: req.user.id,
      isActive: true,
      status: { $in: ['scheduled', 'active'] },
      'batches.schedule.start': {
        $gte: today,
        $lte: nextWeek
      }
    })
      .populate('class', 'name level')
      .sort({ 'batches.schedule.start': 1 })
      .lean();

    // Extract upcoming schedule
    const upcoming = [];
    
    tests.forEach(test => {
      if (test.batches && Array.isArray(test.batches)) {
        test.batches.forEach(batch => {
          if (batch.isActive && batch.schedule && batch.schedule.start) {
            const batchStart = new Date(batch.schedule.start);
            if (batchStart >= today && batchStart <= nextWeek) {
              upcoming.push({
                testId: test._id,
                title: test.title || 'Untitled Test',
                subject: test.subject || 'Unknown',
                class: test.class || { name: 'Unknown Class' },
                batchName: batch.name || 'Default Batch',
                startTime: batch.schedule.start,
                endTime: batch.schedule.end,
                daysUntil: Math.ceil((batchStart - today) / (1000 * 60 * 60 * 24)),
                studentCount: batch.students?.length || 0
              });
            }
          }
        });
      }
    });

    // Sort by start time
    upcoming.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    res.json({
      success: true,
      upcoming,
      summary: {
        total: upcoming.length,
        today: upcoming.filter(s => 
          new Date(s.startTime).toDateString() === today.toDateString()
        ).length,
        tomorrow: upcoming.filter(s => {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return new Date(s.startTime).toDateString() === tomorrow.toDateString();
        }).length
      }
    });

  } catch (error) {
    console.error('❌ GET /api/teacher/schedule/upcoming error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching upcoming schedule',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get teacher's schedule by date range
router.get('/teacher/schedule/range', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    console.log('📅 GET /api/teacher/schedule/range - Request:', {
      teacherId: req.user.id,
      username: req.user.username,
      startDate,
      endDate
    });

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate query parameters are required'
      });
    }

    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Only teachers can view schedule'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    // Get tests in date range
    const tests = await Test.find({
      createdBy: req.user.id,
      isActive: true,
      status: { $in: ['scheduled', 'active'] },
      $or: [
        { 'batches.schedule.start': { $gte: start, $lte: end } },
        { 'batches.schedule.end': { $gte: start, $lte: end } }
      ]
    })
      .populate('class', 'name level')
      .sort({ 'batches.schedule.start': 1 })
      .lean();

    // Extract schedule
    const schedule = [];
    
    tests.forEach(test => {
      if (test.batches && Array.isArray(test.batches)) {
        test.batches.forEach(batch => {
          if (batch.isActive && batch.schedule && batch.schedule.start && batch.schedule.end) {
            const batchStart = new Date(batch.schedule.start);
            const batchEnd = new Date(batch.schedule.end);
            
            // Only include if overlaps with date range
            if ((batchStart >= start && batchStart <= end) || 
                (batchEnd >= start && batchEnd <= end) ||
                (batchStart <= start && batchEnd >= end)) {
              
              schedule.push({
                testId: test._id,
                title: test.title || 'Untitled Test',
                subject: test.subject || 'Unknown',
                class: test.class || { name: 'Unknown Class' },
                batchName: batch.name || 'Default Batch',
                startTime: batch.schedule.start,
                endTime: batch.schedule.end,
                status: test.status || 'scheduled',
                duration: test.duration || 60,
                studentCount: batch.students?.length || 0
              });
            }
          }
        });
      }
    });

    // Sort by start time
    schedule.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    res.json({
      success: true,
      schedule,
      summary: {
        total: schedule.length,
        byStatus: {
          scheduled: schedule.filter(s => s.status === 'scheduled').length,
          active: schedule.filter(s => s.status === 'active').length
        },
        byDay: schedule.reduce((acc, item) => {
          const day = new Date(item.startTime).toDateString();
          acc[day] = (acc[day] || 0) + 1;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('❌ GET /api/teacher/schedule/range error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching schedule range',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
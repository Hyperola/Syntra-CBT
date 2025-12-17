// routes/class-setup.js - NEW FILE
const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const ClassSubject = require('../models/ClassSubject');
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// Get class setup summary
router.get('/summary', auth, checkPermission('manage_curriculum'), async (req, res) => {
  try {
    const [classes, subjects, assignments] = await Promise.all([
      Class.find({ isActive: true }).sort({ level: 1, displayOrder: 1 }).lean(),
      Subject.find({ isActive: true }).sort({ name: 1 }).lean(),
      ClassSubject.find().populate('class subject').lean()
    ]);
    
    const summary = classes.map(cls => {
      const classAssignments = assignments.filter(a => a.class._id.toString() === cls._id.toString());
      return {
        class: cls,
        assignedSubjects: classAssignments.map(a => a.subject),
        totalAssigned: classAssignments.length
      };
    });
    
    res.json({
      classes: classes.length,
      subjects: subjects.length,
      assignments: assignments.length,
      summary,
      availableSubjects: subjects
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load setup summary' });
  }
});

// Bulk assign subjects to class
router.post('/class/:classId/subjects', auth, checkPermission('manage_curriculum'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { subjectIds, isCompulsory = true } = req.body;
    
    // Clear existing assignments
    await ClassSubject.deleteMany({ class: classId });
    
    // Create new assignments
    const assignments = await Promise.all(
      subjectIds.map(subjectId => 
        new ClassSubject({
          class: classId,
          subject: subjectId,
          isCompulsory: Array.isArray(isCompulsory) 
            ? isCompulsory.includes(subjectId)
            : isCompulsory
        }).save()
      )
    );
    
    await Promise.all(assignments.map(a => a.populate('subject')));
    
    res.json({
      message: `Assigned ${assignments.length} subjects to class`,
      assignments: assignments.map(a => a.apiResponse)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign subjects to class' });
  }
});

module.exports = router;
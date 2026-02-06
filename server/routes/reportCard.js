const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const User = require('../models/User');
const Class = require('../models/Class');
const Signature = require('../models/Signature');
const { auth, adminOnly } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const COLORS = {
  primary: '#4B5320',
  secondary: '#D4A017',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textWhite: '#FFFFFF',
  excellent: '#059669',
  good: '#0891B2',
  average: '#D97706',
  poor: '#DC2626',
  border: '#D4A017',
  background: '#FFFFFF',
};

const TYPOGRAPHY = {
  fonts: { heading: 'Times-Bold', body: 'Times-Roman' },
  sizes: { title: 16, subtitle: 12, heading: 10, body: 8, small: 7 },
};

const LAYOUT = {
  margin: 40,
  sectionGap: 15,
  tableRowHeight: 22,
  headerHeight: 100,
  footerHeight: 20,
  maxTableY: 700,
};

const getGradeInfo = percentage => {
  if (percentage >= 90) return { grade: 'A+', remark: 'Outstanding', color: COLORS.excellent };
  if (percentage >= 80) return { grade: 'A', remark: 'Excellent', color: COLORS.excellent };
  if (percentage >= 70) return { grade: 'B', remark: 'Very Good', color: COLORS.excellent };
  if (percentage >= 60) return { grade: 'C', remark: 'Good', color: COLORS.good };
  if (percentage >= 50) return { grade: 'D', remark: 'Pass', color: COLORS.average };
  if (percentage >= 40) return { grade: 'E', remark: 'Below Average', color: COLORS.poor };
  return { grade: 'F', remark: 'Needs Improvement', color: COLORS.poor };
};

const addWatermark = doc => {
  const watermarkImage = path.join(__dirname, '../../public/images/sanniville-logo.png');
  if (fs.existsSync(watermarkImage)) {
    doc.save()
       .opacity(0.08)
       .image(watermarkImage, doc.page.width / 2 - 150, doc.page.height / 2 - 150, { width: 300, height: 300 })
       .restore();
  } else {
    doc.save()
       .opacity(0.05)
       .font(TYPOGRAPHY.fonts.heading)
       .fontSize(40)
       .fillColor(COLORS.primary)
       .rotate(45)
       .text('SANNIVILLE ACADEMY', doc.page.width / 2 - 150, doc.page.height / 2 - 50, { align: 'center', width: 300 })
       .restore();
  }
};

const addHeader = (doc, session, term) => {
  const logoSize = 50;
  const watermarkImage = path.join(__dirname, '../../public/images/sanniville-logo.png');
  doc.rect(0, 0, doc.page.width, LAYOUT.headerHeight).fill(COLORS.primary);
  const logoX = LAYOUT.margin;
  const logoY = 15;
  if (fs.existsSync(watermarkImage)) {
    doc.image(watermarkImage, logoX, logoY, { width: logoSize, height: logoSize });
  } else {
    doc.rect(logoX, logoY, logoSize, logoSize)
       .fillAndStroke(COLORS.background, COLORS.secondary)
       .lineWidth(1);
    doc.font(TYPOGRAPHY.fonts.heading)
       .fontSize(12)
       .fillColor(COLORS.secondary)
       .text('SA', logoX + 10, logoY + 18);
  }
  doc.font(TYPOGRAPHY.fonts.heading)
     .fontSize(TYPOGRAPHY.sizes.title)
     .fillColor(COLORS.textWhite)
     .text('SANNIVILLE ACADEMY', logoX + logoSize + 15, logoY)
     .fontSize(TYPOGRAPHY.sizes.body)
     .text('123 Education Boulevard, Sanniville City', logoX + logoSize + 15, logoY + 20)
     .text('info@sanniville.edu | (123) 456-7890', logoX + logoSize + 15, logoY + 30);
  
  // Include term in the main title
  const reportTitle = term ? `TERM REPORT CARD - ${term.toUpperCase()}` : 'TERM REPORT CARD';
  
  doc.fontSize(TYPOGRAPHY.sizes.subtitle)
     .text(reportTitle, LAYOUT.margin, logoY + 50, { 
       width: doc.page.width - (LAYOUT.margin * 2), 
       align: 'center' 
     });
  
  // Session information below the title
  doc.font(TYPOGRAPHY.fonts.body)
     .fontSize(TYPOGRAPHY.sizes.small)
     .text(`Session: ${session}`, LAYOUT.margin, logoY + 70, { 
       width: doc.page.width - (LAYOUT.margin * 2), 
       align: 'center' 
     });
  
  return LAYOUT.headerHeight + LAYOUT.sectionGap;
};

// UPDATED: Student info function with firstName, lastName, middleName, and profileImage
const addStudentInfo = (doc, y, student, reportData, position, classSize, attendance) => {
  doc.font(TYPOGRAPHY.fonts.heading)
     .fontSize(TYPOGRAPHY.sizes.heading)
     .fillColor(COLORS.primary)
     .text('Student Details', LAYOUT.margin, y);
  doc.moveTo(LAYOUT.margin, y + 15).lineTo(doc.page.width - LAYOUT.margin, y + 15).stroke(COLORS.secondary);
  const contentY = y + 25;
  const col1 = LAYOUT.margin;
  const col2 = col1 + 180;
  const photoX = doc.page.width - LAYOUT.margin - 50;
  const photoY = contentY;
  
  // UPDATED: Handle student profile image with multiple path checks
  if (student.profileImage) {
    // Try multiple possible paths for the profile image
    const possiblePaths = [
      path.join(__dirname, '../../uploads/profiles', student.profileImage),
      path.join(__dirname, '../../../uploads/profiles', student.profileImage),
      path.join(__dirname, '../../Uploads', student.profileImage),
      path.join(__dirname, '../../../Uploads', student.profileImage),
      student.profileImage // In case it's already an absolute path
    ];
    
    let imageFound = false;
    for (const imagePath of possiblePaths) {
      try {
        if (fs.existsSync(imagePath)) {
          doc.image(imagePath, photoX, photoY, { width: 50, height: 50 });
          imageFound = true;
          console.log(`✅ Profile image found at: ${imagePath}`);
          break;
        }
      } catch (error) {
        console.log(`❌ Error loading image from ${imagePath}:`, error.message);
        continue;
      }
    }
    
    if (!imageFound) {
      console.log(`❌ Profile image not found. Tried paths:`, possiblePaths);
      drawPlaceholderPhoto(doc, photoX, photoY);
    }
  } else if (student.picture) {
    // Fallback to old 'picture' field for backward compatibility
    const picturePath = path.join(__dirname, '../../Uploads', student.picture);
    if (fs.existsSync(picturePath)) {
      doc.image(picturePath, photoX, photoY, { width: 50, height: 50 });
    } else {
      drawPlaceholderPhoto(doc, photoX, photoY);
    }
  } else {
    drawPlaceholderPhoto(doc, photoX, photoY);
  }
  
  // UPDATED: Get class name properly - handle both object and string
  let className = 'N/A';
  if (student.class) {
    if (typeof student.class === 'object' && student.class.name) {
      className = student.class.name;
    } else if (typeof student.class === 'string') {
      className = student.class;
    }
  }
  
  // UPDATED: Build student name with firstName, middleName, and lastName
  const studentNameParts = [];
  if (student.firstName) studentNameParts.push(student.firstName);
  if (student.middleName) studentNameParts.push(student.middleName);
  if (student.lastName) studentNameParts.push(student.lastName);
  
  const studentName = studentNameParts.join(' ') || student.name || student.username || 'N/A';
  
  const info = [
    { label: 'Student ID:', value: student.studentId || 'N/A' },
    { label: 'Name:', value: studentName },
    { label: 'Class:', value: className },
    { label: 'Subjects:', value: reportData.numSubjects || 0 },
    { label: 'Position:', value: `${position} of ${classSize}` },
    { label: 'Attendance:', value: `${attendance.present || 0}/${attendance.totalDays || 0}` },
    { label: 'Date of Birth:', value: student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-GB') : 'N/A' },
    { label: 'Gender:', value: student.sex || student.gender || 'N/A' },
    { label: 'Age:', value: student.age || 'N/A' },
  ];
  
  info.forEach((item, index) => {
    const itemY = contentY + (index * 12);
    doc.font(TYPOGRAPHY.fonts.body)
       .fontSize(TYPOGRAPHY.sizes.body)
       .fillColor(COLORS.textSecondary)
       .text(item.label, col1, itemY, { width: 70 })
       .fillColor(COLORS.textPrimary)
       .text(item.value, col2, itemY, { width: 200 });
  });
  
  return contentY + Math.max(50, (info.length * 12)) + LAYOUT.sectionGap;
};

const drawPlaceholderPhoto = (doc, x, y) => {
  doc.rect(x, y, 50, 50)
     .stroke(COLORS.secondary)
     .lineWidth(1)
     .font(TYPOGRAPHY.fonts.body)
     .fontSize(TYPOGRAPHY.sizes.small)
     .fillColor(COLORS.textSecondary)
     .text('No Photo', x + 5, y + 20, { width: 40, align: 'center' });
};

const addPerformanceTable = (doc, y, reportData) => {
  const colWidths = [170, 50, 50, 50, 50, 40, 100];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const tableX = LAYOUT.margin;
  
  doc.font(TYPOGRAPHY.fonts.heading)
     .fontSize(TYPOGRAPHY.sizes.heading)
     .fillColor(COLORS.primary)
     .text('Academic Results', LAYOUT.margin, y);
  doc.moveTo(LAYOUT.margin, y + 15).lineTo(doc.page.width - LAYOUT.margin, y + 15).stroke(COLORS.secondary);
  
  let currentY = y + 20;
  
  const addTableHeader = () => {
    doc.rect(tableX, currentY, tableWidth, LAYOUT.tableRowHeight).fill(COLORS.primary);
    const headers = ['Subject', 'CA1 (20)', 'CA2 (20)', 'Exam (60)', 'Total (100)', 'Grade', 'Remark'];
    let currentX = tableX;
    
    doc.font(TYPOGRAPHY.fonts.heading)
       .fontSize(TYPOGRAPHY.sizes.small)
       .fillColor(COLORS.textWhite);
    
    headers.forEach((header, i) => {
      doc.text(header, currentX + 5, currentY + 7, { 
        width: colWidths[i] - 10, 
        align: i === 0 || i === 6 ? 'left' : 'center' 
      });
      currentX += colWidths[i];
    });
    currentY += LAYOUT.tableRowHeight;
  };
  
  addTableHeader();
  
  // Sort subjects alphabetically
  const sortedSubjects = Object.keys(reportData.subjects).sort();
  
  sortedSubjects.forEach((subject, index) => {
    if (currentY > LAYOUT.maxTableY) {
      doc.addPage();
      currentY = LAYOUT.margin;
      addTableHeader();
    }
    
    const sub = reportData.subjects[subject];
    
    // Ensure all values are numbers
    const firstCA = Number(sub.firstCA) || 0;
    const secondCA = Number(sub.secondCA) || 0;
    const exam = Number(sub.exam) || 0;
    const total = firstCA + secondCA + exam;
    
    const gradeInfo = getGradeInfo(total);
    
    // Add alternating row background
    if (index % 2 === 1) {
      doc.rect(tableX, currentY, tableWidth, LAYOUT.tableRowHeight)
         .fillOpacity(0.05)
         .fill(COLORS.secondary)
         .fillOpacity(1);
    }
    
    // Draw cell borders
    doc.rect(tableX, currentY, tableWidth, LAYOUT.tableRowHeight)
       .stroke(COLORS.border)
       .lineWidth(1);
    
    const rowData = [
      { text: subject, align: 'left', color: COLORS.textPrimary },
      { text: firstCA.toString(), align: 'center', color: COLORS.textPrimary },
      { text: secondCA.toString(), align: 'center', color: COLORS.textPrimary },
      { text: exam.toString(), align: 'center', color: COLORS.textPrimary },
      { text: total.toString(), align: 'center', color: COLORS.textPrimary },
      { text: gradeInfo.grade, align: 'center', color: gradeInfo.color },
      { text: gradeInfo.remark, align: 'left', color: gradeInfo.color },
    ];
    
    let currentX = tableX;
    rowData.forEach((data, i) => {
      doc.font(TYPOGRAPHY.fonts.body)
         .fontSize(TYPOGRAPHY.sizes.small)
         .fillColor(data.color)
         .text(data.text, currentX + 5, currentY + 7, { 
           width: colWidths[i] - 10, 
           align: data.align 
         });
      currentX += colWidths[i];
    });
    
    currentY += LAYOUT.tableRowHeight;
  });
  
  return currentY + LAYOUT.sectionGap;
};

const addSummary = (doc, y, reportData, average, results) => {
  doc.font(TYPOGRAPHY.fonts.heading)
     .fontSize(TYPOGRAPHY.sizes.heading)
     .fillColor(COLORS.primary)
     .text('Performance Summary', LAYOUT.margin, y);
  doc.moveTo(LAYOUT.margin, y + 15).lineTo(doc.page.width - LAYOUT.margin, y + 15).stroke(COLORS.secondary);
  
  const contentY = y + 25;
  const col1 = LAYOUT.margin;
  const col2 = col1 + 180;
  
  const averageNum = parseFloat(average) || 0;
  const gradeInfo = getGradeInfo(averageNum);
  const promotion = averageNum >= 50 ? 'Promoted to Next Class' : 'Repeat Class';
  
  // Calculate statistics
  const totalPossible = reportData.numSubjects * 100;
  const totalScore = reportData.totalScore || 0;
  const averagePercentage = totalPossible > 0 ? ((totalScore / totalPossible) * 100).toFixed(1) : '0.0';
  
  const summary = [
    { label: 'Total Score:', value: `${totalScore}/${totalPossible}`, color: COLORS.textPrimary },
    { label: 'Average:', value: `${averagePercentage}% (${gradeInfo.grade})`, color: gradeInfo.color },
    { label: 'Status:', value: promotion, color: averageNum >= 50 ? COLORS.excellent : COLORS.poor },
    { label: 'Subjects Passed:', value: `${reportData.numPasses || 0}/${reportData.numSubjects || 0}`, color: COLORS.textPrimary },
    { label: 'Subjects Failed:', value: `${reportData.numFailures || 0}/${reportData.numSubjects || 0}`, color: reportData.numFailures > 0 ? COLORS.poor : COLORS.excellent },
  ];
  
  summary.forEach((item, index) => {
    const itemY = contentY + (index * 12);
    doc.font(TYPOGRAPHY.fonts.body)
       .fontSize(TYPOGRAPHY.sizes.body)
       .fillColor(COLORS.textSecondary)
       .text(item.label, col1, itemY, { width: 70 })
       .fillColor(item.color)
       .text(item.value, col2, itemY, { width: 200 });
  });
  
  const commentY = contentY + (summary.length * 12) + 10;
  
  // Get teacher comment
  let teacherComment = 'Good effort. Focus on weaker subjects to improve.';
  if (results && results.length > 0) {
    const latestResult = results.find(r => r.remarks && r.remarks.trim() !== '');
    if (latestResult && latestResult.remarks) {
      teacherComment = latestResult.remarks;
    }
  }
  
  // Generate principal comment based on average
  const principalComment = averageNum >= 80 ? 'Excellent performance. Keep it up!' :
                          averageNum >= 60 ? 'Good progress. Aim higher.' :
                          averageNum >= 50 ? 'Pass. More effort needed.' :
                          'Needs improvement in all areas.';
  
  doc.font(TYPOGRAPHY.fonts.body)
     .fontSize(TYPOGRAPHY.sizes.small)
     .fillColor(COLORS.textSecondary)
     .text("Teacher's Comment:", col1, commentY)
     .fillColor(COLORS.textPrimary)
     .text(teacherComment, col2, commentY, { width: 320, align: 'justify' })
     .fillColor(COLORS.textSecondary)
     .text("Principal's Remark:", col1, commentY + 25)
     .fillColor(COLORS.textPrimary)
     .text(principalComment, col2, commentY + 25, { width: 320, align: 'justify' });
  
  return commentY + 50 + LAYOUT.sectionGap;
};

const addSignatures = async (doc, y, studentClass) => {
  doc.font(TYPOGRAPHY.fonts.heading)
     .fontSize(TYPOGRAPHY.sizes.heading)
     .fillColor(COLORS.primary)
     .text('Authentication', LAYOUT.margin, y);
  doc.moveTo(LAYOUT.margin, y + 15).lineTo(doc.page.width - LAYOUT.margin, y + 15).stroke(COLORS.secondary);
  
  const dateY = y + 25;
  const col1 = LAYOUT.margin;
  const col2 = col1 + 180;
  
  doc.font(TYPOGRAPHY.fonts.body)
     .fontSize(TYPOGRAPHY.sizes.body)
     .fillColor(COLORS.textPrimary)
     .text(`Date: ${new Date().toLocaleDateString('en-GB')}`, col1, dateY)
     .text('Next Term: January 5, 2026', col2, dateY);
  
  const teacherY = dateY + 20;
  
  // Get signature based on class
  let signature = null;
  try {
    if (studentClass) {
      // If studentClass is an object with _id, use that
      const classId = studentClass._id || studentClass;
      signature = await Signature.findOne({ class: classId });
    }
  } catch (error) {
    console.error('Error fetching signature:', error);
  }
  
  doc.text('Class Teacher:', col1, teacherY);
  if (signature?.teacherSignature) {
    const signaturePath = path.join(__dirname, '../../Uploads', signature.teacherSignature);
    if (fs.existsSync(signaturePath)) {
      doc.image(signaturePath, col1 + 80, teacherY - 10, { width: 150, height: 30 });
    } else {
      drawSignatureLine(doc, col1 + 80, teacherY + 10);
    }
  } else {
    drawSignatureLine(doc, col1 + 80, teacherY + 10);
  }
  
  const principalY = teacherY + 40;
  doc.text('Principal:', col1, principalY);
  if (signature?.principalSignature) {
    const signaturePath = path.join(__dirname, '../../Uploads', signature.principalSignature);
    if (fs.existsSync(signaturePath)) {
      doc.image(signaturePath, col1 + 80, principalY - 10, { width: 150, height: 30 });
    } else {
      drawSignatureLine(doc, col1 + 80, principalY + 10);
    }
  } else {
    drawSignatureLine(doc, col1 + 80, principalY + 10);
  }
  
  return principalY + 40 + LAYOUT.sectionGap;
};

const drawSignatureLine = (doc, x, y) => {
  doc.moveTo(x, y).lineTo(x + 150, y).stroke(COLORS.secondary).lineWidth(1);
  doc.font(TYPOGRAPHY.fonts.body)
     .fontSize(TYPOGRAPHY.sizes.small)
     .fillColor(COLORS.textSecondary)
     .text('Signature', x + 60, y + 2, { width: 30, align: 'center' });
};

const addFooter = doc => {
  const footerY = doc.page.height - LAYOUT.footerHeight - LAYOUT.margin;
  doc.rect(0, footerY, doc.page.width, LAYOUT.footerHeight).fill(COLORS.primary);
  doc.font(TYPOGRAPHY.fonts.body)
     .fontSize(TYPOGRAPHY.sizes.small)
     .fillColor(COLORS.textWhite)
     .text(`© ${new Date().getFullYear()} Sanniville Academy | Generated on ${new Date().toLocaleDateString('en-GB')}`,
           LAYOUT.margin, footerY + 6, { width: doc.page.width - (LAYOUT.margin * 2), align: 'center' });
};

// Helper function to build session query for specific term
const buildSessionQuery = (sessionName, termName) => {
  const fullSession = `${sessionName} ${termName}`;
  
  // Try different session formats that might be in the database
  return {
    $or: [
      // Exact match for "2025/2026 First Term"
      { session: fullSession },
      // Match for "2025/2026" (session only) with term field
      { 
        $and: [
          { session: sessionName },
          { term: termName }
        ]
      },
      // Match session starting with year and containing term
      { 
        session: { 
          $regex: `${sessionName}.*${termName.replace(' Term', '').trim()}`, 
          $options: 'i' 
        } 
      }
    ]
  };
};

// UPDATED: Main report card endpoint with improved student data fetching
router.get('/export/report/:studentId/:session', auth, async (req, res) => {
  try {
    console.log('GET /api/reports/export/report/:studentId/:session - Request:', {
      params: req.params,
      query: req.query,
      user: req.user.username,
      role: req.user.role,
      timestamp: new Date().toISOString()
    });
    
    const { studentId, session: sessionName } = req.params;
    const { term } = req.query;
    
    // Validate student ID
    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ error: 'Invalid student ID' });
    }
    
    // Validate session format
    if (!sessionName.match(/^\d{4}\/\d{4}$/)) {
      return res.status(400).json({ 
        error: 'Invalid session format. Use YYYY/YYYY format (e.g., 2025/2026)' 
      });
    }
    
    // Use provided term or default to First Term
    const termName = term || 'First Term';
    const fullSession = `${sessionName} ${termName}`;
    
    console.log('🔍 Report card request details:', {
      studentId,
      session: sessionName,
      term: termName,
      fullSession,
      user: req.user.username,
      userRole: req.user.role
    });
    
    // UPDATED: Get student with proper class population and all necessary fields
    const student = await User.findById(studentId)
      .populate({
        path: 'class',
        select: 'name level shortName fullName'
      })
      .select('firstName lastName middleName username studentId dateOfBirth sex age address phoneNumber email profileImage picture parents class reportCardVisibleToParent reportCardScheduledVisibility reportCardVisibilitySettings')
      .lean();
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // UPDATED: Log student information for debugging
    console.log('📋 Student data retrieved:', {
      id: student._id,
      firstName: student.firstName,
      lastName: student.lastName,
      middleName: student.middleName,
      studentId: student.studentId,
      class: student.class,
      profileImage: student.profileImage,
      picture: student.picture,
      parents: student.parents,
      reportCardVisibleToParent: student.reportCardVisibleToParent,
      reportCardScheduledVisibility: student.reportCardScheduledVisibility
    });
    
    // Check permissions - UPDATED with visibility check
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({ error: 'Students can only view their own report cards' });
    }
    
    // ✅ ADDED: Check if report card is visible to parent (if requester is parent)
    if (req.user.role === 'parent') {
      console.log('👨‍👩‍👧 Parent access attempt for student:', {
        parentId: req.user._id,
        studentId: studentId,
        studentName: `${student.firstName} ${student.lastName}`
      });
      
      // Get student's parents if not already populated
      let studentWithParents = student;
      if (!student.parents) {
        studentWithParents = await User.findById(studentId).select('parents reportCardVisibleToParent reportCardScheduledVisibility reportCardVisibilitySettings');
      }
      
      if (!studentWithParents) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      // Check if parent is linked to this student
      const isParentLinked = studentWithParents.parents?.some(parentId => 
        parentId.toString() === req.user._id.toString()
      );
      
      console.log('🔗 Parent link check:', {
        parents: studentWithParents.parents,
        isParentLinked,
        requestingParentId: req.user._id
      });
      
      if (!isParentLinked) {
        return res.status(403).json({ 
          error: 'You are not authorized to view this report card',
          details: 'You are not listed as a parent for this student'
        });
      }
      
      // Check report card visibility
      const now = new Date();
      let isVisible = studentWithParents.reportCardVisibleToParent || false;
      
      // Check scheduled visibility
      if (studentWithParents.reportCardScheduledVisibility && 
          new Date(studentWithParents.reportCardScheduledVisibility) > now) {
        console.log('⏰ Scheduled visibility check failed:', {
          scheduled: studentWithParents.reportCardScheduledVisibility,
          now: now
        });
        isVisible = false;
      }
      
      // Check specific term visibility if settings exist
      if (studentWithParents.reportCardVisibilitySettings && 
          studentWithParents.reportCardVisibilitySettings.length > 0) {
        
        const termSetting = studentWithParents.reportCardVisibilitySettings.find(
          setting => setting.term === termName && setting.session === sessionName
        );
        
        if (termSetting) {
          console.log('📋 Found term-specific visibility setting:', termSetting);
          isVisible = termSetting.isVisibleToParent || false;
          
          // Check scheduled visibility for this term
          if (termSetting.scheduledVisibility && 
              new Date(termSetting.scheduledVisibility) > now) {
            console.log('⏰ Term-specific scheduled visibility check failed:', {
              scheduled: termSetting.scheduledVisibility,
              now: now
            });
            isVisible = false;
          }
        }
      }
      
      if (!isVisible) {
        let message = 'Report card is not visible to parents at this time';
        let details = 'Contact school administration for access';
        
        if (studentWithParents.reportCardScheduledVisibility) {
          const scheduledDate = new Date(studentWithParents.reportCardScheduledVisibility);
          details = `Scheduled for release on: ${scheduledDate.toLocaleDateString()} ${scheduledDate.toLocaleTimeString()}`;
        }
        
        console.log('🚫 Report card access denied for parent:', {
          studentId,
          parentId: req.user._id,
          isVisible,
          scheduledDate: studentWithParents.reportCardScheduledVisibility,
          termSetting: studentWithParents.reportCardVisibilitySettings?.find(
            s => s.term === termName && s.session === sessionName
          )
        });
        
        return res.status(403).json({ 
          error: message,
          details: details,
          scheduledDate: studentWithParents.reportCardScheduledVisibility
        });
      }
      
      console.log('✅ Parent access granted for report card:', {
        studentId,
        parentId: req.user._id,
        isVisible
      });
      
      // Record access
      try {
        await User.findByIdAndUpdate(studentId, {
          $push: {
            reportCardDownloads: {
              parentId: req.user._id,
              downloadedAt: new Date(),
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'],
              downloadCount: 1
            }
          }
        });
        console.log('📝 Recorded report card access for parent');
      } catch (recordError) {
        console.error('Error recording report card access:', recordError);
        // Don't fail the request if recording fails
      }
    }
    
    // FIXED: Build query to fetch results for SPECIFIC term only
    const sessionQuery = buildSessionQuery(sessionName, termName);
    
    const query = {
      userId: studentId,
      ...sessionQuery,
      isActive: true
    };
    
    console.log('🔍 Querying results with:', JSON.stringify(query, null, 2));
    
    let results = await Result.find(query)
      .populate('testId', 'title type subject totalMarks')
      .populate({
        path: 'class',
        select: 'name'
      })
      .sort({ subject: 1, submittedAt: -1 })
      .lean();
    
    if (results.length === 0) {
      // Try one more approach - check if results are stored with just the term field
      const alternativeQuery = {
        userId: studentId,
        session: sessionName, // Just the session without term
        term: termName,       // Term in separate field
        isActive: true
      };
      
      console.log('⚠️ No results found with first query, trying alternative:', alternativeQuery);
      
      const alternativeResults = await Result.find(alternativeQuery)
        .populate('testId', 'title type subject totalMarks')
        .populate({
          path: 'class',
          select: 'name'
        })
        .sort({ subject: 1, submittedAt: -1 })
        .lean();
      
      if (alternativeResults.length === 0) {
        // UPDATED: Use proper student name
        const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student';
        return res.status(404).json({ 
          error: `No results found for ${studentName} in ${fullSession}` 
        });
      }
      
      results = alternativeResults;
    }
    
    console.log('✅ Found results for specific term:', results.length);
    
    // UPDATED: Process results with improved student name handling
    const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username || 'Unknown Student';
    const reportData = {
      student: studentName,
      class: student.class?.name || student.class?.shortName || student.class?.fullName || 'N/A',
      session: fullSession,
      term: termName,
      subjects: {},
      totalScore: 0,
      totalPossible: 0,
      numSubjects: 0,
      numPasses: 0,
      numFailures: 0,
    };
    
    // Group results by subject first
    const subjectsMap = {};
    
    results.forEach(result => {
      const subject = result.subject || result.testId?.subject || 'Unknown Subject';
      const type = (result.testId?.type || '').toLowerCase();
      const title = (result.testId?.title || '').toLowerCase();
      const score = Number(result.score) || 0;
      
      if (!subjectsMap[subject]) {
        subjectsMap[subject] = {
          firstCA: 0,
          secondCA: 0,
          exam: 0,
          testScores: [],
          examScores: []
        };
      }
      
      // Categorize based on test type AND title
      let isExam = false;
      
      // Check if it's an exam by type
      if (type.includes('exam') || type === 'examination' || type === 'final') {
        isExam = true;
      }
      // Check if it's an exam by title
      else if (title.includes('exam') || title.includes('final') || 
               title.includes('term') || title.includes('end of term')) {
        isExam = true;
      }
      
      if (isExam) {
        // Exam score - maximum 60
        subjectsMap[subject].examScores.push(Math.min(score, 60));
      } else {
        // CA scores - maximum 20 each
        subjectsMap[subject].testScores.push(Math.min(score, 20));
      }
    });
    
    // Process each subject's scores - FIXED: Take highest exam score
    Object.keys(subjectsMap).forEach(subject => {
      const subjectData = subjectsMap[subject];
      
      // Sort test scores and take top 2 as CA1 and CA2
      subjectData.testScores.sort((a, b) => b - a);
      if (subjectData.testScores.length > 0) {
        subjectData.firstCA = subjectData.testScores[0];
      }
      if (subjectData.testScores.length > 1) {
        subjectData.secondCA = subjectData.testScores[1];
      }
      
      // Take highest exam score
      subjectData.examScores.sort((a, b) => b - a);
      if (subjectData.examScores.length > 0) {
        subjectData.exam = subjectData.examScores[0];
      }
      
      const total = subjectData.firstCA + subjectData.secondCA + subjectData.exam;
      
      reportData.subjects[subject] = {
        firstCA: subjectData.firstCA,
        secondCA: subjectData.secondCA,
        exam: subjectData.exam,
        total: total
      };
      
      reportData.numSubjects += 1;
      reportData.totalScore += total;
      reportData.totalPossible += 100;
      
      if (total >= 50) {
        reportData.numPasses += 1;
      } else {
        reportData.numFailures += 1;
      }
    });
    
    console.log('📊 Processed report data for term:', {
      term: termName,
      studentName: studentName,
      numSubjects: reportData.numSubjects,
      subjects: Object.keys(reportData.subjects),
      totalScore: reportData.totalScore,
      totalPossible: reportData.totalPossible
    });
    
    // Get class results for position calculation - FOR SPECIFIC TERM ONLY
    const classSessionQuery = buildSessionQuery(sessionName, termName);
    
    const classQuery = { 
      ...classSessionQuery,
      isActive: true 
    };
    
    // Get student's class ID
    const studentClassId = student.class?._id || student.class;
    if (studentClassId) {
      classQuery.class = studentClassId;
    }
    
    console.log('📊 Calculating position with query for term:', JSON.stringify(classQuery, null, 2));
    
    const classResults = await Result.find(classQuery)
      .populate('userId', 'firstName lastName username')
      .lean();
    
    // Calculate position - improved logic
    const studentTotals = {};
    
    // Group scores by student
    classResults.forEach(result => {
      const studentId = result.userId?._id?.toString();
      if (!studentId) return;
      
      if (!studentTotals[studentId]) {
        studentTotals[studentId] = {
          totalScore: 0,
          totalPossible: 0,
          count: 0
        };
      }
      
      const score = Number(result.score) || 0;
      const maxScore = 100; // Assuming 100 is max per test
      
      studentTotals[studentId].totalScore += score;
      studentTotals[studentId].totalPossible += maxScore;
      studentTotals[studentId].count += 1;
    });
    
    // Calculate averages and sort
    const studentAverages = Object.keys(studentTotals).map(studentId => {
      const data = studentTotals[studentId];
      const average = data.totalPossible > 0 ? 
        (data.totalScore / data.totalPossible) * 100 : 0;
      
      return {
        studentId,
        average,
        totalScore: data.totalScore,
        count: data.count
      };
    });
    
    studentAverages.sort((a, b) => b.average - a.average);
    
    const position = studentAverages.findIndex(s => s.studentId === studentId) + 1;
    const classSize = studentAverages.length;
    const average = reportData.totalPossible > 0 ? 
      (reportData.totalScore / reportData.totalPossible * 100).toFixed(1) : '0.0';
    
    console.log('🏆 Position calculation for term:', {
      term: termName,
      position,
      classSize,
      average,
      studentAveragesCount: studentAverages.length
    });
    
    // Mock attendance data (replace with actual data from your database)
    const attendance = { totalDays: 90, present: 85, absent: 5 };
    
    // Generate PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: LAYOUT.margin,
      info: {
        Title: `Report Card - ${studentName} - ${termName}`,
        Author: 'Sanniville Academy',
        Subject: `Academic Report - ${fullSession}`,
        Keywords: `report card, academic, ${studentName}, ${termName}, ${sessionName}`,
        Creator: 'Sanniville Academy Report System',
        CreationDate: new Date(),
      },
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    const filename = `report_${student.firstName || 'student'}_${sessionName.replace(/\//g, '_')}_${termName.replace(/\s/g, '_')}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    doc.pipe(res);
    
    // Add content to PDF
    addWatermark(doc);
    let currentY = addHeader(doc, sessionName, termName);
    currentY = addStudentInfo(doc, currentY, student, reportData, position, classSize, attendance);
    currentY = addPerformanceTable(doc, currentY, reportData);
    currentY = addSummary(doc, currentY, reportData, average, results);
    currentY = await addSignatures(doc, currentY, student.class);
    addFooter(doc);
    
    doc.end();
    
    console.log('✅ Report card generated successfully:', {
      studentId,
      studentName: studentName,
      session: sessionName,
      term: termName,
      filename,
      numSubjects: reportData.numSubjects,
      position: `${position}/${classSize}`,
      requestedBy: req.user.username,
      role: req.user.role
    });
    
  } catch (error) {
    console.error('❌ Report card generation error:', {
      message: error.message,
      stack: error.stack,
      params: req.params,
      query: req.query,
      user: req.user?.username
    });
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to generate report card',
        details: error.message 
      });
    }
  }
});

// UPDATED: New endpoint to match your results.js route pattern
router.get('/export/report/:studentId/:session/:term', auth, async (req, res) => {
  try {
    const { studentId, session, term } = req.params;
    
    console.log('GET /api/reports/export/report/:studentId/:session/:term - Request:', {
      studentId,
      session,
      term,
      user: req.user.username
    });
    
    // Parse session from the combined format (e.g., "2025/2026 First Term")
    const sessionParts = session.split(' ');
    if (sessionParts.length >= 2) {
      // If session already includes term, use it as is
      return res.redirect(`/api/reports/export/report/${studentId}/${sessionParts[0]}?term=${encodeURIComponent(term)}`);
    }
    
    // Redirect to the main endpoint with query parameter
    return res.redirect(`/api/reports/export/report/${studentId}/${session}?term=${encodeURIComponent(term)}`);
    
  } catch (error) {
    console.error('Three-parameter endpoint error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATED: Alternative endpoint with combined session/term parameter
router.get('/export/report/combined/:studentId/:fullSession', auth, async (req, res) => {
  try {
    const { studentId, fullSession } = req.params;
    
    console.log('GET /api/reports/export/report/combined/:studentId/:fullSession - Request:', {
      studentId,
      fullSession,
      user: req.user.username
    });
    
    // Parse session and term from fullSession (format: "2025/2026 First Term")
    const sessionMatch = fullSession.match(/^(\d{4}\/\d{4})\s+(First|Second|Third) Term$/);
    
    if (!sessionMatch) {
      return res.status(400).json({ 
        error: 'Invalid session format. Use "YYYY/YYYY First/Second/Third Term" format' 
      });
    }
    
    const sessionName = sessionMatch[1];
    const termName = `${sessionMatch[2]} Term`;
    
    // Redirect to main endpoint
    return res.redirect(`/api/reports/export/report/${studentId}/${sessionName}?term=${encodeURIComponent(termName)}`);
    
  } catch (error) {
    console.error('Combined endpoint error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATED: Debug endpoint to check data - IMPROVED VERSION
router.get('/debug/:studentId/:session', auth, async (req, res) => {
  try {
    const { studentId, session: sessionName } = req.params;
    const { term } = req.query;
    const termName = term || 'First Term';
    const fullSession = `${sessionName} ${termName}`;
    
    // UPDATED: Get student with all relevant fields
    const student = await User.findById(studentId)
      .populate('class', 'name shortName fullName level')
      .select('firstName lastName middleName username studentId dateOfBirth sex age address phoneNumber email profileImage picture parents class reportCardVisibleToParent reportCardScheduledVisibility reportCardVisibilitySettings')
      .lean();
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Try different query approaches
    const queries = [
      // Query 1: Exact full session match
      { userId: studentId, session: fullSession, isActive: true },
      // Query 2: Session + term field
      { userId: studentId, session: sessionName, term: termName, isActive: true },
      // Query 3: Regex match
      { 
        userId: studentId, 
        session: { $regex: `${sessionName}.*${termName.replace(' Term', '').trim()}`, $options: 'i' },
        isActive: true 
      }
    ];
    
    let results = [];
    let queryUsed = null;
    
    // Try each query until we find results
    for (const query of queries) {
      console.log(`Trying query: ${JSON.stringify(query)}`);
      const foundResults = await Result.find(query)
        .populate('testId', 'title type subject totalMarks')
        .lean();
      
      if (foundResults.length > 0) {
        results = foundResults;
        queryUsed = query;
        break;
      }
    }
    
    // Analyze results
    const analysis = {
      sessionFormatsFound: [],
      testTypesFound: [],
      subjectsFound: [],
      examScores: [],
      caScores: [],
      termsFound: []
    };
    
    results.forEach(result => {
      const session = result.session;
      if (!analysis.sessionFormatsFound.includes(session)) {
        analysis.sessionFormatsFound.push(session);
      }
      
      if (result.term && !analysis.termsFound.includes(result.term)) {
        analysis.termsFound.push(result.term);
      }
      
      const testType = result.testId?.type || 'unknown';
      if (!analysis.testTypesFound.includes(testType)) {
        analysis.testTypesFound.push(testType);
      }
      
      const subject = result.subject || result.testId?.subject || 'unknown';
      if (!analysis.subjectsFound.includes(subject)) {
        analysis.subjectsFound.push(subject);
      }
      
      // Check if it's an exam
      const type = (testType || '').toLowerCase();
      const title = (result.testId?.title || '').toLowerCase();
      const isExam = type.includes('exam') || type === 'examination' || 
                    type === 'final' || title.includes('exam') || 
                    title.includes('final') || title.includes('term') ||
                    title.includes('end of term');
      
      if (isExam) {
        analysis.examScores.push({
          subject: subject,
          score: result.score,
          testType: testType,
          testTitle: result.testId?.title,
          session: result.session,
          term: result.term
        });
      } else {
        analysis.caScores.push({
          subject: subject,
          score: result.score,
          testType: testType,
          testTitle: result.testId?.title,
          session: result.session,
          term: result.term
        });
      }
    });
    
    res.json({
      student: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        middleName: student.middleName,
        username: student.username,
        studentId: student.studentId,
        fullName: `${student.firstName || ''} ${student.middleName || ''} ${student.lastName || ''}`.trim(),
        class: student.class,
        classType: typeof student.class,
        profileImage: student.profileImage,
        picture: student.picture,
        reportCardVisibleToParent: student.reportCardVisibleToParent,
        reportCardScheduledVisibility: student.reportCardScheduledVisibility,
        parents: student.parents
      },
      query: {
        studentId,
        sessionName,
        termName,
        fullSession,
        queryUsed
      },
      resultsCount: results.length,
      analysis: analysis,
      allResults: results.map(r => ({
        id: r._id,
        subject: r.subject || r.testId?.subject,
        score: r.score,
        session: r.session,
        term: r.term,
        testType: r.testId?.type,
        testTitle: r.testId?.title,
        totalMarks: r.testId?.totalMarks
      })),
      groupedData: results.reduce((acc, result) => {
        const subject = result.subject || result.testId?.subject || 'Unknown';
        if (!acc[subject]) acc[subject] = [];
        acc[subject].push({
          type: result.testId?.type,
          title: result.testId?.title,
          score: result.score,
          session: result.session,
          term: result.term
        });
        return acc;
      }, {})
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATED: Test type identification endpoint
router.get('/test-types/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const results = await Result.find({ 
      userId: studentId,
      isActive: true 
    })
    .populate('testId', 'title type subject')
    .limit(50)
    .lean();
    
    const testTypes = results.map(r => ({
      subject: r.subject || r.testId?.subject,
      testTitle: r.testId?.title,
      testType: r.testId?.type,
      score: r.score,
      session: r.session,
      term: r.term
    }));
    
    res.json({
      testTypes,
      uniqueTypes: [...new Set(testTypes.map(t => t.testType))],
      uniqueTitles: [...new Set(testTypes.map(t => t.testTitle))].filter(Boolean),
      uniqueSessions: [...new Set(testTypes.map(t => t.session))],
      uniqueTerms: [...new Set(testTypes.map(t => t.term))].filter(Boolean)
    });
    
  } catch (error) {
    console.error('Test types error:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATED: New endpoint to get student profile image
router.get('/student/:studentId/profile-image', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    console.log('GET /api/reports/student/:studentId/profile-image - Request:', {
      studentId,
      user: req.user.username
    });
    
    const student = await User.findById(studentId)
      .select('profileImage picture firstName lastName username')
      .lean();
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Check permissions
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Try to find the profile image file
    const imagePaths = [
      path.join(__dirname, '../../uploads/profiles', student.profileImage || ''),
      path.join(__dirname, '../../../uploads/profiles', student.profileImage || ''),
      path.join(__dirname, '../../Uploads', student.picture || ''),
      path.join(__dirname, '../../../Uploads', student.picture || ''),
    ];
    
    let imagePath = null;
    for (const path of imagePaths) {
      if (fs.existsSync(path)) {
        imagePath = path;
        break;
      }
    }
    
    if (imagePath) {
      res.setHeader('Content-Type', 'image/jpeg');
      fs.createReadStream(imagePath).pipe(res);
    } else {
      // Return a default placeholder image
      res.status(404).json({ 
        error: 'Profile image not found',
        message: 'Using default placeholder',
        student: {
          firstName: student.firstName,
          lastName: student.lastName,
          username: student.username
        }
      });
    }
    
  } catch (error) {
    console.error('Profile image error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// SIGNATURE UPLOAD ENDPOINTS
// ============================================================

// Get all signatures
router.get('/signatures', auth, adminOnly, async (req, res) => {
  try {
    console.log('GET /api/reports/signatures - Fetching all signatures');
    
    const signatures = await Signature.find()
      .populate('class', 'name shortName level')
      .populate('uploadedBy', 'firstName lastName username')
      .sort({ updatedAt: -1 })
      .lean();
    
    res.json({
      success: true,
      signatures,
      total: signatures.length
    });
  } catch (error) {
    console.error('Get signatures error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch signatures',
      error: error.message
    });
  }
});

// Get signature for a specific class
router.get('/signatures/class/:classId', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    
    console.log('GET /api/reports/signatures/class/:classId - Fetching signature for class:', classId);
    
    const signature = await Signature.findOne({ class: classId })
      .populate('class', 'name shortName level')
      .populate('uploadedBy', 'firstName lastName username')
      .lean();
    
    if (!signature) {
      return res.status(404).json({
        success: false,
        message: 'No signature found for this class'
      });
    }
    
    res.json({
      success: true,
      signature
    });
  } catch (error) {
    console.error('Get class signature error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class signature',
      error: error.message
    });
  }
});

// Upload/update signatures (Admin only)
router.post('/signatures/upload', auth, adminOnly, async (req, res) => {
  try {
    console.log('POST /api/reports/signatures/upload - Uploading signature');
    
    // Check if files were uploaded
    if (!req.files || (!req.files.teacherSignature && !req.files.principalSignature)) {
      return res.status(400).json({
        success: false,
        message: 'No signature files uploaded'
      });
    }
    
    const { classId, className } = req.body;
    
    // Validate class
    if (!classId && !className) {
      return res.status(400).json({
        success: false,
        message: 'Class ID or Class Name is required'
      });
    }
    
    let classObj = null;
    if (classId && mongoose.isValidObjectId(classId)) {
      classObj = await Class.findById(classId);
    } else if (className) {
      classObj = await Class.findOne({ 
        $or: [
          { name: className },
          { shortName: className }
        ]
      });
    }
    
    if (!classObj && classId !== 'principal') {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    // Handle file uploads
    const uploadDir = path.join(__dirname, '../../Uploads');
    
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const signatureData = {
      uploadedBy: req.user._id,
      updatedAt: new Date()
    };
    
    // Upload teacher signature
    if (req.files.teacherSignature) {
      const teacherFile = req.files.teacherSignature;
      const teacherExt = path.extname(teacherFile.name);
      const teacherFileName = `teacher_signature_${classObj?._id || 'principal'}_${Date.now()}${teacherExt}`;
      const teacherPath = path.join(uploadDir, teacherFileName);
      
      await teacherFile.mv(teacherPath);
      signatureData.teacherSignature = teacherFileName;
      console.log('✅ Teacher signature uploaded:', teacherFileName);
    }
    
    // Upload principal signature
    if (req.files.principalSignature) {
      const principalFile = req.files.principalSignature;
      const principalExt = path.extname(principalFile.name);
      const principalFileName = `principal_signature_${Date.now()}${principalExt}`;
      const principalPath = path.join(uploadDir, principalFileName);
      
      await principalFile.mv(principalPath);
      signatureData.principalSignature = principalFileName;
      console.log('✅ Principal signature uploaded:', principalFileName);
    }
    
    // Find existing signature or create new
    let signature;
    if (classObj) {
      signature = await Signature.findOne({ class: classObj._id });
      
      if (signature) {
        // Update existing signature
        if (signatureData.teacherSignature) signature.teacherSignature = signatureData.teacherSignature;
        if (signatureData.principalSignature) signature.principalSignature = signatureData.principalSignature;
        signature.uploadedBy = signatureData.uploadedBy;
        signature.updatedAt = signatureData.updatedAt;
        
        await signature.save();
      } else {
        // Create new signature
        signatureData.class = classObj._id;
        signature = new Signature(signatureData);
        await signature.save();
      }
    } else {
      // Principal signature (global, not class-specific)
      signature = await Signature.findOne({ class: null });
      
      if (signature) {
        if (signatureData.principalSignature) signature.principalSignature = signatureData.principalSignature;
        signature.uploadedBy = signatureData.uploadedBy;
        signature.updatedAt = signatureData.updatedAt;
        
        await signature.save();
      } else {
        signatureData.class = null; // Global principal signature
        signature = new Signature(signatureData);
        await signature.save();
      }
    }
    
    // Populate response
    const populatedSignature = await Signature.findById(signature._id)
      .populate('class', 'name shortName level')
      .populate('uploadedBy', 'firstName lastName username')
      .lean();
    
    res.json({
      success: true,
      message: 'Signature uploaded successfully',
      signature: populatedSignature
    });
    
  } catch (error) {
    console.error('Upload signature error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload signature',
      error: error.message
    });
  }
});

// Delete signature (Admin only)
router.delete('/signatures/:signatureId', auth, adminOnly, async (req, res) => {
  try {
    const { signatureId } = req.params;
    
    console.log('DELETE /api/reports/signatures/:signatureId - Deleting signature:', signatureId);
    
    const signature = await Signature.findById(signatureId);
    
    if (!signature) {
      return res.status(404).json({
        success: false,
        message: 'Signature not found'
      });
    }
    
    // Delete signature files from uploads directory
    const uploadDir = path.join(__dirname, '../../Uploads');
    
    if (signature.teacherSignature) {
      const teacherPath = path.join(uploadDir, signature.teacherSignature);
      if (fs.existsSync(teacherPath)) {
        fs.unlinkSync(teacherPath);
      }
    }
    
    if (signature.principalSignature) {
      const principalPath = path.join(uploadDir, signature.principalSignature);
      if (fs.existsSync(principalPath)) {
        fs.unlinkSync(principalPath);
      }
    }
    
    // Delete signature record
    await Signature.findByIdAndDelete(signatureId);
    
    res.json({
      success: true,
      message: 'Signature deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete signature error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete signature',
      error: error.message
    });
  }
});

// Get global principal signature
router.get('/signatures/principal', auth, async (req, res) => {
  try {
    console.log('GET /api/reports/signatures/principal - Fetching principal signature');
    
    const signature = await Signature.findOne({ class: null })
      .populate('uploadedBy', 'firstName lastName username')
      .lean();
    
    if (!signature) {
      return res.status(404).json({
        success: false,
        message: 'Principal signature not found'
      });
    }
    
    res.json({
      success: true,
      signature
    });
  } catch (error) {
    console.error('Get principal signature error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch principal signature',
      error: error.message
    });
  }
});

// Preview signature image
router.get('/signatures/preview/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    
    console.log('GET /api/reports/signatures/preview/:filename - Previewing signature:', filename);
    
    const signaturePath = path.join(__dirname, '../../Uploads', filename);
    
    if (!fs.existsSync(signaturePath)) {
      return res.status(404).json({
        success: false,
        message: 'Signature file not found'
      });
    }
    
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/png'; // default
    
    if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.gif') {
      contentType = 'image/gif';
    } else if (ext === '.svg') {
      contentType = 'image/svg+xml';
    }
    
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(signaturePath).pipe(res);
    
  } catch (error) {
    console.error('Preview signature error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview signature',
      error: error.message
    });
  }
});

// Get signature statistics
router.get('/signatures/stats', auth, adminOnly, async (req, res) => {
  try {
    console.log('GET /api/reports/signatures/stats - Fetching signature statistics');
    
    const stats = {
      totalSignatures: await Signature.countDocuments(),
      classSignatures: await Signature.countDocuments({ class: { $ne: null } }),
      principalSignature: await Signature.exists({ class: null }),
      recentUploads: await Signature.find()
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate('class', 'name')
        .populate('uploadedBy', 'firstName lastName')
        .select('teacherSignature principalSignature updatedAt')
        .lean()
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get signature stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch signature statistics',
      error: error.message
    });
  }
});

// ============================================================
// BULK SIGNATURE MANAGEMENT
// ============================================================

// Bulk assign same teacher signature to multiple classes
router.post('/signatures/bulk-assign', auth, adminOnly, async (req, res) => {
  try {
    const { classIds, teacherSignatureFile } = req.body;
    
    console.log('POST /api/reports/signatures/bulk-assign - Bulk assigning signature to classes:', {
      classCount: classIds?.length,
      hasFile: !!teacherSignatureFile
    });
    
    if (!Array.isArray(classIds) || classIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Class IDs array is required'
      });
    }
    
    if (!teacherSignatureFile || !teacherSignatureFile.startsWith('data:image')) {
      return res.status(400).json({
        success: false,
        message: 'Valid base64 teacher signature image is required'
      });
    }
    
    const results = [];
    const errors = [];
    
    // Process each class
    for (const classId of classIds) {
      try {
        const classObj = await Class.findById(classId);
        if (!classObj) {
          errors.push({
            classId,
            error: 'Class not found'
          });
          continue;
        }
        
        // Convert base64 to file
        const matches = teacherSignatureFile.match(/^data:image\/(\w+);base64,/);
        if (!matches) {
          errors.push({
            classId,
            error: 'Invalid base64 image format'
          });
          continue;
        }
        
        const mimeType = matches[1];
        const extension = mimeType === 'jpeg' ? 'jpg' : mimeType;
        const base64Data = teacherSignatureFile.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        const uploadDir = path.join(__dirname, '../../Uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const fileName = `teacher_signature_${classId}_${Date.now()}.${extension}`;
        const filePath = path.join(uploadDir, fileName);
        
        fs.writeFileSync(filePath, buffer);
        
        // Update or create signature record
        let signature = await Signature.findOne({ class: classId });
        if (signature) {
          // Delete old file if exists
          if (signature.teacherSignature) {
            const oldPath = path.join(uploadDir, signature.teacherSignature);
            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
            }
          }
          
          signature.teacherSignature = fileName;
          signature.uploadedBy = req.user._id;
          signature.updatedAt = new Date();
          await signature.save();
        } else {
          signature = new Signature({
            class: classId,
            teacherSignature: fileName,
            uploadedBy: req.user._id
          });
          await signature.save();
        }
        
        results.push({
          classId,
          className: classObj.name,
          success: true,
          fileName
        });
        
      } catch (error) {
        errors.push({
          classId,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Bulk assignment completed: ${results.length} successful, ${errors.length} failed`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Bulk assign signatures error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk assign signatures',
      error: error.message
    });
  }
});

module.exports = router;
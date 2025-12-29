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
  
  // FIXED: Include term in the main title
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
  
  // If term is provided, also show it separately (for clarity)
  if (term) {
    // Optional: You can also show term here if you want it displayed twice
    // doc.text(`Term: ${term.charAt(0).toUpperCase() + term.slice(1)}`, LAYOUT.margin, logoY + 85, { 
    //   width: doc.page.width - (LAYOUT.margin * 2), 
    //   align: 'center' 
    // });
  }
  
  return LAYOUT.headerHeight + LAYOUT.sectionGap;
};

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
  
  // Handle student picture
  if (student.picture) {
    const picturePath = path.join(__dirname, '../../Uploads', student.picture);
    if (fs.existsSync(picturePath)) {
      doc.image(picturePath, photoX, photoY, { width: 50, height: 50 });
    } else {
      // Try alternative path if default doesn't work
      const altPicturePath = path.join(__dirname, '../../../Uploads', student.picture);
      if (fs.existsSync(altPicturePath)) {
        doc.image(altPicturePath, photoX, photoY, { width: 50, height: 50 });
      } else {
        drawPlaceholderPhoto(doc, photoX, photoY);
      }
    }
  } else {
    drawPlaceholderPhoto(doc, photoX, photoY);
  }
  
  // Get class name properly - handle both object and string
  let className = 'N/A';
  if (student.class) {
    if (typeof student.class === 'object' && student.class.name) {
      className = student.class.name;
    } else if (typeof student.class === 'string') {
      className = student.class;
    }
  }
  
  const studentName = `${student.name || ''} ${student.surname || ''}`.trim() || 'N/A';
  const info = [
    { label: 'Name:', value: studentName },
    { label: 'Class:', value: className },
    { label: 'Subjects:', value: reportData.numSubjects || 0 },
    { label: 'Position:', value: `${position} of ${classSize}` },
    { label: 'Attendance:', value: `${attendance.present || 0}/${attendance.totalDays || 0}` },
    { label: 'Date of Birth:', value: student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-GB') : 'N/A' },
    { label: 'Sex:', value: student.sex || 'N/A' },
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
     .text('Student Photo', x + 5, y + 20, { width: 40, align: 'center' });
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

// Main report card endpoint with term parameter
router.get('/export/report/:studentId/:session', auth, async (req, res) => {
  try {
    console.log('GET /api/reports/export/report/:studentId/:session - Request:', {
      params: req.params,
      query: req.query,
      user: req.user.username,
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
      user: req.user.username
    });
    
    // Get student with proper class population
    const student = await User.findById(studentId)
      .populate({
        path: 'class',
        select: 'name level'
      })
      .lean();
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Check permissions
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({ error: 'Students can only view their own report cards' });
    }
    
    // Query results with better filtering - FIXED: Include both session formats
    const query = {
      userId: studentId,
      $or: [
        { session: fullSession }, // Format: "2025/2026 First Term"
        { session: sessionName }, // Format: "2025/2026" (might also be stored this way)
        { 
          session: { $regex: `^${sessionName}`, $options: 'i' } // Starts with session name
        }
      ],
      isActive: true
    };
    
    console.log('🔍 Querying results with:', query);
    
    const results = await Result.find(query)
      .populate('testId', 'title type subject totalMarks')
      .populate({
        path: 'class',
        select: 'name'
      })
      .sort({ subject: 1, submittedAt: -1 })
      .lean();
    
    if (results.length === 0) {
      return res.status(404).json({ 
        error: `No results found for ${student.name || 'Student'} in ${fullSession}` 
      });
    }
    
    console.log('✅ Found results:', results.length);
    console.log('Sample results with test type info:', results.map(r => ({
      subject: r.subject,
      score: r.score,
      testType: r.testId?.type,
      testTitle: r.testId?.title
    })));
    
    // Process results - FIXED: Improved exam score detection
    const reportData = {
      student: `${student.name || ''} ${student.surname || ''}`.trim() || 'Unknown Student',
      class: student.class?.name || 'N/A',
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
      
      // Categorize based on test type AND title - FIXED: More comprehensive detection
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
    
    console.log('📊 Processed report data:', {
      numSubjects: reportData.numSubjects,
      subjects: Object.keys(reportData.subjects),
      sampleSubjectData: reportData.subjects[Object.keys(reportData.subjects)[0]],
      totalScore: reportData.totalScore,
      totalPossible: reportData.totalPossible
    });
    
    // Get class results for position calculation
    const classQuery = { 
      $or: [
        { session: fullSession },
        { session: { $regex: `^${sessionName}`, $options: 'i' } }
      ],
      isActive: true 
    };
    
    // Get student's class ID
    const studentClassId = student.class?._id || student.class;
    if (studentClassId) {
      classQuery.class = studentClassId;
    }
    
    console.log('📊 Calculating position with query:', classQuery);
    
    const classResults = await Result.find(classQuery)
      .populate('userId', 'name surname')
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
    
    console.log('🏆 Position calculation:', {
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
        Title: `Report Card - ${reportData.student}`,
        Author: 'Sanniville Academy',
        Subject: `Academic Report - ${fullSession}`,
      },
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    const filename = `report_${student.name || 'student'}_${sessionName.replace(/\//g, '_')}_${termName.replace(/\s/g, '_')}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    doc.pipe(res);
    
    // Add content to PDF
    addWatermark(doc);
    let currentY = addHeader(doc, sessionName, termName); // Now includes term in header
    currentY = addStudentInfo(doc, currentY, student, reportData, position, classSize, attendance);
    currentY = addPerformanceTable(doc, currentY, reportData);
    currentY = addSummary(doc, currentY, reportData, average, results);
    currentY = await addSignatures(doc, currentY, student.class);
    addFooter(doc);
    
    doc.end();
    
    console.log('✅ Report card generated successfully:', {
      studentId,
      studentName: student.name,
      session: fullSession,
      term: termName,
      filename,
      numSubjects: reportData.numSubjects,
      position: `${position}/${classSize}`,
      examScoresFound: Object.keys(reportData.subjects).some(subject => reportData.subjects[subject].exam > 0)
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

// New endpoint to match your results.js route pattern
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

// Alternative endpoint with combined session/term parameter
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

// Debug endpoint to check data - IMPROVED VERSION
router.get('/debug/:studentId/:session', auth, async (req, res) => {
  try {
    const { studentId, session: sessionName } = req.params;
    const { term } = req.query;
    const termName = term || 'First Term';
    const fullSession = `${sessionName} ${termName}`;
    
    const student = await User.findById(studentId)
      .populate('class', 'name')
      .lean();
    
    // Try multiple session formats
    const results = await Result.find({
      userId: studentId,
      $or: [
        { session: fullSession },
        { session: sessionName },
        { session: { $regex: `^${sessionName}`, $options: 'i' } }
      ],
      isActive: true
    })
    .populate('testId', 'title type subject totalMarks')
    .lean();
    
    // Analyze results
    const analysis = {
      sessionFormatsFound: [],
      testTypesFound: [],
      subjectsFound: [],
      examScores: [],
      caScores: []
    };
    
    results.forEach(result => {
      const session = result.session;
      if (!analysis.sessionFormatsFound.includes(session)) {
        analysis.sessionFormatsFound.push(session);
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
          testTitle: result.testId?.title
        });
      } else {
        analysis.caScores.push({
          subject: subject,
          score: result.score,
          testType: testType,
          testTitle: result.testId?.title
        });
      }
    });
    
    res.json({
      student: {
        name: student.name,
        surname: student.surname,
        class: student.class,
        classType: typeof student.class
      },
      query: {
        studentId,
        sessionName,
        termName,
        fullSession
      },
      resultsCount: results.length,
      analysis: analysis,
      allResults: results.map(r => ({
        id: r._id,
        subject: r.subject || r.testId?.subject,
        score: r.score,
        session: r.session,
        testType: r.testId?.type,
        testTitle: r.testId?.title,
        totalMarks: r.testId?.totalMarks,
        isExam: analysis.examScores.some(e => e.subject === (r.subject || r.testId?.subject) && e.score === r.score)
      })),
      groupedData: results.reduce((acc, result) => {
        const subject = result.subject || result.testId?.subject || 'Unknown';
        if (!acc[subject]) acc[subject] = [];
        acc[subject].push({
          type: result.testId?.type,
          title: result.testId?.title,
          score: result.score,
          isExam: analysis.examScores.some(e => e.subject === subject && e.score === result.score)
        });
        return acc;
      }, {})
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test type identification endpoint
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
      session: r.session
    }));
    
    res.json({
      testTypes,
      uniqueTypes: [...new Set(testTypes.map(t => t.testType))],
      uniqueTitles: [...new Set(testTypes.map(t => t.testTitle))].filter(Boolean)
    });
    
  } catch (error) {
    console.error('Test types error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
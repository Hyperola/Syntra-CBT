const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const AcademicRecord = require('../models/AcademicRecord');
const User = require('../models/User');
const Class = require('../models/Class');
const Result = require('../models/Result');
const { auth } = require('../middleware/auth');

// Get student transcript - FIXED FIELD NAMES (userId instead of studentId)
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

    // Build query for results - FIXED: Use userId (not studentId)
    const resultsQuery = {
      userId: studentId,  // ✅ CORRECT: Changed from studentId to userId
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
      .populate('testId', 'title type')
      .populate('class', 'name level')
      .sort({ session: 1, term: 1, submittedAt: 1 })
      .lean();

    console.log(`📊 Found ${testResults.length} test results`);

    // Get academic records if they exist
    let academicRecords = [];
    if (includePromotion === 'true') {
      try {
        academicRecords = await AcademicRecord.find({
          studentId: studentId,
          isActive: true
        })
        .populate('classId', 'name level')
        .sort({ session: 1, term: 1 })
        .lean();
        
        console.log(`📚 Found ${academicRecords.length} academic records`);
      } catch (err) {
        console.warn('⚠️ Could not fetch academic records:', err.message);
      }
    }

    if (testResults.length === 0 && academicRecords.length === 0) {
      console.log('⚠️ No test results or academic records found');
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
        academicRecords: [],
        summary: {
          message: 'No academic data found for this student'
        },
        generatedAt: new Date().toISOString(),
        isOfficial: false,
        dataSource: 'none'
      });
    }

    // Process test results if available
    let processedResults = [];
    let termRecords = [];
    
    if (testResults.length > 0) {
      console.log('🔍 Processing test results...');
      
      // Group results by session and term
      const groupedByTerm = {};
      
      testResults.forEach(result => {
        if (!result.session || !result.term) {
          console.log('⚠️ Skipping result without session/term:', result._id);
          return;
        }
        
        const key = `${result.session}|${result.term}`;
        if (!groupedByTerm[key]) {
          groupedByTerm[key] = {
            session: result.session,
            term: result.term,
            class: result.class?._id || student.class?._id,
            className: result.class?.name || student.class?.name || 'Unknown',
            level: result.class?.level || student.class?.level || 'N/A',
            results: [],
            subjects: new Set()
          };
        }
        groupedByTerm[key].results.push(result);
        if (result.subject) {
          groupedByTerm[key].subjects.add(result.subject);
        }
      });

      console.log(`📚 Grouped into ${Object.keys(groupedByTerm).length} terms`);
      
      // Process each term to calculate REAL averages
      for (const [key, termData] of Object.entries(groupedByTerm)) {
        try {
          console.log(`\n📝 Processing ${termData.session} - ${termData.term}`);
          console.log(`   Total results: ${termData.results.length}`);
          
          // Group results by subject
          const subjectGroups = {};
          
          termData.results.forEach(result => {
            const subject = result.subject;
            if (!subject) {
              console.log(`   ⚠️ Result ${result._id} has no subject`);
              return;
            }
            
            if (!subjectGroups[subject]) {
              subjectGroups[subject] = {
                scores: [],
                totalMarks: [],
                percentages: [],
                testTypes: new Set(),
                count: 0
              };
            }
            
            // Use the actual percentage from the result
            const percentage = result.percentage || (result.totalMarks > 0 ? (result.score / result.totalMarks) * 100 : 0);
            
            subjectGroups[subject].scores.push(result.score);
            subjectGroups[subject].totalMarks.push(result.totalMarks);
            subjectGroups[subject].percentages.push(percentage);
            
            if (result.testId?.type) {
              subjectGroups[subject].testTypes.add(result.testId.type);
            } else if (result.testId?.title) {
              // Try to infer type from title
              const title = result.testId.title.toLowerCase();
              if (title.includes('ca') || title.includes('continuous')) {
                subjectGroups[subject].testTypes.add('CA');
              } else if (title.includes('exam')) {
                subjectGroups[subject].testTypes.add('Exam');
              }
            }
            
            subjectGroups[subject].count++;
          });

          // Calculate REAL averages for each subject
          const subjectGrades = {};
          let totalWeightedPercentage = 0;
          let totalCredits = 0;
          let totalRawScore = 0;
          let totalPossible = 0;

          for (const [subject, data] of Object.entries(subjectGroups)) {
            // Calculate REAL average percentage from actual test results
            let averagePercentage;
            if (data.percentages.length > 0) {
              // Simple average of percentages from all tests
              averagePercentage = data.percentages.reduce((a, b) => a + b, 0) / data.percentages.length;
            } else {
              // Fallback: Calculate from scores
              const totalScore = data.scores.reduce((a, b) => a + b, 0);
              const totalPossibleMarks = data.totalMarks.reduce((a, b) => a + b, 0);
              averagePercentage = totalPossibleMarks > 0 ? (totalScore / totalPossibleMarks) * 100 : 0;
            }
            
            // Calculate average score (for display)
            const avgScore = data.scores.length > 0 ? 
              data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0;
            const avgTotalMarks = data.totalMarks.length > 0 ? 
              data.totalMarks.reduce((a, b) => a + b, 0) / data.totalMarks.length : 100;

            // Calculate grade based on average percentage
            let grade, gradePoint;
            const finalPercentage = averagePercentage;
            
            if (finalPercentage >= 90) { grade = 'A+'; gradePoint = 5.0; }
            else if (finalPercentage >= 80) { grade = 'A'; gradePoint = 4.0; }
            else if (finalPercentage >= 70) { grade = 'B'; gradePoint = 3.5; }
            else if (finalPercentage >= 65) { grade = 'B-'; gradePoint = 3.0; }
            else if (finalPercentage >= 60) { grade = 'C+'; gradePoint = 2.5; }
            else if (finalPercentage >= 55) { grade = 'C'; gradePoint = 2.0; }
            else if (finalPercentage >= 50) { grade = 'C-'; gradePoint = 1.5; }
            else if (finalPercentage >= 45) { grade = 'D+'; gradePoint = 1.0; }
            else if (finalPercentage >= 40) { grade = 'D'; gradePoint = 0.5; }
            else { grade = 'F'; gradePoint = 0.0; }

            // Get subject credits
            const credits = getSubjectCredits(subject);
            
            // Store subject grade
            subjectGrades[subject] = {
              subject: subject,
              averageScore: avgScore.toFixed(1),
              averageTotalMarks: avgTotalMarks.toFixed(1),
              percentage: finalPercentage.toFixed(1),
              grade: grade,
              gradePoint: gradePoint,
              credits: credits,
              testCount: data.count,
              testTypes: Array.from(data.testTypes),
              remark: getRemark(finalPercentage)
            };

            // For term average calculation (weighted by credits)
            totalWeightedPercentage += finalPercentage * credits;
            totalCredits += credits;
            
            // For raw totals
            totalRawScore += data.scores.reduce((a, b) => a + b, 0);
            totalPossible += data.totalMarks.reduce((a, b) => a + b, 0);
          }

          // Calculate term average (weighted by credits)
          const termAverage = totalCredits > 0 ? 
            (totalWeightedPercentage / totalCredits) : 0;

          // Calculate term GPA (weighted by credits)
          const subjectGradePoints = Object.values(subjectGrades).map(g => ({
            gradePoint: g.gradePoint,
            credits: g.credits
          }));
          
          const totalGradePoints = subjectGradePoints.reduce((sum, g) => 
            sum + (g.gradePoint * g.credits), 0);
          const totalGPAWeight = subjectGradePoints.reduce((sum, g) => 
            sum + g.credits, 0);
          
          const termGPA = totalGPAWeight > 0 ? (totalGradePoints / totalGPAWeight) : 0;

          // Determine promotion status based on 40% criteria (matching promotion.js)
          const promoted = termAverage >= 40;

          // Prepare term record for response
          const termRecord = {
            session: termData.session,
            term: termData.term,
            class: termData.className,
            level: termData.level,
            grades: subjectGrades,
            totalScore: Math.round(totalRawScore),
            totalPossible: Math.round(totalPossible),
            average: termAverage.toFixed(1),
            gpa: termGPA.toFixed(2),
            promoted: promoted,
            promotionEligibility: promoted,
            promotionCriteria: '40%',
            attendance: 95, // Default - should come from attendance system
            conduct: getConduct(termAverage),
            testCount: termData.results.length,
            subjectCount: Object.keys(subjectGrades).length,
            dataType: 'test_results',
            summary: {
              totalTests: termData.results.length,
              averageScore: (totalRawScore / totalPossible * 100).toFixed(1) + '%',
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
          };

          termRecords.push(termRecord);
          processedResults.push(termRecord);

          // Create/update academic record if needed
          if (rebuild === 'true') {
            try {
              await AcademicRecord.findOneAndUpdate(
                {
                  studentId: studentId,
                  session: termData.session,
                  term: termData.term
                },
                {
                  studentId: studentId,
                  classId: termData.class,
                  session: termData.session,
                  term: termData.term,
                  grades: Object.values(subjectGrades).map(g => ({
                    subject: g.subject,
                    subjectCode: getSubjectCode(g.subject),
                    score: parseFloat(g.averageScore),
                    grade: g.grade,
                    gradePoint: g.gradePoint,
                    remark: g.remark,
                    credits: g.credits
                  })),
                  totalScore: Math.round(totalRawScore),
                  average: termAverage,
                  gpa: termGPA,
                  finalScore: termAverage,
                  promoted: promoted,
                  conduct: getConduct(termAverage),
                  createdBy: user._id || new mongoose.Types.ObjectId(),
                  updatedBy: user._id || new mongoose.Types.ObjectId(),
                  isActive: true
                },
                {
                  upsert: true,
                  new: true,
                  runValidators: true
                }
              );
              console.log(`✅ Saved academic record for ${termData.session} - ${termData.term}`);
            } catch (saveError) {
              console.error(`❌ Error saving academic record:`, saveError.message);
            }
          }

        } catch (error) {
          console.error(`❌ Error processing term ${key}:`, error.message);
        }
      }
    }

    // Process academic records if available
    let processedAcademicRecords = [];
    if (academicRecords.length > 0) {
      console.log('📚 Processing academic records...');
      
      processedAcademicRecords = academicRecords.map(record => {
        // Calculate grades from academic record
        const subjectGrades = {};
        let totalWeightedPercentage = 0;
        let totalCredits = 0;
        let totalRawScore = 0;
        let totalPossible = 0;

        if (record.grades && record.grades.length > 0) {
          record.grades.forEach(grade => {
            const subject = grade.subject;
            const percentage = grade.score || 0; // Using score as percentage
            
            subjectGrades[subject] = {
              subject: subject,
              averageScore: grade.score?.toFixed(1) || '0.0',
              averageTotalMarks: '100.0', // Default for academic records
              percentage: percentage.toFixed(1),
              grade: grade.grade || calculateGradeFromScore(percentage),
              gradePoint: grade.gradePoint || 0,
              credits: grade.credits || 2,
              testCount: 1,
              testTypes: ['Academic Record'],
              remark: grade.remark || getRemark(percentage)
            };

            totalWeightedPercentage += percentage * (grade.credits || 2);
            totalCredits += (grade.credits || 2);
            totalRawScore += percentage; // Using percentage as score
            totalPossible += 100; // Assuming 100 as total possible
          });
        }

        // Calculate term average
        const termAverage = totalCredits > 0 ? 
          (totalWeightedPercentage / totalCredits) : (record.average || 0);
        
        const termGPA = record.gpa || (totalCredits > 0 ? 
          (Object.values(subjectGrades).reduce((sum, g) => sum + (g.gradePoint * g.credits), 0) / totalCredits) : 0);

        return {
          session: record.session,
          term: record.term || 'Full Year',
          class: record.classId?.name || 'Unknown',
          level: record.classId?.level || 'N/A',
          grades: subjectGrades,
          totalScore: record.totalScore || Math.round(totalRawScore),
          totalPossible: record.totalPossible || Math.round(totalPossible),
          average: termAverage.toFixed(1),
          gpa: termGPA.toFixed(2),
          promoted: record.promoted || termAverage >= 40,
          promotionEligibility: record.promoted || termAverage >= 40,
          promotionCriteria: '40%',
          attendance: record.attendance?.percentage || 0,
          conduct: record.conduct || getConduct(termAverage),
          testCount: 0,
          subjectCount: Object.keys(subjectGrades).length,
          dataType: 'academic_record',
          isArchived: record.isArchived,
          isPromotionRecord: record.isPromotionRecord,
          summary: {
            totalTests: 0,
            averageScore: termAverage.toFixed(1) + '%',
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
        };
      });
    }

    // Combine records from both sources, removing duplicates
    const allRecords = [...processedResults];
    const seenSessions = new Set(processedResults.map(r => `${r.session}|${r.term}`));
    
    processedAcademicRecords.forEach(record => {
      const key = `${record.session}|${record.term}`;
      if (!seenSessions.has(key)) {
        allRecords.push(record);
        seenSessions.add(key);
      }
    });

    // Sort all records by session and term
    allRecords.sort((a, b) => {
      const sessionA = a.session || '';
      const sessionB = b.session || '';
      if (sessionA !== sessionB) return sessionB.localeCompare(sessionA); // Newest first
      
      const termOrder = { 'First Term': 1, 'Second Term': 2, 'Third Term': 3, 'Full Year': 4 };
      return (termOrder[b.term] || 0) - (termOrder[a.term] || 0);
    });

    // Calculate cumulative statistics
    const cumulativeStats = calculateCumulativeStats(allRecords);

    console.log('\n✅ Final Transcript Summary:');
    console.log(`   Student: ${studentName}`);
    console.log(`   Total Terms: ${allRecords.length}`);
    console.log(`   Cumulative Average: ${cumulativeStats.cumulativeAverage}`);
    console.log(`   Cumulative GPA: ${cumulativeStats.cumulativeGPA}`);
    console.log(`   Total Subjects: ${cumulativeStats.totalSubjects}`);

    // Format the response
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
        note: "Official Academic Transcript - Calculated from actual test results",
        promotionCriteria: "40% minimum average required for promotion"
      },
      records: allRecords,
      summary: cumulativeStats,
      generatedAt: new Date().toISOString(),
      generatedBy: user.name || user.username || user.email,
      isOfficial: allRecords.length > 0,
      status: "Official Transcript",
      dataSources: {
        testResults: processedResults.length,
        academicRecords: processedAcademicRecords.length,
        totalRecords: allRecords.length
      },
      metadata: {
        totalTestResults: testResults.length,
        termsProcessed: allRecords.length,
        calculationMethod: "Weighted average by subject credits",
        promotionEligibility: "Based on 40% session average (matching promotion system)"
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

// Get specific term transcript - FIXED FIELD NAMES
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

    // Check academic records first
    const academicRecord = await AcademicRecord.findOne({
      studentId: studentId,
      session: session,
      term: term,
      isActive: true
    })
    .populate('classId', 'name level')
    .lean();

    // Get results for specific term - FIXED: Use userId (not studentId)
    const results = await Result.find({
      userId: studentId,  // ✅ CORRECT: Changed from studentId to userId
      session: session,
      term: term,
      isActive: true
    })
    .populate('testId', 'title type')
    .populate('class', 'name level')
    .sort({ submittedAt: 1 })
    .lean();

    // Use academic record if available, otherwise calculate from results
    if (academicRecord) {
      const studentName = student.name && student.surname ? 
        `${student.name} ${student.surname}` : student.name;
      
      const subjectGrades = {};
      let totalWeightedPercentage = 0;
      let totalCredits = 0;

      if (academicRecord.grades && academicRecord.grades.length > 0) {
        academicRecord.grades.forEach(grade => {
          const subject = grade.subject;
          const percentage = grade.score || 0;
          
          subjectGrades[subject] = {
            subject: subject,
            averageScore: grade.score?.toFixed(1) || '0.0',
            averageTotalMarks: '100.0',
            percentage: percentage.toFixed(1),
            grade: grade.grade || calculateGradeFromScore(percentage),
            gradePoint: grade.gradePoint || 0,
            credits: grade.credits || 2,
            testCount: 1,
            testTypes: ['Academic Record'],
            remark: grade.remark || getRemark(percentage)
          };

          totalWeightedPercentage += percentage * (grade.credits || 2);
          totalCredits += (grade.credits || 2);
        });
      }

      const termAverage = totalCredits > 0 ? 
        (totalWeightedPercentage / totalCredits) : (academicRecord.average || 0);

      const termData = {
        session: academicRecord.session,
        term: academicRecord.term,
        class: academicRecord.classId?.name || 'Unknown',
        level: academicRecord.classId?.level || 'N/A',
        grades: subjectGrades,
        totalScore: academicRecord.totalScore || 0,
        totalPossible: academicRecord.totalPossible || 0,
        average: termAverage.toFixed(1),
        gpa: academicRecord.gpa?.toFixed(2) || '0.00',
        promoted: academicRecord.promoted || termAverage >= 40,
        promotionEligibility: academicRecord.promoted || termAverage >= 40,
        testCount: 0,
        subjectCount: Object.keys(subjectGrades).length,
        dataType: 'academic_record',
        isArchived: academicRecord.isArchived,
        attendance: academicRecord.attendance?.percentage || 0,
        conduct: academicRecord.conduct || getConduct(termAverage)
      };

      return res.json({
        success: true,
        student: {
          name: studentName,
          studentId: student.studentId || student.username,
          class: student.class?.name
        },
        term: termData,
        source: 'academic_record',
        generatedAt: new Date().toISOString()
      });
    }

    // Calculate from results if no academic record
    if (results.length === 0) {
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
    const subjectGroups = {};
    
    results.forEach(result => {
      const subject = result.subject;
      if (!subject) return;
      
      if (!subjectGroups[subject]) {
        subjectGroups[subject] = {
          scores: [],
          totalMarks: [],
          percentages: [],
          testTypes: new Set(),
          count: 0
        };
      }
      
      const percentage = result.percentage || (result.totalMarks > 0 ? (result.score / result.totalMarks) * 100 : 0);
      
      subjectGroups[subject].scores.push(result.score);
      subjectGroups[subject].totalMarks.push(result.totalMarks);
      subjectGroups[subject].percentages.push(percentage);
      
      if (result.testId?.type) {
        subjectGroups[subject].testTypes.add(result.testId.type);
      }
      
      subjectGroups[subject].count++;
    });

    // Calculate subject averages
    const subjectGrades = {};
    let totalWeightedPercentage = 0;
    let totalCredits = 0;
    let totalRawScore = 0;
    let totalPossible = 0;

    Object.entries(subjectGroups).forEach(([subject, data]) => {
      // Calculate average percentage
      const averagePercentage = data.percentages.length > 0 ?
        data.percentages.reduce((a, b) => a + b, 0) / data.percentages.length : 0;

      // Calculate grade
      let grade, gradePoint;
      if (averagePercentage >= 90) { grade = 'A+'; gradePoint = 5.0; }
      else if (averagePercentage >= 80) { grade = 'A'; gradePoint = 4.0; }
      else if (averagePercentage >= 70) { grade = 'B'; gradePoint = 3.5; }
      else if (averagePercentage >= 65) { grade = 'B-'; gradePoint = 3.0; }
      else if (averagePercentage >= 60) { grade = 'C+'; gradePoint = 2.5; }
      else if (averagePercentage >= 55) { grade = 'C'; gradePoint = 2.0; }
      else if (averagePercentage >= 50) { grade = 'C-'; gradePoint = 1.5; }
      else if (averagePercentage >= 45) { grade = 'D+'; gradePoint = 1.0; }
      else if (averagePercentage >= 40) { grade = 'D'; gradePoint = 0.5; }
      else { grade = 'F'; gradePoint = 0.0; }

      const credits = getSubjectCredits(subject);
      
      subjectGrades[subject] = {
        subject: subject,
        averageScore: (data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(1),
        averageTotalMarks: (data.totalMarks.reduce((a, b) => a + b, 0) / data.totalMarks.length).toFixed(1),
        percentage: averagePercentage.toFixed(1),
        grade: grade,
        gradePoint: gradePoint,
        credits: credits,
        testCount: data.count,
        testTypes: Array.from(data.testTypes),
        remark: getRemark(averagePercentage)
      };

      totalWeightedPercentage += averagePercentage * credits;
      totalCredits += credits;
      totalRawScore += data.scores.reduce((a, b) => a + b, 0);
      totalPossible += data.totalMarks.reduce((a, b) => a + b, 0);
    });

    // Calculate term average
    const termAverage = totalCredits > 0 ? 
      (totalWeightedPercentage / totalCredits).toFixed(1) : '0.0';

    // Calculate term GPA
    const totalGradePoints = Object.values(subjectGrades).reduce((sum, g) => 
      sum + (g.gradePoint * g.credits), 0);
    const totalGPAWeight = Object.values(subjectGrades).reduce((sum, g) => 
      sum + g.credits, 0);
    const termGPA = totalGPAWeight > 0 ? (totalGradePoints / totalGPAWeight).toFixed(2) : '0.00';

    const termData = {
      session: session,
      term: term,
      class: results[0]?.class?.name || student.class?.name || 'Not assigned',
      level: results[0]?.class?.level || student.class?.level || 'N/A',
      grades: subjectGrades,
      totalScore: Math.round(totalRawScore),
      totalPossible: Math.round(totalPossible),
      average: termAverage,
      gpa: termGPA,
      promoted: parseFloat(termAverage) >= 40,
      promotionEligibility: parseFloat(termAverage) >= 40,
      promotionCriteria: '40%',
      testCount: results.length,
      subjectCount: Object.keys(subjectGrades).length,
      dataType: 'test_results',
      attendance: 95,
      conduct: getConduct(parseFloat(termAverage))
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

// Get student results summary - FIXED FIELD NAMES
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

    // Get all results - FIXED: Use userId (not studentId)
    const results = await Result.find({
      userId: studentId,  // ✅ CORRECT: Changed from studentId to userId
      isActive: true
    })
    .sort({ session: 1, term: 1 })
    .lean();

    // Get academic records
    const academicRecords = await AcademicRecord.find({
      studentId: studentId,
      isActive: true
    })
    .lean();

    const hasData = results.length > 0 || academicRecords.length > 0;

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

    // Process all data for summary
    let allRecords = [];

    // Process results
    if (results.length > 0) {
      const resultsBySession = {};
      
      results.forEach(result => {
        const key = `${result.session}|${result.term}`;
        if (!resultsBySession[key]) {
          resultsBySession[key] = {
            session: result.session,
            term: result.term,
            totalScore: 0,
            totalPossible: 0,
            count: 0,
            subjects: new Set()
          };
        }
        
        resultsBySession[key].totalScore += result.score;
        resultsBySession[key].totalPossible += result.totalMarks;
        resultsBySession[key].count++;
        if (result.subject) resultsBySession[key].subjects.add(result.subject);
      });

      Object.values(resultsBySession).forEach(sessionData => {
        const percentage = sessionData.totalPossible > 0 ? 
          (sessionData.totalScore / sessionData.totalPossible * 100) : 0;
        
        allRecords.push({
          session: sessionData.session,
          term: sessionData.term,
          average: percentage,
          subjectCount: sessionData.subjects.size,
          testCount: sessionData.count,
          dataType: 'test_results'
        });
      });
    }

    // Process academic records
    academicRecords.forEach(record => {
      allRecords.push({
        session: record.session,
        term: record.term || 'Full Year',
        average: record.average || 0,
        subjectCount: record.grades?.length || 0,
        testCount: 0,
        dataType: 'academic_record',
        promoted: record.promoted,
        isArchived: record.isArchived
      });
    });

    // Calculate overall statistics
    const totalTests = results.length;
    const totalSessions = new Set(allRecords.map(r => r.session)).size;
    const overallAverage = allRecords.length > 0 ? 
      allRecords.reduce((sum, r) => sum + r.average, 0) / allRecords.length : 0;
    const totalSubjects = new Set(
      results.map(r => r.subject).filter(Boolean)
    ).size + academicRecords.reduce((sum, r) => sum + (r.grades?.length || 0), 0);
    
    const promotionCount = academicRecords.filter(r => r.promoted === true).length + 
      allRecords.filter(r => r.average >= 40 && r.dataType === 'test_results').length;

    // Get subject stats
    const subjectStats = {};
    
    results.forEach(result => {
      const subject = result.subject;
      if (!subject) return;
      
      if (!subjectStats[subject]) {
        subjectStats[subject] = {
          totalScore: 0,
          totalPossible: 0,
          count: 0,
          percentages: []
        };
      }
      
      subjectStats[subject].totalScore += result.score;
      subjectStats[subject].totalPossible += result.totalMarks;
      subjectStats[subject].count++;
      subjectStats[subject].percentages.push(
        result.percentage || (result.totalMarks > 0 ? (result.score / result.totalMarks) * 100 : 0)
      );
    });

    // Calculate subject averages
    const subjects = Object.keys(subjectStats).map(subject => {
      const stats = subjectStats[subject];
      const averagePercentage = stats.percentages.length > 0 ?
        stats.percentages.reduce((a, b) => a + b, 0) / stats.percentages.length : 0;
      
      return {
        subject,
        totalTests: stats.count,
        averageScore: (stats.totalScore / stats.count).toFixed(1),
        averagePercentage: averagePercentage.toFixed(1),
        totalScore: stats.totalScore,
        totalPossible: stats.totalPossible
      };
    });

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
        overallAverage: overallAverage.toFixed(1) + '%',
        promotionCount,
        promotionRate: allRecords.length > 0 ? 
          ((promotionCount / allRecords.length) * 100).toFixed(0) + '%' : '0%',
        subjects,
        academicRecords: academicRecords.length,
        dataSources: {
          testResults: results.length,
          academicRecords: academicRecords.length
        },
        bestSubject: subjects.length > 0 ? subjects.reduce((best, current) => 
          parseFloat(current.averagePercentage) > parseFloat(best?.averagePercentage || 0) ? current : best
        , subjects[0]) : null,
        worstSubject: subjects.length > 0 ? subjects.reduce((worst, current) => 
          parseFloat(current.averagePercentage) < parseFloat(worst?.averagePercentage || 100) ? current : worst
        , subjects[0]) : null
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
      totalSessions: 0,
      totalTerms: 0,
      cumulativeAverage: "0%",
      cumulativeGPA: "0.00",
      totalSubjects: 0,
      promotionRate: "0%",
      totalTests: 0,
      overallRemark: "No records available"
    };
  }

  // Get all subjects across all terms
  const allSubjects = new Set();
  let totalTests = 0;
  let promotionCount = 0;
  
  records.forEach(record => {
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

  // Calculate cumulative average from term averages
  const termAverages = records.map(r => parseFloat(r.average) || 0);
  const cumulativeAverage = termAverages.length > 0 ? 
    (termAverages.reduce((sum, avg) => sum + avg, 0) / termAverages.length).toFixed(1) : 0;

  // Calculate cumulative GPA
  const termGPAs = records.map(r => parseFloat(r.gpa) || 0);
  const cumulativeGPA = termGPAs.length > 0 ? 
    (termGPAs.reduce((sum, gpa) => sum + gpa, 0) / termGPAs.length).toFixed(2) : '0.00';

  // Calculate promotion rate
  const promotionRate = records.length > 0 ? 
    ((promotionCount / records.length) * 100).toFixed(0) : 0;

  // Find best and worst terms
  let bestTerm = null;
  let worstTerm = null;
  let highestAverage = 0;
  let lowestAverage = 100;

  records.forEach(record => {
    const avg = parseFloat(record.average) || 0;
    if (avg > highestAverage) {
      highestAverage = avg;
      bestTerm = record;
    }
    if (avg < lowestAverage) {
      lowestAverage = avg;
      worstTerm = record;
    }
  });

  // Overall remark based on 40% promotion criteria
  const overallRemark = cumulativeAverage >= 40 ? "ELIGIBLE FOR PROMOTION" : "NOT ELIGIBLE FOR PROMOTION";

  return {
    totalSessions: new Set(records.map(r => r.session)).size,
    totalTerms: records.length,
    cumulativeAverage: `${cumulativeAverage}%`,
    cumulativeGPA,
    totalSubjects: allSubjects.size,
    promotionRate: `${promotionRate}%`,
    totalTests,
    bestTerm: bestTerm ? {
      session: bestTerm.session,
      term: bestTerm.term,
      average: bestTerm.average,
      gpa: bestTerm.gpa,
      class: bestTerm.class
    } : null,
    worstTerm: worstTerm ? {
      session: worstTerm.session,
      term: worstTerm.term,
      average: worstTerm.average,
      gpa: worstTerm.gpa,
      class: worstTerm.class
    } : null,
    overallRemark,
    promotionCriteria: "40% minimum average",
    statistics: {
      highestAverage: highestAverage.toFixed(1),
      lowestAverage: lowestAverage.toFixed(1),
      averageGPA: cumulativeGPA,
      promotionCount
    }
  };
}

function getCurrentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 8 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

module.exports = router;
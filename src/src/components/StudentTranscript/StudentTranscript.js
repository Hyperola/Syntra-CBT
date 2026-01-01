import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Box,
  Grid,
  IconButton,
  Tooltip,
  Alert,
  AlertTitle,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Fade
} from '@mui/material';
import {
  School as SchoolIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Grade as GradeIcon,
  CalendarToday as CalendarIcon,
  Class as ClassIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  BarChart as BarChartIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  Email as EmailIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { styled } from '@mui/material/styles';
import { keyframes } from '@emotion/react';

// ==================== STYLED COMPONENTS ====================

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const StyledCard = styled(Card)(({ theme }) => ({
  animation: `${fadeIn} 0.6s ease-out`,
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  borderRadius: '16px',
  overflow: 'visible',
  marginBottom: theme.spacing(3),
  boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
  '&:hover': {
    boxShadow: '0 15px 50px rgba(0,0,0,0.15)',
    transform: 'translateY(-4px)',
    transition: 'all 0.3s ease'
  }
}));

const HeaderCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  borderRadius: '16px',
  marginBottom: theme.spacing(3),
  padding: theme.spacing(3),
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '-50%',
    right: '-50%',
    width: '200%',
    height: '200%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    opacity: 0.1
  }
}));

const StatCard = styled(Card)(({ theme }) => ({
  background: 'white',
  borderRadius: '12px',
  padding: theme.spacing(2),
  textAlign: 'center',
  height: '100%',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 12px 20px rgba(0,0,0,0.1)',
    background: 'linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%)'
  }
}));

const GradeBadge = styled(Chip)(({ grade, theme }) => {
  const gradeColors = {
    'A+': '#00C853',
    'A': '#00E676',
    'B': '#76FF03',
    'C': '#C6FF00',
    'D': '#FFEA00',
    'E': '#FF9100',
    'F': '#D32F2F'
  };
  return {
    backgroundColor: gradeColors[grade] || '#9E9E9E',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '0.75rem',
    height: '24px',
    '& .MuiChip-label': {
      padding: '0 8px'
    }
  };
});

const ProgressBar = styled(LinearProgress)(({ value, theme }) => ({
  height: '10px',
  borderRadius: '5px',
  backgroundColor: '#e0e0e0',
  '& .MuiLinearProgress-bar': {
    borderRadius: '5px',
    background: value >= 70 ? 'linear-gradient(90deg, #00C853, #64DD17)' :
               value >= 50 ? 'linear-gradient(90deg, #FFEA00, #FFD600)' :
               'linear-gradient(90deg, #FF5252, #FF4081)'
  }
}));

const StyledTableRow = styled(TableRow)(({ theme, index }) => ({
  backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
  '&:hover': {
    backgroundColor: '#e3f2fd',
    transition: 'background-color 0.2s ease'
  },
  '& td': {
    borderBottom: '1px solid #e0e0e0'
  }
}));

const TermCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  borderLeft: '5px solid',
  borderLeftColor: theme.palette.primary.main,
  borderRadius: '12px',
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
    transform: 'translateX(5px)'
  }
}));

// ==================== MAIN COMPONENT ====================

const StudentTranscript = ({ studentId, studentName: propStudentName }) => {
  const theme = useTheme();
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [downloadDialog, setDownloadDialog] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [expandedTerms, setExpandedTerms] = useState({});

  // ==================== DATA FETCHING ====================
  const fetchTranscript = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      const endpoint = `http://localhost:5000/api/transcripts/${studentId}`;
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000,
      });
      
      if (response.data?.success !== false) {
        const processedData = processTranscriptData(response.data);
        setTranscript(processedData);
        
        // Auto-expand current term
        if (processedData.records?.[0]) {
          const firstTermKey = `${processedData.records[0].session}|${processedData.records[0].term}`;
          setExpandedTerms({ [firstTermKey]: true });
        }
      } else {
        throw new Error(response.data?.message || 'Failed to fetch transcript data');
      }
      
    } catch (err) {
      console.error('Error fetching transcript:', err);
      handleFetchError(err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  // ==================== DATA PROCESSING ====================
  const processTranscriptData = (data) => {
    if (!data) return data;
    
    const student = data.student || {};
    
    let currentClass = 'Not assigned';
    let level = 'N/A';
    
    if (student.currentClass) {
      if (typeof student.currentClass === 'object') {
        currentClass = student.currentClass.name || student.currentClass;
        level = student.currentClass.level || student.level || 'N/A';
      } else {
        currentClass = student.currentClass;
        level = student.level || 'N/A';
      }
    }
    
    let processedRecords = [];
    if (data.records && Array.isArray(data.records)) {
      processedRecords = data.records.map(record => {
        if (!record.grades) {
          return {
            session: record.session,
            term: record.term,
            class: record.class,
            grades: {},
            average: record.average || '0.0',
            subjectCount: 0,
            totalTests: record.testCount || 0
          };
        }
        
        let totalSubjectPercentage = 0;
        let subjectCount = 0;
        let totalScore = 0;
        let totalPossible = 0;
        const processedGrades = {};
        
        Object.entries(record.grades).forEach(([subject, grade]) => {
          if (grade && typeof grade === 'object') {
            const percentage = parseFloat(grade.percentage) || 0;
            const averageScore = parseFloat(grade.averageScore) || 0;
            const averageTotalMarks = parseFloat(grade.averageTotalMarks) || 100;
            
            let finalPercentage = percentage;
            if (!percentage && averageTotalMarks > 0) {
              finalPercentage = (averageScore / averageTotalMarks) * 100;
            }
            
            processedGrades[subject] = {
              subject: subject,
              score: Math.round(averageScore),
              totalMarks: Math.round(averageTotalMarks),
              percentage: finalPercentage.toFixed(1),
              grade: grade.grade || calculateGrade(finalPercentage),
              remark: grade.remark || getRemark(finalPercentage),
              firstCA: grade.firstCA || 0,
              secondCA: grade.secondCA || 0,
              exam: grade.exam || 0
            };
            
            totalScore += averageScore;
            totalPossible += averageTotalMarks;
            totalSubjectPercentage += finalPercentage;
            subjectCount++;
          }
        });
        
        let termAverage;
        if (record.average !== undefined) {
          termAverage = parseFloat(record.average) || 0;
        } else if (totalPossible > 0) {
          termAverage = (totalScore / totalPossible) * 100;
        } else if (subjectCount > 0) {
          termAverage = totalSubjectPercentage / subjectCount;
        } else {
          termAverage = 0;
        }
        
        return {
          session: record.session,
          term: record.term,
          class: record.class,
          grades: processedGrades,
          average: termAverage.toFixed(1),
          subjectCount: subjectCount,
          totalTests: record.testCount || 0,
          promoted: record.promoted,
          attendance: record.attendance,
          _totalScore: Math.round(totalScore),
          _totalPossible: Math.round(totalPossible),
          gpa: record.gpa || '0.00'
        };
      });
      
      processedRecords.sort((a, b) => {
        const sessionA = a.session || '';
        const sessionB = b.session || '';
        return sessionB.localeCompare(sessionA);
      });
    }
    
    const overallStats = calculateOverallStats(processedRecords);
    
    const processedStudent = {
      name: student.name || propStudentName || 'Unknown Student',
      studentId: student.studentId || studentId,
      currentClass: currentClass,
      level: level,
      admissionDate: student.admissionDate,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      email: student.email
    };
    
    return {
      ...data,
      student: processedStudent,
      records: processedRecords,
      summary: overallStats,
      generatedAt: data.generatedAt || new Date().toISOString()
    };
  };

  const calculateOverallStats = (records) => {
    if (!records || records.length === 0) {
      return {
        totalTerms: 0,
        overallAverage: '0%',
        totalSubjects: 0,
        totalTests: 0,
        promotionRate: '0%',
        bestTerm: null,
        worstTerm: null,
        overallRemark: 'No records available'
      };
    }
    
    let totalAverage = 0;
    let totalTests = 0;
    let totalScore = 0;
    let totalPossible = 0;
    let promotionCount = 0;
    const allSubjects = new Set();
    let bestTerm = records[0];
    let bestAverage = parseFloat(records[0].average) || 0;
    let worstTerm = records[0];
    let worstAverage = parseFloat(records[0].average) || 0;
    
    records.forEach(record => {
      const termAverage = parseFloat(record.average) || 0;
      totalAverage += termAverage;
      totalTests += record.totalTests || 0;
      totalScore += record._totalScore || 0;
      totalPossible += record._totalPossible || 0;
      
      if (record.promoted === true) {
        promotionCount++;
      }
      
      if (record.grades) {
        Object.keys(record.grades).forEach(subject => {
          allSubjects.add(subject);
        });
      }
      
      if (termAverage > bestAverage) {
        bestAverage = termAverage;
        bestTerm = record;
      }
      
      if (termAverage < worstAverage) {
        worstAverage = termAverage;
        worstTerm = record;
      }
    });
    
    const overallAverage = (totalAverage / records.length).toFixed(1);
    const promotionRate = ((promotionCount / records.length) * 100).toFixed(0);
    
    let weightedAverage = 0;
    if (totalPossible > 0) {
      weightedAverage = (totalScore / totalPossible) * 100;
    }
    
    return {
      totalTerms: records.length,
      overallAverage: `${overallAverage}%`,
      weightedAverage: `${weightedAverage.toFixed(1)}%`,
      totalSubjects: allSubjects.size,
      totalTests: totalTests,
      totalScore: Math.round(totalScore),
      totalPossible: Math.round(totalPossible),
      promotionRate: `${promotionRate}%`,
      promotionCount: promotionCount,
      bestTerm: bestTerm ? {
        session: bestTerm.session,
        term: bestTerm.term,
        average: bestTerm.average
      } : null,
      worstTerm: worstTerm ? {
        session: worstTerm.session,
        term: worstTerm.term,
        average: worstTerm.average
      } : null,
      overallRemark: getOverallRemark(parseFloat(overallAverage))
    };
  };

  // ==================== HELPER FUNCTIONS ====================
  const calculateGrade = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
  };

  const getRemark = (percentage) => {
    if (percentage >= 90) return 'Outstanding';
    if (percentage >= 80) return 'Excellent';
    if (percentage >= 70) return 'Very Good';
    if (percentage >= 60) return 'Good';
    if (percentage >= 50) return 'Pass';
    if (percentage >= 40) return 'Below Average';
    return 'Needs Improvement';
  };

  const getOverallRemark = (average) => {
    if (average >= 80) return 'EXCELLENT';
    if (average >= 70) return 'VERY GOOD';
    if (average >= 60) return 'GOOD';
    if (average >= 50) return 'SATISFACTORY';
    if (average >= 40) return 'PASS';
    return 'NEEDS IMPROVEMENT';
  };

  const getGradeColor = (grade) => {
    const colors = {
      'A+': '#00C853',
      'A': '#00E676',
      'B': '#76FF03',
      'C': '#C6FF00',
      'D': '#FFEA00',
      'E': '#FF9100',
      'F': '#D32F2F'
    };
    return colors[grade] || '#9E9E9E';
  };

  const handleFetchError = (err) => {
    if (err.response) {
      switch (err.response.status) {
        case 403:
          setError('Access Denied: You do not have permission to view this transcript.');
          break;
        case 404:
          setError('Transcript data not found for this student.');
          break;
        case 401:
          setError('Session expired. Please login again.');
          localStorage.removeItem('token');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1000);
          break;
        case 500:
          const serverError = err.response.data?.message || err.response.data?.error;
          setError(`Server error: ${serverError || 'Please try again later.'}`);
          break;
        default:
          setError(`Error ${err.response.status}: ${err.response.data?.message || 'Failed to fetch transcript'}`);
      }
    } else if (err.request) {
      setError('Network error. Please check your connection and try again.');
    } else if (err.message.includes('timeout')) {
      setError('Request timeout. Please try again.');
    } else if (err.message.includes('Network Error')) {
      setError('Network error. Please check if the server is running.');
    } else {
      setError('Failed to fetch transcript: ' + err.message);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchTranscript();
  };

  const toggleTermExpansion = (termKey) => {
    setExpandedTerms(prev => ({
      ...prev,
      [termKey]: !prev[termKey]
    }));
  };

  const handleDownloadPDF = (term = null) => {
    const studentName = transcript?.student?.name || 'Student';
    const fileName = term 
      ? `Transcript_${studentName}_${term.session}_${term.term}.pdf`
      : `Transcript_${studentName}_Full.pdf`;
    
    console.log('Downloading:', fileName);
    // Implement PDF generation here
    setDownloadDialog(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Transcript - ${transcript?.student?.name}`,
        text: `Academic transcript for ${transcript?.student?.name}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleEmail = () => {
    const subject = `Transcript - ${transcript?.student?.name}`;
    const body = `Please find attached the academic transcript for ${transcript?.student?.name}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (studentId) {
      fetchTranscript();
    } else {
      setError('No student ID provided');
      setLoading(false);
    }
  }, [studentId, retryCount, fetchTranscript]);

  // ==================== RENDER FUNCTIONS ====================
  const renderLoading = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress size={60} thickness={4} sx={{ mb: 3, color: theme.palette.primary.main }} />
        <Typography variant="h6" color="textSecondary" gutterBottom>
          Loading Academic Transcript
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Fetching data for Student ID: {studentId}
        </Typography>
        <LinearProgress sx={{ mt: 2, width: '300px', mx: 'auto', borderRadius: '5px' }} />
      </Box>
    </Box>
  );

  const renderError = () => (
    <Box sx={{ mt: 4 }}>
      <Alert 
        severity="error" 
        sx={{ 
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        <AlertTitle>Error Loading Transcript</AlertTitle>
        {error}
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            onClick={handleRetry}
            startIcon={<RefreshIcon />}
          >
            Retry
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </Box>
      </Alert>
    </Box>
  );

  const renderEmpty = () => (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <AssessmentIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h5" gutterBottom color="textSecondary">
        No Academic Records Found
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        This student does not have any academic records yet.
      </Typography>
      <Button 
        variant="contained" 
        onClick={fetchTranscript}
        startIcon={<RefreshIcon />}
      >
        Check Again
      </Button>
    </Box>
  );

  const renderStudentHeader = () => {
    if (!transcript?.student) return null;
    
    const student = transcript.student;
    const stats = transcript.summary || {};
    
    return (
      <HeaderCard>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: 'white',
                  color: theme.palette.primary.main,
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  border: '4px solid rgba(255,255,255,0.3)'
                }}
              >
                {student.name?.charAt(0) || 'S'}
              </Avatar>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {student.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Chip 
                    icon={<PersonIcon />} 
                    label={`ID: ${student.studentId}`}
                    size="small"
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                  <Chip 
                    icon={<ClassIcon />} 
                    label={`Class: ${student.currentClass}`}
                    size="small"
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                  <Chip 
                    icon={<SchoolIcon />} 
                    label={`Level: ${student.level}`}
                    size="small"
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                </Box>
                {student.admissionDate && (
                  <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                    <CalendarIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                    Admitted: {new Date(student.admissionDate).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'right' }}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mb: 2 }}>
                <Tooltip title="Print Transcript">
                  <IconButton onClick={handlePrint} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                    <PrintIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Share Transcript">
                  <IconButton onClick={handleShare} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                    <ShareIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Email Transcript">
                  <IconButton onClick={handleEmail} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                    <EmailIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download PDF">
                  <IconButton onClick={() => setDownloadDialog(true)} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
                Generated: {new Date(transcript.generatedAt).toLocaleDateString()}
              </Typography>
              <Chip 
                label="OFFICIAL TRANSCRIPT"
                size="small"
                sx={{ 
                  mt: 1,
                  bgcolor: '#4CAF50', 
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.7rem'
                }}
              />
            </Box>
          </Grid>
        </Grid>
      </HeaderCard>
    );
  };

  const renderStatistics = () => {
    if (!transcript?.summary) return null;
    
    const stats = transcript.summary;
    
    const statItems = [
      {
        icon: <AssessmentIcon />,
        value: stats.totalTerms || 0,
        label: 'Academic Terms',
        color: '#667eea'
      },
      {
        icon: <TrendingUpIcon />,
        value: stats.overallAverage || '0%',
        label: 'Overall Average',
        color: '#4CAF50'
      },
      {
        icon: <GradeIcon />,
        value: stats.totalSubjects || 0,
        label: 'Total Subjects',
        color: '#FF9800'
      },
      {
        icon: <BarChartIcon />,
        value: stats.promotionRate || '0%',
        label: 'Promotion Rate',
        color: '#9C27B0'
      },
      {
        icon: <CheckCircleIcon />,
        value: stats.totalTests || 0,
        label: 'Total Tests',
        color: '#2196F3'
      },
      {
        icon: <HistoryIcon />,
        value: stats.promotionCount || 0,
        label: 'Promotions',
        color: '#00BCD4'
      }
    ];
    
    return (
      <StyledCard>
        <CardHeader
          title="Academic Overview"
          titleTypographyProps={{ variant: 'h5', fontWeight: 'bold' }}
          action={
            <Button 
              startIcon={<RefreshIcon />} 
              onClick={fetchTranscript}
              size="small"
            >
              Refresh
            </Button>
          }
        />
        <CardContent>
          <Grid container spacing={2}>
            {statItems.map((item, index) => (
              <Grid item xs={6} sm={4} md={2} key={index}>
                <StatCard>
                  <Box sx={{ 
                    width: 50, 
                    height: 50, 
                    borderRadius: '50%', 
                    bgcolor: item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: 'white'
                  }}>
                    {item.icon}
                  </Box>
                  <Typography variant="h4" fontWeight="bold" gutterBottom>
                    {item.value}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {item.label}
                  </Typography>
                </StatCard>
              </Grid>
            ))}
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Overall Performance
                </Typography>
                <ProgressBar 
                  variant="determinate" 
                  value={parseFloat(stats.overallAverage) || 0} 
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body2" color="textSecondary">
                    Performance: {stats.overallRemark}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {stats.overallAverage}
                  </Typography>
                </Box>
              </Box>
              
              {stats.bestTerm && (
                <Alert severity="success" icon={<CheckCircleIcon />}>
                  <AlertTitle>Best Performance</AlertTitle>
                  {stats.bestTerm.session} ({stats.bestTerm.term}) - {stats.bestTerm.average}%
                </Alert>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: '8px' }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Academic Summary
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Total Score:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stats.totalScore || 0}/{stats.totalPossible || 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Weighted Average:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stats.weightedAverage || '0%'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Promotion Status:</Typography>
                  <Chip 
                    label={parseFloat(stats.overallAverage) >= 40 ? "ELIGIBLE" : "NOT ELIGIBLE"}
                    size="small"
                    color={parseFloat(stats.overallAverage) >= 40 ? "success" : "error"}
                  />
                </Box>
              </Box>
              
              {stats.worstTerm && (
                <Alert severity="warning" sx={{ mt: 2 }} icon={<ErrorIcon />}>
                  <AlertTitle>Needs Improvement</AlertTitle>
                  {stats.worstTerm.session} ({stats.worstTerm.term}) - {stats.worstTerm.average}%
                </Alert>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </StyledCard>
    );
  };

  const renderTermCard = (record, index) => {
    const termKey = `${record.session}|${record.term}`;
    const isExpanded = expandedTerms[termKey];
    
    return (
      <TermCard key={termKey}>
        <Accordion 
          expanded={isExpanded}
          onChange={() => toggleTermExpansion(termKey)}
          sx={{ 
            boxShadow: 'none',
            '&:before': { display: 'none' }
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              bgcolor: 'white',
              borderBottom: '1px solid #e0e0e0',
              '&:hover': { bgcolor: '#f5f5f5' }
            }}
          >
            <Grid container alignItems="center" spacing={2}>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: '50%', 
                    bgcolor: theme.palette.primary.main,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold'
                  }}>
                    {index + 1}
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {record.session}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {record.term} • Class: {record.class}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    {record.average}%
                  </Typography>
                  <GradeBadge 
                    label={record.gpa || '0.00'} 
                    grade={calculateGrade(parseFloat(record.average))}
                  />
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Term Average • GPA: {record.gpa || '0.00'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Box>
                  <Typography variant="body2">
                    Subjects: {record.subjectCount} • Tests: {record.totalTests}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Score: {record._totalScore || 0}/{record._totalPossible || 0}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <Box sx={{ textAlign: 'right' }}>
                  <Chip 
                    label={record.promoted ? "PROMOTED" : "NOT PROMOTED"}
                    size="small"
                    color={record.promoted ? "success" : "error"}
                    icon={record.promoted ? <CheckCircleIcon /> : <ErrorIcon />}
                  />
                </Box>
              </Grid>
            </Grid>
          </AccordionSummary>
          
          <AccordionDetails>
            {Object.keys(record.grades).length > 0 ? (
              <TableContainer component={Paper} sx={{ borderRadius: '8px' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: theme.palette.primary.main }}>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Subject</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Score</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Percentage</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Grade</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Remark</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Components</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(record.grades).map(([subject, grade], idx) => (
                      <StyledTableRow key={subject} index={idx}>
                        <TableCell sx={{ fontWeight: 'bold' }}>{subject}</TableCell>
                        <TableCell align="center">
                          <Typography variant="body1" fontWeight="bold">
                            {grade.score}/{grade.totalMarks}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <Typography variant="body1" fontWeight="bold">
                              {grade.percentage}%
                            </Typography>
                            <ProgressBar 
                              variant="determinate" 
                              value={parseFloat(grade.percentage)} 
                              sx={{ width: '60px' }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <GradeBadge label={grade.grade} grade={grade.grade} />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={grade.remark}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              borderColor: getGradeColor(grade.grade),
                              color: getGradeColor(grade.grade)
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {grade.firstCA > 0 && (
                            <Box sx={{ fontSize: '0.75rem' }}>
                              <Typography variant="caption" display="block">
                                CA1: {grade.firstCA}/20
                              </Typography>
                              <Typography variant="caption" display="block">
                                CA2: {grade.secondCA || 0}/20
                              </Typography>
                              <Typography variant="caption" display="block">
                                Exam: {grade.exam || 0}/60
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                      </StyledTableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <InfoIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" color="textSecondary">
                  No grade data available for this term
                </Typography>
              </Box>
            )}
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button 
                size="small" 
                startIcon={<DownloadIcon />}
                onClick={() => {
                  setSelectedTerm(record);
                  setDownloadDialog(true);
                }}
              >
                Download Term Report
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
      </TermCard>
    );
  };

  const renderAcademicTimeline = () => {
    if (!transcript?.records?.length) return null;
    
    return (
      <StyledCard>
        <CardHeader
          title="Academic Timeline"
          titleTypographyProps={{ variant: 'h5', fontWeight: 'bold' }}
          subheader="Click on any term to view detailed results"
          subheaderTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
        />
        <CardContent>
          {transcript.records.map((record, index) => renderTermCard(record, index))}
          
          {transcript.records.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <AssessmentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="textSecondary">
                No academic records available
              </Typography>
            </Box>
          )}
        </CardContent>
      </StyledCard>
    );
  };

  // ==================== MAIN RENDER ====================
  if (loading) return renderLoading();
  if (error) return renderError();
  if (!transcript) return renderEmpty();

  return (
    <Box sx={{ py: 3, px: { xs: 2, sm: 3, md: 4 } }}>
      <Fade in timeout={600}>
        <Box>
          {/* Student Header */}
          {renderStudentHeader()}
          
          {/* Statistics */}
          {renderStatistics()}
          
          {/* Academic Timeline */}
          {renderAcademicTimeline()}
          
          {/* Download Dialog */}
          <Dialog open={downloadDialog} onClose={() => setDownloadDialog(false)}>
            <DialogTitle>Download Transcript</DialogTitle>
            <DialogContent>
              <Typography variant="body1" gutterBottom>
                Select download option:
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => handleDownloadPDF()}
                  sx={{ mb: 2, justifyContent: 'flex-start', py: 2 }}
                  startIcon={<DownloadIcon />}
                >
                  Full Transcript (All Terms)
                </Button>
                {selectedTerm && (
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => handleDownloadPDF(selectedTerm)}
                    sx={{ justifyContent: 'flex-start', py: 2 }}
                    startIcon={<DownloadIcon />}
                  >
                    Single Term: {selectedTerm.session} - {selectedTerm.term}
                  </Button>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDownloadDialog(false)}>Cancel</Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Fade>
    </Box>
  );
};

export default StudentTranscript;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? 'http://localhost:5000' : 'http://localhost:5000';

const DataExports = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [terms, setTerms] = useState(['First Term', 'Second Term', 'Third Term']);
  const [classSubjects, setClassSubjects] = useState({}); // Subjects by class
  const [classStudents, setClassStudents] = useState({}); // Students by class
  const [fetchingData, setFetchingData] = useState({
    users: false,
    classes: false,
    subjects: false,
    sessions: false,
  });
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('students');
  
  const [filters, setFilters] = useState({
    studentClass: '',
    studentSubject: '',
    resultType: 'class',
    resultClass: '',
    resultSubject: '',
    resultStudent: '',
    resultTerm: '',
    reportSession: '',
    reportTerm: '',
    reportClass: '',
    reportStudent: '',
  });
  
  const [signatureData, setSignatureData] = useState({
    className: '',
    classTeacherSignature: null,
    principalSignature: null,
  });

  // Brand colors
  const colors = {
    primary: '#4B5320', // Army green
    primaryDark: '#3a4319',
    primaryLight: '#6a7530',
    secondary: '#D4A017', // Gold
    secondaryDark: '#b68d14',
    secondaryLight: '#e6b82e',
    background: '#f8f9fa',
    white: '#ffffff',
    gray50: '#f9fafb',
    gray100: '#f4f5f7',
    gray200: '#e5e7eb',
    gray300: '#d2d6dc',
    gray400: '#9fa6b2',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    gray800: '#252f3f',
    gray900: '#161e2e',
    red: '#e53e3e',
    green: '#38a169',
    yellow: '#d69e2e',
    blue: '#4299e1',
    purple: '#8b5cf6',
  };

  // Get filtered students for report cards
  const getFilteredStudentsByClass = (className) => {
    if (!className) return [];
    return classStudents[className] || [];
  };

  // Get filtered students for results
  const getFilteredStudentsForResults = (className) => {
    if (!className) return [];
    return classStudents[className] || [];
  };

  // Get subjects for a specific class
  const getSubjectsForClass = (className) => {
    if (!className) return [];
    return classSubjects[className] || [];
  };

  // Inline SVG icons
  const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );

  const UsersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );

  const FileTextIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );

  const AwardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7"/>
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
    </svg>
  );

  const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );

  const AlertCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );

  const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );

  const LoaderIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  );

  const FilterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  );

  const FileChartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <path d="M16 13h-2v7"/>
      <path d="M12 13h2"/>
      <path d="M12 20h2"/>
    </svg>
  );

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    // When class is selected for results, fetch its data
    if (filters.resultClass) {
      fetchClassData(filters.resultClass);
    }
  }, [filters.resultClass]);

  useEffect(() => {
    // When class is selected for report cards, fetch its data
    if (filters.reportClass) {
      fetchClassData(filters.reportClass);
    }
  }, [filters.reportClass]);

  const fetchInitialData = async () => {
    try {
      setFetchingData({
        users: true,
        classes: true,
        subjects: true,
        sessions: true,
      });
      
      // Fetch data sequentially
      await fetchClasses();
      await fetchUsers();
      await fetchSessions();
    } catch (err) {
      console.error('Failed to fetch initial data:', err);
      setError('Failed to load initial data. Please refresh the page.');
    } finally {
      setFetchingData({
        users: false,
        classes: false,
        subjects: false,
        sessions: false,
      });
    }
  };

  const fetchClassData = async (className) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      
      // First, find the class object to get its ID
      const classObj = classes.find(c => c.name === className);
      if (!classObj) {
        console.log('Class not found:', className);
        return;
      }
      
      // Fetch students for this class using the /api/users endpoint with class filter
      const studentsRes = await axios.get(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          class: classObj._id || classObj.id,
          role: 'student',
          limit: 1000 // Get all students
        },
        timeout: 10000,
      });
      
      let students = [];
      if (studentsRes.data && studentsRes.data.success) {
        students = studentsRes.data.users || [];
      }
      
      setClassStudents(prev => ({
        ...prev,
        [className]: students
      }));
      
      // Fetch subjects for this class using the assignment endpoint
      const subjectsRes = await axios.get(`${API_BASE_URL}/api/users/assignment/classes/${classObj._id || classObj.id}/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      
      let classSubjectsList = [];
      if (subjectsRes.data && subjectsRes.data.success) {
        classSubjectsList = subjectsRes.data.subjects.map(sub => ({
          id: sub._id,
          name: sub.name,
          code: sub.code,
          category: sub.category,
          isCore: sub.isCore
        }));
      }
      
      // Remove duplicates and empty values
      classSubjectsList = [...new Set(classSubjectsList.filter(sub => sub && sub.name && sub.name.trim() !== ''))];
      
      setClassSubjects(prev => ({
        ...prev,
        [className]: classSubjectsList
      }));
      
    } catch (err) {
      console.error(`Error fetching data for class ${className}:`, err);
      // Fallback to filtering from all users and subjects
      const students = users.filter(user => user.role === 'student' && user.class && 
        (user.class.name === className || user.class === className));
      setClassStudents(prev => ({
        ...prev,
        [className]: students
      }));
      
      // Fallback for subjects
      const allSubjectsRes = await fetchSubjects();
      setClassSubjects(prev => ({
        ...prev,
        [className]: allSubjectsRes || []
      }));
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      
      const res = await axios.get(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 1000 }, // Get all users for filtering
        timeout: 10000,
      });
      
      console.log('Users API Response:', res.data);
      
      let usersData = [];
      if (res.data && res.data.success && Array.isArray(res.data.users)) {
        usersData = res.data.users;
      }
      
      setUsers(usersData);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load users. Please try again.');
      setUsers([]);
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      
      const res = await axios.get(`${API_BASE_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      
      console.log('Classes API Response:', res.data);
      let classList = [];
      
      // Handle different response formats
      if (Array.isArray(res.data)) {
        classList = res.data.map(cls => {
          if (typeof cls === 'string') {
            return { _id: cls, name: cls, id: cls };
          } else if (typeof cls === 'object' && cls !== null) {
            return {
              _id: cls._id || cls.id,
              id: cls._id || cls.id,
              name: cls.name || cls.className || 'Unknown Class'
            };
          }
          return { _id: 'unknown', id: 'unknown', name: 'Unknown Class' };
        });
      } else if (res.data && Array.isArray(res.data.classes)) {
        classList = res.data.classes.map(cls => {
          if (typeof cls === 'string') {
            return { _id: cls, name: cls, id: cls };
          } else if (typeof cls === 'object' && cls !== null) {
            return {
              _id: cls._id || cls.id,
              id: cls._id || cls.id,
              name: cls.name || cls.className || 'Unknown Class'
            };
          }
          return { _id: 'unknown', id: 'unknown', name: 'Unknown Class' };
        });
      } else if (res.data && Array.isArray(res.data.data)) {
        classList = res.data.data.map(cls => {
          if (typeof cls === 'string') {
            return { _id: cls, name: cls, id: cls };
          } else if (typeof cls === 'object' && cls !== null) {
            return {
              _id: cls._id || cls.id,
              id: cls._id || cls.id,
              name: cls.name || cls.className || 'Unknown Class'
            };
          }
          return { _id: 'unknown', id: 'unknown', name: 'Unknown Class' };
        });
      }
      
      // Remove duplicates and empty values
      classList = [...new Map(classList.map(item => [item.name, item])).values()]
        .filter(cls => cls && cls.name && cls.name.trim() !== '');
      
      setClasses(classList);
      setError(null);
    } catch (err) {
      console.error('Error fetching classes:', err);
      console.log('Setting empty classes array due to error');
      setClasses([]);
    }
  };

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      
      const res = await axios.get(`${API_BASE_URL}/api/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      
      console.log('Subjects API Response:', res.data);
      let subjectList = [];
      
      // Handle different response formats
      if (Array.isArray(res.data)) {
        subjectList = res.data.map(sub => {
          if (typeof sub === 'string') {
            return { id: sub, name: sub };
          } else if (typeof sub === 'object' && sub !== null) {
            return {
              id: sub._id || sub.id,
              name: sub.name || sub.subjectName || 'Unknown Subject'
            };
          }
          return { id: 'unknown', name: 'Unknown Subject' };
        });
      } else if (res.data && Array.isArray(res.data.subjects)) {
        subjectList = res.data.subjects.map(sub => {
          if (typeof sub === 'string') {
            return { id: sub, name: sub };
          } else if (typeof sub === 'object' && sub !== null) {
            return {
              id: sub._id || sub.id,
              name: sub.name || sub.subjectName || 'Unknown Subject'
            };
          }
          return { id: 'unknown', name: 'Unknown Subject' };
        });
      } else if (res.data && Array.isArray(res.data.data)) {
        subjectList = res.data.data.map(sub => {
          if (typeof sub === 'string') {
            return { id: sub, name: sub };
          } else if (typeof sub === 'object' && sub !== null) {
            return {
              id: sub._id || sub.id,
              name: sub.name || sub.subjectName || 'Unknown Subject'
            };
          }
          return { id: 'unknown', name: 'Unknown Subject' };
        });
      }
      
      // Remove duplicates and empty values
      subjectList = [...new Map(subjectList.map(item => [item.name, item])).values()]
        .filter(sub => sub && sub.name && sub.name.trim() !== '');
      
      setSubjects(subjectList);
      setError(null);
      return subjectList;
    } catch (err) {
      console.error('Error fetching subjects:', err);
      console.log('Setting empty subjects array due to error');
      setSubjects([]);
      return [];
    }
  };

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      
      const res = await axios.get(`${API_BASE_URL}/api/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      
      console.log('Sessions API Response:', res.data);
      let sessionList = [];
      
      // Handle different response formats
      if (Array.isArray(res.data)) {
        sessionList = res.data.map(session => {
          if (typeof session === 'string') {
            return session;
          } else if (typeof session === 'object' && session !== null) {
            return session.sessionName || session.name || session.title || session._id || 'Unknown Session';
          }
          return 'Unknown Session';
        });
      } else if (res.data && Array.isArray(res.data.sessions)) {
        sessionList = res.data.sessions.map(session => {
          if (typeof session === 'string') {
            return session;
          } else if (typeof session === 'object' && session !== null) {
            return session.sessionName || session.name || session.title || session._id || 'Unknown Session';
          }
          return 'Unknown Session';
        });
      } else if (res.data && Array.isArray(res.data.data)) {
        sessionList = res.data.data.map(session => {
          if (typeof session === 'string') {
            return session;
          } else if (typeof session === 'object' && session !== null) {
            return session.sessionName || session.name || session.title || session._id || 'Unknown Session';
          }
          return 'Unknown Session';
        });
      }
      
      // Remove duplicates and empty values
      sessionList = [...new Set(sessionList.filter(session => session && session.trim() !== ''))];
      
      setSessions(sessionList);
      setError(null);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      console.log('Setting empty sessions array due to error');
      setSessions([]);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ 
      ...prev, 
      [name]: value,
      // Reset dependent filters when class changes
      ...(name === 'reportClass' && { reportStudent: '' }),
      ...(name === 'resultClass' && { resultStudent: '' }),
      ...(name === 'resultClass' && { resultSubject: '' }), // Reset subject when class changes
    }));
    setError(null);
    setSuccess(null);
  };

  const handleSignatureChange = (e) => {
    const { name, files } = e.target;
    setSignatureData(prev => ({ ...prev, [name]: files[0] }));
    setError(null);
    setSuccess(null);
  };

  const handleSignatureSubmit = async (e) => {
    e.preventDefault();
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      setError('Admin access required to upload signatures.');
      return;
    }
    if (!signatureData.className && !signatureData.principalSignature) {
      setError('Select a class for class teacher signature or upload a principal signature.');
      return;
    }
    
    const formData = new FormData();
    if (signatureData.className) formData.append('className', signatureData.className);
    if (signatureData.classTeacherSignature) {
      formData.append('classTeacherSignature', signatureData.classTeacherSignature);
    }
    if (signatureData.principalSignature) {
      formData.append('principalSignature', signatureData.principalSignature);
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      
      const endpoint = `${API_BASE_URL}/api/reports/signatures`;
      console.log('Uploading signatures to:', endpoint);
      
      await axios.post(endpoint, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data' 
        },
        timeout: 15000,
      });
      
      setSuccess('Signatures uploaded successfully.');
      setSignatureData({ className: '', classTeacherSignature: null, principalSignature: null });
      setError(null);
    } catch (err) {
      console.error('Error uploading signatures:', err);
      setError(err.response?.data?.error || 'Failed to upload signatures. Please try again.');
      setSuccess(null);
    }
  };

  const exportStudents = () => {
    setExporting(true);
    try {
      let filteredUsers = users.filter(user => user.role === 'student');
      if (filters.studentClass) {
        filteredUsers = filteredUsers.filter(user => 
          user.class && (user.class.name === filters.studentClass || user.class === filters.studentClass)
        );
      }
      if (filters.studentSubject) {
        filteredUsers = filteredUsers.filter(user =>
          user.enrolledSubjects?.some(sub => 
            sub.subject && (sub.subject.name === filters.studentSubject || sub.subject === filters.studentSubject)
          )
        );
      }
      
      const data = filteredUsers.map(user => ({
        username: user.username || 'N/A',
        name: user.name || 'N/A',
        surname: user.surname || 'N/A',
        class: user.class ? (user.class.name || user.class) : 'N/A',
        subjects: user.enrolledSubjects?.map(s => s.subject ? (s.subject.name || s.subject) : 'N/A').join(';') || 'N/A',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('en-GB') : 'N/A',
        sex: user.sex || 'N/A',
        age: user.age || 'N/A',
        address: user.address || 'N/A',
        phoneNumber: user.phoneNumber || 'N/A',
        picture: user.picture || 'N/A',
      }));
      
      if (data.length === 0) {
        setError('No students found for the selected filters.');
        return;
      }
      
      const csv = Papa.unparse(data);
      downloadCSV(csv, `students_${filters.studentClass || 'all'}_${filters.studentSubject || 'all'}_${new Date().getTime()}.csv`);
      setSuccess(`Exported ${data.length} students successfully.`);
      setError(null);
    } catch (err) {
      console.error('Error exporting students:', err);
      setError('Failed to export students data.');
    } finally {
      setExporting(false);
    }
  };

  const exportResults = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      
      let endpoint = '';
      let filename = '';
      
      if (filters.resultType === 'class' && filters.resultClass) {
        const className = encodeURIComponent(filters.resultClass);
        const subjectName = filters.resultSubject || 'all';
        const term = filters.resultTerm || 'all';
        endpoint = `${API_BASE_URL}/api/results/export/class/${className}/subject/${subjectName}/term/${term}`;
        filename = `results_${className}_${subjectName.replace(/\s/g, '_')}_${term.replace(/\s/g, '_')}_${new Date().getTime()}.csv`;
      } else if (filters.resultType === 'student' && filters.resultStudent && filters.reportSession && filters.resultTerm) {
        const sanitizedSession = encodeURIComponent(filters.reportSession);
        endpoint = `${API_BASE_URL}/api/results/export/student/${filters.resultStudent}/session/${sanitizedSession}/term/${filters.resultTerm}`;
        filename = `results_student_${filters.resultStudent}_${sanitizedSession.replace(/[/\s]/g, '_')}_${filters.resultTerm.replace(/\s/g, '_')}.csv`;
      } else {
        setError('Please select valid filters for result export.');
        return;
      }
      
      console.log('Exporting results from:', endpoint);
      
      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });
      
      if (!res.data) {
        setError('No results found for the selected filters.');
        return;
      }
      
      downloadCSV(res.data, filename);
      setSuccess('Results exported successfully.');
      setError(null);
    } catch (err) {
      console.error('Error exporting results:', err);
      const errorMessage = err.response?.data?.error || 'Failed to export results. Please check your filters and try again.';
      setError(errorMessage);
      setSuccess(null);
    } finally {
      setExporting(false);
    }
  };

  const exportReportCard = async () => {
    setExporting(true);
    try {
      if (!filters.reportStudent || !filters.reportSession || !filters.reportTerm) {
        setError('Please select a student, session, and term for report card export.');
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      
      const sanitizedSession = encodeURIComponent(filters.reportSession);
      const sanitizedTerm = encodeURIComponent(filters.reportTerm);
      const endpoint = `${API_BASE_URL}/api/reports/export/report/${filters.reportStudent}/${sanitizedSession}/${sanitizedTerm}`;
      
      console.log('Exporting report card from:', endpoint);
      
      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
        timeout: 30000,
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${filters.reportStudent}_${sanitizedSession.replace(/[/\s]/g, '_')}_${sanitizedTerm.replace(/\s/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setSuccess('Report card exported successfully.');
      setError(null);
    } catch (err) {
      console.error('Error exporting report card:', err);
      let errorMessage = 'Failed to export report card.';
      if (err.response) {
        if (err.response.status === 404) {
          errorMessage = 'No results found for the selected student, session, and term.';
        } else if (err.response.status === 400) {
          errorMessage = 'Invalid student ID, session, or term format.';
        } else if (err.response.data?.error) {
          errorMessage = err.response.data.error;
        }
      }
      setError(errorMessage);
      setSuccess(null);
    } finally {
      setExporting(false);
    }
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'students', label: 'Export Students', icon: UsersIcon },
    { id: 'results', label: 'Export Results', icon: FileTextIcon },
    { id: 'reports', label: 'Export Report Cards', icon: AwardIcon },
    ...((user?.role === 'admin' || user?.role === 'super_admin') 
      ? [{ id: 'signatures', label: 'Upload Signatures', icon: UploadIcon }] 
      : []),
  ];

  const containerStyle = {
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.gray100} 100%)`,
    padding: '1rem',
    fontFamily: '"Fredoka", sans-serif',
  };

  const cardStyle = {
    background: colors.white,
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '1.5rem',
    marginBottom: '2rem',
  };

  const buttonStyle = (variant = 'primary', disabled = false) => ({
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    fontFamily: '"Fredoka", sans-serif',
    fontWeight: '600',
    fontSize: '0.875rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'all 0.3s ease',
    opacity: disabled ? 0.6 : 1,
    ...(variant === 'primary' && {
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
      color: colors.white,
    }),
    ...(variant === 'secondary' && {
      background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.secondaryDark} 100%)`,
      color: colors.white,
    }),
    ...(variant === 'white' && {
      background: colors.white,
      color: colors.primary,
    }),
  });

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    border: `2px solid ${colors.gray300}`,
    borderRadius: '8px',
    fontSize: '1rem',
    fontFamily: '"Fredoka", sans-serif',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
  };

  const tabButtonStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    fontWeight: '500',
    borderRadius: '8px 8px 0 0',
    border: 'none',
    background: isActive ? colors.white : 'transparent',
    color: isActive ? colors.primary : colors.gray600,
    borderTop: isActive ? `1px solid ${colors.gray200}` : 'none',
    borderLeft: isActive ? `1px solid ${colors.gray200}` : 'none',
    borderRight: isActive ? `1px solid ${colors.gray200}` : 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap',
  });

  const loading = fetchingData.users || fetchingData.classes || fetchingData.subjects || fetchingData.sessions;

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.gray100} 100%)`,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            border: `3px solid ${colors.gray200}`,
            borderTopColor: colors.primary,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }}></div>
          <p style={{ color: colors.gray600 }}>Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: colors.gray900,
            marginBottom: '0.5rem',
          }}>
            Data Exports & Reports
          </h1>
          <p style={{ color: colors.gray600 }}>
            Export student data, results, and generate report cards
          </p>
        </div>

        {/* Status Messages */}
        {(error || success) && (
          <div style={{ marginBottom: '1.5rem' }}>
            {error && (
              <div style={{
                background: 'rgba(229, 62, 62, 0.1)',
                borderLeft: `4px solid ${colors.red}`,
                padding: '1rem',
                borderRadius: '0 4px 4px 0',
                marginBottom: '0.75rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <AlertCircleIcon />
                  <p style={{ color: colors.red, fontWeight: '500', marginLeft: '0.5rem' }}>
                    {error}
                  </p>
                </div>
              </div>
            )}
            {success && (
              <div style={{
                background: 'rgba(56, 161, 105, 0.1)',
                borderLeft: `4px solid ${colors.green}`,
                padding: '1rem',
                borderRadius: '0 4px 4px 0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon />
                  <p style={{ color: colors.green, fontWeight: '500', marginLeft: '0.5rem' }}>
                    {success}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            borderBottom: `1px solid ${colors.gray200}`,
          }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={tabButtonStyle(activeTab === tab.id)}
              >
                <tab.icon />
                <span style={{ marginLeft: '0.5rem' }}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={cardStyle}>
          {/* Export Students Tab */}
          {activeTab === 'students' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ color: colors.primary, marginRight: '0.75rem' }}>
                  <UsersIcon />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: colors.gray900 }}>
                    Export Students
                  </h2>
                  <p style={{ color: colors.gray600 }}>
                    Export student data in CSV format with customizable filters
                  </p>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '2rem',
              }}>
                <div>
                  <div style={{
                    background: colors.gray50,
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <FilterIcon />
                      <h3 style={{ fontWeight: '600', color: colors.gray900, marginLeft: '0.5rem' }}>
                        Filter Options
                      </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: colors.gray700,
                          marginBottom: '0.25rem',
                        }}>
                          Class
                        </label>
                        <select
                          name="studentClass"
                          value={filters.studentClass}
                          onChange={handleFilterChange}
                          style={inputStyle}
                        >
                          <option value="">All Classes</option>
                          {classes.length > 0 ? (
                            classes.map((cls, index) => (
                              <option key={index} value={cls.name}>{cls.name}</option>
                            ))
                          ) : (
                            <option value="" disabled>No classes available</option>
                          )}
                        </select>
                      </div>
                      
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: colors.gray700,
                          marginBottom: '0.25rem',
                        }}>
                          Subject
                        </label>
                        <select
                          name="studentSubject"
                          value={filters.studentSubject}
                          onChange={handleFilterChange}
                          style={inputStyle}
                        >
                          <option value="">All Subjects</option>
                          {subjects.length > 0 ? (
                            subjects.map((sub, index) => (
                              <option key={index} value={sub.name}>{sub.name}</option>
                            ))
                          ) : (
                            <option value="" disabled>No subjects available</option>
                          )}
                        </select>
                      </div>
                      
                      <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        padding: '0.75rem',
                        borderRadius: '8px',
                      }}>
                        <p style={{ fontSize: '0.875rem', color: colors.blue }}>
                          <span style={{ fontWeight: '600' }}>Total Students:</span> {users.filter(u => u.role === 'student').length}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: colors.gray500, marginTop: '0.25rem' }}>
                          {classes.length} classes available
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div style={{
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
                    borderRadius: '12px',
                    padding: '1.5rem',
                    color: colors.white,
                  }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                      Export Information
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem' }}>
                      {[
                        'Export in CSV format',
                        'Includes student personal information',
                        'Compatible with Excel & Google Sheets',
                        'Filter by class and subject',
                      ].map((item, index) => (
                        <li key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <CheckCircleIcon />
                          <span style={{ marginLeft: '0.5rem' }}>{item}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <button
                      onClick={exportStudents}
                      disabled={exporting}
                      style={{
                        ...buttonStyle('white', exporting),
                        width: '100%',
                      }}
                    >
                      {exporting ? (
                        <>
                          <div style={{ animation: 'spin 1s linear infinite' }}>
                            <LoaderIcon />
                          </div>
                          Exporting...
                        </>
                      ) : (
                        <>
                          <DownloadIcon />
                          Export Students Data
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Export Results Tab */}
          {activeTab === 'results' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ color: colors.primary, marginRight: '0.75rem' }}>
                  <FileTextIcon />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: colors.gray900 }}>
                    Export Results
                  </h2>
                  <p style={{ color: colors.gray600 }}>
                    Export test and examination results with detailed analysis
                  </p>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '2rem',
              }}>
                <div>
                  <div style={{
                    background: colors.gray50,
                    borderRadius: '8px',
                    padding: '1rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <FilterIcon />
                      <h3 style={{ fontWeight: '600', color: colors.gray900, marginLeft: '0.5rem' }}>
                        Export Options
                      </h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: colors.gray700,
                          marginBottom: '0.25rem',
                        }}>
                          Export Type
                        </label>
                        <select
                          name="resultType"
                          value={filters.resultType}
                          onChange={handleFilterChange}
                          style={inputStyle}
                        >
                          <option value="class">Class Results</option>
                          <option value="student">Student Results</option>
                        </select>
                      </div>

                      {filters.resultType === 'class' && (
                        <>
                          <div>
                            <label style={{
                              display: 'block',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              color: colors.gray700,
                              marginBottom: '0.25rem',
                            }}>
                              Class
                            </label>
                            <select
                              name="resultClass"
                              value={filters.resultClass}
                              onChange={handleFilterChange}
                              style={inputStyle}
                            >
                              <option value="">Select Class</option>
                              {classes.length > 0 ? (
                                classes.map((cls, index) => (
                                  <option key={index} value={cls.name}>{cls.name}</option>
                                ))
                              ) : (
                                <option value="" disabled>No classes available</option>
                              )}
                            </select>
                          </div>
                          
                          <div>
                            <label style={{
                              display: 'block',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              color: colors.gray700,
                              marginBottom: '0.25rem',
                            }}>
                              Subject
                            </label>
                            <select
                              name="resultSubject"
                              value={filters.resultSubject}
                              onChange={handleFilterChange}
                              style={inputStyle}
                              disabled={!filters.resultClass}
                            >
                              <option value="">All Subjects</option>
                              {filters.resultClass ? (
                                getSubjectsForClass(filters.resultClass).length > 0 ? (
                                  getSubjectsForClass(filters.resultClass).map((sub, index) => (
                                    <option key={index} value={sub.name}>{sub.name}</option>
                                  ))
                                ) : (
                                  <option value="" disabled>No subjects for this class</option>
                                )
                              ) : (
                                <option value="" disabled>Select a class first</option>
                              )}
                            </select>
                          </div>
                          
                          <div>
                            <label style={{
                              display: 'block',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              color: colors.gray700,
                              marginBottom: '0.25rem',
                            }}>
                              Term
                            </label>
                            <select
                              name="resultTerm"
                              value={filters.resultTerm}
                              onChange={handleFilterChange}
                              style={inputStyle}
                            >
                              <option value="">All Terms</option>
                              {terms.map((term, index) => (
                                <option key={index} value={term}>{term}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}

                      {filters.resultType === 'student' && (
                        <>
                          <div>
                            <label style={{
                              display: 'block',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              color: colors.gray700,
                              marginBottom: '0.25rem',
                            }}>
                              Class
                            </label>
                            <select
                              name="resultClass"
                              value={filters.resultClass}
                              onChange={handleFilterChange}
                              style={inputStyle}
                            >
                              <option value="">Select Class</option>
                              {classes.length > 0 ? (
                                classes.map((cls, index) => (
                                  <option key={index} value={cls.name}>{cls.name}</option>
                                ))
                              ) : (
                                <option value="" disabled>No classes available</option>
                              )}
                            </select>
                          </div>

                          <div>
                            <label style={{
                              display: 'block',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              color: colors.gray700,
                              marginBottom: '0.25rem',
                            }}>
                              Student
                            </label>
                            <select
                              name="resultStudent"
                              value={filters.resultStudent}
                              onChange={handleFilterChange}
                              style={inputStyle}
                              disabled={!filters.resultClass}
                            >
                              <option value="">Select Student</option>
                              {filters.resultClass ? (
                                getFilteredStudentsForResults(filters.resultClass).length > 0 ? (
                                  getFilteredStudentsForResults(filters.resultClass).map(user => (
                                    <option key={user._id} value={user._id}>
                                      {`${user.name || 'N/A'} ${user.surname || 'N/A'}`}
                                    </option>
                                  ))
                                ) : (
                                  <option value="" disabled>No students in this class</option>
                                )
                              ) : (
                                <option value="" disabled>Select a class first</option>
                              )}
                            </select>
                          </div>
                          
                          <div>
                            <label style={{
                              display: 'block',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              color: colors.gray700,
                              marginBottom: '0.25rem',
                            }}>
                              Session
                            </label>
                            <select
                              name="reportSession"
                              value={filters.reportSession}
                              onChange={handleFilterChange}
                              style={inputStyle}
                            >
                              <option value="">Select Session</option>
                              {sessions.length > 0 ? (
                                sessions.map((session, index) => (
                                  <option key={index} value={session}>{session}</option>
                                ))
                              ) : (
                                <option value="" disabled>No sessions available</option>
                              )}
                            </select>
                          </div>
                          
                          <div>
                            <label style={{
                              display: 'block',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              color: colors.gray700,
                              marginBottom: '0.25rem',
                            }}>
                              Term
                            </label>
                            <select
                              name="resultTerm"
                              value={filters.resultTerm}
                              onChange={handleFilterChange}
                              style={inputStyle}
                            >
                              <option value="">Select Term</option>
                              {terms.map((term, index) => (
                                <option key={index} value={term}>{term}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <div style={{
                    background: `linear-gradient(135deg, ${colors.blue} 0%, #2563eb 100%)`,
                    borderRadius: '12px',
                    padding: '1.5rem',
                    color: colors.white,
                  }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                      Results Export
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem' }}>
                      {[
                        'CSV format for easy analysis',
                        'Includes scores, grades, and rankings',
                        'Performance statistics included',
                        'Filter by multiple criteria',
                        'Export by term or all terms',
                      ].map((item, index) => (
                        <li key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <CheckCircleIcon />
                          <span style={{ marginLeft: '0.5rem' }}>{item}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <button
                      onClick={exportResults}
                      disabled={exporting || 
                        (filters.resultType === 'class' && !filters.resultClass) ||
                        (filters.resultType === 'student' && (!filters.resultStudent || !filters.reportSession || !filters.resultTerm))}
                      style={{
                        ...buttonStyle('white', exporting || 
                          (filters.resultType === 'class' && !filters.resultClass) ||
                          (filters.resultType === 'student' && (!filters.resultStudent || !filters.reportSession || !filters.resultTerm))),
                        width: '100%',
                        color: colors.blue,
                      }}
                    >
                      {exporting ? (
                        <>
                          <div style={{ animation: 'spin 1s linear infinite' }}>
                            <LoaderIcon />
                          </div>
                          Exporting...
                        </>
                      ) : (
                        <>
                          <FileChartIcon />
                          Export Results Data
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Export Report Cards Tab */}
          {activeTab === 'reports' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ color: colors.primary, marginRight: '0.75rem' }}>
                  <AwardIcon />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: colors.gray900 }}>
                    Export Report Cards
                  </h2>
                  <p style={{ color: colors.gray600 }}>
                    Generate professional PDF report cards for students
                  </p>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '2rem',
              }}>
                <div>
                  <div style={{
                    background: colors.gray50,
                    borderRadius: '8px',
                    padding: '1rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <FilterIcon />
                      <h3 style={{ fontWeight: '600', color: colors.gray900, marginLeft: '0.5rem' }}>
                        Report Card Details
                      </h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: colors.gray700,
                          marginBottom: '0.25rem',
                        }}>
                          Class
                        </label>
                        <select
                          name="reportClass"
                          value={filters.reportClass}
                          onChange={handleFilterChange}
                          style={inputStyle}
                        >
                          <option value="">Select Class</option>
                          {classes.length > 0 ? (
                            classes.map((cls, index) => (
                              <option key={index} value={cls.name}>{cls.name}</option>
                            ))
                          ) : (
                            <option value="" disabled>No classes available</option>
                          )}
                        </select>
                      </div>
                      
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: colors.gray700,
                          marginBottom: '0.25rem',
                        }}>
                          Student
                        </label>
                        <select
                          name="reportStudent"
                          value={filters.reportStudent}
                          onChange={handleFilterChange}
                          style={inputStyle}
                          disabled={!filters.reportClass}
                        >
                          <option value="">Select Student</option>
                          {filters.reportClass ? (
                            getFilteredStudentsByClass(filters.reportClass).length > 0 ? (
                              getFilteredStudentsByClass(filters.reportClass).map(user => (
                                <option key={user._id} value={user._id}>
                                  {`${user.name || 'N/A'} ${user.surname || 'N/A'}`}
                                </option>
                              ))
                            ) : (
                              <option value="" disabled>No students in this class</option>
                            )
                          ) : (
                            <option value="" disabled>Select a class first</option>
                          )}
                        </select>
                      </div>
                      
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: colors.gray700,
                          marginBottom: '0.25rem',
                        }}>
                          Session
                        </label>
                        <select
                          name="reportSession"
                          value={filters.reportSession}
                          onChange={handleFilterChange}
                          style={inputStyle}
                        >
                          <option value="">Select Session</option>
                          {sessions.length > 0 ? (
                            sessions.map((session, index) => (
                              <option key={index} value={session}>{session}</option>
                            ))
                          ) : (
                            <option value="" disabled>No sessions available</option>
                          )}
                        </select>
                      </div>
                      
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: colors.gray700,
                          marginBottom: '0.25rem',
                        }}>
                          Term
                        </label>
                        <select
                          name="reportTerm"
                          value={filters.reportTerm}
                          onChange={handleFilterChange}
                          style={inputStyle}
                        >
                          <option value="">Select Term</option>
                          {terms.map((term, index) => (
                            <option key={index} value={term}>{term}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    background: 'rgba(214, 158, 46, 0.1)',
                    borderLeft: `4px solid ${colors.yellow}`,
                    padding: '1rem',
                    borderRadius: '0 4px 4px 0',
                    marginTop: '1.5rem',
                  }}>
                    <div style={{ display: 'flex' }}>
                      <AlertCircleIcon style={{ color: colors.yellow }} />
                      <div style={{ marginLeft: '0.75rem' }}>
                        <p style={{ fontSize: '0.875rem', color: '#92400e' }}>
                          Report cards include academic performance, attendance, teacher comments, and official signatures.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div style={{
                    background: `linear-gradient(135deg, ${colors.purple} 0%, #7c3aed 100%)`,
                    borderRadius: '12px',
                    padding: '1.5rem',
                    color: colors.white,
                  }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                      Report Card Features
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem' }}>
                      {[
                        'Professional PDF format',
                        'Academic performance summary',
                        'Teacher and principal comments',
                        'Official school branding',
                        'Digital signatures support',
                        'Export by specific term',
                      ].map((item, index) => (
                        <li key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <CheckCircleIcon />
                          <span style={{ marginLeft: '0.5rem' }}>{item}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <button
                      onClick={exportReportCard}
                      disabled={exporting || !filters.reportStudent || !filters.reportSession || !filters.reportTerm}
                      style={{
                        ...buttonStyle('white', exporting || !filters.reportStudent || !filters.reportSession || !filters.reportTerm),
                        width: '100%',
                        color: colors.purple,
                      }}
                    >
                      {exporting ? (
                        <>
                          <div style={{ animation: 'spin 1s linear infinite' }}>
                            <LoaderIcon />
                          </div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <DownloadIcon />
                          Generate Report Card
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upload Signatures Tab (Admin Only) */}
          {activeTab === 'signatures' && (user?.role === 'admin' || user?.role === 'super_admin') && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ color: colors.primary, marginRight: '0.75rem' }}>
                  <UploadIcon />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: colors.gray900 }}>
                    Upload Signatures
                  </h2>
                  <p style={{ color: colors.gray600 }}>
                    Upload digital signatures for report cards
                  </p>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '2rem',
              }}>
                <div>
                  <form onSubmit={handleSignatureSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{
                      background: colors.gray50,
                      borderRadius: '8px',
                      padding: '1rem',
                    }}>
                      <h3 style={{ fontWeight: '600', color: colors.gray900, marginBottom: '1rem' }}>
                        Signature Upload
                      </h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: colors.gray700,
                            marginBottom: '0.25rem',
                          }}>
                            Class (Optional for Principal's Signature)
                          </label>
                          <select
                            name="className"
                            value={signatureData.className}
                            onChange={(e) => setSignatureData(prev => ({ ...prev, className: e.target.value }))}
                            style={inputStyle}
                          >
                            <option value="">Select Class (Optional)</option>
                            {classes.length > 0 ? (
                              classes.map((cls, index) => (
                                <option key={index} value={cls.name}>{cls.name}</option>
                              ))
                            ) : (
                              <option value="" disabled>No classes available</option>
                            )}
                          </select>
                          <p style={{ fontSize: '0.75rem', color: colors.gray500, marginTop: '0.25rem' }}>
                            Required for class teacher signature
                          </p>
                        </div>
                        
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: colors.gray700,
                            marginBottom: '0.25rem',
                          }}>
                            Class Teacher's Signature
                          </label>
                          <div style={{
                            border: `2px dashed ${colors.gray300}`,
                            borderRadius: '8px',
                            padding: '1.5rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'border-color 0.3s ease',
                          }}>
                            <input
                              type="file"
                              name="classTeacherSignature"
                              accept=".jpg,.jpeg,.png,.svg"
                              onChange={handleSignatureChange}
                              style={{ display: 'none' }}
                              id="teacherSignature"
                            />
                            <label htmlFor="teacherSignature" style={{ cursor: 'pointer' }}>
                              <UploadIcon style={{ color: colors.gray400, margin: '0 auto 0.5rem' }} />
                              <p style={{ fontSize: '0.875rem', color: colors.gray600 }}>
                                {signatureData.classTeacherSignature 
                                  ? signatureData.classTeacherSignature.name 
                                  : 'Click to upload class teacher signature'}
                              </p>
                              <p style={{ fontSize: '0.75rem', color: colors.gray500, marginTop: '0.25rem' }}>
                                JPG, PNG, or SVG up to 5MB
                              </p>
                            </label>
                          </div>
                        </div>
                        
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: colors.gray700,
                            marginBottom: '0.25rem',
                          }}>
                            Principal's Signature (Global)
                          </label>
                          <div style={{
                            border: `2px dashed ${colors.gray300}`,
                            borderRadius: '8px',
                            padding: '1.5rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'border-color 0.3s ease',
                          }}>
                            <input
                              type="file"
                              name="principalSignature"
                              accept=".jpg,.jpeg,.png,.svg"
                              onChange={handleSignatureChange}
                              style={{ display: 'none' }}
                              id="principalSignature"
                            />
                            <label htmlFor="principalSignature" style={{ cursor: 'pointer' }}>
                              <UploadIcon style={{ color: colors.gray400, margin: '0 auto 0.5rem' }} />
                              <p style={{ fontSize: '0.875rem', color: colors.gray600 }}>
                                {signatureData.principalSignature 
                                  ? signatureData.principalSignature.name 
                                  : 'Click to upload principal signature'}
                              </p>
                              <p style={{ fontSize: '0.75rem', color: colors.gray500, marginTop: '0.25rem' }}>
                                JPG, PNG, or SVG up to 5MB
                              </p>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={!signatureData.className && !signatureData.principalSignature}
                      style={{
                        ...buttonStyle('primary', !signatureData.className && !signatureData.principalSignature),
                        width: '100%',
                      }}
                    >
                      <UploadIcon />
                      Upload Signatures
                    </button>
                  </form>
                </div>
                
                <div>
                  <div style={{
                    background: `linear-gradient(135deg, ${colors.green} 0%, #059669 100%)`,
                    borderRadius: '12px',
                    padding: '1.5rem',
                    color: colors.white,
                  }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                      Signature Guidelines
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem' }}>
                      {[
                        'Class teacher signatures are specific to each class',
                        'Principal signature is global and appears on all report cards',
                        'Recommended format: Transparent PNG with white signature',
                        'Optimal size: 300x100 pixels',
                        'Max file size: 5MB per signature',
                      ].map((item, index) => (
                        <li key={index} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <CheckCircleIcon style={{ marginTop: '0.125rem' }} />
                          <span style={{ marginLeft: '0.5rem' }}>{item}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      padding: '1rem',
                    }}>
                      <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                        Current Signatures
                      </h4>
                      <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                        Upload signatures to automatically appear on all generated report cards.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
        }}>
          <div style={{
            background: colors.white,
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                padding: '0.75rem',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '8px',
                marginRight: '1rem',
              }}>
                <UsersIcon style={{ color: colors.blue }} />
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: colors.gray600 }}>
                  Total Students
                </p>
                <p style={{ fontSize: '1.5rem', fontWeight: '700', color: colors.gray900 }}>
                  {users.filter(u => u.role === 'student').length}
                </p>
              </div>
            </div>
          </div>
          
          <div style={{
            background: colors.white,
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                padding: '0.75rem',
                background: 'rgba(56, 161, 105, 0.1)',
                borderRadius: '8px',
                marginRight: '1rem',
              }}>
                <FileTextIcon style={{ color: colors.green }} />
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: colors.gray600 }}>
                  Available Classes
                </p>
                <p style={{ fontSize: '1.5rem', fontWeight: '700', color: colors.gray900 }}>
                  {classes.length}
                </p>
              </div>
            </div>
          </div>
          
          <div style={{
            background: colors.white,
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                padding: '0.75rem',
                background: 'rgba(139, 92, 246, 0.1)',
                borderRadius: '8px',
                marginRight: '1rem',
              }}>
                <AwardIcon style={{ color: colors.purple }} />
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: colors.gray600 }}>
                  Available Terms
                </p>
                <p style={{ fontSize: '1.5rem', fontWeight: '700', color: colors.gray900 }}>
                  {terms.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add CSS animation for spinner */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @media (min-width: 768px) {
            .grid-md-2 {
              grid-template-columns: repeat(2, 1fr);
            }
            .grid-md-3 {
              grid-template-columns: repeat(3, 1fr);
            }
          }
        `}
      </style>
    </div>
  );
};

export default DataExports;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useTeacherData from '../../hooks/useTeacherData';
import {
  FiUpload,
  FiFileText,
  FiEdit2,
  FiCheck,
  FiX,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiFile,
  FiCopy,
  FiTrash2,
  FiBook,
  FiHash
} from 'react-icons/fi';

const BulkImport = () => {
  const { user, fetchQuestions, error, success, setError, setSuccess, navigate } = useTeacherData();
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [uploadMethod, setUploadMethod] = useState('word');
  const [wordFile, setWordFile] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [step, setStep] = useState(1);

  // Extract teacher assignments
  useEffect(() => {
    if (user && user.role === 'teacher') {
      const teacherAssignments = user.teacherAssignments || [];
      const userSubjects = user.subjects || [];
      
      // Process assignments to get classes and their subjects
      const classMap = new Map();
      const subjectMap = new Map();
      
      if (teacherAssignments.length > 0) {
        teacherAssignments.forEach(assignment => {
          const classId = assignment.class?._id || assignment.class;
          const className = assignment.className || assignment.class?.name || 'Unknown Class';
          
          if (classId && className) {
            // Add class to classMap
            if (!classMap.has(classId)) {
              classMap.set(classId, {
                id: classId,
                name: className,
                subjects: new Set()
              });
            }
            
            // Add subjects for this class
            if (assignment.subjects && assignment.subjects.length > 0) {
              assignment.subjects.forEach(subject => {
                const subjectName = subject.subjectName || subject.subject || subject.subject?.name;
                if (subjectName) {
                  classMap.get(classId).subjects.add(subjectName);
                  subjectMap.set(subjectName, true);
                }
              });
            }
          }
        });
      } else if (userSubjects.length > 0) {
        // Fallback to user.subjects
        userSubjects.forEach(subject => {
          const subjectName = subject.subject || subject.name || '';
          const classId = subject.class || subject.classId || '';
          const className = subject.className || subject.class || 'Unknown Class';
          
          if (classId && className) {
            if (!classMap.has(classId)) {
              classMap.set(classId, {
                id: classId,
                name: className,
                subjects: new Set()
              });
            }
            if (subjectName) {
              classMap.get(classId).subjects.add(subjectName);
              subjectMap.set(subjectName, true);
            }
          }
        });
      }
      
      // Convert to arrays
      const classArray = Array.from(classMap.values()).map(cls => ({
        ...cls,
        subjects: Array.from(cls.subjects)
      }));
      
      const subjectArray = Array.from(subjectMap.keys()).sort();
      
      setClasses(classArray);
      setSubjects(subjectArray);
      
      // Auto-select first class and its subjects if available
      if (classArray.length > 0 && !selectedClass) {
        const firstClass = classArray[0];
        setSelectedClass(firstClass.id);
        setAvailableSubjects(firstClass.subjects);
        if (firstClass.subjects.length > 0) {
          setSelectedSubject(firstClass.subjects[0]);
        }
      }
    } else if (!user) {
      setError('Session expired. Please log in again.');
      navigate('/login');
    }
  }, [user, setError, navigate]);

  // Update available subjects when class changes
  useEffect(() => {
    if (selectedClass && classes.length > 0) {
      const selectedClassData = classes.find(cls => cls.id === selectedClass);
      if (selectedClassData) {
        setAvailableSubjects(selectedClassData.subjects);
        // Reset subject if not available for new class
        if (!selectedClassData.subjects.includes(selectedSubject)) {
          setSelectedSubject(selectedClassData.subjects.length > 0 ? selectedClassData.subjects[0] : '');
        }
      }
    }
  }, [selectedClass, classes]);

  // Word document upload handler
  const handleWordUpload = async () => {
    if (!wordFile) {
      setError('Please select a Word document (.docx)');
      return;
    }
    
    if (!selectedSubject || !selectedClass) {
      setError('Please select a subject and class first');
      return;
    }

    setParsing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('document', wordFile);
      formData.append('subject', selectedSubject);
      formData.append('class', selectedClass);
      
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      const response = await axios.post('http://localhost:5000/api/questions/parse/word', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        const questions = response.data.questions || [];
        
        // Get class name for display
        const selectedClassData = classes.find(cls => cls.id === selectedClass);
        const className = selectedClassData?.name || selectedClass;
        
        // Process questions to match Question.js model
        const enhancedQuestions = questions.map(q => ({
          text: q.text || '',
          options: q.options || ['', '', '', ''],
          correctAnswer: q.correctAnswer || '',
          marks: parseInt(q.marks) || 1,
          subject: selectedSubject,
          class: selectedClass,
          className: className,
          difficulty: q.difficulty || 'medium',
          explanation: q.explanation || '',
          formula: q.formula || '',
          type: 'multiple_choice',
          saveToBank: true,
          inQuestionBank: true
        }));
        
        setParsedQuestions(enhancedQuestions);
        setStep(2);
        setSuccess(`Successfully parsed ${enhancedQuestions.length} questions from "${wordFile.name}"`);
      } else {
        setError(response.data.message || 'Failed to parse document');
      }
    } catch (err) {
      console.error('Word upload error:', err);
      const errorMsg = err.response?.data?.message || 
                      err.response?.data?.error || 
                      'Failed to upload document. Please try again.';
      setError(errorMsg);
    } finally {
      setParsing(false);
    }
  };

  // Text parsing handler
  const handleTextParse = async () => {
    if (!textInput.trim()) {
      setError('Please enter question text');
      return;
    }
    
    if (!selectedSubject || !selectedClass) {
      setError('Please select a subject and class first');
      return;
    }

    setParsing(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      const response = await axios.post('http://localhost:5000/api/questions/parse/text', {
        text: textInput,
        subject: selectedSubject,
        class: selectedClass
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        const questions = response.data.questions || [];
        
        // Get class name for display
        const selectedClassData = classes.find(cls => cls.id === selectedClass);
        const className = selectedClassData?.name || selectedClass;
        
        // Process questions to match Question.js model
        const enhancedQuestions = questions.map(q => ({
          text: q.text || '',
          options: q.options || ['', '', '', ''],
          correctAnswer: q.correctAnswer || '',
          marks: parseInt(q.marks) || 1,
          subject: selectedSubject,
          class: selectedClass,
          className: className,
          difficulty: q.difficulty || 'medium',
          explanation: q.explanation || '',
          formula: q.formula || '',
          type: 'multiple_choice',
          saveToBank: true,
          inQuestionBank: true
        }));
        
        setParsedQuestions(enhancedQuestions);
        setStep(2);
        setSuccess(`Successfully parsed ${enhancedQuestions.length} questions from text input`);
      } else {
        setError(response.data.message || 'Failed to parse text');
      }
    } catch (err) {
      console.error('Text parse error:', err);
      const errorMsg = err.response?.data?.message || 
                      err.response?.data?.error || 
                      'Failed to parse questions. Please check formatting.';
      setError(errorMsg);
    } finally {
      setParsing(false);
    }
  };

  // Start editing a question
  const startEditQuestion = (index) => {
    setEditingIndex(index);
    setEditForm({ ...parsedQuestions[index] });
  };

  // Save edited question
  const saveEditQuestion = () => {
    if (!editForm.text || editForm.text.trim().length === 0) {
      setError('Question text is required');
      return;
    }
    
    if (!editForm.options || editForm.options.length < 2) {
      setError('At least 2 options are required');
      return;
    }
    
    if (!editForm.correctAnswer || editForm.correctAnswer.trim().length === 0) {
      setError('Correct answer is required');
      return;
    }
    
    const nonEmptyOptions = editForm.options.filter(opt => opt && opt.trim());
    if (!nonEmptyOptions.includes(editForm.correctAnswer.trim())) {
      setError('Correct answer must be one of the options');
      return;
    }
    
    const updatedQuestions = [...parsedQuestions];
    updatedQuestions[editingIndex] = { ...editForm };
    setParsedQuestions(updatedQuestions);
    setEditingIndex(null);
    setEditForm(null);
    setSuccess('Question updated successfully');
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  // Remove a question
  const removeQuestion = (index) => {
    const updatedQuestions = parsedQuestions.filter((_, i) => i !== index);
    setParsedQuestions(updatedQuestions);
    setSuccess('Question removed');
  };

  // Validate all questions before saving
  const validateAllQuestions = () => {
    const errors = [];
    
    parsedQuestions.forEach((q, index) => {
      if (!q.text || q.text.trim().length === 0) {
        errors.push(`Question ${index + 1}: Text is required`);
      } else if (q.text.length < 10) {
        errors.push(`Question ${index + 1}: Text must be at least 10 characters`);
      }
      
      const nonEmptyOptions = q.options.filter(opt => opt && opt.trim());
      if (nonEmptyOptions.length < 2) {
        errors.push(`Question ${index + 1}: Need at least 2 non-empty options`);
      } else if (nonEmptyOptions.length > 6) {
        errors.push(`Question ${index + 1}: Cannot have more than 6 options`);
      }
      
      if (!q.correctAnswer || q.correctAnswer.trim().length === 0) {
        errors.push(`Question ${index + 1}: Correct answer is required`);
      } else if (!nonEmptyOptions.includes(q.correctAnswer.trim())) {
        errors.push(`Question ${index + 1}: Correct answer must match one of the options`);
      }
      
      if (!q.marks || q.marks < 1 || q.marks > 100) {
        errors.push(`Question ${index + 1}: Marks must be between 1 and 100`);
      }
    });
    
    return errors;
  };

  // Save all questions to database - FIXED VERSION
  const saveAllQuestions = async () => {
    if (parsedQuestions.length === 0) {
      setError('No questions to save');
      return;
    }
    
    // Validate all questions
    const validationErrors = validateAllQuestions();
    if (validationErrors.length > 0) {
      setError(`Please fix the following errors:\n${validationErrors.join('\n')}`);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      // Get user ID for createdBy field
      const userId = user?._id || user?.id;
      
      if (!userId) {
        throw new Error('User ID not found. Please log in again.');
      }

      // Save questions individually to avoid bulk validation issues
      const savedQuestions = [];
      const errors = [];
      
      for (let i = 0; i < parsedQuestions.length; i++) {
        try {
          const q = parsedQuestions[i];
          
          // Clean and validate options
          const cleanedOptions = q.options
            .filter(opt => opt && opt.trim())
            .map(opt => opt.trim());
          
          const cleanedCorrectAnswer = q.correctAnswer.trim();
          if (!cleanedOptions.includes(cleanedCorrectAnswer)) {
            errors.push(`Question ${i + 1}: Correct answer must match one of the options`);
            continue;
          }
          
          // Prepare question data - using the structure that works with your schema
          const questionData = {
            subject: selectedSubject,
            class: selectedClass,
            text: q.text.trim(),
            type: 'multiple_choice',
            options: cleanedOptions,
            correctAnswer: cleanedCorrectAnswer,
            marks: parseInt(q.marks) || 1,
            difficulty: q.difficulty || 'medium',
            tags: [],
            formula: q.formula || '',
            explanation: q.explanation || '',
            createdBy: userId,
            testId: null,
            saveToBank: true,
            inQuestionBank: true,
            isActive: true
          };
          
          // Try to save question individually
          const response = await axios.post('/api/teacher/questions', 
            questionData, 
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (response.data.success) {
            savedQuestions.push(response.data.question);
          } else {
            errors.push(`Question ${i + 1}: ${response.data.error || 'Failed to save'}`);
          }
        } catch (singleErr) {
          console.error(`Error saving question ${i + 1}:`, singleErr.response?.data || singleErr.message);
          
          // Try alternative structure if first attempt fails
          try {
            const q = parsedQuestions[i];
            
            // Alternative: Try with options wrapped differently
            const cleanedOptions = q.options
              .filter(opt => opt && opt.trim())
              .map(opt => opt.trim());
            
            // Your schema might be expecting options to be objects with specific structure
            // Let's try sending them as simple strings
            const alternativeData = {
              subject: selectedSubject,
              class: selectedClass,
              text: q.text.trim(),
              type: 'multiple_choice',
              options: cleanedOptions, // Just array of strings
              correctAnswer: q.correctAnswer.trim(),
              marks: parseInt(q.marks) || 1,
              difficulty: q.difficulty || 'medium',
              createdBy: userId,
              saveToBank: true,
              inQuestionBank: true
            };
            
            const altResponse = await axios.post('/api/teacher/questions', 
              alternativeData, 
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (altResponse.data.success) {
              savedQuestions.push(altResponse.data.question);
            } else {
              errors.push(`Question ${i + 1}: Alternative save failed`);
            }
          } catch (altErr) {
            errors.push(`Question ${i + 1}: ${altErr.response?.data?.error || altErr.message}`);
          }
        }
      }
      
      if (savedQuestions.length > 0) {
        setSuccess(`Successfully saved ${savedQuestions.length} out of ${parsedQuestions.length} questions to your question bank!`);
        setStep(3);
        
        // Force refresh questions in parent component
        if (fetchQuestions) {
          await fetchQuestions();
        }
        
        // Navigate to manage questions after delay
        setTimeout(() => {
          navigate('/teacher/questions');
        }, 3000);
      } else {
        setError(`Failed to save any questions. ${errors.length > 0 ? 'Errors: ' + errors.join(', ') : ''}`);
      }
      
    } catch (err) {
      console.error('Save questions error:', err);
      
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to create questions.');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        const errorMsg = err.response?.data?.message || 
                        err.response?.data?.error || 
                        'Failed to save questions. Please try again.';
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setStep(1);
    setParsedQuestions([]);
    setWordFile(null);
    setTextInput('');
    setEditingIndex(null);
    setEditForm(null);
    setError(null);
    setSuccess(null);
  };

  // Example text format
  const exampleText = `Question 1:
What is the capital of Nigeria?

A. Lagos
B. Abuja
C. Ibadan
D. Benin

Correct Answer: B

Question 2:
Who is the current president of the United States?

A. Barack Obama
B. Donald Trump
C. Joe Biden
D. George Bush

Correct Answer: C
Marks: 2

Question 3:
What is the chemical formula for water?

A. CO2
B. H2O
C. O2
D. NaCl

Correct Answer: B
Explanation: Water consists of two hydrogen atoms and one oxygen atom.`;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>Bulk Question Import</h2>
        <p style={styles.headerSubtitle}>Upload Word documents or paste text - Questions will save to your question bank</p>
      </div>

      {error && (
        <div style={styles.alertError}>
          <FiAlertTriangle style={styles.alertIcon} />
          <div style={styles.alertContent}>
            <span>{error}</span>
          </div>
        </div>
      )}
      {success && (
        <div style={styles.alertSuccess}>
          <FiCheckCircle style={styles.alertIcon} />
          <span>{success}</span>
        </div>
      )}

      {step === 1 && (
        <>
          <div style={styles.instructionCard}>
            <h3 style={styles.instructionTitle}>Easy Bulk Upload - Choose Your Method</h3>
            <div style={styles.methodsContainer}>
              <div 
                style={{
                  ...styles.methodCard,
                  borderColor: uploadMethod === 'word' ? '#4B5320' : '#E0E0E0',
                  backgroundColor: uploadMethod === 'word' ? '#F9F9F9' : '#FFFFFF'
                }}
                onClick={() => setUploadMethod('word')}
              >
                <FiFile style={styles.methodIcon} />
                <h4 style={styles.methodTitle}>Upload Word Document</h4>
                <p style={styles.methodDescription}>
                  Upload a .docx file with your questions. Format each question as shown in the example.
                </p>
                <div style={styles.methodBadge}>
                  Recommended for large sets
                </div>
              </div>
              
              <div 
                style={{
                  ...styles.methodCard,
                  borderColor: uploadMethod === 'text' ? '#4B5320' : '#E0E0E0',
                  backgroundColor: uploadMethod === 'text' ? '#F9F9F9' : '#FFFFFF'
                }}
                onClick={() => setUploadMethod('text')}
              >
                <FiCopy style={styles.methodIcon} />
                <h4 style={styles.methodTitle}>Paste Text</h4>
                <p style={styles.methodDescription}>
                  Copy and paste questions directly. Use the same formatting as the Word document.
                </p>
                <div style={styles.methodBadge}>
                  Quick for small sets
                </div>
              </div>
            </div>
          </div>

          <div style={styles.formatExample}>
            <h3 style={styles.exampleTitle}>Required Format</h3>
            <div style={styles.codeBlock}>
              <pre style={styles.codePre}>
{`Question 1:
[Your question text here?]

A. [Option A]
B. [Option B]
C. [Option C]
D. [Option D]

Correct Answer: [Letter or full text of correct option]

Question 2:
[Next question...]

A. [Option A]
B. [Option B]

Correct Answer: [Correct answer]
Marks: [Optional marks, default 1]
Explanation: [Optional explanation]`}
              </pre>
            </div>
            <div style={styles.formatTips}>
              <h4 style={styles.tipsTitle}>Important Notes:</h4>
              <ul style={styles.tipsList}>
                <li><strong>Questions will be saved to your personal question bank</strong></li>
                <li>Each question must have at least 2 non-empty options (max 6)</li>
                <li>Question text must be at least 10 characters</li>
                <li>Correct answer must match one of the options exactly</li>
                <li>Subject and class will be applied to all questions in this batch</li>
              </ul>
            </div>
          </div>

          <div style={styles.uploadForm}>
            {/* Class Selection First */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                <FiHash style={styles.labelIcon} />
                Select Class First *
              </label>
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                style={styles.formInput}
                required
              >
                <option value="">Choose a class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
              {classes.length === 0 && (
                <div style={styles.warningText}>
                  <FiAlertTriangle /> No classes assigned. Please contact admin.
                </div>
              )}
            </div>

            {/* Subject Selection (filtered by class) */}
            {selectedClass && (
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  <FiBook style={styles.labelIcon} />
                  Select Subject (for {classes.find(c => c.id === selectedClass)?.name || 'selected class'}) *
                </label>
                <select
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                  style={styles.formInput}
                  required
                  disabled={!selectedClass || availableSubjects.length === 0}
                >
                  <option value="">Choose a subject</option>
                  {availableSubjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
                {availableSubjects.length === 0 ? (
                  <div style={styles.warningText}>
                    <FiAlertTriangle /> No subjects assigned to this class.
                  </div>
                ) : !selectedSubject ? (
                  <div style={styles.infoText}>
                    Please select a subject for your questions
                  </div>
                ) : null}
              </div>
            )}

            {/* Display current selection */}
            {selectedClass && selectedSubject && (
              <div style={styles.selectionSummary}>
                <div style={styles.summaryItem}>
                  <strong>Class:</strong> {classes.find(c => c.id === selectedClass)?.name}
                </div>
                <div style={styles.summaryItem}>
                  <strong>Subject:</strong> {selectedSubject}
                </div>
                <div style={styles.summaryItem}>
                  <strong>Questions will be saved to:</strong> Your Personal Question Bank
                </div>
              </div>
            )}

            {uploadMethod === 'word' ? (
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Upload Word Document (.docx) *</label>
                <div style={styles.fileUpload}>
                  <input
                    type="file"
                    accept=".docx"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setWordFile(file);
                      }
                    }}
                    style={styles.fileInput}
                    id="wordFileInput"
                  />
                  <label htmlFor="wordFileInput" style={styles.fileLabel}>
                    <div style={styles.filePreview}>
                      {wordFile ? (
                        <div style={styles.fileInfo}>
                          <FiFileText style={styles.fileIcon} />
                          <div style={styles.fileDetails}>
                            <span style={styles.fileName}>{wordFile.name}</span>
                            <span style={styles.fileSize}>
                              {(wordFile.size / 1024).toFixed(2)} KB
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setWordFile(null);
                            }}
                            style={styles.clearFileButton}
                          >
                            <FiX />
                          </button>
                        </div>
                      ) : (
                        <div style={styles.filePlaceholder}>
                          <FiUpload style={styles.uploadIcon} />
                          <span>Click to select Word document (.docx)</span>
                          <small style={styles.fileHint}>Max 10MB</small>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleWordUpload}
                  disabled={parsing || !wordFile || !selectedSubject || !selectedClass}
                  style={{
                    ...styles.parseButton,
                    backgroundColor: parsing || !wordFile || !selectedSubject || !selectedClass ? '#E0E0E0' : '#4B5320',
                  }}
                >
                  {parsing ? (
                    <>
                      <FiClock style={styles.buttonIcon} />
                      Parsing Document...
                    </>
                  ) : (
                    <>
                      <FiUpload style={styles.buttonIcon} />
                      Parse Document
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Paste Questions (One per block) *</label>
                <div style={styles.textAreaContainer}>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={exampleText}
                    style={styles.textArea}
                    rows={15}
                  />
                  <div style={styles.textCounter}>
                    {textInput.length} characters, {textInput.split('\n').length} lines
                  </div>
                </div>
                <div style={styles.textActions}>
                  <button
                    type="button"
                    onClick={() => setTextInput(exampleText)}
                    style={styles.exampleButton}
                  >
                    Load Example
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTextInput('');
                    }}
                    style={styles.clearButton}
                  >
                    Clear Text
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleTextParse}
                  disabled={parsing || !textInput.trim() || !selectedSubject || !selectedClass}
                  style={{
                    ...styles.parseButton,
                    backgroundColor: parsing || !textInput.trim() || !selectedSubject || !selectedClass ? '#E0E0E0' : '#4B5320',
                  }}
                >
                  {parsing ? (
                    <>
                      <FiClock style={styles.buttonIcon} />
                      Parsing Text...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle style={styles.buttonIcon} />
                      Parse Questions
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {step === 2 && parsedQuestions.length > 0 && (
        <div style={styles.previewContainer}>
          <div style={styles.previewHeader}>
            <div style={styles.previewHeaderTop}>
              <h3 style={styles.previewTitle}>
                Preview Questions ({parsedQuestions.length} found)
              </h3>
            </div>
            <div style={styles.previewMeta}>
              <span style={styles.metaItem}>
                <strong>Class:</strong> {classes.find(c => c.id === selectedClass)?.name}
              </span>
              <span style={styles.metaItem}>
                <strong>Subject:</strong> {selectedSubject}
              </span>
              <span style={styles.metaItem}>
                <strong>Total Marks:</strong> {parsedQuestions.reduce((sum, q) => sum + (parseInt(q.marks) || 1), 0)}
              </span>
              <span style={styles.metaItem}>
                <strong>Valid:</strong> {parsedQuestions.filter(q => {
                  const nonEmptyOptions = q.options.filter(opt => opt && opt.trim());
                  return q.text && q.text.trim() && q.text.length >= 10 &&
                         nonEmptyOptions.length >= 2 && nonEmptyOptions.length <= 6 &&
                         q.correctAnswer && 
                         nonEmptyOptions.includes(q.correctAnswer.trim());
                }).length} / {parsedQuestions.length}
              </span>
            </div>
            <p style={styles.previewSubtitle}>
              Review and edit questions before saving. Click the edit icon to modify any question.
            </p>
          </div>

          <div style={styles.questionsList}>
            {parsedQuestions.map((question, index) => {
              const nonEmptyOptions = question.options.filter(opt => opt && opt.trim());
              const isValid = question.text && question.text.trim() && question.text.length >= 10 &&
                            nonEmptyOptions.length >= 2 && nonEmptyOptions.length <= 6 &&
                            question.correctAnswer && 
                            nonEmptyOptions.includes(question.correctAnswer.trim());
              
              return (
                <div key={index} style={{
                  ...styles.questionCard,
                  borderColor: isValid ? '#28a745' : '#FFC107'
                }}>
                  <div style={styles.questionHeader}>
                    <div style={styles.questionNumberContainer}>
                      <div style={styles.questionNumberRow}>
                        <span style={styles.questionNumber}>Question {index + 1}</span>
                        <span style={styles.questionMarks}>{question.marks || 1} mark(s)</span>
                        {!isValid && (
                          <span style={styles.invalidBadge}>
                            <FiAlertTriangle /> Needs Fix
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={styles.questionActions}>
                      <button
                        onClick={() => startEditQuestion(index)}
                        style={styles.editButton}
                        title="Edit Question"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        onClick={() => removeQuestion(index)}
                        style={styles.removeButton}
                        title="Remove Question"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                  
                  {editingIndex === index ? (
                    <div style={styles.editForm}>
                      <div style={styles.editGroup}>
                        <label style={styles.editLabel}>Question Text * (min 10 characters)</label>
                        <textarea
                          value={editForm.text}
                          onChange={(e) => setEditForm({...editForm, text: e.target.value})}
                          style={styles.editTextarea}
                          rows={3}
                          placeholder="Enter the question text..."
                        />
                        <div style={styles.charCount}>
                          {editForm.text?.length || 0} / 10 characters
                        </div>
                      </div>
                      
                      <div style={styles.editGroup}>
                        <label style={styles.editLabel}>Options (2-6 options, one per line) *</label>
                        <textarea
                          value={editForm.options?.join('\n') || ''}
                          onChange={(e) => setEditForm({
                            ...editForm, 
                            options: e.target.value.split('\n').filter(opt => opt.trim())
                          })}
                          style={styles.editTextarea}
                          rows={4}
                          placeholder="Option A&#10;Option B&#10;Option C&#10;Option D"
                        />
                        <div style={styles.optionsCount}>
                          {editForm.options?.filter(opt => opt && opt.trim()).length || 0} non-empty options
                        </div>
                      </div>
                      
                      <div style={styles.editRow}>
                        <div style={styles.editGroup}>
                          <label style={styles.editLabel}>Correct Answer *</label>
                          <select
                            value={editForm.correctAnswer}
                            onChange={(e) => setEditForm({...editForm, correctAnswer: e.target.value})}
                            style={styles.editSelect}
                          >
                            <option value="">Select correct answer</option>
                            {editForm.options?.filter(opt => opt && opt.trim()).map((opt, i) => (
                              <option key={i} value={opt}>
                                {String.fromCharCode(65 + i)}. {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div style={styles.editGroup}>
                          <label style={styles.editLabel}>Marks (1-100)</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={editForm.marks || 1}
                            onChange={(e) => setEditForm({...editForm, marks: parseInt(e.target.value) || 1})}
                            style={styles.editInput}
                          />
                        </div>
                      </div>
                      
                      <div style={styles.editActions}>
                        <button
                          onClick={saveEditQuestion}
                          style={styles.saveEditButton}
                        >
                          <FiCheck /> Save Changes
                        </button>
                        <button
                          onClick={cancelEdit}
                          style={styles.cancelEditButton}
                        >
                          <FiX /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p style={styles.questionText}>
                        {question.text}
                      </p>
                      
                      <div style={styles.optionsList}>
                        {question.options.filter(opt => opt && opt.trim()).map((option, optIndex) => (
                          <div 
                            key={optIndex} 
                            style={{
                              ...styles.optionItem,
                              backgroundColor: option === question.correctAnswer ? '#d4edda' : '#f8f9fa',
                              borderColor: option === question.correctAnswer ? '#28a745' : '#E0E0E0'
                            }}
                          >
                            <span style={styles.optionLetter}>
                              {String.fromCharCode(65 + optIndex)}.
                            </span>
                            <span style={styles.optionText}>{option}</span>
                            {option === question.correctAnswer && (
                              <FiCheckCircle style={styles.correctIcon} title="Correct Answer" />
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div style={styles.questionMeta}>
                        <div style={styles.metaRow}>
                          <span style={styles.metaItem}>
                            <strong>Class:</strong> {question.className || classes.find(c => c.id === question.class)?.name || question.class}
                          </span>
                          <span style={styles.metaItem}>
                            <strong>Subject:</strong> {question.subject}
                          </span>
                          <span style={styles.metaItem}>
                            <strong>Difficulty:</strong> {question.difficulty || 'medium'}
                          </span>
                          <span style={styles.metaItem}>
                            <strong>Status:</strong> 
                            <span style={{ 
                              color: isValid ? '#28a745' : '#FFC107',
                              marginLeft: '5px'
                            }}>
                              {isValid ? '✓ Valid' : '⚠ Needs Attention'}
                            </span>
                          </span>
                        </div>
                        {question.explanation && (
                          <div style={styles.explanation}>
                            <strong>Explanation:</strong> {question.explanation}
                          </div>
                        )}
                        {question.formula && (
                          <div style={styles.formula}>
                            <strong>Formula:</strong> {question.formula}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div style={styles.previewActions}>
            <button
              onClick={resetForm}
              style={styles.backButton}
            >
              ← Back to Upload
            </button>
            <div style={styles.saveSection}>
              <div style={styles.saveStats}>
                <span>{parsedQuestions.length} questions ready</span>
                <span>{parsedQuestions.filter(q => {
                  const nonEmptyOptions = q.options.filter(opt => opt && opt.trim());
                  return q.text && q.text.trim() && q.text.length >= 10 &&
                         nonEmptyOptions.length >= 2 && nonEmptyOptions.length <= 6 &&
                         q.correctAnswer && 
                         nonEmptyOptions.includes(q.correctAnswer.trim());
                }).length} valid</span>
                <span>Total marks: {parsedQuestions.reduce((sum, q) => sum + (parseInt(q.marks) || 1), 0)}</span>
              </div>
              <button
                onClick={saveAllQuestions}
                disabled={loading || parsedQuestions.length === 0}
                style={{
                  ...styles.saveButton,
                  backgroundColor: loading || parsedQuestions.length === 0 ? '#E0E0E0' : '#28a745',
                }}
              >
                {loading ? (
                  <>
                    <FiClock style={styles.buttonIcon} />
                    Saving Questions...
                  </>
                ) : (
                  <>
                    <FiCheckCircle style={styles.buttonIcon} />
                    Save {parsedQuestions.length} Questions to Bank
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={styles.successContainer}>
          <div style={styles.successCard}>
            <FiCheckCircle style={styles.successIcon} />
            <h3 style={styles.successTitle}>Questions Imported Successfully!</h3>
            <p style={styles.successMessage}>
              Your questions have been saved to your personal question bank.
              You can now use them in tests and assignments.
            </p>
            <div style={styles.successActions}>
              <button
                onClick={() => navigate('/teacher/questions')}
                style={styles.viewQuestionsButton}
              >
                View All Questions
              </button>
              <button
                onClick={resetForm}
                style={styles.importMoreButton}
              >
                Import More Questions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    fontFamily: 'sans-serif',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  header: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    padding: '25px',
    borderRadius: '8px',
    marginBottom: '25px',
    border: '1px solid #000000',
    boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
    position: 'relative',
  },
  headerTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
  },
  headerSubtitle: {
    fontSize: '16px',
    margin: '0',
    color: '#D4A017',
  },
  alertError: {
    backgroundColor: '#FFF3F3',
    color: '#B22222',
    borderLeft: '4px solid #B22222',
    padding: '15px',
    marginBottom: '25px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  alertContent: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertSuccess: {
    backgroundColor: '#d4edda',
    color: '#155724',
    borderLeft: '4px solid #28a745',
    padding: '15px',
    marginBottom: '25px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  alertIcon: {
    fontSize: '20px',
  },
  instructionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '25px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #E0E0E0',
    marginBottom: '25px',
  },
  instructionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 20px 0',
  },
  methodsContainer: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
  },
  methodCard: {
    flex: 1,
    padding: '25px',
    border: '2px solid #E0E0E0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    position: 'relative',
  },
  methodIcon: {
    fontSize: '40px',
    color: '#4B5320',
    marginBottom: '15px',
  },
  methodTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 10px 0',
  },
  methodDescription: {
    fontSize: '14px',
    color: '#666666',
    lineHeight: '1.5',
    margin: '0 0 15px 0',
  },
  methodBadge: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  formatExample: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '25px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #E0E0E0',
    marginBottom: '25px',
  },
  exampleTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 15px 0',
  },
  codeBlock: {
    backgroundColor: '#2D3748',
    color: '#E2E8F0',
    borderRadius: '6px',
    padding: '15px',
    overflowX: 'auto',
    fontFamily: 'monospace',
    fontSize: '14px',
    lineHeight: '1.5',
    marginBottom: '15px',
  },
  codePre: {
    margin: '0',
    whiteSpace: 'pre-wrap',
  },
  formatTips: {
    backgroundColor: '#F8F9FA',
    padding: '15px',
    borderRadius: '6px',
    borderLeft: '4px solid #4B5320',
  },
  tipsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 10px 0',
  },
  tipsList: {
    margin: '0',
    paddingLeft: '20px',
    color: '#666666',
    fontSize: '14px',
    lineHeight: '1.6',
  },
  uploadForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '25px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #E0E0E0',
  },
  formGroup: {
    marginBottom: '25px',
  },
  formLabel: {
    display: 'block',
    marginBottom: '10px',
    color: '#4B5320',
    fontWeight: '600',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  labelIcon: {
    fontSize: '14px',
  },
  formInput: {
    width: '100%',
    padding: '12px',
    border: '1px solid #D3D3D3',
    borderRadius: '4px',
    fontSize: '16px',
    outline: 'none',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    backgroundColor: '#FFFFFF',
  },
  warningText: {
    color: '#DC3545',
    fontSize: '12px',
    marginTop: '5px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  infoText: {
    color: '#0d6efd',
    fontSize: '12px',
    marginTop: '5px',
    fontStyle: 'italic',
  },
  selectionSummary: {
    backgroundColor: '#E8F5E9',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '25px',
    borderLeft: '4px solid #28a745',
  },
  summaryItem: {
    marginBottom: '8px',
    color: '#2E7D32',
    fontSize: '14px',
  },
  fileUpload: {
    position: 'relative',
    marginBottom: '15px',
  },
  fileInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: '0',
    cursor: 'pointer',
    zIndex: 2,
  },
  fileLabel: {
    display: 'block',
    cursor: 'pointer',
  },
  filePreview: {
    border: '2px dashed #CBD5E0',
    borderRadius: '6px',
    padding: '30px',
    textAlign: 'center',
    backgroundColor: '#F8FAFC',
    transition: 'all 0.2s',
    minHeight: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: '15px',
  },
  fileIcon: {
    fontSize: '32px',
    color: '#4B5320',
  },
  fileDetails: {
    flex: 1,
    textAlign: 'left',
  },
  fileName: {
    color: '#4B5320',
    fontWeight: '500',
    fontSize: '16px',
    display: 'block',
    marginBottom: '5px',
  },
  fileSize: {
    color: '#718096',
    fontSize: '14px',
  },
  clearFileButton: {
    backgroundColor: 'transparent',
    color: '#718096',
    border: 'none',
    padding: '5px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  filePlaceholder: {
    color: '#718096',
    fontSize: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  uploadIcon: {
    fontSize: '32px',
    color: '#CBD5E0',
  },
  fileHint: {
    color: '#A0AEC0',
    fontSize: '12px',
  },
  textAreaContainer: {
    position: 'relative',
    marginBottom: '10px',
  },
  textArea: {
    width: '100%',
    padding: '15px',
    border: '1px solid #D3D3D3',
    borderRadius: '4px',
    fontSize: '16px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'monospace',
    lineHeight: '1.5',
    minHeight: '200px',
  },
  textCounter: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '2px 8px',
    borderRadius: '3px',
    fontSize: '12px',
    color: '#718096',
  },
  textActions: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
  },
  exampleButton: {
    padding: '10px 20px',
    backgroundColor: '#E8F4FD',
    color: '#0d6efd',
    border: '1px solid #0d6efd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
  },
  clearButton: {
    padding: '10px 20px',
    backgroundColor: '#FFF3F3',
    color: '#B22222',
    border: '1px solid #B22222',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
  },
  parseButton: {
    width: '100%',
    color: '#FFFFFF',
    border: 'none',
    padding: '15px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all 0.2s',
  },
  buttonIcon: {
    fontSize: '18px',
  },
  previewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '25px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #E0E0E0',
  },
  previewHeader: {
    marginBottom: '30px',
  },
  previewHeaderTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  previewTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0',
  },
  previewMeta: {
    display: 'flex',
    gap: '20px',
    marginBottom: '15px',
    flexWrap: 'wrap',
  },
  metaItem: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
  },
  previewSubtitle: {
    fontSize: '16px',
    color: '#666666',
    margin: '0',
  },
  questionsList: {
    marginBottom: '30px',
  },
  questionCard: {
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    backgroundColor: '#F8FAFC',
  },
  questionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px',
  },
  questionNumberContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    flex: 1,
  },
  questionNumberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  questionNumber: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#4B5320',
  },
  questionMarks: {
    fontSize: '14px',
    color: '#666666',
    backgroundColor: '#FFF8E1',
    padding: '2px 8px',
    borderRadius: '4px',
    display: 'inline-block',
  },
  invalidBadge: {
    backgroundColor: '#FFF3CD',
    color: '#856404',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  questionActions: {
    display: 'flex',
    gap: '10px',
  },
  editButton: {
    backgroundColor: '#E8F4FD',
    color: '#0d6efd',
    border: '1px solid #0d6efd',
    borderRadius: '4px',
    padding: '8px 12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '14px',
  },
  removeButton: {
    backgroundColor: '#FFF3F3',
    color: '#B22222',
    border: '1px solid #B22222',
    borderRadius: '4px',
    padding: '8px 12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '14px',
  },
  questionText: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#333333',
    marginBottom: '20px',
  },
  optionsList: {
    marginBottom: '20px',
  },
  optionItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 15px',
    border: '1px solid #E0E0E0',
    borderRadius: '4px',
    marginBottom: '10px',
    backgroundColor: '#FFFFFF',
  },
  optionLetter: {
    fontWeight: '600',
    color: '#4B5320',
    marginRight: '15px',
    minWidth: '30px',
  },
  optionText: {
    flex: 1,
    fontSize: '16px',
    color: '#333333',
  },
  correctIcon: {
    color: '#28a745',
    fontSize: '18px',
  },
  questionMeta: {
    paddingTop: '15px',
    borderTop: '1px solid #E0E0E0',
  },
  metaRow: {
    display: 'flex',
    gap: '20px',
    marginBottom: '10px',
    flexWrap: 'wrap',
  },
  metaItem: {
    fontSize: '14px',
    color: '#666666',
  },
  explanation: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#F8F9FA',
    borderLeft: '3px solid #6c757d',
    fontSize: '14px',
    color: '#495057',
    borderRadius: '4px',
  },
  formula: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#E8F4FD',
    borderLeft: '3px solid #0d6efd',
    fontSize: '14px',
    color: '#0d6efd',
    borderRadius: '4px',
  },
  editForm: {
    padding: '20px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E0E0E0',
    borderRadius: '6px',
  },
  editGroup: {
    marginBottom: '20px',
  },
  editLabel: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#4B5320',
    fontSize: '14px',
  },
  editTextarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #D3D3D3',
    borderRadius: '4px',
    fontSize: '16px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  charCount: {
    fontSize: '12px',
    color: '#666',
    marginTop: '5px',
    textAlign: 'right',
  },
  optionsCount: {
    fontSize: '12px',
    color: '#666',
    marginTop: '5px',
    textAlign: 'right',
  },
  editRow: {
    display: 'flex',
    gap: '20px',
  },
  editSelect: {
    width: '100%',
    padding: '10px',
    border: '1px solid #D3D3D3',
    borderRadius: '4px',
    fontSize: '16px',
    backgroundColor: '#FFFFFF',
  },
  editInput: {
    width: '100%',
    padding: '10px',
    border: '1px solid #D3D3D3',
    borderRadius: '4px',
    fontSize: '16px',
  },
  editActions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'flex-end',
  },
  saveEditButton: {
    backgroundColor: '#28a745',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },
  cancelEditButton: {
    backgroundColor: '#6c757d',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },
  previewActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '20px',
    borderTop: '1px solid #E0E0E0',
  },
  backButton: {
    backgroundColor: '#6c757d',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 25px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
  },
  saveSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  saveStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    textAlign: 'right',
    color: '#4B5320',
    fontSize: '14px',
  },
  saveButton: {
    backgroundColor: '#28a745',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 30px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  successContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #E0E0E0',
    maxWidth: '500px',
    width: '100%',
  },
  successIcon: {
    fontSize: '64px',
    color: '#28a745',
    marginBottom: '20px',
  },
  successTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 15px 0',
  },
  successMessage: {
    fontSize: '16px',
    color: '#666666',
    lineHeight: '1.6',
    marginBottom: '30px',
  },
  successActions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
  },
  viewQuestionsButton: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 25px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
  },
  importMoreButton: {
    backgroundColor: '#0d6efd',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 25px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
  },
};

export default BulkImport;
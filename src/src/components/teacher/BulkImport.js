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
  FiCopy
} from 'react-icons/fi';

const BulkImport = () => {
  const { user, fetchQuestions, error, success, setError, setSuccess, navigate } = useTeacherData();
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [uploadMethod, setUploadMethod] = useState('word'); // 'word' or 'text'
  const [wordFile, setWordFile] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Success

  useEffect(() => {
    if (user && user.role === 'teacher' && user.subjects) {
      setSubjects([...new Set(user.subjects.map(s => s.subject))].sort());
      setClasses([...new Set(user.subjects.map(s => s.class))].sort());
    } else if (!user) {
      setError('Session expired. Please log in again.');
      navigate('/login');
    }
  }, [user, setError, navigate]);

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
      
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/questions/parse/word', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        setParsedQuestions(response.data.questions);
        setStep(2);
        setSuccess(`Successfully parsed ${response.data.questions.length} questions`);
      } else {
        setError(response.data.message || 'Failed to parse document');
      }
    } catch (err) {
      console.error('Word upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload document. Please try again.');
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
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/questions/parse/text', {
        text: textInput
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setParsedQuestions(response.data.questions);
        setStep(2);
        setSuccess(`Successfully parsed ${response.data.questions.length} questions`);
      } else {
        setError(response.data.message || 'Failed to parse text');
      }
    } catch (err) {
      console.error('Text parse error:', err);
      setError(err.response?.data?.message || 'Failed to parse questions. Please check formatting.');
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
    
    if (!editForm.options.includes(editForm.correctAnswer)) {
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

  // Remove a question
  const removeQuestion = (index) => {
    const updatedQuestions = parsedQuestions.filter((_, i) => i !== index);
    setParsedQuestions(updatedQuestions);
    setSuccess('Question removed');
  };

  // Save all questions to database
  const saveAllQuestions = async () => {
    if (parsedQuestions.length === 0) {
      setError('No questions to save');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/questions/preview/save', {
        questions: parsedQuestions,
        subject: selectedSubject,
        class: selectedClass
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setSuccess(`Successfully saved ${response.data.savedCount} questions to your question bank`);
        setStep(3);
        fetchQuestions();
        
        // Reset form after 3 seconds
        setTimeout(() => {
          navigate('/teacher/questions');
        }, 3000);
      } else {
        setError(response.data.message || 'Failed to save questions');
      }
    } catch (err) {
      console.error('Save questions error:', err);
      setError(err.response?.data?.message || 'Failed to save questions. Please try again.');
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
        <p style={styles.headerSubtitle}>Upload Word documents or paste text - No CSV required</p>
      </div>

      {error && (
        <div style={styles.alertError}>
          <FiAlertTriangle style={styles.alertIcon} />
          <span>{error}</span>
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
                  borderColor: uploadMethod === 'word' ? '#4B5320' : '#E0E0E0'
                }}
                onClick={() => setUploadMethod('word')}
              >
                <FiFile style={styles.methodIcon} />
                <h4 style={styles.methodTitle}>Upload Word Document</h4>
                <p style={styles.methodDescription}>
                  Upload a .docx file with your questions. Format each question as shown in the example.
                </p>
              </div>
              
              <div 
                style={{
                  ...styles.methodCard,
                  borderColor: uploadMethod === 'text' ? '#4B5320' : '#E0E0E0'
                }}
                onClick={() => setUploadMethod('text')}
              >
                <FiCopy style={styles.methodIcon} />
                <h4 style={styles.methodTitle}>Paste Text</h4>
                <p style={styles.methodDescription}>
                  Copy and paste questions directly. Use the same formatting as the Word document.
                </p>
              </div>
            </div>
          </div>

          <div style={styles.formatExample}>
            <h3 style={styles.exampleTitle}>Required Format</h3>
            <div style={styles.codeBlock}>
              <pre style={styles.codePre}>
                Question 1:{"\n"}
                What is the capital of Nigeria?{"\n"}
                {"\n"}
                A. Lagos{"\n"}
                B. Abuja{"\n"}
                C. Ibadan{"\n"}
                D. Benin{"\n"}
                {"\n"}
                Correct Answer: B{"\n"}
                {"\n"}
                Question 2:{"\n"}
                Who is the current president?{"\n"}
                {"\n"}
                A. Option 1{"\n"}
                B. Option 2{"\n"}
                C. Option 3{"\n"}
                D. Option 4{"\n"}
                {"\n"}
                Correct Answer: A{"\n"}
                Marks: 2{"\n"}
                Explanation: Optional explanation here{"\n"}
              </pre>
            </div>
            <p style={styles.exampleNote}>
              Each question must have at least 2 options. Use "Correct Answer:" followed by the option letter or text.
            </p>
          </div>

          <div style={styles.uploadForm}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Select Subject *</label>
              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                style={styles.formInput}
                required
              >
                <option value="">Choose a subject</option>
                {subjects.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Select Class *</label>
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                style={styles.formInput}
                required
              >
                <option value="">Choose a class</option>
                {classes.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            {uploadMethod === 'word' ? (
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Upload Word Document (.docx) *</label>
                <div style={styles.fileUpload}>
                  <input
                    type="file"
                    accept=".docx"
                    onChange={(e) => setWordFile(e.target.files[0])}
                    style={styles.fileInput}
                  />
                  <div style={styles.filePreview}>
                    {wordFile ? (
                      <div style={styles.fileInfo}>
                        <FiFileText style={styles.fileIcon} />
                        <span style={styles.fileName}>{wordFile.name}</span>
                        <span style={styles.fileSize}>
                          {(wordFile.size / 1024).toFixed(2)} KB
                        </span>
                      </div>
                    ) : (
                      <span style={styles.filePlaceholder}>
                        Click to select Word document (.docx)
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleWordUpload}
                  disabled={parsing || !wordFile}
                  style={{
                    ...styles.parseButton,
                    backgroundColor: parsing || !wordFile ? '#E0E0E0' : '#4B5320',
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
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={exampleText}
                  style={styles.textArea}
                  rows={15}
                />
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
                    onClick={() => setTextInput('')}
                    style={styles.clearButton}
                  >
                    Clear Text
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleTextParse}
                  disabled={parsing || !textInput.trim()}
                  style={{
                    ...styles.parseButton,
                    backgroundColor: parsing || !textInput.trim() ? '#E0E0E0' : '#4B5320',
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
            <h3 style={styles.previewTitle}>
              Preview Questions ({parsedQuestions.length} found)
            </h3>
            <p style={styles.previewSubtitle}>
              Review and edit questions before saving. Click the edit icon to modify any question.
            </p>
          </div>

          <div style={styles.questionsList}>
            {parsedQuestions.map((question, index) => (
              <div key={index} style={styles.questionCard}>
                <div style={styles.questionHeader}>
                  <span style={styles.questionNumber}>Question {index + 1}</span>
                  <div style={styles.questionActions}>
                    <button
                      onClick={() => startEditQuestion(index)}
                      style={styles.editButton}
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      onClick={() => removeQuestion(index)}
                      style={styles.removeButton}
                    >
                      <FiX />
                    </button>
                  </div>
                </div>
                
                {editingIndex === index ? (
                  <div style={styles.editForm}>
                    <div style={styles.editGroup}>
                      <label style={styles.editLabel}>Question Text</label>
                      <textarea
                        value={editForm.text}
                        onChange={(e) => setEditForm({...editForm, text: e.target.value})}
                        style={styles.editTextarea}
                        rows={3}
                      />
                    </div>
                    
                    <div style={styles.editGroup}>
                      <label style={styles.editLabel}>Options (one per line)</label>
                      <textarea
                        value={editForm.options.join('\n')}
                        onChange={(e) => setEditForm({
                          ...editForm, 
                          options: e.target.value.split('\n').filter(opt => opt.trim())
                        })}
                        style={styles.editTextarea}
                        rows={4}
                        placeholder="Option A&#10;Option B&#10;Option C&#10;Option D"
                      />
                    </div>
                    
                    <div style={styles.editGroup}>
                      <label style={styles.editLabel}>Correct Answer</label>
                      <select
                        value={editForm.correctAnswer}
                        onChange={(e) => setEditForm({...editForm, correctAnswer: e.target.value})}
                        style={styles.editSelect}
                      >
                        <option value="">Select correct answer</option>
                        {editForm.options.map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div style={styles.editActions}>
                      <button
                        onClick={saveEditQuestion}
                        style={styles.saveEditButton}
                      >
                        <FiCheck /> Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setEditingIndex(null);
                          setEditForm(null);
                        }}
                        style={styles.cancelEditButton}
                      >
                        <FiX /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={styles.questionText}>{question.text}</p>
                    
                    <div style={styles.optionsList}>
                      {question.options.map((option, optIndex) => (
                        <div 
                          key={optIndex} 
                          style={{
                            ...styles.optionItem,
                            backgroundColor: option === question.correctAnswer ? '#d4edda' : 'transparent',
                            borderColor: option === question.correctAnswer ? '#28a745' : '#E0E0E0'
                          }}
                        >
                          <span style={styles.optionLetter}>
                            {String.fromCharCode(65 + optIndex)}.
                          </span>
                          <span style={styles.optionText}>{option}</span>
                          {option === question.correctAnswer && (
                            <FiCheckCircle style={styles.correctIcon} />
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div style={styles.questionMeta}>
                      <span style={styles.metaItem}>
                        <strong>Marks:</strong> {question.marks}
                      </span>
                      <span style={styles.metaItem}>
                        <strong>Difficulty:</strong> {question.difficulty}
                      </span>
                      {question.explanation && (
                        <div style={styles.explanation}>
                          <strong>Explanation:</strong> {question.explanation}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div style={styles.previewActions}>
            <button
              onClick={resetForm}
              style={styles.backButton}
            >
              ← Back to Upload
            </button>
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
      )}

      {step === 3 && (
        <div style={styles.successContainer}>
          <div style={styles.successCard}>
            <FiCheckCircle style={styles.successIcon} />
            <h3 style={styles.successTitle}>Questions Imported Successfully!</h3>
            <p style={styles.successMessage}>
              Your questions have been saved to the question bank.
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
    maxWidth: '900px',
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
  },
  headerTitle: {
    fontSize: '24px',
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
    padding: '20px',
    border: '2px solid #E0E0E0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    backgroundColor: '#FFFFFF',
  },
  methodIcon: {
    fontSize: '32px',
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
    margin: '0',
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
  exampleNote: {
    fontSize: '14px',
    color: '#666666',
    marginTop: '15px',
    fontStyle: 'italic',
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
  },
  codePre: {
    margin: '0',
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
  },
  formInput: {
    width: '100%',
    padding: '12px',
    border: '1px solid #D3D3D3',
    borderRadius: '4px',
    fontSize: '16px',
    outline: 'none',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
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
  },
  filePreview: {
    border: '2px dashed #CBD5E0',
    borderRadius: '6px',
    padding: '30px',
    textAlign: 'center',
    backgroundColor: '#F8FAFC',
    transition: 'all 0.2s',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '15px',
  },
  fileIcon: {
    fontSize: '24px',
    color: '#4B5320',
  },
  fileName: {
    color: '#4B5320',
    fontWeight: '500',
    fontSize: '16px',
  },
  fileSize: {
    color: '#718096',
    fontSize: '14px',
  },
  filePlaceholder: {
    color: '#718096',
    fontSize: '16px',
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
    marginBottom: '15px',
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
  previewTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 10px 0',
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
    alignItems: 'center',
    marginBottom: '15px',
  },
  questionNumber: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#4B5320',
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
  },
  questionText: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#333333',
    marginBottom: '20px',
    paddingLeft: '10px',
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
    paddingLeft: '10px',
  },
  metaItem: {
    display: 'inline-block',
    marginRight: '20px',
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
  },
  editTextarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #D3D3D3',
    borderRadius: '4px',
    fontSize: '16px',
    resize: 'vertical',
  },
  editSelect: {
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
  },
  previewActions: {
    display: 'flex',
    justifyContent: 'space-between',
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
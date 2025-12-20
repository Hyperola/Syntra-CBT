import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  FiArrowLeft, FiSave, FiTrash2, FiPlus, FiX,
  FiClock, FiUsers, FiFileText, FiAlertTriangle
} from 'react-icons/fi';

const EditTest = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [test, setTest] = useState({
    title: '',
    subject: '',
    class: '',
    duration: 60,
    instructions: '',
    status: 'draft'
  });
  const [questions, setQuestions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState({
    questionText: '',
    type: 'mcq',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ],
    marks: 1,
    difficulty: 'medium',
    explanation: '',
    topics: []
  });
  const [editQuestionIndex, setEditQuestionIndex] = useState(null);

  useEffect(() => {
    fetchTest();
    fetchClasses();
  }, [testId]);

  const fetchTest = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/tests/${testId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        const testData = res.data.test;
        setTest({
          title: testData.title || '',
          subject: testData.subject || '',
          class: testData.class?._id || testData.class || '',
          duration: testData.duration || 60,
          instructions: testData.instructions || '',
          status: testData.status || 'draft'
        });
        setQuestions(testData.questions || []);
      } else {
        setError('Test not found or you don\'t have permission to edit it');
      }
    } catch (err) {
      console.error('Error fetching test:', err);
      setError('Failed to load test');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(res.data.classes || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const handleTestChange = (e) => {
    const { name, value } = e.target;
    setTest(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveTest = async () => {
    if (!test.title || !test.subject || !test.duration) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const testData = {
        ...test,
        questions,
        questionCount: questions.length,
        totalMarks: questions.reduce((total, q) => total + (q.marks || 0), 0)
      };

      const res = await axios.put(
        `http://localhost:5000/api/tests/${testId}`,
        testData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setSuccess('Test updated successfully!');
        setTimeout(() => {
          navigate('/admin/tests', { 
            state: { success: 'Test updated successfully!' } 
          });
        }, 1500);
      }
    } catch (err) {
      console.error('Error saving test:', err);
      setError(err.response?.data?.error || 'Failed to save test');
    } finally {
      setSaving(false);
    }
  };

  const openQuestionModal = (index = null) => {
    if (index !== null) {
      setCurrentQuestion({ ...questions[index] });
      setEditQuestionIndex(index);
    } else {
      setCurrentQuestion({
        questionText: '',
        type: 'mcq',
        options: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ],
        marks: 1,
        difficulty: 'medium',
        explanation: '',
        topics: []
      });
      setEditQuestionIndex(null);
    }
    setShowQuestionModal(true);
  };

  const handleQuestionChange = (e) => {
    const { name, value } = e.target;
    setCurrentQuestion(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setCurrentQuestion(prev => ({
      ...prev,
      options: newOptions
    }));
  };

  const handleCorrectOptionChange = (index) => {
    const newOptions = currentQuestion.options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index
    }));
    setCurrentQuestion(prev => ({
      ...prev,
      options: newOptions
    }));
  };

  const addOption = () => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: [...prev.options, { text: '', isCorrect: false }]
    }));
  };

  const removeOption = (index) => {
    if (currentQuestion.options.length <= 2) return;
    const newOptions = currentQuestion.options.filter((_, i) => i !== index);
    setCurrentQuestion(prev => ({
      ...prev,
      options: newOptions
    }));
  };

  const handleTopicsChange = (e) => {
    const topics = e.target.value.split(',').map(topic => topic.trim()).filter(Boolean);
    setCurrentQuestion(prev => ({
      ...prev,
      topics
    }));
  };

  const saveQuestion = () => {
    if (!currentQuestion.questionText.trim()) {
      alert('Please enter question text');
      return;
    }

    if (currentQuestion.type === 'mcq') {
      const validOptions = currentQuestion.options.filter(opt => opt.text.trim());
      if (validOptions.length < 2) {
        alert('Please add at least 2 options');
        return;
      }
      if (!validOptions.some(opt => opt.isCorrect)) {
        alert('Please select a correct option');
        return;
      }
    }

    if (editQuestionIndex !== null) {
      const newQuestions = [...questions];
      newQuestions[editQuestionIndex] = currentQuestion;
      setQuestions(newQuestions);
    } else {
      setQuestions([...questions, { ...currentQuestion, _id: Date.now().toString() }]);
    }

    setShowQuestionModal(false);
  };

  const deleteQuestion = (index) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      const newQuestions = questions.filter((_, i) => i !== index);
      setQuestions(newQuestions);
    }
  };

  const moveQuestion = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= questions.length) return;
    
    const newQuestions = [...questions];
    const [movedQuestion] = newQuestions.splice(fromIndex, 1);
    newQuestions.splice(toIndex, 0, movedQuestion);
    setQuestions(newQuestions);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F8F9FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #4B5320',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <div style={{ color: '#4B5320', fontSize: '16px' }}>Loading test...</div>
        </div>
      </div>
    );
  }

  if (error && !test.title) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F8F9FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: '#FFF3F3',
          color: '#B22222',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <FiAlertTriangle style={{ fontSize: '32px', marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 8px 0' }}>Error</h3>
          <p style={{ margin: 0 }}>{error}</p>
          <button
            onClick={() => navigate('/admin/tests')}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#4B5320',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back to Tests
          </button>
        </div>
      </div>
    );
  }

  const totalMarks = questions.reduce((total, q) => total + (q.marks || 0), 0);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8F9FA',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <button
              onClick={() => navigate('/admin/tests')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#4B5320',
                border: '1px solid #4B5320',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                marginBottom: '16px'
              }}
            >
              <FiArrowLeft /> Back to Tests
            </button>
            
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#4B5320',
              margin: '0 0 8px 0'
            }}>
              Edit Test: {test.title}
            </h1>
            <p style={{ color: '#6B7280', margin: 0 }}>
              Update test details and questions
            </p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            backgroundColor: '#FFF3F3',
            color: '#B22222',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <FiAlertTriangle style={{ fontSize: '20px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div style={{
            backgroundColor: '#E6FFE6',
            color: '#228B22',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span>{success}</span>
          </div>
        )}

        {/* Test Details Form */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#4B5320',
            margin: '0 0 24px 0',
            paddingBottom: '12px',
            borderBottom: '2px solid #F3F4F6'
          }}>
            Test Information
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
            marginBottom: '24px'
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#374151',
                fontWeight: '500'
              }}>
                Test Title *
              </label>
              <input
                type="text"
                name="title"
                value={test.title}
                onChange={handleTestChange}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                placeholder="Enter test title"
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#374151',
                fontWeight: '500'
              }}>
                Subject *
              </label>
              <input
                type="text"
                name="subject"
                value={test.subject}
                onChange={handleTestChange}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                placeholder="e.g., Mathematics, Physics"
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#374151',
                fontWeight: '500'
              }}>
                Class
              </label>
              <select
                name="class"
                value={test.class}
                onChange={handleTestChange}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#374151',
                fontWeight: '500'
              }}>
                Duration (minutes) *
              </label>
              <input
                type="number"
                name="duration"
                value={test.duration}
                onChange={handleTestChange}
                min="1"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#374151',
              fontWeight: '500'
            }}>
              Instructions
            </label>
            <textarea
              name="instructions"
              value={test.instructions}
              onChange={handleTestChange}
              rows="4"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical'
              }}
              placeholder="Enter instructions for students..."
            />
          </div>
        </div>

        {/* Questions Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#4B5320',
                margin: '0 0 8px 0'
              }}>
                Questions
              </h2>
              <p style={{ color: '#6B7280', margin: 0 }}>
                {questions.length} questions • Total marks: {totalMarks}
              </p>
            </div>
            
            <button
              onClick={() => openQuestionModal()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#D4A017',
                color: '#4B5320',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              <FiPlus /> Add Question
            </button>
          </div>

          {questions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              color: '#6B7280',
              border: '2px dashed #E5E7EB',
              borderRadius: '8px'
            }}>
              <FiFileText style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
              <h3 style={{ margin: '0 0 8px 0' }}>No Questions Added</h3>
              <p style={{ margin: 0 }}>Add questions to create your test</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {questions.map((question, index) => (
                <div key={question._id || index} style={{
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: '#F9FAFB'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span style={{
                          backgroundColor: '#4B5320',
                          color: 'white',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {index + 1}
                        </span>
                        <h4 style={{ margin: 0, color: '#374151', flex: 1 }}>
                          {question.questionText}
                        </h4>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          backgroundColor: '#E5E7EB',
                          color: '#374151',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {question.type.toUpperCase()}
                        </span>
                        <span style={{
                          backgroundColor: '#D4A017',
                          color: '#4B5320',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {question.marks} marks
                        </span>
                        {question.difficulty && (
                          <span style={{
                            backgroundColor: '#E5E7EB',
                            color: '#374151',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {question.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => openQuestionModal(index)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#6B7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteQuestion(index)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#DC2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  {question.type === 'mcq' && question.options && (
                    <div style={{ marginTop: '8px' }}>
                      <strong style={{ color: '#6B7280', fontSize: '13px' }}>Options:</strong>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {question.options.filter(opt => opt.text).map((opt, optIndex) => (
                          <div key={optIndex} style={{
                            padding: '4px 8px',
                            backgroundColor: opt.isCorrect ? '#D1FAE5' : '#F3F4F6',
                            border: `1px solid ${opt.isCorrect ? '#059669' : '#E5E7EB'}`,
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {String.fromCharCode(65 + optIndex)}. {opt.text}
                            {opt.isCorrect && ' ✓'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '24px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '16px'
        }}>
          <button
            onClick={() => navigate('/admin/tests')}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: '#4B5320',
              border: '1px solid #4B5320',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveTest}
            disabled={saving}
            style={{
              padding: '12px 24px',
              backgroundColor: '#D4A017',
              color: '#4B5320',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #4B5320',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Saving...
              </>
            ) : (
              <>
                <FiSave /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Question Modal */}
      {showQuestionModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #E5E7EB'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#4B5320',
                  margin: 0
                }}>
                  {editQuestionIndex !== null ? 'Edit Question' : 'Add New Question'}
                </h3>
                <button
                  onClick={() => setShowQuestionModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    color: '#6B7280',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <FiX />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Question Text */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#374151',
                    fontWeight: '500'
                  }}>
                    Question Text *
                  </label>
                  <textarea
                    name="questionText"
                    value={currentQuestion.questionText}
                    onChange={handleQuestionChange}
                    rows="3"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                    placeholder="Enter your question here..."
                  />
                </div>

                {/* Question Type and Marks */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: '#374151',
                      fontWeight: '500'
                    }}>
                      Question Type
                    </label>
                    <select
                      name="type"
                      value={currentQuestion.type}
                      onChange={handleQuestionChange}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="mcq">Multiple Choice (MCQ)</option>
                      <option value="descriptive">Descriptive</option>
                      <option value="truefalse">True/False</option>
                    </select>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: '#374151',
                      fontWeight: '500'
                    }}>
                      Marks *
                    </label>
                    <input
                      type="number"
                      name="marks"
                      value={currentQuestion.marks}
                      onChange={handleQuestionChange}
                      min="1"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#374151',
                    fontWeight: '500'
                  }}>
                    Difficulty Level
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {['easy', 'medium', 'hard'].map(level => (
                      <label key={level} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="radio"
                          name="difficulty"
                          value={level}
                          checked={currentQuestion.difficulty === level}
                          onChange={handleQuestionChange}
                          style={{ marginRight: '4px' }}
                        />
                        <span style={{
                          textTransform: 'capitalize',
                          color: '#374151'
                        }}>
                          {level}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Options for MCQ */}
                {currentQuestion.type === 'mcq' && (
                  <div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      <label style={{
                        color: '#374151',
                        fontWeight: '500'
                      }}>
                        Options *
                      </label>
                      <button
                        type="button"
                        onClick={addOption}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#E5E7EB',
                          color: '#374151',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        + Add Option
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {currentQuestion.options.map((option, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'center'
                        }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#E5E7EB',
                            borderRadius: '4px',
                            color: '#374151',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {String.fromCharCode(65 + index)}
                          </div>
                          
                          <input
                            type="text"
                            value={option.text}
                            onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                            style={{
                              flex: 1,
                              padding: '12px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '6px',
                              fontSize: '14px',
                              outline: 'none'
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + index)}...`}
                          />
                          
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}>
                            <input
                              type="radio"
                              name="correctOption"
                              checked={option.isCorrect}
                              onChange={() => handleCorrectOptionChange(index)}
                              style={{ marginRight: '4px' }}
                            />
                            <span style={{ color: '#374151' }}>Correct</span>
                          </label>
                          
                          {currentQuestion.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(index)}
                              style={{
                                padding: '8px',
                                backgroundColor: '#FEE2E2',
                                color: '#DC2626',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              <FiX />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Topics */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#374151',
                    fontWeight: '500'
                  }}>
                    Topics (comma separated)
                  </label>
                  <input
                    type="text"
                    value={currentQuestion.topics.join(', ')}
                    onChange={handleTopicsChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                    placeholder="e.g., Algebra, Geometry, Calculus"
                  />
                </div>

                {/* Explanation */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#374151',
                    fontWeight: '500'
                  }}>
                    Explanation (Optional)
                  </label>
                  <textarea
                    name="explanation"
                    value={currentQuestion.explanation}
                    onChange={handleQuestionChange}
                    rows="3"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                    placeholder="Add explanation for this question..."
                  />
                </div>
              </div>
            </div>

            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={() => setShowQuestionModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'transparent',
                  color: '#4B5320',
                  border: '1px solid #4B5320',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveQuestion}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#D4A017',
                  color: '#4B5320',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {editQuestionIndex !== null ? 'Update Question' : 'Add Question'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          input:focus, textarea:focus, select:focus {
            border-color: #4B5320 !important;
            box-shadow: 0 0 0 2px rgba(75, 83, 32, 0.1);
          }
        `}
      </style>
    </div>
  );
};

export default EditTest;
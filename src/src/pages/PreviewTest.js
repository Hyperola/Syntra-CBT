import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  FiArrowLeft, FiClock, FiUsers, FiBarChart, FiCheckCircle, 
  FiXCircle, FiAlertCircle, FiEye, FiEyeOff, FiChevronLeft,
  FiChevronRight, FiBookOpen, FiCalendar, FiList, FiFileText,
  FiSend, FiCheck, FiX, FiBookmark, FiStar, FiEdit2
} from 'react-icons/fi';

const PreviewTest = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);
  const [viewMode, setViewMode] = useState('single'); // 'single' or 'list'
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  
  const testFromState = location.state?.test;
  const canEdit = location.state?.canEdit || false;

  useEffect(() => {
    if (testFromState) {
      setTest(testFromState);
      fetchQuestions(testFromState._id);
    } else {
      fetchTest();
    }
  }, [testId]);

  const fetchTest = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/tests/${testId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setTest(res.data.test);
        fetchQuestions(res.data.test._id);
      } else {
        setError(res.data.error || 'Failed to load test');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching test:', err);
      setError(err.response?.data?.error || 'Failed to load test');
      setLoading(false);
    }
  };

  const fetchQuestions = async (testId) => {
    try {
      setLoadingQuestions(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/tests/${testId}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setQuestions(res.data.questions);
      } else {
        console.error('Error fetching questions:', res.data.error);
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
      // Try to get questions from test data if available
      if (testFromState?.questions) {
        setQuestions(testFromState.questions);
      }
    } finally {
      setLoadingQuestions(false);
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleQuestionSelect = (index) => {
    setCurrentQuestionIndex(index);
    setViewMode('single');
  };

  const getQuestionStatus = (question, index) => {
    if (showAnswers) {
      return 'review';
    }
    return index === currentQuestionIndex ? 'current' : 'unvisited';
  };

  // FIXED: Handle different correct answer formats
  const getOptionStatus = (optionValue, question) => {
    if (!showAnswers) return 'normal';
    
    // Check different formats of correct answer
    const correctAnswer = question.correctAnswer || question.correctOption;
    if (!correctAnswer) return 'normal';
    
    // Convert optionValue to string for comparison
    const optionString = optionValue.toString();
    const correctString = correctAnswer.toString();
    
    // Check for exact match
    if (optionString === correctString) {
      return 'correct';
    }
    
    // Check if correctAnswer is an option letter and optionValue is the index
    if (/^[A-D]$/i.test(correctString)) {
      const letterIndex = correctString.toUpperCase().charCodeAt(0) - 65;
      if (optionValue === letterIndex) {
        return 'correct';
      }
    }
    
    // Check if correctAnswer is an index (0,1,2,3)
    if (/^[0-3]$/.test(correctString)) {
      const correctIndex = parseInt(correctString);
      if (optionValue === correctIndex) {
        return 'correct';
      }
    }
    
    return 'incorrect';
  };

  // FIXED: Get option letter from index
  const getOptionLetter = (index) => {
    return String.fromCharCode(65 + index); // 0->A, 1->B, 2->C, 3->D
  };

  // FIXED: Format correct answer display
  const formatCorrectAnswer = (question) => {
    const correctAnswer = question.correctAnswer || question.correctOption;
    if (!correctAnswer) return 'No correct answer specified';
    
    // If it's an index (0-3), convert to letter
    if (/^[0-3]$/.test(correctAnswer)) {
      const index = parseInt(correctAnswer);
      return getOptionLetter(index);
    }
    
    // If it's a letter (A-D), just return it
    if (/^[A-D]$/i.test(correctAnswer)) {
      return correctAnswer.toUpperCase();
    }
    
    // If it's the actual answer text, try to find which option it matches
    if (question.options && Array.isArray(question.options)) {
      const index = question.options.findIndex(opt => 
        opt && opt.toString().toLowerCase() === correctAnswer.toString().toLowerCase()
      );
      if (index !== -1) {
        return `${getOptionLetter(index)} (${correctAnswer})`;
      }
    }
    
    return correctAnswer;
  };

  const renderQuestion = (question, index) => {
    const isCurrent = index === currentQuestionIndex;
    
    return (
      <div 
        key={question._id || index} 
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '16px',
          border: isCurrent ? '2px solid #D4A017' : '1px solid #E5E7EB'
        }}
      >
        {/* Question Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px'
            }}>
              <span style={{
                backgroundColor: isCurrent ? '#D4A017' : '#6B7280',
                color: 'white',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                fontSize: '14px'
              }}>
                Q{index + 1}
              </span>
              <span style={{
                color: '#6B7280',
                fontSize: '14px',
                backgroundColor: '#F8F9FA',
                padding: '4px 12px',
                borderRadius: '4px'
              }}>
                {question.marks || 1} mark{question.marks !== 1 ? 's' : ''}
              </span>
              {question.difficulty && (
                <span style={{
                  color: '#6B7280',
                  fontSize: '14px',
                  backgroundColor: '#E6F7FF',
                  padding: '4px 12px',
                  borderRadius: '4px'
                }}>
                  Difficulty: {question.difficulty}
                </span>
              )}
            </div>
            
            {/* Question Text */}
            <div style={{
              fontSize: '16px',
              fontWeight: '500',
              color: '#374151',
              lineHeight: '1.6',
              marginBottom: '20px',
              whiteSpace: 'pre-wrap'
            }}>
              {question.text || question.questionText}
            </div>
            
            {/* Question Image if exists */}
            {question.imageUrl && (
              <div style={{ marginBottom: '20px' }}>
                <img 
                  src={question.imageUrl} 
                  alt="Question" 
                  style={{
                    maxWidth: '100%',
                    maxHeight: '300px',
                    borderRadius: '4px',
                    border: '1px solid #E5E7EB'
                  }}
                />
              </div>
            )}
          </div>
          
          {showAnswers && (question.correctAnswer || question.correctOption) && (
            <div style={{
              backgroundColor: '#E6FFE6',
              color: '#228B22',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FiCheckCircle /> Correct: {formatCorrectAnswer(question)}
            </div>
          )}
        </div>

        {/* Options */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '12px',
          marginBottom: '24px'
        }}>
          {question.options && question.options.map((option, idx) => {
            const optionStatus = getOptionStatus(idx, question);
            const optionLetter = getOptionLetter(idx);
            
            return (
              <div
                key={idx}
                style={{
                  padding: '16px',
                  borderRadius: '6px',
                  border: '1px solid #E5E7EB',
                  backgroundColor: optionStatus === 'correct' ? '#E6FFE6' : 
                                 optionStatus === 'incorrect' ? '#FFEBEE' : '#F8F9FA',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  backgroundColor: optionStatus === 'correct' ? '#228B22' : 
                                 optionStatus === 'incorrect' ? '#DC2626' : '#6B7280',
                  color: 'white',
                  width: '28px',
                  height: '28px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  fontSize: '14px',
                  flexShrink: 0
                }}>
                  {optionLetter}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{
                    color: optionStatus === 'correct' ? '#228B22' : 
                           optionStatus === 'incorrect' ? '#DC2626' : '#374151',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}>
                    {option}
                  </div>
                  
                  {/* Show correct/incorrect status */}
                  {showAnswers && optionStatus === 'correct' && (
                    <div style={{
                      marginTop: '8px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#228B22'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FiCheckCircle size={12} /> Correct Answer
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Explanation (if available and showing answers) */}
        {showAnswers && question.explanation && (
          <div style={{
            backgroundColor: '#E6F7FF',
            padding: '16px',
            borderRadius: '6px',
            marginTop: '16px',
            borderLeft: '4px solid #0066CC'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <FiBookmark style={{ color: '#0066CC' }} />
              <span style={{ fontWeight: '600', color: '#0066CC' }}>Explanation:</span>
            </div>
            <div style={{
              color: '#374151',
              fontSize: '14px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap'
            }}>
              {question.explanation}
            </div>
          </div>
        )}

        {/* Question Tags */}
        {question.tags && question.tags.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              {question.tags.map((tag, idx) => (
                <span 
                  key={idx}
                  style={{
                    backgroundColor: '#F3E5F5',
                    color: '#6A1B9A',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
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
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '32px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          color: '#4B5320',
          fontFamily: 'sans-serif',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '16px', marginBottom: '16px' }}>Loading test preview...</div>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #4B5320',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F8F9FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{
          backgroundColor: '#FFF3F3',
          color: '#B22222',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontFamily: 'sans-serif',
          maxWidth: '400px'
        }}>
          <FiAlertCircle style={{ fontSize: '24px', flexShrink: 0 }} />
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Error Loading Test</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>{error || 'Test not found'}</p>
            <button
              onClick={() => navigate('/admin/tests')}
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                backgroundColor: '#6B7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Back to Tests
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8F9FA',
      fontFamily: 'sans-serif'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => navigate('/admin/tests')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#6B7280',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <FiArrowLeft /> Back to Tests
            </button>
            
            <div>
              <h1 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#4B5320',
                margin: 0
              }}>
                {test.title}
              </h1>
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                marginTop: '4px'
              }}>
                <span style={{
                  color: '#6B7280',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <FiBookOpen size={14} /> {test.subject}
                </span>
                <span style={{
                  color: '#6B7280',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <FiClock size={14} /> {test.duration} mins
                </span>
                <span style={{
                  color: '#6B7280',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <FiList size={14} /> {totalQuestions} questions
                </span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowAnswers(!showAnswers)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: showAnswers ? '#228B22' : '#6B7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {showAnswers ? <FiEyeOff /> : <FiEye />}
              {showAnswers ? 'Hide Answers' : 'Show Answers'}
            </button>
            
            <button
              onClick={() => setViewMode(viewMode === 'single' ? 'list' : 'single')}
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
                fontWeight: '500'
              }}
            >
              <FiList />
              {viewMode === 'single' ? 'List View' : 'Single View'}
            </button>
            
            {canEdit && (
              <button
                onClick={() => navigate(`/admin/tests/${testId}/edit`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <FiEdit2 /> Edit Test
              </button>
            )}
          </div>
        </div>
      </header>

      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px',
        display: 'flex',
        gap: '24px'
      }}>
        {/* Left Sidebar - Question Navigator */}
        <aside style={{
          width: '300px',
          flexShrink: 0
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '16px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#374151',
              margin: '0 0 16px 0'
            }}>
              Questions ({totalQuestions})
            </h3>
            
            {loadingQuestions ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  border: '2px solid #f3f3f3',
                  borderTop: '2px solid #4B5320',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto'
                }}></div>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '8px'
              }}>
                {questions.map((question, index) => {
                  const status = getQuestionStatus(question, index);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleQuestionSelect(index)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                        backgroundColor: status === 'current' ? '#D4A017' : 
                                       status === 'review' ? '#228B22' : '#F8F9FA',
                        color: status === 'current' ? 'white' : 
                               status === 'review' ? 'white' : '#374151',
                        border: status === 'current' ? 'none' : 
                                status === 'review' ? 'none' : '1px solid #E5E7EB'
                      }}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Test Information Card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#374151',
              margin: '0 0 16px 0'
            }}>
              Test Information
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Subject</div>
                <div style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                  {test.subject}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Class</div>
                <div style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                  {typeof test.class === 'object' ? test.class.name : test.class}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Duration</div>
                <div style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                  {test.duration} minutes
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Total Marks</div>
                <div style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                  {test.totalMarks || questions.reduce((sum, q) => sum + (q.marks || 1), 0)} marks
                </div>
              </div>
              
              {test.session && (
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Session</div>
                  <div style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                    {test.session}
                  </div>
                </div>
              )}
              
              {test.term && (
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Term</div>
                  <div style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                    {test.term}
                  </div>
                </div>
              )}
              
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Status</div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: test.status === 'approved' ? '#228B22' : 
                         test.status === 'draft' ? '#D4A017' : 
                         test.status === 'submitted' ? '#0066CC' : '#6B7280',
                  backgroundColor: test.status === 'approved' ? '#E6FFE6' : 
                                 test.status === 'draft' ? '#FFF8E1' : 
                                 test.status === 'submitted' ? '#E6F7FF' : '#F8F9FA',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  display: 'inline-block'
                }}>
                  {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {/* Navigation Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: currentQuestionIndex === 0 ? '#F8F9FA' : '#FFFFFF',
                  color: currentQuestionIndex === 0 ? '#9CA3AF' : '#374151',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: currentQuestionIndex === 0 ? 0.6 : 1
                }}
              >
                <FiChevronLeft /> Previous
              </button>
              
              <div style={{
                fontSize: '14px',
                color: '#374151',
                fontWeight: '500'
              }}>
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {showAnswers && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  backgroundColor: '#E6FFE6',
                  color: '#228B22',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  <FiCheckCircle /> Answers Visible
                </div>
              )}
              
              <button
                onClick={handleNext}
                disabled={currentQuestionIndex === totalQuestions - 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: currentQuestionIndex === totalQuestions - 1 ? '#F8F9FA' : '#FFFFFF',
                  color: currentQuestionIndex === totalQuestions - 1 ? '#9CA3AF' : '#374151',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  cursor: currentQuestionIndex === totalQuestions - 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: currentQuestionIndex === totalQuestions - 1 ? 0.6 : 1
                }}
              >
                Next <FiChevronRight />
              </button>
            </div>
          </div>

          {/* Question Display */}
          {loadingQuestions ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '40px',
              textAlign: 'center'
            }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                border: '3px solid #f3f3f3',
                borderTop: '3px solid #4B5320',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }}></div>
              <div style={{ color: '#6B7280', fontSize: '16px' }}>
                Loading questions...
              </div>
            </div>
          ) : totalQuestions === 0 ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '40px',
              textAlign: 'center'
            }}>
              <FiAlertCircle style={{ fontSize: '48px', color: '#D4A017', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '18px', color: '#4B5320', marginBottom: '8px' }}>
                No Questions Found
              </h3>
              <p style={{ color: '#6B7280', fontSize: '14px' }}>
                This test doesn't have any questions added yet.
              </p>
              {canEdit && (
                <button
                  onClick={() => navigate(`/admin/tests/${testId}/edit`)}
                  style={{
                    marginTop: '20px',
                    padding: '10px 20px',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Add Questions
                </button>
              )}
            </div>
          ) : viewMode === 'single' ? (
            renderQuestion(currentQuestion, currentQuestionIndex)
          ) : (
            <div>
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#374151',
                  margin: '0 0 20px 0'
                }}>
                  All Questions ({totalQuestions})
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {questions.map((question, index) => (
                    <div 
                      key={index}
                      style={{
                        padding: '20px',
                        backgroundColor: '#F8F9FA',
                        borderRadius: '6px',
                        border: '1px solid #E5E7EB',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => handleQuestionSelect(index)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{
                            backgroundColor: '#6B7280',
                            color: 'white',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '600',
                            fontSize: '14px'
                          }}>
                            Q{index + 1}
                          </span>
                          <h4 style={{
                            fontSize: '16px',
                            fontWeight: '500',
                            color: '#374151',
                            margin: 0
                          }}>
                            {question.text?.substring(0, 100) || 'No question text'}...
                          </h4>
                        </div>
                        <span style={{
                          color: '#6B7280',
                          fontSize: '14px',
                          backgroundColor: '#FFFFFF',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #E5E7EB'
                        }}>
                          {question.marks || 1} mark{question.marks !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {/* Quick view of options */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '8px',
                        marginTop: '12px'
                      }}>
                        {question.options && question.options.slice(0, 4).map((option, idx) => {
                          const isCorrect = showAnswers && 
                            (question.correctAnswer === idx.toString() || 
                             question.correctAnswer === getOptionLetter(idx));
                          
                          return (
                            <div
                              key={idx}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '4px',
                                backgroundColor: isCorrect ? '#E6FFE6' : '#FFFFFF',
                                border: `1px solid ${isCorrect ? '#228B22' : '#E5E7EB'}`,
                                fontSize: '13px',
                                color: isCorrect ? '#228B22' : '#6B7280',
                                display: 'flex',
                                gap: '8px',
                                overflow: 'hidden'
                              }}
                            >
                              <span style={{ fontWeight: '600' }}>{getOptionLetter(idx)}.</span>
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {option?.toString().substring(0, 40) || 'No option text'}...
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      
                      {showAnswers && (question.correctAnswer || question.correctOption) && (
                        <div style={{
                          marginTop: '12px',
                          padding: '8px 12px',
                          backgroundColor: '#E6FFE6',
                          color: '#228B22',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontWeight: '500',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <FiCheckCircle size={12} /> Correct: {formatCorrectAnswer(question)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          button:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
          }
          
          button:active:not(:disabled) {
            transform: translateY(0);
          }
        `}
      </style>
    </div>
  );
};

export default PreviewTest;
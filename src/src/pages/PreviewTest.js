import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  FiArrowLeft, FiEye, FiEdit, FiClock, FiBarChart,
  FiUsers, FiCalendar, FiCheckCircle, FiXCircle,
  FiChevronLeft, FiChevronRight, FiFileText, FiPrinter
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
  const [expandedQuestions, setExpandedQuestions] = useState({});

  useEffect(() => {
    fetchTest();
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
      } else {
        setError('Test not found');
      }
    } catch (err) {
      console.error('Error fetching test:', err);
      setError('Failed to load test');
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestionExpansion = (questionId) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const renderQuestion = (question, index) => {
    const isExpanded = expandedQuestions[question._id] || false;
    
    return (
      <div key={question._id} style={{
        marginBottom: '16px',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div 
          style={{
            padding: '16px',
            backgroundColor: '#F9FAFB',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
          onClick={() => toggleQuestionExpansion(question._id)}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                backgroundColor: '#4B5320',
                color: 'white',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {index + 1}
              </span>
              <h4 style={{ margin: 0, color: '#374151' }}>
                {question.questionText}
              </h4>
            </div>
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                backgroundColor: '#D4A017',
                color: '#4B5320',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {question.type}
              </span>
              <span style={{
                backgroundColor: '#6B7280',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {question.marks} marks
              </span>
              {question.difficulty && (
                <span style={{
                  backgroundColor: '#E5E7EB',
                  color: '#374151',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {question.difficulty}
                </span>
              )}
            </div>
          </div>
          <div style={{ color: '#6B7280' }}>
            {isExpanded ? <FiChevronLeft /> : <FiChevronRight />}
          </div>
        </div>
        
        {isExpanded && (
          <div style={{ padding: '16px', backgroundColor: 'white' }}>
            {/* Question details */}
            {question.explanation && (
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#4B5320' }}>Explanation:</strong>
                <p style={{ margin: '4px 0 0 0', color: '#6B7280' }}>{question.explanation}</p>
              </div>
            )}
            
            {/* Options for MCQ */}
            {question.type === 'mcq' && question.options && (
              <div>
                <strong style={{ color: '#4B5320', marginBottom: '8px', display: 'block' }}>Options:</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {question.options.map((option, optIndex) => (
                    <div key={optIndex} style={{
                      padding: '8px 12px',
                      backgroundColor: option.isCorrect ? '#D1FAE5' : '#F3F4F6',
                      border: `2px solid ${option.isCorrect ? '#059669' : '#E5E7EB'}`,
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: option.isCorrect ? '#059669' : '#D1D5DB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}>
                        {String.fromCharCode(65 + optIndex)}
                      </div>
                      <span style={{ 
                        color: option.isCorrect ? '#065F46' : '#374151',
                        fontWeight: option.isCorrect ? '600' : '400'
                      }}>
                        {option.text}
                      </span>
                      {option.isCorrect && (
                        <FiCheckCircle style={{ color: '#059669', marginLeft: 'auto' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Answer for descriptive */}
            {question.type === 'descriptive' && question.sampleAnswer && (
              <div>
                <strong style={{ color: '#4B5320', marginBottom: '8px', display: 'block' }}>Sample Answer:</strong>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#F0F9FF',
                  borderLeft: '4px solid #0EA5E9',
                  borderRadius: '4px',
                  color: '#0369A1'
                }}>
                  {question.sampleAnswer}
                </div>
              </div>
            )}
            
            {/* Topics */}
            {question.topics && question.topics.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <strong style={{ color: '#4B5320' }}>Topics:</strong>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {question.topics.map((topic, idx) => (
                    <span key={idx} style={{
                      backgroundColor: '#E5E7EB',
                      color: '#4B5563',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px'
                    }}>
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
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

  if (error || !test) {
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
          <h3 style={{ margin: '0 0 8px 0' }}>Error</h3>
          <p style={{ margin: 0 }}>{error || 'Test not found'}</p>
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

  const canEdit = user.role === 'teacher' && test.createdBy?._id === user._id && test.status === 'draft';

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
          alignItems: 'flex-start',
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
              {test.title}
            </h1>
            
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                backgroundColor: '#E5E7EB',
                color: '#374151',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <FiFileText /> {test.questions?.length || 0} Questions
              </span>
              <span style={{
                backgroundColor: '#E5E7EB',
                color: '#374151',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <FiClock /> {test.duration} minutes
              </span>
              <span style={{
                backgroundColor: '#E5E7EB',
                color: '#374151',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                📝 {test.totalMarks || 'N/A'} marks
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.print()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: '#6B7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <FiPrinter /> Print
            </button>
            
            {canEdit && (
              <button
                onClick={() => navigate(`/admin/tests/${testId}/edit`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  backgroundColor: '#D4A017',
                  color: '#4B5320',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                <FiEdit /> Edit Test
              </button>
            )}
          </div>
        </div>

        {/* Test Info */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div>
              <h3 style={{ color: '#6B7280', fontSize: '14px', margin: '0 0 4px 0' }}>Subject</h3>
              <p style={{ color: '#374151', fontSize: '16px', margin: 0, fontWeight: '500' }}>
                {test.subject}
              </p>
            </div>
            
            <div>
              <h3 style={{ color: '#6B7280', fontSize: '14px', margin: '0 0 4px 0' }}>Class</h3>
              <p style={{ color: '#374151', fontSize: '16px', margin: 0, fontWeight: '500' }}>
                {test.class?.name || test.class || 'Not specified'}
              </p>
            </div>
            
            <div>
              <h3 style={{ color: '#6B7280', fontSize: '14px', margin: '0 0 4px 0' }}>Created By</h3>
              <p style={{ color: '#374151', fontSize: '16px', margin: 0, fontWeight: '500' }}>
                {test.createdBy?.name || test.createdBy?.username || 'Unknown'}
              </p>
            </div>
            
            <div>
              <h3 style={{ color: '#6B7280', fontSize: '14px', margin: '0 0 4px 0' }}>Status</h3>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 12px',
                borderRadius: '4px',
                backgroundColor: 
                  test.status === 'draft' ? '#FFF3CD' :
                  test.status === 'submitted' ? '#E6F7FF' :
                  test.status === 'approved' ? '#E6FFE6' :
                  test.status === 'scheduled' ? '#D1ECF1' :
                  test.status === 'active' ? '#D4EDDA' : '#E2E3E5',
                color: 
                  test.status === 'draft' ? '#D4A017' :
                  test.status === 'submitted' ? '#0066CC' :
                  test.status === 'approved' ? '#228B22' :
                  test.status === 'scheduled' ? '#0C5460' :
                  test.status === 'active' ? '#155724' : '#383D41',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {test.status === 'draft' ? '📝 Draft' :
                 test.status === 'submitted' ? '📤 Submitted' :
                 test.status === 'approved' ? '✅ Approved' :
                 test.status === 'scheduled' ? '📅 Scheduled' :
                 test.status === 'active' ? '⚡ Active' : '🏁 Completed'}
              </div>
            </div>
          </div>

          {/* Instructions */}
          {test.instructions && (
            <div>
              <h3 style={{ color: '#4B5320', fontSize: '18px', margin: '0 0 12px 0' }}>Instructions</h3>
              <div style={{
                backgroundColor: '#F9FAFB',
                padding: '16px',
                borderRadius: '6px',
                borderLeft: '4px solid #4B5320',
                color: '#374151',
                lineHeight: '1.6'
              }}>
                {test.instructions.split('\n').map((line, index) => (
                  <p key={index} style={{ margin: index > 0 ? '8px 0 0 0' : '0' }}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Questions Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#4B5320',
              margin: 0
            }}>
              Questions ({test.questions?.length || 0})
            </h2>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  const allExpanded = {};
                  test.questions?.forEach(q => {
                    allExpanded[q._id] = true;
                  });
                  setExpandedQuestions(allExpanded);
                }}
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
                Expand All
              </button>
              <button
                onClick={() => setExpandedQuestions({})}
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
                Collapse All
              </button>
            </div>
          </div>

          {test.questions && test.questions.length > 0 ? (
            <div>
              {test.questions.map((question, index) => renderQuestion(question, index))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              color: '#6B7280'
            }}>
              <FiFileText style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
              <h3 style={{ margin: '0 0 8px 0' }}>No Questions Added</h3>
              <p style={{ margin: 0 }}>This test doesn't have any questions yet.</p>
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @media print {
            button {
              display: none !important;
            }
            
            div {
              box-shadow: none !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default PreviewTest;
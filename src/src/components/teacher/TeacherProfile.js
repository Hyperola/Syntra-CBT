import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { 
  FiUser, FiMail, FiPhone, FiBook, FiAward, 
  FiCalendar, FiEdit2, FiSave, FiX, FiUsers,
  FiBookOpen, FiFileText, FiClock, FiBarChart2
} from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';

const TeacherProfile = () => {
  const { user } = useContext(AuthContext);
  const [teacherData, setTeacherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [stats, setStats] = useState(null);

  // Brand Colors
  const colors = {
    forestGreen: '#4B5320',
    gold: '#D4A017',
    lightGold: '#FFD700',
    darkGold: '#B8860B',
    white: '#FFFFFF',
    lightGray: '#F8F9FA',
    mediumGray: '#E9ECEF',
    darkGray: '#6C757D',
    errorRed: '#DC3545',
    successGreen: '#28A745',
    warningYellow: '#FFC107',
    infoBlue: '#17A2B8'
  };

  useEffect(() => {
    if (user) {
      fetchTeacherProfile();
      fetchTeacherStats();
    }
  }, [user]);

  const fetchTeacherProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await axios.get('http://localhost:5000/api/teacher/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setTeacherData(response.data.teacher);
        setFormData(response.data.teacher);
      } else {
        throw new Error(response.data.message || 'Failed to fetch profile');
      }
    } catch (err) {
      console.error('Error fetching teacher profile:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load profile');
      
      // Fallback to user data from AuthContext
      if (user) {
        const fallbackData = {
          id: user._id || user.id,
          name: user.name || user.username,
          email: user.email || 'teacher@school.edu',
          phone: user.phone || '+234 800 000 0000',
          subjects: user.subjects?.map(s => s.subject) || ['General Subjects'],
          qualifications: user.qualifications || ['B.Ed. in Education', 'Professional Certification'],
          department: user.department || 'Education Department',
          employeeId: user.employeeId || 'TCH-' + (user._id || user.id).substring(0, 6).toUpperCase(),
          joiningDate: user.joiningDate || new Date().toISOString().split('T')[0],
          bio: user.bio || 'Experienced educator dedicated to student success and academic excellence.',
          avatar: user.avatar || null
        };
        
        setTeacherData(fallbackData);
        setFormData(fallbackData);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Fetch question statistics
      const questionsResponse = await axios.get('http://localhost:5000/api/questions/stats/overview', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Fetch test statistics (you'll need to implement this endpoint)
      // const testsResponse = await axios.get('http://localhost:5000/api/tests/teacher/stats', {
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });

      if (questionsResponse.data.success) {
        setStats({
          totalQuestions: questionsResponse.data.stats.totalQuestions || 0,
          inQuestionBank: questionsResponse.data.stats.inQuestionBankCount || 0,
          totalUsage: questionsResponse.data.stats.totalUsage || 0,
          // Add more stats as you implement endpoints
          activeClasses: 0,
          totalStudents: 0,
          yearsExperience: 0,
          testsCreated: 0
        });
      }
    } catch (err) {
      console.error('Error fetching teacher stats:', err);
      // Use mock stats for demo
      setStats({
        totalQuestions: 45,
        inQuestionBank: 38,
        totalUsage: 127,
        activeClasses: 5,
        totalStudents: 149,
        yearsExperience: user ? Math.floor((new Date() - new Date(user.createdAt || '2023-08-15')) / (1000 * 60 * 60 * 24 * 365)) : 3,
        testsCreated: 23
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put('http://localhost:5000/api/teacher/profile', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        setTeacherData(formData);
        setIsEditing(false);
        alert('Profile updated successfully!');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      alert(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/teacher/avatar', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setTeacherData({
          ...teacherData,
          avatar: response.data.avatarUrl
        });
        alert('Profile picture updated!');
      }
    } catch (err) {
      console.error('Error uploading avatar:', err);
      alert('Failed to upload profile picture');
    }
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '40px', 
        backgroundColor: colors.white,
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: `4px solid ${colors.forestGreen}`,
          borderTop: `4px solid ${colors.gold}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <p style={{ 
          color: colors.forestGreen, 
          fontSize: '16px',
          fontWeight: '500'
        }}>
          Loading teacher profile...
        </p>
      </div>
    );
  }

  if (error && !teacherData) {
    return (
      <div style={{ 
        padding: '40px', 
        backgroundColor: colors.white,
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        textAlign: 'center'
      }}>
        <div style={{ 
          fontSize: '48px', 
          color: colors.errorRed,
          marginBottom: '20px'
        }}>
          ⚠️
        </div>
        <h3 style={{ 
          color: colors.forestGreen, 
          fontSize: '20px',
          fontWeight: '600',
          marginBottom: '10px'
        }}>
          Error Loading Profile
        </h3>
        <p style={{ 
          color: colors.darkGray,
          marginBottom: '25px'
        }}>
          {error}
        </p>
        <button
          onClick={fetchTeacherProfile}
          style={{
            backgroundColor: colors.forestGreen,
            color: colors.white,
            border: 'none',
            padding: '10px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '0 auto',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a4220'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.forestGreen}
        >
          <FiUser />
          Try Again
        </button>
      </div>
    );
  }

  const statCards = [
    { 
      label: 'Total Questions', 
      value: stats?.totalQuestions || 0, 
      color: colors.forestGreen,
      icon: FiBookOpen,
      description: 'Questions created'
    },
    { 
      label: 'Question Bank', 
      value: stats?.inQuestionBank || 0, 
      color: colors.successGreen,
      icon: FiBook,
      description: 'Available for tests'
    },
    { 
      label: 'Questions Used', 
      value: stats?.totalUsage || 0, 
      color: colors.infoBlue,
      icon: FiBarChart2,
      description: 'Total usage count'
    },
    { 
      label: 'Tests Created', 
      value: stats?.testsCreated || 0, 
      color: colors.gold,
      icon: FiFileText,
      description: 'Exams & assessments'
    },
    { 
      label: 'Active Classes', 
      value: stats?.activeClasses || 0, 
      color: '#9C27B0',
      icon: FiUsers,
      description: 'Current classes'
    },
    { 
      label: 'Experience', 
      value: stats?.yearsExperience || 0, 
      color: colors.warningYellow,
      icon: FiClock,
      description: 'Years teaching'
    },
  ];

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div style={{ 
      backgroundColor: colors.white,
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: colors.forestGreen,
        padding: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          backgroundColor: colors.gold,
          borderRadius: '50%',
          opacity: '0.1'
        }}></div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          position: 'relative',
          zIndex: 1
        }}>
          <div>
            <h2 style={{ 
              fontSize: '24px',
              fontWeight: '700',
              color: colors.white,
              margin: '0 0 8px 0'
            }}>
              Teacher Profile
            </h2>
            <p style={{ 
              color: colors.lightGold,
              fontSize: '14px',
              margin: 0,
              opacity: 0.9
            }}>
              Manage your professional profile and statistics
            </p>
          </div>
          
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                backgroundColor: colors.gold,
                color: colors.forestGreen,
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.lightGold;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.gold;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <FiEdit2 />
              Edit Profile
            </button>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div style={{ padding: '30px' }}>
        {/* Stats Overview */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={index}
                style={{
                  backgroundColor: colors.lightGray,
                  border: `1px solid ${colors.mediumGray}`,
                  borderRadius: '10px',
                  padding: '24px',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  right: '0',
                  height: '4px',
                  backgroundColor: stat.color
                }}></div>
                
                <div style={{ 
                  fontSize: '36px',
                  fontWeight: '700',
                  color: stat.color,
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px'
                }}>
                  <Icon size={28} />
                  <span>{stat.value}</span>
                </div>
                
                <div style={{ 
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.forestGreen,
                  marginBottom: '6px'
                }}>
                  {stat.label}
                </div>
                
                <div style={{ 
                  fontSize: '13px',
                  color: colors.darkGray
                }}>
                  {stat.description}
                </div>
              </div>
            );
          })}
        </div>

        {/* Profile Section */}
        <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
          {/* Avatar Section */}
          <div style={{ 
            flexShrink: 0,
            textAlign: 'center',
            width: '180px'
          }}>
            <div style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              backgroundColor: colors.forestGreen,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              fontWeight: '600',
              color: colors.white,
              margin: '0 auto 20px',
              overflow: 'hidden',
              border: `4px solid ${colors.gold}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              {teacherData?.avatar ? (
                <img 
                  src={teacherData.avatar} 
                  alt={teacherData.name}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover' 
                  }}
                />
              ) : (
                (teacherData?.name || 'Teacher')
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
              )}
            </div>
            
            {isEditing && (
              <>
                <label style={{
                  display: 'block',
                  padding: '10px 16px',
                  backgroundColor: colors.forestGreen,
                  color: colors.white,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  marginBottom: '10px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a4220'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.forestGreen}
                >
                  Upload New Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                <p style={{ 
                  fontSize: '12px', 
                  color: colors.darkGray,
                  margin: 0
                }}>
                  JPG, PNG, max 5MB
                </p>
              </>
            )}
          </div>

          {/* Profile Details */}
          <div style={{ flex: 1 }}>
            {isEditing ? (
              <form onSubmit={handleSubmit}>
                <div style={{ 
                  backgroundColor: colors.lightGray,
                  padding: '30px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.mediumGray}`
                }}>
                  <h3 style={{ 
                    fontSize: '20px',
                    fontWeight: '600',
                    color: colors.forestGreen,
                    marginBottom: '25px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <FiUser />
                    Edit Personal Information
                  </h3>
                  
                  <div style={{ display: 'grid', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '14px',
                          fontWeight: '600',
                          color: colors.forestGreen,
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <FiUser size={14} />
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name || ''}
                          onChange={handleInputChange}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: `1px solid ${colors.mediumGray}`,
                            borderRadius: '8px',
                            fontSize: '14px',
                            backgroundColor: colors.white,
                            transition: 'all 0.2s ease'
                          }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '14px',
                          fontWeight: '600',
                          color: colors.forestGreen,
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <FiMail size={14} />
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email || ''}
                          onChange={handleInputChange}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: `1px solid ${colors.mediumGray}`,
                            borderRadius: '8px',
                            fontSize: '14px',
                            backgroundColor: colors.white,
                            transition: 'all 0.2s ease'
                          }}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '14px',
                          fontWeight: '600',
                          color: colors.forestGreen,
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <FiPhone size={14} />
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone || ''}
                          onChange={handleInputChange}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: `1px solid ${colors.mediumGray}`,
                            borderRadius: '8px',
                            fontSize: '14px',
                            backgroundColor: colors.white,
                            transition: 'all 0.2s ease'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '14px',
                          fontWeight: '600',
                          color: colors.forestGreen,
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <FiBook size={14} />
                          Department
                        </label>
                        <input
                          type="text"
                          name="department"
                          value={formData.department || ''}
                          onChange={handleInputChange}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: `1px solid ${colors.mediumGray}`,
                            borderRadius: '8px',
                            fontSize: '14px',
                            backgroundColor: colors.white,
                            transition: 'all 0.2s ease'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '14px',
                        fontWeight: '600',
                        color: colors.forestGreen,
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <FiAward size={14} />
                        Qualifications (comma separated)
                      </label>
                      <input
                        type="text"
                        name="qualifications"
                        value={formData.qualifications?.join(', ') || ''}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            qualifications: e.target.value.split(',').map(q => q.trim()).filter(q => q)
                          });
                        }}
                        placeholder="B.Ed. in Education, M.Sc. in Mathematics, Ph.D. in Physics"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: `1px solid ${colors.mediumGray}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: colors.white,
                          transition: 'all 0.2s ease'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '14px',
                        fontWeight: '600',
                        color: colors.forestGreen,
                        marginBottom: '8px'
                      }}>
                        Professional Bio
                      </label>
                      <textarea
                        name="bio"
                        value={formData.bio || ''}
                        onChange={handleInputChange}
                        rows="5"
                        placeholder="Describe your teaching experience, philosophy, and achievements..."
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: `1px solid ${colors.mediumGray}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: colors.white,
                          transition: 'all 0.2s ease',
                          resize: 'vertical',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      gap: '15px', 
                      justifyContent: 'flex-end',
                      paddingTop: '20px',
                      borderTop: `1px solid ${colors.mediumGray}`
                    }}>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: colors.white,
                          color: colors.darkGray,
                          border: `1px solid ${colors.mediumGray}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = colors.lightGray;
                          e.currentTarget.style.borderColor = colors.darkGray;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = colors.white;
                          e.currentTarget.style.borderColor = colors.mediumGray;
                        }}
                      >
                        <FiX />
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{
                          padding: '12px 30px',
                          backgroundColor: colors.forestGreen,
                          color: colors.white,
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#3a4220';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = colors.forestGreen;
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <FiSave />
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div>
                {/* Teacher Name and Title */}
                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ 
                    fontSize: '32px',
                    fontWeight: '700',
                    color: colors.forestGreen,
                    marginBottom: '8px'
                  }}>
                    {teacherData?.name || 'Teacher'}
                  </h3>
                  <p style={{ 
                    color: colors.gold,
                    fontSize: '18px',
                    fontWeight: '500',
                    marginBottom: '20px'
                  }}>
                    {teacherData?.department || 'Education Department'}
                  </p>
                  
                  <div style={{ 
                    display: 'grid', 
                    gap: '15px',
                    marginBottom: '30px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: colors.lightGray,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: colors.forestGreen
                      }}>
                        <FiMail />
                      </div>
                      <div>
                        <div style={{ 
                          fontSize: '12px',
                          color: colors.darkGray,
                          marginBottom: '2px'
                        }}>
                          Email
                        </div>
                        <div style={{ 
                          fontSize: '15px',
                          color: colors.forestGreen,
                          fontWeight: '500'
                        }}>
                          {teacherData?.email || 'Not provided'}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: colors.lightGray,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: colors.forestGreen
                      }}>
                        <FiPhone />
                      </div>
                      <div>
                        <div style={{ 
                          fontSize: '12px',
                          color: colors.darkGray,
                          marginBottom: '2px'
                        }}>
                          Phone
                        </div>
                        <div style={{ 
                          fontSize: '15px',
                          color: colors.forestGreen,
                          fontWeight: '500'
                        }}>
                          {teacherData?.phone || 'Not provided'}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: colors.lightGray,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: colors.forestGreen
                      }}>
                        <FiCalendar />
                      </div>
                      <div>
                        <div style={{ 
                          fontSize: '12px',
                          color: colors.darkGray,
                          marginBottom: '2px'
                        }}>
                          Employee ID & Joining Date
                        </div>
                        <div style={{ 
                          fontSize: '15px',
                          color: colors.forestGreen,
                          fontWeight: '500'
                        }}>
                          {teacherData?.employeeId || 'Not specified'} • Joined {formatDate(teacherData?.joiningDate)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bio Section */}
                {teacherData?.bio && (
                  <div style={{ 
                    backgroundColor: colors.lightGray,
                    padding: '25px',
                    borderRadius: '12px',
                    marginBottom: '30px',
                    borderLeft: `4px solid ${colors.gold}`
                  }}>
                    <h4 style={{ 
                      fontSize: '18px',
                      fontWeight: '600',
                      color: colors.forestGreen,
                      marginBottom: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <FiUser />
                      Professional Bio
                    </h4>
                    <p style={{ 
                      color: colors.darkGray, 
                      lineHeight: '1.8',
                      fontSize: '15px',
                      margin: 0
                    }}>
                      {teacherData.bio}
                    </p>
                  </div>
                )}

                {/* Qualifications & Subjects */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                  <div>
                    <h4 style={{ 
                      fontSize: '18px',
                      fontWeight: '600',
                      color: colors.forestGreen,
                      marginBottom: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <FiAward />
                      Qualifications
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {teacherData?.qualifications?.map((qual, index) => (
                        <span
                          key={index}
                          style={{
                            backgroundColor: '#E8F4FD',
                            color: colors.forestGreen,
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: '500',
                            border: `1px solid ${colors.mediumGray}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <FiAward size={12} />
                          {qual}
                        </span>
                      )) || (
                        <span style={{ 
                          color: colors.darkGray, 
                          fontStyle: 'italic',
                          fontSize: '14px'
                        }}>
                          No qualifications listed
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ 
                      fontSize: '18px',
                      fontWeight: '600',
                      color: colors.forestGreen,
                      marginBottom: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <FiBook />
                      Subjects Teaching
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {teacherData?.subjects?.map((subject, index) => (
                        <span
                          key={index}
                          style={{
                            backgroundColor: '#F0FFF4',
                            color: colors.successGreen,
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: '500',
                            border: `1px solid #C6F6D5`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <FiBook size={12} />
                          {subject}
                        </span>
                      )) || (
                        <span style={{ 
                          color: colors.darkGray, 
                          fontStyle: 'italic',
                          fontSize: '14px'
                        }}>
                          No subjects assigned
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          input:focus, textarea:focus {
            outline: none;
            border-color: ${colors.forestGreen} !important;
            box-shadow: 0 0 0 3px rgba(75, 83, 32, 0.1);
          }
        `}
      </style>
    </div>
  );
};

export default TeacherProfile;
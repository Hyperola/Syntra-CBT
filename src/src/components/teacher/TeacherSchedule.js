// components/teacher/TeacherSchedule.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FiCalendar, 
  FiClock, 
  FiMapPin, 
  FiEdit2, 
  FiTrash2, 
  FiPlus,
  FiRefreshCw,
  FiGrid,
  FiList,
  FiSave,
  FiX,
  FiBook,
  FiUsers,
  FiBriefcase
} from 'react-icons/fi';

const TeacherSchedule = () => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('week');
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    day: 'Monday',
    startTime: '09:00',
    endTime: '10:30',
    type: 'lecture',
    location: '',
    classId: '',
    description: ''
  });

  // Brand colors
  const colors = {
    primary: '#4B5320',
    primaryLight: '#6B7A30',
    primaryDark: '#2F3A14',
    secondary: '#D4A017',
    background: '#F8FAFC',
    white: '#FFFFFF',
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6'
  };

  const eventTypes = [
    { value: 'lecture', label: 'Lecture', color: colors.primary, icon: <FiBook /> },
    { value: 'lab', label: 'Lab Session', color: colors.secondary, icon: <FiBriefcase /> },
    { value: 'meeting', label: 'Meeting', color: colors.info, icon: <FiUsers /> },
    { value: 'office', label: 'Office Hours', color: colors.success, icon: <FiClock /> },
    { value: 'prep', label: 'Prep Time', color: colors.warning, icon: <FiEdit2 /> },
    { value: 'exam', label: 'Exam/Test', color: colors.error, icon: <FiCalendar /> }
  ];

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/teacher/schedule', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSchedule(response.data.schedule || []);
      } else {
        throw new Error(response.data.message || 'Failed to load schedule');
      }
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError(err.message);
      
      // Fallback mock data
      setSchedule([
        {
          id: '1',
          title: 'Mathematics - JSS2',
          day: 'Monday',
          startTime: '09:00',
          endTime: '10:30',
          type: 'lecture',
          location: 'Room 201',
          classId: 'JSS2',
          description: 'Algebra basics'
        },
        {
          id: '2',
          title: 'English - JSS2',
          day: 'Monday',
          startTime: '11:00',
          endTime: '12:30',
          type: 'lecture',
          location: 'Room 105',
          classId: 'JSS2',
          description: 'Grammar and composition'
        },
        {
          id: '3',
          title: 'Staff Meeting',
          day: 'Tuesday',
          startTime: '14:00',
          endTime: '15:30',
          type: 'meeting',
          location: 'Conference Room',
          description: 'Weekly staff meeting'
        },
        {
          id: '4',
          title: 'Science Lab',
          day: 'Wednesday',
          startTime: '10:00',
          endTime: '12:00',
          type: 'lab',
          location: 'Science Lab',
          classId: 'JSS2',
          description: 'Chemistry experiments'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const eventData = {
        ...formData,
        id: editingEvent ? editingEvent.id : Date.now().toString()
      };

      let response;
      if (editingEvent) {
        response = await axios.put(`/api/teacher/schedule/${editingEvent.id}`, eventData, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setSchedule(prev => prev.map(event => 
          event.id === editingEvent.id ? eventData : event
        ));
      } else {
        response = await axios.post('/api/teacher/schedule', eventData, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setSchedule(prev => [...prev, eventData]);
      }

      if (response.data.success) {
        resetForm();
        setShowModal(false);
        setEditingEvent(null);
      }
    } catch (err) {
      console.error('Error saving schedule:', err);
      alert('Failed to save schedule. Please try again.');
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title || '',
      day: event.day || 'Monday',
      startTime: event.startTime || '09:00',
      endTime: event.endTime || '10:30',
      type: event.type || 'lecture',
      location: event.location || '',
      classId: event.classId || '',
      description: event.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/api/teacher/schedule/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSchedule(prev => prev.filter(event => event.id !== eventId));
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Failed to delete event.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      day: 'Monday',
      startTime: '09:00',
      endTime: '10:30',
      type: 'lecture',
      location: '',
      classId: '',
      description: ''
    });
  };

  const getEventsForDay = (day) => {
    return schedule.filter(event => event.day === day);
  };

  const getEventColor = (type) => {
    const eventType = eventTypes.find(t => t.value === type);
    return eventType ? eventType.color : colors.primary;
  };

  const renderWeekView = () => {
    const timeSlots = Array.from({ length: 12 }, (_, i) => i + 8);

    return (
      <div style={styles.weekContainer}>
        <div style={styles.weekGrid}>
          {/* Time column */}
          <div style={styles.timeColumn}>
            <div style={styles.timeHeader}>Time</div>
            {timeSlots.map(hour => (
              <div key={hour} style={styles.timeSlot}>
                {hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`}
              </div>
            ))}
          </div>

          {/* Days columns */}
          {daysOfWeek.map(day => {
            const dayEvents = getEventsForDay(day);
            
            return (
              <div key={day} style={styles.dayColumn}>
                <div style={styles.dayHeader}>
                  <div style={styles.dayName}>{day}</div>
                  <div style={styles.eventCount}>{dayEvents.length} events</div>
                </div>
                
                {timeSlots.map(hour => {
                  const hourEvents = dayEvents.filter(event => {
                    const eventHour = parseInt(event.startTime.split(':')[0]);
                    return eventHour === hour;
                  });

                  return (
                    <div key={`${day}-${hour}`} style={styles.timeCell}>
                      {hourEvents.map(event => (
                        <div
                          key={event.id}
                          style={{
                            ...styles.eventBlock,
                            backgroundColor: getEventColor(event.type),
                            height: 'calc(100% - 8px)',
                            margin: '4px'
                          }}
                          onClick={() => handleEdit(event)}
                          title={`${event.title}\n${event.startTime} - ${event.endTime}\n${event.location}`}
                        >
                          <div style={styles.eventContent}>
                            <div style={styles.eventTitle}>{event.title.split(' - ')[0]}</div>
                            <div style={styles.eventTime}>{event.startTime}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderListView = () => {
    return (
      <div style={styles.listContainer}>
        {daysOfWeek.map(day => {
          const dayEvents = getEventsForDay(day);
          if (dayEvents.length === 0) return null;

          return (
            <div key={day} style={styles.daySection}>
              <div style={styles.dayTitleContainer}>
                <h3 style={styles.dayTitle}>{day}</h3>
                <span style={styles.dayEventCount}>{dayEvents.length} events</span>
              </div>
              <div style={styles.eventsList}>
                {dayEvents.map(event => (
                  <div key={event.id} style={styles.eventCard}>
                    <div style={{ ...styles.eventColorIndicator, backgroundColor: getEventColor(event.type) }}></div>
                    <div style={styles.eventDetails}>
                      <div style={styles.eventHeader}>
                        <div>
                          <h4 style={styles.eventTitleText}>{event.title}</h4>
                          <div style={styles.eventMeta}>
                            <span style={styles.eventTime}>
                              <FiClock size={14} /> {event.startTime} - {event.endTime}
                            </span>
                            {event.location && (
                              <span style={styles.eventLocation}>
                                <FiMapPin size={14} /> {event.location}
                              </span>
                            )}
                            {event.classId && (
                              <span style={styles.classTag}>{event.classId}</span>
                            )}
                          </div>
                        </div>
                        <div style={styles.eventActions}>
                          <button 
                            onClick={() => handleEdit(event)}
                            style={styles.actionButton}
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(event.id)}
                            style={{ ...styles.actionButton, color: colors.error }}
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </div>
                      {event.description && (
                        <p style={styles.eventDescription}>{event.description}</p>
                      )}
                      <div style={styles.eventType}>
                        {eventTypes.find(t => t.value === event.type)?.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        
        {schedule.length === 0 && (
          <div style={styles.emptyState}>
            <FiCalendar size={48} color={colors.textSecondary} />
            <h3 style={styles.emptyTitle}>No Schedule Yet</h3>
            <p style={styles.emptyText}>Start by adding your teaching schedule</p>
            <button 
              onClick={() => setShowModal(true)}
              style={styles.addFirstButton}
            >
              <FiPlus size={18} /> Add Your First Event
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderModal = () => {
    if (!showModal) return null;

    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modal}>
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}>
              {editingEvent ? 'Edit Event' : 'Add New Event'}
            </h2>
            <button 
              onClick={() => {
                setShowModal(false);
                setEditingEvent(null);
                resetForm();
              }}
              style={styles.closeButton}
            >
              <FiX size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Event Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Mathematics - JSS2"
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Day *</label>
                <select
                  name="day"
                  value={formData.day}
                  onChange={handleInputChange}
                  style={styles.select}
                  required
                >
                  {daysOfWeek.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Start Time *</label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>End Time *</label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Event Type *</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  style={styles.select}
                  required
                >
                  {eventTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., Room 201, Science Lab"
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Class (Optional)</label>
              <input
                type="text"
                name="classId"
                value={formData.classId}
                onChange={handleInputChange}
                placeholder="e.g., JSS2, Grade 10A"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Description (Optional)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Add notes about this event..."
                style={styles.textarea}
                rows={3}
              />
            </div>

            <div style={styles.formActions}>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingEvent(null);
                  resetForm();
                }}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button type="submit" style={styles.saveButton}>
                <FiSave size={18} style={{ marginRight: 8 }} />
                {editingEvent ? 'Update' : 'Save Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading schedule...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Teaching Schedule</h1>
          <p style={styles.subtitle}>Manage your weekly timetable</p>
        </div>
        
        <div style={styles.controls}>
          <div style={styles.viewControls}>
            <button 
              onClick={() => setViewMode('week')}
              style={{
                ...styles.viewButton,
                backgroundColor: viewMode === 'week' ? colors.primary : 'transparent',
                color: viewMode === 'week' ? colors.white : colors.textPrimary,
                borderColor: viewMode === 'week' ? colors.primary : colors.border
              }}
            >
              <FiGrid style={{ marginRight: 8 }} />
              Week View
            </button>
            <button 
              onClick={() => setViewMode('list')}
              style={{
                ...styles.viewButton,
                backgroundColor: viewMode === 'list' ? colors.primary : 'transparent',
                color: viewMode === 'list' ? colors.white : colors.textPrimary,
                borderColor: viewMode === 'list' ? colors.primary : colors.border
              }}
            >
              <FiList style={{ marginRight: 8 }} />
              List View
            </button>
          </div>
          
          <div style={styles.actionButtons}>
            <button 
              onClick={fetchSchedule}
              style={styles.refreshButton}
              title="Refresh schedule"
            >
              <FiRefreshCw size={20} />
            </button>
            <button 
              onClick={() => setShowModal(true)}
              style={styles.addButton}
            >
              <FiPlus style={{ marginRight: 8 }} />
              Add Event
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && !schedule.length && (
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>⚠️</div>
          <div>
            <h3 style={styles.errorTitle}>Unable to Load Schedule</h3>
            <p style={styles.errorMessage}>{error}</p>
          </div>
          <button onClick={fetchSchedule} style={styles.retryButton}>
            Try Again
          </button>
        </div>
      )}

      {/* Main Content */}
      <div style={styles.content}>
        {viewMode === 'week' ? renderWeekView() : renderListView()}
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        <h3 style={styles.legendTitle}>Event Types</h3>
        <div style={styles.legendItems}>
          {eventTypes.map(type => (
            <div key={type.value} style={styles.legendItem}>
              <div style={{ ...styles.legendDot, backgroundColor: type.color }}></div>
              <span>{type.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div style={styles.instructions}>
        <h3 style={styles.instructionsTitle}>How to use your schedule:</h3>
        <ul style={styles.instructionsList}>
          <li>Click "Add Event" to schedule your teaching sessions</li>
          <li>Click on any event to edit or delete it</li>
          <li>Switch between Week View and List View</li>
          <li>Your schedule is automatically saved</li>
        </ul>
      </div>

      {/* Event Modal */}
      {renderModal()}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#F8FAFC',
    minHeight: '100vh'
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1E293B',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748B',
    margin: '0 0 24px 0'
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '24px'
  },
  viewControls: {
    display: 'flex',
    gap: '12px'
  },
  viewButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 20px',
    border: '2px solid',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  refreshButton: {
    padding: '10px',
    backgroundColor: 'transparent',
    border: '2px solid #E2E8F0',
    borderRadius: '8px',
    color: '#64748B',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#F1F5F9',
      transform: 'rotate(90deg)'
    }
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#3A4219',
      transform: 'translateY(-2px)'
    }
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  errorIcon: {
    fontSize: '24px'
  },
  errorTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#DC2626',
    margin: '0 0 4px 0'
  },
  errorMessage: {
    fontSize: '14px',
    color: '#991B1B',
    margin: 0
  },
  retryButton: {
    padding: '8px 16px',
    backgroundColor: '#DC2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    marginLeft: 'auto',
    ':hover': {
      backgroundColor: '#B91C1C'
    }
  },
  content: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: '24px',
    overflowX: 'auto'
  },
  weekContainer: {
    minWidth: '800px'
  },
  weekGrid: {
    display: 'grid',
    gridTemplateColumns: '100px repeat(6, 1fr)',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  timeColumn: {
    backgroundColor: '#F8FAFC'
  },
  timeHeader: {
    padding: '16px',
    backgroundColor: '#4B5320',
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    borderBottom: '1px solid #E2E8F0'
  },
  timeSlot: {
    padding: '16px',
    borderBottom: '1px solid #E2E8F0',
    fontSize: '14px',
    color: '#64748B',
    textAlign: 'center',
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dayColumn: {
    borderLeft: '1px solid #E2E8F0'
  },
  dayHeader: {
    padding: '16px',
    backgroundColor: '#F1F5F9',
    borderBottom: '1px solid #E2E8F0',
    textAlign: 'center'
  },
  dayName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: '4px'
  },
  eventCount: {
    fontSize: '12px',
    color: '#64748B'
  },
  timeCell: {
    height: '80px',
    borderBottom: '1px solid #E2E8F0',
    position: 'relative'
  },
  eventBlock: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    color: 'white',
    padding: '8px',
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'scale(1.02)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }
  },
  eventContent: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  eventTitle: {
    fontSize: '12px',
    fontWeight: '600',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  eventTime: {
    fontSize: '11px',
    opacity: 0.9
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px'
  },
  daySection: {
    borderBottom: '1px solid #E2E8F0',
    paddingBottom: '32px',
    ':last-child': {
      borderBottom: 'none',
      paddingBottom: 0
    }
  },
  dayTitleContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  dayTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1E293B',
    margin: 0
  },
  dayEventCount: {
    fontSize: '14px',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    padding: '4px 12px',
    borderRadius: '12px'
  },
  eventsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  eventCard: {
    display: 'flex',
    backgroundColor: 'white',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
    }
  },
  eventColorIndicator: {
    width: '6px',
    flexShrink: 0
  },
  eventDetails: {
    flex: 1,
    padding: '20px'
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },
  eventTitleText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1E293B',
    margin: '0 0 8px 0'
  },
  eventMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap'
  },
  eventTime: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#64748B'
  },
  eventLocation: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#64748B'
  },
  classTag: {
    backgroundColor: 'rgba(75, 83, 32, 0.1)',
    color: '#4B5320',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  },
  eventActions: {
    display: 'flex',
    gap: '8px'
  },
  actionButton: {
    background: 'none',
    border: 'none',
    color: '#64748B',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#F1F5F9',
      color: '#4B5320'
    }
  },
  eventDescription: {
    fontSize: '14px',
    color: '#64748B',
    lineHeight: 1.6,
    margin: '0 0 16px 0'
  },
  eventType: {
    display: 'inline-block',
    backgroundColor: 'rgba(75, 83, 32, 0.1)',
    color: '#4B5320',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 40px'
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1E293B',
    margin: '24px 0 12px 0'
  },
  emptyText: {
    fontSize: '16px',
    color: '#64748B',
    margin: '0 0 32px 0'
  },
  addFirstButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px 28px',
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    margin: '0 auto',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#3A4219',
      transform: 'translateY(-2px)'
    }
  },
  legend: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: '24px'
  },
  legendTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1E293B',
    margin: '0 0 20px 0'
  },
  legendItems: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '24px'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%'
  },
  instructions: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #E2E8F0'
  },
  instructionsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1E293B',
    margin: '0 0 16px 0'
  },
  instructionsList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#64748B',
    lineHeight: 1.8
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalHeader: {
    padding: '24px 24px 16px',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1E293B',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#64748B',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    ':hover': {
      backgroundColor: '#F1F5F9'
    }
  },
  form: {
    padding: '24px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    marginBottom: '20px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1E293B',
    backgroundColor: 'white',
    transition: 'all 0.2s ease',
    ':focus': {
      outline: 'none',
      borderColor: '#4B5320',
      boxShadow: '0 0 0 3px rgba(75, 83, 32, 0.1)'
    }
  },
  select: {
    width: '100%',
    padding: '12px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1E293B',
    backgroundColor: 'white',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2364748B' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '16px',
    transition: 'all 0.2s ease',
    ':focus': {
      outline: 'none',
      borderColor: '#4B5320',
      boxShadow: '0 0 0 3px rgba(75, 83, 32, 0.1)'
    }
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1E293B',
    backgroundColor: 'white',
    resize: 'vertical',
    minHeight: '80px',
    transition: 'all 0.2s ease',
    ':focus': {
      outline: 'none',
      borderColor: '#4B5320',
      boxShadow: '0 0 0 3px rgba(75, 83, 32, 0.1)'
    }
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '16px',
    marginTop: '32px'
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: '#64748B',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#F1F5F9'
    }
  },
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#3A4219'
    }
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #F1F5F9',
    borderTop: '3px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  loadingText: {
    fontSize: '16px',
    color: '#64748B'
  }
};

// Add CSS animation
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);

export default TeacherSchedule;
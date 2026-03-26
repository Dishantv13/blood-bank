import React, { useState, useEffect } from 'react';
import { useGetBloodBankEventsQuery, useGetEventRegistrationsQuery, useCreateEventMutation, useUpdateEventMutation, useDeleteEventMutation, useExportEventRegistrationsMutation } from '../store/eventApi';
import EventCard from './EventCard';
import EventFormModal from './EventFormModal';
import { useToast } from './ToastContainer';
import '../components.css/BloodBankEventManager.css'
import SkeletonLoader from './SkeletonLoader';

const BloodBankEventManager = () => {
  const { success, error } = useToast();
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showRegistrations, setShowRegistrations] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedEventForDetails, setSelectedEventForDetails] = useState(null);

  const { data: eventsData, isLoading: loading, refetch } = useGetBloodBankEventsQuery();
  const { data: regsData, isFetching: registrationsLoading } = useGetEventRegistrationsQuery(selectedEvent?._id, { skip: !selectedEvent?._id });
  const [createEvent] = useCreateEventMutation();
  const [updateEvent] = useUpdateEventMutation();
  const [deleteEvent] = useDeleteEventMutation();
  const [exportRegistrations] = useExportEventRegistrationsMutation();

  useEffect(() => {
    if (eventsData?.events) {
      setEvents(eventsData.events);
    } else if (Array.isArray(eventsData)) {
      setEvents(eventsData);
    }
  }, [eventsData]);

  useEffect(() => {
    if (regsData?.registrations) {
      setRegistrations(regsData.registrations);
    } else if (Array.isArray(regsData)) {
      setRegistrations(regsData);
    }
  }, [regsData]);

  const fetchAllEvents = () => {
    refetch();
  };

  const handleCreateUpdate = async (formData) => {
    try {
      if (editingEvent) {
        await updateEvent({ id: editingEvent._id, ...formData }).unwrap();
        success('Event updated successfully!');
        refetch(); // Reload data immediately
      } else {
        await createEvent(formData).unwrap();
        success('Event created successfully!');
        refetch(); // Reload data immediately
      }
      setShowModal(false);
      setEditingEvent(null);
    } catch (err) {
      error('Failed to save event: ' + (err.data?.message || err.message));
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setShowModal(true);
  };

  const handleDelete = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteEvent(eventId).unwrap();
        success('Event deleted successfully!');
        refetch(); // Reload data immediately
      } catch (err) {
        error('Failed to delete event: ' + (err.data?.message || err.message));
      }
    }
  };

  const handleViewEventDetails = (event) => {
    setSelectedEventForDetails(event);
    setShowEventDetails(true);
  };

  const handleViewRegistrations = (event) => {
    setSelectedEvent(event);
    setShowRegistrations(true);
  };

  const handleExportRegistrations = async (eventId) => {
    try {
      const arrayBuffer = await exportRegistrations(eventId).unwrap();
      
      const url = window.URL.createObjectURL(new Blob([arrayBuffer]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `event-registrations-${eventId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      success('Registrations exported successfully!');
    } catch (err) {
      error('Failed to export registrations: ' + (err.data?.message || err.message));
    }
  };

  const getEventTypeColor = (type) => {
    const colors = {
      'blood-drive': '#ff6b6b',
      'awareness': '#4ecdc4',
      'donation-camp': '#45b7d1',
      'health-checkup': '#96ceb4'
    };
    return colors[type] || '#999';
  };

  const filteredEvents = filterType === 'all' 
    ? events 
    : events.filter(event => event.eventType === filterType);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = filteredEvents
    .filter(e => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const pastEvents = filteredEvents
    .filter(e => new Date(e.date) < today)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const latestPastEvents = pastEvents.slice(0, 3);
  const upcomingRegistrations = upcomingEvents.reduce(
    (sum, event) => sum + (event.registeredDonors?.length || 0),
    0
  );

  return (
    <div className="event-manager-container">
      <div className="event-manager-header">
        <div className="header-content">
          <h2>Events Management</h2>
          <p>Organize and manage blood donation events</p>
        </div>
        <button 
          className="btn-create-event"
          onClick={() => {
            setEditingEvent(null);
            setShowModal(true);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create Event
        </button>
      </div>

      {/* Stats */}
      <div className="event-stats">
        <div className="stat-card2">
          <div className="stat-value1">{upcomingEvents.length}</div>
          <div className="stat-label1">Upcoming Events</div>
        </div>
        <div className="stat-card2">
          <div className="stat-value1">{pastEvents.length}</div>
          <div className="stat-label1">Past Events</div>
        </div>
        <div className="stat-card2">
          <div className="stat-value1">
            {upcomingRegistrations}
          </div>
          <div className="stat-label1">Total Registrations</div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="event-filters">
        <button 
          className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
        >
          All Types
        </button>
        <button 
          className={`filter-btn ${filterType === 'blood-drive' ? 'active' : ''}`}
          onClick={() => setFilterType('blood-drive')}
          style={{ borderLeftColor: getEventTypeColor('blood-drive') }}
        >
          Blood Drive
        </button>
        <button 
          className={`filter-btn ${filterType === 'awareness' ? 'active' : ''}`}
          onClick={() => setFilterType('awareness')}
          style={{ borderLeftColor: getEventTypeColor('awareness') }}
        >
          Awareness
        </button>
        <button 
          className={`filter-btn ${filterType === 'donation-camp' ? 'active' : ''}`}
          onClick={() => setFilterType('donation-camp')}
          style={{ borderLeftColor: getEventTypeColor('donation-camp') }}
        >
          Camps
        </button>
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className="events-section">
          <h3 className="section-title">📅 Upcoming Events</h3>
          <div className="events-grid events-scroll-grid">
            {upcomingEvents.map(event => (
              <EventCard
                key={event._id}
                event={event}
                isBloodBank={true}
                onDetails={() => handleViewEventDetails(event)}
                onEdit={() => handleEdit(event)}
                onDelete={() => handleDelete(event._id)}
                onViewRegistrations={() => handleViewRegistrations(event)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div className="events-section">
          <h3 className="section-title">📊 Past Events (Last 3)</h3>
          <div className="events-grid events-scroll-grid">
            {latestPastEvents.map(event => (
              <EventCard
                key={event._id}
                event={event}
                isBloodBank={true}
                onDetails={() => handleViewEventDetails(event)}
                onEdit={() => handleEdit(event)}
                onDelete={() => handleDelete(event._id)}
                onViewRegistrations={() => handleViewRegistrations(event)}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Events */}
      {filteredEvents.length === 0 && !loading && (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <p>No events created yet</p>
          <button 
            className="btn-create-event secondary"
            onClick={() => {
              setEditingEvent(null);
              setShowModal(true);
            }}
          >
            Create Your First Event
          </button>
        </div>
      )}

      {/* Modals */}
      <EventFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingEvent(null);
        }}
        onSubmit={handleCreateUpdate}
        initialData={editingEvent}
        loading={false}
      />

      {/* Event Details Modal */}
      {showEventDetails && selectedEventForDetails && (
        <div className="modal-overlay" onClick={() => setShowEventDetails(false)}>
          <div className="modal-content camp-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedEventForDetails.title}</h2>
              <button className="close-modal" onClick={() => setShowEventDetails(false)}>×</button>
            </div>
            <div className="camp-details-content">

              <div className="detail-section">
                <h3>Event Information</h3>
                <div className="detail-row">
                  <span className="detail-label">Date:</span>
                  <span>{new Date(selectedEventForDetails.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Time:</span>
                  <span>{selectedEventForDetails.startTime || '09:00'} - {selectedEventForDetails.endTime || '17:00'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Type:</span>
                  <span style={{ textTransform: 'capitalize' }}>{(selectedEventForDetails.eventType || '').replace(/-/g, ' ')}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className={`camp-status ${new Date(selectedEventForDetails.date) >= today ? 'scheduled' : 'completed'}`}>
                    {new Date(selectedEventForDetails.date) >= today ? 'Upcoming' : 'Past'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Visibility:</span>
                  <span style={{ textTransform: 'capitalize' }}>{selectedEventForDetails.visibility || 'Public'}</span>
                </div>
              </div>

              {selectedEventForDetails.location && (
                <div className="detail-section">
                  <h3>Location</h3>
                  {selectedEventForDetails.location.name && (
                    <div className="detail-row">
                      <span className="detail-label">Venue:</span>
                      <span>{selectedEventForDetails.location.name}</span>
                    </div>
                  )}
                  {selectedEventForDetails.location.address && (
                    <div className="detail-row">
                      <span className="detail-label">Address:</span>
                      <span>{selectedEventForDetails.location.address}</span>
                    </div>
                  )}
                  {selectedEventForDetails.location.city && (
                    <div className="detail-row">
                      <span className="detail-label">City:</span>
                      <span>{selectedEventForDetails.location.city}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="detail-section">
                <h3>Registrations</h3>
                <div className="detail-row">
                  <span className="detail-label">Max Participants:</span>
                  <span>{selectedEventForDetails.maxParticipants || 'Unlimited'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Registered:</span>
                  <span>{selectedEventForDetails.registeredDonors?.length || 0}</span>
                </div>
                {selectedEventForDetails.maxParticipants && (
                  <>
                    <div className="progress-bar-large">
                      <div
                        className="progress-fill-large"
                        style={{ width: `${Math.min(100, ((selectedEventForDetails.registeredDonors?.length || 0) / selectedEventForDetails.maxParticipants) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="progress-percentage">
                      {Math.round(((selectedEventForDetails.registeredDonors?.length || 0) / selectedEventForDetails.maxParticipants) * 100)}% Full
                    </div>
                  </>
                )}
              </div>

              {selectedEventForDetails.description && (
                <div className="detail-section">
                  <h3>Description</h3>
                  <p>{selectedEventForDetails.description}</p>
                </div>
              )}

              {selectedEventForDetails.contactInfo && (
                <div className="detail-section">
                  <h3>Contact</h3>
                  {selectedEventForDetails.contactInfo.email && (
                    <div className="detail-row">
                      <span className="detail-label">Email:</span>
                      <span>{selectedEventForDetails.contactInfo.email}</span>
                    </div>
                  )}
                  {selectedEventForDetails.contactInfo.phone && (
                    <div className="detail-row">
                      <span className="detail-label">Phone:</span>
                      <span>{selectedEventForDetails.contactInfo.phone}</span>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Registrations Modal */}
      {showRegistrations && selectedEvent && (
        <div className="modal-overlay" onClick={() => setShowRegistrations(false)}>
          <div className="registrations-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Event Registrations</h2>
              <button className="close-btn" onClick={() => setShowRegistrations(false)}>×</button>
            </div>

            <div className="modal-content">
              <div className="event-details">
                <h3>{selectedEvent.title}</h3>
                <p className="event-date">
                  {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
                <p className="event-location">{selectedEvent.location?.name}</p>
              </div>

              {registrationsLoading ? (
                <SkeletonLoader />
              ) : (
                <>
                  <div className="registrations-info">
                    <p><strong>Total Registrations:</strong> {registrations.length}</p>
                  </div>

                  {registrations.length > 0 ? (
                    <div className="registrations-list">
                      <table>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Blood Group</th>
                            <th>Registered On</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrations.map((reg, idx) => (
                            <tr key={idx}>
                              <td>{reg.name || reg._id}</td>
                              <td>{reg.email || 'N/A'}</td>
                              <td>{reg.phone || 'N/A'}</td>
                              <td><span className="blood-group">{reg.bloodGroup || 'N/A'}</span></td>
                              <td>{reg.createdAt ? new Date(reg.createdAt).toLocaleDateString() : 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="no-registrations">
                      <p>No registrations for this event yet</p>
                    </div>
                  )}

                  <div className="modal-footer">
                    <button 
                      className="btn-export"
                      onClick={() => handleExportRegistrations(selectedEvent._id)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Export to Excel
                    </button>
                    <button 
                      className="btn-close"
                      onClick={() => setShowRegistrations(false)}
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BloodBankEventManager;

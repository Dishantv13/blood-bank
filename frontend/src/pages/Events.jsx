import { useState, useMemo } from 'react';
import { useGetAllEventsQuery, useRegisterForEventMutation } from '../store/eventApi';
import { useGetAllCampsQuery, useRegisterForCampMutation } from '../store/bloodCampApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContainer';
import { FaTint, FaBullhorn, FaHospital, FaStethoscope } from 'react-icons/fa';
import '../pages.css/Events.css';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

const Events = () => {
  const { user } = useAuth();
  const { success, error, info } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set());
  const [registeredCampIds, setRegisteredCampIds] = useState(new Set());

  const currentUserId = user?.id || user?._id || null;

  const { data: campsResponse, isLoading: loadingCamps, refetch: refetchCamps } = useGetAllCampsQuery({ upcoming: true });
  const { data: eventsResponse, isLoading: loadingEvents, refetch: refetchEvents } = useGetAllEventsQuery();

  // RTK Mutations for registrations
  const [registerForEvent] = useRegisterForEventMutation();
  const [registerForCamp] = useRegisterForCampMutation();

  const loading = loadingCamps || loadingEvents;

  // Filter regular events based on user mode and visibility
  const bloodCamps = campsResponse?.data || [];
  const regularEvents = useMemo(() => {
    const allEvents = eventsResponse?.data || [];
    const userMode = user?.activeMode || 'patient';
    const isDonor = user?.isDonor;

    return allEvents.filter(event => {
      // Don't show inactive events
      if (!event.isActive) return false;

      // Check visibility
      if (event.visibility === 'public') return true;
      if (event.visibility === 'donors-only' && userMode === 'donor' && isDonor) return true;
      if (event.visibility === 'patients-only' && userMode === 'patient') return true;

      return false;
    });
  }, [eventsResponse?.data, user?.activeMode, user?.isDonor]);

  const getRegistrantId = (entry) => {
    if (!entry) return null;
    if (typeof entry === 'string') return entry;
    return entry.donor?._id || entry.donor || entry._id || entry.id || null;
  };

  const isRegisteredForEvent = (event) => {
    // Check local state first for immediate UI feedback
    if (registeredEventIds.has(event._id)) return true;

    if (!currentUserId || !event.registeredDonors) return false;
    return event.registeredDonors.some((donor) => {
      const donorId = getRegistrantId(donor);
      return donorId && String(donorId) === String(currentUserId);
    });
  };

  const isRegisteredForCamp = (camp) => {
    // Check local state first for immediate UI feedback
    if (registeredCampIds.has(camp._id)) return true;

    if (!currentUserId || !camp.registeredDonors) return false;
    return camp.registeredDonors.some((donor) => {
      const donorId = getRegistrantId(donor);
      return donorId && String(donorId) === String(currentUserId);
    });
  };

  const handleRegister = async (event) => {
    if (!currentUserId) {
      error('Please login first to register for events.');
      return;
    }

    if (isRegisteredForEvent(event)) {
      info('You are already registered for this event.');
      return;
    }

    try {
      await registerForEvent(event._id).unwrap();
      // Add to local state immediately for instant UI feedback
      setRegisteredEventIds(prev => new Set([...prev, event._id]));
      success(`You have successfully registered for the event: ${event.title}`);
      refetchEvents();
    } catch (err) {
      const registrationError = err.data?.message || 'Registration failed';
      if (registrationError.toLowerCase().includes('already')) {
        info('You are already registered for this event.');
        setRegisteredEventIds(prev => new Set([...prev, event._id]));
      } else {
        error(registrationError);
      }
    }
  };

  const handleCampRegister = async (camp) => {
    if (!currentUserId) {
      error('Please login first to register for camps.');
      return;
    }

    if (isRegisteredForCamp(camp)) {
      info('You are already registered for this camp.');
      return;
    }

    try {
      await registerForCamp({ id: camp._id, data: {} }).unwrap();
      // Add to local state immediately for instant UI feedback
      setRegisteredCampIds(prev => new Set([...prev, camp._id]));
      success(`You have successfully registered for the camp: ${camp.name}`);
      refetchCamps();
    } catch (err) {
      const registrationError = err.data?.message || 'Registration failed. Please try again.';
      if (registrationError.toLowerCase().includes('already')) {
        info('You are already registered for this camp.');
        setRegisteredCampIds(prev => new Set([...prev, camp._id]));
      } else {
        error(registrationError);
      }
    }
  };

  const getFilteredContent = () => {
    if (activeTab === 'events') return { events: regularEvents, camps: [] };
    if (activeTab === 'camps') return { events: [], camps: bloodCamps };
    return { events: regularEvents, camps: bloodCamps };
  };

  const { events: filteredEvents, camps: filteredCamps } = getFilteredContent();

  if (loading) {
    return <SkeletonLoader variant="list" />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Blood Donation Events & Camps</h1>
        <p className="page-subtitle">Find blood donation events and camps near you</p>
      </div>

      {/* Tab Navigation */}
      <div className="events-tabs">
        <button
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          All
        </button>
        <button
          className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Events
        </button>
        <button
          className={`tab-btn ${activeTab === 'camps' ? 'active' : ''}`}
          onClick={() => setActiveTab('camps')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Blood Camps
        </button>
      </div>

      {/* Blood Camps Section */}
      {filteredCamps.length > 0 && (
        <div className="camps-section">
          <h2 className="section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Blood Donation Camps
          </h2>
          <div className="camps-grid">
            {filteredCamps.map((camp) => (
              <div key={camp._id} className="camp-card">
                <div className="camp-badge">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  Blood Camp
                </div>
                <h3>{camp.name}</h3>
                <p className="camp-description">{camp.description}</p>

                <div className="camp-info-grid">
                  <div className="camp-info-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>{new Date(camp.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="camp-info-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{camp.startTime} - {camp.endTime}</span>
                  </div>
                  <div className="camp-info-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{camp.venue}, {camp.city}</span>
                  </div>
                  <div className="camp-info-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <span>{camp.organizerName || camp.organizer?.name || 'Blood Bank'}</span>
                  </div>
                </div>

                <div className="camp-target">
                  <span>Target: {camp.targetUnits} units</span>
                  <span className={`camp-status ${camp.status}`}>{camp.status}</span>
                </div>

                <button
                  onClick={() => handleCampRegister(camp)}
                  className={`btn btn-block ${isRegisteredForCamp(camp) ? 'btn-success' : 'btn-primary'
                    }`}
                  disabled={isRegisteredForCamp(camp)}
                  style={{
                    cursor: isRegisteredForCamp(camp) ? 'not-allowed' : 'pointer',
                    opacity: isRegisteredForCamp(camp) ? 0.7 : 1
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {isRegisteredForCamp(camp) ? (
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <>
                        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <line x1="20" y1="8" x2="20" y2="14" />
                        <line x1="23" y1="11" x2="17" y2="11" />
                      </>
                    )}
                  </svg>
                  {isRegisteredForCamp(camp) ? 'Already Registered for this camp' : 'Register for Camp'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Events Section */}
      {filteredEvents.length > 0 && (
        <div className="events-section">
          <h2 className="section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Upcoming Events
          </h2>
          <div className="events-grid">
            {filteredEvents.map((event) => (
              <div key={event._id} className="event-card">
                <div className="event-badge">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="2" />
                    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" />
                    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" />
                    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  Event
                </div>

                <h3>{event.title}</h3>
                <p className="event-description">{event.description}</p>

                <div className="event-info-grid">
                  <div className="event-info-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  </div>

                  <div className="event-info-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{event.startTime} - {event.endTime}</span>
                  </div>

                  <div className="event-info-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{event.location?.name || 'Location TBD'}</span>
                  </div>

                  <div className="event-info-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>{event.organizer || event.organizedBy?.name || 'Event Organizer'}</span>
                  </div>
                </div>

                <div className="event-meta">
                  <span className="event-type-badge">
                    {event.eventType === 'blood-drive' && <><FaTint color="#e63946" /> Blood Drive</>}
                    {event.eventType === 'awareness' && <><FaBullhorn /> Awareness</>}
                    {event.eventType === 'health-checkup' && <><FaStethoscope /> Health Checkup</>}
                    {event.eventType === 'donation-camp' && <><FaHospital /> Donation Camp</>}
                  </span>
                  <span className="event-registered">
                    {event.registeredDonors?.length || 0} registered
                  </span>
                </div>

                <button
                  onClick={() => handleRegister(event)}
                  className={`btn btn-block ${isRegisteredForEvent(event) ? 'btn-success' : 'btn-primary'}`}
                  disabled={isRegisteredForEvent(event)}
                  style={{
                    cursor: isRegisteredForEvent(event) ? 'not-allowed' : 'pointer',
                    opacity: isRegisteredForEvent(event) ? 0.75 : 1
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {isRegisteredForEvent(event) ? (
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <>
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </>
                    )}
                  </svg>
                  {isRegisteredForEvent(event) ? 'Already Registered for this event' : 'Register for Event'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredEvents.length === 0 && filteredCamps.length === 0 && (
        <EmptyState
          title="No upcoming events or camps"
          message="Check back soon for new blood donation opportunities!"
        />
      )}
    </div>
  );
};

export default Events;

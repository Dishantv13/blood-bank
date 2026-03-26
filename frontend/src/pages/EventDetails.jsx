import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ROUTE_PATH } from '../enum/routePath';
import { useGetAllEventsQuery, useRegisterForEventMutation } from '../store/eventApi';
import { useToast } from '../components/ToastContainer';
import '../pages.css/EventDetails.css';
import SkeletonLoader from '../components/SkeletonLoader';

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { success, error } = useToast();
  
  const [currentUserId, setCurrentUserId] = useState(null);
  const [hasJustRegistered, setHasJustRegistered] = useState(false);

  // RTK Queries automatically fetch and cache data
  const { data: eventsResponse, isLoading: loading, refetch: refetchEventDetails } = useGetAllEventsQuery();
  const [registerForEvent, { isLoading: registering }] = useRegisterForEventMutation();

  const events = Array.isArray(eventsResponse?.data) ? eventsResponse.data : [];
  const eventData = events.find((item) => String(item?._id || item?.id) === String(eventId)) || null;
  const event = eventData || null;

  useEffect(() => {
    checkUserLogin();
    setHasJustRegistered(false);
  }, [eventId]);

  const checkUserLogin = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id || user._id);
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  };

  const getRegistrantId = (entry) => {
    if (!entry) return null;
    if (typeof entry === 'string') return entry;
    return entry.donor?._id || entry.donor || entry._id || entry.id || null;
  };

  const isRegisteredFromServer = eventData?.registeredDonors && currentUserId
    ? eventData.registeredDonors.some((donor) => {
        const donorId = getRegistrantId(donor);
        return donorId && String(donorId) === String(currentUserId);
      })
    : false;

  const isRegistered = hasJustRegistered || isRegisteredFromServer;

  const handleRegister = async () => {
    if (!currentUserId) {
      error('Please login first');
      navigate(ROUTE_PATH.LOGIN);
      return;
    }

    try {
      await registerForEvent(eventId).unwrap();
      setHasJustRegistered(true);
      success('Successfully registered for the event!');
      refetchEventDetails();
    } catch (err) {
      error(err.data?.message || 'Failed to register for event');
    }
  };

  if (loading) {
    return <SkeletonLoader />;
  }

  if (!event) {
    return (
      <div className="event-details-container">
        <div className="error-state">
          <h2>Event Not Found</h2>
          <p>The event you're looking for doesn't exist or has been removed.</p>
          <button className="btn-back" onClick={() => navigate(ROUTE_PATH.EVENTS)}>
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.date);
  const isPastEvent = eventDate < new Date();
  const registeredCount = event.registeredDonors?.length || 0;
  const availableSlots = (event.maxParticipants || 100) - registeredCount;

  const getEventTypeIcon = (type) => {
    const icons = {
      'blood-drive': '🩸',
      'awareness': '📢',
      'donation-camp': '🏥',
      'health-checkup': '⚕️'
    };
    return icons[type] || '📅';
  };

  const getEventTypeLabel = (type) => {
    const labels = {
      'blood-drive': 'Blood Drive',
      'awareness': 'Awareness Campaign',
      'donation-camp': 'Donation Camp',
      'health-checkup': 'Health Checkup'
    };
    return labels[type] || type;
  };

  return (
    <div className="event-details-container">
      {/* Hero Section */}
      <div className="event-hero">
        <button className="btn-back-small" onClick={() => navigate(ROUTE_PATH.EVENTS)}>
          ← Back to Events
        </button>
        <div className="hero-content">
          <div className="event-type-badge">
            {getEventTypeIcon(event.eventType)} {getEventTypeLabel(event.eventType)}
          </div>
          <h1>{event.title}</h1>
          {event.visibility && (
            <p className="visibility">
              {event.visibility === 'public' ? '🌐 Public Event' : 
               event.visibility === 'donors-only' ? '👥 For Donors Only' : 
               '🏥 For Patients'}
            </p>
          )}
        </div>
      </div>

      <div className="details-wrapper">
        {/* Main Content */}
        <div className="details-main">
          {/* Description */}
          <section className="details-section">
            <h2>About this Event</h2>
            <p className="description">{event.description}</p>
          </section>

          {/* Event Information */}
          <section className="details-section">
            <h2>Event Information</h2>
            <div className="info-grid">
              <div className="info-card">
                <div className="info-icon">📅</div>
                <div className="info-content">
                  <h3>Date</h3>
                  <p>{eventDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}</p>
                </div>
              </div>

              <div className="info-card">
                <div className="info-icon">🕐</div>
                <div className="info-content">
                  <h3>Time</h3>
                  <p>
                    {event.startTime || '09:00'} - {event.endTime || '17:00'}
                  </p>
                </div>
              </div>

              <div className="info-card">
                <div className="info-icon">📍</div>
                <div className="info-content">
                  <h3>Location</h3>
                  <p>
                    <strong>{event.location?.name}</strong>
                    {event.location?.address && <br />}
                    {event.location?.address}
                  </p>
                </div>
              </div>

              <div className="info-card">
                <div className="info-icon">👥</div>
                <div className="info-content">
                  <h3>Capacity</h3>
                  <p>{registeredCount} / {event.maxParticipants || 100} registered</p>
                  <p className="subtext">
                    {availableSlots > 0 ? `${availableSlots} slots available` : 'Event full'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          {event.contactInfo && (
            <section className="details-section">
              <h2>Contact Information</h2>
              <div className="contact-box">
                <div className="contact-item">
                  <span className="contact-label">Email:</span>
                  <a href={`mailto:${event.contactInfo.email}`} className="contact-link">
                    {event.contactInfo.email}
                  </a>
                </div>
                <div className="contact-item">
                  <span className="contact-label">Phone:</span>
                  <a href={`tel:${event.contactInfo.phone}`} className="contact-link">
                    {event.contactInfo.phone}
                  </a>
                </div>
              </div>
            </section>
          )}

          {/* Organizer Information */}
          {event.organizedBy && (
            <section className="details-section">
              <h2>Organized By</h2>
              <div className="organizer-info">
                <h3>{event.organizedBy.name || event.organizer}</h3>
                {event.organizedBy.email && (
                  <p className="org-detail">
                    <strong>Email:</strong> {event.organizedBy.email}
                  </p>
                )}
                {event.organizedBy.phone && (
                  <p className="org-detail">
                    <strong>Phone:</strong> {event.organizedBy.phone}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Expected Details */}
          {event.expectedDonors && (
            <section className="details-section">
              <h2>Event Details</h2>
              <div className="details-table">
                <div className="detail-row">
                  <span className="detail-label">Expected Donors:</span>
                  <span className="detail-value">{event.expectedDonors}</span>
                </div>
                {isPastEvent && (
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value past">Event Completed</span>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="details-sidebar">
          {/* Registration Card */}
          <div className="registration-card">
            <h3>Registration Status</h3>
            
            {isPastEvent ? (
              <div className="status-box completed">
                <p>This event has already completed.</p>
              </div>
            ) : isRegistered ? (
              <div className="status-box registered">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <p><strong>You're Registered!</strong></p>
                <p className="subtext">See you at the event</p>
              </div>
            ) : availableSlots <= 0 ? (
              <div className="status-box full">
                <p>This event is currently full.</p>
              </div>
            ) : (
              <div className="status-box available">
                <p><strong>{availableSlots} spots available</strong></p>
              </div>
            )}

            <button
              className={`btn-register ${isRegistered ? 'registered' : ''}`}
              onClick={handleRegister}
              disabled={isRegistered || isPastEvent || availableSlots <= 0 || registering}
            >
              {registering ? 'Registering...' : 
               isRegistered ? '✓ Registered' : 
               availableSlots <= 0 ? 'Event Full' :
               'Register for Event'}
            </button>

            {!currentUserId && !isPastEvent && (
              <p className="login-prompt">
                <Link to={ROUTE_PATH.LOGIN}>Login</Link> to register for this event
              </p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="quick-stats">
            <div className="stat">
              <div className="stat-label">Registrations</div>
              <div className="stat-value">{registeredCount}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Available</div>
              <div className="stat-value">{Math.max(0, availableSlots)}</div>
            </div>
          </div>

          {/* Share Event */}
          <div className="share-section">
            <h3>Share Event</h3>
            <div className="share-buttons">
              <button 
                className="share-btn"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: event.title,
                      text: event.description,
                      url: window.location.href
                    });
                  }
                }}
              >
                📱 Share
              </button>
              <button 
                className="share-btn"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  success('Link copied to clipboard!');
                }}
              >
                🔗 Copy Link
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;

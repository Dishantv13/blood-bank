import { FaGlobe, FaUsers, FaHospital } from "react-icons/fa";
import "../components.css/EventCard.css";

const EventCard = ({
  event,
  isBloodBank = false,
  onEdit,
  onDelete,
  onViewRegistrations,
  onDetails,
  onRegister,
  isRegistered = false,
}) => {
  const eventDate = new Date(event.date);
  const isPastEvent = eventDate < new Date();
  const registeredCount = event.registeredDonors?.length || 0;

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getEventTypeColor = (type) => {
    const colors = {
      "blood-drive": "#ff6b6b",
      awareness: "#4ecdc4",
      "donation-camp": "#45b7d1",
      "health-checkup": "#96ceb4",
    };
    return colors[type] || "#999";
  };

  const getEventTypeLabel = (type) => {
    const labels = {
      "blood-drive": "Blood Drive",
      awareness: "Awareness",
      "donation-camp": "Donation Camp",
      "health-checkup": "Health Checkup",
    };
    return labels[type] || type;
  };

  return (
    <div className={`event-card ${isPastEvent ? "past-event" : ""}`}>
      {/* Event Badge */}
      <div
        className="event-badge"
        style={{ backgroundColor: getEventTypeColor(event.eventType) }}
      >
        {getEventTypeLabel(event.eventType)}
      </div>

      {/* Past Event Overlay */}
      {isPastEvent && <div className="past-event-overlay">Event Completed</div>}

      {/* Event Header */}
      <div className="event-header">
        <h3>{event.title}</h3>
        {event.visibility && (
          <span className="visibility-badge">
            {event.visibility === "public" ? (
              <>
                <FaGlobe style={{ marginRight: "4px" }} /> Public
              </>
            ) : event.visibility === "donors-only" ? (
              <>
                <FaUsers style={{ marginRight: "4px" }} /> Donors
              </>
            ) : (
              <>
                <FaHospital style={{ marginRight: "4px" }} /> Patients
              </>
            )}
          </span>
        )}
      </div>

      {/* Event Description */}
      <p className="event-description">{event.description}</p>

      {/* Event Info Grid */}
      <div className="event-info-grid">
        <div className="info-item">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{formatDate(eventDate)}</span>
        </div>

        <div className="info-item">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>
            {event.startTime || "09:00"} - {event.endTime || "17:00"}
          </span>
        </div>

        <div className="info-item">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{event.location?.name || "Location"}</span>
        </div>

        {/* Registrations Info */}
        <div className="info-item">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>
            {registeredCount} / {event.maxParticipants || "100"}
          </span>
        </div>
      </div>

      {/* Contact Info */}
      {event.contactInfo && (
        <div className="contact-info">
          <p>
            <strong>Contact:</strong> {event.contactInfo.email} |{" "}
            {event.contactInfo.phone}
          </p>
        </div>
      )}

      {/* Organizer Info */}
      {event.organizedBy && (
        <div className="organizer-info">
          <p>
            <strong>Organized by:</strong>{" "}
            {event.organizedBy.name || event.organizer}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="event-actions">
        {isBloodBank ? (
          <>
            <button
              className="action-btn details-event-btn"
              onClick={onDetails}
              title="View Details"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Details
            </button>

            <button
              className="action-btn edit-btn"
              onClick={onEdit}
              title="Edit Event"
              disabled={isPastEvent}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              Edit
            </button>

            <button
              className="action-btn registrations-btn"
              onClick={onViewRegistrations}
              title="View Registrations"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Regs
            </button>

            <button
              className="action-btn delete-btn"
              onClick={onDelete}
              title="Delete Event"
              disabled={isPastEvent}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete
            </button>
          </>
        ) : (
          <button
            className={`action-btn register-btn ${isRegistered ? "registered" : ""}`}
            onClick={onRegister}
            disabled={isRegistered || isPastEvent}
            title={
              isRegistered ? "Already registered" : "Register for this event"
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {isRegistered ? "Registered" : "Register"}
          </button>
        )}
      </div>
    </div>
  );
};

export default EventCard;

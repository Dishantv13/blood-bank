import { useState, useEffect } from "react";
import {
  useGetBloodBankEventsQuery,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useExportEventRegistrationsMutation,
} from "../store/eventApi";
import "../pages.css/BloodBankEvents.css";
import SkeletonLoader from "../components/SkeletonLoader";

const BloodBankEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [editingEvent, setEditingEvent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: eventsData, isLoading, refetch } = useGetBloodBankEventsQuery();
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

  const fetchEvents = () => {
    refetch();
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 4000);
  };

  const handleEditEvent = (event) => {
    setEditingEvent({ ...event });
    setShowEditModal(true);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;

    try {
      await updateEvent({ id: editingEvent._id, ...editingEvent }).unwrap();
      showMessage("success", "Event updated successfully!");
      setShowEditModal(false);
      setEditingEvent(null);
    } catch (error) {
      console.error("Error updating event:", error);
      showMessage("error", error.data?.message || "Failed to update event");
    }
  };

  const handleDeleteEvent = async (eventId, eventTitle) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await deleteEvent(eventId).unwrap();
      showMessage("success", "Event deleted successfully!");
    } catch (error) {
      console.error("Error deleting event:", error);
      showMessage("error", error.data?.message || "Failed to delete event");
    }
  };

  const handleExportRegistrations = async (eventId, eventTitle) => {
    try {
      showMessage("info", "Generating Excel file...");

      const arrayBuffer = await exportRegistrations(eventId).unwrap();

      const blob = new Blob([arrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${eventTitle.replace(/\s+/g, "_")}_Registrations.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showMessage("success", "Registration data exported successfully!");
    } catch (error) {
      console.error("Error exporting registrations:", error);
      showMessage("error", "Failed to export registrations");
    }
  };

  const handleInputChange = (field, value) => {
    setEditingEvent((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading && events.length === 0) {
    return <SkeletonLoader />;
  }

  return (
    <div className="blood-bank-events-container">
      <div className="events-header">
        <h1>Manage Events & Campaigns</h1>
        <p>
          View, edit, and export registration data for your organized events
        </p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      {events.length === 0 ? (
        <div className="empty-state">
          <h3>No events organized yet</h3>
          <p>Create your first event to start collecting registrations</p>
        </div>
      ) : (
        <div className="events-grid">
          {events.map((event) => (
            <div key={event._id} className="event-card">
              <div className="event-header">
                <h3>{event.title}</h3>
                <span
                  className={`event-status ${event.isActive ? "active" : "inactive"}`}
                >
                  {event.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="event-details">
                <p className="event-type">
                  {event.eventType?.replace("-", " ")}
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(event.date).toLocaleDateString()}
                </p>
                <p>
                  <strong>Time:</strong> {event.startTime} - {event.endTime}
                </p>
                <p>
                  <strong>Location:</strong> {event.location?.name || "N/A"}
                </p>
                <p>
                  <strong>Registrations:</strong>{" "}
                  {event.registeredDonors?.length || 0} /{" "}
                  {event.maxParticipants}
                </p>
              </div>

              <div className="event-description">
                <p>{event.description}</p>
              </div>

              <div className="event-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => handleEditEvent(event)}
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M13.5 6.5L14.5 7.5M2 18L6 17L17 6C17.5523 5.44772 17.5523 4.55228 17 4L16 3C15.4477 2.44772 14.5523 2.44772 14 3L3 14L2 18Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Edit
                </button>

                <button
                  className="btn btn-success"
                  onClick={() =>
                    handleExportRegistrations(event._id, event.title)
                  }
                  disabled={
                    !event.registeredDonors ||
                    event.registeredDonors.length === 0
                  }
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M3 17V19H17V17M10 3V15M10 15L6 11M10 15L14 11"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Export Excel ({event.registeredDonors?.length || 0})
                </button>

                <button
                  className="btn btn-danger"
                  onClick={() => handleDeleteEvent(event._id, event.title)}
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M3 6H17M8 3H12M8 10V16M12 10V16M5 6L6 17H14L15 6H5Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && editingEvent && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Event</h2>
              <button
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Event Title</label>
                <input
                  type="text"
                  value={editingEvent.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editingEvent.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  className="form-input"
                  rows="4"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={editingEvent.date?.split("T")[0]}
                    onChange={(e) => handleInputChange("date", e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={editingEvent.startTime}
                    onChange={(e) =>
                      handleInputChange("startTime", e.target.value)
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    value={editingEvent.endTime}
                    onChange={(e) =>
                      handleInputChange("endTime", e.target.value)
                    }
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Max Participants</label>
                  <input
                    type="number"
                    value={editingEvent.maxParticipants}
                    onChange={(e) =>
                      handleInputChange(
                        "maxParticipants",
                        parseInt(e.target.value),
                      )
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editingEvent.isActive}
                    onChange={(e) =>
                      handleInputChange("isActive", e.target.value === "true")
                    }
                    className="form-input"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Visibility</label>
                  <select
                    value={editingEvent.visibility}
                    onChange={(e) =>
                      handleInputChange("visibility", e.target.value)
                    }
                    className="form-input"
                  >
                    <option value="public">Public</option>
                    <option value="donors-only">Donors Only</option>
                    <option value="patients-only">Patients Only</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleUpdateEvent}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BloodBankEvents;

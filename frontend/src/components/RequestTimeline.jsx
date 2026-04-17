import { FiCheckCircle, FiCircle, FiClock, FiAlertCircle, FiPackage } from "react-icons/fi";

const RequestTimeline = ({ timeline }) => {
  if (!timeline || timeline.length === 0) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FiClock className="w-4 h-4 text-amber-500" />;
      case 'approved': return <FiCheckCircle className="w-4 h-4 text-blue-500" />;
      case 'fulfilled': return <FiPackage className="w-4 h-4 text-emerald-500" />;
      case 'completed': return <FiCheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected': return <FiAlertCircle className="w-4 h-4 text-rose-500" />;
      case 'cancelled': return <FiCircle className="w-4 h-4 text-gray-500" />;
      default: return <FiCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="timeline-container">
      <h3 className="text-lg font-bold text-gray-900 mb-6 px-1">Request History</h3>
      <div className="timeline-list">
        {timeline.map((event, index) => (
          <div key={index} className="timeline-item">
            <span className="timeline-icon-wrap">
              {getStatusIcon(event.status)}
            </span>
            <div className="timeline-content-body">
              <div className="timeline-header-row">
                <span className="timeline-status-text">
                  {event.status.replace(/_/g, ' ').toUpperCase()}
                </span>
                <span className="timeline-time-text">
                  {new Date(event.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {event.note && (
                <p className="timeline-note-text">
                  {event.note}
                </p>
              )}
              <span className="timeline-meta-text">
                Updated by {event.updatedByModel === 'BloodBank' ? 'Blood Bank' : 'Requester'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RequestTimeline;

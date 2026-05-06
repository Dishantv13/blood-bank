import { useParams, Link } from "react-router-dom";
import {
  useGetRequestByIdQuery,
  useUpdateRequestStatusMutation,
} from "../store/requestApi";
import RequestTimeline from "../components/RequestTimeline";
import RequestStatusBadge from "../components/RequestStatusBadge";
import CompatibilityChart from "../components/CompatibilityChart";
import SkeletonLoader from "../components/SkeletonLoader";
import ChatWindow from "../components/ChatWindow";
import {
  FiMapPin,
  FiPhone,
  FiCalendar,
  FiUser,
  FiInfo,
  FiArrowLeft,
  FiAlertTriangle,
  FiCheckCircle,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastContainer";
import "../pages.css/RequestDetails.css";

const RequestDetails = () => {
  const { requestId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const {
    data: response,
    isLoading,
    error,
  } = useGetRequestByIdQuery(requestId);
  const [updateStatus, { isLoading: updatingStatus }] =
    useUpdateRequestStatusMutation();

  const request = response?.data;
  const isOwner =
    user &&
    request &&
    String(request.requestedBy?._id || request.requestedBy) ===
      String(user._id);

  const handleCancelRequest = async () => {
    if (window.confirm("Are you sure you want to cancel this request?")) {
      try {
        await updateStatus({
          id: requestId,
          status: "cancelled",
          note: "Cancelled by requester.",
        }).unwrap();
        toast.success("Request cancelled successfully");
      } catch (err) {
        toast.error(err.data?.message || "Failed to cancel request");
      }
    }
  };

  if (isLoading) return <SkeletonLoader variant="form" />;
  if (error)
    return (
      <div className="request-details-container">
        <div className="p-10 text-center bg-white rounded-3xl shadow-xl">
          <FiAlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-900">
            Request Not Found
          </h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">
            The blood request you are looking for might have been removed or is
            unavailable.
          </p>
          <Link to="/dashboard" className="back-link">
            <FiArrowLeft /> Back to Dashboard
          </Link>
        </div>
      </div>
    );

  return (
    <div className="request-details-container">
      <Link to="/dashboard" className="back-link">
        <FiArrowLeft /> Back to Dashboard
      </Link>

      <div className="request-grid">
        <div className="main-content">
          {/* Header Card */}
          <div className="request-header-card">
            <div className="header-top">
              <div className="blood-group-hero">
                <div className="blood-badge-large">
                  <span className="group-name">{request.bloodGroup}</span>
                  <span className="label">Group</span>
                </div>
                <div className="patient-meta">
                  <h1>{request.patientName}</h1>
                  <div className="status-row">
                    <RequestStatusBadge status={request.status} />
                    <span className="urgency-indicator">
                      <FiInfo strokeWidth={3} size={14} /> {request.urgency}{" "}
                      Priority
                    </span>
                  </div>
                </div>
              </div>

              {isOwner && request.status === "pending" && (
                <button
                  onClick={handleCancelRequest}
                  disabled={updatingStatus}
                  className="btn-cancel-request"
                >
                  Cancel Request
                </button>
              )}
            </div>

            <div className="info-grid">
              <div className="info-item">
                <div className="info-icon-box">
                  <FiMapPin />
                </div>
                <div className="info-content">
                  <span className="label">Location</span>
                  <p className="value">{request.hospital?.name}</p>
                  <p className="subtext">{request.hospital?.address}</p>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon-box">
                  <FiCalendar />
                </div>
                <div className="info-content">
                  <span className="label">Needed By</span>
                  <p className="value">
                    {new Date(request.requiredBy).toLocaleDateString(
                      undefined,
                      {
                        dateStyle: "long",
                      },
                    )}
                  </p>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon-box">
                  <FiUser />
                </div>
                <div className="info-content">
                  <span className="label">Quantity</span>
                  <p className="value">{request.units} Units</p>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon-box">
                  <FiPhone />
                </div>
                <div className="info-content">
                  <span className="label">Contact</span>
                  <p className="value">{request.contactNumber}</p>
                </div>
              </div>
            </div>

            <div className="description-section">
              <h3>Additional Information</h3>
              <p>
                {request.description ||
                  "No additional notes provided for this request."}
              </p>
            </div>
          </div>

          {/* Real-time Chat Section */}
          {(request.bloodBank ||
            request.targetBloodBank ||
            request.requestingBloodBank) && (
            <div className="mt-8">
              <ChatWindow
                requestId={requestId}
                recipientId={
                  isOwner
                    ? request.bloodBank?._id ||
                      request.targetBloodBank?._id ||
                      request.requestingBloodBank?._id
                    : request.requestedBy?._id || request.requestedBy
                }
                recipientModel={isOwner ? "BloodBank" : "User"}
              />
            </div>
          )}
        </div>

        <div className="sidebar-content">
          <div className="sidebar-card">
            <RequestTimeline timeline={request.timeline} />
          </div>

          {/* Compatibility Help Move to sidebar */}
          <div className="sidebar-card">
            <CompatibilityChart bloodGroup={request.bloodGroup} />
          </div>

          {request.status === "fulfilled" && request.fulfillment && (
            <div className="sidebar-card fulfillment-card">
              <h4>
                <FiCheckCircle /> Fulfillment Recorded
              </h4>
              <div className="fulfillment-details">
                <div className="fulfillment-row">
                  <span>Provider:</span>
                  <span>{request.bloodBank?.name}</span>
                </div>
                <div className="fulfillment-row">
                  <span>Units:</span>
                  <span>{request.fulfillment.unitsProvided} Units</span>
                </div>
                <div className="fulfillment-row">
                  <span>Method:</span>
                  <span className="capitalize">
                    {request.fulfillment.deliveryMethod}
                  </span>
                </div>
                {request.fulfillment.fulfilledAt && (
                  <div className="fulfillment-row">
                    <span>Date:</span>
                    <span>
                      {new Date(
                        request.fulfillment.fulfilledAt,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestDetails;

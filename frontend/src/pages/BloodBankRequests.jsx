import React, { useState, useEffect } from 'react';
import { useGetBloodBankRequestsQuery, useApproveRequestMutation, useRejectRequestMutation } from '../store/requestApi';
import '../pages.css/BloodBankRequests.css';

const BloodBankRequests = () => {
  const [requests, setRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'approved'
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responseNote, setResponseNote] = useState('');
  const [filters, setFilters] = useState({
    bloodGroup: '',
    urgency: '',
  });

  // RTK Query for real-time updates with filters and status
  const { data: requestsData, isLoading, isFetching, refetch } = useGetBloodBankRequestsQuery({
    status: activeTab,
    ...filters
  }, {
    pollingInterval: 30000, // Auto-refresh every 30 seconds
  });

  const [approveRequest] = useApproveRequestMutation();
  const [rejectRequest] = useRejectRequestMutation();

  useEffect(() => {
    if (requestsData?.requests) {
      if (activeTab === 'pending') {
        setRequests(requestsData.requests);
      } else {
        setApprovedRequests(requestsData.requests);
      }
    }
  }, [requestsData, activeTab]);

  const fetchRequests = () => {
    refetch();
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleApprove = async (requestId) => {
    try {
      await approveRequest({
        id: requestId,
        data: { responseNote: responseNote || 'Request approved. Please contact us for collection.' }
      }).unwrap();
      
      showMessage('success', 'Request approved successfully!');
      setSelectedRequest(null);
      setResponseNote('');
    } catch (error) {
      console.error('Error approving request:', error);
      showMessage('error', error.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async (requestId) => {
    if (!responseNote) {
      showMessage('error', 'Please provide a reason for rejection');
      return;
    }

    try {
      await rejectRequest({
        id: requestId,
        data: { responseNote }
      }).unwrap();
      
      showMessage('info', 'Request rejected');
      setSelectedRequest(null);
      setResponseNote('');
    } catch (error) {
      console.error('Error rejecting request:', error);
      showMessage('error', error.data?.message || 'Failed to reject request');
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical':
        return '#e74c3c';
      case 'urgent':
        return '#f39c12';
      case 'normal':
        return '#27ae60';
      default:
        return '#95a5a6';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading && requests.length === 0 && approvedRequests.length === 0) {
    return <div className="loading">Loading real-time requests...</div>;
  }

  return (
    <div className="blood-bank-requests-container">
      <div className="requests-header">
        <div>
          <h1>Blood Requests Dashboard</h1>
          <p className="real-time-indicator">
            <span className="pulse-dot"></span>
            Real-time updates • {activeTab === 'pending' ? requests.length : approvedRequests.length} {activeTab} request{(activeTab === 'pending' ? requests.length : approvedRequests.length) !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-refresh" onClick={fetchRequests}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 10C3 6.13401 6.13401 3 10 3C12.7 3 15.05 4.6 16.15 7M17 10C17 13.866 13.866 17 10 17C7.3 17 4.95 15.4 3.85 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M16 3V7H12M4 17V13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="tabs-container">
        <button 
          className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          Pending Requests
          {requests.length > 0 && <span className="tab-badge">{requests.length}</span>}
        </button>
        <button 
          className={`tab-button ${activeTab === 'approved' ? 'active' : ''}`}
          onClick={() => setActiveTab('approved')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Approved Requests
          {approvedRequests.length > 0 && <span className="tab-badge">{approvedRequests.length}</span>}
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Blood Group:</label>
          <select
            value={filters.bloodGroup}
            onChange={(e) => setFilters({ ...filters, bloodGroup: e.target.value })}
            className="filter-select"
          >
            <option value="">All Groups</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Urgency:</label>
          <select
            value={filters.urgency}
            onChange={(e) => setFilters({ ...filters, urgency: e.target.value })}
            className="filter-select"
          >
            <option value="">All Levels</option>
            <option value="critical">Critical</option>
            <option value="urgent">Urgent</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {activeTab === 'pending' ? (
        // Pending Requests Section
        requests.length === 0 ? (
          <div className="empty-state">
            <h3>No pending requests</h3>
            <p>All requests have been processed or no new requests available</p>
          </div>
        ) : (
          <div className="requests-grid">
            {requests.map((request) => (
              <div key={request._id} className="request-card">
                <div className="request-header">
                  <div className="patient-info">
                    <h3>{request.patientName}</h3>
                    <p className="request-time">{formatDate(request.createdAt)}</p>
                  </div>
                  <span
                    className="urgency-badge"
                    style={{ backgroundColor: getUrgencyColor(request.urgency) }}
                  >
                    {request.urgency.toUpperCase()}
                  </span>
                </div>

                <div className="request-details">
                  <div className="detail-row">
                    <span className="blood-group-badge">{request.bloodGroup}</span>
                    <span className="units-needed">{request.units} unit{request.units > 1 ? 's' : ''}</span>
                  </div>

                  <div className="detail-item">
                    <strong>Hospital:</strong> {request.hospital || 'Not specified'}
                  </div>

                  <div className="detail-item">
                    <strong>Contact:</strong> {request.contactNumber}
                  </div>

                  <div className="detail-item">
                    <strong>Required By:</strong> {formatDate(request.requiredBy)}
                  </div>

                  {request.requestedBy && (
                    <div className="detail-item">
                      <strong>Requested By:</strong> {request.requestedBy.name} ({request.requestedBy.email})
                    </div>
                  )}

                  {request.description && (
                    <div className="detail-item description">
                      <strong>Description:</strong>
                      <p>{request.description}</p>
                    </div>
                  )}
                </div>

                <div className="request-actions">
                  <button
                    className="btn btn-approve"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path d="M5 10L9 14L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Respond
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // Approved Requests Section
        approvedRequests.length === 0 ? (
          <div className="empty-state">
            <h3>No approved requests</h3>
            <p>You haven't approved any requests yet</p>
          </div>
        ) : (
          <div className="requests-grid">
            {approvedRequests.map((request) => (
              <div key={request._id} className="request-card approved-card">
                <div className="request-header">
                  <div className="patient-info">
                    <h3>{request.patientName}</h3>
                    <p className="request-time">Approved on {formatDate(request.bloodBankResponse?.respondedAt || request.updatedAt)}</p>
                  </div>
                  <span className="status-badge approved">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 10L9 14L15 6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    APPROVED
                  </span>
                </div>

                <div className="request-details">
                  <div className="detail-row">
                    <span className="blood-group-badge">{request.bloodGroup}</span>
                    <span className="units-needed">{request.units} unit{request.units > 1 ? 's' : ''}</span>
                  </div>

                  <div className="contact-section">
                    <h4>Contact Details</h4>
                    <div className="detail-item contact-item">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      <a href={`tel:${request.contactNumber}`} className="contact-link">{request.contactNumber}</a>
                    </div>
                    
                    {request.requestedBy && (
                      <>
                        <div className="detail-item contact-item">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                          <span>{request.requestedBy.name}</span>
                        </div>
                        <div className="detail-item contact-item">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                            <polyline points="22,6 12,13 2,6"/>
                          </svg>
                          <a href={`mailto:${request.requestedBy.email}`} className="contact-link">{request.requestedBy.email}</a>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="detail-item">
                    <strong>Hospital:</strong> {request.hospital || 'Not specified'}
                  </div>

                  <div className="detail-item">
                    <strong>Required By:</strong> {formatDate(request.requiredBy)}
                  </div>

                  {request.description && (
                    <div className="detail-item description">
                      <strong>Description:</strong>
                      <p>{request.description}</p>
                    </div>
                  )}

                  {request.bloodBankResponse?.responseNote && (
                    <div className="detail-item response-note">
                      <strong>Your Response:</strong>
                      <p>{request.bloodBankResponse.responseNote}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Response Modal */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Respond to Request</h2>
              <button className="modal-close" onClick={() => setSelectedRequest(null)}>×</button>
            </div>

            <div className="modal-body">
              <div className="request-summary">
                <h3>{selectedRequest.patientName}</h3>
                <p><strong>Blood Group:</strong> {selectedRequest.bloodGroup} • <strong>Units:</strong> {selectedRequest.units}</p>
                <p><strong>Urgency:</strong> <span className="urgency-text" style={{ color: getUrgencyColor(selectedRequest.urgency) }}>{selectedRequest.urgency.toUpperCase()}</span></p>
              </div>

              <div className="form-group">
                <label>Response Note:</label>
                <textarea
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  placeholder="Add a note for the requester (optional for approval, required for rejection)"
                  className="form-input"
                  rows="4"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedRequest(null)}>
                Cancel
              </button>
              <button
                className="btn btn-reject"
                onClick={() => handleReject(selectedRequest._id)}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Reject
              </button>
              <button
                className="btn btn-approve"
                onClick={() => handleApprove(selectedRequest._id)}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M5 10L9 14L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BloodBankRequests;

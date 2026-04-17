import { useState } from 'react';
import { 
  useGetBloodBankRequestsQuery, 
  useUpdateRequestStatusMutation,
  useFulfillRequestMutation 
} from '../store/requestApi';
import '../pages.css/BloodBankRequests.css';
import SkeletonLoader from '../components/SkeletonLoader';
import RequestStatusBadge from '../components/RequestStatusBadge';

const BloodBankRequests = () => {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'approved', 'fulfilled', 'completed'
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responseNote, setResponseNote] = useState('');
  const [fulfillmentData, setFulfillmentData] = useState({
      unitsProvided: 1,
      deliveryMethod: 'pickup',
      notes: ''
  });
  const [filters, setFilters] = useState({
    bloodGroup: '',
    urgency: '',
  });

  const { data: response, isLoading, isFetching, refetch } = useGetBloodBankRequestsQuery({
    status: activeTab,
    ...filters
  }, {
    pollingInterval: 30000,
  });

  const requests = response?.data || [];

  const [updateStatus, { isLoading: updatingStatus }] = useUpdateRequestStatusMutation();
  const [recordFulfillment, { isLoading: fulfilling }] = useFulfillRequestMutation();

  const handleStatusUpdate = async (requestId, status) => {
    if (status === 'rejected' && !responseNote) {
      showMessage('error', 'Please provide a reason for rejection');
      return;
    }

    try {
      await updateStatus({
        id: requestId,
        status,
        note: responseNote
      }).unwrap();
      
      showMessage('success', `Request ${status} successfully!`);
      setSelectedRequest(null);
      setResponseNote('');
    } catch (error) {
      showMessage('error', error.data?.message || 'Failed to update status');
    }
  };

  const handleFulfill = async (requestId) => {
      try {
          await recordFulfillment({
              id: requestId,
              ...fulfillmentData
          }).unwrap();
          showMessage('success', 'Fulfillment recorded successfully!');
          setSelectedRequest(null);
      } catch (error) {
          showMessage('error', error.data?.message || 'Failed to record fulfillment');
      }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="blood-bank-requests-container">
      <div className="requests-header">
        <div>
          <h1>Blood Requests Dashboard</h1>
          <p className="real-time-indicator">
            <span className="pulse-dot"></span>
            Real-time updates • {requests.length} {activeTab} request{requests.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-refresh" onClick={() => refetch()}>
          Refresh
        </button>
      </div>

      <div className="tabs-container">
        {['pending', 'approved', 'fulfilled', 'completed', 'rejected'].map(tab => (
          <button 
            key={tab}
            data-tab={tab}
            className={`tab-button ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      <div className="filters-section">
        {/* ... (keep filters as they are, just ensuring they use state correctly) */}
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {isLoading ? (
        <SkeletonLoader />
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <h3>No {activeTab} requests found</h3>
          <p>Try matching donors or check other categories.</p>
        </div>
      ) : (
        <div className="requests-grid">
          {requests.map((request) => (
            <div key={request._id} className="request-card">
              <div className="request-header">
                <div>
                  <h3 className="font-bold">{request.patientName}</h3>
                  <p className="text-xs text-gray-500">{formatDate(request.createdAt)}</p>
                </div>
                <RequestStatusBadge status={request.status} />
              </div>

              <div className="request-details">
                <div className="flex justify-between mb-4">
                  <span className="blood-group-badge">{request.bloodGroup}</span>
                  <span className="font-bold">{request.units} Units</span>
                </div>
                <p className="text-sm"><strong>Urgency:</strong> {request.urgency.toUpperCase()}</p>
                <p className="text-sm"><strong>Hospital:</strong> {request.hospital?.name || request.hospital}</p>
                <p className="text-xs text-gray-500">{request.hospital?.address}</p>
                <p className="text-sm"><strong>Required By:</strong> {formatDate(request.requiredBy)}</p>
                
                {request.description && (
                  <p className="text-xs text-gray-500 mt-2 italic">"{request.description}"</p>
                )}
              </div>

              <div className="request-actions">
                {activeTab === 'pending' && (
                  <button className="btn btn-approve" onClick={() => setSelectedRequest(request)}>
                    Process Request
                  </button>
                )}
                {activeTab === 'approved' && (
                  <button className="btn btn-approve" onClick={() => setSelectedRequest(request)}>
                    Record Fulfillment
                  </button>
                )}
                {activeTab === 'fulfilled' && (
                  <button className="btn btn-primary" onClick={() => handleStatusUpdate(request._id, 'completed')}>
                    Mark Completed
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Response/Fulfillment Modal */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{activeTab === 'approved' ? 'Record Fulfillment' : 'Process Request'}</h2>
              <button className="modal-close" onClick={() => setSelectedRequest(null)}>×</button>
            </div>

            <div className="modal-body">
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="font-bold">{selectedRequest.patientName} ({selectedRequest.bloodGroup})</p>
                <p className="text-xs text-gray-600">{selectedRequest.hospital?.name || selectedRequest.hospital}</p>
              </div>

              {activeTab === 'pending' ? (
                <div className="space-y-4">
                  <div className="form-group">
                    <label>Response Note:</label>
                    <textarea
                      value={responseNote}
                      onChange={(e) => setResponseNote(e.target.value)}
                      placeholder="Add a reason for rejection or instructions for approval"
                      className="form-input"
                      rows="3"
                    />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button className="btn btn-reject flex-1" onClick={() => handleStatusUpdate(selectedRequest._id, 'rejected')}>Reject</button>
                    <button className="btn btn-approve flex-1" onClick={() => handleStatusUpdate(selectedRequest._id, 'approved')}>Approve</button>
                  </div>
                </div>
              ) : activeTab === 'approved' ? (
                <div className="space-y-4">
                  <div className="form-group">
                    <label>Units Provided:</label>
                    <input 
                        type="number" 
                        value={fulfillmentData.unitsProvided}
                        onChange={(e) => setFulfillmentData({...fulfillmentData, unitsProvided: e.target.value})}
                        className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Delivery Method:</label>
                    <select 
                        value={fulfillmentData.deliveryMethod}
                        onChange={(e) => setFulfillmentData({...fulfillmentData, deliveryMethod: e.target.value})}
                        className="form-input"
                    >
                        <option value="pickup">Self Pickup</option>
                        <option value="delivery">Hospital Delivery</option>
                    </select>
                  </div>
                  <button className="btn btn-approve w-full mt-4" onClick={() => handleFulfill(selectedRequest._id)}>
                    Submit Fulfillment
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BloodBankRequests;

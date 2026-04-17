import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useGetBloodBankByIdQuery } from '../store/bloodBankApi';
import { useCreateInterBankRequestMutation } from '../store/requestApi';
import { ROUTE_PATH } from '../enum/routePath';
import { useToast } from '../components/ToastContainer';
import { BLOOD_GROUPS } from '../enum/constants';
import { useAuth } from '../context/AuthContext';
import '../pages.css/BloodBankDirectoryDetails.css';

const getInventoryStatus = (units) => {
  if (units <= 0) return 'critical';
  if (units <= 10) return 'low';
  if (units <= 25) return 'moderate';
  return 'good';
};

const normalizeAddress = (address) => {
  if (!address) return 'Address not available';
  if (typeof address === 'string') return address;

  const parts = [address.street, address.city, address.state, address.zipCode || address.pincode].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Address not available';
};

const normalizeOperatingHours = (operatingHours) => {
  if (!operatingHours) return 'Hours not available';
  if (typeof operatingHours === 'string') return operatingHours;

  const open = operatingHours.open || 'N/A';
  const close = operatingHours.close || 'N/A';
  return `${open} - ${close}`;
};

const normalizeInventory = (inventory) => {
  const map = new Map();

  if (Array.isArray(inventory)) {
    inventory.forEach((item) => {
      const bloodGroup = item?.bloodGroup || item?.type;
      if (!bloodGroup) return;
      map.set(bloodGroup, Number(item?.units) || 0);
    });
  }

  return BLOOD_GROUPS.map((bloodGroup) => {
    const units = map.get(bloodGroup) || 0;
    return {
      bloodGroup,
      units,
      status: getInventoryStatus(units)
    };
  });
};

const normalizeServices = (services) => {
  if (!Array.isArray(services)) return [];
  return services.filter(Boolean);
};

const BloodBankDirectoryDetails = () => {
  const { bankId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error } = useToast();
  const { bloodBank: currentBloodBank, isBloodBankAuthenticated, loading: authLoading } = useAuth();

  const [bank, setBank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [requestMessage, setRequestMessage] = useState({ type: '', text: '' });
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [showBulkRequestModal, setShowBulkRequestModal] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const messageTimeoutRef = useRef(null);
  const [requestForm, setRequestForm] = useState({
    units: 1,
    urgency: 'normal',
    description: ''
  });
  const [bulkRequestForm, setBulkRequestForm] = useState({
    urgency: 'normal',
    description: '',
    items: {}
  });

  const { data: bankData, isLoading: queryLoading, error: queryError } = useGetBloodBankByIdQuery(bankId);
  const [createInterBankRequest] = useCreateInterBankRequestMutation();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isBloodBankAuthenticated) {
      navigate(ROUTE_PATH.BLOOD_BANK_LOGIN);
      return;
    }

    if (bankData?.success && bankData.data) {
      setBank(bankData.data);
      setLoading(false);
    } else if (bankData && !bankData.success) {
      setBank(bankData);
      setLoading(false);
    }
  }, [authLoading, bankData, isBloodBankAuthenticated, navigate]);

  useEffect(() => {
    if (queryError) {
      setErrorMessage(queryError.data?.message || 'Unable to load blood bank details. Please try again.');
      setLoading(false);
    }
  }, [queryError]);

  useEffect(() => {
    const stateBank = location.state?.bloodBank;
    if (stateBank && String(stateBank._id || stateBank.id) === String(bankId)) {
      setBank(stateBank);
      setLoading(false);
    }
  }, [bankId, location.state]);

  const inventory = useMemo(() => normalizeInventory(bank?.inventory), [bank]);
  const services = useMemo(() => normalizeServices(bank?.services), [bank]);
  const totalUnits = useMemo(() => inventory.reduce((sum, item) => sum + item.units, 0), [inventory]);
  const currentBloodBankId = String(currentBloodBank?.id || currentBloodBank?._id || '');

  const showRequestMessage = (type, text) => {
    setRequestMessage({ type, text });
    window.clearTimeout(messageTimeoutRef.current);
    messageTimeoutRef.current = window.setTimeout(() => {
      setRequestMessage({ type: '', text: '' });
    }, 4000);
  };

  useEffect(() => () => window.clearTimeout(messageTimeoutRef.current), []);

  const openRequestModal = (item) => {
    setSelectedInventoryItem(item);
    setRequestForm({
      units: 1,
      urgency: 'normal',
      description: `Requesting ${item.bloodGroup} units from ${bank?.name}`
    });
  };

  const closeRequestModal = () => {
    setSelectedInventoryItem(null);
    setSubmittingRequest(false);
  };

  const openBulkRequestModal = () => {
    const initialItems = inventory.reduce((accumulator, item) => {
      if (item.units > 0) {
        accumulator[item.bloodGroup] = '';
      }
      return accumulator;
    }, {});

    setBulkRequestForm({
      urgency: 'normal',
      description: `Requesting multiple blood groups from ${bank?.name}`,
      items: initialItems
    });
    setShowBulkRequestModal(true);
  };

  const closeBulkRequestModal = () => {
    setShowBulkRequestModal(false);
    setSubmittingRequest(false);
  };

  const handleRequestSubmit = async () => {
    if (!selectedInventoryItem) return;

    const requestedUnits = Number(requestForm.units);
    if (!requestedUnits || requestedUnits < 1) {
      showRequestMessage('error', 'Enter a valid number of units');
      return;
    }

    if (requestedUnits > selectedInventoryItem.units) {
      showRequestMessage('error', 'Requested units cannot be more than available units');
      return;
    }

    try {
      setSubmittingRequest(true);
      await createInterBankRequest({
        targetBloodBankId: bank?._id || bank?.id,
        bloodGroup: selectedInventoryItem.bloodGroup,
        isInterBank: true,
        units: requestedUnits,
        urgency: requestForm.urgency,
        description: requestForm.description
      }).unwrap();
      closeRequestModal();
      showRequestMessage('success', 'Blood request sent successfully to this blood bank');
      success('Blood request sent successfully');
    } catch (err) {
      console.error('Error creating blood bank request:', err);
      const errorMessage = err.data?.message || 'Failed to send request';
      showRequestMessage('error', errorMessage);
      error(errorMessage);
      setSubmittingRequest(false);
    }
  };

  const handleBulkRequestSubmit = async () => {
    const selectedItems = Object.entries(bulkRequestForm.items)
      .map(([bloodGroup, units]) => ({ bloodGroup, units: Number(units) }))
      .filter((item) => item.units > 0);

    if (selectedItems.length === 0) {
      showRequestMessage('error', 'Select at least one blood group with units');
      return;
    }

    const invalidItem = selectedItems.find((item) => {
      const available = inventory.find((inventoryItem) => inventoryItem.bloodGroup === item.bloodGroup)?.units || 0;
      return item.units > available;
    });

    if (invalidItem) {
      showRequestMessage('error', `${invalidItem.bloodGroup} units exceed available stock`);
      return;
    }

    try {
      setSubmittingRequest(true);
      await Promise.all(
        selectedItems.map((item) => createInterBankRequest({
          targetBloodBankId: bank?._id || bank?.id,
          bloodGroup: item.bloodGroup,
          isInterBank: true,
          units: item.units,
          urgency: bulkRequestForm.urgency,
          description: bulkRequestForm.description || `Requesting ${item.bloodGroup} units from ${bank?.name}`
        }).unwrap())
      );
      closeBulkRequestModal();
      showRequestMessage('success', 'Multi-group blood request sent successfully');
      success('Multi-group blood request sent successfully');
    } catch (err) {
      console.error('Error creating multi blood bank request:', err);
      const errorMessage = err.data?.message || 'Failed to send multi-group request';
      showRequestMessage('error', errorMessage);
      error(errorMessage);
      setSubmittingRequest(false);
    }
  };

  if (loading) {
    return (
      <div className="bank-details-page loading-page">
        <div className="details-spinner"></div>
        <p>Loading blood bank details...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="bank-details-page">
        <div className="details-shell">
          <div className="details-error-card">
            <h2>Could not load details</h2>
            <p>{errorMessage}</p>
            <button className="details-back-btn" onClick={() => navigate(ROUTE_PATH.BLOOD_BANK_DASHBOARD)}>
              Go Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bank-details-page">
      <div className="details-shell">
        <div className="details-topbar">
          <button className="details-back-btn" onClick={() => navigate(ROUTE_PATH.BLOOD_BANK_DASHBOARD)}>
            Back to Dashboard
          </button>
          <div className="details-heading">
            <h1>{bank?.name || 'Blood Bank Details'}</h1>
            <p>Details and live inventory overview</p>
          </div>
        </div>

        <div className="details-grid">
          <section className="details-card bank-info-card">
            <div className="card-title-row">
              <h2>Blood Bank Details</h2>
              <span className="card-chip">Profile</span>
            </div>

            <div className="details-list">
              <div className="details-row">
                <span>Phone</span>
                <strong>{bank?.phone || 'N/A'}</strong>
              </div>
              <div className="details-row">
                <span>Email</span>
                <strong>{bank?.email || 'N/A'}</strong>
              </div>
              <div className="details-row">
                <span>Operating Hours</span>
                <strong>{normalizeOperatingHours(bank?.operatingHours)}</strong>
              </div>
              <div className="details-row">
                <span>Address</span>
                <strong>{normalizeAddress(bank?.address)}</strong>
              </div>
              <div className="details-row">
                <span>License Number</span>
                <strong>{bank?.licenseNumber || 'N/A'}</strong>
              </div>
            </div>

            <div className="services-block">
              <h3>Services Provided</h3>
              {services.length > 0 ? (
                <div className="services-list">
                  {services.map((service) => (
                    <span key={service} className="service-pill">
                      {service}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="services-empty">No services provided by this blood bank yet.</p>
              )}
            </div>
          </section>

          <section className="details-card inventory-card">
            <div className="card-title-row">
              <h2>Blood Inventory</h2>
              <span className="card-chip">{totalUnits} total units</span>
            </div>

            {inventory.some((item) => item.units > 0) && String(bank?._id || bank?.id || '') !== currentBloodBankId && (
              <div className="inventory-main-action">
                <button className="request-blood-main-btn" onClick={openBulkRequestModal}>
                  Request Multiple Blood Groups
                </button>
              </div>
            )}

            {requestMessage.text && (
              <div className={`request-inline-message ${requestMessage.type}`}>
                {requestMessage.text}
              </div>
            )}

            <div className="inventory-groups-grid">
              {inventory.map((item) => (
                <div key={item.bloodGroup} className={`inventory-group-card ${item.status}`}>
                  <p className="group-label">{item.bloodGroup}</p>
                  <p className="group-units">{item.units}</p>
                  <p className="group-meta">Units • {item.status}</p>
                  {item.units > 0 && String(bank?._id || bank?.id || '') !== currentBloodBankId && (
                    <button className="request-blood-btn" onClick={() => openRequestModal(item)}>
                      Request Blood
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {selectedInventoryItem && (
          <div className="request-modal-overlay" onClick={closeRequestModal}>
            <div className="request-modal" onClick={(event) => event.stopPropagation()}>
              <div className="request-modal-header">
                <h2>Request Blood Units</h2>
                <button className="request-modal-close" onClick={closeRequestModal}>×</button>
              </div>

              <div className="request-modal-body">
                <p className="request-bank-name">To: {bank?.name}</p>
                <div className="request-summary-grid">
                  <div>
                    <span>Blood Group</span>
                    <strong>{selectedInventoryItem.bloodGroup}</strong>
                  </div>
                  <div>
                    <span>Available</span>
                    <strong>{selectedInventoryItem.units} units</strong>
                  </div>
                </div>

                <label className="request-field">
                  <span>Units Needed</span>
                  <input
                    type="number"
                    min="1"
                    max={selectedInventoryItem.units}
                    value={requestForm.units}
                    onChange={(event) => setRequestForm((prev) => ({ ...prev, units: event.target.value }))}
                  />
                </label>

                <label className="request-field">
                  <span>Urgency</span>
                  <select
                    value={requestForm.urgency}
                    onChange={(event) => setRequestForm((prev) => ({ ...prev, urgency: event.target.value }))}
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>

                <label className="request-field">
                  <span>Request Note</span>
                  <textarea
                    rows="4"
                    value={requestForm.description}
                    onChange={(event) => setRequestForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Add request details for the receiving blood bank"
                  />
                </label>
              </div>

              <div className="request-modal-actions">
                <button className="request-cancel-btn" onClick={closeRequestModal}>
                  Cancel
                </button>
                <button className="request-submit-btn" onClick={handleRequestSubmit} disabled={submittingRequest}>
                  {submittingRequest ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showBulkRequestModal && (
          <div className="request-modal-overlay" onClick={closeBulkRequestModal}>
            <div className="request-modal" onClick={(event) => event.stopPropagation()}>
              <div className="request-modal-header">
                <h2>Request Multiple Blood Groups</h2>
                <button className="request-modal-close" onClick={closeBulkRequestModal}>×</button>
              </div>

              <div className="request-modal-body">
                <p className="request-bank-name">To: {bank?.name}</p>

                <div className="bulk-request-grid">
                  {inventory.filter((item) => item.units > 0).map((item) => (
                    <label key={item.bloodGroup} className="bulk-request-item">
                      <div>
                        <strong>{item.bloodGroup}</strong>
                        <span>{item.units} units available</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={item.units}
                        value={bulkRequestForm.items[item.bloodGroup] ?? ''}
                        onChange={(event) => setBulkRequestForm((prev) => ({
                          ...prev,
                          items: {
                            ...prev.items,
                            [item.bloodGroup]: event.target.value
                          }
                        }))}
                        placeholder="0"
                      />
                    </label>
                  ))}
                </div>

                <label className="request-field">
                  <span>Urgency</span>
                  <select
                    value={bulkRequestForm.urgency}
                    onChange={(event) => setBulkRequestForm((prev) => ({ ...prev, urgency: event.target.value }))}
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>

                <label className="request-field">
                  <span>Request Note</span>
                  <textarea
                    rows="4"
                    value={bulkRequestForm.description}
                    onChange={(event) => setBulkRequestForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Add request details for these blood groups"
                  />
                </label>
              </div>

              <div className="request-modal-actions">
                <button className="request-cancel-btn" onClick={closeBulkRequestModal}>
                  Cancel
                </button>
                <button className="request-submit-btn" onClick={handleBulkRequestSubmit} disabled={submittingRequest}>
                  {submittingRequest ? 'Sending...' : 'Send All Requests'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BloodBankDirectoryDetails;

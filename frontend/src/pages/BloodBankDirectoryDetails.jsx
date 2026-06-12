import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useGetBloodBankByIdQuery } from "../store/bloodBankApi";
import { useCreateInterBankRequestMutation } from "../store/requestApi";
import { ROUTE_PATH } from "../enum/routePath";
import { useToast } from "../components/ToastContainer";
import { BLOOD_GROUPS } from "../enum/constants";
import { useAuth } from "../context/AuthContext";
import { 
  FiMapPin, 
  FiPhone, 
  FiMail, 
  FiCheckCircle, 
  FiShield, 
  FiPackage, 
  FiArrowLeft, 
  FiActivity,
  FiShoppingBag,
  FiPlus
} from "react-icons/fi";
import "../pages.css/BloodBankDirectoryDetails.css";

const getInventoryStatus = (units) => {
  if (units <= 0) return "critical";
  if (units <= 10) return "low";
  if (units <= 25) return "moderate";
  return "good";
};

const normalizeAddress = (address) => {
  if (!address) return "Address not available";
  if (typeof address === "string") return address;

  const parts = [
    address.street,
    address.city,
    address.state,
    address.zipCode || address.pincode,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "Address not available";
};

const normalizeOperatingHours = (operatingHours) => {
  if (!operatingHours) return "Hours not available";
  if (typeof operatingHours === "string") return operatingHours;

  const open = operatingHours.open || "N/A";
  const close = operatingHours.close || "N/A";
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
      status: getInventoryStatus(units),
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
  const {
    bloodBank: currentBloodBank,
    isBloodBankAuthenticated,
    loading: authLoading,
  } = useAuth();

  const [bank, setBank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [requestMessage, setRequestMessage] = useState({ type: "", text: "" });
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [showBulkRequestModal, setShowBulkRequestModal] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const messageTimeoutRef = useRef(null);
  const [requestForm, setRequestForm] = useState({
    units: 1,
    urgency: "normal",
    description: "",
  });
  const [bulkRequestForm, setBulkRequestForm] = useState({
    urgency: "normal",
    description: "",
    items: {},
  });

  const {
    data: bankData,
    isLoading: queryLoading,
    error: queryError,
  } = useGetBloodBankByIdQuery(bankId);
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
      setErrorMessage(
        queryError.data?.message ||
          "Unable to load blood bank details. Please try again.",
      );
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
  const totalUnits = useMemo(
    () => inventory.reduce((sum, item) => sum + item.units, 0),
    [inventory],
  );
  const currentBloodBankId = String(
    currentBloodBank?.id || currentBloodBank?._id || "",
  );

  const showRequestMessage = (type, text) => {
    setRequestMessage({ type, text });
    window.clearTimeout(messageTimeoutRef.current);
    messageTimeoutRef.current = window.setTimeout(() => {
      setRequestMessage({ type: "", text: "" });
    }, 4000);
  };

  useEffect(() => () => window.clearTimeout(messageTimeoutRef.current), []);

  const openRequestModal = (item) => {
    setSelectedInventoryItem(item);
    setRequestForm({
      units: 1,
      urgency: "normal",
      description: `Requesting ${item.bloodGroup} units from ${bank?.name}`,
    });
  };

  const closeRequestModal = () => {
    setSelectedInventoryItem(null);
    setSubmittingRequest(false);
  };

  const openBulkRequestModal = () => {
    const initialItems = inventory.reduce((accumulator, item) => {
      if (item.units > 0) {
        accumulator[item.bloodGroup] = "";
      }
      return accumulator;
    }, {});

    setBulkRequestForm({
      urgency: "normal",
      description: `Requesting multiple blood groups from ${bank?.name}`,
      items: initialItems,
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
      showRequestMessage("error", "Enter a valid number of units");
      return;
    }

    if (requestedUnits > selectedInventoryItem.units) {
      showRequestMessage(
        "error",
        "Requested units cannot be more than available units",
      );
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
        description: requestForm.description,
      }).unwrap();
      closeRequestModal();
      showRequestMessage(
        "success",
        "Blood request sent successfully to this blood bank",
      );
      success("Blood request sent successfully");
    } catch (err) {
      const errorMessage = err.data?.message || "Failed to send request";
      showRequestMessage("error", errorMessage);
      error(errorMessage);
      setSubmittingRequest(false);
    }
  };

  const handleBulkRequestSubmit = async () => {
    const selectedItems = Object.entries(bulkRequestForm.items)
      .map(([bloodGroup, units]) => ({ bloodGroup, units: Number(units) }))
      .filter((item) => item.units > 0);

    if (selectedItems.length === 0) {
      showRequestMessage("error", "Select at least one blood group with units");
      return;
    }

    const invalidItem = selectedItems.find((item) => {
      const available =
        inventory.find(
          (inventoryItem) => inventoryItem.bloodGroup === item.bloodGroup,
        )?.units || 0;
      return item.units > available;
    });

    if (invalidItem) {
      showRequestMessage(
        "error",
        `${invalidItem.bloodGroup} units exceed available stock`,
      );
      return;
    }

    try {
      setSubmittingRequest(true);
      await Promise.all(
        selectedItems.map((item) =>
          createInterBankRequest({
            targetBloodBankId: bank?._id || bank?.id,
            bloodGroup: item.bloodGroup,
            isInterBank: true,
            units: item.units,
            urgency: bulkRequestForm.urgency,
            description:
              bulkRequestForm.description ||
              `Requesting ${item.bloodGroup} units from ${bank?.name}`,
          }).unwrap(),
        ),
      );
      closeBulkRequestModal();
      showRequestMessage(
        "success",
        "Multi-group blood request sent successfully",
      );
      success("Multi-group blood request sent successfully");
    } catch (err) {
      const errorMessage =
        err.data?.message || "Failed to send multi-group request";
      showRequestMessage("error", errorMessage);
      error(errorMessage);
      setSubmittingRequest(false);
    }
  };

  if (loading || queryLoading) {
    return (
      <div className="bank-details-page loading-page">
        <div className="details-spinner"></div>
        <p>Loading blood bank details...</p>
      </div>
    );
  }

  if (errorMessage || queryError) {
    return (
      <div className="bank-details-page">
        <div className="details-shell">
          <div className="details-error-card">
            <h2>Could not load details</h2>
            <p>{errorMessage || "Failed to load blood bank"}</p>
            <button
              className="details-back-btn"
              onClick={() => navigate(ROUTE_PATH.BLOOD_BANK_DASHBOARD)}
            >
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
        <header className="details-header-premium">
          <button
            className="back-circle-btn"
            onClick={() => navigate(ROUTE_PATH.BLOOD_BANK_DASHBOARD)}
          >
            <FiArrowLeft />
          </button>
          <div className="profile-hero">
            <div className="hero-avatar">
              <img
                src={
                  bank?.profileImage || bank?.logo ||
                  `https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80`
                }
                alt={bank?.name}
              />
            </div>
            <div className="hero-info">
              <div className="title-row">
                <h1>{bank?.name}</h1>
                <span className="verified-badge">
                  <FiShield className="icon" /> Government Verified
                </span>
              </div>
              <p className="subtitle">
                Licensed Blood Donation & Storage Center
              </p>
              <div className="hero-pills">
                <span className="hero-pill">
                  <FiCheckCircle /> {bank?.operatingHours?.emergency247 ? "Open 24/7" : "Active Now"}
                </span>
                <span className="hero-pill">
                  <FiPackage /> {totalUnits} Units Available
                </span>
                <span className="hero-pill">
                  <FiActivity /> Active Donor Hub
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="details-main-grid">
          <div className="left-col">
            <section className="info-card-premium">
              <h3>Contact Information</h3>
              <div className="contact-links">
                <a href={`tel:${bank?.phone}`} className="contact-item">
                  <div className="icon-wrap">
                    <FiPhone />
                  </div>
                  <div className="text-wrap">
                    <label>Phone Number</label>
                    <p>{bank?.phone || "N/A"}</p>
                  </div>
                </a>
                <a href={`mailto:${bank?.email}`} className="contact-item">
                  <div className="icon-wrap">
                    <FiMail />
                  </div>
                  <div className="text-wrap">
                    <label>Email Address</label>
                    <p>{bank?.email || "N/A"}</p>
                  </div>
                </a>
                <div className="contact-item">
                  <div className="icon-wrap">
                    <FiMapPin />
                  </div>
                  <div className="text-wrap">
                    <label>Facility Address</label>
                    <p>{normalizeAddress(bank?.address)}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="info-card-premium">
              <h3>Operating Hours</h3>
              <div className="hours-list">
                <div className="hour-row">
                  <span>Regular Hours</span>
                  <strong>{normalizeOperatingHours(bank?.operatingHours)}</strong>
                </div>
                {bank?.operatingHours?.emergency247 && (
                  <div className="hour-row">
                    <span>Emergency Response</span>
                    <strong>Available 24/7</strong>
                  </div>
                )}
              </div>
            </section>

            {services.length > 0 && (
              <section className="info-card-premium">
                <h3>Services Provided</h3>
                <div className="services-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                  {services.map((service) => (
                    <span key={service} className="service-pill" style={{ 
                      background: 'rgba(230, 57, 70, 0.1)', 
                      color: '#e63946', 
                      padding: '0.4rem 0.8rem', 
                      borderRadius: '8px', 
                      fontSize: '0.85rem',
                      fontWeight: '600'
                    }}>
                      {service}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="right-col">
            <section className="inventory-card-premium">
              <div className="inventory-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3>Live Blood Inventory</h3>
                    <p>Real-time availability of blood stocks at this center.</p>
                  </div>
                  {inventory.some((item) => item.units > 0) &&
                    String(bank?._id || bank?.id || "") !== currentBloodBankId && (
                      <button
                        className="btn-request-main"
                        style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
                        onClick={openBulkRequestModal}
                      >
                        <FiShoppingBag /> Bulk Request
                      </button>
                    )}
                </div>
              </div>

              {requestMessage.text && (
                <div className={`request-inline-message ${requestMessage.type}`} style={{ 
                  margin: '1rem', 
                  padding: '1rem', 
                  borderRadius: '12px',
                  backgroundColor: requestMessage.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: requestMessage.type === 'success' ? '#16a34a' : '#dc2626',
                  border: `1px solid ${requestMessage.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                }}>
                  {requestMessage.text}
                </div>
              )}

              <div className="inventory-grid-premium">
                {inventory.map((item) => (
                  <div
                    key={item.bloodGroup}
                    className={`stock-item-premium ${item.status}`}
                    style={{ position: 'relative', cursor: 'default' }}
                  >
                    <span className="group-name">{item.bloodGroup}</span>
                    <div className="stock-visual">
                      <span className="units">{item.units}</span>
                      <span className="label">Units</span>
                    </div>
                    <div className="status-label">{item.status}</div>
                    
                    {item.units > 0 && String(bank?._id || bank?.id || "") !== currentBloodBankId && (
                      <button 
                        className="btn-stock-request"
                        onClick={() => openRequestModal(item)}
                        style={{
                          marginTop: '1rem',
                          width: '100%',
                          background: 'linear-gradient(135deg, #e63946 0%, #d62839 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '0.6rem',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 4px 12px rgba(230, 57, 70, 0.2)'
                        }}
                      >
                        <FiPlus size={14} /> Request
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="inventory-footer">
                <p>
                  * Inventory is updated every 30 minutes. Please call the
                  center before visiting for urgent requirements.
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* MODALS */}
        {selectedInventoryItem && (
          <div className="request-modal-overlay" onClick={closeRequestModal}>
            <div
              className="request-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="request-modal-header">
                <h2>Request Blood Units</h2>
                <button
                  className="request-modal-close"
                  onClick={closeRequestModal}
                >
                  ×
                </button>
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
                    onChange={(event) =>
                      setRequestForm((prev) => ({
                        ...prev,
                        units: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="request-field">
                  <span>Urgency</span>
                  <select
                    value={requestForm.urgency}
                    onChange={(event) =>
                      setRequestForm((prev) => ({
                        ...prev,
                        urgency: event.target.value,
                      }))
                    }
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
                    onChange={(event) =>
                      setRequestForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Add request details for the receiving blood bank"
                  />
                </label>
              </div>

              <div className="request-modal-actions">
                <button
                  className="request-cancel-btn"
                  onClick={closeRequestModal}
                >
                  Cancel
                </button>
                <button
                  className="request-submit-btn"
                  onClick={handleRequestSubmit}
                  disabled={submittingRequest}
                >
                  {submittingRequest ? "Sending..." : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showBulkRequestModal && (
          <div
            className="request-modal-overlay"
            onClick={closeBulkRequestModal}
          >
            <div
              className="request-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="request-modal-header">
                <h2>Request Multiple Blood Groups</h2>
                <button
                  className="request-modal-close"
                  onClick={closeBulkRequestModal}
                >
                  ×
                </button>
              </div>

              <div className="request-modal-body">
                <p className="request-bank-name">To: {bank?.name}</p>

                <div className="bulk-request-grid">
                  {inventory
                    .filter((item) => item.units > 0)
                    .map((item) => (
                      <label
                        key={item.bloodGroup}
                        className="bulk-request-item"
                      >
                        <div>
                          <strong>{item.bloodGroup}</strong>
                          <span>{item.units} units available</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max={item.units}
                          value={bulkRequestForm.items[item.bloodGroup] ?? ""}
                          onChange={(event) =>
                            setBulkRequestForm((prev) => ({
                              ...prev,
                              items: {
                                ...prev.items,
                                [item.bloodGroup]: event.target.value,
                              },
                            }))
                          }
                          placeholder="0"
                        />
                      </label>
                    ))}
                </div>

                <label className="request-field">
                  <span>Urgency</span>
                  <select
                    value={bulkRequestForm.urgency}
                    onChange={(event) =>
                      setBulkRequestForm((prev) => ({
                        ...prev,
                        urgency: event.target.value,
                      }))
                    }
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
                    onChange={(event) =>
                      setBulkRequestForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Add request details for these blood groups"
                  />
                </label>
              </div>

              <div className="request-modal-actions">
                <button
                  className="request-cancel-btn"
                  onClick={closeBulkRequestModal}
                >
                  Cancel
                </button>
                <button
                  className="request-submit-btn"
                  onClick={handleBulkRequestSubmit}
                  disabled={submittingRequest}
                >
                  {submittingRequest ? "Sending..." : "Send All Requests"}
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

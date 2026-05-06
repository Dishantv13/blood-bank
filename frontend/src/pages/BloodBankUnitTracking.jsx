import { useState } from "react";
import {
  useGetBloodUnitInventoryQuery,
  useUpdateScreeningStatusMutation,
  useAddColdChainLogMutation,
  useRefineBloodUnitMutation,
} from "../store/bloodUnitApi";
import { useToast } from "../components/ToastContainer";
import { useAuth } from "../context/AuthContext";
import BloodBankSidebar from "../components/BloodBankSidebar";
import ThemeToggle from "../components/ThemeToggle";
import SkeletonLoader from "../components/SkeletonLoader";
import "../pages.css/BloodBankInventoryDetail.css";

const BloodBankUnitTracking = () => {
  const toast = useToast();
  const { logoutBloodBank, bloodBank } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("inventory"); // 'inventory' or 'raw'
  const [filter, setFilter] = useState({
    status: "",
    bloodGroup: "",
    componentType: "",
    page: 1,
  });

  // RTK Query hooks
  const {
    data: inventoryData,
    isLoading,
    isError,
  } = useGetBloodUnitInventoryQuery({
    ...filter,
    status: activeSubTab === "raw" ? "raw" : filter.status,
  });
  const [updateScreening] = useUpdateScreeningStatusMutation();
  const [addColdChain] = useAddColdChainLogMutation();
  const [refineUnit] = useRefineBloodUnitMutation();

  const units = inventoryData?.units || [];
  const pagination = inventoryData?.pagination || {};
  const tableColumnCount = activeSubTab === "raw" ? 6 : 8;

  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showScreeningModal, setShowScreeningModal] = useState(false);
  const [showColdChainModal, setShowColdChainModal] = useState(false);
  const [showRefineModal, setShowRefineModal] = useState(false);

  const [screeningResults, setScreeningResults] = useState({
    hiv: "pending",
    hbv: "pending",
    hcv: "pending",
    syphilis: "pending",
    malaria: "pending",
  });

  const [coldChainLog, setColdChainLog] = useState({
    temperature: "",
    location: "",
    remarks: "",
  });

  const handleRefine = async (method) => {
    try {
      await refineUnit({ unitId: selectedUnit.unitId, method }).unwrap();
      toast.success(`Unit refined via ${method.replace("_", " ")}`);
      setShowRefineModal(false);
    } catch (error) {
      toast.error(error.data?.message || "Refining failed");
    }
  };

  const handleScreeningUpdate = async () => {
    try {
      await updateScreening({
        unitId: selectedUnit.unitId,
        results: screeningResults,
      }).unwrap();
      toast.success("Screening results updated");
      setShowScreeningModal(false);
    } catch (error) {
      toast.error(error.data?.message || "Update failed");
    }
  };

  const handleColdChainLog = async () => {
    try {
      await addColdChain({
        unitId: selectedUnit.unitId,
        logData: coldChainLog,
      }).unwrap();
      toast.success("Cold chain log added");
      setShowColdChainModal(false);
      setColdChainLog({ temperature: "", location: "", remarks: "" });
    } catch (error) {
      toast.error(error.data?.message || "Failed to log");
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "available":
        return "badge-success";
      case "quarantine":
        return "badge-warning";
      case "reserved":
        return "badge-info";
      case "used":
        return "badge-secondary";
      case "expired":
      case "discarded":
        return "badge-danger";
      default:
        return "badge-neutral";
    }
  };

  const getTimeRemaining = (expiryDate) => {
    const total = Date.parse(expiryDate) - Date.parse(new Date());
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    if (days < 0) return "Expired";
    if (days === 0) return "Expiring Today";
    return `${days} days left`;
  };

  if (isLoading && units.length === 0) return <SkeletonLoader />;

  return (
    <div className="blood-bank-dashboard">
      {mobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <BloodBankSidebar
        variant="panel"
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onLogout={logoutBloodBank}
      />

      <main className="dashboard-main">
        <div
          className="blood-bank-unit-tracking-shell"
          style={{ flex: 1, overflowY: "auto" }}
        >
          <header className="dashboard-header">
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="header-left">
              <h1>Blood Unit Tracking</h1>
              <p>Welcome back, {bloodBank?.name || "Blood Bank"}</p>
            </div>
            <div className="header-right">
              <ThemeToggle />
              <div className="notification-wrapper">
                <button
                  className="notification-btn"
                  type="button"
                  aria-label="Notifications"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 01-3.46 0" />
                  </svg>
                </button>
              </div>
            </div>
          </header>

          <div className="unit-tracking-container">
            <div className="header-section">
              <h2>Individual Unit Tracking</h2>
              <p>
                Monitor individual blood bags, medical screening, and storage
                logs.
              </p>
              <div className="sub-tabs">
                <button
                  className={`sub-tab ${activeSubTab === "inventory" ? "active" : ""}`}
                  onClick={() => {
                    setActiveSubTab("inventory");
                    setFilter({ ...filter, status: "" });
                  }}
                >
                  Refined Inventory
                </button>
                <button
                  className={`sub-tab ${activeSubTab === "raw" ? "active" : ""}`}
                  onClick={() => {
                    setActiveSubTab("raw");
                    setFilter({ ...filter, status: "raw" });
                  }}
                >
                  Raw Collections
                </button>
              </div>
            </div>

            <div className="filter-bar">
              <select
                onChange={(e) =>
                  setFilter({ ...filter, bloodGroup: e.target.value })
                }
                value={filter.bloodGroup}
              >
                <option value="">All Blood Groups</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                  (bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ),
                )}
              </select>

              {activeSubTab === "inventory" && (
                <select
                  onChange={(e) =>
                    setFilter({ ...filter, status: e.target.value })
                  }
                  value={filter.status}
                >
                  <option value="">All Statuses</option>
                  <option value="quarantine">Quarantine</option>
                  <option value="available">Available</option>
                  <option value="expired">Expired</option>
                  <option value="used">Used</option>
                </select>
              )}

              <select
                onChange={(e) =>
                  setFilter({ ...filter, componentType: e.target.value })
                }
                value={filter.componentType}
              >
                <option value="">All Components</option>
                <option value="Whole Blood">Whole Blood</option>
                <option value="RBC">RBC</option>
                <option value="Platelets">Platelets</option>
                <option value="Plasma">Plasma</option>
              </select>
            </div>

            <div className="table-responsive">
              <table className="unit-table">
                <thead>
                  <tr>
                    <th>Unit ID</th>
                    <th>Group</th>
                    <th>
                      {activeSubTab === "raw" ? "Initial Volume" : "Component"}
                    </th>
                    <th>Status</th>
                    <th>
                      {activeSubTab === "raw" ? "Collection Date" : "Expiry"}
                    </th>
                    <th
                      className={
                        activeSubTab === "raw" ? "col-actions" : undefined
                      }
                    >
                      {activeSubTab === "raw" ? "Actions" : "Screening"}
                    </th>
                    {activeSubTab === "inventory" && <th>Last Temp</th>}
                    {activeSubTab === "inventory" && (
                      <th className="col-actions">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {units.length === 0 ? (
                    <tr className="unit-table-empty-row">
                      <td colSpan={tableColumnCount}>
                        <div className="unit-table-empty-content">
                          <h3>No Units Found</h3>
                          <p>
                            No blood units available for the selected filters.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    units.map((unit) => (
                      <tr key={unit._id}>
                        <td>
                          <span className="unit-id">{unit.unitId}</span>
                          <div className="batch-no">
                            Batch: {unit.batchNumber}
                          </div>
                        </td>
                        <td>
                          <span className="blood-group-tag">
                            {unit.bloodGroup}
                          </span>
                        </td>
                        <td>
                          {activeSubTab === "raw" ? (
                            `${unit.volume}ml`
                          ) : (
                            <div className="comp-vol-box">
                              <span>{unit.componentType}</span>
                              <small>{unit.volume}ml</small>
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge ${getStatusBadgeClass(unit.status)}`}
                          >
                            {unit.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {activeSubTab === "raw" ? (
                            new Date(unit.collectionDate).toLocaleDateString()
                          ) : (
                            <div
                              className={
                                getTimeRemaining(unit.expiryDate) === "Expired"
                                  ? "text-danger"
                                  : ""
                              }
                            >
                              {new Date(unit.expiryDate).toLocaleDateString()}
                              <small className="d-block">
                                {getTimeRemaining(unit.expiryDate)}
                              </small>
                            </div>
                          )}
                        </td>
                        {activeSubTab === "raw" ? (
                          <td className="col-actions-cell">
                            <button
                              className="btn-refine"
                              onClick={() => {
                                setSelectedUnit(unit);
                                setShowRefineModal(true);
                              }}
                            >
                              Refine Unit
                            </button>
                          </td>
                        ) : (
                          <>
                            <td>
                              <span
                                className={`screening-dot dot-${unit.screeningStatus}`}
                              ></span>
                              {unit.screeningStatus.toUpperCase()}
                            </td>
                            <td>
                              {unit.coldChain?.length > 0
                                ? `${unit.coldChain[unit.coldChain.length - 1].temperature}°C`
                                : "N/A"}
                            </td>
                            <td className="col-actions-cell">
                              <div className="action-buttons">
                                <button
                                  className="btn-sm btn-outline"
                                  onClick={() => {
                                    setSelectedUnit(unit);
                                    setScreeningResults(unit.screeningResults);
                                    setShowScreeningModal(true);
                                  }}
                                >
                                  Screening
                                </button>
                                <button
                                  className="btn-sm btn-outline"
                                  onClick={() => {
                                    setSelectedUnit(unit);
                                    setShowColdChainModal(true);
                                  }}
                                >
                                  Log Temp
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination component here */}

            {/* Screening Modal */}
            {showScreeningModal && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <h2>Medical Screening Results</h2>
                  <p>Unit ID: {selectedUnit.unitId}</p>
                  <div className="screening-form">
                    {["hiv", "hbv", "hcv", "syphilis", "malaria"].map(
                      (test) => (
                        <div key={test} className="test-row">
                          <label>{test.toUpperCase()}</label>
                          <select
                            value={screeningResults[test]}
                            onChange={(e) =>
                              setScreeningResults({
                                ...screeningResults,
                                [test]: e.target.value,
                              })
                            }
                          >
                            <option value="pending">Pending</option>
                            <option value="negative">Negative</option>
                            <option value="positive">Positive</option>
                          </select>
                        </div>
                      ),
                    )}
                  </div>
                  <div className="modal-actions">
                    <button
                      className="secondary"
                      onClick={() => setShowScreeningModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-primary"
                      onClick={handleScreeningUpdate}
                    >
                      Save Results
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Cold Chain Modal */}
            {showColdChainModal && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <h2>Record Storage Log</h2>
                  <div className="cold-chain-form">
                    <div className="form-group">
                      <label>Temperature (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={coldChainLog.temperature}
                        onChange={(e) =>
                          setColdChainLog({
                            ...coldChainLog,
                            temperature: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Storage Location</label>
                      <input
                        type="text"
                        placeholder="Fridge 02, Shelf A"
                        value={coldChainLog.location}
                        onChange={(e) =>
                          setColdChainLog({
                            ...coldChainLog,
                            location: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Remarks</label>
                      <textarea
                        value={coldChainLog.remarks}
                        onChange={(e) =>
                          setColdChainLog({
                            ...coldChainLog,
                            remarks: e.target.value,
                          })
                        }
                      ></textarea>
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button
                      className="secondary"
                      onClick={() => setShowColdChainModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-primary"
                      onClick={handleColdChainLog}
                    >
                      Save Log
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Refine Modal */}
            {showRefineModal && (
              <div className="modal-overlay">
                <div className="modal-content refine-modal">
                  <h2>Process Raw Blood Unit</h2>
                  <p>
                    Unit ID: {selectedUnit?.unitId} | Volume:{" "}
                    {selectedUnit?.volume}ml
                  </p>

                  <div className="refine-options">
                    <div
                      className="refine-card"
                      onClick={() => handleRefine("keep_whole")}
                    >
                      <h3>Keep as Whole Blood</h3>
                      <p>
                        Standard unit size. Best for emergency transfusions.
                      </p>
                      <div className="yield-estimate">
                        Yield: 1 Unit (450ml)
                      </div>
                    </div>

                    <div
                      className="refine-card primary"
                      onClick={() => handleRefine("separate")}
                    >
                      <h3>Separate into Components</h3>
                      <p>
                        Maximize utility. Produces RBC, Plasma, and Platelets.
                      </p>
                      <div className="yield-estimate">
                        Yield: 3 Units (~550ml combined)
                      </div>
                      <div className="theoretical-yield">
                        <h4>Component Breakdown (Estimates)</h4>
                        <ul>
                          <li>
                            <strong>RBC (55%):</strong>{" "}
                            {(selectedUnit?.volume * 0.55).toFixed(1)} ml
                          </li>
                          <li>
                            <strong>Plasma (40%):</strong>{" "}
                            {(selectedUnit?.volume * 0.4).toFixed(1)} ml
                          </li>
                          <li>
                            <strong>Platelets (5%):</strong>{" "}
                            {(selectedUnit?.volume * 0.05).toFixed(1)} ml
                          </li>
                        </ul>
                      </div>
                      <small className="wastage-note">
                        Includes preservation additive volume.
                      </small>
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button
                      className="secondary"
                      onClick={() => setShowRefineModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BloodBankUnitTracking;

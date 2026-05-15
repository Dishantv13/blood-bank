import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  useGetBloodBankDonationsQuery,
  useRecordDonationMutation,
  useUpdateDonationStatusMutation,
  useCreateDonationMutation,
} from "../store/donationApi";
import {
  useGetBloodBankCampsQuery,
  useLazyGetCampRegistrationsQuery,
  useDeleteCampRegistrationMutation,
} from "../store/bloodCampApi";
import { useToast } from "./ToastContainer";
import Pagination from "./Pagination";
import SearchFilter from "./SearchFilter";
import "../pages.css/BloodBankDashboard.css";

const BloodBankDonations = () => {
  const { success, error } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const donationSubTab = searchParams.get("d_status") || "pending";
  const donationSearch = searchParams.get("d_search") || "";
  const donationPage = parseInt(searchParams.get("d_page")) || 1;
  const donationLimit = parseInt(searchParams.get("d_limit")) || 6;

  const updateDonationParams = (updates) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) newParams.set(`d_${key}`, value);
      else newParams.delete(`d_${key}`);
    });
    setSearchParams(newParams, { replace: true });
  };

  const [recordData, setRecordData] = useState({ id: null, volume: 450 }); // volume in mL
  const [selectedCampId, setSelectedCampId] = useState(null);
  const [selectedCampData, setSelectedCampData] = useState(null);

  const {
    data: donationsRes,
    isLoading: loadingDonations,
    refetch,
  } = useGetBloodBankDonationsQuery({
    status: (donationSubTab === "pending" || donationSubTab === "completed") ? donationSubTab : undefined,
    search: donationSearch,
    page: donationPage,
    limit: donationLimit,
    type: (donationSubTab === "pending" || donationSubTab === "completed") ? "request" : undefined,
  });

  const { data: campsData, isLoading: loadingCamps } =
    useGetBloodBankCampsQuery({
      tab: (donationSubTab === "registrations" || donationSubTab === "collections") ? donationSubTab : undefined,
      page: donationPage,
      limit: donationLimit,
      search: donationSearch,
    });

  const [
    triggerGetRegistrations,
    { data: registrationsData, isFetching: isFetchingRegistrations },
  ] = useLazyGetCampRegistrationsQuery();
  const [deleteRegistration] = useDeleteCampRegistrationMutation();

  const [recordDonation] = useRecordDonationMutation();
  const [updateStatus] = useUpdateDonationStatusMutation();
  const [createDonation] = useCreateDonationMutation();

  const donations = donationsRes?.data || [];
  const pendingDonations = donations;
  const completedDonations = donations;
  
  const camps = useMemo(() => {
    const rawCamps = campsData?.camps || (Array.isArray(campsData) ? campsData : []);
    const today = new Date().setHours(0, 0, 0, 0);

    return [...rawCamps].sort((a, b) => {
      const aDate = new Date(a.date).setHours(0, 0, 0, 0);
      const bDate = new Date(b.date).setHours(0, 0, 0, 0);

      const aIsCompleted = aDate < today;
      const bIsCompleted = bDate < today;

      // Completed items go to the end (1), Scheduled items stay at front (-1)
      if (aIsCompleted && !bIsCompleted) return 1;
      if (!aIsCompleted && bIsCompleted) return -1;

      // Within groups, sort by date (closest to today first)
      if (!aIsCompleted && !bIsCompleted) {
        return aDate - bDate; // Soonest upcoming first
      }
      return bDate - aDate; // Most recent completed first
    });
  }, [campsData]);

  useEffect(() => {
    if (
      selectedCampId &&
      (donationSubTab === "registrations" || donationSubTab === "collections")
    ) {
      const camp = camps.find((c) => String(c._id) === String(selectedCampId));
      if (camp) {
        setSelectedCampData(camp);
        triggerGetRegistrations(selectedCampId);
      }
    }
  }, [selectedCampId, donationSubTab, camps, triggerGetRegistrations]);

  const handleRecordSubmit = async (customId, customVolume) => {
    const id = customId || recordData.id;
    const volume = customVolume || recordData.volume;

    if (!id) {
      error("Record ID missing.");
      return;
    }

    try {
      await recordDonation({
        donationId: id,
        volumeDonated: Number(volume) / 1000, // Convert mL to L
      }).unwrap();

      success("Donation recorded successfully.");
      setRecordData({ id: null, volume: 450 });
      refetch();
    } catch (err) {
      error(err.data?.message || "Failed to record donation");
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await updateStatus({ donationId: id, status }).unwrap();
      success(`Donation request ${status}`);
      refetch();
    } catch (err) {
      error(err.data?.message || "Failed to update status");
    }
  };

  const handleInitializeDonation = async (reg) => {
    try {
      await createDonation({
        donorId: reg.donor?._id || reg.donor || reg.id,
        campId: selectedCampId,
        bloodGroup: reg.bloodGroup || reg.donor?.bloodGroup || "O+",
      }).unwrap();
      success("Donation record initialized for donor.");
      refetch();
    } catch (err) {
      error(err.data?.message || "Failed to initialize donation record");
    }
  };

  const handleDeleteRegistration = async (donorId) => {
    if (
      !window.confirm(
        "Are you sure you want to remove this donor registration?",
      )
    )
      return;
    try {
      await deleteRegistration({ campId: selectedCampId, donorId }).unwrap();
      success("Donor registration removed successfully");
      triggerGetRegistrations(selectedCampId);
    } catch (err) {
      error(err.data?.message || "Failed to remove registration");
    }
  };

  const findDonationForDonorAtCamp = (donorId) => {
    if (!donorId) return null;
    return donations.find(
      (d) =>
        String(d.donor?._id || d.donor) === String(donorId) &&
        String(d.camp?._id || d.camp) === String(selectedCampId) &&
        (d.status === "pending" || d.status === "approved"),
    );
  };

  const findCompletedDonationForDonorAtCamp = (donorId) => {
    if (!donorId) return null;
    return donations.find(
      (d) =>
        String(d.donor?._id || d.donor) === String(donorId) &&
        String(d.camp?._id || d.camp) === String(selectedCampId) &&
        d.status === "completed",
    );
  };

  if (loadingDonations || loadingCamps)
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Loading records...</p>
      </div>
    );

  const renderDonationList = (list) => {
    if (list.length === 0)
      return (
        <div className="empty-state">
          <h3>No Records Found</h3>
          <p>No {donationSubTab} logs in this category.</p>
        </div>
      );

    return (
      <div
        className={`requests-list ${donationSubTab === "completed" ? "completed-grid" : "pending-grid"}`}
      >
        {list.map((d) => (
          <div
            key={d._id}
            className={`request-card ${d.status === "completed" ? "approved" : ""}`}
          >
            <div className="request-header">
              <span className="blood-type-badge">{d.bloodGroup}</span>
              <span className={`request-status-badge ${d.status}`}>
                {d.status}
              </span>
            </div>
            <div className="request-details" style={{ marginBottom: "1rem" }}>
              <p>
                <strong>Donor:</strong> {d.donor?.name || "Unknown"}
              </p>
              <p>
                <strong>Phone:</strong> {d.donor?.phone || "N/A"}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {new Date(d.donationDate).toLocaleDateString()}
              </p>
              <p>
                <strong>Type:</strong>{" "}
                {d.type === "camp"
                  ? `Camp (${d.camp?.name || "Camp"})`
                  : "Direct Request"}
              </p>
              {d.volumeDonated > 0 && (
                <p>
                  <strong>Volume:</strong> {(d.volumeDonated * 1000).toFixed(0)}{" "}
                  mL
                </p>
              )}
            </div>
            {d.status !== "completed" && (
              <div className="request-actions">
                {recordData.id === d._id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRecordSubmit();
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="number"
                      value={recordData.volume}
                      onChange={(e) =>
                        setRecordData({ ...recordData, volume: e.target.value })
                      }
                      placeholder="Volume (mL)"
                      style={{
                        padding: "8px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                      }}
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="action-btn approve" type="submit">
                        Save
                      </button>
                      <button
                        className="action-btn"
                        type="button"
                        onClick={() => setRecordData({ id: null, volume: 450 })}
                      >
                        Back
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                    <button
                      className="action-btn approve"
                      onClick={() => setRecordData({ id: d._id, volume: 450 })}
                    >
                      Record Volume
                    </button>
                    {d.status === "pending" && (
                      <button
                        className="action-btn"
                        onClick={() => handleStatusUpdate(d._id, "approved")}
                        style={{ background: "#4285f4", color: "white" }}
                      >
                        Approve
                      </button>
                    )}
                    <button
                      className="action-btn reject"
                      onClick={() => handleStatusUpdate(d._id, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderCampList = () => {
    if (camps.length === 0) {
      let message = "No Camps Found";
      let subMessage = "Create a camp in the Blood Camps tab to get started.";
      
      if (donationSubTab === "registrations") {
        message = "No Camps Today";
        subMessage = "There are no camps scheduled for today.";
      } else if (donationSubTab === "collections") {
        message = "No Past/Current Camps";
        subMessage = "No camps have been completed or started yet.";
      }

      return (
        <div className="empty-state">
          <h3>{message}</h3>
          <p>{subMessage}</p>
        </div>
      );
    }
    return (
      <div className="requests-list completed-grid">
        {camps.map((camp) => (
          <div
            key={camp._id}
            className="request-card"
            onClick={() => setSelectedCampId(camp._id)}
            style={{ cursor: "pointer" }}
          >
            <div className="request-header">
              <span
                className="blood-type-badge"
                style={{ background: "#4285f4" }}
              >
                CAMP
              </span>
              <div style={{ display: "flex", gap: "5px" }}>
                {new Date(camp.date).toDateString() === new Date().toDateString() && (
                  <span className="request-status-badge approved" style={{ background: "#16a34a", color: "white" }}>
                    TODAY
                  </span>
                )}
                <span className={`request-status-badge ${new Date(camp.date).setHours(0,0,0,0) < new Date().setHours(0,0,0,0) ? "completed" : "approved"}`}>
                  {new Date(camp.date).setHours(0,0,0,0) < new Date().setHours(0,0,0,0) ? "COMPLETED" : (camp.status || "SCHEDULED")}
                </span>
              </div>
            </div>
            <div className="request-details">
              <p>
                <strong>Name:</strong> {camp.name}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {new Date(camp.date).toLocaleDateString()}
              </p>
              <p>
                <strong>Venue:</strong> {camp.venue}
              </p>
              <p>
                <strong>Registrations:</strong>{" "}
                {camp.registeredDonors?.length || 0}
              </p>
            </div>
            <div className="request-actions" style={{ marginTop: "1rem" }}>
              <button className="action-btn approve">
                Manage Registrations And Collection
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderRegistrations = () => {
    const regs = registrationsData?.registrations || registrationsData || [];
    return (
      <div className="registrations-table-view">
        <button
          className="btn-back"
          onClick={() => setSelectedCampId(null)}
          style={{
            marginBottom: "20px",
            padding: "8px 16px",
            background: "var(--input-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            cursor: "pointer",
            color: "var(--text-main)",
          }}
        >
          ← Back to Camps
        </button>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ color: "var(--text-main)" }}>
            Registration List: {selectedCampData?.name}
          </h3>
          <span
            className="badge"
            style={{
              background: "#e63946",
              color: "white",
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "0.85rem",
            }}
          >
            {regs.length} Registered Donors
          </span>
        </div>

        {isFetchingRegistrations ? (
          <p>Loading...</p>
        ) : regs.length === 0 ? (
          <p>No registrations yet.</p>
        ) : (
          <div
            className="list-container"
            style={{
              background: "var(--card-bg)",
              borderRadius: "12px",
              boxShadow: "var(--shadow-sm)",
              overflow: "hidden",
              border: "1px solid var(--border-color)",
            }}
          >
            <div
              className="list-header"
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 0.8fr 0.4fr 0.8fr 3.5fr",
                gap: "8px",
                padding: "15px 20px",
                background: "var(--input-bg)",
                borderBottom: "2px solid var(--border-color)",
                fontWeight: "bold",
                fontSize: "0.9rem",
                color: "var(--text-muted)",
              }}
            >
              <div>Donor Name</div>
              <div>Phone</div>
              <div>Group</div>
              <div>Reg. Date</div>
              <div style={{ textAlign: "right" }}>Actions / Collection</div>
            </div>
            {regs.map((reg) => {
              const donorId = reg.donor?._id || reg.donor || reg.id;
              const donation = findDonationForDonorAtCamp(donorId);
              const completedDonation =
                findCompletedDonationForDonorAtCamp(donorId);

              return (
                <div
                  key={reg._id || donorId}
                  className="list-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 0.8fr 0.4fr 0.8fr 3.5fr",
                    gap: "8px",
                    padding: "15px 20px",
                    borderBottom: "1px solid var(--border-color)",
                    alignItems: "center",
                    fontSize: "0.95rem",
                  }}
                >
                  <div style={{ fontWeight: "600", color: "var(--text-main)" }}>
                    {reg.name || reg.donor?.name || "Unknown"}
                  </div>
                  <div style={{ color: "var(--text-muted)" }}>
                    {reg.phone || reg.donor?.phone || "N/A"}
                  </div>
                  <div style={{ color: "#e63946", fontWeight: "bold" }}>
                    {reg.bloodGroup || reg.donor?.bloodGroup || "??"}
                  </div>
                  <div
                    style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}
                  >
                    {new Date(
                      reg.registeredAt || reg.registrationDate || Date.now(),
                    ).toLocaleDateString()}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {donation ? (
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          justifyContent: "flex-end",
                          alignItems: "center",
                        }}
                      >
                        {/* Visible Collection Box */}
                        <div
                          style={{
                            display: "flex",
                            gap: "0",
                            background: "var(--input-bg)",
                            padding: "2px 5px",
                            borderRadius: "6px",
                            border: "1px solid var(--border-color)",
                            width: "160px",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <input
                            type="number"
                            id={`vol-${donation._id}`}
                            defaultValue="450"
                            onChange={(e) =>
                              setRecordData({
                                id: donation._id,
                                volume: e.target.value,
                              })
                            }
                            placeholder="mL"
                            style={{
                              width: "100px",
                              border: "none",
                              background: "transparent",
                              fontSize: "0.9rem",
                              fontWeight: "bold",
                              outline: "none",
                              textAlign: "center",
                              color: "var(--text-main)",
                            }}
                          />
                          <button
                            className="action-btn approve"
                            onClick={() => {
                              const inputVal = document.getElementById(
                                `vol-${donation._id}`,
                              ).value;
                              handleRecordSubmit(donation._id, inputVal);
                            }}
                            style={{
                              padding: "4px 8px",
                              fontSize: "0.75rem",
                              minHeight: "auto",
                              flex: "none",
                              width: "auto",
                              borderRadius: "4px",
                            }}
                          >
                            Collect
                          </button>
                        </div>

                        {donation.status === "pending" && (
                          <button
                            className="action-btn"
                            onClick={() =>
                              handleStatusUpdate(donation._id, "approved")
                            }
                            style={{
                              padding: "6px 15px",
                              background: "#4285f4",
                              color: "white",
                              fontSize: "0.8rem",
                              width: "85px",
                              flex: "none",
                              borderRadius: "6px",
                              border: "none",
                              cursor: "pointer",
                              fontWeight: "bold",
                            }}
                          >
                            Approve
                          </button>
                        )}

                        {/* Only show Remove button if the status is still PENDING */}
                        {donation.status === "pending" && (
                          <button
                            className="action-btn reject"
                            onClick={() =>
                              handleDeleteRegistration(
                                reg.id || reg._id || donorId,
                              )
                            }
                            style={{
                              padding: "6px 15px",
                              background: "#fee2e2",
                              color: "#dc2626",
                              fontSize: "0.8rem",
                              width: "85px",
                              flex: "none",
                              borderRadius: "6px",
                              border: "none",
                              cursor: "pointer",
                              fontWeight: "bold",
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ) : completedDonation ? (
                      <div
                        style={{
                          color: "#16a34a",
                          fontWeight: "bold",
                          fontSize: "0.95rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          justifyContent: "flex-end",
                        }}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        Collected (
                        {(completedDonation.volumeDonated * 1000).toFixed(0)}{" "}
                        mL)
                      </div>
                    ) : (
                      <button
                        className="action-btn approve"
                        onClick={() => handleInitializeDonation(reg)}
                        style={{
                          padding: "6px 20px",
                          fontSize: "0.85rem",
                          width: "160px",
                          flex: "none",
                          borderRadius: "6px",
                          fontWeight: "bold",
                        }}
                      >
                        Initialize / Approve
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderCollectionsTable = () => {
    // Show completed donations for this camp
    const campCollections = donations.filter(
      (d) =>
        String(d.camp?._id || d.camp) === String(selectedCampId) &&
        d.type === "camp" && d.status === "completed",
    );
    return (
      <div className="collections-table-view">
        <button
          className="btn-back"
          onClick={() => setSelectedCampId(null)}
          style={{
            marginBottom: "20px",
            padding: "8px 16px",
            background: "var(--input-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            cursor: "pointer",
            color: "var(--text-main)",
          }}
        >
          ← Back to Camps
        </button>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ color: "var(--text-main)" }}>
            Blood Collections List: {selectedCampData?.name}
          </h3>
          <span
            className="badge"
            style={{
              background: "#16a34a",
              color: "white",
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "0.85rem",
            }}
          >
            {campCollections.length} Successful Donations
          </span>
        </div>
        <div
          className="list-container"
          style={{
            background: "var(--card-bg)",
            borderRadius: "12px",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
            border: "1px solid var(--border-color)",
          }}
        >
          <div
            className="list-header"
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr",
              gap: "15px",
              padding: "15px 20px",
              background: "var(--input-bg)",
              borderBottom: "2px solid var(--border-color)",
              fontWeight: "bold",
              fontSize: "0.9rem",
              color: "var(--text-muted)",
            }}
          >
            <div>Donor Name</div>
            <div>Phone</div>
            <div>Blood Group</div>
            <div>Volume Collected</div>
            <div>Collection Date</div>
          </div>
          {campCollections.length === 0 ? (
            <p
              style={{
                padding: "40px",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              No collections recorded yet for this camp.
            </p>
          ) : (
            campCollections.map((d) => (
              <div
                key={d._id}
                className="list-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr",
                  gap: "15px",
                  padding: "15px 20px",
                  borderBottom: "1px solid var(--border-color)",
                  alignItems: "center",
                  fontSize: "0.95rem",
                  color: "var(--text-main)",
                }}
              >
                <div style={{ fontWeight: "600" }}>
                  {d.donor?.name || "Unknown"}
                </div>
                <div style={{ color: "var(--text-muted)" }}>
                  {d.donor?.phone || "N/A"}
                </div>
                <div style={{ color: "#e63946", fontWeight: "bold" }}>
                  {d.bloodGroup}
                </div>
                <div style={{ fontWeight: "bold", color: "#16a34a" }}>
                  {(d.volumeDonated * 1000).toFixed(0)} mL
                </div>
                <div style={{ color: "var(--text-muted)" }}>
                  {new Date(d.donationDate).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="donations-container">
      <div className="header-content" style={{ marginBottom: "24px" }}>
        <h2>Donations Management</h2>
        <p>Review and record blood donations from users and camps</p>
      </div>

      <div
        className="requests-filter-row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <div className="requests-sub-nav requests-sub-nav--status" style={{ marginBottom: 0 }}>
          {["pending", "completed", "registrations", "collections"].map((tab) => (
            <button
              key={tab}
              className={`sub-nav-btn ${donationSubTab === tab ? "active" : ""}`}
              onClick={() => {
                updateDonationParams({
                  status: tab,
                  page: 1,
                  search: "",
                  limit: 6,
                });
                if (tab === "pending" || tab === "completed")
                  setSelectedCampId(null);
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {!selectedCampId && (
          <div
            className="search-filter-container"
            style={{ flex: "0 1 400px", minWidth: "280px" }}
          >
            <SearchFilter
              onSearch={(val) => {
                updateDonationParams({ search: val, page: 1 });
              }}
              initialValue={donationSearch}
              placeholder="Search by donor name, group, cert..."
            />
          </div>
        )}
      </div>

      {/* Stats row for completed tabs */}
      {donationSubTab === "completed" && !selectedCampId && donations.length > 0 && (
        <div className="donation-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
           <div className="stat-card" style={{ borderLeft: '4px solid #16a34a' }}>
              <h3>{donationsRes?.pagination?.total || 0}</h3>
              <p>Completed Direct Donations</p>
           </div>
           <div className="stat-card" style={{ borderLeft: '4px solid #e63946' }}>
              <h3>{donations.reduce((acc, d) => acc + (d.volumeDonated || 0), 0).toFixed(2)} L</h3>
              <p>Direct Volume Collected</p>
           </div>
        </div>
      )}

      {donationSubTab === "pending" && renderDonationList(pendingDonations)}
      {donationSubTab === "completed" && renderDonationList(completedDonations)}
      {(donationSubTab === "registrations" || donationSubTab === "collections") &&
        (!selectedCampId ? renderCampList() : 
          donationSubTab === "registrations" ? renderRegistrations() : renderCollectionsTable())}

      {/* Pagination */}
      {!loadingDonations && !loadingCamps && !selectedCampId && (
        <Pagination
          currentPage={donationPage}
          totalPages={
            (donationSubTab === "pending" || donationSubTab === "completed")
              ? donationsRes?.pagination?.totalPages
              : campsData?.pagination?.totalPages
          }
          totalRecords={
            (donationSubTab === "pending" || donationSubTab === "completed")
              ? donationsRes?.pagination?.total
              : campsData?.pagination?.total
          }
          pageSize={donationLimit}
          onPageChange={(page) => updateDonationParams({ page })}
          onPageSizeChange={(limit) => {
            updateDonationParams({ limit, page: 1 });
          }}
        />
      )}
    </div>
  );
};

export default BloodBankDonations;

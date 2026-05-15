import { useState } from "react";
import { toast } from "react-toastify";
import "../adminPage.css/AdminExports.css";
import {
  useLazyExportUsersXlsxQuery,
  useLazyExportRequestsXlsxQuery,
  useLazyExportBloodBanksXlsxQuery,
  useLazyExportCampsXlsxQuery,
  useLazyExportEventsXlsxQuery,
  useLazyExportAllDataXlsxQuery,
} from "../store/adminApi.js";

const AdminExports = () => {
  const [module, setModule] = useState("users");
  const [isExporting, setIsExporting] = useState(false);

  // Lazy triggers for each module
  const [triggerUsers] = useLazyExportUsersXlsxQuery();
  const [triggerRequests] = useLazyExportRequestsXlsxQuery();
  const [triggerBloodBanks] = useLazyExportBloodBanksXlsxQuery();
  const [triggerCamps] = useLazyExportCampsXlsxQuery();
  const [triggerEvents] = useLazyExportEventsXlsxQuery();
  const [triggerAll] = useLazyExportAllDataXlsxQuery();

  const triggers = {
    users: triggerUsers,
    requests: triggerRequests,
    "blood-banks": triggerBloodBanks,
    camps: triggerCamps,
    events: triggerEvents,
    all: triggerAll,
  };

  const modules = [
    { id: "users", name: "Users" },
    { id: "blood-banks", name: "Blood Banks" },
    { id: "camps", name: "Blood Camps" },
    { id: "events", name: "Events" },
    { id: "requests", name: "Blood Requests" },
    { id: "all", name: "All Data (All-in-One)" },
  ];

  const handleExport = async () => {
    const trigger = triggers[module];
    if (!trigger) {
      toast.error("Invalid export module selected");
      return;
    }

    setIsExporting(true);
    try {
      // Trigger the RTK Query request and unwrap the result directly
      const response = await trigger().unwrap();

      if (!response) throw new Error("No data received from server");

      // Robustly handle both direct Blobs and wrapped data objects
      let blob;
      if (response instanceof Blob || response?.constructor?.name === "Blob") {
        blob = response;
      } else if (response.data instanceof Blob || response.data?.constructor?.name === "Blob") {
        blob = response.data;
      } else {
        // Fallback for cases where data might be a Uint8Array or similar
        blob = new Blob([response.data || response]);
      }
      const filename = `${module}_${new Date().toISOString().split("T")[0]}.xlsx`;

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(`${module.replace("-", " ")} exported successfully`);
    } catch (error) {
      console.error("Export failed:", error);
      const errorMessage = error?.data?.message || error?.message || "Failed to export data. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="dashboard-header-premium">
        <h1 className="page-title">Data Export Center</h1>
        <p className="page-subtitle">Download system data in professional Excel format</p>
      </div>

      <div className="export-container">
        <div className="export-card">
          <h2>Export Configuration</h2>

          <div className="export-form">
            <div className="form-group">
              <label htmlFor="module">Select Module</label>
              <select
                id="module"
                value={module}
                onChange={(e) => setModule(e.target.value)}
                className="filter-select"
                style={{ width: "100%", marginBottom: "0.5rem" }}
              >
                {modules.map((mod) => (
                  <option key={mod.id} value={mod.id}>
                    {mod.name}
                  </option>
                ))}
              </select>
              <p className="help-text">Choose which data module to export</p>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="btn-premium"
              style={{ marginTop: "1rem" }}
            >
              {isExporting ? "Exporting..." : "Download Excel Report"}
            </button>
          </div>
        </div>

        <div className="export-info">
          <h3>Export Information</h3>
          <div className="info-section">
            <h4>Modules Available</h4>
            <ul>
              <li>
                <strong>Users:</strong> All registered users with contact info
                and donor status
              </li>
              <li>
                <strong>Blood Banks:</strong> All registered blood banks with
                location and status
              </li>
              <li>
                <strong>Blood Camps:</strong> All blood donation camps with
                dates and locations
              </li>
              <li>
                <strong>Events:</strong> All events with schedules and
                descriptions
              </li>
              <li>
                <strong>Blood Requests:</strong> All blood requests with patient
                and hospital info
              </li>
              <li>
                <strong>Donations:</strong> All blood donations with donor and
                blood type details
              </li>
              <li>
                <strong>All Data:</strong> Complete system data export in a
                single file
              </li>
            </ul>
          </div>

          <div className="info-section">
            <h4>Tip</h4>
            <ul>
              <li>Use Excel format for professional analysis, pivot tables, and presentations</li>
              <li>
                All-in-one exports include multiple sheets for different data modules
              </li>
              <li>
                Exports are generated with the current date for easy identification
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminExports;

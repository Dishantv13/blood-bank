import { useState } from "react";
import "../adminPage.css/AdminExports.css";

const AdminExports = () => {
  const [module, setModule] = useState("users");
  const [isExporting, setIsExporting] = useState(false);

  const modules = [
    { id: "users", name: "Users" },
    { id: "blood-banks", name: "Blood Banks" },
    { id: "camps", name: "Blood Camps" },
    { id: "events", name: "Events" },
    { id: "requests", name: "Blood Requests" },
    { id: "all", name: "All Data (All-in-One)" },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const baseUrl =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";

      const url = `${baseUrl}/admin/export/${module}`;

      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const filename = `${module}_${new Date().toISOString().split("T")[0]}.xlsx`;

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
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

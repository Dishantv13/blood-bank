import "../components.css/InventoryModal.css";

const InventoryModal = ({ bloodBank, onClose }) => {
  if (!bloodBank) return null;

  const getStatusClass = (units) => {
    if (units === 0) return "status-empty";
    if (units < 10) return "status-critical";
    if (units < 20) return "status-low";
    return "status-good";
  };

  const getStatusText = (units) => {
    if (units === 0) return "Empty";
    if (units < 10) return "Critical";
    if (units < 20) return "Low";
    return "Available";
  };

  return (
    <div className="inventory-modal-overlay" onClick={onClose}>
      <div
        className="inventory-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={onClose}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="inventory-modal-header">
          <div className="bank-info">
            <h2>{bloodBank.name}</h2>
            <p className="bank-location">
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10 2C7.5 2 5 4 5 7C5 11 10 18 10 18C10 18 15 11 15 7C15 4 12.5 2 10 2Z" />
                <circle cx="10" cy="7" r="2" />
              </svg>
              {bloodBank.address?.city || "Location not available"}
            </p>
          </div>
        </div>

        <div className="inventory-modal-body">
          <h3>Blood Inventory</h3>
          <div className="inventory-grid">
            {bloodBank.inventory && bloodBank.inventory.length > 0 ? (
              bloodBank.inventory.map((item) => (
                <div key={item.bloodGroup} className="inventory-item">
                  <div className="blood-type-badge">{item.bloodGroup}</div>
                  <div className="units-display">
                    <span className="units-number">{item.units}</span>
                    <span className="units-label">Units</span>
                  </div>
                  <div
                    className={`status-indicator ${getStatusClass(item.units)}`}
                  >
                    {getStatusText(item.units)}
                  </div>
                  {item.lastUpdated && (
                    <div className="last-updated">
                      Updated: {new Date(item.lastUpdated).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="no-inventory">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <p>Inventory information not available</p>
              </div>
            )}
          </div>

          <div className="inventory-summary">
            <div className="summary-item">
              <span className="summary-label">Total Units:</span>
              <span className="summary-value">
                {bloodBank.inventory?.reduce(
                  (sum, item) => sum + item.units,
                  0,
                ) || 0}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Blood Types Available:</span>
              <span className="summary-value">
                {bloodBank.inventory?.filter((item) => item.units > 0).length ||
                  0}{" "}
                / 8
              </span>
            </div>
          </div>

          <div className="inventory-actions">
            <button className="btn-contact-bank" onClick={onClose}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 2H7L9 7L6.5 8.5C7.5 10.5 9.5 12.5 11.5 13.5L13 11L18 13V17C18 18.1 17.1 19 16 19C7.716 19 1 12.284 1 4C1 2.9 1.9 2 3 2Z" />
              </svg>
              Contact Blood Bank
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryModal;

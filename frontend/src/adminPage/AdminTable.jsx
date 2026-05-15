import { useState, useEffect } from "react";
import { usePagination } from "../context/PaginationContext";

const DESTRUCTIVE_STATUSES = new Set([
  "suspended",
  "inactive",
  "rejected",
  "cancelled",
]);

const StatusChangeConfirmDialog = ({ pending, onConfirm, onCancel }) => {
  if (!pending) return null;
  const { newStatus } = pending;
  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div
        className="confirm-dialog fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog-icon">⚠️</div>
        <h3 className="confirm-dialog-title">Confirm Status Change</h3>
        <p className="confirm-dialog-message">
          Are you sure you want to change the status to{" "}
          <strong
            style={{
              textTransform: "uppercase",
              color: "var(--admin-primary)",
            }}
          >
            {newStatus}
          </strong>
          ?
          {DESTRUCTIVE_STATUSES.has(newStatus) && (
            <div
              style={{
                marginTop: "0.5rem",
                color: "#ef4444",
                fontSize: "0.8rem",
              }}
            >
              This action will restrict access for this record.
            </div>
          )}
        </p>
        <div className="confirm-dialog-actions">
          <button
            className="confirm-dialog-btn confirm-dialog-btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="confirm-dialog-btn confirm-dialog-btn--confirm"
            onClick={onConfirm}
          >
            Yes, Update Status
          </button>
        </div>
      </div>
    </div>
  );
};

const formatCellValue = (value, key) => {
  if (value === null || value === undefined || value === "") return "-";

  if (key === "status") {
    const statusClass = `status-pill status-${value.toLowerCase()}`;
    return <span className={statusClass}>{value}</span>;
  }

  if (typeof value === "object" && value.coordinates) {
    return `${value.coordinates[1].toFixed(4)}, ${value.coordinates[0].toFixed(4)}`;
  }

  return String(value);
};

export const AdminTable = ({
  columns,
  data,
  isLoading,
  onActionClick,
  onStatusChange,
  onRowClick,
  pagination,
  onPageChange,
  onPageSizeChange,
}) => {
  const { setPaginationData } = usePagination();
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    if (pagination) {
      setPaginationData({
        currentPage: pagination.page || pagination.currentPage || 1,
        totalPages: pagination.totalPages || pagination.pages || 1,
        totalRecords: pagination.total || pagination.totalRecords || 0,
        pageSize: pagination.limit || pagination.pageSize || 10,
        onPageChange,
        onPageSizeChange,
      });
    } else {
      setPaginationData(null);
    }

    return () => setPaginationData(null);
  }, [pagination, onPageChange, onPageSizeChange, setPaginationData]);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const hasActions = Boolean(onStatusChange || onActionClick);

  const handleStatusSelect = (rowId, newStatus, currentStatus) => {
    if (!newStatus || newStatus === currentStatus) return;
    if (DESTRUCTIVE_STATUSES.has(newStatus)) {
      setPendingStatusChange({ rowId, newStatus });
    } else {
      if (onStatusChange) onStatusChange(rowId, newStatus);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-table-container">
        <div className="loading-state">
          <div className="loader"></div>
          <p>Fetching database records...</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="admin-table-container">
        <div className="empty-state fade-in-up">
          <div className="empty-icon">📂</div>
          <h3>No Records Found</h3>
          <p>There are no matches for your current filter criteria.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-table-container">
      <StatusChangeConfirmDialog
        pending={pendingStatusChange}
        onConfirm={() => {
          onStatusChange(
            pendingStatusChange.rowId,
            pendingStatusChange.newStatus,
          );
          setPendingStatusChange(null);
        }}
        onCancel={() => setPendingStatusChange(null)}
      />
      <table className="admin-table">
        <thead>
          <tr className="fade-in-up">
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width }}>
                {col.label}
              </th>
            ))}
            {hasActions && <th style={{ width: "150px" }}>Quick Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row._id || idx}
              className={`fade-in-up ${selectedRow === idx ? "selected" : ""}`}
              style={{ animationDelay: `${idx * 40}ms` }}
              onClick={() => {
                setSelectedRow(idx);
                if (onRowClick) onRowClick(row);
              }}
            >
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render
                    ? col.render(row[col.key], row)
                    : formatCellValue(row[col.key], col.key)}
                </td>
              ))}
              {hasActions && (
                <td>
                  <div className="action-buttons">
                    {onStatusChange && (
                      <select
                        className="status-select-premium"
                        value={row.status || ""}
                        onChange={(e) =>
                          handleStatusSelect(
                            row._id,
                            e.target.value,
                            row.status,
                          )
                        }
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">Update Status</option>
                        <option value="active">Set Active</option>
                        <option value="inactive">Set Inactive</option>
                        <option value="suspended">Suspend</option>
                      </select>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminTable;

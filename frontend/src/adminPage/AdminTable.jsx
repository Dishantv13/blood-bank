import React, { useState } from 'react';
import '../pages.css/AdminTable.css';

const formatGeoLocation = (value) => {
  if (!value || !Array.isArray(value.coordinates) || value.coordinates.length < 2) {
    return null;
  }

  const [longitude, latitude] = value.coordinates;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null;
  }

  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
};

const formatCellValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Date) {
    return value.toLocaleDateString();
  }

  if (Array.isArray(value)) {
    const formattedList = value
      .map((item) => (typeof item === 'object' ? JSON.stringify(item) : item))
      .filter((item) => item !== null && item !== undefined && item !== '');

    return formattedList.length ? formattedList.join(', ') : '-';
  }

  if (typeof value === 'object') {
    const geoLocation = formatGeoLocation(value);
    if (geoLocation) {
      return geoLocation;
    }

    if (typeof value.address === 'string' && value.address.trim()) {
      return value.address;
    }

    if (typeof value.name === 'string' && value.name.trim()) {
      return value.name;
    }

    try {
      return JSON.stringify(value);
    } catch (error) {
      return '-';
    }
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
}) => {
  const [selectedRow, setSelectedRow] = useState(null);
  const hasActions = Boolean(onStatusChange || onActionClick);

  if (isLoading) {
    return (
      <div className="admin-table-container">
        <div className="loading-spinner">Loading data...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="admin-table-container">
        <div className="empty-state">No data found</div>
      </div>
    );
  }

  return (
    <div className="admin-table-container">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width }}>
                {col.label}
              </th>
            ))}
            {hasActions && <th style={{ width: '100px' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row._id || idx}
              className={selectedRow === idx ? 'selected' : ''}
              onClick={() => {
                setSelectedRow(idx);
                if (onRowClick) {
                  onRowClick(row);
                }
              }}
            >
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row[col.key], row) : formatCellValue(row[col.key])}
                </td>
              ))}
              {hasActions && (
                <td>
                  <div className="action-buttons">
                    {onStatusChange && (
                      <select
                        className="status-select"
                        value={row.status || ''}
                        onChange={(e) => onStatusChange(row._id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">Change Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                        {row.urgency && <option value="high">High</option>}
                        {row.urgency && <option value="medium">Medium</option>}
                        {row.urgency && <option value="low">Low</option>}
                      </select>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {pagination && (
        <div className="pagination">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            Previous
          </button>
          <span className="page-info">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminTable;

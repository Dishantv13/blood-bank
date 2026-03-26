import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAllBloodBanksQuery, useUpdateBloodBankStatusMutation } from '../store/adminApi.js';
import AdminTable from './AdminTable.jsx';
import { ROUTE_PATH } from '../enum/routePath.js';

const ReviewModal = ({ reviewState, onClose, onConfirm, submitting }) => {
  if (!reviewState) return null;

  const isReject = reviewState.action === 'rejected';

  return (
    <div className="confirm-dialog-overlay" onClick={onClose}>
      <div className="confirm-dialog admin-review-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="confirm-dialog-title">
          {isReject ? 'Reject Blood Bank Request' : 'Approve Blood Bank Request'}
        </h3>
        <p className="confirm-dialog-message">
          {isReject
            ? `Add the rejection reason for ${reviewState.name}. This reason will be sent to the registered email.`
            : `Approve ${reviewState.name}. An approval email will be sent to the registered email address.`}
        </p>

        <div className="review-detail">
          <strong>Email:</strong> {reviewState.email}
        </div>
        <div className="review-detail">
          <strong>Registration No:</strong> {reviewState.registrationNumber || '-'}
        </div>

        {isReject && (
          <div className="review-form-group">
            <label htmlFor="rejectionReason">Rejection Reason</label>
            <textarea
              id="rejectionReason"
              value={reviewState.reason}
              onChange={(e) => reviewState.setReason(e.target.value)}
              placeholder="Enter the reason that should be emailed to the blood bank"
              rows={5}
            />
            {reviewState.error ? <p className="review-error-text">{reviewState.error}</p> : null}
          </div>
        )}

        <div className="confirm-dialog-actions">
          <button className="confirm-dialog-btn confirm-dialog-btn--cancel" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button className="confirm-dialog-btn confirm-dialog-btn--confirm" onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Submitting...' : isReject ? 'Reject and Send Email' : 'Approve and Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminBloodBanks = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [reviewState, setReviewState] = useState(null);
  const [updateBankStatus, { isLoading: isUpdating }] = useUpdateBloodBankStatusMutation();

  const { data: banksData, isLoading } = useGetAllBloodBanksQuery({
    page,
    limit: 10,
    ...filters,
  });

  const openReviewModal = (bank, action) => {
    let reasonValue = bank.rejectionReason || '';
    const setReason = (nextReason) => {
      reasonValue = nextReason;
      setReviewState((prev) => (prev ? { ...prev, reason: nextReason, error: '', setReason } : prev));
    };

    setReviewState({
      bankId: bank._id,
      name: bank.name,
      email: bank.email,
      registrationNumber: bank.registrationNumber,
      action,
      reason: reasonValue,
      error: '',
      setReason,
    });
  };

  const handleReviewSubmit = async () => {
    if (!reviewState) return;

    if (reviewState.action === 'rejected' && !reviewState.reason.trim()) {
      setReviewState((prev) => (prev ? { ...prev, error: 'Rejection reason is required.' } : prev));
      return;
    }

    try {
      await updateBankStatus({
        bankId: reviewState.bankId,
        status: reviewState.action,
        rejectionReason: reviewState.action === 'rejected' ? reviewState.reason.trim() : '',
      }).unwrap();
      setReviewState(null);
    } catch (error) {
      console.error('Failed to review blood bank request:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmedSearch = searchInput.trim();
      setFilters((prev) => (prev.search === trimmedSearch ? prev : { ...prev, search: trimmedSearch }));
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const columns = [
    { key: 'name', label: 'Blood Bank Name', width: '16%' },
    { key: 'email', label: 'Email', width: '18%' },
    { key: 'mobileNumber', label: 'Phone', width: '12%' },
    { key: 'city', label: 'City', width: '10%' },
    { key: 'state', label: 'State', width: '10%' },
    {
      key: 'status',
      label: 'Approval Status',
      width: '10%',
      render: (status) => (
        <span className={`status-badge ${status}`}>{status?.toUpperCase()}</span>
      ),
    },
    {
      key: 'rejectionReason',
      label: 'Review',
      width: '24%',
      render: (_, row) => (
        <div className="bank-review-actions">
          <div className="bank-review-buttons">
            <button
              type="button"
              className="bank-review-btn bank-review-btn-view"
              onClick={(e) => {
                e.stopPropagation();
                navigate(ROUTE_PATH.ADMIN_BLOOD_BANK_DETAILS.replace(':bankId', row._id), {
                  state: { bloodBank: row },
                });
              }}
            >
              View Details
            </button>
            <button
              type="button"
              className="bank-review-btn bank-review-btn-approve"
              onClick={(e) => {
                e.stopPropagation();
                openReviewModal(row, 'approved');
              }}
            >
              Approve
            </button>
            <button
              type="button"
              className="bank-review-btn bank-review-btn-reject"
              onClick={(e) => {
                e.stopPropagation();
                openReviewModal(row, 'rejected');
              }}
            >
              Reject
            </button>
          </div>
          {row.rejectionReason ? (
            <p className="bank-review-reason">
              <strong>Reason:</strong> {row.rejectionReason}
            </p>
          ) : (
            <p className="bank-review-reason bank-review-reason-muted">No rejection reason recorded</p>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="dashboard-header-premium">
        <h1 className="page-title">Blood Bank Management</h1>
        <p className="page-subtitle">Review blood bank registration requests and notify them by email</p>
      </div>

      <div className="filters-panel">
        <input
          type="text"
          placeholder="Search by name, email, or city..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="filter-input"
        />
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <AdminTable
        columns={columns}
        data={banksData?.data || []}
        isLoading={isLoading}
        pagination={banksData?.pagination}
        onPageChange={setPage}
      />

      <ReviewModal
        reviewState={reviewState}
        onClose={() => setReviewState(null)}
        onConfirm={handleReviewSubmit}
        submitting={isUpdating}
      />

      <style>{`
        .admin-review-modal {
          text-align: left;
          max-width: 560px;
        }

        .review-detail {
          color: #374151;
          margin-bottom: 0.5rem;
          font-size: 0.95rem;
        }

        .review-form-group {
          margin-top: 1rem;
          margin-bottom: 1.25rem;
        }

        .review-form-group label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .review-form-group textarea {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 0.85rem;
          resize: vertical;
          font: inherit;
        }

        .bank-review-actions {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .bank-review-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .bank-review-btn {
          border: none;
          border-radius: 8px;
          padding: 0.45rem 0.8rem;
          color: #fff;
          font-weight: 600;
          cursor: pointer;
        }

        .bank-review-btn-approve {
          background: #15803d;
        }

        .bank-review-btn-view {
          background: #1d4ed8;
        }

        .bank-review-btn-reject {
          background: #b91c1c;
        }

        .bank-review-reason {
          margin: 0;
          font-size: 0.88rem;
          line-height: 1.4;
          color: #374151;
        }

        .bank-review-reason-muted {
          color: #9ca3af;
        }

        .review-error-text {
          color: #dc2626;
          font-size: 0.85rem;
          margin: 0.5rem 0 0;
        }

        [data-theme='dark'] .review-detail,
        [data-theme='dark'] .review-form-group label,
        [data-theme='dark'] .bank-review-reason {
          color: #e5e7eb;
        }

        [data-theme='dark'] .review-form-group textarea {
          background: #111827;
          color: #f3f4f6;
          border-color: #4b5563;
        }
      `}</style>
    </>
  );
};

export default AdminBloodBanks;

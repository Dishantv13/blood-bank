import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useGetBloodBankByIdQuery } from '../store/adminApi.js';
import MapModal from '../components/MapModal';
import { ROUTE_PATH } from '../enum/routePath';

const formatAddress = (address) => {
  if (!address) return 'Address not available';
  if (typeof address === 'string') return address;

  return [address.street, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(', ') || 'Address not available';
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
};

const formatOperatingHours = (operatingHours) => {
  if (!operatingHours) return 'Not provided';
  const open = operatingHours.open || 'N/A';
  const close = operatingHours.close || 'N/A';
  return `${open} - ${close}`;
};

const getPreviewImage = (bank) => {
  return bank?.profileImage || bank?.imageUrl || bank?.logo || '';
};

const AdminBloodBankDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bankId } = useParams();
  const [showMap, setShowMap] = useState(false);

  const { data, isLoading, error } = useGetBloodBankByIdQuery(bankId);
  const bank = useMemo(() => {
    if (data?.success && data.data) return data.data;
    if (data) return data;
    return location.state?.bloodBank || null;
  }, [data, location.state]);

  const services = Array.isArray(bank?.services) ? bank.services.filter(Boolean) : [];
  const workingDays = Array.isArray(bank?.operatingHours?.days) ? bank.operatingHours.days.filter(Boolean) : [];
  const inventory = Array.isArray(bank?.inventory) ? bank.inventory : [];
  const previewImage = getPreviewImage(bank);
  const hasLocation =
    Array.isArray(bank?.location?.coordinates) &&
    bank.location.coordinates.length === 2 &&
    (bank.location.coordinates[0] !== 0 || bank.location.coordinates[1] !== 0);

  if (isLoading && !bank) {
    return (
      <div className="admin-bank-details-page">
        <div className="admin-bank-details-card admin-bank-details-loading">
          <div className="loading-spinner">Loading blood bank verification details...</div>
        </div>
      </div>
    );
  }

  if (error && !bank) {
    return (
      <div className="admin-bank-details-page">
        <div className="admin-bank-details-card">
          <h1>Blood Bank Details</h1>
          <p>{error.data?.message || 'Unable to load blood bank details.'}</p>
          <button className="admin-bank-back-btn" onClick={() => navigate(ROUTE_PATH.ADMIN_BLOOD_BANKS)}>
            Back to Blood Banks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-bank-details-page">
      <div className="admin-bank-header">
        <div>
          <h1>{bank?.name || 'Blood Bank Verification'}</h1>
          <p>Review the complete registration details before approving or rejecting this request.</p>
        </div>
      </div>

      <div className="admin-bank-grid">
        <section className="admin-bank-details-card admin-bank-profile-card">
          <div className="admin-bank-card-head">
            <h2>Registration Summary</h2>
            <span className={`status-badge ${bank?.approvalStatus || bank?.status || 'pending'}`}>
              {(bank?.approvalStatus || bank?.status || 'pending').toUpperCase()}
            </span>
          </div>

          <div className="admin-bank-profile">
            <div className="admin-bank-image-wrap">
              {previewImage ? (
                <img src={previewImage} alt={bank?.name || 'Blood bank'} className="admin-bank-image" />
              ) : (
                <div className="admin-bank-image-placeholder">No image uploaded</div>
              )}
            </div>

            <div className="admin-bank-meta-list">
              <div><span>Name</span><strong>{bank?.name || 'N/A'}</strong></div>
              <div><span>Email</span><strong>{bank?.email || 'N/A'}</strong></div>
              <div><span>Phone</span><strong>{bank?.phone || 'N/A'}</strong></div>
              <div><span>License Number</span><strong>{bank?.licenseNumber || 'N/A'}</strong></div>
              <div><span>Registration Number</span><strong>{bank?.registrationNumber || 'N/A'}</strong></div>
              <div><span>Established Year</span><strong>{bank?.establishedYear || 'N/A'}</strong></div>
              <div><span>Created At</span><strong>{formatDate(bank?.createdAt)}</strong></div>
              <div><span>Reviewed At</span><strong>{formatDate(bank?.reviewedAt)}</strong></div>
              <div><span>Reviewed By</span><strong>{bank?.reviewedBy || 'N/A'}</strong></div>
            </div>
          </div>

          {bank?.rejectionReason ? (
            <div className="admin-bank-alert admin-bank-alert-reject">
              <strong>Latest rejection reason:</strong> {bank.rejectionReason}
            </div>
          ) : null}
        </section>

        <section className="admin-bank-details-card">
          <div className="admin-bank-card-head">
            <h2>Address and Live Location</h2>
            {hasLocation ? (
              <button className="admin-bank-action-btn" onClick={() => setShowMap(true)}>
                Open Map
              </button>
            ) : null}
          </div>

          <div className="admin-bank-info-grid">
            <div><span>Full Address</span><strong>{formatAddress(bank?.address)}</strong></div>
            <div><span>City</span><strong>{bank?.address?.city || 'N/A'}</strong></div>
            <div><span>State</span><strong>{bank?.address?.state || 'N/A'}</strong></div>
            <div><span>Pincode</span><strong>{bank?.address?.pincode || 'N/A'}</strong></div>
            <div><span>Latitude</span><strong>{hasLocation ? bank.location.coordinates[1].toFixed(6) : 'N/A'}</strong></div>
            <div><span>Longitude</span><strong>{hasLocation ? bank.location.coordinates[0].toFixed(6) : 'N/A'}</strong></div>
          </div>

          {hasLocation ? (
            <div className="admin-bank-map-preview">
              <iframe
                title="Blood bank location"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${bank.location.coordinates[0]-0.01},${bank.location.coordinates[1]-0.01},${bank.location.coordinates[0]+0.01},${bank.location.coordinates[1]+0.01}&layer=mapnik&marker=${bank.location.coordinates[1]},${bank.location.coordinates[0]}`}
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                allowFullScreen
              />
            </div>
          ) : (
            <p className="admin-bank-empty">No live location was stored at registration time.</p>
          )}
        </section>

        <section className="admin-bank-details-card">
          <div className="admin-bank-card-head">
            <h2>Contact and Operations</h2>
          </div>

          <div className="admin-bank-info-grid">
            <div><span>Operating Hours</span><strong>{formatOperatingHours(bank?.operatingHours)}</strong></div>
            <div><span>Working Days</span><strong>{workingDays.length ? workingDays.join(', ') : 'Not provided'}</strong></div>
            <div><span>Contact Person</span><strong>{bank?.contactPerson?.name || 'N/A'}</strong></div>
            <div><span>Contact Phone</span><strong>{bank?.contactPerson?.phone || 'N/A'}</strong></div>
            <div><span>Contact Email</span><strong>{bank?.contactPerson?.email || 'N/A'}</strong></div>
            <div><span>Verified</span><strong>{bank?.isVerified ? 'Yes' : 'No'}</strong></div>
            <div><span>Portal Active</span><strong>{bank?.isActive ? 'Yes' : 'No'}</strong></div>
          </div>

          <div className="admin-bank-pill-section">
            <h3>Services Offered</h3>
            {services.length ? (
              <div className="admin-bank-pills">
                {services.map((service) => (
                  <span key={service} className="admin-bank-pill">{service}</span>
                ))}
              </div>
            ) : (
              <p className="admin-bank-empty">No services were provided during registration.</p>
            )}
          </div>
        </section>

        <section className="admin-bank-details-card admin-bank-details-card-inventory">
          <div className="admin-bank-card-head">
            <h2>Inventory Snapshot</h2>
          </div>

          {inventory.length ? (
            <div className="admin-bank-inventory-grid">
              {inventory.map((item) => (
                <div key={item.bloodGroup} className="admin-bank-inventory-item">
                  <span>{item.bloodGroup}</span>
                  <strong>{item.units || 0} units</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="admin-bank-empty">No inventory data is stored for this blood bank.</p>
          )}
        </section>
      </div>

      {showMap && hasLocation ? (
        <MapModal
          location={bank.location}
          name={bank.name || 'Blood Bank Location'}
          onClose={() => setShowMap(false)}
        />
      ) : null}

      <style>{`
        .admin-bank-details-page {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .admin-bank-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .admin-bank-header h1 {
          margin: 0 0 0.35rem;
          font-size: 2rem;
          color: var(--admin-text, #111827);
        }

        .admin-bank-header p {
          margin: 0;
          color: #6b7280;
        }

        .admin-bank-back-btn,
        .admin-bank-action-btn {
          border: none;
          border-radius: 10px;
          padding: 0.75rem 1rem;
          font-weight: 700;
          cursor: pointer;
        }

        .admin-bank-back-btn {
          background: #e5e7eb;
          color: #111827;
        }

        .admin-bank-action-btn {
          background: #1d4ed8;
          color: #fff;
        }

        .admin-bank-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.25rem;
        }

        .admin-bank-details-card {
          background: #fff;
          border-radius: 20px;
          padding: 1.4rem;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
          border: 1px solid #e5e7eb;
        }

        .admin-bank-card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .admin-bank-card-head h2 {
          margin: 0;
          color: #111827;
        }

        .admin-bank-profile {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 1.25rem;
        }

        .admin-bank-image-wrap {
          min-height: 220px;
        }

        .admin-bank-image,
        .admin-bank-image-placeholder {
          width: 100%;
          height: 220px;
          border-radius: 18px;
          object-fit: cover;
          border: 1px solid #e5e7eb;
          background: #f8fafc;
        }

        .admin-bank-image-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          font-weight: 600;
        }

        .admin-bank-meta-list,
        .admin-bank-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.9rem 1rem;
        }

        .admin-bank-meta-list div,
        .admin-bank-info-grid div {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          padding: 0.8rem;
          border-radius: 14px;
          background: #f8fafc;
        }

        .admin-bank-meta-list span,
        .admin-bank-info-grid span {
          font-size: 0.82rem;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .admin-bank-meta-list strong,
        .admin-bank-info-grid strong {
          color: #111827;
          line-height: 1.5;
          word-break: break-word;
        }

        .admin-bank-map-preview {
          margin-top: 1rem;
          border-radius: 18px;
          overflow: hidden;
          height: 260px;
          border: 1px solid #dbe3ef;
        }

        .admin-bank-pill-section h3 {
          margin: 1.2rem 0 0.8rem;
          color: #111827;
        }

        .admin-bank-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
        }

        .admin-bank-pill {
          padding: 0.5rem 0.85rem;
          border-radius: 999px;
          background: #fee2e2;
          color: #991b1b;
          font-weight: 700;
          font-size: 0.88rem;
        }

        .admin-bank-inventory-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.85rem;
        }

        .admin-bank-inventory-item {
          border-radius: 16px;
          padding: 1rem;
          background: linear-gradient(145deg, #fff5f5, #fee2e2);
          border: 1px solid #fecaca;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .admin-bank-inventory-item span {
          font-weight: 700;
          color: #991b1b;
        }

        .admin-bank-inventory-item strong {
          color: #111827;
        }

        .admin-bank-alert {
          margin-top: 1rem;
          padding: 0.9rem 1rem;
          border-radius: 14px;
          font-weight: 600;
        }

        .admin-bank-alert-reject {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .admin-bank-empty {
          margin: 0;
          color: #9ca3af;
        }

        .admin-bank-details-loading {
          min-height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        [data-theme='dark'] .admin-bank-details-card {
          background: #111827;
          border-color: #374151;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
        }

        [data-theme='dark'] .admin-bank-header h1,
        [data-theme='dark'] .admin-bank-card-head h2,
        [data-theme='dark'] .admin-bank-pill-section h3,
        [data-theme='dark'] .admin-bank-meta-list strong,
        [data-theme='dark'] .admin-bank-info-grid strong,
        [data-theme='dark'] .admin-bank-inventory-item strong {
          color: #f9fafb;
        }

        [data-theme='dark'] .admin-bank-header p,
        [data-theme='dark'] .admin-bank-meta-list span,
        [data-theme='dark'] .admin-bank-info-grid span,
        [data-theme='dark'] .admin-bank-empty {
          color: #cbd5e1;
        }

        [data-theme='dark'] .admin-bank-meta-list div,
        [data-theme='dark'] .admin-bank-info-grid div,
        [data-theme='dark'] .admin-bank-image-placeholder {
          background: #1f2937;
          border-color: #374151;
        }

        [data-theme='dark'] .admin-bank-back-btn {
          background: #374151;
          color: #f9fafb;
        }

        [data-theme='dark'] .admin-bank-details-card-inventory {
          background: #111827;
          border-color: #374151;
        }

        [data-theme='dark'] .admin-bank-alert-reject {
          background: #3f1d1d;
          color: #fecaca;
          border-color: #7f1d1d;
        }

        [data-theme='dark'] .admin-bank-inventory-item {
          background: linear-gradient(145deg, #2a1416, #3a171a);
          border-color: #7f1d1d;
        }

        [data-theme='dark'] .admin-bank-inventory-item span {
          color: #fca5a5;
        }

        @media (max-width: 980px) {
          .admin-bank-grid,
          .admin-bank-profile,
          .admin-bank-meta-list,
          .admin-bank-info-grid,
          .admin-bank-inventory-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminBloodBankDetails;

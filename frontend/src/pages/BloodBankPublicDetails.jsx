import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetBloodBankByIdQuery } from "../store/bloodBankApi";
import { ROUTE_PATH } from "../enum/routePath";
import MapModal from "../components/MapModal";
import SkeletonLoader from "../components/SkeletonLoader";
import {
  FiMapPin,
  FiPhone,
  FiMail,
  FiCheckCircle,
  FiShield,
  FiPackage,
  FiArrowLeft,
  FiActivity,
} from "react-icons/fi";
import "../pages.css/BloodBankDirectoryDetails.css"; // Reusing some base styles for layout consistency

const BloodBankPublicDetails = () => {
  const { bankId } = useParams();
  const navigate = useNavigate();
  const { data: response, isLoading, error } = useGetBloodBankByIdQuery(bankId);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const bank = response?.data || response;

  if (isLoading) return <SkeletonLoader variant="form" />;

  if (error || !bank) {
    return (
      <div className="error-container p-20 text-center">
        <h2>Blood Bank Not Found</h2>
        <p>
          The facility you are looking for might have been moved or is no longer
          listed.
        </p>
        <button
          className="btn-primary mt-4"
          onClick={() => navigate(ROUTE_PATH.BLOOD_BANKS)}
        >
          Back to Directory
        </button>
      </div>
    );
  }

  const inventory = bank.inventory || [];
  const totalUnits = inventory.reduce(
    (acc, curr) => acc + (curr.units || 0),
    0,
  );

  return (
    <div className="bank-details-page">
      <div className="details-shell">
        <header className="details-header-premium">
          <button
            className="back-circle-btn"
            onClick={() => navigate(ROUTE_PATH.BLOOD_BANKS)}
          >
            <FiArrowLeft />
          </button>
          <div className="profile-hero">
            <div className="hero-avatar">
              <img
                src={
                  bank.profileImage ||
                  `https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80`
                }
                alt={bank.name}
              />
            </div>
            <div className="hero-info">
              <div className="title-row">
                <h1>{bank.name}</h1>
                <span className="verified-badge">
                  <FiShield className="icon" /> Government Verified
                </span>
              </div>
              <p className="subtitle">
                Licensed Blood Donation & Storage Center
              </p>
              <div className="hero-pills">
                <span className="hero-pill">
                  <FiCheckCircle /> Open 24/7
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
                <a href={`tel:${bank.phone}`} className="contact-item">
                  <div className="icon-wrap">
                    <FiPhone />
                  </div>
                  <div className="text-wrap">
                    <label>Phone Number</label>
                    <p>{bank.phone}</p>
                  </div>
                </a>
                <a href={`mailto:${bank.email}`} className="contact-item">
                  <div className="icon-wrap">
                    <FiMail />
                  </div>
                  <div className="text-wrap">
                    <label>Email Address</label>
                    <p>{bank.email}</p>
                  </div>
                </a>
                <div className="contact-item">
                  <div className="icon-wrap">
                    <FiMapPin />
                  </div>
                  <div className="text-wrap">
                    <label>Facility Address</label>
                    <p>
                      {bank.address?.street}, {bank.address?.city},{" "}
                      {bank.address?.state}
                    </p>
                    {bank.location?.coordinates && (
                      <button
                        className="btn-map-inline"
                        onClick={() =>
                          setSelectedLocation({
                            location: bank.location,
                            name: bank.name,
                          })
                        }
                      >
                        Find on Maps
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
            <section className="info-card-premium">
              <h3>Operating Hours</h3>
              <div className="hours-list">
                <div className="hour-row">
                  <span>Monday - Sunday</span>
                  <strong>24 Hours (Open)</strong>
                </div>
                <div className="hour-row">
                  <span>Emergency Response</span>
                  <strong>Available 24/7</strong>
                </div>
              </div>
            </section>
          </div>

          <div className="right-col">
            <section className="inventory-card-premium">
              <div className="inventory-header">
                <h3>Live Blood Inventory</h3>
                <p>Real-time availability of blood stocks at this center.</p>
              </div>

              <div className="inventory-grid-premium">
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                  (group) => {
                    const stock = inventory.find(
                      (i) => (i.bloodGroup || i.type) === group,
                    );
                    const units = stock?.units || 0;
                    const status =
                      units > 20 ? "good" : units > 5 ? "low" : "critical";

                    return (
                      <div
                        key={group}
                        className={`stock-item-premium ${status}`}
                      >
                        <span className="group-name">{group}</span>
                        <div className="stock-visual">
                          <span className="units">{units}</span>
                          <span className="label">Units</span>
                        </div>
                        <div className="status-label">{status}</div>
                      </div>
                    );
                  },
                )}
              </div>

              <div className="inventory-footer">
                <p>
                  * Inventory is updated every 30 minutes. Please call the
                  center before visiting for urgent requirements.
                </p>
                {/* <div className="action-row">
                  <button className="btn-request-main" onClick={() => navigate(ROUTE_PATH.CREATE_REQUEST)}>
                    Request Blood from this Bank
                  </button>
                </div> */}
              </div>
            </section>
          </div>
        </div>
      </div>

      {selectedLocation && (
        <MapModal
          location={selectedLocation.location}
          name={selectedLocation.name}
          onClose={() => setSelectedLocation(null)}
        />
      )}
    </div>
  );
};

export default BloodBankPublicDetails;

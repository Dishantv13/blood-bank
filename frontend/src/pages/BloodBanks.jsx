import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAllBloodBanksQuery } from '../store/bloodBankApi';
import { BLOOD_GROUPS } from '../config/constants';
import { ROUTE_PATH } from '../enum/routePath';
import MapModal from '../components/MapModal';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { FiMapPin, FiPhone, FiMail, FiClock, FiCheckCircle, FiInfo, FiChevronRight } from 'react-icons/fi';
import '../pages.css/BloodBanks.css';

const BloodBanks = () => {
  const navigate = useNavigate();
  const [filterBloodGroup, setFilterBloodGroup] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);

  const params = filterBloodGroup ? { bloodGroup: filterBloodGroup } : undefined;
  const { data: bloodBanksRes, isLoading: loadingBloodBanks } = useGetAllBloodBanksQuery(params);
  const bloodBanks = bloodBanksRes?.data || [];

  if (loadingBloodBanks) {
    return <SkeletonLoader variant="list" />;
  }

  const handleCardClick = (bankId) => {
    navigate(ROUTE_PATH.BLOOD_BANK_PUBLIC_DETAILS.replace(':bankId', bankId));
  };

  return (
    <div className="blood-banks-page">
      <div className="directory-container">
        <header className="directory-header">
          <div className="header-content">
            <h1>Blood Bank Directory</h1>
            <p>Find licensed blood donation centers and verify real-time inventory.</p>
          </div>
          
          <div className="filter-card">
            <div className="filter-item">
              <label>Filter Availability</label>
              <select
                className="custom-select"
                value={filterBloodGroup}
                onChange={(e) => setFilterBloodGroup(e.target.value)}
              >
                <option value="">All Blood Groups</option>
                {BLOOD_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group} Available
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="banks-list">
          {bloodBanks.length === 0 ? (
            <EmptyState 
              title="No centers found"
              message="No blood banks match your current filters. Try selecting a different blood group."
            />
          ) : (
            <div className="banks-grid">
              {bloodBanks.map((bank) => (
                <div 
                  key={bank._id} 
                  className="professional-bank-card"
                  onClick={() => handleCardClick(bank._id)}
                >
                  <div className="card-media">
                    <img 
                      src={bank.profileImage || `https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80`} 
                      alt={bank.name} 
                      className="bank-img"
                    />
                    <div className="bank-status-chip">
                      <span className="pulse-dot"></span> Open Now
                    </div>
                  </div>

                  <div className="card-content">
                    <div className="card-top">
                      <div className="bank-info">
                        <h3>{bank.name}</h3>
                        <p className="bank-category">Licensed Medical Facility</p>
                      </div>
                      <div className="bank-rating-box">
                        <span className="rating-star">★</span> 4.9
                      </div>
                    </div>

                    <div className="info-bullets">
                      <div className="bullet">
                        <FiMapPin className="bullet-icon" />
                        <span>{bank.address?.city || 'Local Area'}</span>
                      </div>
                      <div className="bullet">
                        <FiClock className="bullet-icon" />
                        <span>24/7 Emergency Service</span>
                      </div>
                      <div className="bullet">
                        <FiCheckCircle className="bullet-icon" />
                        <span>Goverment Verified</span>
                      </div>
                    </div>

                    <div className="inventory-preview">
                      <span className="label">Available Stocks:</span>
                      <div className="stock-pills">
                        {bank.inventory && bank.inventory.length > 0 ? (
                          bank.inventory
                            .filter(item => (item.units || 0) > 0)
                            .slice(0, 4)
                            .map(item => (
                              <span key={item.bloodGroup || item.type} className="stock-pill">
                                {item.bloodGroup || item.type}
                              </span>
                            ))
                        ) : (
                          <span className="no-stock">Check details</span>
                        )}
                        {bank.inventory?.length > 4 && <span className="more-stock">+{bank.inventory.length - 4}</span>}
                      </div>
                    </div>

                    <div className="card-footer">
                      <div className="footer-links">
                        {bank.location?.coordinates && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLocation({ location: bank.location, name: bank.name });
                            }}
                            className="btn-map-link"
                          >
                            <FiMapPin /> Map
                          </button>
                        )}
                        <a 
                          href={`tel:${bank.phone}`} 
                          className="btn-phone-link"
                          onClick={e => e.stopPropagation()}
                        >
                          <FiPhone /> Call
                        </a>
                      </div>
                      <button className="btn-view-profile">
                        View Details <FiChevronRight />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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

export default BloodBanks;

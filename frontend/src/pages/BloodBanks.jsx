import React, { useState } from 'react';
import { useGetAllBloodBanksQuery } from '../store/bloodBankApi';
import ImageLightbox from '../components/ImageLightbox';
import MapModal from '../components/MapModal';
import InventoryModal from '../components/InventoryModal';
import { BLOOD_GROUPS } from '../config/constants';
import '../pages.css/BloodBanks.css';
import SkeletonLoader from '../components/SkeletonLoader';

const BloodBanks = () => {
  const [filterBloodGroup, setFilterBloodGroup] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedBloodBank, setSelectedBloodBank] = useState(null);

  // RTK Query fetches data and automatically refetches when filterBloodGroup changes
  const params = filterBloodGroup ? { bloodGroup: filterBloodGroup } : undefined;
  const { data: bloodBanksRes, isLoading: loadingBloodBanks } = useGetAllBloodBanksQuery(params);
  const bloodBanks = bloodBanksRes?.data || [];

  // Sample gallery images for blood banks
  const galleryImages = [
    {
      url: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800&q=80',
      alt: 'Blood Donation Center',
      caption: 'Modern blood donation facilities'
    },
    {
      url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&q=80',
      alt: 'Blood Testing Laboratory',
      caption: 'State-of-the-art testing equipment'
    },
    {
      url: 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=800&q=80',
      alt: 'Blood Storage Units',
      caption: 'Temperature-controlled storage systems'
    },
    {
      url: 'https://images.unsplash.com/photo-1582560475093-ba66accbc424?w=800&q=80',
      alt: 'Donation Process',
      caption: 'Safe and comfortable donation experience'
    }
  ];

  // bloodGroups imported from constants

  if (loadingBloodBanks) {
    return <SkeletonLoader />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Blood Banks</h1>
        <div className="filter-group">
          <label>Filter by Blood Group:</label>
          <select
            className="form-control"
            value={filterBloodGroup}
            onChange={(e) => setFilterBloodGroup(e.target.value)}
          >
            <option value="">All Blood Groups</option>
            {bloodGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Gallery Section */}
      <div className="gallery-section">
        <h2>Our Facilities</h2>
        <div className="gallery-grid">
          {galleryImages.map((image, index) => (
            <div 
              key={index} 
              className="gallery-item"
              onClick={() => setSelectedImage(image)}
            >
              <img src={image.url} alt={image.alt} />
              <div className="gallery-overlay">
                <svg width="40" height="40" viewBox="0 0 20 20" fill="none">
                  <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="blood-banks-grid">
        {bloodBanks.length === 0 ? (
          <div className="empty-state">
            <p>No blood banks found.</p>
          </div>
        ) : (
          bloodBanks.map((bank, index) => (
            <div 
              key={bank._id} 
              className="blood-bank-card"
              onClick={() => setSelectedBloodBank(bank)}
              style={{ cursor: 'pointer' }}
            >
              <div className="bank-left-section">
                <div className="bank-image-container">
                  <img 
                    src={bank.profileImage || bank.logo || galleryImages[index % galleryImages.length].url} 
                    alt={bank.name} 
                    className="bank-cover-image"
                    onError={(e) => {
                      e.target.src = galleryImages[0].url;
                    }}
                  />
                  <div className="bank-rating">
                    <span className="star">★</span>
                    <span>4.8 (Verified)</span>
                  </div>
                </div>
              </div>

              <div className="bank-right-section">
                <div className="bank-header">
                  <div className="bank-identity">
                    <h2 className="bank-name">{bank.name}</h2>
                    <span className="bank-type">Licensed Blood Bank Center</span>
                  </div>
                  <div className="bank-badges">
                    <span className="feature-badge">
                      <span className="dot"></span> Open 24/7
                    </span>
                  </div>
                </div>

                <div className="bank-divider"></div>

                <div className="bank-stats-row">
                  <div className="stat-item">
                    <span className="stat-icon">🩸</span>
                    <div className="stat-info">
                      <span className="stat-value">
                        {bank.inventory && bank.inventory.some(item => (item.units || 0) > 0)
                          ? bank.inventory
                              .filter(item => (item.units || 0) > 0)
                              .map(item => item.bloodGroup || item.type)
                              .join(', ')
                          : 'Check Inventory'}
                      </span>
                      <span className="stat-label">Available</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">🏥</span>
                    <div className="stat-info">
                      <span className="stat-value">Advanced</span>
                      <span className="stat-label">Facilities</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">🚑</span>
                    <div className="stat-info">
                      <span className="stat-value">Emergency</span>
                      <span className="stat-label">Services</span>
                    </div>
                  </div>
                </div>

                <div className="bank-divider"></div>

                <div className="bank-details-grid">
                  <div className="detail-item">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path d="M3 4H17C18.1 4 19 4.9 19 6V14C19 15.1 18.1 16 17 16H3C1.9 16 1 15.1 1 14V6C1 4.9 1.9 4 3 4Z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M19 6L10 11L1 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span>{bank.email}</span>
                  </div>
                  <div className="detail-item">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path d="M3 2H7L9 7L6.5 8.5C7.5 10.5 9.5 12.5 11.5 13.5L13 11L18 13V17C18 18.1 17.1 19 16 19C7.716 19 1 12.284 1 4C1 2.9 1.9 2 3 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                    </svg>
                    <span>{bank.phone}</span>
                  </div>
                  <div className="detail-item full-width">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2C7.5 2 5 4 5 7C5 11 10 18 10 18C10 18 15 11 15 7C15 4 12.5 2 10 2Z" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="10" cy="7" r="2" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    <span>{bank.address?.street}, {bank.address?.city}, {bank.address?.state} - {bank.address?.pincode}</span>
                  </div>
                </div>

                <div className="bank-actions">
                  <div className="action-buttons">
                    {bank.location?.coordinates && 
                     Array.isArray(bank.location.coordinates) &&
                     bank.location.coordinates.length === 2 &&
                     (bank.location.coordinates[0] !== 0 || bank.location.coordinates[1] !== 0) && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLocation({ location: bank.location, name: bank.name });
                        }}
                        className="btn-icon-only"
                        title="View on Map"
                      >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M10 2C7.5 2 5 4 5 7C5 11 10 18 10 18C10 18 15 11 15 7C15 4 12.5 2 10 2Z" stroke="currentColor" strokeWidth="2"/>
                          <circle cx="10" cy="7" r="2" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </button>
                    )}
                    <button 
                      className="btn-contact"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `tel:${bank.phone}`;
                      }}
                    >
                      Contact Now
                    </button>
                    <button 
                      className="btn-view-inventory"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBloodBank(bank);
                      }}
                    >
                      View Inventory
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedImage && (
        <ImageLightbox 
          image={selectedImage} 
          onClose={() => setSelectedImage(null)} 
        />
      )}
      
      {selectedLocation && (
        <MapModal 
          location={selectedLocation.location}
          name={selectedLocation.name}
          onClose={() => setSelectedLocation(null)}
        />
      )}

      {selectedBloodBank && (
        <InventoryModal
          bloodBank={selectedBloodBank}
          onClose={() => setSelectedBloodBank(null)}
        />
      )}
    </div>
  );
};

export default BloodBanks;

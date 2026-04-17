import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetDonorsQuery } from '../store/userApi';
import { useAuth } from '../context/AuthContext';
import MapModal from '../components/MapModal';
import { BLOOD_GROUPS } from '../enum/constants';
import { ROUTE_PATH } from '../enum/routePath';
import '../pages.css/Donors.css';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

const Donors = () => {
  const { user } = useAuth();
  const [filterBloodGroup, setFilterBloodGroup] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [availabilityTab, setAvailabilityTab] = useState('available');

  // RTK Query fetches data and automatically refetches when filterBloodGroup changes
  const params = filterBloodGroup ? { bloodGroup: filterBloodGroup } : {};
  const { data: donorsResponse, isLoading: loadingDonors } = useGetDonorsQuery(params);
  const allDonors = donorsResponse?.data || [];

  // Calculate donor eligibility (3 months since last donation)
  const calculateDonorEligibility = (donor) => {
    const lastDonation = donor.lastDonationDate || donor.donorInfo?.lastDonationDate;
    if (!lastDonation) return true; // No donation history = eligible

    const lastDonationDate = new Date(lastDonation);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    return lastDonationDate < threeMonthsAgo;
  };

  const availableDonors = allDonors.filter(donor =>
    donor.isDonor && calculateDonorEligibility(donor) && (donor._id !== user?._id && donor.id !== user?.id)
  );
  const recentlyDonatedDonors = allDonors.filter(donor =>
    donor.isDonor && !calculateDonorEligibility(donor) && (donor._id !== user?._id && donor.id !== user?.id)
  );

  const donors = availabilityTab === 'available' ? availableDonors : recentlyDonatedDonors;

  const donorPhotos = useMemo(() => {
    const photos = {};
    donors.forEach((donor) => {
      const donorId = donor?._id || donor?.id;
      if (!donorId) return;
      const savedPhoto = localStorage.getItem(`userPhoto_${donorId}`);
      if (savedPhoto) photos[donorId] = savedPhoto;
    });
    return photos;
  }, [donors]);

  // Helper function to check if a donor has valid location
  const hasValidLocation = (donor) => {
    if (!donor?.location?.coordinates) return false;
    if (!Array.isArray(donor.location.coordinates)) return false;
    if (donor.location.coordinates.length !== 2) return false;
    const [lng, lat] = donor.location.coordinates;
    return (lng !== 0 || lat !== 0) && !isNaN(lng) && !isNaN(lat);
  };

  const handleContactDonor = (donor) => {
    setSelectedDonor(donor);
    setShowContactModal(true);
  };

  // bloodGroups imported from constants

  if (loadingDonors) {
    return <SkeletonLoader variant="list" />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Available Blood Donors</h1>
        <div className="header-actions">
          <div className="filter-group">
            <label>Filter by Blood Group:</label>
            <select
              className="form-control"
              value={filterBloodGroup}
              onChange={(e) => setFilterBloodGroup(e.target.value)}
            >
              <option value="">All Blood Groups</option>
              {BLOOD_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>
          {!user?.isDonor && (
            <Link to={ROUTE_PATH.DONOR_FORM} className="btn-be-donor">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2C10 2 5 7.5 5 12C5 14.7614 7.23858 17 10 17C12.7614 17 15 14.7614 15 12C15 7.5 10 2 10 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="#fff" />
              </svg>
              Be a Donor
            </Link>
          )}
        </div>
      </div>

      {/* Availability Tabs - Top Row */}
      <div className="donors-tabs-row">
        <div className="tabs-label">Filter by Status:</div>
        <div className="availability-tabs-horizontal">
          <button
            className={`availability-tab-vertical ${availabilityTab === 'available' ? 'active' : ''}`}
            onClick={() => setAvailabilityTab('available')}
            aria-pressed={availabilityTab === 'available'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <div>
              <div className="tab-label">Available to Donate</div>
              <div className="tab-count">{availableDonors.length} donors</div>
            </div>
          </button>
          <button
            className={`availability-tab-vertical ${availabilityTab === 'recently' ? 'active' : ''}`}
            onClick={() => setAvailabilityTab('recently')}
            aria-pressed={availabilityTab === 'recently'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="8" x2="16" y2="16" />
              <line x1="16" y1="8" x2="8" y2="16" />
            </svg>
            <div>
              <div className="tab-label">Recently Donated</div>
              <div className="tab-count">{recentlyDonatedDonors.length} donors</div>
            </div>
          </button>
        </div>
      </div>

      {/* Donor Grid */}
      <div className="donors-grid">
        {donors.length === 0 ? (
          <EmptyState
            title={availabilityTab === 'available' ? "No available donors" : "No recent donations"}
            message={availabilityTab === 'available'
              ? "All verified donors have donated recently. Please check back soon!"
              : 'Check the "Available to Donate" tab to find donors ready to help.'
            }
          />
        ) : (
          donors.map((donor) => {
            const lastDonation = donor.lastDonationDate || donor.donorInfo?.lastDonationDate;
            const nextEligibleDate = lastDonation
              ? new Date(new Date(lastDonation).setMonth(new Date(lastDonation).getMonth() + 3))
              : null;

            return (
              <div key={donor._id} className="donor-card-modern">
                {/* Status Badge for Recently Donated */}
                {availabilityTab === 'recently' && lastDonation && (
                  <div className="donor-status-badge recently-donated">
                    <span>Available again: {nextEligibleDate?.toLocaleDateString()}</span>
                  </div>
                )}

                {/* Profile Image Section */}
                <div className={`donor-image-section ${donorPhotos[donor._id] ? 'has-photo' : ''}`}>
                  {donorPhotos[donor._id] ? (
                    <img
                      src={donorPhotos[donor._id]}
                      alt={`Profile of ${donor.name}`}
                      className="donor-full-image"
                      loading="lazy"
                    />
                  ) : (
                    <div className="donor-profile-image">
                      <svg width="100%" height="100%" viewBox="0 0 200 200" fill="none">
                        <circle cx="100" cy="80" r="40" stroke="white" strokeWidth="4" opacity="0.8" />
                        <path d="M40 180C40 140 65 120 100 120C135 120 160 140 160 180" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="donor-content-section">
                  <div className="donor-info-header">
                    <h3 className="donor-card-name">{donor.name}</h3>
                    <svg className="verified-icon" width="20" height="20" viewBox="0 0 24 24" fill="#10b981">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>

                  <p className="donor-card-description">
                    {donor.isDonor ? 'Verified blood donor committed to saving lives through regular donations' : 'Active donor ready to help in emergencies'}
                  </p>

                  {/* Stats Row */}
                  <div className="donor-card-stats">
                    <div className="stat-item-card">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                      </svg>
                      <span className="stat-value">{donor.donorInfo?.totalDonations || donor.totalDonations || 0}</span>
                    </div>

                    <div className="stat-item-card">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                      </svg>
                      <span className="stat-value">{donor.donorInfo?.eventsAttended || donor.eventsAttended || 0}</span>
                    </div>

                    <span className="blood-group-badge-card">{donor.bloodGroup}</span>

                    {/* Location Button - Show if donor has valid coordinates */}
                    {hasValidLocation(donor) && (
                      <button
                        className="location-btn-card"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLocation({ location: donor.location, name: donor.name });
                        }}
                        title="View Location"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2C9.5 2 7 4 7 7C7 11 12 18 12 18C12 18 17 11 17 7C17 4 14.5 2 12 2Z" />
                          <circle cx="12" cy="7" r="2" />
                        </svg>
                      </button>
                    )}

                    <button
                      className="contact-btn-card"
                      onClick={() => handleContactDonor(donor)}
                    >
                      Contact
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedLocation && (
        <MapModal
          location={selectedLocation.location}
          name={selectedLocation.name}
          onClose={() => setSelectedLocation(null)}
        />
      )}

      {/* Contact Modal */}
      {showContactModal && selectedDonor && (
        <div className="modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowContactModal(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <div className="contact-modal-content">
              <div className="contact-modal-header">
                <div className="contact-avatar">
                  {donorPhotos[selectedDonor._id] ? (
                    <img src={donorPhotos[selectedDonor._id]} alt={selectedDonor.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '50%' }} />
                  ) : (
                    <svg width="60" height="60" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                      <path d="M3 19C3 15.134 6.13401 12 10 12C13.866 12 17 15.134 17 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
                <h2>{selectedDonor.name}</h2>
                <span className="contact-blood-badge">{selectedDonor.bloodGroup}</span>
              </div>

              <div className="contact-details">
                <div className="contact-item">
                  <div className="contact-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 2H7L9 7L6.5 8.5C7.5 10.5 9.5 12.5 11.5 13.5L13 11L18 13V17C18 18.1 17.1 19 16 19C7.716 19 1 12.284 1 4C1 2.9 1.9 2 3 2Z" />
                    </svg>
                  </div>
                  <div className="contact-info">
                    <span className="contact-label">Phone Number</span>
                    <a href={`tel:${selectedDonor.phone}`} className="contact-value">{selectedDonor.phone}</a>
                  </div>
                </div>

                <div className="contact-item">
                  <div className="contact-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 4H17C18.1 4 19 4.9 19 6V14C19 15.1 18.1 16 17 16H3C1.9 16 1 15.1 1 14V6C1 4.9 1.9 4 3 4Z" />
                      <path d="M19 6L10 11L1 6" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="contact-info">
                    <span className="contact-label">Email Address</span>
                    <a href={`mailto:${selectedDonor.email}`} className="contact-value">{selectedDonor.email}</a>
                  </div>
                </div>

                {selectedDonor.address?.city && (
                  <div className="contact-item">
                    <div className="contact-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2C9.5 2 7 4 7 7C7 11 12 18 12 18C12 18 17 11 17 7C17 4 14.5 2 12 2Z" />
                        <circle cx="12" cy="7" r="2" />
                      </svg>
                    </div>
                    <div className="contact-info">
                      <span className="contact-label">Location</span>
                      <span className="contact-value">{selectedDonor.address.city}, {selectedDonor.address.state}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="contact-actions">
                <a href={`tel:${selectedDonor.phone}`} className="btn-call">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 2H7L9 7L6.5 8.5C7.5 10.5 9.5 12.5 11.5 13.5L13 11L18 13V17C18 18.1 17.1 19 16 19C7.716 19 1 12.284 1 4C1 2.9 1.9 2 3 2Z" />
                  </svg>
                  Call Now
                </a>
                <a href={`mailto:${selectedDonor.email}`} className="btn-email">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 4H17C18.1 4 19 4.9 19 6V14C19 15.1 18.1 16 17 16H3C1.9 16 1 15.1 1 14V6C1 4.9 1.9 4 3 4Z" />
                    <path d="M19 6L10 11L1 6" strokeLinecap="round" />
                  </svg>
                  Send Email
                </a>
                {hasValidLocation(selectedDonor) ? (
                  <button
                    className="btn-location"
                    onClick={() => {
                      setShowContactModal(false);
                      setSelectedLocation({ location: selectedDonor.location, name: selectedDonor.name });
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2C9.5 2 7 4 7 7C7 11 12 18 12 18C12 18 17 11 17 7C17 4 14.5 2 12 2Z" />
                      <circle cx="12" cy="7" r="2" />
                    </svg>
                    View on Map
                  </button>
                ) : (
                  <span className="location-not-shared">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2C9.5 2 7 4 7 7C7 11 12 18 12 18C12 18 17 11 17 7C17 4 14.5 2 12 2Z" />
                      <circle cx="12" cy="7" r="2" />
                      <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
                    </svg>
                    Location not shared
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Donors;

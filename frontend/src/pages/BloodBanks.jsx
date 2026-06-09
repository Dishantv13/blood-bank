import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGetAllBloodBanksQuery } from "../store/bloodBankApi";
import { BLOOD_GROUPS } from "../enum/constants";
import { ROUTE_PATH } from "../enum/routePath";
import MapModal from "../components/MapModal";
import SkeletonLoader from "../components/SkeletonLoader";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import {
  FiMapPin,
  FiPhone,
  FiClock,
  FiCheckCircle,
  FiChevronRight,
  FiCompass,
} from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import "../pages.css/BloodBanks.css";

const BloodBanks = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  const page = parseInt(searchParams.get("page")) || 1;
  const limit = parseInt(searchParams.get("limit")) || 10;
  const filterBloodGroup = searchParams.get("bloodGroup") || "";
  const latitude = searchParams.get("latitude") || "";
  const longitude = searchParams.get("longitude") || "";
  const radius = searchParams.get("radius") || ""; // Radius in km

  const params = {
    page,
    limit,
    ...(filterBloodGroup ? { bloodGroup: filterBloodGroup } : {}),
    ...(latitude ? { latitude } : {}),
    ...(longitude ? { longitude } : {}),
    ...(radius ? { maxDistance: Number(radius) * 1000 } : {}),
  };

  // Log active filters as they are applied to the directory search
  useEffect(() => {
    const selectedGroup = filterBloodGroup || "All Blood Groups";
    const selectedDistance = radius ? `Within ${radius} km` : "Any Distance";
    const gpsStatus = latitude && longitude ? "Active" : "Inactive";
  }, [filterBloodGroup, radius, latitude, longitude, page, limit]);

  const { data: bloodBanksRes, isFetching: loadingBloodBanks } =
    useGetAllBloodBanksQuery(params);

  const bloodBanks = bloodBanksRes?.data || [];
  const pagination = bloodBanksRes?.pagination || {
    totalRecords: 0,
    totalPages: 0,
  };

  const handleFilterChange = (value) => {
    setSearchParams((prev) => {
      if (value) {
        prev.set("bloodGroup", value);
      } else {
        prev.delete("bloodGroup");
      }
      prev.set("page", "1"); // Reset to page 1 on filter change
      return prev;
    });
  };

  const handleRadiusChange = (value) => {
    if (value && (!latitude || !longitude)) {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
      }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocating(false);
          setSearchParams((prev) => {
            prev.set("latitude", String(position.coords.latitude));
            prev.set("longitude", String(position.coords.longitude));
            prev.set("radius", value);
            prev.set("page", "1");
            return prev;
          });
        },
        (err) => {
          setLocating(false);
          alert("Location access is required to filter by distance. Please enable browser GPS permissions.");
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
      return;
    }

    setSearchParams((prev) => {
      if (value) {
        prev.set("radius", value);
      } else {
        prev.delete("radius");
      }
      prev.set("page", "1");
      return prev;
    });
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setSearchParams((prev) => {
          prev.set("latitude", String(position.coords.latitude));
          prev.set("longitude", String(position.coords.longitude));
          if (!prev.get("radius")) {
            prev.set("radius", "25"); // Default to 25 km
          }
          prev.set("page", "1");
          return prev;
        });
      },
      (err) => {
        setLocating(false);
        alert("Failed to capture location. Please check browser permissions.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleClearLocation = () => {
    setSearchParams((prev) => {
      prev.delete("latitude");
      prev.delete("longitude");
      prev.delete("radius");
      prev.set("page", "1");
      return prev;
    });
  };

  const handlePageChange = (newPage) => {
    setSearchParams((prev) => {
      prev.set("page", String(newPage));
      return prev;
    });
  };

  const handleLimitChange = (newLimit) => {
    setSearchParams((prev) => {
      prev.set("limit", String(newLimit));
      prev.set("page", "1"); // Reset to page 1 on limit change
      return prev;
    });
  };

  const handleCardClick = (bankId) => {
    navigate(ROUTE_PATH.BLOOD_BANK_PUBLIC_DETAILS.replace(":bankId", bankId));
  };

  return (
    <div className="blood-banks-page">
      <div className="directory-container">
        <header className="directory-header">
          <div className="header-content">
            <h1>Blood Bank Directory</h1>
            <p>
              Find licensed blood donation centers and verify real-time
              inventory.
            </p>
          </div>

          <div className="filter-card flex-filters">
            <div className="filter-item">
              <label htmlFor="blood-group-filter">Filter Availability</label>
              <select
                id="blood-group-filter"
                className="custom-select"
                value={filterBloodGroup}
                onChange={(e) => handleFilterChange(e.target.value)}
              >
                <option value="">All Blood Groups</option>
                {BLOOD_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group} Available
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label htmlFor="radius-filter">Search Radius</label>
              <select
                id="radius-filter"
                className="custom-select"
                value={radius}
                onChange={(e) => handleRadiusChange(e.target.value)}
              >
                <option value="">Any Distance</option>
                <option value="5">Within 5 Km</option>
                <option value="10">Within 10 Km</option>
                <option value="25">Within 25 Km</option>
                <option value="50">Within 50 Km</option>
              </select>
            </div>

            <div className="filter-item action-item">
              <button
                type="button"
                className={`btn-locate-toggle ${latitude && longitude ? "active" : ""}`}
                onClick={handleLocateMe}
                disabled={locating}
              >
                <FiCompass className={`locate-icon ${locating ? "spinning" : ""}`} />
                {locating
                  ? "Locating..."
                  : latitude && longitude
                  ? "📍 Near Me (Active)"
                  : "Locate Near Me"}
              </button>
              {latitude && longitude && (
                <button
                  type="button"
                  className="btn-clear-gps"
                  onClick={handleClearLocation}
                >
                  Clear GPS
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="banks-list">
          {loadingBloodBanks ? (
            <SkeletonLoader variant="list" />
          ) : bloodBanks.length === 0 ? (
            <EmptyState
              title="No centers found"
              message="No blood banks match your current filters. Try selecting a different blood group or resetting location filters."
            />
          ) : (
            <>
              <div className="banks-grid">
                {bloodBanks.map((bank) => (
                  <div
                    key={bank._id}
                    className="professional-bank-card"
                    onClick={() => handleCardClick(bank._id)}
                  >
                    <div className="card-media">
                      <img
                        src={
                          bank.profileImage ||
                          `https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80`
                        }
                        alt={`Facility: ${bank.name}`}
                        className="bank-img"
                        loading="lazy"
                      />
                      <div className="bank-status-chip">
                        <span className="pulse-dot" aria-hidden="true"></span>{" "}
                        Open Now
                      </div>
                    </div>

                    <div className="card-content">
                      <div className="card-top">
                        <div className="bank-info">
                          <h3>{bank.name}</h3>
                          <p className="bank-category">
                            Licensed Medical Facility
                          </p>
                        </div>
                        <div className="bank-rating-box">
                          <span className="rating-star">
                            <FaStar />
                          </span>{" "}
                          4.9
                        </div>
                      </div>

                      <div className="info-bullets">
                        <div className="bullet">
                          <FiMapPin className="bullet-icon" />
                          <span className="bullet-text-bold">
                            {bank.distance !== undefined
                              ? bank.distance < 1000
                                ? `📍 ${bank.distance.toFixed(0)} m away (${bank.address?.city || "Local"})`
                                : `📍 ${(bank.distance / 1000).toFixed(1)} km away (${bank.address?.city || "Local"})`
                              : bank.address?.city || "Local Area"}
                          </span>
                        </div>
                        <div className="bullet">
                          <FiClock className="bullet-icon" />
                          <span>24/7 Emergency Service</span>
                        </div>
                        <div className="bullet">
                          <FiCheckCircle className="bullet-icon" />
                          <span>Government Verified</span>
                        </div>
                      </div>

                      <div className="inventory-preview">
                        <span className="label">Available Stocks:</span>
                        <div className="stock-pills">
                          {bank.inventory && bank.inventory.length > 0 ? (
                            bank.inventory
                              .filter((item) => (item.units || 0) > 0)
                              .slice(0, 4)
                              .map((item) => (
                                <span
                                  key={item.bloodGroup || item.type}
                                  className="stock-pill"
                                >
                                  {item.bloodGroup || item.type}
                                </span>
                              ))
                          ) : (
                            <span className="no-stock">Check details</span>
                          )}
                          {bank.inventory?.length > 4 && (
                            <span className="more-stock">
                              +{bank.inventory.length - 4}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="card-footer">
                        <div className="footer-links">
                          {bank.location?.coordinates && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLocation({
                                  location: bank.location,
                                  name: bank.name,
                                });
                              }}
                              className="btn-map-link"
                            >
                              <FiMapPin /> Map
                            </button>
                          )}
                          <a
                            href={`tel:${bank.phone}`}
                            className="btn-phone-link"
                            onClick={(e) => e.stopPropagation()}
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

              <Pagination
                currentPage={pagination.page || page}
                totalPages={pagination.totalPages}
                totalRecords={pagination.total}
                pageSize={limit}
                onPageChange={handlePageChange}
                onPageSizeChange={handleLimitChange}
              />
            </>
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

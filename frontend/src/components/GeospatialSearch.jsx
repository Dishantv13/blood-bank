import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSearchBloodAvailabilityQuery } from "../store/searchApi";
import { FaTint, FaMapMarkerAlt, FaSearch, FaHospital, FaUser, FaPhone, FaLocationArrow } from "react-icons/fa";
import "../components.css/GeospatialSearch.css";

const GeospatialSearch = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const bloodGroup = searchParams.get("bloodGroup") || "O+";
  const radius = Number(searchParams.get("radius") || "15");
  const searchType = searchParams.get("searchType") || "all";
  const lat = searchParams.get("lat") ? Number(searchParams.get("lat")) : null;
  const lng = searchParams.get("lng") ? Number(searchParams.get("lng")) : null;
  const coords = { lat, lng };

  const [geoStatus, setGeoStatus] = useState(lat && lng ? "success" : "idle"); // idle, detecting, success, error
  const [geoError, setGeoError] = useState("");

  const handleParamChange = (key, value) => {
    setSearchParams((prev) => {
      prev.set(key, String(value));
      return prev;
    });
  };

  // Sync state if URL changes/reloads
  useEffect(() => {
    if (lat && lng) {
      setGeoStatus("success");
    } else {
      setGeoStatus("idle");
    }
  }, [lat, lng]);

  // Log active filters as they are applied to the live search
  useEffect(() => {
    const gpsString = coords.lat && coords.lng 
      ? `(${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)})`
      : "Not yet detected (Waiting for user to click 'Detect Location')";

    console.log(
      `%c[📍 Geospatial Search Filter Changed]%c\n• Blood Group Needed: ${bloodGroup}\n• Search Radius: ${radius} Km\n• Search Source Type: ${searchType}\n• GPS Coordinates: ${gpsString}`,
      "color: #ef4444; font-weight: bold; font-size: 1.1em;",
      "color: inherit; font-weight: normal;"
    );
  }, [bloodGroup, radius, searchType, coords]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      setGeoError("Geolocation is not supported by your browser");
      return;
    }

    setGeoStatus("detecting");
    setGeoError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSearchParams((prev) => {
          prev.set("lat", String(position.coords.latitude));
          prev.set("lng", String(position.coords.longitude));
          return prev;
        });
        setGeoStatus("success");
      },
      (error) => {
        setGeoStatus("error");
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError("Location permission denied. Please enable location access.");
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setGeoError("Location request timed out.");
            break;
          default:
            setGeoError("An unknown error occurred while detecting location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleClearAll = () => {
    setSearchParams((prev) => {
      prev.delete("lat");
      prev.delete("lng");
      prev.delete("bloodGroup");
      prev.delete("radius");
      prev.delete("searchType");
      return prev;
    });
    setGeoStatus("idle");
    setGeoError("");
  };

  const { data: searchResultsRes, isFetching: loadingResults } = useSearchBloodAvailabilityQuery(
    {
      lat: coords.lat,
      lng: coords.lng,
      bloodGroup,
      radius,
      type: searchType,
    },
    { skip: !coords.lat || !coords.lng }
  );

  const results = searchResultsRes?.data?.results || { bloodBanks: [], donors: [] };
  const summary = searchResultsRes?.data?.summary || { totalBanks: 0, totalDonors: 0 };
  const hasSearched = coords.lat && coords.lng;

  return (
    <div className="geo-search-container">
      <div className="geo-search-header">
        <div className="title-wrapper">
          <FaMapMarkerAlt className="header-icon" />
          <div>
            <h2>📍 Live Geospatial Blood Finder</h2>
            <p>Find the closest available blood units at registered banks or from active donors in real-time.</p>
          </div>
        </div>
      </div>

      {/* Query Parameters Form */}
      <div className="geo-search-form">
        <div className="form-group">
          <label htmlFor="geo-blood-group">Blood Group Needed</label>
          <div className="select-wrapper">
            <FaTint className="input-icon danger" />
            <select
              id="geo-blood-group"
              value={bloodGroup}
              onChange={(e) => handleParamChange("bloodGroup", e.target.value)}
            >
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="geo-radius">Search Radius (Km)</label>
          <div className="select-wrapper">
            <FaLocationArrow className="input-icon" />
            <select
              id="geo-radius"
              value={radius}
              onChange={(e) => handleParamChange("radius", e.target.value)}
            >
              <option value={5}>Within 5 Km</option>
              <option value={10}>Within 10 Km</option>
              <option value={15}>Within 15 Km</option>
              <option value={25}>Within 25 Km</option>
              <option value={50}>Within 50 Km</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="geo-type">Availability Source</label>
          <div className="select-wrapper">
            <FaSearch className="input-icon" />
            <select
              id="geo-type"
              value={searchType}
              onChange={(e) => handleParamChange("searchType", e.target.value)}
            >
              <option value="all">Banks & Donors</option>
              <option value="banks">Blood Banks Only</option>
              <option value="donors">Eligible Donors Only</option>
            </select>
          </div>
        </div>

        <div className="form-group form-action">
          <label htmlFor="geo-search-btn" className="btn-label-spacer" style={{ opacity: 0, pointerEvents: "none" }}>Search</label>
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <button
              id="geo-search-btn"
              type="button"
              className={`btn btn-detect ${geoStatus}`}
              onClick={detectLocation}
              disabled={geoStatus === "detecting"}
              style={{ flex: 1 }}
            >
              {geoStatus === "detecting" ? (
                <>
                  <span className="spinner-dot"></span>
                  Detecting...
                </>
              ) : (
                <>
                  <FaMapMarkerAlt />
                  {hasSearched ? "Search" : "Detect"}
                </>
              )}
            </button>
            
            {hasSearched && (
              <button
                type="button"
                className="btn btn-clear-all"
                onClick={handleClearAll}
                title="Clear Search Parameters"
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {geoStatus === "error" && (
        <div className="geo-alert error">
          <p>{geoError}</p>
        </div>
      )}

      {geoStatus === "success" && !hasSearched && (
        <div className="geo-alert success">
          <p>Location detected successfully! Fetching availability...</p>
        </div>
      )}

      {/* Results Rendering */}
      {hasSearched && (
        <div className="geo-results-section">
          {loadingResults ? (
            <div className="geo-loading-state">
              <span className="pulse-loader"></span>
              <p>Scanning surrounding locations for {bloodGroup} units...</p>
            </div>
          ) : (
            <>
              {/* Search Summary Metrics */}
              <div className="geo-summary-bar">
                <span>
                  Found <strong>{summary.totalBanks}</strong> matching Blood Banks and <strong>{summary.totalDonors}</strong> matched Donors within {radius}km.
                </span>
                {coords.lat && (
                  <span className="coords-badge">
                    GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                  </span>
                )}
              </div>

              <div className="results-grids">
                {/* Blood Bank Results */}
                {(searchType === "all" || searchType === "banks") && (
                  <div className="results-column">
                    <h3 className="column-title">
                      <FaHospital /> Blood Banks ({results.bloodBanks?.length || 0})
                    </h3>
                    <div className="cards-stack">
                      {results.bloodBanks?.length === 0 ? (
                        <div className="empty-column-card">
                          <p>No matching blood bank inventory found in this radius.</p>
                        </div>
                      ) : (
                        results.bloodBanks?.map((bank, index) => (
                          <div key={bank.id || index} className="geo-result-card bank-card">
                            <div className="card-top">
                              <h4>{bank.name}</h4>
                              <span className="distance-badge">
                                {bank.distanceKm !== undefined
                                  ? bank.distanceKm < 1
                                    ? `${(bank.distanceKm * 1000).toFixed(0)} m`
                                    : `${bank.distanceKm.toFixed(1)} km`
                                  : "Nearby"}
                              </span>
                            </div>
                            <p className="card-detail">
                              <strong>📍 Address:</strong> {bank.address}
                            </p>
                            <div className="card-footer">
                              <span className="status-indicator online">Available</span>
                              <a href={`tel:${bank.phone}`} className="phone-link">
                                <FaPhone /> {bank.phone || "N/A"}
                              </a>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Donor Results */}
                {(searchType === "all" || searchType === "donors") && (
                  <div className="results-column">
                    <h3 className="column-title">
                      <FaUser /> Active Donors ({results.donors?.length || 0})
                    </h3>
                    <div className="cards-stack">
                      {results.donors?.length === 0 ? (
                        <div className="empty-column-card">
                          <p>No eligible or active donors found in this radius.</p>
                        </div>
                      ) : (
                        results.donors?.map((donor, index) => (
                          <div key={donor.id || index} className="geo-result-card donor-card">
                            <div className="card-top">
                              <h4>{donor.name}</h4>
                              <span className="distance-badge donor">
                                {donor.distanceKm !== undefined
                                  ? donor.distanceKm < 1
                                    ? `${(donor.distanceKm * 1000).toFixed(0)} m`
                                    : `${donor.distanceKm.toFixed(1)} km`
                                  : "Nearby"}
                              </span>
                            </div>
                            <p className="card-detail">
                              <strong>📍 Location:</strong> {donor.city}, {donor.state}
                            </p>
                            <div className="card-footer">
                              <span className="status-indicator eligible">Active & Eligible</span>
                              <a href={`tel:${donor.phone}`} className="phone-link">
                                <FaPhone /> {donor.phone || "N/A"}
                              </a>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GeospatialSearch;

import React from 'react';
import '../components.css/MapModal.css';

const MapModal = ({ location, name, onClose }) => {
  if (!location || !location.coordinates) return null;

  const [lng, lat] = location.coordinates;
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  
  // OpenStreetMap embed URL
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01},${lat-0.01},${lng+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lng}`;

  const handleOverlayClick = (e) => {
    if (e.target.className === 'map-modal-overlay') {
      onClose();
    }
  };

  return (
    <div className="map-modal-overlay" onClick={handleOverlayClick}>
      <div className="map-modal-content">
        <div className="map-modal-header">
          <h3>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{verticalAlign: 'middle', marginRight: '8px'}}>
              <path d="M10 2C7.5 2 5 4 5 7C5 11 10 18 10 18C10 18 15 11 15 7C15 4 12.5 2 10 2Z" stroke="currentColor" strokeWidth="2"/>
              <circle cx="10" cy="7" r="2" stroke="currentColor" strokeWidth="2"/>
            </svg>
            {name}
          </h3>
          <button className="map-modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M5 15L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        
        <div className="map-modal-body">
          <div className="map-container">
            <iframe
              title="Location Map"
              src={osmUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0 }}
              allowFullScreen
            />
          </div>
          
          <div className="map-info">
            <p className="coordinates">
              <strong>Coordinates:</strong> {lat.toFixed(6)}, {lng.toFixed(6)}
            </p>
          </div>
        </div>
        
        <div className="map-modal-footer">
          <a 
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-open-google-maps"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C7.5 2 5 4 5 7C5 11 10 18 10 18C10 18 15 11 15 7C15 4 12.5 2 10 2Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2"/>
              <circle cx="10" cy="7" r="2" stroke="currentColor" strokeWidth="2" fill="white"/>
            </svg>
            Open in Google Maps
          </a>
          <button className="btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapModal;

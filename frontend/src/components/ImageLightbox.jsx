import React from 'react';
import '../components.css/ImageLightbox.css';

const ImageLightbox = ({ image, onClose }) => {
  if (!image) return null;

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('lightbox-overlay')) {
      onClose();
    }
  };

  return (
    <div className="lightbox-overlay" onClick={handleOverlayClick}>
      <button className="lightbox-close" onClick={onClose}>
        <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
          <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      <div className="lightbox-content">
        <img src={image.url} alt={image.alt || 'Preview'} />
        {image.caption && (
          <div className="lightbox-caption">
            <p>{image.caption}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageLightbox;

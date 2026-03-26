import React from 'react';
import '../App.css';

const SkeletonLoader = () => (
  <div className="skeleton-page">
    <div className="skeleton-item skeleton-title">
      <div className="skeleton-shimmer-wrapper"></div>
    </div>
    <div className="skeleton-grid">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-header-row">
            <div className="skeleton-item skeleton-avatar">
              <div className="skeleton-shimmer-wrapper"></div>
            </div>
            <div className="skeleton-item skeleton-line" style={{ width: '150px' }}>
              <div className="skeleton-shimmer-wrapper"></div>
            </div>
          </div>
          <div className="skeleton-item skeleton-img">
            <div className="skeleton-shimmer-wrapper"></div>
          </div>
          <div className="skeleton-item skeleton-line">
            <div className="skeleton-shimmer-wrapper"></div>
          </div>
          <div className="skeleton-item skeleton-line short">
            <div className="skeleton-shimmer-wrapper"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default SkeletonLoader;

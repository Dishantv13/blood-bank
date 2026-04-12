import React from 'react';
import '../App.css';

const SkeletonLoader = ({ variant = 'default' }) => {
  const renderDefault = () => (
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

  const renderDashboard = () => (
    <div className="skeleton-dashboard">
      <div className="skeleton-stats-row">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton-stat-card">
            <div className="skeleton-item skeleton-circle small"></div>
            <div className="skeleton-item skeleton-line" style={{ width: '80px', marginTop: '10px' }}></div>
            <div className="skeleton-item skeleton-line short" style={{ width: '40px' }}></div>
          </div>
        ))}
      </div>
      <div className="skeleton-section-row">
        <div className="skeleton-main-section">
          <div className="skeleton-item skeleton-title" style={{ width: '30%' }}></div>
          <div className="skeleton-table">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton-table-row">
                <div className="skeleton-item skeleton-line"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="skeleton-side-section">
          <div className="skeleton-item skeleton-title" style={{ width: '60%' }}></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-list-item">
              <div className="skeleton-item skeleton-circle small"></div>
              <div className="skeleton-item skeleton-line" style={{ flex: 1 }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderList = () => (
    <div className="skeleton-list-page">
      <div className="skeleton-item skeleton-title" style={{ width: '200px', marginBottom: '30px' }}></div>
      <div className="skeleton-filters">
        <div className="skeleton-item skeleton-line" style={{ width: '150px', height: '40px' }}></div>
        <div className="skeleton-item skeleton-line" style={{ width: '150px', height: '40px' }}></div>
      </div>
      <div className="skeleton-list-items">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton-list-card">
            <div className="skeleton-item skeleton-line" style={{ width: '30%' }}></div>
            <div className="skeleton-item skeleton-line" style={{ width: '70%' }}></div>
            <div className="skeleton-item skeleton-line short"></div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderForm = () => (
    <div className="skeleton-form-page">
      <div className="skeleton-item skeleton-title" style={{ width: '250px', margin: '0 auto 40px' }}></div>
      <div className="skeleton-form-container">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton-form-group">
            <div className="skeleton-item skeleton-line" style={{ width: '100px', marginBottom: '8px' }}></div>
            <div className="skeleton-item skeleton-line" style={{ height: '45px' }}></div>
          </div>
        ))}
        <div className="skeleton-item skeleton-line" style={{ height: '50px', marginTop: '20px' }}></div>
      </div>
    </div>
  );

  switch (variant) {
    case 'dashboard': return renderDashboard();
    case 'list': return renderList();
    case 'form': return renderForm();
    default: return renderDefault();
  }
};

export default SkeletonLoader;

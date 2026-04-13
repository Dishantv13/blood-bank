import React from 'react';
import '../App.css';

const DonationTimeline = ({ donations }) => {
  if (!donations || donations.length === 0) {
    return (
      <div className="timeline-empty">
        <p>No donation history yet. Start your journey by donating blood!</p>
      </div>
    );
  }

  return (
    <div className="donation-timeline grid-view">
      {donations.map((donation, index) => (
        <div key={donation._id || index} className="timeline-card">
          <div className="card-header">
            <span className="card-date">
              {new Date(donation.donationDate || donation.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
            <span className={`status-badge ${donation.status}`}>
              {donation.status.toUpperCase()}
            </span>
          </div>
          <div className="card-body">
            <h4>{donation.bloodBank?.name || donation.camp?.name || 'Authorized Center'}</h4>
            <div className="card-metrics">
              <div className="metric">
                <span className="label">Group</span>
                <span className="value">{donation.bloodGroup}</span>
              </div>
              {donation.volumeDonated > 0 && (
                <div className="metric">
                  <span className="label">Volume</span>
                  <span className="value">{donation.volumeDonated} U</span>
                </div>
              )}
            </div>
            {donation.notes && (
              <p className="card-notes">"{donation.notes}"</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DonationTimeline;

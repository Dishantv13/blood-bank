import React from 'react';
import { FaAward, FaHeart, FaMedal, FaStar, FaShieldAlt } from 'react-icons/fa';

const DonorBadges = ({ donorInfo }) => {
  const { totalDonations = 0, totalDonatedVolume = 0 } = donorInfo || {};

  const BADGES = [
    {
      id: 'first_donation',
      name: 'Life Saver',
      description: 'Completed first donation',
      icon: <FaHeart className="badge-icon-inner" />,
      condition: totalDonations >= 1,
      color: '#ef4444'
    },
    {
      id: 'five_donations',
      name: '5-Time Hero',
      description: 'Completed 5 donations',
      icon: <FaMedal className="badge-icon-inner" />,
      condition: totalDonations >= 5,
      color: '#f59e0b'
    },
    {
      id: 'ten_donations',
      name: 'Legendary Donor',
      description: 'Completed 10 donations',
      icon: <FaAward className="badge-icon-inner" />,
      condition: totalDonations >= 10,
      color: '#8b5cf6'
    },
    {
      id: 'volume_master',
      name: 'Volume Master',
      description: 'Donated more than 2 Liters',
      icon: <FaStar className="badge-icon-inner" />,
      condition: totalDonatedVolume >= 2,
      color: '#3b82f6'
    },
    {
      id: 'elite_donor',
      name: 'Elite Guardian',
      description: 'The pinnacle of contribution',
      icon: <FaShieldAlt className="badge-icon-inner" />,
      condition: totalDonations >= 20,
      color: '#10b981'
    }
  ];

  return (
    <div className="donor-badges-container">
      <div className="badges-grid">
        {BADGES.map((badge) => {
          const isUnlocked = badge.condition;
          return (
            <div 
              key={badge.id} 
              className={`badge-card ${isUnlocked ? 'unlocked' : 'locked'}`}
              title={isUnlocked ? badge.description : `Locked: ${badge.description}`}
            >
              <div 
                className="badge-icon-wrapper"
                style={{ backgroundColor: isUnlocked ? badge.color : '#e5e7eb' }}
              >
                {badge.icon}
              </div>
              <span className="badge-name">{badge.name}</span>
              {!isUnlocked && <div className="lock-overlay">🔒</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DonorBadges;

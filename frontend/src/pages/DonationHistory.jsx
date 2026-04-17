import { useState } from 'react';
import { useGetMyDonationsQuery } from '../store/donationApi';
import DonationTimeline from '../components/DonationTimeline';
import DonorBadges from '../components/DonorBadges';
import CertificateCard from '../components/CertificateCard';
import SkeletonLoader from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';
import { FaHistory, FaMedal, FaCertificate, FaArrowRight } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { ROUTE_PATH } from '../enum/routePath';
import '../pages.css/DonationHistory.css';

const DonationHistory = () => {
  const { user } = useAuth(); 
  const { data, isLoading, isError } = useGetMyDonationsQuery();
  
  const [activeTab, setActiveTab] = useState('timeline');

  if (isLoading) return <SkeletonLoader variant="dashboard" />;
  
  const donations = data?.data || [];
  const completedDonations = donations.filter(d => d.status === 'completed');

  const lastDonationDate = user?.donorInfo?.lastDonationDate;
  const nextDonationDate = lastDonationDate 
    ? new Date(new Date(lastDonationDate).getTime() + 90 * 24 * 60 * 60 * 1000)
    : null;

  return (
    <div className="donation-history-page page-container">
      <header className="history-header">
        <div className="header-titles">
          <h1>My Donation Journey</h1>
          <p>Tracking your impact across {donations.length} total contributions</p>
        </div>
        <div className="stats-mini-grid">
          <div className="stat-pill">
            <span className="stat-value">{user?.donorInfo?.totalDonations || 0}</span>
            <span className="stat-label">Donations</span>
          </div>
          <div className="stat-pill">
            <span className="stat-value">{user?.donorInfo?.totalDonatedVolume || 0}</span>
            <span className="stat-label">Units (L)</span>
          </div>
          <div className="stat-pill highlight">
            <span className="stat-value next-date">
              {nextDonationDate 
                ? nextDonationDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Now Eligible'}
            </span>
            <span className="stat-label">Next Donation</span>
          </div>
        </div>
      </header>

      <div className="history-tabs">
        <button 
          className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          <FaHistory /> Timeline
        </button>
        <button 
          className={`tab-btn ${activeTab === 'badges' ? 'active' : ''}`}
          onClick={() => setActiveTab('badges')}
        >
          <FaMedal /> Achievements
        </button>
        <button 
          className={`tab-btn ${activeTab === 'certificates' ? 'active' : ''}`}
          onClick={() => setActiveTab('certificates')}
        >
          <FaCertificate /> Certificates
        </button>
      </div>

      <main className="tab-content">
        {activeTab === 'timeline' && (
          <section className="timeline-section animate-fade-in">
            <DonationTimeline donations={donations} />
          </section>
        )}

        {activeTab === 'badges' && (
          <section className="badges-section animate-fade-in">
            <h2>Your Honor Gallery</h2>
            <p>Milestones you've reached by being a consistent donor.</p>
            <DonorBadges donorInfo={user?.donorInfo || {}} />
          </section>
        )}

        {activeTab === 'certificates' && (
          <section className="certificates-section animate-fade-in">
            <h2>Official Recognitions</h2>
            <p>Download signed digital certificates for your successful donations.</p>
            <div className="certificates-grid">
              {completedDonations.length > 0 ? (
                completedDonations.map(donation => (
                  <CertificateCard key={donation._id} donation={donation} />
                ))
              ) : (
                <div className="empty-history-notice">
                  <p>No certificates available yet. Complete a donation to receive your first recognition!</p>
                  <Link to={ROUTE_PATH.DONORS} className="primary-btn-outline">
                    Find Donation Centers <FaArrowRight />
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default DonationHistory;

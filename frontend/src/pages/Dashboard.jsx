import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContainer';
import {
  useGetAllRequestsQuery,
  useGetMyRequestsQuery,
} from '../store/requestApi';
import {
  useGetDashboardStatsQuery,
  useToggleModeMutation,
  useUpdateProfileMutation,
  useGetProfileQuery
} from '../store/userApi';
import { useGetAllCampsQuery } from '../store/bloodCampApi';
import { useGetMyDonationsQuery } from '../store/donationApi';
import DonateBloodModal from '../components/DonateBloodModal';
import { ROUTE_PATH } from '../enum/routePath';
import { FaCheckCircle, FaAward, FaHistory, FaTint, FaArrowRight } from 'react-icons/fa';
import '../pages.css/Dashboard.css';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import MatchingRequests from '../components/MatchingRequests';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [message, setMessage] = useState({ type: '', text: '' });

  // RTK Query Hooks replace all the manual useState + useEffect logic
  const {
    data: allRequestsRes,
    isLoading: loadingAllRequests
  } = useGetAllRequestsQuery({ status: 'pending' });

  const {
    data: myRequestsRes,
    isLoading: loadingMyRequests
  } = useGetMyRequestsQuery();

  const {
    data: dashboardStatsRes,
    isLoading: loadingStats
  } = useGetDashboardStatsQuery();

  const [toggleMode, { isLoading: togglingMode }] = useToggleModeMutation();
  const [updateProfile, { isLoading: updatingProfile }] = useUpdateProfileMutation();

  const { data: profileRes, isLoading: loadingProfile } = useGetProfileQuery(undefined, { refetchOnMountOrArgChange: true });

  useEffect(() => {
    const profileData = profileRes?.data;
    if (!profileData) return;

    const isSameUser = user?._id === profileData?._id;
    const isSameVersion = user?.updatedAt && profileData?.updatedAt && user.updatedAt === profileData.updatedAt;

    if (!isSameUser || !isSameVersion) {
      setUser(profileData);
    }
  }, [profileRes?.data, setUser]);

  const requests = allRequestsRes?.data || [];
  const myRequests = myRequestsRes?.data || [];
  const dashboardStats = dashboardStatsRes?.data?.stats || null;

  const { data: myDonationsRes } = useGetMyDonationsQuery(undefined, {
    skip: user?.activeMode !== 'donor' || !user?.isDonor
  });
  const myDonations = myDonationsRes?.data || [];

  const { data: campsRes, isLoading: loadingCamps } = useGetAllCampsQuery({}, {
    skip: !user // ensure we only fetch when authorized
  });

  const camps = campsRes?.data || campsRes?.camps || [];
  const upcomingCamps = camps.filter(c => new Date(c.date) >= new Date()).length;

  // Only show full screen loading for initial data fetch, not for mutations like toggleMode
  const isGlobalLoading = loadingAllRequests || loadingMyRequests || loadingStats || loadingProfile || loadingCamps;

  const [donorStats, setDonorStats] = useState({
    totalDonations: 0,
    eventsAttended: 0,
    bloodDonated: 0,
    lastDonation: null,
    upcomingEvents: 0
  });

  const [showDonorModal, setShowDonorModal] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donorRegistration, setDonorRegistration] = useState({
    registerAsDonor: false,
    availableForDonation: false
  });

  const toast = useToast();

  const fetchDonorStats = useCallback(() => {
    const registeredEvents = dashboardStats?.overview?.registeredEvents || 0;
    const info = user?.donorInfo || {};

    const nextStats = {
      totalDonations: dashboardStats?.overview?.personalStats?.totalDonations || info.totalDonations || 0,
      eventsAttended: registeredEvents,
      bloodDonated: dashboardStats?.overview?.personalStats?.totalDonatedVolume || info.totalDonatedVolume || 0,
      lastDonation: dashboardStats?.overview?.personalStats?.lastDonationDate || info.lastDonationDate || user?.lastDonationDate || null,
      upcomingEvents: dashboardStats?.overview?.upcomingEvents || 0
    };

    setDonorStats((prev) => {
      const unchanged =
        prev.totalDonations === nextStats.totalDonations &&
        prev.eventsAttended === nextStats.eventsAttended &&
        prev.bloodDonated === nextStats.bloodDonated &&
        prev.lastDonation === nextStats.lastDonation &&
        prev.upcomingEvents === nextStats.upcomingEvents;

      return unchanged ? prev : nextStats;
    });
  }, [dashboardStats, user]);

  const lastDonationDate = donorStats.lastDonation;
  const totalBloodDonatedLiters = (() => {
    const raw = Number(donorStats.bloodDonated) || 0;
    // Backward-compatible: if legacy data is stored in mL, convert to L.
    return raw > 50 ? raw / 1000 : raw;
  })();
  const getDonationVolumeLiters = (volume) => {
    const raw = Number(volume) || 0;
    // Backward-compatible: if legacy per-donation volume is in mL, convert to L.
    return raw > 5 ? raw / 1000 : raw;
  };

  let nextEligibleDate = null;
  let isWaitingPeriod = false;

  if (lastDonationDate) {
    const d = new Date(lastDonationDate);
    nextEligibleDate = new Date(d.setMonth(d.getMonth() + 3));
    // Compare by day to avoid timezone / time-of-day edge cases
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    nextEligibleDate.setHours(0, 0, 0, 0);
    isWaitingPeriod = nextEligibleDate > today;
  }

  const isActuallyEligible = user?.donorInfo?.isEligible && !isWaitingPeriod;

  useEffect(() => {
    if (user?.activeMode === 'donor' && user?.isDonor) {
      fetchDonorStats();
    }
  }, [dashboardStats, user?.activeMode, user?.isDonor, fetchDonorStats]);

  const checkProfileCompletion = useCallback(() => {
    if (!user) return;
    const missingFields = [];
    if (!user.phone || user.phone.trim() === '') missingFields.push('Phone Number');
    if (!user.bloodGroup || user.bloodGroup === '') missingFields.push('Blood Group');
    if (!user.address?.city || user.address?.city.trim() === '' || !user.address?.state || user.address?.state.trim() === '') missingFields.push('Address');

    if (missingFields.length > 0) {
      setMessage({
        type: 'warning',
        text: `Please complete your profile! Missing: ${missingFields.join(', ')}. Go to Profile to update.`
      });
    }
  }, [user]);

  useEffect(() => {
    checkProfileCompletion();
  }, [checkProfileCompletion]);

  const handleModeToggle = async () => {
    if (!user) {
      setMessage({ type: 'error', text: 'Please log in to switch modes' });
      return;
    }

    const currentMode = user.activeMode || 'patient';
    const newMode = currentMode === 'donor' ? 'patient' : 'donor';

    if (newMode === 'donor' && !user.isDonor) {
      setShowDonorModal(true);
      return;
    }

    try {
      const response = await toggleMode({ mode: newMode }).unwrap();
      if (response && response.data) {
        setUser(response.data);
        toast.success(`Switched to ${newMode} mode successfully.`);
      }
    } catch (error) {
      console.error('Mode toggle error:', error);
      toast.error(error.data?.message || 'Error occurred while switching mode. Please try again.');
    }
  };

  const handleDonorRegistration = async () => {
    try {
      const updateData = {
        isDonor: true,
        activeMode: 'donor'
      };

      const response = await updateProfile(updateData).unwrap();

      if (response && response.data) {
        setUser(response.data);
        setShowDonorModal(false);
        toast.success('Successfully registered as a donor!');
      }
    } catch (error) {
      console.error('Donor registration error:', error);
      toast.error(error.data?.message || 'Error occurred while registering as a donor. Please try again.');
    }
  };

  if (isGlobalLoading) {
    return <SkeletonLoader variant="dashboard" />;
  }

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <div>
          <h1>Welcome, {user?.name}</h1>
          <p>Manage your blood donations and requests here.</p>
        </div>
        <div className="header-actions">
          <div className="mode-display">
            <span className={`mode-badge mode-${user?.activeMode === 'donor' ? 'donor' : 'patient'}`}>
              Current Mode: {(user?.activeMode || 'patient').toUpperCase()}
            </span>
          </div>
          {user && (
            <button
              className="btn-mode-toggle"
              onClick={handleModeToggle}
              disabled={togglingMode}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M14.5 4.5V2.5M14.5 4.5H16.5M14.5 4.5L11.5 7.5M5.5 15.5V17.5M5.5 15.5H3.5M5.5 15.5L8.5 12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Switch to {(user.activeMode || 'patient') === 'donor' ? 'Patient' : 'Donor'}
            </button>
          )}
          {(user?.activeMode || 'patient') === 'donor' && !user?.isDonor && (
            <Link to={ROUTE_PATH.DONOR_FORM} className="btn btn-donor">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2C10 2 5 7.5 5 12C5 14.7614 7.23858 17 10 17C12.7614 17 15 14.7614 15 12C15 7.5 10 2 10 2Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
              </svg>
              Complete Donor Registration
            </Link>
          )}
          <Link to={ROUTE_PATH.CHANGE_PASSWORD} className="btn btn-secondary">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="9" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M6 9V6C6 3.79086 7.79086 2 10 2C12.2091 2 14 3.79086 14 6V9" stroke="currentColor" strokeWidth="2" />
            </svg>
            Change Password
          </Link>
        </div>
      </div>



      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Mode Specific Stats Blocks */}
      {user?.activeMode === 'donor' && user?.isDonor ? (
        <div className="donor-mode-container">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon-donations" style={{ background: "linear-gradient(135deg, #ef4444, #b91c1c)" }}>
                <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2C10 2 5 7.5 5 12C5 14.7614 7.23858 17 10 17C12.7614 17 15 14.7614 15 12C15 7.5 10 2 10 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="stat-content">
                <h3>{donorStats.totalDonations}</h3>
                <p>Total Donations</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-events" style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>
                <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="4" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M16 2V6M8 2V6M3 10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="stat-content">
                <h3>{donorStats.eventsAttended}</h3>
                <p>Events Attended</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-blood" style={{ background: "linear-gradient(135deg, #dc2626, #7f1d1d)", }}>
                <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
                  <path d="M2 10h4l3-6 4 12 3-6h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="stat-content">
                <h3>{totalBloodDonatedLiters.toFixed(2)}L</h3>
                <p>Total Blood Donated</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-upcoming" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", }}>
                <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" />
                  <path d="M10 5V10L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="stat-content">
                <h3>{donorStats.upcomingEvents}</h3>
                <p>Upcoming Events</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-camps" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                  <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" />
                  <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" />
                  <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <div className="stat-content">
                <h3>{upcomingCamps}</h3>
                <p>Upcoming Camps</p>
              </div>
            </div>
          </div>

          {/* New Prominent Eligibility Banner - Placed in its own row below stats */}
          <div className={`eligibility-banner ${isWaitingPeriod ? 'status-waiting' : 'status-ready'}`}>
            <div className="eligibility-info">
              <div className="eligibility-icon" style={{ background: isWaitingPeriod ? "linear-gradient(135deg, #6b7280, #374151)" : "linear-gradient(135deg, #10b981, #059669)" }}>
                {isWaitingPeriod ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                )}
              </div>
              <div className="eligibility-text">
                <h3>{isWaitingPeriod ? `Next Eligibility: ${nextEligibleDate?.toLocaleDateString()}` : "Ready to Save a Life?"}</h3>
                <p>{isWaitingPeriod ? "You recently made a donation. For your safety, the system requires a 3-month gap between donations." : "You are eligible to donate! Click the button to start your request."}</p>
              </div>
            </div>
            <div className="eligibility-action">
              {isActuallyEligible ? (
                <button className="btn btn-primary" onClick={() => setShowDonateModal(true)}>
                  Request to Donate Now
                </button>
              ) : isWaitingPeriod ? (
                <button className="btn btn-secondary btn-disabled-eligibility" disabled style={{ cursor: 'not-allowed' }}>
                  Eligible on {nextEligibleDate?.toLocaleDateString()}
                </button>
              ) : (
                <Link to={ROUTE_PATH.DONOR_FORM} className="btn btn-primary">
                  Update Health Questionnaire
                </Link>
              )}
            </div>
          </div>

          <div className="donor-dashboard-content">
            <div className="mb-6">
              <MatchingRequests userBloodGroup={user?.bloodGroup} />
            </div>
            <div className="donor-info-card">
              <h2 >Your Donor Journey</h2>
              <div className="donor-journey-stats">
                {donorStats.lastDonation && (
                  <div className="journey-item">
                    <span className="journey-label">Last Donation</span>
                    <span className="journey-value">{new Date(donorStats.lastDonation).toLocaleDateString()}</span>
                  </div>
                )}
                {!donorStats.lastDonation && donorStats.totalDonations === 0 && (
                  <div className="journey-item">
                    <span className="journey-label">Last Donation</span>
                    <span className="journey-value">No donations yet</span>
                  </div>
                )}
                <div className="journey-item">
                  <span className="journey-label">Lives Impacted</span>
                  <span className="journey-value">{donorStats.totalDonations * 3} {donorStats.totalDonations === 0 ? 'People (Start your journey!)' : 'People'}</span>
                </div>
              </div>
            </div>

            <div className="activity-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Recent Donation Activity</h2>
                <span className="muted-meta">
                  Showing latest {Math.min(myDonations.length, 6)} of {myDonations.length}
                </span>
              </div>
              {myDonations.length === 0 ? (
                <EmptyState
                  title={<>Welcome to Your Donor Journey! <FaTint color="#e63946" /></>}
                  message="You haven't made any donation requests yet. Start your life-saving journey today!"
                  actionLabel={isActuallyEligible ? "Request to Donate Now" : null}
                  onAction={isActuallyEligible ? () => setShowDonateModal(true) : null}
                />
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px',
                }}>
                  {[...myDonations]
                    .sort((a, b) => new Date(b.donationDate) - new Date(a.donationDate))
                    .slice(0, 6)
                    .map(donation => (
                      <div key={donation._id} className="request-card" style={{ marginBottom: 0 }}>
                        <div className="request-header">
                          <span className="blood-type-badge">{donation.bloodGroup}</span>
                          <span className={`status-badge status-${donation.status}`}>{donation.status.toUpperCase()}</span>
                        </div>
                        <div className="request-details">
                          <p><strong>Date:</strong> {new Date(donation.donationDate).toLocaleDateString()}</p>
                          {donation.bloodBank && <p><strong>Blood Bank:</strong> {donation.bloodBank.name}</p>}
                          {donation.camp && <p><strong>Camp:</strong> {donation.camp.name}</p>}
                          {donation.status === 'completed' && (
                            <p>
                              <strong>Volume:</strong>{' '}
                              {getDonationVolumeLiters(donation.volumeDonated) > 0
                                ? `${getDonationVolumeLiters(donation.volumeDonated).toFixed(2)}L`
                                : 'Not recorded'}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="patient-mode-container">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon-requests" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}>
                <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2C10 2 5 7.5 5 12C5 14.7614 7.23858 17 10 17C12.7614 17 15 14.7614 15 12C15 7.5 10 2 10 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="stat-content">
                <h3>{requests.length}</h3>
                <p>Active Requests</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-my" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
                  <rect x="6" y="2" width="8" height="14" rx="1" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 2H8C8 0.895 8.895 0 10 0C11.105 0 12 0.895 12 2H12" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 8H12M8 11H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="stat-content">
                <h3>{myRequests.length}</h3>
                <p>My Requests</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-donors" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
                  <circle cx="7" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
                  <circle cx="13" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M1 17C1 13.686 3.686 11 7 11C10.314 11 13 13.686 13 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M7 17C7 13.686 9.686 11 13 11C16.314 11 19 13.686 19 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="stat-content">
                <h3>{dashboardStats?.overview?.totalDonors || 0}</h3>
                <p>Available Donors</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-events" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="4" width="14" height="14" rx="1" stroke="currentColor" strokeWidth="2" />
                  <path d="M3 8H17M7 2V6M13 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="stat-content">
                <h3>{dashboardStats?.overview?.upcomingEvents || 0}</h3>
                <p>Upcoming Events</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-camps" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                  <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" />
                  <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" />
                  <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <div className="stat-content">
                <h3>{upcomingCamps}</h3>
                <p>Upcoming Camps</p>
              </div>
            </div>
          </div>

          {/* New Patient Request Banner - Consistent with Donor Eligibility Banner Layout */}
          <div className="eligibility-banner patient-request-banner">
            <div className="eligibility-info">
              <div className="eligibility-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
              <div className="eligibility-text">
                <h3>Need Blood Urgently?</h3>
                <p>Create a blood request to reach out to available donors. Ensure all details are accurate for faster response.</p>
              </div>
            </div>
            <div className="eligibility-action">
              <Link to={ROUTE_PATH.CREATE_REQUEST} className="btn btn-primary">
                + Create Blood Request
              </Link>
            </div>
          </div>

          {/* Compute charts from myRequests directly */}
          {(() => {
            // Build blood group distribution from myRequests
            const bgMap = {};
            myRequests.forEach(r => {
              if (r.bloodGroup) bgMap[r.bloodGroup] = (bgMap[r.bloodGroup] || 0) + 1;
            });
            const bloodGroupData = Object.entries(bgMap).map(([_id, count]) => ({ _id, count }));

            // Build urgency distribution from myRequests
            const urgMap = {};
            myRequests.forEach(r => {
              if (r.urgency) urgMap[r.urgency] = (urgMap[r.urgency] || 0) + 1;
            });
            const urgencyData = Object.entries(urgMap).map(([_id, count]) => ({ _id, count }));

            if (myRequests.length === 0) return null;

            return (
              <div className="charts-grid-container">
                <div className="chart-card">
                  <h3>Blood Group Distribution</h3>
                  <div className="bar-chart">
                    {bloodGroupData.length > 0 ? (
                      bloodGroupData.map((item, index) => {
                        const maxCount = Math.max(...bloodGroupData.map(i => i.count));
                        const percentage = (item.count / maxCount) * 100;
                        return (
                          <div key={index} className="bar-item">
                            <div className="bar-label">{item._id}</div>
                            <div className="bar-container">
                              <div className="bar-fill" style={{ width: `${percentage}%` }}>
                                <span className="bar-count">{item.count}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p>No data available</p>
                    )}
                  </div>
                </div>
                <div className="chart-card">
                  <h3>Urgency Distribution</h3>
                  <div className="urgency-stats-container">
                    {urgencyData.length > 0 ? (
                      urgencyData.map((item, index) => (
                        <div key={index} className={`urgency-pill ${item._id.toLowerCase()}`}>
                          <span className="u-label">{item._id}</span>
                          <span className="u-count">{item.count}</span>
                        </div>
                      ))
                    ) : (
                      <p className="no-urgency-data">No urgency data yet.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="activity-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>My Recent Blood Requests</h2>
              <Link to={ROUTE_PATH.CREATE_REQUEST} className="btn btn-outline">New Request</Link>
            </div>
            {myRequests.length === 0 ? (
              <EmptyState
                title="No blood requests yet"
                message="You haven't made any blood requests yet. Start by creating your first request to get help."
                actionLabel="Create Your First Request"
                onAction={() => navigate(ROUTE_PATH.CREATE_REQUEST)}
              />
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
              }}>
                {[...myRequests]
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .slice(0, 6)
                  .map(request => (
                    <div key={request._id} className="request-card" style={{ marginBottom: 0 }}>
                      <div className="request-header">
                        <span className="blood-type-badge">{request.bloodGroup}</span>
                        <span className={`status-badge status-${request.status}`}>{request.status.toUpperCase()}</span>
                      </div>
                      <div className="request-details">
                        <p><strong>Patient:</strong> {request.patientName}</p>
                        <p><strong>Urgency:</strong> {request.urgency}</p>
                        <p><strong>Hospital:</strong> {request.hospital?.name || 'N/A'}</p>
                        <p><strong>Requested Date:</strong> {new Date(request.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="request-footer">
                        <Link to={ROUTE_PATH.REQUEST_DETAILS.replace(":requestId", request._id)} className="view-details-link">View Full Details <FaArrowRight style={{ marginLeft: '4px', verticalAlign: 'middle' }} /></Link>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showDonorModal && (
        <div className="modal-overlay" onClick={() => setShowDonorModal(false)}>
          <div className="modal-content donor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Donor Registration</h2>
              <button className="close-modal" onClick={() => setShowDonorModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="modal-description">
                To switch to donor mode, please confirm your registration as a blood donor.
              </p>

              <div className="checkbox-group">
                <label className="checkbox-label required">
                  <input
                    type="checkbox"
                    checked={donorRegistration.registerAsDonor}
                    onChange={(e) => setDonorRegistration({
                      ...donorRegistration,
                      registerAsDonor: e.target.checked
                    })}
                  />
                  <span className="checkbox-text">
                    <strong>Register as a blood donor</strong>
                    <small>I agree to register as a voluntary blood donor</small>
                  </span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  className="btn-cancel"
                  onClick={() => setShowDonorModal(false)}
                  disabled={updatingProfile || togglingMode}
                >
                  Cancel
                </button>
                <button
                  className="btn-submit"
                  onClick={handleDonorRegistration}
                  disabled={updatingProfile || togglingMode || !donorRegistration.registerAsDonor}
                >
                  {(updatingProfile || togglingMode) ? 'Processing...' : 'Confirm & Switch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDonateModal && (
        <DonateBloodModal
          onClose={() => setShowDonateModal(false)}
          onSuccess={() => { toast.success('Your donation request has been sent for approval.'); fetchDonorStats(); }}
        />
      )}
    </div>
  );
};

export default Dashboard;

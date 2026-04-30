import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGetAllBloodBanksQuery } from '../store/bloodBankApi';
import { useGetDonorsQuery } from '../store/userApi';
import ThemeToggle from './ThemeToggle';
import { ROUTE_PATH } from '../enum/routePath';
import NotificationCenter from './NotificationCenter';
import { useGetUnreadCountQuery } from '../store/notificationApi';
import { FaHistory, FaUserEdit } from 'react-icons/fa';

const dropdownItemClass = "dropdown-item";

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  const { data: unreadData } = useGetUnreadCountQuery(undefined, {
    skip: !isAuthenticated,
    pollingInterval: 30000
  });
  const unreadCount = unreadData?.unreadCount || 0;

  const handleLogout = async () => {
    await logout();
    navigate(ROUTE_PATH.LOGIN);
  };

  const skip = !isAuthenticated;
  const { data: bbRes } = useGetAllBloodBanksQuery(undefined, { pollingInterval: 600000, skip });
  const { data: donorsRes } = useGetDonorsQuery({}, { pollingInterval: 600000, skip });

  const getNavLinkClass = ({ isActive }) => (isActive ? 'active' : '');

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to={ROUTE_PATH.HOME} className="navbar-brand">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
            <path d="M10 2C10 2 5 7.5 5 12C5 14.7614 7.23858 17 10 17C12.7614 17 15 14.7614 15 12C15 7.5 10 2 10 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="#ef4444" />
          </svg>
          RaktSarthi
        </Link>


        {isAuthenticated && (
          <>
            {/* Hamburger Menu Button */}
            <button
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-haspopup="true"
            >
              {mobileMenuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              )}
            </button>

            <ul className={`navbar-menu ${mobileMenuOpen ? 'mobile-open' : ''}`}>
              <li>
                <NavLink to={ROUTE_PATH.DASHBOARD} end className={getNavLinkClass}>
                  Dashboard
                </NavLink>
              </li>
              <li>
                <NavLink to={ROUTE_PATH.BLOOD_BANKS} className={getNavLinkClass}>
                  Blood Banks
                </NavLink>
              </li>
              <li>
                <NavLink to={ROUTE_PATH.EVENTS} className={getNavLinkClass}>
                  Events
                </NavLink>
              </li>
              {user?.activeMode !== 'donor' && (
                <>
                  <li>
                    <NavLink to={ROUTE_PATH.DONORS} className={getNavLinkClass}>
                      Find Donors
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to={ROUTE_PATH.CREATE_REQUEST} className={getNavLinkClass}>
                      Request Blood
                    </NavLink>
                  </li>
                </>
              )}
              {user?.activeMode === 'donor' && user?.isDonor && (
                <>
                  <li>
                    <NavLink to={ROUTE_PATH.DONOR_FORM} className={getNavLinkClass}>
                      Donor Profile
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to={ROUTE_PATH.DONATION_HISTORY} className={getNavLinkClass}>
                      Donation History
                    </NavLink>
                  </li>
                </>
              )}
            </ul>
          </>
        )}

        {!isAuthenticated && (
          <ul className={`navbar-menu ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <li>
              <NavLink to={ROUTE_PATH.BLOOD_BANKS} className={getNavLinkClass}>
                Blood Banks
              </NavLink>
            </li>
            <li>
              <NavLink to={ROUTE_PATH.EVENTS} className={getNavLinkClass}>
                Camps
              </NavLink>
            </li>
          </ul>
        )}


        <div className="navbar-actions">
          {/* Theme Toggle is always visible */}
          <ThemeToggle />

          {isAuthenticated && (
            <>
              {/* Notification Bell */}
              <div className="notification-container">
                <button
                  className="notification-btn"
                  onClick={() => setIsNotificationDrawerOpen(true)}
                  aria-label="Notifications"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'white' }}>
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </button>
              </div>

              <NotificationCenter
                isOpen={isNotificationDrawerOpen}
                onClose={() => setIsNotificationDrawerOpen(false)}
              />

              <div className="profile-dropdown">
                <button
                  className="btn btn-outline profile-btn"
                  onClick={() => setShowDropdown(!showDropdown)}
                  aria-haspopup="true"
                  aria-expanded={showDropdown}
                  aria-label="User profile and settings"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="user-name-text">{user?.name || 'Profile'}</span>
                </button>
                {showDropdown && (
                  <>
                    <div className="dropdown-overlay" onClick={() => setShowDropdown(false)}></div>
                    <div className="dropdown-menu">
                      <Link to={ROUTE_PATH.PROFILE} className="dropdown-item" onClick={() => setShowDropdown(false)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        My Profile
                      </Link>
                      {user?.activeMode === 'donor' && user?.isDonor && (
                        <>
                          <Link to={ROUTE_PATH.DONOR_FORM} className={dropdownItemClass} onClick={() => setShowDropdown(false)}>
                            <FaUserEdit /> Donor Profile
                          </Link>
                          <Link to={ROUTE_PATH.DONATION_HISTORY} className={dropdownItemClass} onClick={() => setShowDropdown(false)}>
                            <FaHistory /> Donation History
                          </Link>
                        </>
                      )}
                      <div className="dropdown-divider"></div>
                      <Link to={ROUTE_PATH.BLOOD_BANK_LOGIN} className="dropdown-item" onClick={() => setShowDropdown(false)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        Blood Bank Portal
                      </Link>
                      <div className="dropdown-divider"></div>
                      <button onClick={() => { setShowDropdown(false); handleLogout(); }} className="dropdown-item logout-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {!isAuthenticated && (
            <div className="guest-actions" style={{ display: 'flex', gap: '10px' }}>
              <Link to={ROUTE_PATH.LOGIN} className="btn btn-outline navbar-btn login-btn">
                Login
              </Link>
              <Link to={ROUTE_PATH.BLOOD_BANK_REGISTER} className="btn btn-primary navbar-btn register-btn">
                Register
              </Link>
            </div>
          )}


        </div>
      </div>


      <style>{`
        .navbar-btn {
          padding: 0.6rem 1.4rem !important;
          font-size: 0.95rem !important;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px !important;
          transition: all 0.3s ease !important;
          font-weight: 600 !important;
        }

        .login-btn {
          border: 2px solid white !important;
          color: white !important;
          background: transparent !important;
        }

        .login-btn:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          transform: translateY(-2px);
        }

        .register-btn {
          border: 2px solid white !important;
          color: white !important;
          background: transparent !important;
        }

        .register-btn:hover {
          background: #ef4444 !important;
          color: white !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15) !important;
        }


        .navbar-actions {

          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .profile-dropdown {
          position: relative;
        }
        
        .profile-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: transparent !important;
          border: 1px solid rgba(255, 255, 255, 0.6) !important;
          color: white !important;
          border-radius: 10px !important;
          padding: 0.5rem 1rem !important;
          transition: all 0.3s ease !important;
        }

        .profile-btn:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          border-color: white !important;
        }

        .profile-btn svg {
          color: white !important;
          stroke: white !important;
        }
        
        .dropdown-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 999;
        }
        
        .dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background: var(--card-bg);
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          min-width: 200px;
          padding: 0.5rem;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
          border: 1px solid var(--border-color);
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          color: var(--text-main);
          text-decoration: none;
          border-radius: 8px;
          transition: all 0.2s ease;
          border: none;
          background: none;
          width: 100%;
          font-size: 0.95rem;
          cursor: pointer;
        }
        
        .dropdown-item:hover {
          background: var(--input-bg);
          color: #e63946;
        }
        
        .dropdown-item svg {
          width: 18px;
          height: 18px;
        }
        
        .dropdown-divider {
          height: 1px;
          background: var(--border-color);
          margin: 0.5rem 0;
        }
        
        .logout-item {
          color: #dc2626;
        }
        
        .logout-item:hover {
          background: #fee2e2;
          color: #dc2626;
        }
        
        /* Mobile responsive styles for profile dropdown */
        @media (max-width: 768px) {
          .dropdown-menu {
            position: fixed;
            top: auto;
            bottom: 0;
            left: 0;
            right: 0;
            border-radius: 16px 16px 0 0;
            min-width: 100%;
            padding: 1rem;
            max-height: 70vh;
            overflow-y: auto;
          }
          
          .dropdown-item {
            padding: 1rem;
            font-size: 1rem;
          }
          
          .dropdown-item svg {
            width: 22px;
            height: 22px;
          }
        }
          `}</style>
    </nav>
  );
};

export default Navbar;

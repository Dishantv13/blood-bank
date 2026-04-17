import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTE_PATH } from '../enum/routePath';

const BLOOD_BANK_DASHBOARD_TAB_KEY = 'bloodBankDashboardTab';

const BloodBankSidebar = ({
  bloodBankName = 'Blood Bank',
  activeTab,
  onTabChange,
  mobileMenuOpen = false,
  onCloseMobile,
  variant = 'dashboard',
  onLogout,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isDashboardRoute = location.pathname === ROUTE_PATH.BLOOD_BANK_DASHBOARD;
  const isUnitTrackingRoute = location.pathname === ROUTE_PATH.BLOOD_BANK_UNIT_TRACKING;

  const closeMobileMenu = () => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const navigateToDashboardTab = (tab) => {
    if (variant === 'dashboard' && onTabChange) {
      onTabChange(tab);
    } else {
      localStorage.setItem(BLOOD_BANK_DASHBOARD_TAB_KEY, tab);
      navigate(ROUTE_PATH.BLOOD_BANK_DASHBOARD);
    }

    closeMobileMenu();
  };

  const dashboardTabIcons = {
    overview: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    inventory: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    unit_tracking: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    camps: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    requests: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    donations: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    ),
    bloodbanks: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    events: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    settings: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  };

  const navItems = [
    { key: 'overview', label: 'Overview' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'unit_tracking', label: 'Unit Tracking' },
    { key: 'camps', label: 'Blood Camps' },
    { key: 'requests', label: 'Requests' },
    { key: 'donations', label: 'Donations' },
    { key: 'bloodbanks', label: 'Blood Banks' },
    { key: 'events', label: 'Events' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <aside className={`dashboard-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header1">
        <div className="sidebar-logo">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
        <h2>{bloodBankName || 'Blood Bank'}</h2>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          if (item.key === 'unit_tracking') {
            return (
              <Link
                key={item.key}
                to={ROUTE_PATH.BLOOD_BANK_UNIT_TRACKING}
                className={`nav-item ${isUnitTrackingRoute ? 'active' : ''}`}
                style={{ textDecoration: 'none' }}
                onClick={closeMobileMenu}
              >
                {dashboardTabIcons.unit_tracking}
                <span>{item.label}</span>
              </Link>
            );
          }

          const isActive = isDashboardRoute && activeTab === item.key;

          return (
            <button
              key={item.key}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => navigateToDashboardTab(item.key)}
            >
              {dashboardTabIcons[item.key]}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" type="button" onClick={onLogout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
};

export default BloodBankSidebar;
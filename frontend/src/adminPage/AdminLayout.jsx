import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ROUTE_PATH } from '../enum/routePath';
import { 
  FiHome, FiUsers, FiActivity, FiMapPin, FiCalendar, 
  FiClipboard, FiPackage, FiBarChart2, FiLogOut, 
  FiMenu, FiX, FiBell, FiSettings, FiMoon, FiSun, FiHeart, FiArrowLeft
} from 'react-icons/fi';
import '../adminPage.css/AdminPremium.css';

const AdminLayout = () => {
  const isInitialMobile = typeof window !== 'undefined' && window.innerWidth <= 1024;
  const isInitialCompact = typeof window !== 'undefined' && window.innerWidth > 768 && window.innerWidth <= 1200;
  const [isDesktopSidebarExpanded, setDesktopSidebarExpanded] = useState(true);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(isInitialMobile);
  const [isCompactView, setIsCompactView] = useState(isInitialCompact);
  const { adminUser, logoutAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isLargeView = !isMobileView && !isCompactView;
  const isSidebarOpen = isMobileView ? isMobileSidebarOpen : isLargeView ? isDesktopSidebarExpanded : false;
  const showSidebarLabels = isMobileView ? isMobileSidebarOpen : isLargeView ? isDesktopSidebarExpanded : false;

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width <= 768;
      const compact = width > 768 && width <= 1200;
      setIsMobileView(mobile);
      setIsCompactView(compact);
      if (!mobile) {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobileView) {
      setMobileSidebarOpen(false);
    }
  }, [location.pathname, isMobileView]);

  const handleSidebarToggle = () => {
    if (isMobileView) {
      setMobileSidebarOpen((prev) => !prev);
      return;
    }
    if (isCompactView) {
      return;
    }
    setDesktopSidebarExpanded((prev) => !prev);
  };

  const handleLogout = async () => {
    await logoutAdmin();
    navigate(ROUTE_PATH.ADMIN_LOGIN);
  };

  const navItems = [
    { title: 'Dashboard', icon: <FiHome />, path: ROUTE_PATH.ADMIN_DASHBOARD },
    { title: 'Users', icon: <FiUsers />, path: ROUTE_PATH.ADMIN_USERS },
    { title: 'Blood Banks', icon: <FiActivity />, path: ROUTE_PATH.ADMIN_BLOOD_BANKS },
    { title: 'Camps', icon: <FiMapPin />, path: ROUTE_PATH.ADMIN_CAMPS },
    { title: 'Events', icon: <FiCalendar />, path: ROUTE_PATH.ADMIN_EVENTS },
    { title: 'Requests', icon: <FiClipboard />, path: ROUTE_PATH.ADMIN_REQUESTS },
    { title: 'Donations', icon: <FiClipboard />, path: ROUTE_PATH.ADMIN_DONATIONS },
    { title: 'Inventory', icon: <FiPackage />, path: ROUTE_PATH.ADMIN_INVENTORY },
    { title: 'Reports', icon: <FiBarChart2 />, path: ROUTE_PATH.ADMIN_EXPORTS },
  ];

  // Get current page title
  const currentItem = navItems.find(item => 
    location.pathname === item.path || (item.path !== ROUTE_PATH.ADMIN_DASHBOARD && location.pathname.startsWith(item.path))
  );
  const pageTitle = currentItem ? currentItem.title : 'Admin Panel';

  return (
    <div className="admin-premium-root">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : 'closed'} fade-in-up`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon"><FiHeart /></div>
            {isSidebarOpen && <span className="logo-text">BloodBank Admin</span>}
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            // Check if current path is item path OR a subpath of it
            const isActive = location.pathname === item.path || 
              (item.path !== ROUTE_PATH.ADMIN_DASHBOARD && location.pathname.startsWith(item.path));
              
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''} ${showSidebarLabels ? '' : 'nav-tooltip'}`}
                style={{ justifyContent: isSidebarOpen ? 'flex-start' : 'center', padding: isSidebarOpen ? '10px 1.25rem' : '10px 0' }}
                data-tooltip={showSidebarLabels ? undefined : item.title}
                title={showSidebarLabels ? undefined : item.title}
                onClick={() => {
                  if (isMobileView) {
                    setMobileSidebarOpen(false);
                  }
                }}
              >
                <div className="nav-icon">{item.icon}</div>
                {showSidebarLabels && <span className="nav-title">{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout}>
            <FiLogOut />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main-content">
        <header className="admin-top-bar fade-in-up">
          <div className="top-bar-left">
            {(isMobileView || isLargeView) && (
              <button className="sidebar-toggle" onClick={handleSidebarToggle}>
                {isMobileView && isMobileSidebarOpen ? <FiX /> : <FiMenu />}
              </button>
            )}
            {location.pathname !== currentItem?.path && (
               <button className="back-btn tooltip" data-tooltip="Go Back" onClick={() => navigate(-1)}>
                 <FiArrowLeft />
               </button>
            )}
            <div className="top-bar-breadcrumb">
               <span className="breadcrumb-root">Admin</span>
               <span className="breadcrumb-divider">/</span>
               <span className="breadcrumb-current">{pageTitle}</span>
            </div>
          </div>
          
          <div className="top-bar-right">
            <div className="admin-actions">
              <button 
                className="icon-btn tooltip" 
                data-tooltip={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                onClick={toggleTheme}
              >
                {theme === 'light' ? <FiMoon /> : <FiSun />}
              </button>
              <button className="icon-btn tooltip" data-tooltip="Notifications">
                <FiBell />
                <span className="notification-dot"></span>
              </button>
              <button className="icon-btn tooltip" data-tooltip="Settings">
                <FiSettings />
              </button>
            </div>
            
            <div className="admin-profile-info">
              <div className="admin-avatar">
                {adminUser?.name?.charAt(0) || 'A'}
              </div>
              <div className="admin-details">
                <span className="admin-name">{adminUser?.name || 'Super Admin'}</span>
                <span className="admin-role">System Administrator</span>
              </div>
            </div>
          </div>
        </header>

        <section className="admin-page-body fade-in-up" key={location.pathname}>
          <Outlet />
        </section>
      </main>

      {isMobileView && isMobileSidebarOpen && (
        <button
          type="button"
          className="admin-sidebar-overlay"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}
    </div>
  );
};

export default AdminLayout;

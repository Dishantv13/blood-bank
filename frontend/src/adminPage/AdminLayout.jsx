import React, { useState } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTE_PATH } from '../enum/routePath';
import { 
  FiHome, FiUsers, FiActivity, FiMapPin, FiCalendar, 
  FiClipboard, FiPackage, FiBarChart2, FiLogOut, 
  FiMenu, FiX
} from 'react-icons/fi';
import '../adminPage.css/AdminPremium.css';

const AdminLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const { adminUser, logoutAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  return (
    <div className="admin-premium-root">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon">🩸</div>
            <span className="logo-text">BloodBank Admin</span>
          </div>
          <button className="sidebar-toggle-mobile" onClick={() => setSidebarOpen(false)}>
            <FiX />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-title">{item.title}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout}>
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main-content">
        <header className="admin-top-bar">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!isSidebarOpen)}>
            <FiMenu />
          </button>
          
          <div className="top-bar-right">
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

        <section className="admin-page-body">
          <Outlet />
        </section>
      </main>

      {/* Mobile Overlay */}
      {!isSidebarOpen && (
        <button className="sidebar-open-mobile" onClick={() => setSidebarOpen(true)}>
          <FiMenu />
        </button>
      )}
    </div>
  );
};

export default AdminLayout;

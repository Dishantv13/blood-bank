import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { ROUTE_PATH } from '../enum/routePath';
import { useGetDashboardStatsQuery } from '../store/adminApi.js';
import { 
  FiUsers, FiActivity, FiMapPin, FiCalendar, 
  FiClipboard, FiPackage, FiBarChart2, FiArrowRight 
} from 'react-icons/fi';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useGetDashboardStatsQuery();

  const cards = [
    {
      title: 'Users',
      description: 'Manage all user records and statuses',
      icon: <FiUsers />,
      path: ROUTE_PATH.ADMIN_USERS,
      stat: stats?.activeUsers,
      color: '#4f46e5',
      trend: '+12% from last month'
    },
    {
      title: 'Blood Banks',
      description: 'Monitor banks and inventory',
      icon: <FiActivity />,
      path: ROUTE_PATH.ADMIN_BLOOD_BANKS,
      stat: stats?.activeBloodBanks,
      color: '#ec4899',
      trend: '+5% new partners'
    },
    {
      title: 'Camps',
      description: 'Review all registered camps',
      icon: <FiMapPin />,
      path: ROUTE_PATH.ADMIN_CAMPS,
      stat: stats?.activeCamps,
      color: '#10b981',
      trend: '3 upcoming today'
    },
    {
      title: 'Inventory',
      description: 'Monitor blood stock levels',
      icon: <FiPackage />,
      path: ROUTE_PATH.ADMIN_INVENTORY,
      stat: stats?.totalBloodInventory,
      color: '#f59e0b',
      trend: 'Low stock alerts: 2'
    },
  ];

  const shortcuts = [
    {
      title: 'Manage Events',
      description: 'Schedule and oversee blood donor events across all banks.',
      icon: <FiCalendar />,
      path: ROUTE_PATH.ADMIN_EVENTS,
    },
    {
      title: 'Blood Requests',
      description: 'Approve and manage life-saving blood requests for hospitals.',
      icon: <FiClipboard />,
      path: ROUTE_PATH.ADMIN_REQUESTS,
    },
    {
      title: 'Donation Reports',
      description: 'Track all successful donations and donor certificates.',
      icon: <FiClipboard />,
      path: ROUTE_PATH.ADMIN_DONATIONS,
    },
    {
      title: 'Export Center',
      description: 'Generate detailed CSV/Excel reports for compliance.',
      icon: <FiBarChart2 />,
      path: ROUTE_PATH.ADMIN_EXPORTS,
    },
  ];

  return (
    <>
      <div className="dashboard-header-premium">
        <h1 className="page-title">Admin Command Center</h1>
        <p className="page-subtitle">A professional overview of the entire blood bank ecosystem.</p>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="loader"></div>
          <p>Analyzing system data...</p>
        </div>
      ) : (
        <>
          <div className="dashboard-premium-grid">
            {cards.map((card) => (
              <div key={card.title} className="stat-card-premium" onClick={() => navigate(card.path)}>
                <div className="stat-label-row">
                  <span>{card.title}</span>
                  <div className="stat-icon-bg" style={{ backgroundColor: `${card.color}20`, color: card.color }}>
                    {card.icon}
                  </div>
                </div>
                <div className="stat-value">{card.stat || '0'}</div>
                <div className="stat-trend trend-up">
                  {card.trend}
                </div>
              </div>
            ))}
          </div>

          <h2 className="section-title">Quick Operations</h2>
          <div className="admin-shortcuts">
            {shortcuts.map((item) => (
              <div key={item.title} className="shortcut-card" onClick={() => navigate(item.path)}>
                <div className="shortcut-icon">
                  {item.icon}
                </div>
                <div className="shortcut-info">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <div className="shortcut-arrow">
                  <FiArrowRight />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
};

export default AdminDashboard;

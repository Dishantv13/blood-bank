import { useNavigate } from "react-router-dom";
import { ROUTE_PATH } from "../enum/routePath";
import { useGetDashboardStatsQuery } from "../store/adminApi.js";
import {
  FiUsers,
  FiActivity,
  FiMapPin,
  FiCalendar,
  FiClipboard,
  FiPackage,
  FiBarChart2,
  FiArrowRight,
  FiTrendingUp,
} from "react-icons/fi";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useGetDashboardStatsQuery();

  const cards = [
    {
      title: "Active Users",
      description: "Manage all user records and statuses",
      icon: <FiUsers />,
      path: ROUTE_PATH.ADMIN_USERS,
      stat: stats?.activeUsers,
      color: "#f43f5e",
      trend: "+12% from last month",
    },
    {
      title: "Blood Banks",
      description: "Monitor banks and inventory",
      icon: <FiActivity />,
      path: ROUTE_PATH.ADMIN_BLOOD_BANKS,
      stat: stats?.activeBloodBanks,
      color: "#8b5cf6",
      trend: "+5% new partners",
    },
    {
      title: "Active Camps",
      description: "Review all registered camps",
      icon: <FiMapPin />,
      path: ROUTE_PATH.ADMIN_CAMPS,
      stat: stats?.activeCamps,
      color: "#10b981",
      trend: "3 upcoming today",
    },
    {
      title: "Total Stock",
      description: "Monitor blood stock levels",
      icon: <FiPackage />,
      path: ROUTE_PATH.ADMIN_INVENTORY,
      stat: stats?.totalBloodInventory,
      color: "#f59e0b",
      trend: "Low stock alerts: 2",
    },
  ];

  const shortcuts = [
    {
      title: "Manage Events",
      description: "Schedule and oversee blood donor events across all banks.",
      icon: <FiCalendar />,
      path: ROUTE_PATH.ADMIN_EVENTS,
    },
    {
      title: "Blood Requests",
      description:
        "Approve and manage life-saving blood requests for hospitals.",
      icon: <FiClipboard />,
      path: ROUTE_PATH.ADMIN_REQUESTS,
    },
    {
      title: "Donation Reports",
      description: "Track all successful donations and donor certificates.",
      icon: <FiClipboard />,
      path: ROUTE_PATH.ADMIN_DONATIONS,
    },
    {
      title: "Export Center",
      description: "Generate detailed CSV/Excel reports for compliance.",
      icon: <FiBarChart2 />,
      path: ROUTE_PATH.ADMIN_EXPORTS,
    },
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-premium fade-in-up">
        <h1 className="page-title">Admin Command Center</h1>
        <p className="page-subtitle">
          A high-performance overview of the entire blood bank ecosystem.
        </p>
      </div>

      {isLoading ? (
        <div className="loading-state fade-in-up">
          <div className="loader"></div>
          <p>Analyzing system data...</p>
        </div>
      ) : (
        <>
          <div className="dashboard-premium-grid">
            {cards.map((card, index) => (
              <div
                key={card.title}
                className="stat-card-premium fade-in-up"
                onClick={() => navigate(card.path)}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="stat-label-row">
                  <span>{card.title}</span>
                  <div
                    className="stat-icon-bg"
                    style={{ background: `${card.color}15`, color: card.color }}
                  >
                    {card.icon}
                  </div>
                </div>
                <div className="stat-value">{card.stat || "0"}</div>
                <div className="stat-trend trend-up">
                  <FiTrendingUp /> {card.trend}
                </div>
              </div>
            ))}
          </div>

          <h2
            className="section-title fade-in-up"
            style={{ animationDelay: "400ms" }}
          >
            <FiActivity /> Quick Operations
          </h2>
          <div className="admin-shortcuts">
            {shortcuts.map((item, index) => (
              <div
                key={item.title}
                className="shortcut-card fade-in-up"
                onClick={() => navigate(item.path)}
                style={{ animationDelay: `${500 + index * 100}ms` }}
              >
                <div className="shortcut-icon">{item.icon}</div>
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
    </div>
  );
};

export default AdminDashboard;

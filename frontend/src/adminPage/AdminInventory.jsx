import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTE_PATH } from "../enum/routePath";
import { useGetInventoryOverviewQuery } from "../store/adminApi.js";
import AdminTable from "./AdminTable.jsx";
import { usePaginationParams } from "../hooks/usePaginationParams.js";
import SearchFilter from "../components/SearchFilter.jsx";

const AdminInventory = () => {
  const navigate = useNavigate();
  const { page, limit, setPage, setLimit } = usePaginationParams(10);
  const [filters, setFilters] = useState({ search: "", bloodType: "" });

  const { data: inventoryData, isLoading } = useGetInventoryOverviewQuery({
    page,
    limit,
    ...filters,
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSearch = (value) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setPage(1);
  };

  const columns = [
    { key: "bloodBank", label: "Blood Bank", width: "35%" },
    { key: "totalUnits", label: "Total Units", width: "20%" },
    { key: "bloodTypeCount", label: "Blood Types", width: "20%" },
    {
      key: "lastUpdated",
      label: "Last Updated",
      width: "25%",
      render: (date) => (date ? new Date(date).toLocaleDateString() : "N/A"),
    },
  ];

  return (
    <div className="admin-inventory-page">
      <div className="dashboard-header-premium">
        <h1 className="page-title">Inventory Management</h1>
        <p className="page-subtitle">
          View and monitor blood inventory across all banks
        </p>
      </div>

      {/* {inventoryData?.stats && (
        <div className="dashboard-premium-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card-premium">
            <div className="stat-label-row"><span>Total Units</span></div>
            <p className="stat-value">{inventoryData.stats.totalUnits}</p>
          </div>
          <div className="stat-card-premium">
            <div className="stat-label-row"><span>Expiring Soon</span></div>
            <p className="stat-value" style={{ color: '#f59e0b' }}>{inventoryData.stats.expiringSoon}</p>
          </div>
          <div className="stat-card-premium">
            <div className="stat-label-row"><span>Expired</span></div>
            <p className="stat-value" style={{ color: '#ef4444' }}>{inventoryData.stats.expired}</p>
          </div>
        </div>
      )} */}

      <div className="filters-panel">
        <SearchFilter
          placeholder="Search by blood bank..."
          onSearch={handleSearch}
          initialValue={filters.search}
        />
        <select
          value={filters.bloodType}
          onChange={(e) => handleFilterChange("bloodType", e.target.value)}
          className="filter-select"
        >
          <option value="">All Blood Types</option>
          <option value="A+">A+</option>
          <option value="A-">A-</option>
          <option value="B+">B+</option>
          <option value="B-">B-</option>
          <option value="AB+">AB+</option>
          <option value="AB-">AB-</option>
          <option value="O+">O+</option>
          <option value="O-">O-</option>
        </select>
      </div>

      <AdminTable
        columns={columns}
        data={inventoryData?.data || []}
        isLoading={isLoading}
        onRowClick={(row) =>
          navigate(
            ROUTE_PATH.ADMIN_INVENTORY_DETAILS.replace(":inventoryId", row._id),
          )
        }
        pagination={inventoryData?.pagination}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
      />
    </div>
  );
};

export default AdminInventory;

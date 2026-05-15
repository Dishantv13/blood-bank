import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTE_PATH } from "../enum/routePath";
import { useGetAllBloodBanksQuery } from "../store/adminApi.js";
import AdminTable from "./AdminTable.jsx";
import { usePaginationParams } from "../hooks/usePaginationParams.js";
import SearchFilter from "../components/SearchFilter.jsx";

const AdminEvents = () => {
  const navigate = useNavigate();
  const { page, limit, setPage, setLimit } = usePaginationParams(10);
  const [filters, setFilters] = useState({ search: "", status: "" });

  const { data: banksData, isLoading } = useGetAllBloodBanksQuery({
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
    { key: "name", label: "Blood Bank", width: "30%" },
    { key: "email", label: "Email", width: "25%" },
    { key: "city", label: "City", width: "15%" },
    { key: "state", label: "State", width: "15%" },
    {
      key: "status",
      label: "Status",
      width: "15%",
      render: (status) => (
        <span className={`status-badge ${status}`}>
          {status?.toUpperCase()}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="dashboard-header-premium">
        <h1 className="page-title">Event Management</h1>
        <p className="page-subtitle">
          View and monitor blood events across all banks
        </p>
      </div>

      <div className="filters-panel">
        <SearchFilter
          placeholder="Search blood bank by name, email, or city..."
          onSearch={handleSearch}
          initialValue={filters.search}
        />
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <AdminTable
        columns={columns}
        data={banksData?.data || []}
        isLoading={isLoading}
        onRowClick={(row) =>
          navigate(ROUTE_PATH.ADMIN_EVENTS_BY_BANK.replace(":bankId", row._id))
        }
        pagination={banksData?.pagination}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
      />
    </>
  );
};

export default AdminEvents;

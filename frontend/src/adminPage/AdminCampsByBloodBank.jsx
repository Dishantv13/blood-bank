import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetCampsByBloodBankQuery } from "../store/adminApi.js";
import AdminTable from "./AdminTable.jsx";
import { usePaginationParams } from "../hooks/usePaginationParams.js";
import SearchFilter from "../components/SearchFilter.jsx";

const AdminCampsByBloodBank = () => {
  const navigate = useNavigate();
  const { bankId } = useParams();
  const { page, limit, setPage, setLimit } = usePaginationParams(10);
  const [filters, setFilters] = useState({ search: "", status: "" });

  const { data: campsData, isLoading } = useGetCampsByBloodBankQuery(
    {
      bankId,
      page,
      limit,
      ...filters,
    },
    {
      skip: !bankId,
    },
  );

  const bloodBankName = useMemo(() => {
    const first = campsData?.data?.[0];
    return first?.bloodBankName || "Selected Blood Bank";
  }, [campsData]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSearch = (value) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setPage(1);
  };

  const columns = [
    { key: "name", label: "Camp Name", width: "24%" },
    { key: "location", label: "Location", width: "28%" },
    {
      key: "startDate",
      label: "Date",
      width: "18%",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      key: "status",
      label: "Status",
      width: "18%",
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
        <h1 className="page-title">Camp Management Details</h1>
        <p className="page-subtitle">
          View and monitor blood camps for: {bloodBankName}
        </p>
      </div>

      <div className="filters-panel">
        <SearchFilter
          placeholder="Search by camp name or location..."
          onSearch={handleSearch}
          initialValue={filters.search}
        />
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <AdminTable
        columns={columns}
        data={campsData?.data || []}
        isLoading={isLoading}
        pagination={campsData?.pagination}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
      />
    </>
  );
};

export default AdminCampsByBloodBank;

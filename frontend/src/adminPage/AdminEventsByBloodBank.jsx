import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ROUTE_PATH } from "../enum/routePath";
import { useGetEventsByBloodBankQuery } from "../store/adminApi.js";
import AdminTable from "./AdminTable.jsx";


const AdminEventsByBloodBank = () => {
  const navigate = useNavigate();
  const { bankId } = useParams();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ search: "", status: "" });

  const { data: eventsData, isLoading } = useGetEventsByBloodBankQuery(
    {
      bankId,
      page,
      limit: 10,
      ...filters,
    },
    {
      skip: !bankId,
    },
  );

  const bloodBankName = useMemo(() => {
    const first = eventsData?.data?.[0];
    return first?.bloodBankName || "Selected Blood Bank";
  }, [eventsData]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmedSearch = searchInput.trim();
      setFilters((prev) => (prev.search === trimmedSearch ? prev : { ...prev, search: trimmedSearch }));
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const columns = [
    { key: "name", label: "Event Name", width: "24%" },
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
        <h1 className="page-title">Event Management Details</h1>
        <p className="page-subtitle">View and monitor blood events for: {bloodBankName}</p>
      </div>

      <div className="filters-panel">
        <input
          type="text"
          placeholder="Search by event name or location..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="filter-input"
        />
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <AdminTable
        columns={columns}
        data={eventsData?.data || []}
        isLoading={isLoading}
        pagination={eventsData?.pagination}
        onPageChange={setPage}
      />
    </>
  );
};

export default AdminEventsByBloodBank;

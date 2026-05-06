import { useEffect, useState } from "react";
import {
  useGetAllUsersQuery,
  useUpdateUserStatusMutation,
} from "../store/adminApi.js";
import AdminTable from "./AdminTable.jsx";

const AdminUsers = () => {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    bloodType: "",
  });
  const [updateUserStatus] = useUpdateUserStatusMutation();

  const { data: usersData, isLoading } = useGetAllUsersQuery({
    page,
    limit: 10,
    ...filters,
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmedSearch = searchInput.trim();
      setFilters((prev) =>
        prev.search === trimmedSearch
          ? prev
          : { ...prev, search: trimmedSearch },
      );
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const columns = [
    { key: "name", label: "Name", width: "15%" },
    { key: "email", label: "Email", width: "20%" },
    { key: "mobileNumber", label: "Phone", width: "15%" },
    { key: "bloodType", label: "Blood Type", width: "10%" },
    { key: "requestCount", label: "Blood Requests", width: "10%" },
    { key: "donationCount", label: "Donations", width: "10%" },
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
        <h1 className="page-title">User Management</h1>
        <p className="page-subtitle">
          View and manage all system users and their donation history.
        </p>
      </div>

      <div className="filters-panel">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
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
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
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
        data={usersData?.data || []}
        isLoading={isLoading}
        pagination={usersData?.pagination}
        onPageChange={setPage}
      />
    </>
  );
};

export default AdminUsers;

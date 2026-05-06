import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTE_PATH } from "../enum/routePath";
import { useGetAllUsersQuery } from "../store/adminApi.js";
import AdminTable from "./AdminTable.jsx";

const AdminDonations = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "" });

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
    { key: "name", label: "User Name", width: "24%" },
    { key: "email", label: "Email", width: "24%" },
    { key: "mobileNumber", label: "Phone", width: "16%" },
    { key: "donationCount", label: "Donations", width: "12%" },
    {
      key: "status",
      label: "Status",
      width: "12%",
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
        <h1 className="page-title">Donation Management</h1>
        <p className="page-subtitle">
          Select a user to view their donation records
        </p>
      </div>

      <div className="filters-panel">
        <input
          type="text"
          placeholder="Search user by name, email, or phone..."
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
      </div>

      <AdminTable
        columns={columns}
        data={usersData?.data || []}
        isLoading={isLoading}
        onRowClick={(row) =>
          navigate(
            ROUTE_PATH.ADMIN_DONATIONS_BY_USER.replace(":userId", row._id),
          )
        }
        pagination={usersData?.pagination}
        onPageChange={setPage}
      />
    </>
  );
};

export default AdminDonations;

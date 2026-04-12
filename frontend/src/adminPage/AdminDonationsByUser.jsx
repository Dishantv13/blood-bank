import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTE_PATH } from '../enum/routePath';
import { useGetAllDonationsQuery, useGetUserByIdQuery } from '../store/adminApi.js';
import AdminTable from './AdminTable.jsx';

const AdminDonationsByUser = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ search: '', status: '', bloodType: '' });

  const { data: userData } = useGetUserByIdQuery(userId, { skip: !userId });
  const { data: donationsData, isLoading } = useGetAllDonationsQuery(
    {
      userId,
      page,
      limit: 10,
      ...filters,
    },
    {
      skip: !userId,
    }
  );

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
    { key: 'donorName', label: 'Donor Name', width: '24%' },
    { key: 'bloodType', label: 'Blood Type', width: '16%' },
    { key: 'quantity', label: 'Quantity (ml)', width: '16%' },
    {
      key: 'donationDate',
      label: 'Donation Date',
      width: '22%',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      key: 'status',
      label: 'Status',
      width: '22%',
      render: (status) => <span className={`status-badge ${status}`}>{status?.toUpperCase()}</span>,
    },
  ];

  const userName = userData?.data?.name || 'Selected User';

  return (
    <>
      <div className="dashboard-header-premium">
        <h1 className="page-title">Donation Management Details</h1>
        <p className="page-subtitle">View and manage donation records for: {userName}</p>
      </div>

      <div className="filters-panel">
        <input
          type="text"
          placeholder="Search by donor name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="filter-input"
        />
        <select
          value={filters.bloodType}
          onChange={(e) => handleFilterChange('bloodType', e.target.value)}
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
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <AdminTable
        columns={columns}
        data={donationsData?.data || []}
        isLoading={isLoading}
        pagination={donationsData?.pagination}
        onPageChange={setPage}
      />
    </>
  );
};

export default AdminDonationsByUser;

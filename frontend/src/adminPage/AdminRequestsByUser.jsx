import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTE_PATH } from '../enum/routePath';
import { useGetAllRequestsQuery, useGetUserByIdQuery } from '../store/adminApi.js';
import AdminTable from './AdminTable.jsx';
const AdminRequestsByUser = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ search: '', status: '', bloodType: '', urgency: '' });

  const { data: userData } = useGetUserByIdQuery(userId, { skip: !userId });
  const { data: requestsData, isLoading } = useGetAllRequestsQuery(
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
    { key: 'patientName', label: 'Patient Name', width: '20%' },
    { key: 'bloodType', label: 'Blood Type', width: '12%' },
    { key: 'quantity', label: 'Quantity', width: '12%' },
    { key: 'hospital', label: 'Hospital', width: '24%' },
    {
      key: 'urgency',
      label: 'Urgency',
      width: '12%',
      render: (urgency) => <span className={`urgency-badge ${urgency}`}>{urgency?.toUpperCase()}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      width: '20%',
      render: (status) => <span className={`status-badge ${status}`}>{status?.toUpperCase()}</span>,
    },
  ];

  const userName = userData?.data?.name || 'Selected User';

  return (
    <>
      <div className="dashboard-header-premium">
        <h1 className="page-title">Blood Request Management Details</h1>
        <p className="page-subtitle">View and manage blood requests for: {userName}</p>
      </div>

      <div className="filters-panel">
        <input
          type="text"
          placeholder="Search by patient name or hospital..."
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
          value={filters.urgency}
          onChange={(e) => handleFilterChange('urgency', e.target.value)}
          className="filter-select"
        >
          <option value="">All Urgencies</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <AdminTable
        columns={columns}
        data={requestsData?.data || []}
        isLoading={isLoading}
        pagination={requestsData?.pagination}
        onPageChange={setPage}
      />
    </>
  );
};

export default AdminRequestsByUser;

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATH } from '../enum/routePath';
import { useGetAllBloodBanksQuery } from '../store/adminApi.js';
import AdminTable from './AdminTable.jsx';


const AdminCamps = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ search: '', status: '' });

  const { data: banksData, isLoading } = useGetAllBloodBanksQuery({
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
      setFilters((prev) => (prev.search === trimmedSearch ? prev : { ...prev, search: trimmedSearch }));
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const columns = [
    { key: 'name', label: 'Blood Bank', width: '30%' },
    { key: 'email', label: 'Email', width: '25%' },
    { key: 'city', label: 'City', width: '15%' },
    { key: 'state', label: 'State', width: '15%' },
    {
      key: 'status',
      label: 'Status',
      width: '15%',
      render: (status) => <span className={`status-badge ${status}`}>{status?.toUpperCase()}</span>,
    },
  ];

  return (
    <>
      <div className="dashboard-header-premium">
        <h1 className="page-title">Camp Management</h1>
        <p className="page-subtitle">View and monitor blood camps across all banks</p>
      </div>

      <div className="filters-panel">
        <input
          type="text"
          placeholder="Search blood bank by name, email, or city..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="filter-input"
        />
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
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
        onRowClick={(row) => navigate(ROUTE_PATH.ADMIN_CAMPS_BY_BANK.replace(":bankId", row._id))}
        pagination={banksData?.pagination}
        onPageChange={setPage}
      />
    </>
  );
};

export default AdminCamps;

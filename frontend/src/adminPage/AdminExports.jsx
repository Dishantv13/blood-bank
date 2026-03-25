import React, { useState } from 'react';
import AdminBackButton from './AdminBackButton.jsx';
import '../adminPage.css/AdminExports.css';

const AdminExports = () => {
  const [format, setFormat] = useState('xlsx');
  const [module, setModule] = useState('users');
  const [isExporting, setIsExporting] = useState(false);

  const modules = [
    { id: 'users', name: 'Users' },
    { id: 'bloodbanks', name: 'Blood Banks' },
    { id: 'camps', name: 'Blood Camps' },
    { id: 'events', name: 'Events' },
    { id: 'requests', name: 'Blood Requests' },
    { id: 'donations', name: 'Donations' },
    { id: 'all', name: 'All Data (All-in-One)' },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const adminToken = localStorage.getItem('adminToken');

      let url = '';
      if (module === 'all') {
        url = `${baseUrl}/admin/export/all?format=${format}`;
      } else {
        const ext = format === 'csv' ? '/csv' : '';
        url = `${baseUrl}/admin/export/${module}${ext}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const filename = `${module}_${new Date().toISOString().split('T')[0]}.${format}`;

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="dashboard-header-premium">
        <h1 className="page-title">Data Export Center</h1>
        <p className="page-subtitle">Download system data in various formats</p>
      </div>

      <div className="export-container">
        <div className="export-card">
          <h2>Export Configuration</h2>

          <div className="export-form">
            <div className="form-group">
              <label htmlFor="module">Select Module</label>
              <select
                id="module"
                value={module}
                onChange={(e) => setModule(e.target.value)}
                className="filter-select"
                style={{ width: '100%', marginBottom: '0.5rem' }}
              >
                {modules.map((mod) => (
                  <option key={mod.id} value={mod.id}>
                    {mod.name}
                  </option>
                ))}
              </select>
              <p className="help-text">Choose which data module to export</p>
            </div>

            <div className="form-group">
              <label htmlFor="format">Export Format</label>
              <select
                id="format"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="filter-select"
                style={{ width: '100%', marginBottom: '0.5rem' }}
              >
                <option value="xlsx">Excel (XLSX)</option>
                <option value="csv">CSV</option>
              </select>
              <p className="help-text">Choose your preferred file format</p>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="btn-premium"
            >
              {isExporting ? 'Exporting...' : 'Download Export'}
            </button>
          </div>
        </div>

        <div className="export-info">
          <h3>Export Information</h3>
          <div className="info-section">
            <h4>Modules Available</h4>
            <ul>
              <li><strong>Users:</strong> All registered users with contact info and donor status</li>
              <li><strong>Blood Banks:</strong> All registered blood banks with location and status</li>
              <li><strong>Blood Camps:</strong> All blood donation camps with dates and locations</li>
              <li><strong>Events:</strong> All events with schedules and descriptions</li>
              <li><strong>Blood Requests:</strong> All blood requests with patient and hospital info</li>
              <li><strong>Donations:</strong> All blood donations with donor and blood type details</li>
              <li><strong>All Data:</strong> Complete system data export in a single file</li>
            </ul>
          </div>

          <div className="info-section">
            <h4>Format Comparison</h4>
            <table className="format-table">
              <thead>
                <tr>
                  <th>Format</th>
                  <th>Best For</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Excel (XLSX)</td>
                  <td>Data analysis, pivot tables, professional reports</td>
                </tr>
                <tr>
                  <td>CSV</td>
                  <td>Data import, system integration, lightweight files</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="info-section">
            <h4>Tips</h4>
            <ul>
              <li>Use Excel format for complex analysis and presentations</li>
              <li>Use CSV format for data import to other systems</li>
              <li>All-in-one exports include multiple sheets (Excel) or combined CSV</li>
              <li>Exports are generated with current timestamp for easy identification</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminExports;

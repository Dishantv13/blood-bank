import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContainer';
import { useCreateRequestMutation } from '../store/requestApi';
import { ROUTE_PATH } from '../enum/routePath';
import '../pages.css/CreateRequest.css';

const CreateRequest = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [createRequest, { isLoading }] = useCreateRequestMutation();

  const [formData, setFormData] = useState({
    patientName: '',
    bloodGroup: '',
    units: 1,
    urgency: 'normal',
    hospital: {
      name: '',
      address: '',
    },
    contactNumber: '',
    requiredBy: '',
    description: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await createRequest(formData).unwrap();
      setSuccess('Blood request created successfully!');
      toast.success('Blood request created successfully! Help is on the way.');
      setTimeout(() => {
        navigate(ROUTE_PATH.DASHBOARD);
      }, 2000);
    } catch (err) {
      setError(err.data?.message || 'Failed to create request');
      toast.error(err.data?.message || 'Failed to create blood request. Please try again.');
    }
  };

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  return (
    <div className="page-container">
      <div className="create-request-container">
        <h1>Create Blood Request</h1>
        <p className="subtitle">Request blood for those in need</p>

        <form onSubmit={handleSubmit} className="request-form">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-section">
            <h3>Patient Information</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="patientName">Patient Name *</label>
                <input
                  type="text"
                  id="patientName"
                  name="patientName"
                  className="form-control"
                  value={formData.patientName}
                  onChange={handleChange}
                  required
                  placeholder="Enter patient name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="bloodGroup">Blood Group Required *</label>
                <select
                  id="bloodGroup"
                  name="bloodGroup"
                  className="form-control"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Blood Group</option>
                  {bloodGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="units">Units Required *</label>
                <input
                  type="number"
                  id="units"
                  name="units"
                  className="form-control"
                  value={formData.units}
                  onChange={handleChange}
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="urgency">Urgency Level *</label>
                <select
                  id="urgency"
                  name="urgency"
                  className="form-control"
                  value={formData.urgency}
                  onChange={handleChange}
                  required
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Hospital Details</h3>
            
            <div className="form-group">
              <label htmlFor="hospital.name">Hospital Name *</label>
              <input
                type="text"
                id="hospital.name"
                name="hospital.name"
                className="form-control"
                value={formData.hospital.name}
                onChange={handleChange}
                required
                placeholder="Enter hospital name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="hospital.address">Hospital Address *</label>
              <input
                type="text"
                id="hospital.address"
                name="hospital.address"
                className="form-control"
                value={formData.hospital.address}
                onChange={handleChange}
                required
                placeholder="Enter complete hospital address"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Contact Information</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contactNumber">Contact Number *</label>
                <input
                  type="tel"
                  id="contactNumber"
                  name="contactNumber"
                  className="form-control"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  required
                  placeholder="Enter contact number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="requiredBy">Required By *</label>
                <input
                  type="date"
                  id="requiredBy"
                  name="requiredBy"
                  className="form-control"
                  value={formData.requiredBy}
                  onChange={handleChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Additional Information</label>
              <textarea
                id="description"
                name="description"
                className="form-control"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                placeholder="Any additional information or special requirements..."
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(ROUTE_PATH.DASHBOARD)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Request...' : 'Create Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRequest;

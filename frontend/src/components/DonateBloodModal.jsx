import React, { useState } from 'react';
import { useGetAllBloodBanksQuery } from '../store/bloodBankApi';
import { useRequestDonationMutation } from '../store/donationApi';
import { useToast } from '../components/ToastContainer';
import '../pages.css/Dashboard.css';

const DonateBloodModal = ({ onClose, onSuccess }) => {
  const { data: bloodBanksRes, isLoading } = useGetAllBloodBanksQuery();
  const [requestDonation, { isLoading: isRequesting }] = useRequestDonationMutation();
  const { success, error } = useToast();
  
  const [selectedBank, setSelectedBank] = useState('');
  const [notes, setNotes] = useState('');

  const bloodBanks = bloodBanksRes?.data || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBank) {
      error('Please select a blood bank to donate to.');
      return;
    }

    try {
      await requestDonation({
        bloodBankId: selectedBank,
        notes
      }).unwrap();
      
      success('Donation request sent successfully! The blood bank will contact you soon.');
      onSuccess?.();
      onClose();
    } catch (err) {
      error(err.data?.message || 'Failed to submit donation request.');
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="donor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Request to Donate Blood</h2>
          <button className="close-modal" onClick={onClose} aria-label="Close modal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        
        <div className="modal-body">
          <p className="modal-description">
            Submit a request to donate blood at a certified blood bank. Our team will review your eligibility information and contact you to schedule your visit.
          </p>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group mb-4">
              <label htmlFor="bloodBank">Select Blood Bank *</label>
              <div className="select-wrapper" style={{ position: 'relative' }}>
                <select 
                  id="bloodBank"
                  value={selectedBank} 
                  onChange={(e) => setSelectedBank(e.target.value)}
                  required
                  disabled={isLoading}
                  style={{ width: '100%', appearance: 'none', paddingRight: '40px' }}
                >
                  <option value="">-- Choose a nearby Blood Bank --</option>
                  {bloodBanks.map(bank => (
                    <option key={bank._id || bank.id} value={bank._id || bank.id}>
                      {bank.name} - {bank.location?.city || bank.address?.city || 'Unknown Location'}
                    </option>
                  ))}
                </select>
                <div style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#666' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              {isLoading && <small style={{ color: '#e63946' }}>Loading blood banks...</small>}
            </div>
            
            <div className="form-group mb-4">
              <label htmlFor="notes">Additional Information (Optional)</label>
              <textarea 
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., Preferred donation date/time, or any questions you have for the blood bank staff..."
                rows="4"
                style={{ width: '100%', resize: 'none' }}
              ></textarea>
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                className="btn-cancel" 
                onClick={onClose}
                disabled={isRequesting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className={`btn-submit ${isRequesting ? 'btn-loading' : ''}`}
                disabled={isRequesting || !selectedBank}
              >
                Confirm Request
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <style>{`
        .mb-4 { margin-bottom: 1.5rem; }
        .select-wrapper select {
          padding: 0.75rem 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }
        .select-wrapper select:focus {
          border-color: #e63946;
          outline: none;
        }
        textarea {
          padding: 0.75rem 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
          font-family: inherit;
        }
        textarea:focus {
          border-color: #e63946;
          outline: none;
        }
        .spinner-small {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default DonateBloodModal;

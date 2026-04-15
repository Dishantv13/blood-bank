import React, { useState } from 'react';
import { 
  useGetBloodUnitInventoryQuery, 
  useUpdateScreeningStatusMutation, 
  useAddColdChainLogMutation 
} from '../store/bloodUnitApi';
import { useToast } from '../components/ToastContainer';
import SkeletonLoader from '../components/SkeletonLoader';
import '../pages.css/BloodBankInventoryDetail.css';

const BloodBankUnitTracking = () => {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState('inventory'); // 'inventory' or 'raw'
  const [filter, setFilter] = useState({
    status: '',
    bloodGroup: '',
    componentType: '',
    page: 1
  });

  // RTK Query hooks
  const { data: inventoryData, isLoading, isError } = useGetBloodUnitInventoryQuery({
    ...filter,
    status: activeSubTab === 'raw' ? 'raw' : filter.status
  });
  const [updateScreening] = useUpdateScreeningStatusMutation();
  const [addColdChain] = useAddColdChainLogMutation();
  const [refineUnit] = useRefineBloodUnitMutation();

  const units = inventoryData?.units || [];
  const pagination = inventoryData?.pagination || {};

  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showScreeningModal, setShowScreeningModal] = useState(false);
  const [showColdChainModal, setShowColdChainModal] = useState(false);
  const [showRefineModal, setShowRefineModal] = useState(false);
  
  const [screeningResults, setScreeningResults] = useState({
    hiv: 'pending', hbv: 'pending', hcv: 'pending', syphilis: 'pending', malaria: 'pending'
  });
  
  const [coldChainLog, setColdChainLog] = useState({
    temperature: '', location: '', remarks: ''
  });

  const handleRefine = async (method) => {
    try {
      await refineUnit({ unitId: selectedUnit.unitId, method }).unwrap();
      showToast('success', `Unit refined via ${method.replace('_', ' ')}`);
      setShowRefineModal(false);
    } catch (error) {
      showToast('error', error.data?.message || 'Refining failed');
    }
  };

  const handleScreeningUpdate = async () => {
    try {
      await updateScreening({ 
        unitId: selectedUnit.unitId, 
        results: screeningResults 
      }).unwrap();
      showToast('success', 'Screening results updated');
      setShowScreeningModal(false);
    } catch (error) {
      showToast('error', error.data?.message || 'Update failed');
    }
  };

  const handleColdChainLog = async () => {
    try {
      await addColdChain({ 
        unitId: selectedUnit.unitId, 
        logData: coldChainLog 
      }).unwrap();
      showToast('success', 'Cold chain log added');
      setShowColdChainModal(false);
      setColdChainLog({ temperature: '', location: '', remarks: '' });
    } catch (error) {
      showToast('error', error.data?.message || 'Failed to log');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'available': return 'badge-success';
      case 'quarantine': return 'badge-warning';
      case 'reserved': return 'badge-info';
      case 'used': return 'badge-secondary';
      case 'expired':
      case 'discarded': return 'badge-danger';
      default: return 'badge-neutral';
    }
  };

  const getTimeRemaining = (expiryDate) => {
    const total = Date.parse(expiryDate) - Date.parse(new Date());
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Expired';
    if (days === 0) return 'Expiring Today';
    return `${days} days left`;
  };

  if (isLoading && units.length === 0) return <SkeletonLoader />;

  return (
    <div className="unit-tracking-container">
      <div className="header-section">
        <h1>Individual Unit Tracking</h1>
        <p>Monitor individual blood bags, medical screening, and storage logs.</p>
        <div className="sub-tabs">
          <button 
            className={`sub-tab ${activeSubTab === 'inventory' ? 'active' : ''}`}
            onClick={() => { setActiveSubTab('inventory'); setFilter({...filter, status: ''}); }}
          >
            Refined Inventory
          </button>
          <button 
            className={`sub-tab ${activeSubTab === 'raw' ? 'active' : ''}`}
            onClick={() => { setActiveSubTab('raw'); setFilter({...filter, status: 'raw'}); }}
          >
            Raw Collections
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <select onChange={(e) => setFilter({...filter, bloodGroup: e.target.value})} value={filter.bloodGroup}>
          <option value="">All Blood Groups</option>
          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
            <option key={bg} value={bg}>{bg}</option>
          ))}
        </select>

        {activeSubTab === 'inventory' && (
          <select onChange={(e) => setFilter({...filter, status: e.target.value})} value={filter.status}>
            <option value="">All Statuses</option>
            <option value="quarantine">Quarantine</option>
            <option value="available">Available</option>
            <option value="expired">Expired</option>
            <option value="used">Used</option>
          </select>
        )}

        <select onChange={(e) => setFilter({...filter, componentType: e.target.value})} value={filter.componentType}>
          <option value="">All Components</option>
          <option value="Whole Blood">Whole Blood</option>
          <option value="RBC">RBC</option>
          <option value="Platelets">Platelets</option>
          <option value="Plasma">Plasma</option>
        </select>
      </div>

      <div className="table-responsive">
        <table className="unit-table">
          <thead>
            <tr>
              <th>Unit ID</th>
              <th>Group</th>
              <th>{activeSubTab === 'raw' ? 'Initial Volume' : 'Component'}</th>
              <th>Status</th>
              <th>{activeSubTab === 'raw' ? 'Collection Date' : 'Expiry'}</th>
              <th>{activeSubTab === 'raw' ? 'Actions' : 'Screening'}</th>
              {activeSubTab === 'inventory' && <th>Last Temp</th>}
              {activeSubTab === 'inventory' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {units.map(unit => (
              <tr key={unit._id}>
                <td>
                  <span className="unit-id">{unit.unitId}</span>
                  <div className="batch-no">Batch: {unit.batchNumber}</div>
                </td>
                <td><span className="blood-group-tag">{unit.bloodGroup}</span></td>
                <td>
                  {activeSubTab === 'raw' ? `${unit.volume}ml` : (
                    <div className="comp-vol-box">
                      <span>{unit.componentType}</span>
                      <small>{unit.volume}ml</small>
                    </div>
                  )}
                </td>
                <td>
                  <span className={`badge ${getStatusBadgeClass(unit.status)}`}>
                    {unit.status.toUpperCase()}
                  </span>
                </td>
                <td>
                  {activeSubTab === 'raw' ? (
                    new Date(unit.collectionDate).toLocaleDateString()
                  ) : (
                    <div className={getTimeRemaining(unit.expiryDate) === 'Expired' ? 'text-danger' : ''}>
                      {new Date(unit.expiryDate).toLocaleDateString()}
                      <small className="d-block">{getTimeRemaining(unit.expiryDate)}</small>
                    </div>
                  )}
                </td>
                {activeSubTab === 'raw' ? (
                  <td>
                    <button className="btn-refine" onClick={() => { setSelectedUnit(unit); setShowRefineModal(true); }}>
                      Refine Unit
                    </button>
                  </td>
                ) : (
                  <>
                    <td>
                      <span className={`screening-dot dot-${unit.screeningStatus}`}></span>
                      {unit.screeningStatus.toUpperCase()}
                    </td>
                    <td>
                      {unit.coldChain?.length > 0 
                        ? `${unit.coldChain[unit.coldChain.length - 1].temperature}°C` 
                        : 'N/A'
                      }
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-sm btn-outline" 
                          onClick={() => {
                            setSelectedUnit(unit);
                            setScreeningResults(unit.screeningResults);
                            setShowScreeningModal(true);
                          }}
                        >
                          Screening
                        </button>
                        <button 
                          className="btn-sm btn-outline"
                          onClick={() => {
                            setSelectedUnit(unit);
                            setShowColdChainModal(true);
                          }}
                        >
                          Log Temp
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination component here */}

      {/* Screening Modal */}
      {showScreeningModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Medical Screening Results</h2>
            <p>Unit ID: {selectedUnit.unitId}</p>
            <div className="screening-form">
              {['hiv', 'hbv', 'hcv', 'syphilis', 'malaria'].map(test => (
                <div key={test} className="test-row">
                  <label>{test.toUpperCase()}</label>
                  <select 
                    value={screeningResults[test]} 
                    onChange={(e) => setScreeningResults({...screeningResults, [test]: e.target.value})}
                  >
                    <option value="pending">Pending</option>
                    <option value="negative">Negative</option>
                    <option value="positive">Positive</option>
                  </select>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowScreeningModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleScreeningUpdate}>Save Results</button>
            </div>
          </div>
        </div>
      )}

      {/* Cold Chain Modal */}
      {showColdChainModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Record Storage Log</h2>
            <div className="cold-chain-form">
              <div className="form-group">
                <label>Temperature (°C)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={coldChainLog.temperature}
                  onChange={(e) => setColdChainLog({...coldChainLog, temperature: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Storage Location</label>
                <input 
                  type="text" 
                  placeholder="Fridge 02, Shelf A"
                  value={coldChainLog.location}
                  onChange={(e) => setColdChainLog({...coldChainLog, location: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Remarks</label>
                <textarea 
                  value={coldChainLog.remarks}
                  onChange={(e) => setColdChainLog({...coldChainLog, remarks: e.target.value})}
                ></textarea>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowColdChainModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleColdChainLog}>Save Log</button>
            </div>
          </div>
        </div>
      )}
      {/* Refine Modal */}
      {showRefineModal && (
        <div className="modal-overlay">
          <div className="modal-content refine-modal">
            <h2>Process Raw Blood Unit</h2>
            <p>Unit ID: {selectedUnit?.unitId} | Volume: {selectedUnit?.volume}ml</p>
            
            <div className="refine-options">
               <div className="refine-card" onClick={() => handleRefine('keep_whole')}>
                  <h3>Keep as Whole Blood</h3>
                  <p>Standard unit size. Best for emergency transfusions.</p>
                  <div className="yield-estimate">Yield: 1 Unit (450ml)</div>
               </div>
               
               <div className="refine-card primary" onClick={() => handleRefine('separate')}>
                  <h3>Separate into Components</h3>
                  <p>Maximize utility. Produces RBC, Plasma, and Platelets.</p>
                  <div className="yield-estimate">Yield: 3 Units (~550ml combined)</div>
                  <div className="theoretical-yield">
                    <h4>Component Breakdown (Estimates)</h4>
                    <ul>
                      <li><strong>RBC (55%):</strong> {(selectedUnit?.volume * 0.55).toFixed(1)} ml</li>
                      <li><strong>Plasma (40%):</strong> {(selectedUnit?.volume * 0.40).toFixed(1)} ml</li>
                      <li><strong>Platelets (5%):</strong> {(selectedUnit?.volume * 0.05).toFixed(1)} ml</li>
                    </ul>
                  </div>
                  <small className="wastage-note">Includes preservation additive volume.</small>
               </div>
            </div>

            <div className="modal-actions">
              <button className="secondary" onClick={() => setShowRefineModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for components */}
      <style>{`
        .sub-tabs { display: flex; gap: 1rem; margin-top: 1rem; border-bottom: 2px solid #eee; padding-bottom: 0.5rem; }
        .sub-tab { padding: 0.5rem 1.5rem; border: none; background: none; cursor: pointer; color: #666; font-weight: 500; font-size: 0.95rem; }
        .sub-tab.active { color: var(--primary-color); border-bottom: 2px solid var(--primary-color); }
        .comp-vol-box { display: flex; flex-direction: column; line-height: 1.2; }
        .comp-vol-box small { color: #888; font-size: 0.75rem; }
        .btn-refine { background: #6366f1; color: white; border: none; padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer; transition: 0.2s; }
        .btn-refine:hover { background: #4f46e5; transform: translateY(-1px); }
        .refine-options { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin: 2rem 0; }
        .refine-card { padding: 1.5rem; border: 2px solid #eee; border-radius: 12px; cursor: pointer; transition: 0.3s ease; }
        .refine-card:hover { border-color: var(--primary-color); background: #fdf2f2; transform: translateY(-3px); }
        .refine-card.primary { background: #fefce8; border-color: #facc15; }
        .refine-card.primary:hover { border-color: #eab308; background: #fef9c3; }
        .refine-card h3 { margin-top: 0; color: #333; }
        .yield-estimate { margin-top: 1rem; font-weight: 600; color: #059669; background: #ecfdf5; padding: 0.4rem; border-radius: 4px; display: inline-block; }
        .theoretical-yield { margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed #fad390; }
        .theoretical-yield h4 { font-size: 0.8rem; text-transform: uppercase; color: #888; margin-bottom: 0.5rem; }
        .theoretical-yield ul { list-style: none; padding: 0; margin: 0; }
        .theoretical-yield li { font-size: 0.85rem; display: flex; justify-content: space-between; margin-bottom: 0.2rem; }
      `}</style>
    </div>
  );
};

export default BloodBankUnitTracking;

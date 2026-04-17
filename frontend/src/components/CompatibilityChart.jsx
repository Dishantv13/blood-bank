const CompatibilityChart = ({ bloodGroup }) => {
  const compatibilityMap = {
    'A+': { give: ['A+', 'AB+'], receive: ['A+', 'A-', 'O+', 'O-'] },
    'A-': { give: ['A+', 'A-', 'AB+', 'AB-'], receive: ['A-', 'O-'] },
    'B+': { give: ['B+', 'AB+'], receive: ['B+', 'B-', 'O+', 'O-'] },
    'B-': { give: ['B+', 'B-', 'AB+', 'AB-'], receive: ['B-', 'O-'] },
    'AB+': { give: ['AB+'], receive: ['ANYONE'] },
    'AB-': { give: ['AB+', 'AB-'], receive: ['AB-', 'A-', 'B-', 'O-'] },
    'O+': { give: ['O+', 'A+', 'B+', 'AB+'], receive: ['O+', 'O-'] },
    'O-': { give: ['ANYONE'], receive: ['O-'] }
  };

  const info = compatibilityMap[bloodGroup];
  if (!info) return null;

  return (
    <div className="compatibility-guide-card">
      <h4 className="guide-title">
        Compatibility Guide for {bloodGroup}
      </h4>
      
      <div className="guide-grid">
        <div className="guide-column">
          <span className="column-label">Can Receive From</span>
          <div className="group-list">
            {info.receive.map(g => (
              <span key={g} className="group-pill receive-pill">
                {g}
              </span>
            ))}
          </div>
        </div>
        
        <div className="guide-column">
          <span className="column-label">Can Give To</span>
          <div className="group-list">
            {info.give.map(g => (
              <span key={g} className="group-pill give-pill">
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <p className="guide-disclaimer">
        *Compatibility is based on general medical rules. Specific cross-matching in a lab is always required before transfusion.
      </p>
    </div>
  );
};

export default CompatibilityChart;

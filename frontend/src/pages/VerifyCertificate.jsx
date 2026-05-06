import { useParams, Link } from "react-router-dom";
import { useVerifyCertificateQuery } from "../store/donationApi";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaHeart,
  FaSpinner,
  FaHospital,
  FaCalendarAlt,
  FaTint,
} from "react-icons/fa";
import { ROUTE_PATH } from "../enum/routePath";

const VerifyCertificate = () => {
  const { code } = useParams();
  const {
    data: response,
    isLoading,
    isSuccess,
    isError,
  } = useVerifyCertificateQuery(code, {
    skip: !code,
  });

  const certData = response?.data;

  return (
    <div className="verify-page glass-container">
      <div className="verify-card">
        {isLoading && (
          <div className="verify-loading">
            <FaSpinner className="animate-spin" />
            <p>Verifying Certificate Authenticity...</p>
          </div>
        )}

        {isSuccess && certData && (
          <div className="verify-success animate-fade-in">
            <div className="status-icon success">
              <FaCheckCircle />
            </div>
            <h1>Certificate Verified</h1>
            <p className="subtitle">
              This donation record is authentic and officially recorded in the
              RaktSarthi network.
            </p>

            <div className="cert-data-box">
              <div className="data-row">
                <FaHeart className="icon" />
                <div className="data-content">
                  <span className="label">Donor Name</span>
                  <span className="value">{certData.donorName}</span>
                </div>
              </div>

              <div className="data-row">
                <FaTint className="icon" />
                <div className="data-content">
                  <span className="label">Blood Group</span>
                  <span className="value">{certData.bloodGroup}</span>
                </div>
              </div>

              <div className="data-row">
                <FaCalendarAlt className="icon" />
                <div className="data-content">
                  <span className="label">Donation Date</span>
                  <span className="value">
                    {new Date(certData.donationDate).toLocaleDateString(
                      undefined,
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      },
                    )}
                  </span>
                </div>
              </div>

              <div className="data-row">
                <FaHospital className="icon" />
                <div className="data-content">
                  <span className="label">Collected By</span>
                  <span className="value">{certData.collectedBy}</span>
                </div>
              </div>
            </div>

            <div className="verify-footer">
              <p>Thank you for being a part of this life-saving mission.</p>
              <Link to={ROUTE_PATH.HOME} className="primary-btn">
                Join the Network
              </Link>
            </div>
          </div>
        )}

        {isError && (
          <div className="verify-error animate-fade-in">
            <div className="status-icon error">
              <FaTimesCircle />
            </div>
            <h1>Invalid Certificate</h1>
            <p>
              We could not find a matching record for this verification code.
              This certificate may be invalid or forged.
            </p>
            <div className="verify-actions">
              <Link to={ROUTE_PATH.HOME} className="primary-btn">
                Back to Home
              </Link>
              <a href="mailto:support@raktsarthi.com" className="secondary-btn">
                Report an Issue
              </a>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .verify-page {
          min-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        .verify-card {
          background: var(--card-bg);
          width: 100%;
          max-width: 500px;
          border-radius: 20px;
          padding: 3rem 2rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.1);
          text-align: center;
          border: 1px solid var(--border-color);
        }
        .status-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
        }
        .status-icon.success { color: #10b981; }
        .status-icon.error { color: #ef4444; }
        
        h1 { font-size: 1.8rem; margin-bottom: 0.5rem; color: var(--text-main); }
        .subtitle { color: var(--text-muted); margin-bottom: 2rem; }
        
        .cert-data-box {
          background: var(--input-bg);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          text-align: left;
        }
        .data-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .data-row:last-child { margin-bottom: 0; }
        .data-row .icon { font-size: 1.2rem; color: #8b0000; opacity: 0.7; }
        .data-content { display: flex; flex-direction: column; }
        .data-content .label { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .data-content .value { font-size: 1.1rem; font-weight: 600; color: var(--text-main); }
        
        .verify-footer { margin-top: 2rem; }
        .verify-footer p { font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem; }
        
        .animate-spin { animation: spin 1s linear infinite; font-size: 2rem; color: #ef4444; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default VerifyCertificate;

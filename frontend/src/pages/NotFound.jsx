import { useNavigate } from 'react-router-dom';
import { ROUTE_PATH } from '../enum/routePath';
import { FaTint, FaArrowLeft } from 'react-icons/fa';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
      background: 'var(--bg-gradient, #fff)',
      color: 'var(--text-main, #1f2937)',
    }}>
      <div style={{ fontSize: '6rem', lineHeight: 1, marginBottom: '1rem', color: '#e63946' }}><FaTint /></div>
      <h1 style={{ fontSize: '6rem', fontWeight: 900, color: '#e63946', margin: 0, lineHeight: 1 }}>404</h1>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '1rem 0 0.5rem' }}>Page Not Found</h2>
      <p style={{ fontSize: '1rem', color: 'var(--text-muted, #6b7280)', maxWidth: '400px', marginBottom: '2rem' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '0.75rem 1.75rem',
            borderRadius: '10px',
            border: '2px solid #e63946',
            background: 'transparent',
            color: '#e63946',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          <FaArrowLeft style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Go Back
        </button>
        <button
          onClick={() => navigate(ROUTE_PATH.DASHBOARD)}
          style={{
            padding: '0.75rem 1.75rem',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #e63946 0%, #d62828 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(230,57,70,0.3)',
          }}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound;

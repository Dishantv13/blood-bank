import { useTheme } from '../context/ThemeContext';
import { FiSun, FiMoon } from 'react-icons/fi';
import '../components.css/ThemeToggle.css';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button 
      className={`theme-toggle-premium ${theme}`} 
      onClick={toggleTheme} 
      aria-label={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
      title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
    >
      <div className="icon-wrapper">
        {theme === 'light' ? (
          <FiMoon className="theme-icon moon" />
        ) : (
          <FiSun className="theme-icon sun" />
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;

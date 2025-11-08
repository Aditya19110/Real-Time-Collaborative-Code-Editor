import React from 'react';
import { useTheme } from '../context/ThemeContext';
const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      <span className="theme-toggle-icon dark-icon"></span>
      <span className="theme-toggle-icon light-icon"></span>
      <span className="theme-toggle-text">
        {theme === 'dark' ? 'Dark' : 'Light'}
      </span>
    </button>
  );
};
export default ThemeToggle;
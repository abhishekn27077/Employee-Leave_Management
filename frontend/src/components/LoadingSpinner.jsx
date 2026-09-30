import React from 'react';

function LoadingSpinner({ message = 'Loading data...', fullHeight = false }) {
  return (
    <div className={`loading-container ${fullHeight ? 'loading-full-height' : ''}`} role="status">
      <div className="spinner-ring" aria-hidden="true" />
      <span className="loading-text">{message}</span>
    </div>
  );
}

export default LoadingSpinner;

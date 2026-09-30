import React from 'react';
import { IconCheckCircle, IconAlertCircle, IconInfo, IconX } from './Icons';

function AlertMessage({ type = 'info', message, onClose }) {
  if (!message) return null;

  const isError = type === 'error';
  const isSuccess = type === 'success';

  return (
    <div
      className={`alert-banner ${isError ? 'alert-danger' : isSuccess ? 'alert-success' : 'alert-info'}`}
      role="alert"
    >
      <div className="alert-content">
        <span className="alert-icon">
          {isError ? (
            <IconAlertCircle size={18} />
          ) : isSuccess ? (
            <IconCheckCircle size={18} />
          ) : (
            <IconInfo size={18} />
          )}
        </span>
        <span className="alert-text">{message}</span>
      </div>
      {onClose && (
        <button
          type="button"
          className="alert-close"
          onClick={onClose}
          aria-label="Dismiss message"
        >
          <IconX size={15} />
        </button>
      )}
    </div>
  );
}

export default AlertMessage;

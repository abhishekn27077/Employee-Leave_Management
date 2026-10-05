import React from 'react';
import { IconCheckCircle, IconAlertCircle, IconInfo, IconX } from './Icons';

function AlertMessage({ type = 'info', message, onClose }) {
  if (!message) return null;

  const isError = type === 'error';
  const isSuccess = type === 'success';
  const isWarning = type === 'warning';

  const alertClass = isError
    ? 'alert-danger'
    : isSuccess
    ? 'alert-success'
    : isWarning
    ? 'alert-warning'
    : 'alert-info';

  return (
    <div className={`alert-banner ${alertClass}`} role="alert">
      <div className="alert-content">
        <span className="alert-icon">
          {isError || isWarning ? (
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

import React, { useEffect } from 'react';
import { IconAlertCircle, IconCheck, IconTrash } from './Icons';

function ConfirmDialog({
  isOpen,
  title = 'Please Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary', // 'primary' | 'danger' | 'warning' | 'success'
  loading = false,
  confirmDisabled = false,
  children,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onCancel();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (confirmVariant) {
      case 'danger':
        return {
          btnClass: 'btn-danger',
          icon: <IconTrash size={22} className="text-danger" />,
          iconBg: 'confirm-icon-danger',
        };
      case 'warning':
        return {
          btnClass: 'btn-warning',
          icon: <IconAlertCircle size={22} className="text-warning" />,
          iconBg: 'confirm-icon-warning',
        };
      case 'success':
        return {
          btnClass: 'btn-success',
          icon: <IconCheck size={22} className="text-success" />,
          iconBg: 'confirm-icon-success',
        };
      default:
        return {
          btnClass: 'btn-primary',
          icon: <IconAlertCircle size={22} className="text-primary" />,
          iconBg: 'confirm-icon-primary',
        };
    }
  };

  const { btnClass, icon, iconBg } = getVariantStyles();

  return (
    <div className="modal-backdrop" onClick={() => !loading && onCancel()} role="presentation">
      <div
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="confirm-dialog-header">
          <div className={`confirm-icon-wrapper ${iconBg}`}>
            {icon}
          </div>
          <div className="confirm-dialog-content">
            <h3 id="confirm-dialog-title" className="confirm-title">{title}</h3>
            {message && <p className="confirm-message">{message}</p>}
            {children}
          </div>
        </div>

        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${btnClass}`}
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;

import React from 'react';

export default function FormField({
  label,
  required = false,
  htmlFor,
  hint,
  error,
  children,
  className = '',
}) {
  return (
    <div className={`form-field-wrapper ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="form-label-modern">
          <span>
            {label}
            {required && <span className="form-label-required" aria-hidden="true">*</span>}
          </span>
        </label>
      )}
      {children}
      {hint && !error && <div className="form-hint-modern">{hint}</div>}
      {error && (
        <div className="form-error-modern" role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

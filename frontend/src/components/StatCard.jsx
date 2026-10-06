import React from 'react';
import { Link } from 'react-router-dom';

export default function StatCard({
  title,
  label,
  value,
  unit,
  subtitle,
  subtext,
  helper,
  icon,
  iconColor,
  tone,
  variant,
  progress,
  progressColor,
  badge,
  footer,
  linkTo,
  linkText,
  onClick,
  className = '',
}) {
  // Normalize label and supporting text across all calling conventions
  const displayLabel = title || label || '';
  const displayContext = subtitle || subtext || helper || '';
  
  // Resolve tone/variant ('primary', 'success'/'emerald', 'warning'/'amber', 'danger'/'rose', 'purple', 'neutral'/'slate')
  const resolvedTone = tone || variant || iconColor || 'primary';
  const colorKey = 
    resolvedTone === 'blue' || resolvedTone === 'primary' ? 'blue' :
    resolvedTone === 'green' || resolvedTone === 'success' || resolvedTone === 'emerald' ? 'emerald' :
    resolvedTone === 'yellow' || resolvedTone === 'warning' || resolvedTone === 'amber' ? 'amber' :
    resolvedTone === 'red' || resolvedTone === 'danger' || resolvedTone === 'rose' ? 'rose' :
    resolvedTone === 'purple' ? 'purple' : 'slate';

  const cardContent = (
    <div
      className={`stat-card-modern ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="stat-top-row">
        <div className="stat-label-text">{displayLabel}</div>
        {icon && (
          <div className={`stat-icon-wrapper stat-icon-${colorKey}`} aria-hidden="true">
            {icon}
          </div>
        )}
      </div>

      <div className="stat-value-large">
        {value}
        {unit && <span className="stat-value-unit">{unit}</span>}
      </div>

      {displayContext && (
        <div className="stat-context-text">{displayContext}</div>
      )}

      {progress !== undefined && progress !== null && (
        <div className="progress-track" title={`${progress}% utilized`}>
          <div
            className={`progress-fill progress-fill-${progressColor || colorKey}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      {(badge || footer || (linkTo && linkText)) && (
        <div className="stat-footer-text">
          {footer && <span>{footer}</span>}
          {linkTo && linkText ? (
            <Link to={linkTo} className="stat-link" onClick={(e) => e.stopPropagation()}>
              {linkText} &rarr;
            </Link>
          ) : null}
          {badge && <span className="stat-badge">{badge}</span>}
        </div>
      )}
    </div>
  );

  return cardContent;
}

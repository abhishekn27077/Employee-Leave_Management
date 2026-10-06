import React from 'react';
import { IconSearch } from './Icons';

export default function SearchFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filters = [],
  actions,
  className = '',
}) {
  return (
    <div className={`search-filter-toolbar ${className}`}>
      <div className="search-filter-left">
        {onSearchChange !== undefined && (
          <div className="search-input-field">
            <span className="search-icon-pos" aria-hidden="true">
              <IconSearch size={16} />
            </span>
            <input
              type="text"
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
          </div>
        )}

        {filters.map((filter, index) => (
          <div key={filter.id || index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {filter.label && (
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                {filter.label}:
              </span>
            )}
            <select
              id={filter.id}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="form-select-modern"
              style={{ height: '36px', minWidth: '140px', fontSize: '13px' }}
              aria-label={filter.ariaLabel || filter.label}
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {actions && <div className="search-filter-right">{actions}</div>}
    </div>
  );
}

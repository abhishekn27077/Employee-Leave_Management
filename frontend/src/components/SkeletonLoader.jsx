import React from 'react';

export default function SkeletonLoader({ type = 'card', count = 1, rows = 5 }) {
  if (type === 'stat-grid') {
    return (
      <div className="grid grid-cols-4 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {Array.from({ length: count || 4 }).map((_, i) => (
          <div key={i} className="card-modern skeleton-shimmer" style={{ height: '110px', padding: '18px' }} />
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="table-wrapper-modern" style={{ padding: '16px' }}>
        <div className="skeleton-shimmer skeleton-line" style={{ width: '40%', height: '20px', marginBottom: '16px' }} />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
            <div className="skeleton-shimmer skeleton-line" style={{ width: '25%', height: '16px' }} />
            <div className="skeleton-shimmer skeleton-line" style={{ width: '25%', height: '16px' }} />
            <div className="skeleton-shimmer skeleton-line" style={{ width: '25%', height: '16px' }} />
            <div className="skeleton-shimmer skeleton-line" style={{ width: '25%', height: '16px' }} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'lines') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Array.from({ length: count || 3 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer skeleton-line"
            style={{ width: i === 0 ? '70%' : i === 1 ? '95%' : '40%' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-modern skeleton-shimmer" style={{ height: '140px' }} />
      ))}
    </div>
  );
}

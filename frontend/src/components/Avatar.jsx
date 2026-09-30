import React from 'react';

// Deterministic pastel color palette inspired by Apple HIG & Linear
const AVATAR_PALETTES = [
  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' }, // Blue
  { bg: '#fdf2f8', text: '#be185d', border: '#fbcfe8' }, // Pink
  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' }, // Green
  { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' }, // Purple
  { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' }, // Orange
  { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' }, // Cyan
  { bg: '#fefce8', text: '#a16207', border: '#fef08a' }, // Amber
];

function getPalette(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({ name = '', size = 32, className = '' }) {
  const palette = getPalette(name);
  const initials = getInitials(name);
  const fontSize = Math.max(10, Math.floor(size * 0.38));

  return (
    <div
      className={`user-avatar ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: palette.bg,
        color: palette.text,
        border: `1.5px solid ${palette.border}`,
        fontSize: `${fontSize}px`,
      }}
      aria-hidden="true"
      title={name}
    >
      {initials}
    </div>
  );
}

export default Avatar;

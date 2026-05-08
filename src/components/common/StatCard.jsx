import React from 'react';
import './StatCard.css';

export default function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        {Icon && (
          <div className="stat-card-icon">
            <Icon size={16} />
          </div>
        )}
        <span className="stat-card-label">{label}</span>
      </div>
      <p className="stat-card-value" style={color ? { color } : {}}>
        {value}
      </p>
      {sub && <p className="stat-card-sub">{sub}</p>}
    </div>
  );
}

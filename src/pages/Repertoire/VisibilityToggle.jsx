import React, { useState } from 'react';
import { repertoireApi } from '../../services/api';
import { Globe, Lock, Users } from 'lucide-react';

const visibilityOptions = [
  { value: 'PRIVATE', label: 'Private', icon: Lock, desc: 'Only you can see this' },
  { value: 'PUBLIC', label: 'Public', icon: Globe, desc: 'Visible in the community' },
];

export default function VisibilityToggle({ repertoireId, currentVisibility, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const current = visibilityOptions.find(o => o.value === currentVisibility) || visibilityOptions[0];
  const CurrentIcon = current.icon;

  const handleChange = async (value) => {
    if (value === currentVisibility) {
      setOpen(false);
      return;
    }
    setUpdating(true);
    try {
      await repertoireApi.updateVisibility(repertoireId, value);
      if (onUpdate) onUpdate(value);
    } catch (err) {
      console.error('Failed to update visibility', err);
    } finally {
      setUpdating(false);
      setOpen(false);
    }
  };

  return (
    <div className="visibility-toggle" onClick={(e) => e.stopPropagation()}>
      <button
        className={`visibility-btn visibility-btn--${currentVisibility?.toLowerCase()}`}
        onClick={() => setOpen(!open)}
        disabled={updating}
        title={current.desc}
      >
        <CurrentIcon size={13} />
        <span>{updating ? '…' : current.label}</span>
      </button>
      {open && (
        <div className="visibility-dropdown">
          {visibilityOptions.map(({ value, label, icon: Icon, desc }) => (
            <button
              key={value}
              className={`visibility-option ${value === currentVisibility ? 'visibility-option--active' : ''}`}
              onClick={() => handleChange(value)}
            >
              <Icon size={14} />
              <div>
                <div className="visibility-option-label">{label}</div>
                <div className="visibility-option-desc">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
import React from "react";
import { WeaponSelectionProps } from "../types";

const WeaponSelection: React.FC<WeaponSelectionProps> = ({
  onWeaponSelect,
  state,
}) => {
  const { availableWeapons, level, canSelect } = state;

  if (!canSelect) {
    return null;
  }

  return (
    <div className="weapon-selection-overlay">
      <div className="weapon-selection-modal">
        <h2>Select Secondary Weapon (Level {level})</h2>
        <p>Choose a secondary weapon to add to your arsenal</p>
        <div className="weapon-grid">
          {availableWeapons.map((weapon) => (
            <div
              key={weapon.id}
              className="weapon-card"
              onClick={() => onWeaponSelect(weapon)}>
              <h3>{weapon.name}</h3>
              <p className="weapon-description">{weapon.description}</p>
              <div className="weapon-stats">
                <div className="stat">
                  <span className="stat-label">Damage:</span>
                  <span className="stat-value">{weapon.damage}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Cooldown:</span>
                  <span className="stat-value">{weapon.cooldown}s</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Range:</span>
                  <span className="stat-value">{weapon.range}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeaponSelection;

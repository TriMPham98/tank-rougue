import React from "react";
import { WeaponSelectionProps } from "../types";

const WeaponSelection: React.FC<WeaponSelectionProps> = ({
  onWeaponSelect,
  onClose,
  state,
}) => {
  const { availableWeapons, selectedWeapons, level, canSelect } = state;

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
              <p>{weapon.description}</p>
              <div className="weapon-stats">
                <span>Damage: {weapon.damage}</span>
                <span>Cooldown: {weapon.cooldown}s</span>
                <span>Range: {weapon.range}</span>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default WeaponSelection;

import React, { useEffect, useRef, useState } from "react";
import { WeaponSelectionProps, SecondaryWeapon } from "../types";

const WeaponSelection: React.FC<WeaponSelectionProps> = ({
  onWeaponSelect,
  onClose,
  state,
}) => {
  const { availableWeapons, level, canSelect } = state;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSelectionLocked, setIsSelectionLocked] = useState(false);

  // Function to handle weapon selection and close the modal
  const handleWeaponSelect = (
    weapon: SecondaryWeapon,
    event: React.MouseEvent
  ) => {
    // Prevent multiple selections
    if (isSelectionLocked) {
      return;
    }

    // Lock selections immediately
    setIsSelectionLocked(true);

    // Stop event propagation to prevent bubbling
    event.stopPropagation();
    event.preventDefault();

    // Process selection
    onWeaponSelect(weapon);
    onClose();

    return false; // Prevent default
  };

  // Add a manual close function for the cancel button
  const handleClose = (event: React.MouseEvent) => {
    if (isSelectionLocked) {
      return;
    }

    setIsSelectionLocked(true);
    event.stopPropagation();
    event.preventDefault();
    onClose();
    return false; // Prevent default
  };

  // Reset the lock when the component unmounts or when canSelect changes
  useEffect(() => {
    return () => {
      setIsSelectionLocked(false);
    };
  }, [canSelect]);

  if (!canSelect) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="weapon-selection-overlay"
      onClick={(e) => {
        e.stopPropagation();
      }}>
      <div
        className="weapon-selection-modal tactical-panel"
        onClick={(e) => {
          e.stopPropagation();
        }}>
        <div className="panel-header">
          <div className="header-decoration left"></div>
          <h2>TACTICAL ARMAMENT - RANK {level}</h2>
          <div className="header-decoration right"></div>
        </div>

        <div className="mission-directive">
          <div className="directive-icon"></div>
          <p>SELECT SECONDARY WEAPON SYSTEM FOR DEPLOYMENT</p>
        </div>

        <div className="intel-note">
          <div className="intel-icon"></div>
          <p>
            FIELD INTEL: Multiple deployments of the same weapon system will
            increase overall firepower capacity.
          </p>
        </div>

        <div className="weapon-grid">
          {availableWeapons.map((weapon, index) => (
            <div
              key={weapon.id}
              className="weapon-card"
              data-weapon-id={weapon.id}
              onClick={(e) => handleWeaponSelect(weapon, e)}>
              <div className="designation-tag">
                <div className="designation-marker">MK-{index + 1}</div>
                <div className="selection-indicator">{index + 1}</div>
              </div>

              <h3 className="weapon-designation">{weapon.name}</h3>

              <div className="specs-container">
                <p className="weapon-description">{weapon.description}</p>

                <div className="specs-separator">
                  <div className="separator-text">SPECIFICATIONS</div>
                  <div className="separator-line"></div>
                </div>

                <div className="weapon-stats">
                  <div className="stat">
                    <span className="stat-label">DMG RATING:</span>
                    <span className="stat-value">{weapon.damage}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">CYCLE TIME:</span>
                    <span className="stat-value">{weapon.cooldown}s</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">EFFECTIVE RANGE:</span>
                    <span className="stat-value">{weapon.range}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="action-panel">
          <button className="action-button close-button" onClick={handleClose}>
            <span className="button-icon">✕</span>
            <span className="button-text">DISMISS SELECTION</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeaponSelection;

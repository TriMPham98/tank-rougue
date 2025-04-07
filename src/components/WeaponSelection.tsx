import React, { useEffect, useRef } from "react";
import { WeaponSelectionProps, SecondaryWeapon } from "../types";

const WeaponSelection: React.FC<WeaponSelectionProps> = ({
  onWeaponSelect,
  onClose,
  state,
}) => {
  const { availableWeapons, level, canSelect } = state;
  const containerRef = useRef<HTMLDivElement>(null);

  // Add direct DOM event listeners as a fallback
  useEffect(() => {
    const setupDirectEventListeners = () => {
      if (!containerRef.current) return;

      // Find all weapon card elements
      const weaponCards = containerRef.current.querySelectorAll(".weapon-card");

      weaponCards.forEach((card, index) => {
        if (index < availableWeapons.length) {
          const weapon = availableWeapons[index];

          // Remove existing listeners (if any)
          card.removeEventListener("click", () => {});

          // Add new direct listener
          card.addEventListener("click", (e) => {
            e.stopPropagation();
            onWeaponSelect(weapon);
            onClose();
          });
        }
      });

      // Find cancel button
      const cancelButton = containerRef.current.querySelector(".close-button");
      if (cancelButton) {
        cancelButton.removeEventListener("click", () => {});
        cancelButton.addEventListener("click", (e) => {
          e.stopPropagation();
          onClose();
        });
      }
    };

    // Run after a short delay to ensure the DOM is ready
    const timeoutId = setTimeout(setupDirectEventListeners, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [availableWeapons, onWeaponSelect, onClose]);

  if (!canSelect) {
    return null;
  }

  // Function to handle weapon selection and close the modal
  const handleWeaponSelect = (
    weapon: SecondaryWeapon,
    event: React.MouseEvent
  ) => {
    // Stop event propagation to prevent bubbling
    event.stopPropagation();
    event.preventDefault();

    onWeaponSelect(weapon);
    onClose();

    return false; // Prevent default
  };

  // Add a manual close function for the cancel button
  const handleClose = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    onClose();
    return false; // Prevent default
  };

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
            <span className="button-text">ABORT SELECTION</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeaponSelection;

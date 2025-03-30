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
        className="weapon-selection-modal"
        onClick={(e) => {
          e.stopPropagation();
        }}>
        <h2>Select Secondary Weapon (Level {level})</h2>
        <p>Choose a secondary weapon to add to your arsenal</p>
        <p
          style={{
            fontSize: "0.9em",
            fontStyle: "italic",
            marginBottom: "10px",
          }}>
          Tip: You can select the same weapon multiple times for additional
          firepower!
        </p>
        <div className="weapon-grid">
          {availableWeapons.map((weapon) => (
            <div
              key={weapon.id}
              className="weapon-card"
              data-weapon-id={weapon.id}
              onClick={(e) => handleWeaponSelect(weapon, e)}>
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
        <button className="close-button" onClick={handleClose}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default WeaponSelection;

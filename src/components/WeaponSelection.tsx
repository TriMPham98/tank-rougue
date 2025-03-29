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

      console.log("Setting up direct DOM event listeners");

      // Find all weapon card elements
      const weaponCards = containerRef.current.querySelectorAll(".weapon-card");

      weaponCards.forEach((card, index) => {
        if (index < availableWeapons.length) {
          const weapon = availableWeapons[index];

          // Remove existing listeners (if any)
          card.removeEventListener("click", () => {});

          // Add new direct listener
          card.addEventListener("click", (e) => {
            console.log("Direct DOM click detected on weapon:", weapon.name);
            e.stopPropagation();
            onWeaponSelect(weapon);
            onClose();
          });

          console.log(`Added direct event listener to ${weapon.name} card`);
        }
      });

      // Find cancel button
      const cancelButton = containerRef.current.querySelector(".close-button");
      if (cancelButton) {
        cancelButton.removeEventListener("click", () => {});
        cancelButton.addEventListener("click", (e) => {
          console.log("Direct DOM click detected on cancel button");
          e.stopPropagation();
          onClose();
        });
      }
    };

    // Run after a short delay to ensure the DOM is ready
    const timeoutId = setTimeout(setupDirectEventListeners, 100);

    return () => {
      clearTimeout(timeoutId);
      console.log("Cleaned up direct DOM event listeners");
    };
  }, [availableWeapons, onWeaponSelect, onClose]);

  // Add log on component mount
  useEffect(() => {
    console.log("WeaponSelection component mounted");
    console.log("Current state:", state);
    console.log("canSelect:", canSelect);

    // Log the props
    console.log("onWeaponSelect is defined:", !!onWeaponSelect);
    console.log("onClose is defined:", !!onClose);

    return () => {
      console.log("WeaponSelection component unmounted");
    };
  }, []);

  if (!canSelect) {
    console.log("Cannot select weapons, returning null");
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

    console.log("Weapon card clicked!");
    console.log("Weapon selected:", weapon.name);
    console.log("Calling onWeaponSelect...");
    onWeaponSelect(weapon);
    console.log("onWeaponSelect called");

    console.log("Calling onClose...");
    onClose();
    console.log("onClose called");

    return false; // Prevent default
  };

  // Add a manual close function for the cancel button
  const handleClose = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    console.log("Cancel button clicked");
    console.log("Calling onClose from cancel button...");
    onClose();
    console.log("onClose called from cancel button");

    return false; // Prevent default
  };

  console.log(
    "Rendering weapon selection with options:",
    availableWeapons.length
  );

  return (
    <div
      ref={containerRef}
      className="weapon-selection-overlay"
      onClick={(e) => {
        console.log("Overlay clicked");
        e.stopPropagation();
      }}>
      <div
        className="weapon-selection-modal"
        onClick={(e) => {
          console.log("Modal clicked");
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
              onClick={(e) => {
                console.log("Click detected on weapon:", weapon.name);
                handleWeaponSelect(weapon, e);
              }}>
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

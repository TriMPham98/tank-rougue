import React, { useEffect, useRef, useState, useCallback } from "react";
import { WeaponSelectionProps, SecondaryWeapon } from "../types";
import { debug } from "../utils/debug";

const WeaponSelection: React.FC<WeaponSelectionProps> = ({
  onWeaponSelect,
  onClose,
  state,
}) => {
  const { availableWeapons, level, canSelect } = state;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSelectionLocked, setIsSelectionLocked] = useState(false);

  // Function to handle weapon selection and close the modal
  const handleWeaponSelect = useCallback(
    (weapon: SecondaryWeapon, event?: React.MouseEvent | KeyboardEvent) => {
      // Prevent multiple selections
      if (isSelectionLocked) {
        debug.log("WeaponSelection: Selection locked, ignoring input.");
        return;
      }
      debug.log(`WeaponSelection: Handling selection for ${weapon.name}`);

      // Lock selections immediately
      setIsSelectionLocked(true);

      // Stop event propagation if event exists
      if (event) {
        debug.log("WeaponSelection: Stopping event propagation.");
        event.stopPropagation();
        event.preventDefault();
      }

      // Process selection
      debug.log(`WeaponSelection: Calling onWeaponSelect for ${weapon.name}`);
      onWeaponSelect(weapon);
      debug.log("WeaponSelection: Calling onClose.");
      onClose();

      // No need for return false here as preventDefault handles it
    },
    [isSelectionLocked, onWeaponSelect, onClose]
  );

  // Add a manual close function for the cancel button
  const handleClose = useCallback(
    (event: React.MouseEvent) => {
      debug.log("WeaponSelection: Handling close action.");
      if (isSelectionLocked) {
        debug.log("WeaponSelection: Selection locked, ignoring close.");
        return;
      }

      setIsSelectionLocked(true);
      debug.log("WeaponSelection: Stopping close event propagation.");
      event.stopPropagation();
      event.preventDefault();
      debug.log("WeaponSelection: Calling onClose via cancel button.");
      onClose();
      // No need for return false here
    },
    [isSelectionLocked, onClose]
  );

  // Reset the lock when the component unmounts or when canSelect changes
  useEffect(() => {
    debug.log(
      `WeaponSelection: canSelect changed to ${canSelect}. Resetting lock.`
    );
    setIsSelectionLocked(false); // Reset lock when modal opens/closes
    return () => {
      debug.log(
        "WeaponSelection: Component unmounting or canSelect changing. Resetting lock."
      );
      setIsSelectionLocked(false);
    };
  }, [canSelect]);

  // Handle keyboard number key selection
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      debug.log(`WeaponSelection: KeyDown event captured: ${event.key}`);
      if (!canSelect || isSelectionLocked) {
        debug.log(
          `WeaponSelection: Ignoring key press. canSelect: ${canSelect}, isSelectionLocked: ${isSelectionLocked}`
        );
        // Don't stop propagation here, allow other handlers if modal not active/locked
        return;
      }

      const keyNum = parseInt(event.key);
      if (!isNaN(keyNum) && keyNum > 0 && keyNum <= availableWeapons.length) {
        debug.log(`WeaponSelection: Valid key ${keyNum} pressed.`);
        // Stop propagation EARLY to prevent App.tsx or others from acting on it
        debug.log("WeaponSelection: Stopping keydown propagation immediately.");
        event.stopPropagation();
        event.preventDefault();
        event.stopImmediatePropagation(); // Crucial to stop other listeners

        const selectedWeapon = availableWeapons[keyNum - 1];
        debug.log(
          `WeaponSelection: Selecting weapon ${selectedWeapon.name} via key press.`
        );
        handleWeaponSelect(selectedWeapon, event); // Pass the event
      } else {
        debug.log(
          `WeaponSelection: Key ${event.key} is not a valid selection number.`
        );
      }
    },
    [canSelect, isSelectionLocked, availableWeapons, handleWeaponSelect]
  );

  // Add keyboard event listener using capture phase
  useEffect(() => {
    if (canSelect) {
      debug.log("WeaponSelection: Adding keydown listener (capture phase).");
      // Use capture phase to catch the event before it bubbles up
      window.addEventListener("keydown", handleKeyDown, true);
    } else {
      debug.log(
        "WeaponSelection: Not adding keydown listener (canSelect is false)."
      );
    }

    return () => {
      debug.log("WeaponSelection: Removing keydown listener.");
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [canSelect, handleKeyDown]);

  if (!canSelect) {
    // debug.log("WeaponSelection: Not rendering (canSelect is false)."); // Optional: log when not rendering
    return null;
  }

  debug.log("WeaponSelection: Rendering modal."); // Log when rendering
  return (
    <div
      ref={containerRef}
      className="weapon-selection-overlay"
      onClick={(e) => {
        // Prevent clicks on overlay from closing if needed, or call handleClose
        debug.log("WeaponSelection: Overlay clicked.");
        e.stopPropagation();
      }}>
      <div
        className="weapon-selection-modal tactical-panel"
        onClick={(e) => {
          debug.log("WeaponSelection: Modal background clicked.");
          e.stopPropagation(); // Prevent clicks inside modal from propagating further
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
              // Pass event to handler
              onClick={(e) => handleWeaponSelect(weapon, e)}
              role="button" // Add accessibility roles
              tabIndex={0} // Make focusable
              aria-label={`Select ${weapon.name} (Press ${index + 1})`} // ARIA label
              onKeyDown={(e) => {
                // Allow selection with Enter/Space when focused
                if (e.key === "Enter" || e.key === " ") {
                  debug.log(
                    `WeaponSelection: Card activated with ${e.key} for ${weapon.name}`
                  );
                  handleWeaponSelect(weapon);
                }
              }}>
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
          {/* Pass event to handler */}
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

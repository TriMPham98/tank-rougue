import { useState, useCallback, useEffect } from "react";
import { UpgradeableStat } from "../utils/gameState";
import { useGameState } from "../utils/gameState";
import {
  getStatDisplayName,
  getStatCurrentValue,
  getStatPostUpgradeValue,
  getStatDescription,
} from "../utils/tankStats";
import "./GameUI.css";

interface StatUpgradeUIProps {
  availableEnhancements: UpgradeableStat[];
  onUpgradeSelect: (stat: UpgradeableStat) => void;
}

const StatUpgradeUI = ({
  availableEnhancements,
  onUpgradeSelect,
}: StatUpgradeUIProps) => {
  const [isUpgrading, setIsUpgrading] = useState(false);

  const {
    playerSpeed,
    playerFireRate,
    playerCameraRange,
    playerMaxHealth,
    playerHealthRegen,
    playerTurretDamage,
    playerBulletVelocity,
  } = useGameState();

  const handleEnhancementSelect = useCallback(
    (stat: UpgradeableStat) => {
      if (isUpgrading) return;
      setIsUpgrading(true);
      onUpgradeSelect(stat);
      setTimeout(() => setIsUpgrading(false), 500);
    },
    [isUpgrading, onUpgradeSelect]
  );

  // Handle keyboard number key selection
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (isUpgrading) return;

      const keyNum = parseInt(event.key);
      if (
        !isNaN(keyNum) &&
        keyNum > 0 &&
        keyNum <= availableEnhancements.length
      ) {
        handleEnhancementSelect(availableEnhancements[keyNum - 1]);
      }
    },
    [availableEnhancements, handleEnhancementSelect, isUpgrading]
  );

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Collect all the player stat values
  const statValues = {
    playerSpeed,
    playerFireRate,
    playerCameraRange,
    playerMaxHealth,
    playerHealthRegen,
    playerTurretDamage,
    playerBulletVelocity,
  };

  return (
    <div className="overlay enhancement-overlay">
      <div className="overlay-content enhancement-content">
        <h2 className="enhancement-title">
          FIELD PROMOTION: SELECT ENHANCEMENT
        </h2>
        <div className="enhancement-options">
          {availableEnhancements.map((stat, index) => (
            <div
              key={stat}
              className="enhancement-card"
              onClick={() => handleEnhancementSelect(stat)}
              onTouchStart={() => {}} // Empty handler to ensure proper touch handling on mobile
              role="button"
              tabIndex={0}
              aria-label={`Select ${getStatDisplayName(stat)} enhancement`}>
              <div className="enhancement-keybind">{index + 1}</div>
              <div className="enhancement-name">{getStatDisplayName(stat)}</div>
              <div className="enhancement-value">
                {getStatCurrentValue(stat, statValues)} →{" "}
                <span className="value-increase">
                  {getStatPostUpgradeValue(stat, statValues)}
                </span>
              </div>
              <div className="enhancement-desc">{getStatDescription(stat)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatUpgradeUI;

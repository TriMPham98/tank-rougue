import { useState, useCallback, useEffect } from "react";
import { useGameState } from "../utils/gameState";
import type { UpgradeableStat } from "../utils/gameState";
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
    playerPenetration,
  } = useGameState();

  // Filter out Sensor Range upgrade if it's already at or above 14
  const filteredEnhancements = availableEnhancements.filter(
    (stat) => !(stat === "cameraRange" && playerCameraRange >= 14)
  );

  // Additional filtering for maxed out stats
  const finalEnhancements = filteredEnhancements.filter(
    (stat) => !(stat === "penetration" && playerPenetration >= 5)
  );

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
      if (!isNaN(keyNum) && keyNum > 0 && keyNum <= finalEnhancements.length) {
        handleEnhancementSelect(finalEnhancements[keyNum - 1]);
      }
    },
    [finalEnhancements, handleEnhancementSelect, isUpgrading]
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
    playerPenetration,
  };

  return (
    <div className="overlay enhancement-overlay">
      <div className="overlay-content enhancement-content">
        <h2 className="enhancement-title">
          FIELD PROMOTION: SELECT ENHANCEMENT
        </h2>
        <div className="enhancement-options">
          {finalEnhancements.map((stat, index) => (
            <div
              key={stat}
              className="enhancement-card"
              onClick={() => handleEnhancementSelect(stat)}
              onTouchStart={() => {}}
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

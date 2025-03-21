import { useGameState } from "../utils/gameState";
import "../assets/GameUI.css";
import { UpgradeableStat } from "../utils/gameState";
import { useState, useCallback } from "react";

const GameUI = () => {
  // Add state to track if upgrade is in progress
  const [isUpgrading, setIsUpgrading] = useState(false);

  const {
    playerHealth,
    playerMaxHealth,
    score,
    level,
    enemiesDefeated,
    enemiesRequiredForNextLevel,
    isGameOver,
    isPaused,
    restartGame,
    togglePause,
    showUpgradeUI,
    availableUpgrades,
    upgradeStat,
    playerSpeed,
    playerFireRate,
    playerCameraRange,
    playerHealthRegen,
  } = useGameState();

  // Create a debounced version of upgradeStat
  const handleUpgrade = useCallback(
    (stat: UpgradeableStat) => {
      if (isUpgrading) return; // Prevent multiple clicks

      setIsUpgrading(true);
      upgradeStat(stat);

      // Reset after 1 second (longer than needed, just to be safe)
      setTimeout(() => {
        setIsUpgrading(false);
      }, 1000);
    },
    [upgradeStat, isUpgrading]
  );

  // Calculate health percentage for health bar
  const healthPercentage = (playerHealth / playerMaxHealth) * 100;

  // Calculate level progress percentage
  const levelProgressPercentage =
    (enemiesDefeated / enemiesRequiredForNextLevel) * 100;

  // Define health bar color based on health percentage
  const getHealthColor = () => {
    if (healthPercentage > 60) return "#4caf50";
    if (healthPercentage > 30) return "#ffc107";
    return "#f44336";
  };

  // Define level color based on level
  const getLevelColor = () => {
    if (level <= 3) return "#4caf50"; // Green for early levels
    if (level <= 7) return "#2196f3"; // Blue for mid levels
    if (level <= 12) return "#ff9800"; // Orange for higher levels
    return "#f44336"; // Red for very high levels
  };

  // Get the display name for a stat
  const getStatDisplayName = (stat: UpgradeableStat): string => {
    switch (stat) {
      case "tankSpeed":
        return "Tank Speed";
      case "fireRate":
        return "Fire Rate";
      case "cameraRange":
        return "Camera Range";
      case "maxHealth":
        return "Max Health";
      case "healthRegen":
        return "Health Regen";
    }
  };

  // Get the current value for a stat
  const getStatCurrentValue = (stat: UpgradeableStat): string => {
    switch (stat) {
      case "tankSpeed":
        return `${playerSpeed.toFixed(1)}`;
      case "fireRate":
        return `${(1 / playerFireRate).toFixed(1)} shots/sec`;
      case "cameraRange":
        return `${playerCameraRange.toFixed(0)} units`;
      case "maxHealth":
        return `${playerMaxHealth}`;
      case "healthRegen":
        return `${playerHealthRegen}/sec`;
    }
  };

  // Get the upgrade amount for a stat
  const getStatUpgradeAmount = (stat: UpgradeableStat): string => {
    switch (stat) {
      case "tankSpeed":
        return "+0.5";
      case "fireRate":
        return `+${(1 / (playerFireRate - 0.05) - 1 / playerFireRate).toFixed(
          1
        )} shots/sec`;
      case "cameraRange":
        return "+2 units";
      case "maxHealth":
        return "+25";
      case "healthRegen":
        return "+1/sec";
    }
  };

  return (
    <div className="game-ui">
      {/* Top HUD */}
      <div className="top-hud">
        <div className="health-container">
          <div className="health-label">
            HP: {playerHealth}/{playerMaxHealth}
          </div>
          <div className="health-bar-container">
            <div
              className="health-bar"
              style={{
                width: `${healthPercentage}%`,
                backgroundColor: getHealthColor(),
              }}
            />
          </div>
        </div>

        <div className="score-container">
          <div className="score-label">Score: {score}</div>
        </div>

        <div className="level-container">
          <div
            className="level-label"
            style={{
              color: getLevelColor(),
              fontWeight: "bold",
              fontSize: "1.2em",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}>
            <span>Level</span>
            <div
              className="level-indicator"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                backgroundColor: getLevelColor(),
                color: "#fff",
                fontSize: "1.1em",
                fontWeight: "bold",
                boxShadow: "0 0 8px rgba(0,0,0,0.3)",
              }}>
              {level}
            </div>
          </div>
          <div
            className="level-info"
            style={{
              fontSize: "0.8em",
              opacity: 0.8,
              marginTop: "4px",
              marginBottom: "6px",
            }}>
            Enemies: {Math.floor(3 + 2.5 * Math.log10(level + 1))}
          </div>

          {/* Level progress bar */}
          <div
            className="level-progress-container"
            style={{
              width: "100%",
              height: "6px",
              backgroundColor: "#333",
              borderRadius: "3px",
              marginTop: "5px",
              overflow: "hidden",
            }}>
            <div
              className="level-progress-bar"
              style={{
                width: `${levelProgressPercentage}%`,
                height: "100%",
                backgroundColor: getLevelColor(),
                transition: "width 0.3s ease-out",
              }}
            />
          </div>
          <div
            className="level-progress-label"
            style={{
              fontSize: "0.75em",
              textAlign: "right",
              marginTop: "2px",
            }}>
            {enemiesDefeated}/{enemiesRequiredForNextLevel} for next level
          </div>
        </div>
      </div>

      {/* Player Stats Display (right side) */}
      <div
        className="player-stats"
        style={{
          position: "absolute",
          right: "20px",
          top: "165px",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          padding: "10px",
          borderRadius: "5px",
          color: "white",
          fontSize: "0.8em",
        }}>
        <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
          Tank Stats
        </div>
        <div>Speed: {playerSpeed.toFixed(1)}</div>
        <div>Fire Rate: {(1 / playerFireRate).toFixed(1)} shots/sec</div>
        <div>Camera Range: {playerCameraRange.toFixed(0)}</div>
        <div>Max Health: {playerMaxHealth}</div>
        <div>Health Regen: {playerHealthRegen}/sec</div>
      </div>

      {/* Upgrade UI overlay */}
      {showUpgradeUI && (
        <div className="overlay">
          <div
            className="upgrade-content"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.85)",
              padding: "25px",
              borderRadius: "12px",
              width: "550px",
              color: "white",
              boxShadow: "0 0 20px rgba(0, 200, 0, 0.3)",
              border: "1px solid rgba(76, 175, 80, 0.3)",
            }}>
            <h2
              style={{
                color: "#4caf50",
                textAlign: "center",
                fontSize: "1.8em",
                marginBottom: "25px",
                textShadow: "0 0 10px rgba(76, 175, 80, 0.5)",
              }}>
              Level Up! Choose an Upgrade
            </h2>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "15px",
              }}>
              {availableUpgrades.map((stat) => (
                <div
                  key={stat}
                  onClick={() => handleUpgrade(stat)}
                  style={{
                    width: "160px",
                    height: "200px",
                    padding: "15px",
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s ease",
                    border: "1px solid rgba(33, 150, 243, 0.3)",
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                    transform: "translateY(0)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    ":hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                    },
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "rgba(255, 255, 255, 0.15)";
                    e.currentTarget.style.transform = "translateY(-5px)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 12px rgba(0, 0, 0, 0.3)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 8px rgba(0, 0, 0, 0.2)";
                  }}>
                  <div
                    style={{
                      fontSize: "1.3em",
                      fontWeight: "bold",
                      marginBottom: "20px",
                      color: "#2196f3",
                      textShadow: "0 0 5px rgba(33, 150, 243, 0.5)",
                      height: "60px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      padding: "0 5px",
                      wordWrap: "break-word",
                      hyphens: "auto",
                    }}>
                    {getStatDisplayName(stat)}
                  </div>
                  <div
                    style={{
                      marginBottom: "20px",
                      height: "50px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                    <div style={{ fontSize: "0.9em", marginBottom: "5px" }}>
                      Current:
                    </div>
                    <div style={{ fontSize: "1.1em" }}>
                      {getStatCurrentValue(stat)}
                    </div>
                  </div>
                  <div
                    style={{
                      color: "#4caf50",
                      fontWeight: "bold",
                      height: "50px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                    <div style={{ fontSize: "0.9em", marginBottom: "5px" }}>
                      Upgrade:
                    </div>
                    <div
                      style={{
                        fontSize: "1.1em",
                        textShadow: "0 0 5px rgba(76, 175, 80, 0.3)",
                      }}>
                      {getStatUpgradeAmount(stat)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {isGameOver && (
        <div className="overlay">
          <div className="overlay-content">
            <h2>Game Over</h2>
            <p>Your score: {score}</p>
            <p>Level reached: {level}</p>
            <button onClick={restartGame}>Restart Game</button>
          </div>
        </div>
      )}

      {/* Pause overlay */}
      {isPaused && !isGameOver && !showUpgradeUI && (
        <div className="overlay">
          <div className="overlay-content">
            <h2>Game Paused</h2>
            <button onClick={togglePause}>Resume Game</button>
          </div>
        </div>
      )}

      {/* Controls info */}
      <div className="controls-info">
        <p>WASD: Move | J/K: Rotate Turret | Space: Shoot | ESC: Pause</p>
      </div>
    </div>
  );
};

export default GameUI;

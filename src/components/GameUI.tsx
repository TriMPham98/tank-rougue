import { useGameState } from "../utils/gameState";
import "../assets/GameUI.css";
import { UpgradeableStat } from "../utils/gameState";
import { useState, useCallback, useEffect, useRef } from "react";
import WeaponSelection from "./WeaponSelection";
import "./WeaponSelection.css";

const GameUI = () => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isOutsideSafeZone, setIsOutsideSafeZone] = useState(false);
  const warningOpacityRef = useRef(0);
  const warningAnimationRef = useRef(0);

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
    playerTurretDamage,
    playerBulletVelocity,
    showWeaponSelection,
    availableWeapons,
    selectedWeapons,
    selectWeapon,
    closeWeaponSelection,
    // Safe zone properties
    safeZoneActive,
    safeZoneRadius,
    safeZoneCenter,
    playerTankPosition,
    enemies, // Get enemies from state for minimap
  } = useGameState();

  // Check for weapon selection opportunity when level changes
  useEffect(() => {
    if (
      [5, 10, 15].includes(level) &&
      selectedWeapons.length < 3 &&
      !isGameOver
    ) {
      console.log(
        `Level ${level} reached, showing weapon selection. Current weapons: ${selectedWeapons.length}`
      );
      useGameState.setState({ showWeaponSelection: true });
    }
  }, [level, isGameOver]); // Added isGameOver to dependencies

  // Add log to monitor weapon selection state
  useEffect(() => {
    console.log(
      "GameUI - showWeaponSelection state changed:",
      showWeaponSelection
    );
    console.log("GameUI - selectedWeapons:", selectedWeapons);

    // Force check for weapon selection state - debug hack
    if (showWeaponSelection === true) {
      console.log("Weapon selection should be showing now");
    } else {
      console.log("Weapon selection should be hidden now");
    }
  }, [showWeaponSelection, selectedWeapons]);

  // Handle keyboard shortcuts for upgrades
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!showUpgradeUI || isUpgrading) return;

      const keyIndex = parseInt(event.key) - 1; // Convert key 1, 2, 3 to index 0, 1, 2

      if (
        keyIndex >= 0 &&
        keyIndex < 3 &&
        keyIndex < availableUpgrades.length
      ) {
        handleUpgrade(availableUpgrades[keyIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [showUpgradeUI, availableUpgrades, isUpgrading]);

  const handleUpgrade = useCallback(
    (stat: UpgradeableStat) => {
      if (isUpgrading) return;
      setIsUpgrading(true);
      upgradeStat(stat);
      setTimeout(() => setIsUpgrading(false), 1000);
    },
    [upgradeStat, isUpgrading]
  );

  const healthPercentage = (playerHealth / playerMaxHealth) * 100;
  const levelProgressPercentage =
    (enemiesDefeated / enemiesRequiredForNextLevel) * 100;

  const getHealthColor = () => {
    if (healthPercentage > 60) return "#4caf50";
    if (healthPercentage > 30) return "#ff9800";
    return "#f44336";
  };

  const getLevelColor = () => {
    if (level <= 3) return "#4caf50";
    if (level <= 7) return "#2196f3";
    if (level <= 12) return "#ff9800";
    return "#f44336";
  };

  const getStatDisplayName = (stat: UpgradeableStat) => {
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
      case "turretDamage":
        return "Turret Damage";
      case "bulletVelocity":
        return "Bullet Speed";
    }
  };

  const getStatCurrentValue = (stat: UpgradeableStat) => {
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
      case "turretDamage":
        return `${playerTurretDamage}`;
      case "bulletVelocity":
        return `${playerBulletVelocity} units/sec`;
    }
  };

  const getStatPostUpgradeValue = (stat: UpgradeableStat) => {
    switch (stat) {
      case "tankSpeed":
        return `${(playerSpeed + 0.5).toFixed(1)}`;
      case "fireRate":
        const newFireRate = 1 / (playerFireRate - 0.05);
        return `${newFireRate.toFixed(1)} shots/sec`;
      case "cameraRange":
        return `${(playerCameraRange + 2).toFixed(0)} units`;
      case "maxHealth":
        return `${playerMaxHealth + 25}`;
      case "healthRegen":
        return `${playerHealthRegen + 0.5}/sec`;
      case "turretDamage":
        return `${playerTurretDamage + 5}`;
      case "bulletVelocity":
        return `${playerBulletVelocity + 2} units/sec`;
    }
  };

  const getStatDescription = (stat: UpgradeableStat) => {
    switch (stat) {
      case "tankSpeed":
        return "Increases movement speed of the tank.";
      case "fireRate":
        return "Increases the rate at which the tank can fire shots.";
      case "cameraRange":
        return "Increases the visible area around the tank.";
      case "maxHealth":
        return "Increases the maximum health of the tank.";
      case "healthRegen":
        return "Increases the rate at which health regenerates over time.";
      case "turretDamage":
        return "Increases the damage dealt by the tank's turret.";
      case "bulletVelocity":
        return "Increases the speed at which bullets travel.";
    }
  };

  // Add a failsafe for weapon selection UI rendering
  const renderWeaponSelection = () => {
    console.log(
      "renderWeaponSelection called, showWeaponSelection=",
      showWeaponSelection
    );
    if (!showWeaponSelection || isGameOver) {
      console.log(
        "Not rendering weapon selection because showWeaponSelection is false or game is over"
      );
      return null;
    }

    console.log("Rendering WeaponSelection component");
    return (
      <WeaponSelection
        onWeaponSelect={(weapon) => {
          console.log("Weapon selected in GameUI:", weapon.name);
          selectWeapon(weapon);
          console.log("selectWeapon called, checking state:");
          console.log(
            "showWeaponSelection after selection:",
            useGameState.getState().showWeaponSelection
          );
        }}
        onClose={() => {
          console.log("onClose called in GameUI");
          closeWeaponSelection();
          console.log("closeWeaponSelection called, checking state:");
          console.log(
            "showWeaponSelection after close:",
            useGameState.getState().showWeaponSelection
          );
        }}
        state={{
          availableWeapons,
          selectedWeapons,
          level,
          canSelect: selectedWeapons.length < 3,
        }}
      />
    );
  };

  // Check if player is outside the safe zone
  useEffect(() => {
    if (!safeZoneActive || !playerTankPosition) {
      setIsOutsideSafeZone(false);
      return;
    }

    // Calculate 2D distance from player to safe zone center
    const playerPosition2D = [playerTankPosition[0], playerTankPosition[2]];
    const centerPosition = [safeZoneCenter[0], safeZoneCenter[1]];

    const distance = Math.sqrt(
      Math.pow(playerPosition2D[0] - centerPosition[0], 2) +
        Math.pow(playerPosition2D[1] - centerPosition[1], 2)
    );

    // Only update state if the outside status has changed
    const isOutside = distance > safeZoneRadius;
    if (isOutside !== isOutsideSafeZone) {
      setIsOutsideSafeZone(isOutside);
    }
  }, [
    playerTankPosition,
    safeZoneRadius,
    safeZoneCenter,
    safeZoneActive,
    isOutsideSafeZone,
  ]);

  // Animate warning opacity
  useEffect(() => {
    if (!isOutsideSafeZone) {
      warningOpacityRef.current = 0;
      cancelAnimationFrame(warningAnimationRef.current);
      return;
    }

    let startTime: number;
    const duration = 1000; // 1 second for full animation cycle

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Oscillate between 0.3 and 0.7 opacity
      warningOpacityRef.current =
        0.3 + (Math.sin((elapsed / duration) * Math.PI * 2) + 1) / 5;

      // Continue animation
      warningAnimationRef.current = requestAnimationFrame(animate);
    };

    warningAnimationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(warningAnimationRef.current);
    };
  }, [isOutsideSafeZone]);

  // Create a minimap to show player position and safe zone
  const renderMinimap = useCallback(() => {
    const mapSize = 100; // Size in pixels
    const gameWorldSize = 100; // Map represents -50 to +50 in the game world

    // Calculate player position on minimap (centered)
    const playerX = playerTankPosition
      ? ((playerTankPosition[0] + gameWorldSize / 2) / gameWorldSize) * mapSize
      : mapSize / 2;
    const playerY = playerTankPosition
      ? ((playerTankPosition[2] + gameWorldSize / 2) / gameWorldSize) * mapSize
      : mapSize / 2;

    // Calculate safe zone on minimap
    const safeZoneCenterX =
      ((safeZoneCenter[0] + gameWorldSize / 2) / gameWorldSize) * mapSize;
    const safeZoneCenterY =
      ((safeZoneCenter[1] + gameWorldSize / 2) / gameWorldSize) * mapSize;
    const safeZoneRadiusPixels = (safeZoneRadius / gameWorldSize) * mapSize;

    return (
      <div
        className="minimap"
        style={{
          position: "absolute",
          bottom: "10px",
          right: "10px",
          width: `${mapSize}px`,
          height: `${mapSize}px`,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          border: "2px solid #666",
          borderRadius: "5px",
          zIndex: 100,
        }}>
        {/* Safe zone circle */}
        {safeZoneActive && (
          <div
            style={{
              position: "absolute",
              top: `${safeZoneCenterY - safeZoneRadiusPixels}px`,
              left: `${safeZoneCenterX - safeZoneRadiusPixels}px`,
              width: `${safeZoneRadiusPixels * 2}px`,
              height: `${safeZoneRadiusPixels * 2}px`,
              borderRadius: "50%",
              border: "2px solid #33ccff",
              backgroundColor: "rgba(51, 153, 255, 0.3)",
            }}
          />
        )}

        {/* Enemy indicators */}
        {enemies.map((enemy) => {
          const enemyX =
            ((enemy.position[0] + gameWorldSize / 2) / gameWorldSize) * mapSize;
          const enemyY =
            ((enemy.position[2] + gameWorldSize / 2) / gameWorldSize) * mapSize;

          // Set color based on enemy type
          let enemyColor = "red"; // Default color for tanks
          let enemySize = 5; // Default size for tanks

          if (enemy.type === "turret") {
            enemyColor = "royalblue"; // Blue for turrets
            enemySize = 4; // Slightly smaller for turrets
          } else if (enemy.type === "bomber") {
            enemyColor = "gold"; // Yellow/gold for suicide bombers
            enemySize = 6; // Slightly larger for bombers
          }

          return (
            <div
              key={`minimap-enemy-${enemy.id}`}
              style={{
                position: "absolute",
                top: `${enemyY - enemySize / 2}px`,
                left: `${enemyX - enemySize / 2}px`,
                width: `${enemySize}px`,
                height: `${enemySize}px`,
                backgroundColor: enemyColor,
                borderRadius: "50%",
                zIndex: 102,
              }}
            />
          );
        })}

        {/* Player indicator */}
        <div
          style={{
            position: "absolute",
            top: `${playerY - 3}px`,
            left: `${playerX - 3}px`,
            width: "6px",
            height: "6px",
            backgroundColor: "green",
            borderRadius: "50%",
            zIndex: 101,
          }}
        />

        {/* Minimap legend */}
        <div
          style={{
            position: "absolute",
            bottom: "-25px",
            left: "0",
            width: "100%",
            fontSize: "8px",
            color: "white",
            textAlign: "center",
          }}>
          Red:Tanks | Blue:Turrets | Yellow:Bombers
        </div>
      </div>
    );
  }, [
    playerTankPosition,
    safeZoneRadius,
    safeZoneCenter,
    safeZoneActive,
    enemies,
  ]);

  return (
    <div className="game-ui">
      {/* Minimap */}
      {!isGameOver && !isPaused && renderMinimap()}

      {/* Top HUD */}
      <div
        className="top-hud"
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "15px",
          color: "white",
        }}>
        <div className="health-container">
          <div className="health-label" style={{ fontSize: "1em" }}>
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
          <div className="score-label" style={{ fontSize: "1em" }}>
            Score: {score}
          </div>
        </div>
        <div className="level-container">
          <div
            className="level-label"
            style={{
              color: getLevelColor(),
              fontSize: "1.2em",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}>
            <span>Level</span>
            <div
              className="level-indicator"
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                backgroundColor: getLevelColor(),
                color: "#fff",
                fontSize: "1.1em",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
              {level}
            </div>
          </div>
          <div
            className="level-info"
            style={{ fontSize: "0.8em", opacity: 0.8 }}>
            Enemies:{" "}
            {level === 1
              ? 1
              : Math.min(1 + Math.floor(Math.sqrt(level) * 2), 15)}
          </div>
          <div
            className="level-progress-container"
            style={{
              width: "100%",
              height: "6px",
              backgroundColor: "#333",
              borderRadius: "3px",
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
            style={{ fontSize: "0.8em", textAlign: "right" }}>
            {enemiesDefeated}/{enemiesRequiredForNextLevel} for next level
          </div>
        </div>
      </div>

      {/* Player Stats Display */}
      <div
        className="player-stats"
        style={{
          position: "absolute",
          right: "20px",
          top: "165px",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          padding: "15px",
          borderRadius: "5px",
          color: "white",
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
          fontSize: "0.8em",
        }}>
        <div
          style={{
            fontSize: "1.2em",
            fontWeight: "bold",
            marginBottom: "10px",
          }}>
          Tank Stats
        </div>
        <div>Max Health: {playerMaxHealth}</div>
        <div>Health Regen: {playerHealthRegen}/sec</div>
        <div>Turret Damage: {playerTurretDamage}</div>
        <div>Fire Rate: {(1 / playerFireRate).toFixed(1)} shots/sec</div>
        <div>Bullet Speed: {playerBulletVelocity} units/sec</div>
        <div>Movement Speed: {playerSpeed.toFixed(1)}</div>
        <div>Camera Range: {playerCameraRange.toFixed(0)} units</div>
      </div>

      {/* Upgrade UI Overlay */}
      {showUpgradeUI && !isGameOver && (
        <div className="overlay">
          <div
            className="upgrade-content"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              padding: "15px",
              borderRadius: "12px",
              width: "80%",
              maxWidth: "1000px",
              color: "white",
              boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.2)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}>
            <h2
              style={{
                color: "#4caf50",
                textAlign: "center",
                fontSize: "1.5em",
                fontWeight: "bold",
                marginBottom: "15px",
              }}>
              Level Up! Choose an Upgrade
            </h2>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "15px",
                width: "100%",
              }}>
              {availableUpgrades.map((stat, index) => (
                <div
                  key={stat}
                  onClick={() => handleUpgrade(stat)}
                  style={{
                    flex: "1 1 0",
                    minWidth: "250px",
                    maxWidth: "350px",
                    padding: "15px",
                    backgroundColor: "rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s ease",
                    border: "1px solid rgba(255,255,255,0.2)",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "rgba(255,255,255,0.2)";
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 12px rgba(0,0,0,0.3)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "rgba(255,255,255,0.1)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 8px rgba(0,0,0,0.2)";
                  }}>
                  {/* Key number indicator - Now positioned in the top LEFT */}
                  <div
                    style={{
                      position: "absolute",
                      top: "10px",
                      left: "10px", // Changed from right to left
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      backgroundColor: "#2196f3",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      fontSize: "0.9em",
                    }}>
                    {index + 1}
                  </div>
                  <div
                    style={{
                      fontSize: "1.2em",
                      color: "#2196f3",
                      marginBottom: "10px",
                    }}>
                    {getStatDisplayName(stat)}
                  </div>
                  <div style={{ fontSize: "1em", whiteSpace: "nowrap" }}>
                    {getStatCurrentValue(stat)} →{" "}
                    <span style={{ color: "#4caf50" }}>
                      {getStatPostUpgradeValue(stat)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.8em",
                      marginTop: "10px",
                      color: "#ccc",
                    }}>
                    {getStatDescription(stat)}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: "15px",
                fontSize: "0.9em",
                color: "#ccc",
                textAlign: "center",
              }}></div>
          </div>
        </div>
      )}

      {/* Safe zone warning */}
      {isOutsideSafeZone && (
        <div
          className="safe-zone-warning"
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor:
              "rgba(255, 0, 0, " + warningOpacityRef.current + ")",
            color: "white",
            padding: "10px 20px",
            borderRadius: "5px",
            fontWeight: "bold",
            textShadow: "0 0 5px black",
            zIndex: 100,
          }}>
          WARNING: Outside Safe Zone
        </div>
      )}

      {/* Game Over Overlay */}
      {isGameOver && (
        <div className="overlay">
          <div
            className="overlay-content"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              padding: "15px",
              borderRadius: "12px",
              color: "white",
              boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
            }}>
            <h2
              style={{
                color: "#f44336",
                fontSize: "1.5em",
                fontWeight: "bold",
                marginBottom: "15px",
              }}>
              Game Over
            </h2>
            <p style={{ fontSize: "1em" }}>Your score: {score}</p>
            <p style={{ fontSize: "1em" }}>Level reached: {level}</p>
            <button
              onClick={restartGame}
              style={{
                backgroundColor: "#4caf50",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#45a049";
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#4caf50";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}>
              Restart Game
            </button>
          </div>
        </div>
      )}

      {/* Pause Overlay */}
      {isPaused && !isGameOver && !showUpgradeUI && (
        <div className="overlay">
          <div
            className="overlay-content"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              padding: "15px",
              borderRadius: "12px",
              color: "white",
              boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
            }}>
            <h2
              style={{
                color: "#4caf50",
                fontSize: "1.5em",
                fontWeight: "bold",
                marginBottom: "15px",
              }}>
              Game Paused
            </h2>
            <button
              onClick={togglePause}
              style={{
                backgroundColor: "#4caf50",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#45a049";
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#4caf50";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}>
              Resume Game
            </button>
          </div>
        </div>
      )}

      {/* Weapon Selection UI */}
      {renderWeaponSelection()}

      {/* Controls Info */}
      <div
        className="controls-info"
        style={{
          fontSize: "0.8em",
          color: "white",
          textAlign: "center",
          padding: "10px",
        }}>
        <p>
          WASD: Move | J/K: Rotate Turret | SPACE: Shoot | ESC: Pause | 1/2/3:
          Select Upgrades
        </p>
      </div>
    </div>
  );
};

export default GameUI;

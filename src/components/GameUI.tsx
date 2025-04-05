import { useGameState } from "../utils/gameState";
import "../assets/GameUI.css";
import { UpgradeableStat } from "../utils/gameState";
import { useState, useCallback, useEffect, useRef } from "react";
import WeaponSelection from "./WeaponSelection";
import "./WeaponSelection.css";

// Define BASE_ENEMIES constant for enemy count calculation
const BASE_ENEMIES = 1;

// Calculate max enemies for a given level (matches the logic in respawnManager.ts)
const getMaxEnemies = (level: number): number => {
  if (level === 1) return 1;

  if (level <= 10) {
    return Math.min(BASE_ENEMIES + Math.floor(Math.sqrt(level) * 1.25), 15);
  } else if (level < 40) {
    return Math.min(BASE_ENEMIES + Math.floor(Math.sqrt(level) * 2), 15);
  } else {
    return Math.min(BASE_ENEMIES + Math.floor(Math.sqrt(level) * 2.3), 20);
  }
};

const GameUI = () => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isOutsideSafeZone, setIsOutsideSafeZone] = useState(false);
  const warningOpacityRef = useRef(0);
  const warningAnimationRef = useRef(0);
  const [isSafezoneWarningVisible, setIsSafezoneWarningVisible] =
    useState(false);
  const safeZoneShrinkWarningRef = useRef(0);
  const [safeZoneTimeRemaining, setSafeZoneTimeRemaining] = useState<
    number | null
  >(null);
  const lastZoneUpdateTimeRef = useRef(0);
  const lastZoneRadiusRef = useRef(0);

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
    safeZoneTargetRadius,
    safeZoneShrinkRate,
    safeZoneDamage,
    isPreZoneChangeLevel, // Get the pre-zone change level flag
  } = useGameState();

  // Check for weapon selection opportunity when level changes
  useEffect(() => {
    if (
      [10, 20, 30, 40].includes(level) &&
      selectedWeapons.length < 4 &&
      !isGameOver
    ) {
      useGameState.setState({ showWeaponSelection: true });
    }
  }, [level, isGameOver]);

  // Monitor weapon selection state
  useEffect(() => {
    // Empty effect for monitoring weapon selection state changes
  }, [showWeaponSelection, selectedWeapons]);

  // Handle keyboard shortcuts for upgrades
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (isUpgrading) return;

      // Handle level upgrades (1-3)
      if (showUpgradeUI) {
        const keyIndex = parseInt(event.key) - 1;
        if (
          keyIndex >= 0 &&
          keyIndex < 3 &&
          keyIndex < availableUpgrades.length
        ) {
          handleUpgrade(availableUpgrades[keyIndex]);
        }
      }

      // Handle secondary weapon selection (1-4)
      if (showWeaponSelection) {
        const keyIndex = parseInt(event.key) - 1;
        if (
          keyIndex >= 0 &&
          keyIndex < 4 &&
          keyIndex < availableWeapons.length
        ) {
          selectWeapon(availableWeapons[keyIndex]);
          closeWeaponSelection();
          // Show upgrade UI after weapon selection
          useGameState.setState({ showUpgradeUI: true });
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [
    showUpgradeUI,
    showWeaponSelection,
    availableUpgrades,
    availableWeapons,
    isUpgrading,
  ]);

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
        const currentShotsPerSecond = 1 / playerFireRate;
        const newShotsPerSecond = Math.min(3.5, currentShotsPerSecond + 0.1);
        return `${newShotsPerSecond.toFixed(1)} shots/sec`;
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
    if (!showWeaponSelection || isGameOver) {
      return null;
    }

    return (
      <WeaponSelection
        onWeaponSelect={(weapon) => {
          selectWeapon(weapon);
          closeWeaponSelection();
          // Show upgrade UI after weapon selection
          useGameState.setState({ showUpgradeUI: true });
        }}
        onClose={() => {
          closeWeaponSelection();
          // Show upgrade UI after closing weapon selection
          useGameState.setState({ showUpgradeUI: true });
        }}
        state={{
          availableWeapons,
          selectedWeapons,
          level,
          canSelect: selectedWeapons.length < 4,
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

  // Check if the safe zone is shrinking to show warning
  useEffect(() => {
    if (!safeZoneActive || isGameOver || isPaused) {
      setIsSafezoneWarningVisible(false);
      return;
    }

    // If there's a notable difference between current radius and target radius
    if (safeZoneRadius - safeZoneTargetRadius > 0.5) {
      setIsSafezoneWarningVisible(true);

      // Calculate seconds until safe zone closes
      const approxTimeToClose = Math.floor(
        (safeZoneRadius - safeZoneTargetRadius) / safeZoneShrinkRate
      );

      // Only update the time if:
      // 1. We don't have a time yet, or
      // 2. The current radius has changed significantly since last calculation
      if (
        safeZoneTimeRemaining === null ||
        Math.abs(lastZoneRadiusRef.current - safeZoneRadius) > 0.5
      ) {
        setSafeZoneTimeRemaining(approxTimeToClose);
        lastZoneRadiusRef.current = safeZoneRadius;
        lastZoneUpdateTimeRef.current = Date.now();
      }

      // Hide warning after 5 seconds
      const timerId = setTimeout(() => {
        setIsSafezoneWarningVisible(false);
      }, 5000);

      return () => clearTimeout(timerId);
    } else {
      setIsSafezoneWarningVisible(false);
      setSafeZoneTimeRemaining(null);
    }
  }, [
    safeZoneRadius,
    safeZoneTargetRadius,
    safeZoneActive,
    isGameOver,
    isPaused,
    safeZoneShrinkRate,
    safeZoneTimeRemaining,
  ]);

  // Update the countdown timer continuously
  useEffect(() => {
    if (
      safeZoneTimeRemaining === null ||
      isPaused ||
      isGameOver ||
      !safeZoneActive
    ) {
      return;
    }

    const timer = setInterval(() => {
      const elapsedSeconds =
        (Date.now() - lastZoneUpdateTimeRef.current) / 1000;
      const newTimeRemaining = Math.max(
        0,
        safeZoneTimeRemaining - elapsedSeconds
      );

      if (newTimeRemaining === 0) {
        setSafeZoneTimeRemaining(null);
        clearInterval(timer);
      } else {
        setSafeZoneTimeRemaining(safeZoneTimeRemaining - 1);
        lastZoneUpdateTimeRef.current = Date.now();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [safeZoneTimeRemaining, isPaused, isGameOver, safeZoneActive]);

  // Animate warning opacity for outside safe zone warning
  useEffect(() => {
    if (!isOutsideSafeZone) {
      warningOpacityRef.current = 0;
      return;
    }

    let startTime: number;
    const duration = 1000; // 1 second for full animation cycle

    const animateOutsideWarning = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Oscillate between 0.3 and 0.7 opacity
      warningOpacityRef.current =
        0.3 + (Math.sin((elapsed / duration) * Math.PI * 2) + 1) / 5;

      // Continue animation
      requestAnimationFrame(animateOutsideWarning);
    };

    const animationId = requestAnimationFrame(animateOutsideWarning);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isOutsideSafeZone]);

  // Animate warning opacity
  useEffect(() => {
    if (!isSafezoneWarningVisible) {
      safeZoneShrinkWarningRef.current = 0;
      cancelAnimationFrame(warningAnimationRef.current);
      return;
    }

    let startTime: number;
    const duration = 1000; // 1 second for full animation cycle

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Oscillate between 0.5 and 1.0 opacity
      safeZoneShrinkWarningRef.current =
        0.5 + (Math.sin((elapsed / duration) * Math.PI * 2) + 1) / 4;

      // Continue animation
      warningAnimationRef.current = requestAnimationFrame(animate);
    };

    warningAnimationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(warningAnimationRef.current);
    };
  }, [isSafezoneWarningVisible]);

  // Add warning for pre-zone change levels
  const [showZoneWarning, setShowZoneWarning] = useState(false);
  const zoneWarningOpacityRef = useRef(0);

  // Calculate next zone values for warning
  const calculateNextZoneInfo = useCallback(() => {
    const maxRadius = 50;
    const minRadius = 5;
    const radiusDecrease = 4;
    const currentZoneLevel = Math.floor(level / 5);
    const nextZoneLevel = currentZoneLevel + 1;
    const nextZoneLevelNumber = nextZoneLevel * 5;
    const nextZoneTargetRadius = Math.max(
      minRadius,
      maxRadius - nextZoneLevel * radiusDecrease
    );

    return { nextZoneTargetRadius, nextZoneLevelNumber };
  }, [level]);

  const { nextZoneTargetRadius, nextZoneLevelNumber } = calculateNextZoneInfo();

  // Effect to show and animate zone warning on pre-zone change levels
  useEffect(() => {
    if (!isPreZoneChangeLevel || !safeZoneActive || isPaused || isGameOver) {
      setShowZoneWarning(false);
      return;
    }

    // Show warning when entering a pre-zone change level
    setShowZoneWarning(true);

    // Start opacity animation
    let startTime: number;
    const duration = 1500; // 1.5 seconds for full animation cycle

    const animateZoneWarning = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Oscillate between 0.5 and 0.9 opacity
      zoneWarningOpacityRef.current =
        0.5 + (Math.sin((elapsed / duration) * Math.PI * 2) + 1) / 5;

      if (showZoneWarning) {
        requestAnimationFrame(animateZoneWarning);
      }
    };

    const animationId = requestAnimationFrame(animateZoneWarning);

    return () => {
      cancelAnimationFrame(animationId);
      setShowZoneWarning(false);
    };
  }, [isPreZoneChangeLevel, safeZoneActive, isPaused, isGameOver]);

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

    // Format time remaining for display
    const formatTimeRemaining = () => {
      if (safeZoneTimeRemaining === null) return "STABLE";

      const minutes = Math.floor(safeZoneTimeRemaining / 60);
      const seconds = Math.floor(safeZoneTimeRemaining % 60);
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    // Get color for the countdown timer
    const getTimerColor = () => {
      if (safeZoneTimeRemaining === null) return "#33ccff"; // Blue for stable
      if (safeZoneTimeRemaining > 60) return "#33ccff"; // Blue for >1 min
      if (safeZoneTimeRemaining > 30) return "#ff9900"; // Orange for <1 min
      return "#ff3333"; // Red for <30 sec
    };

    // Calculate current zone level based on level number
    const zoneLevel = Math.floor(level / 5);
    const isZoneChangeLevel = level % 5 === 0 && level > 0;

    // Calculate next zone level and progress towards it
    const nextZoneLevel = zoneLevel + 1;
    const nextZoneLevelNumber = nextZoneLevel * 5;
    const levelsUntilNextZone = nextZoneLevelNumber - level;
    const zoneProgress = ((5 - levelsUntilNextZone) / 5) * 100;

    // Calculate progress for zone shrinking
    const calculateZoneShrinkProgress = () => {
      if (isZoneChangeLevel) return 100; // Always 100% on zone change levels

      // If target radius equals current radius, we're done shrinking
      if (safeZoneRadius <= safeZoneTargetRadius) return 100;

      // Calculate the next zone's target radius
      const maxRadius = 50;
      const minRadius = 5;
      const radiusDecrease = 4;
      const nextZoneTargetRadius = Math.max(
        minRadius,
        maxRadius - nextZoneLevel * radiusDecrease
      );

      // Calculate initial radius for this zone cycle
      const initialZoneRadius = 50 - zoneLevel * 4;

      // Calculate how much has been shrunk and how much needs to be shrunk
      const totalShrinkNeeded = initialZoneRadius - nextZoneTargetRadius;
      const currentShrink = initialZoneRadius - safeZoneRadius;

      // Calculate percentage complete
      return Math.min(
        100,
        Math.max(0, (currentShrink / totalShrinkNeeded) * 100)
      );
    };

    const zoneShrinkProgress = calculateZoneShrinkProgress();

    // Determine if we're on final level before zone change (to highlight urgency)
    const isPreZoneChangeLevel = level % 5 === 4 && level >= 4;

    // Get an urgency color based on progress and levels remaining
    const getUrgencyColor = () => {
      // On change levels, always green
      if (isZoneChangeLevel) return "#4caf50";

      // On pre-change level, use red if zone not complete
      if (isPreZoneChangeLevel) {
        if (zoneShrinkProgress < 90) return "#f44336"; // Red if not near completion
        if (zoneShrinkProgress < 100) return "#ff9800"; // Orange if close to complete
        return "#4caf50"; // Green if complete
      }

      // Normal progression colors
      if (zoneShrinkProgress < 40) return "#2196f3"; // Blue for early progress
      if (zoneShrinkProgress < 75) return "#03a9f4"; // Light blue for mid progress
      if (zoneShrinkProgress < 90) return "#ff9800"; // Orange for getting close
      return "#4caf50"; // Green when complete or nearly complete
    };

    // Calculate the next zone's target radius (for visual preview on pre-zone change levels)
    const getNextZoneTargetRadius = () => {
      const maxRadius = 50;
      const minRadius = 5;
      const radiusDecrease = 4;
      const nextZoneLevel = Math.floor(level / 5) + 1;
      return Math.max(minRadius, maxRadius - nextZoneLevel * radiusDecrease);
    };

    const nextZoneRadius = getNextZoneTargetRadius();
    const nextZoneRadiusPixels = (nextZoneRadius / gameWorldSize) * mapSize;

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
          border: `2px solid ${isPreZoneChangeLevel ? "#ff9500" : "#666"}`, // Orange border on pre-zone change levels
          borderRadius: "5px",
          zIndex: 100,
        }}>
        {/* Safe zone circle */}
        {safeZoneActive && (
          <>
            {/* Current safe zone circle */}
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

            {/* Target safe zone circle (where the safe zone will shrink to) */}
            {safeZoneTargetRadius < safeZoneRadius && (
              <div
                style={{
                  position: "absolute",
                  top: `${
                    safeZoneCenterY -
                    (safeZoneTargetRadius / gameWorldSize) * mapSize
                  }px`,
                  left: `${
                    safeZoneCenterX -
                    (safeZoneTargetRadius / gameWorldSize) * mapSize
                  }px`,
                  width: `${
                    (safeZoneTargetRadius / gameWorldSize) * mapSize * 2
                  }px`,
                  height: `${
                    (safeZoneTargetRadius / gameWorldSize) * mapSize * 2
                  }px`,
                  borderRadius: "50%",
                  border: "1px dashed #ff5555",
                  backgroundColor: "rgba(255, 85, 85, 0.2)",
                }}
              />
            )}

            {/* Next zone preview circle - only show on pre-zone change levels */}
            {isPreZoneChangeLevel && (
              <div
                style={{
                  position: "absolute",
                  top: `${safeZoneCenterY - nextZoneRadiusPixels}px`,
                  left: `${safeZoneCenterX - nextZoneRadiusPixels}px`,
                  width: `${nextZoneRadiusPixels * 2}px`,
                  height: `${nextZoneRadiusPixels * 2}px`,
                  borderRadius: "50%",
                  border: "2px dashed #ff9500", // Orange for warning
                  backgroundColor: "rgba(255, 149, 0, 0.15)", // Light orange background
                  transition: "opacity 0.5s ease-in-out",
                  animation: "pulse 2s infinite", // Add pulsing animation
                }}
              />
            )}
          </>
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
          Map |<span style={{ color: "green" }}> ● </span>You |
          <span style={{ color: "red" }}> ● </span>Tanks |
          <span style={{ color: "royalblue" }}> ● </span>Turrets |
          <span style={{ color: "gold" }}> ● </span>Bombers
        </div>

        {/* Safe zone info */}
        {safeZoneActive && (
          <div
            style={{
              position: "absolute",
              top: "-65px", // Moved up to accommodate more info
              left: "0",
              width: "100%",
              fontSize: "8px",
              color: "white",
              textAlign: "center",
            }}>
            <div>
              Zone: {zoneLevel > 0 ? `Level ${zoneLevel}` : "Inactive"}
              {isZoneChangeLevel && level > 0 ? " (New)" : ""}
              {isPreZoneChangeLevel && (
                <span
                  style={{
                    marginLeft: "4px",
                    color: "#ff9500",
                    fontWeight: "bold",
                    fontSize: "8px",
                  }}>
                  NEXT ZONE INCOMING
                </span>
              )}
              {zoneLevel > 0 && !isZoneChangeLevel && !isPreZoneChangeLevel && (
                <span style={{ marginLeft: "4px", fontSize: "7px" }}>
                  → {nextZoneLevel} in {levelsUntilNextZone} level
                  {levelsUntilNextZone !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div>
              {/* Zone progress bar - only show if in active zone */}
              {zoneLevel > 0 && !isZoneChangeLevel && (
                <div
                  style={{
                    width: "100%",
                    height: "3px",
                    backgroundColor: "#333",
                    marginTop: "2px",
                    marginBottom: "2px",
                    borderRadius: "1px",
                    overflow: "hidden",
                  }}>
                  <div
                    style={{
                      width: `${zoneProgress}%`,
                      height: "100%",
                      backgroundColor: isPreZoneChangeLevel
                        ? "#ff9500" // Change to orange for pre-zone change levels
                        : "#33ccff",
                      transition: "width 0.5s ease-out",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Zone shrink progress - show target completion */}
            {zoneLevel > 0 && (
              <div style={{ fontSize: "7px" }}>
                <span>Zone Shrink:</span>
                {zoneShrinkProgress >= 100 ? (
                  <span style={{ color: "#4caf50", fontWeight: "bold" }}>
                    {" "}
                    Complete
                  </span>
                ) : (
                  <span
                    style={{
                      color: isPreZoneChangeLevel ? "#ff9500" : "white",
                    }}>
                    {zoneShrinkProgress.toFixed(0)}% complete
                  </span>
                )}
              </div>
            )}

            {/* Zone shrink progress bar */}
            {zoneLevel > 0 && zoneShrinkProgress < 100 && (
              <div
                style={{
                  width: "100%",
                  height: "3px",
                  backgroundColor: "#333",
                  marginTop: "2px",
                  marginBottom: "2px",
                  borderRadius: "1px",
                  overflow: "hidden",
                }}>
                <div
                  style={{
                    width: `${zoneShrinkProgress}%`,
                    height: "100%",
                    backgroundColor: isPreZoneChangeLevel
                      ? "#ff9500" // Always orange for pre-zone change levels
                      : getUrgencyColor(),
                    transition:
                      "width 0.5s ease-out, background-color 0.5s ease-out",
                  }}
                />
              </div>
            )}

            {/* Next zone info - only show on pre-zone change levels */}
            {isPreZoneChangeLevel && (
              <div
                style={{
                  fontSize: "7px",
                  marginTop: "2px",
                  color: "#ff9500",
                  fontWeight: "bold",
                }}>
                Next Zone: {nextZoneRadius.toFixed(1)} units{" "}
                <span style={{ fontSize: "6px" }}>↓</span> (
                {(safeZoneRadius - nextZoneRadius).toFixed(1)} decrease)
              </div>
            )}

            <div>
              Radius: {safeZoneRadius.toFixed(1)} →{" "}
              {safeZoneTargetRadius.toFixed(1)} units
            </div>
            {safeZoneTargetRadius < safeZoneRadius && (
              <div
                style={{
                  marginTop: "3px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: getTimerColor(),
                }}>
                Closing in: {formatTimeRemaining()}
              </div>
            )}
            <div style={{ marginTop: "2px" }}>
              <span style={{ color: "#ff3333" }}>
                {safeZoneDamage.toFixed(1)} dmg/s outside
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }, [
    playerTankPosition,
    safeZoneRadius,
    safeZoneCenter,
    safeZoneActive,
    enemies,
    safeZoneTargetRadius,
    safeZoneShrinkRate,
    safeZoneDamage,
    safeZoneTimeRemaining,
    level,
  ]);

  return (
    <div className="game-ui">
      {/* Zone Change Warning */}
      {showZoneWarning && !isGameOver && !isPaused && (
        <div
          className="zone-change-warning"
          style={{
            position: "absolute",
            top: "12%",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: `rgba(255, 149, 0, ${zoneWarningOpacityRef.current})`,
            color: "white",
            padding: "12px 24px",
            borderRadius: "5px",
            fontWeight: "bold",
            textShadow: "0 0 5px rgba(0, 0, 0, 0.7)",
            zIndex: 101,
            textAlign: "center",
            boxShadow: "0 0 20px rgba(255, 149, 0, 0.5)",
            border: "1px solid #ffb74d",
          }}>
          <div style={{ fontSize: "16px" }}>
            ⚠️ WARNING: NEXT ZONE IMMINENT ⚠️
          </div>
          <div style={{ fontSize: "14px", marginTop: "6px" }}>
            Safe zone will shrink to {nextZoneTargetRadius.toFixed(1)} units at
            level {nextZoneLevelNumber}
          </div>
        </div>
      )}

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
            HP: {playerHealth.toFixed(1)}/{playerMaxHealth.toFixed(1)}
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
            <span
              style={{
                color:
                  level <= 10 ? "#8aff8a" : level >= 40 ? "#ff8a8a" : "white",
                fontWeight: level >= 40 ? "bold" : "normal",
              }}>
              {getMaxEnemies(level)}
            </span>
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

      {/* Safe zone shrinking warning */}
      {isSafezoneWarningVisible && (
        <div
          className="safe-zone-shrinking-warning"
          style={{
            position: "absolute",
            top: isOutsideSafeZone ? "30%" : "20%",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor:
              "rgba(255, 100, 0, " + safeZoneShrinkWarningRef.current + ")",
            color: "white",
            padding: "10px 20px",
            borderRadius: "5px",
            fontWeight: "bold",
            textShadow: "0 0 5px black",
            zIndex: 99,
          }}>
          WARNING: Safe Zone Shrinking -{" "}
          {safeZoneTimeRemaining !== null
            ? `${Math.floor(safeZoneTimeRemaining)}s`
            : ""}
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

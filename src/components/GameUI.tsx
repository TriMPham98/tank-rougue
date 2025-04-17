import { useGameState } from "../utils/gameState";
import "./GameUI.css";
import { UpgradeableStat } from "../utils/gameState";
import { useState, useCallback, useEffect, useRef } from "react";
import WeaponSelection from "./WeaponSelection";
import "./WeaponSelection.css";

// Define BASE_TARGETS constant for enemy count calculation
const BASE_TARGETS = 1;

// Calculate max hostiles for a given rank (matches the logic in respawnManager.ts)
const getMaxTargets = (rank: number): number => {
  if (rank === 1) return 1;
  if (rank <= 10) {
    return Math.min(BASE_TARGETS + Math.floor(Math.sqrt(rank) * 1.25), 15);
  } else if (rank < 40) {
    return Math.min(BASE_TARGETS + Math.floor(Math.sqrt(rank) * 2), 15);
  } else {
    return Math.min(BASE_TARGETS + Math.floor(Math.sqrt(rank) * 2.3), 20);
  }
};

const GameUI = () => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isOutsideCombatZone, setIsOutsideCombatZone] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const warningOpacityRef = useRef(0);
  const warningAnimationRef = useRef<number>(0);
  const [isCombatZoneWarningVisible, setIsCombatZoneWarningVisible] =
    useState(false);
  const combatZoneShrinkWarningRef = useRef<number>(0);
  const [combatZoneTimeRemaining, setCombatZoneTimeRemaining] = useState<
    number | null
  >(null);
  const lastZoneUpdateTimeRef = useRef(0);
  const lastZoneRadiusRef = useRef(0);

  const {
    playerHealth,
    playerMaxHealth,
    score,
    level: rank,
    enemiesDefeated: targetsEliminated,
    enemiesRequiredForNextLevel: targetsRequiredForPromotion,
    isGameOver,
    isPaused,
    restartGame,
    togglePause,
    showUpgradeUI: showEnhancementUI,
    availableUpgrades: availableEnhancements,
    upgradeStat: applyEnhancement,
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
    safeZoneActive: combatZoneActive,
    safeZoneRadius: combatZoneRadius,
    safeZoneCenter: combatZoneCenter,
    playerTankPosition,
    enemies: hostiles,
    safeZoneTargetRadius: combatZoneTargetRadius,
    safeZoneShrinkRate: combatZoneShrinkRate,
    isPreZoneChangeLevel: isPreContainmentShiftRank,
  } = useGameState();

  // Reset elapsed time when game is restarted
  useEffect(() => {
    setElapsedTime(0);
  }, [isGameOver]);

  // Check for weapon selection opportunity when rank changes
  useEffect(() => {
    if (
      [10, 20, 30, 40].includes(rank) &&
      selectedWeapons.length < Math.min(Math.floor(rank / 10), 4) &&
      !isGameOver
    ) {
      useGameState.setState({ showWeaponSelection: true });
    }
  }, [rank, isGameOver, selectedWeapons.length]);

  // Monitor weapon selection state
  useEffect(() => {}, [showWeaponSelection, selectedWeapons]);

  // Handle keyboard shortcuts for enhancements and weapons
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (isUpgrading) return;

      if (showEnhancementUI) {
        const keyIndex = parseInt(event.key) - 1;
        if (
          keyIndex >= 0 &&
          keyIndex < 3 &&
          keyIndex < availableEnhancements.length
        ) {
          handleEnhancementSelect(availableEnhancements[keyIndex]);
        }
      }

      if (showWeaponSelection) {
        const keyIndex = parseInt(event.key) - 1;
        if (
          keyIndex >= 0 &&
          keyIndex < 4 &&
          keyIndex < availableWeapons.length
        ) {
          selectWeapon(availableWeapons[keyIndex]);
          closeWeaponSelection();
          if (rank <= 50) {
            useGameState.setState({ showUpgradeUI: true });
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [
    showEnhancementUI,
    showWeaponSelection,
    availableEnhancements,
    availableWeapons,
    isUpgrading,
    rank,
    applyEnhancement,
    selectWeapon,
    closeWeaponSelection,
  ]);

  const handleEnhancementSelect = useCallback(
    (stat: UpgradeableStat) => {
      if (isUpgrading) return;
      setIsUpgrading(true);
      applyEnhancement(stat);
      setTimeout(() => setIsUpgrading(false), 500);
    },
    [applyEnhancement, isUpgrading]
  );

  const hullIntegrityPercentage = (playerHealth / playerMaxHealth) * 100;
  const promotionProgressPercentage =
    (targetsEliminated / targetsRequiredForPromotion) * 100;

  const getHullColor = () => {
    if (hullIntegrityPercentage > 60) return "var(--color-hull-high)";
    if (hullIntegrityPercentage > 30) return "var(--color-hull-medium)";
    return "var(--color-hull-low)";
  };

  const getRankColor = () => {
    if (rank <= 15) return "var(--color-rank-low)"; // Early game - 5 damage
    if (rank <= 25) return "var(--color-rank-medium)"; // Mid game - 10 damage
    if (rank <= 40) return "var(--color-rank-high)"; // Late mid game - 15 damage
    return "var(--color-rank-elite)"; // Late game - 20 damage
  };

  const getStatDisplayName = (stat: UpgradeableStat) => {
    switch (stat) {
      case "tankSpeed":
        return "Mobility";
      case "fireRate":
        return "Rate of Fire (RoF)";
      case "cameraRange":
        return "Sensor Range";
      case "maxHealth":
        return "Armor Plating";
      case "healthRegen":
        return "Repair Systems";
      case "turretDamage":
        return "Firepower";
      case "bulletVelocity":
        return "Muzzle Velocity";
    }
  };

  const getStatCurrentValue = (stat: UpgradeableStat) => {
    switch (stat) {
      case "tankSpeed":
        return `${playerSpeed.toFixed(1)} m/s`;
      case "fireRate":
        return `${(1 / playerFireRate).toFixed(1)} rps`;
      case "cameraRange":
        return `${playerCameraRange.toFixed(0)}m`;
      case "maxHealth":
        return `${playerMaxHealth} HP`;
      case "healthRegen":
        return `${playerHealthRegen.toFixed(1)} HP/s`;
      case "turretDamage":
        return `${playerTurretDamage} DMG`;
      case "bulletVelocity":
        return `${playerBulletVelocity} m/s`;
    }
  };

  const getStatPostUpgradeValue = (stat: UpgradeableStat) => {
    switch (stat) {
      case "tankSpeed":
        return `${(playerSpeed + 0.5).toFixed(1)} m/s`;
      case "fireRate":
        const currentRPS = 1 / playerFireRate;
        const newRPS = Math.min(3.5, currentRPS + 0.1);
        return `${newRPS.toFixed(1)} rps`;
      case "cameraRange":
        return `${(playerCameraRange + 2).toFixed(0)}m`;
      case "maxHealth":
        return `${playerMaxHealth + 25} HP`;
      case "healthRegen":
        return `${(playerHealthRegen + 0.5).toFixed(1)} HP/s`;
      case "turretDamage":
        return `${playerTurretDamage + 5} DMG`;
      case "bulletVelocity":
        return `${playerBulletVelocity + 2} m/s`;
    }
  };

  const getStatDescription = (stat: UpgradeableStat) => {
    switch (stat) {
      case "tankSpeed":
        return "Enhance chassis servos for faster battlefield repositioning.";
      case "fireRate":
        return "Optimize loading mechanism for increased rounds per second.";
      case "cameraRange":
        return "Upgrade sensor suite for extended tactical awareness.";
      case "maxHealth":
        return "Reinforce hull structure, increasing damage tolerance.";
      case "healthRegen":
        return "Install nano-repair bots for passive armor regeneration.";
      case "turretDamage":
        return "Calibrate main gun for higher impact kinetic energy.";
      case "bulletVelocity":
        return "Improve projectile propulsion for faster target engagement.";
    }
  };

  const renderWeaponSelection = () => {
    if (!showWeaponSelection || isGameOver) {
      return null;
    }

    return (
      <WeaponSelection
        onWeaponSelect={(weapon) => {
          selectWeapon(weapon);
          closeWeaponSelection();
          if (rank <= 50) {
            useGameState.setState({ showUpgradeUI: true });
          }
        }}
        onClose={() => {
          closeWeaponSelection();
          if (rank <= 50) {
            useGameState.setState({ showUpgradeUI: true });
          }
        }}
        state={{
          availableWeapons,
          selectedWeapons,
          level: rank,
          canSelect:
            selectedWeapons.length < Math.min(Math.floor(rank / 10), 4),
        }}
      />
    );
  };

  useEffect(() => {
    if (!combatZoneActive || !playerTankPosition) {
      setIsOutsideCombatZone(false);
      return;
    }
    const playerPos2D = [playerTankPosition[0], playerTankPosition[2]];
    const centerPos = [combatZoneCenter[0], combatZoneCenter[1]];
    const distance = Math.sqrt(
      Math.pow(playerPos2D[0] - centerPos[0], 2) +
        Math.pow(playerPos2D[1] - centerPos[1], 2)
    );
    const isOutside = distance > combatZoneRadius;
    if (isOutside !== isOutsideCombatZone) {
      setIsOutsideCombatZone(isOutside);
    }
  }, [
    playerTankPosition,
    combatZoneRadius,
    combatZoneCenter,
    combatZoneActive,
    isOutsideCombatZone,
  ]);

  useEffect(() => {
    if (!combatZoneActive || isGameOver || isPaused) {
      setIsCombatZoneWarningVisible(false);
      return;
    }
    if (combatZoneRadius - combatZoneTargetRadius > 0.5) {
      setIsCombatZoneWarningVisible(true);
      const approxTimeToClose = Math.floor(
        (combatZoneRadius - combatZoneTargetRadius) / combatZoneShrinkRate
      );
      if (
        combatZoneTimeRemaining === null ||
        Math.abs(lastZoneRadiusRef.current - combatZoneRadius) > 0.5
      ) {
        setCombatZoneTimeRemaining(approxTimeToClose);
        lastZoneRadiusRef.current = combatZoneRadius;
        lastZoneUpdateTimeRef.current = Date.now();
      }
      const timerId = setTimeout(() => {
        setIsCombatZoneWarningVisible(false);
      }, 5000);
      return () => clearTimeout(timerId);
    } else {
      setIsCombatZoneWarningVisible(false);
      setCombatZoneTimeRemaining(null);
    }
  }, [
    combatZoneRadius,
    combatZoneTargetRadius,
    combatZoneActive,
    isGameOver,
    isPaused,
    combatZoneShrinkRate,
    combatZoneTimeRemaining,
  ]);

  useEffect(() => {
    if (
      combatZoneTimeRemaining === null ||
      isPaused ||
      isGameOver ||
      !combatZoneActive
    ) {
      return;
    }

    let lastUpdateTimestamp = lastZoneUpdateTimeRef.current;

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = (now - lastUpdateTimestamp) / 1000;
      lastUpdateTimestamp = now;

      setCombatZoneTimeRemaining((prevTime) => {
        const newTime = Math.max(0, (prevTime ?? 0) - elapsedSeconds);
        if (newTime <= 0) {
          clearInterval(timer);
          return null;
        }
        return newTime;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [combatZoneTimeRemaining, isPaused, isGameOver, combatZoneActive]);

  useEffect(() => {
    let animationFrameId: number;
    if (!isOutsideCombatZone) {
      warningOpacityRef.current = 0;
      cancelAnimationFrame(warningAnimationRef.current);
      return;
    }
    let startTime: number;
    const duration = 1000;
    const animateOutsideWarning = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      warningOpacityRef.current =
        0.4 + (Math.sin((elapsed / duration) * Math.PI * 2) + 1) / 4;
      animationFrameId = requestAnimationFrame(animateOutsideWarning);
      warningAnimationRef.current = animationFrameId;
    };
    animationFrameId = requestAnimationFrame(animateOutsideWarning);
    warningAnimationRef.current = animationFrameId;
    return () => {
      cancelAnimationFrame(warningAnimationRef.current);
    };
  }, [isOutsideCombatZone]);

  useEffect(() => {
    let animationFrameId: number;
    if (!isCombatZoneWarningVisible) {
      combatZoneShrinkWarningRef.current = 0;
      cancelAnimationFrame(warningAnimationRef.current);
      return;
    }
    let startTime: number;
    const duration = 800;
    const animateShrinkWarning = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      combatZoneShrinkWarningRef.current =
        0.5 + (Math.sin((elapsed / duration) * Math.PI * 2) + 1) / 4;
      animationFrameId = requestAnimationFrame(animateShrinkWarning);
      warningAnimationRef.current = animationFrameId;
    };
    animationFrameId = requestAnimationFrame(animateShrinkWarning);
    warningAnimationRef.current = animationFrameId;
    return () => {
      cancelAnimationFrame(warningAnimationRef.current);
    };
  }, [isCombatZoneWarningVisible]);

  const [showContainmentWarning, setShowContainmentWarning] = useState(false);
  const containmentWarningOpacityRef = useRef(0);

  const calculateNextZoneInfo = useCallback(() => {
    const maxRadius = 50;
    const minRadius = 5;
    const radiusDecrease = 4;
    const currentZoneTier = Math.floor(rank / 5);
    const nextZoneTier = currentZoneTier + 1;
    const nextZoneShiftRank = nextZoneTier * 5;
    const nextZoneTargetRadius = Math.max(
      minRadius,
      maxRadius - nextZoneTier * radiusDecrease
    );
    return { nextZoneTargetRadius, nextZoneShiftRank };
  }, [rank]);

  const { nextZoneTargetRadius, nextZoneShiftRank } = calculateNextZoneInfo();

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  useEffect(() => {
    let animationFrameId: number;
    if (
      !isPreContainmentShiftRank ||
      !combatZoneActive ||
      isPaused ||
      isGameOver
    ) {
      setShowContainmentWarning(false);
      cancelAnimationFrame(warningAnimationRef.current);
      return;
    }
    setShowContainmentWarning(true);
    let startTime: number;
    const duration = 1200;
    const animateContainmentWarning = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      containmentWarningOpacityRef.current =
        0.6 + (Math.sin((elapsed / duration) * Math.PI * 2) + 1) * 0.15;
      if (showContainmentWarning) {
        animationFrameId = requestAnimationFrame(animateContainmentWarning);
        warningAnimationRef.current = animationFrameId;
      }
    };
    animationFrameId = requestAnimationFrame(animateContainmentWarning);
    warningAnimationRef.current = animationFrameId;
    return () => {
      cancelAnimationFrame(warningAnimationRef.current);
    };
  }, [
    isPreContainmentShiftRank,
    combatZoneActive,
    isPaused,
    isGameOver,
    showContainmentWarning,
  ]);

  const renderTacticalDisplay = useCallback(() => {
    const mapSize = 150;
    const gameWorldSize = 100;
    const scale = mapSize / gameWorldSize;

    const playerXRaw = playerTankPosition
      ? playerTankPosition[0] * scale + mapSize / 2
      : mapSize / 2;
    const playerYRaw = playerTankPosition
      ? playerTankPosition[2] * scale + mapSize / 2
      : mapSize / 2;
    const playerX = Math.max(3, Math.min(mapSize - 3, playerXRaw));
    const playerY = Math.max(3, Math.min(mapSize - 3, playerYRaw));

    const zoneCenterX = combatZoneCenter[0] * scale + mapSize / 2;
    const zoneCenterY = combatZoneCenter[1] * scale + mapSize / 2;
    const zoneRadiusPixels = combatZoneRadius * scale;
    const zoneTargetRadiusPixels = combatZoneTargetRadius * scale;

    const zoneTier = Math.floor(rank / 5);
    const isPreShiftRank = rank % 5 === 4 && rank >= 4;

    const nextZoneRadius = Math.max(5, 50 - (zoneTier + 1) * 4);
    const nextZoneRadiusPixels = nextZoneRadius * scale;

    return (
      <>
        <div className="elapsed-time-display">{formatTime(elapsedTime)}</div>
        <div className="tactical-display">
          <div className="radar-bg">
            <div className="radar-rings ring-1"></div>
            <div className="radar-rings ring-2"></div>
            <div className="radar-rings ring-3"></div>
          </div>

          {combatZoneActive && (
            <>
              <div
                className="zone-circle current-zone"
                style={{
                  left: `${zoneCenterX - zoneRadiusPixels}px`,
                  top: `${zoneCenterY - zoneRadiusPixels}px`,
                  width: `${zoneRadiusPixels * 2}px`,
                  height: `${zoneRadiusPixels * 2}px`,
                }}
              />

              {combatZoneTargetRadius < combatZoneRadius &&
                combatZoneRadius - combatZoneTargetRadius > 0.1 && (
                  <div
                    className="zone-circle target-zone"
                    style={{
                      left: `${zoneCenterX - zoneTargetRadiusPixels}px`,
                      top: `${zoneCenterY - zoneTargetRadiusPixels}px`,
                      width: `${zoneTargetRadiusPixels * 2}px`,
                      height: `${zoneTargetRadiusPixels * 2}px`,
                    }}
                  />
                )}

              {isPreShiftRank && (
                <div
                  className="zone-circle next-zone-preview"
                  style={{
                    left: `${zoneCenterX - nextZoneRadiusPixels}px`,
                    top: `${zoneCenterY - nextZoneRadiusPixels}px`,
                    width: `${nextZoneRadiusPixels * 2}px`,
                    height: `${nextZoneRadiusPixels * 2}px`,
                  }}
                />
              )}
            </>
          )}

          {hostiles.map((hostile) => {
            const hostileXRaw = hostile.position[0] * scale + mapSize / 2;
            const hostileYRaw = hostile.position[2] * scale + mapSize / 2;
            const hostileX = Math.max(2, Math.min(mapSize - 2, hostileXRaw));
            const hostileY = Math.max(2, Math.min(mapSize - 2, hostileYRaw));

            let hostileClass = "hostile-marker tank";
            if (hostile.type === "turret")
              hostileClass = "hostile-marker turret";
            else if (hostile.type === "bomber")
              hostileClass = "hostile-marker bomber";

            return (
              <div
                key={`tacmap-hostile-${hostile.id}`}
                className={hostileClass}
                style={{
                  left: `${hostileX}px`,
                  top: `${hostileY}px`,
                }}
              />
            );
          })}

          <div
            className="player-marker"
            style={{
              left: `${playerX}px`,
              top: `${playerY}px`,
            }}
          />
        </div>
      </>
    );
  }, [
    playerTankPosition,
    combatZoneRadius,
    combatZoneCenter,
    combatZoneActive,
    hostiles,
    combatZoneTargetRadius,
    rank,
    isPreContainmentShiftRank,
    elapsedTime,
    formatTime,
  ]);

  // Add timer effect
  useEffect(() => {
    if (isGameOver || isPaused) return;

    const timer = setInterval(() => {
      setElapsedTime((prevTime) => prevTime + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isGameOver, isPaused]);

  return (
    <div
      className={`game-ui military-theme ${
        isGameOver ? "blur-background" : ""
      }`}>
      {showContainmentWarning && !isGameOver && !isPaused && (
        <div
          className="warning-overlay containment-warning"
          style={
            {
              "--opacity": containmentWarningOpacityRef.current,
            } as React.CSSProperties
          }>
          <div className="warning-icon">☢️</div>
          <div className="warning-text">
            <div>IMMINENT CONTAINMENT SHIFT</div>
            <div>
              Combat Zone shrinking to {nextZoneTargetRadius.toFixed(0)}m at
              Rank {nextZoneShiftRank}
            </div>
          </div>
        </div>
      )}
      {!isGameOver && !isPaused && renderTacticalDisplay()}
      <div className="top-hud">
        <div className="hud-element hull-integrity">
          <div className="hud-label">HULL INTEGRITY</div>
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{
                width: `${hullIntegrityPercentage}%`,
                backgroundColor: getHullColor(),
              }}
            />
            <div className="progress-text">
              {playerHealth.toFixed(0)} / {playerMaxHealth.toFixed(0)}
            </div>
          </div>
        </div>
        <div className="hud-element combat-score">
          <div className="hud-label">COMBAT SCORE</div>
          <div className="score-value">{score}</div>
        </div>
        <div className="hud-element rank-progression">
          <div className="hud-label">
            RANK <span className="rank-indicator">{rank}</span>
            <span className="target-count-info">
              (Targets: {getMaxTargets(rank)})
            </span>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{
                width: `${promotionProgressPercentage}%`,
                backgroundColor: getRankColor(),
              }}
            />
          </div>
          <div className="progress-label">
            Next Promotion: {targetsEliminated} / {targetsRequiredForPromotion}
          </div>
        </div>
      </div>
      <div className="player-stats-panel">
        <div className="panel-header">UNIT STATUS</div>
        <div className="stat-line">
          <span>Armor:</span>
          <span>{playerMaxHealth} HP</span>
        </div>
        <div className="stat-line">
          <span>Repairs:</span>
          <span>{playerHealthRegen.toFixed(1)} HP/s</span>
        </div>
        <div className="stat-line">
          <span>Firepower:</span>
          <span>{playerTurretDamage} DMG</span>
        </div>
        <div className="stat-line">
          <span>RoF:</span>
          <span>{(1 / playerFireRate).toFixed(1)} rps</span>
        </div>
        <div className="stat-line">
          <span>Muzzle Vel:</span>
          <span>{playerBulletVelocity} m/s</span>
        </div>
        <div className="stat-line">
          <span>Mobility:</span>
          <span>{playerSpeed.toFixed(1)} m/s</span>
        </div>
        <div className="stat-line">
          <span>Sensors:</span>
          <span>{playerCameraRange.toFixed(0)}m</span>
        </div>
      </div>
      {showEnhancementUI && !isGameOver && (
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
                  onClick={() => handleEnhancementSelect(stat)}>
                  <div className="enhancement-keybind">{index + 1}</div>
                  <div className="enhancement-name">
                    {getStatDisplayName(stat)}
                  </div>
                  <div className="enhancement-value">
                    {getStatCurrentValue(stat)} →{" "}
                    <span className="value-increase">
                      {getStatPostUpgradeValue(stat)}
                    </span>
                  </div>
                  <div className="enhancement-desc">
                    {getStatDescription(stat)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {isOutsideCombatZone && !isGameOver && !isPaused && (
        <div
          className="warning-overlay outside-zone-warning"
          style={
            { "--opacity": warningOpacityRef.current } as React.CSSProperties
          }>
          <div className="warning-icon">⚠️</div>
          <div className="warning-text">WARNING: OUTSIDE COMBAT ZONE</div>
        </div>
      )}
      {/* Combat Zone Warning */}
      {isCombatZoneWarningVisible && !isGameOver && !isPaused && (
        <div
          style={{
            position: "fixed",
            bottom: "120px", // Position above controls
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            backgroundColor: "rgba(240, 173, 78, 0.8)",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "5px",
            boxShadow: "0 0 15px rgba(240, 173, 78, 0.5)",
            textAlign: "center",
            fontWeight: "bold",
            pointerEvents: "none",
            opacity: 1,
            transition: "opacity 0.3s ease-in-out",
          }}>
          Combat zone is shrinking!
        </div>
      )}
      {isGameOver && (
        <div className="overlay game-over-overlay">
          <div className="overlay-content game-over-content">
            <h2 className="game-over-title">MISSION FAILED</h2>
            <p>Combat Score: {score}</p>
            <p>Highest Rank Achieved: {rank}</p>
            <button className="ui-button restart-button" onClick={restartGame}>
              RE-DEPLOY
            </button>
          </div>
        </div>
      )}
      {isPaused &&
        !isGameOver &&
        !showEnhancementUI &&
        !showWeaponSelection && (
          <div className="overlay pause-overlay">
            <div className="overlay-content pause-content">
              <h2 className="pause-title">OPERATION PAUSED</h2>
              <button className="ui-button resume-button" onClick={togglePause}>
                RESUME OPERATION
              </button>
            </div>
          </div>
        )}
      {renderWeaponSelection()}
      {!isGameOver && (
        <div className="controls-info">
          <span>[WASD] Move</span> | <span>[J/K] Turret</span> |{" "}
          <span>[ESC] Pause</span>
        </div>
      )}
    </div>
  );
};

export default GameUI;

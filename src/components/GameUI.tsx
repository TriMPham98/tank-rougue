import { useGameState } from "../utils/gameState";
import "../assets/GameUI.css"; // We will update this CSS file
import { UpgradeableStat } from "../utils/gameState";
import { useState, useCallback, useEffect, useRef } from "react";
import WeaponSelection from "./WeaponSelection";
import "./WeaponSelection.css"; // Ensure this is also themed if needed

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
  const warningOpacityRef = useRef(0);
  const warningAnimationRef = useRef<number>(0); // Ensure correct type
  const [isCombatZoneWarningVisible, setIsCombatZoneWarningVisible] =
    useState(false);
  const combatZoneShrinkWarningRef = useRef(0);
  const [combatZoneTimeRemaining, setCombatZoneTimeRemaining] = useState<
    number | null
  >(null);
  const lastZoneUpdateTimeRef = useRef(0);
  const lastZoneRadiusRef = useRef(0);

  const {
    playerHealth,
    playerMaxHealth,
    score, // Keep as score internally, display as "Kills" or "Combat Score"
    level: rank, // Rename level to rank conceptually
    enemiesDefeated: targetsEliminated, // Rename
    enemiesRequiredForNextLevel: targetsRequiredForPromotion, // Rename
    isGameOver,
    isPaused,
    restartGame,
    togglePause,
    showUpgradeUI: showEnhancementUI, // Rename
    availableUpgrades: availableEnhancements, // Rename
    upgradeStat: applyEnhancement, // Rename
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
    // Combat zone properties (renamed from safe zone)
    safeZoneActive: combatZoneActive, // Rename
    safeZoneRadius: combatZoneRadius, // Rename
    safeZoneCenter: combatZoneCenter, // Rename
    playerTankPosition,
    enemies: hostiles, // Rename
    safeZoneTargetRadius: combatZoneTargetRadius, // Rename
    safeZoneShrinkRate: combatZoneShrinkRate, // Rename
    safeZoneDamage: combatZoneDamage, // Rename
    isPreZoneChangeLevel: isPreContainmentShiftRank, // Rename
  } = useGameState();

  // Check for weapon selection opportunity when rank changes
  useEffect(() => {
    if (
      [10, 20, 30, 40].includes(rank) &&
      selectedWeapons.length < Math.min(Math.floor(rank / 10), 4) &&
      !isGameOver
    ) {
      useGameState.setState({ showWeaponSelection: true });
    }
  }, [rank, isGameOver, selectedWeapons.length]); // Added selectedWeapons.length dependency

  // Monitor weapon selection state
  useEffect(() => {
    // Empty effect for monitoring weapon selection state changes
  }, [showWeaponSelection, selectedWeapons]);

  // Handle keyboard shortcuts for enhancements and weapons
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (isUpgrading) return; // Still use isUpgrading flag

      // Handle rank enhancements (1-3)
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

      // Handle weapon acquisition (1-4)
      if (showWeaponSelection) {
        const keyIndex = parseInt(event.key) - 1;
        if (
          keyIndex >= 0 &&
          keyIndex < 4 &&
          keyIndex < availableWeapons.length
        ) {
          selectWeapon(availableWeapons[keyIndex]);
          closeWeaponSelection();
          // Show enhancement UI after weapon selection only if rank <= 50
          if (rank <= 50) {
            useGameState.setState({ showUpgradeUI: true }); // Keep internal state name
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
    applyEnhancement, // Added missing dependencies
    selectWeapon,
    closeWeaponSelection,
  ]);

  // useCallback for handleEnhancementSelect with correct dependencies
  const handleEnhancementSelect = useCallback(
    (stat: UpgradeableStat) => {
      if (isUpgrading) return;
      setIsUpgrading(true);
      applyEnhancement(stat);
      // Add a visual feedback delay or animation trigger here if desired
      setTimeout(() => setIsUpgrading(false), 500); // Reduced delay?
    },
    [applyEnhancement, isUpgrading]
  ); // Removed 'rank' from here as it's not directly used

  const hullIntegrityPercentage = (playerHealth / playerMaxHealth) * 100;
  const promotionProgressPercentage =
    (targetsEliminated / targetsRequiredForPromotion) * 100;

  // --- Theming Functions ---
  const getHullColor = () => {
    if (hullIntegrityPercentage > 60) return "var(--color-hull-high)";
    if (hullIntegrityPercentage > 30) return "var(--color-hull-medium)";
    return "var(--color-hull-low)";
  };

  const getRankColor = () => {
    if (rank <= 3) return "var(--color-rank-low)";
    if (rank <= 7) return "var(--color-rank-medium)";
    if (rank <= 12) return "var(--color-rank-high)";
    return "var(--color-rank-elite)";
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
        return `${(1 / playerFireRate).toFixed(1)} rps`; // Rounds per second
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
    // Keep the underlying logic, just update display format if needed
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
  // --- End Theming Functions ---

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
            useGameState.setState({ showUpgradeUI: true }); // Internal state name
          }
        }}
        onClose={() => {
          closeWeaponSelection();
          if (rank <= 50) {
            useGameState.setState({ showUpgradeUI: true }); // Internal state name
          }
        }}
        state={{
          availableWeapons,
          selectedWeapons,
          level: rank, // Pass rank
          canSelect:
            selectedWeapons.length < Math.min(Math.floor(rank / 10), 4),
        }}
      />
    );
  };

  // Check if player is outside the combat zone
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

  // Check if the combat zone is shrinking to show warning
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
      }, 5000); // Warning duration
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

  // Update the countdown timer continuously
  useEffect(() => {
    if (
      combatZoneTimeRemaining === null ||
      isPaused ||
      isGameOver ||
      !combatZoneActive
    ) {
      return;
    }

    let lastUpdateTimestamp = lastZoneUpdateTimeRef.current; // Capture initial timestamp

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = (now - lastUpdateTimestamp) / 1000;
      lastUpdateTimestamp = now; // Update timestamp for next interval

      setCombatZoneTimeRemaining((prevTime) => {
        const newTime = Math.max(0, (prevTime ?? 0) - elapsedSeconds);
        if (newTime <= 0) {
          clearInterval(timer); // Stop timer when time reaches 0
          return null; // Set to null when done
        }
        return newTime;
      });
    }, 100); // Update more frequently for smoother countdown appearance

    return () => clearInterval(timer);
  }, [combatZoneTimeRemaining, isPaused, isGameOver, combatZoneActive]); // Dependencies

  // Animate warning opacity for outside combat zone warning
  useEffect(() => {
    let animationFrameId: number;
    if (!isOutsideCombatZone) {
      warningOpacityRef.current = 0;
      cancelAnimationFrame(warningAnimationRef.current); // Ensure previous animation is stopped
      return;
    }
    let startTime: number;
    const duration = 1000; // 1 second cycle
    const animateOutsideWarning = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      // Oscillate between 0.4 and 0.9 opacity for higher visibility
      warningOpacityRef.current =
        0.4 + (Math.sin((elapsed / duration) * Math.PI * 2) + 1) / 4;
      animationFrameId = requestAnimationFrame(animateOutsideWarning);
      warningAnimationRef.current = animationFrameId; // Store the id
    };
    animationFrameId = requestAnimationFrame(animateOutsideWarning);
    warningAnimationRef.current = animationFrameId; // Store the id
    return () => {
      cancelAnimationFrame(warningAnimationRef.current);
    };
  }, [isOutsideCombatZone]);

  // Animate combat zone shrinking warning opacity
  useEffect(() => {
    let animationFrameId: number;
    if (!isCombatZoneWarningVisible) {
      combatZoneShrinkWarningRef.current = 0;
      cancelAnimationFrame(warningAnimationRef.current);
      return;
    }
    let startTime: number;
    const duration = 800; // Faster pulse for urgency
    const animateShrinkWarning = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      // Oscillate between 0.5 and 1.0
      combatZoneShrinkWarningRef.current =
        0.5 + (Math.sin((elapsed / duration) * Math.PI * 2) + 1) / 4;
      animationFrameId = requestAnimationFrame(animateShrinkWarning);
      warningAnimationRef.current = animationFrameId; // Store the id
    };
    animationFrameId = requestAnimationFrame(animateShrinkWarning);
    warningAnimationRef.current = animationFrameId; // Store the id
    return () => {
      cancelAnimationFrame(warningAnimationRef.current);
    };
  }, [isCombatZoneWarningVisible]);

  // Add warning for pre-containment shift ranks
  const [showContainmentWarning, setShowContainmentWarning] = useState(false);
  const containmentWarningOpacityRef = useRef(0);

  // Calculate next zone values for warning
  const calculateNextZoneInfo = useCallback(() => {
    const maxRadius = 50;
    const minRadius = 5;
    const radiusDecrease = 4;
    const currentZoneTier = Math.floor(rank / 5);
    const nextZoneTier = currentZoneTier + 1;
    const nextZoneShiftRank = nextZoneTier * 5; // Rank at which the next shift happens
    const nextZoneTargetRadius = Math.max(
      minRadius,
      maxRadius - nextZoneTier * radiusDecrease
    );
    return { nextZoneTargetRadius, nextZoneShiftRank };
  }, [rank]);

  const { nextZoneTargetRadius, nextZoneShiftRank } = calculateNextZoneInfo();

  // Effect to show and animate containment shift warning
  useEffect(() => {
    let animationFrameId: number;
    if (
      !isPreContainmentShiftRank ||
      !combatZoneActive ||
      isPaused ||
      isGameOver
    ) {
      setShowContainmentWarning(false);
      cancelAnimationFrame(warningAnimationRef.current); // Stop animation if conditions not met
      return;
    }
    setShowContainmentWarning(true);
    let startTime: number;
    const duration = 1200; // Slower pulse than shrink warning
    const animateContainmentWarning = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      // Oscillate between 0.6 and 0.9
      containmentWarningOpacityRef.current =
        0.6 + (Math.sin((elapsed / duration) * Math.PI * 2) + 1) * 0.15;
      // Check condition again inside loop to stop if necessary
      if (showContainmentWarning) {
        animationFrameId = requestAnimationFrame(animateContainmentWarning);
        warningAnimationRef.current = animationFrameId; // Store the id
      }
    };
    animationFrameId = requestAnimationFrame(animateContainmentWarning);
    warningAnimationRef.current = animationFrameId; // Store the id
    return () => {
      cancelAnimationFrame(warningAnimationRef.current);
      // Optionally reset opacity ref here if needed when component unmounts or condition changes
      // containmentWarningOpacityRef.current = 0;
    };
  }, [
    isPreContainmentShiftRank,
    combatZoneActive,
    isPaused,
    isGameOver,
    showContainmentWarning,
  ]); // Added showContainmentWarning dependency

  // --- Minimap / Tactical Display ---
  const renderTacticalDisplay = useCallback(() => {
    const mapSize = 150; // Increased by 25% from 120
    const gameWorldSize = 100;
    const scale = mapSize / gameWorldSize;

    // Clamp player position to map boundaries visually
    const playerXRaw = playerTankPosition
      ? playerTankPosition[0] * scale + mapSize / 2
      : mapSize / 2;
    const playerYRaw = playerTankPosition
      ? playerTankPosition[2] * scale + mapSize / 2
      : mapSize / 2;
    const playerX = Math.max(3, Math.min(mapSize - 3, playerXRaw)); // Clamp within map bounds slightly
    const playerY = Math.max(3, Math.min(mapSize - 3, playerYRaw));

    const zoneCenterX = combatZoneCenter[0] * scale + mapSize / 2;
    const zoneCenterY = combatZoneCenter[1] * scale + mapSize / 2;
    const zoneRadiusPixels = combatZoneRadius * scale;
    const zoneTargetRadiusPixels = combatZoneTargetRadius * scale;

    const formatTimeRemaining = () => {
      if (combatZoneTimeRemaining === null || combatZoneTimeRemaining <= 0)
        return "STABLE";
      const totalSeconds = Math.floor(combatZoneTimeRemaining);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const getTimerColor = () => {
      if (combatZoneTimeRemaining === null || combatZoneTimeRemaining <= 0)
        return "var(--color-zone-stable)";
      if (combatZoneTimeRemaining > 30) return "var(--color-zone-closing)";
      return "var(--color-zone-urgent)"; // Urgent red
    };

    const zoneTier = Math.floor(rank / 5);
    const isZoneShiftRank = rank % 5 === 0 && rank > 0;
    const nextZoneShiftRankCalc = (zoneTier + 1) * 5;
    const ranksUntilNextShift = nextZoneShiftRankCalc - rank;
    const zoneProgress =
      zoneTier === 0 ? 0 : ((5 - ranksUntilNextShift) / 5) * 100; // Progress towards next *shift* rank

    const calculateZoneShrinkProgress = () => {
      // If the zone isn't shrinking in this phase, progress is 100%
      if (combatZoneTargetRadius >= combatZoneRadius) return 100;

      // Zone is stable or already fully shrunk for this tier before shift rank
      if (isZoneShiftRank) return 100;

      const maxRadius = 50;
      const minRadius = 5;
      const radiusDecrease = 4;

      // Radius at the START of the current shrink phase (usually after the last shift rank)
      const initialRadiusForThisPhase = Math.max(
        minRadius,
        maxRadius - zoneTier * radiusDecrease
      );

      // The target radius FOR THIS SHRINK PHASE (not necessarily the next tier's final radius)
      const currentTargetRadius = combatZoneTargetRadius;

      // Ensure initial radius is not smaller than the target radius for calculation consistency
      const effectiveInitialRadius = Math.max(
        initialRadiusForThisPhase,
        currentTargetRadius
      );

      // Total shrink needed *in this phase* (from start radius to target radius)
      const totalShrinkThisPhase = effectiveInitialRadius - currentTargetRadius;
      if (totalShrinkThisPhase <= 0.1) return 100; // No significant shrinking needed or already done

      // How much it has shrunk *from the initial radius of this phase* towards the target
      const shrunkAmount = effectiveInitialRadius - combatZoneRadius;

      return Math.min(
        100,
        Math.max(0, (shrunkAmount / totalShrinkThisPhase) * 100)
      );
    };

    const zoneShrinkProgress = calculateZoneShrinkProgress();
    const isPreShiftRank = rank % 5 === 4 && rank >= 4;

    const getUrgencyColor = () => {
      if (isZoneShiftRank || zoneShrinkProgress >= 100)
        return "var(--color-progress-complete)"; // Green/Teal
      if (isPreShiftRank) {
        if (zoneShrinkProgress < 90) return "var(--color-progress-urgent)"; // Red
        return "var(--color-progress-warning)"; // Orange/Amber
      }
      if (zoneShrinkProgress < 50) return "var(--color-progress-low)"; // Blue/Cyan
      if (zoneShrinkProgress < 85) return "var(--color-progress-medium)"; // Yellow/Light Orange
      return "var(--color-progress-high)"; // Orange/Amber approaching completion
    };

    const nextZoneRadius = Math.max(5, 50 - (zoneTier + 1) * 4);
    const nextZoneRadiusPixels = nextZoneRadius * scale;

    return (
      <div className="tactical-display">
        {/* Radar Background Elements */}
        <div className="radar-bg">
          <div className="radar-rings ring-1"></div>
          <div className="radar-rings ring-2"></div>
          <div className="radar-rings ring-3"></div>
        </div>

        {/* Combat Zone Circles */}
        {combatZoneActive && (
          <>
            {/* Current Zone */}
            <div
              className="zone-circle current-zone"
              style={{
                left: `${zoneCenterX - zoneRadiusPixels}px`,
                top: `${zoneCenterY - zoneRadiusPixels}px`,
                width: `${zoneRadiusPixels * 2}px`,
                height: `${zoneRadiusPixels * 2}px`,
              }}
            />

            {/* Target Zone (Shrinking To) */}
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

            {/* Next Zone Preview (Only on Pre-Shift Ranks) */}
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

        {/* Hostile Indicators */}
        {hostiles.map((hostile) => {
          const hostileXRaw = hostile.position[0] * scale + mapSize / 2;
          const hostileYRaw = hostile.position[2] * scale + mapSize / 2;
          // Clamp hostile positions too
          const hostileX = Math.max(2, Math.min(mapSize - 2, hostileXRaw));
          const hostileY = Math.max(2, Math.min(mapSize - 2, hostileYRaw));

          let hostileClass = "hostile-marker tank"; // Default
          if (hostile.type === "turret") hostileClass = "hostile-marker turret";
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

        {/* Player Indicator */}
        <div
          className="player-marker"
          style={{
            left: `${playerX}px`,
            top: `${playerY}px`,
          }}
        />
      </div>
    );
  }, [
    playerTankPosition,
    combatZoneRadius,
    combatZoneCenter,
    combatZoneActive,
    hostiles,
    combatZoneTargetRadius,
    combatZoneShrinkRate,
    combatZoneDamage,
    combatZoneTimeRemaining,
    rank,
    isPreContainmentShiftRank,
  ]);

  // --- JSX Structure ---
  return (
    // Added military-theme class
    <div
      className={`game-ui military-theme ${
        isGameOver ? "blur-background" : ""
      }`}>
      {/* Containment Shift Warning */}
      {showContainmentWarning && !isGameOver && !isPaused && (
        <div
          className="warning-overlay containment-warning"
          style={
            {
              "--opacity": containmentWarningOpacityRef.current,
            } as React.CSSProperties
          }>
          <div className="warning-icon">☢️</div> {/* Or other icon */}
          <div className="warning-text">
            <div>IMMINENT CONTAINMENT SHIFT</div>
            <div>
              Combat Zone shrinking to {nextZoneTargetRadius.toFixed(0)}m at
              Rank {nextZoneShiftRank}
            </div>
          </div>
        </div>
      )}
      {/* Tactical Display / Minimap */}
      {!isGameOver && !isPaused && renderTacticalDisplay()}
      {/* Top HUD */}
      <div className="top-hud">
        {/* Hull Integrity */}
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
        {/* Combat Score - Now a flex item */}
        <div className="hud-element combat-score">
          <div className="hud-label">COMBAT SCORE</div>
          <div className="score-value">{score}</div>
        </div>
        {/* Rank Progression */}
        <div className="hud-element rank-progression">
          <div className="hud-label">
            RANK{" "}
            <span
              className="rank-indicator"
              style={{ backgroundColor: getRankColor() }}>
              {rank}
            </span>
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
            {targetsEliminated} / {targetsRequiredForPromotion} Eliminated for
            Promotion
          </div>
        </div>
      </div>
      {/* Player Stats Panel */}
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
      {/* Enhancement UI Overlay */}
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
            {/* <div className="enhancement-prompt">Press 1, 2, or 3 to select</div> */}
          </div>
        </div>
      )}
      {/* Outside Combat Zone Warning */}
      {isOutsideCombatZone &&
        !isGameOver &&
        !isPaused && ( // Check !isGameOver and !isPaused
          <div
            className="warning-overlay outside-zone-warning"
            style={
              { "--opacity": warningOpacityRef.current } as React.CSSProperties
            }>
            <div className="warning-icon">⚠️</div>
            <div className="warning-text">WARNING: OUTSIDE COMBAT ZONE</div>
          </div>
        )}
      {/* Combat Zone Shrinking Warning */}
      {isCombatZoneWarningVisible &&
        !isGameOver &&
        !isPaused && ( // Check !isGameOver and !isPaused
          <div
            className="warning-overlay shrinking-zone-warning"
            style={
              {
                "--opacity": combatZoneShrinkWarningRef.current,
              } as React.CSSProperties
            }>
            <div className="warning-icon">⏱️</div> {/* Or other icon */}
            <div className="warning-text">COMBAT ZONE COLLAPSING </div>
          </div>
        )}
      {/* Game Over Overlay */}
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
      {/* Pause Overlay */}
      {isPaused &&
        !isGameOver &&
        !showEnhancementUI &&
        !showWeaponSelection && ( // Ensure pause doesn't overlap others
          <div className="overlay pause-overlay">
            <div className="overlay-content pause-content">
              <h2 className="pause-title">OPERATION PAUSED</h2>
              <button className="ui-button resume-button" onClick={togglePause}>
                RESUME OPERATION
              </button>
            </div>
          </div>
        )}
      {/* Weapon Selection UI */}
      {renderWeaponSelection()}{" "}
      {/* Assumes WeaponSelection component is also styled */}
      {/* Controls Info */}
      {!isGameOver && ( // Hide controls on game over
        <div className="controls-info">
          <span>[WASD] Move</span> | <span>[J/K] Turret</span> |{" "}
          <span>[ESC] Pause</span>
        </div>
      )}
    </div>
  );
};

export default GameUI;

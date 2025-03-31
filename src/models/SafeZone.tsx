import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameState } from "../utils/gameState";
import * as THREE from "three";

const SafeZone = () => {
  // Get game state
  const {
    safeZoneRadius,
    safeZoneCenter,
    safeZoneTargetRadius,
    safeZoneShrinkRate,
    safeZoneDamage,
    safeZoneActive,
    playerTankPosition,
    takeDamage,
    isPaused,
    isGameOver,
    level,
  } = useGameState();

  // Add state to track progress towards next zone level
  const [zoneProgress, setZoneProgress] = useState(0);

  // Reference to the cylinder mesh
  const cylinderRef = useRef<THREE.Mesh>(null);
  // References to the ring borders
  const topRingRef = useRef<THREE.Mesh>(null);
  const bottomRingRef = useRef<THREE.Mesh>(null);

  // References for target safe zone visualization
  const targetCylinderRef = useRef<THREE.Mesh>(null);
  const targetTopRingRef = useRef<THREE.Mesh>(null);
  const targetBottomRingRef = useRef<THREE.Mesh>(null);

  // Reference for damage tick
  const lastDamageTime = useRef(0);

  // Use refs to track current radius to avoid re-renders
  const currentRadiusRef = useRef(safeZoneRadius);

  // Track if shrinking is in progress to prevent restarts
  const isShrinkingRef = useRef(false);
  const targetRadiusRef = useRef(safeZoneTargetRadius);

  // Track initial and target radius for progress calculation
  const initialRadiusRef = useRef(safeZoneRadius);

  // Store estimated time to completion
  const estimatedTimeToCompleteRef = useRef(0);
  const startShrinkTimeRef = useRef(0);

  // Detect when player reaches a zone level (divisible by 5)
  const prevLevelRef = useRef(level);
  const isZoneCompletionEnforced = useRef(false);

  // Set the initial value
  useEffect(() => {
    // When we enter a level divisible by 5, enforce that we're at target radius
    if (level % 5 === 0 && level > 0 && prevLevelRef.current !== level) {
      currentRadiusRef.current = safeZoneTargetRadius;
      initialRadiusRef.current = safeZoneTargetRadius;
      isZoneCompletionEnforced.current = true;

      // Force update the state to ensure the zone is at the correct radius
      useGameState.setState({
        safeZoneRadius: safeZoneTargetRadius,
      });
    } else {
      isZoneCompletionEnforced.current = false;
    }

    // Update previous level reference
    prevLevelRef.current = level;

    // Only update the current radius if:
    // 1. It's not actively shrinking, or
    // 2. The new radius is smaller than the current one (level transition)
    // 3. We're not enforcing zone completion (for levels divisible by 5)
    if (
      (!isShrinkingRef.current || safeZoneRadius < currentRadiusRef.current) &&
      !isZoneCompletionEnforced.current
    ) {
      currentRadiusRef.current = safeZoneRadius;
      // When starting a new shrink, record the initial radius
      initialRadiusRef.current = safeZoneRadius;

      // Record start time when beginning to shrink to a new target
      if (safeZoneRadius > safeZoneTargetRadius) {
        startShrinkTimeRef.current = Date.now() / 1000; // Convert to seconds

        // Calculate rough estimate of time to completion based on shrink rate
        const radiusDifference = safeZoneRadius - safeZoneTargetRadius;
        estimatedTimeToCompleteRef.current =
          radiusDifference / safeZoneShrinkRate;
      }
    }

    // Always update the target radius so we know where to shrink to
    targetRadiusRef.current = safeZoneTargetRadius;
  }, [safeZoneRadius, safeZoneTargetRadius, safeZoneShrinkRate, level]);

  // Missing ref declaration
  const lastRadiusUpdateTime = useRef(0);

  // Check if we're on a level where the zone changes
  const isZoneChangeLevel = level % 5 === 0 && level > 0;
  // Calculate the current zone level (1 for levels 5-9, 2 for levels 10-14, etc.)
  const currentZoneLevel = Math.floor(level / 5);

  // Calculate next zone level and progress towards it
  const nextZoneLevel = currentZoneLevel + 1;
  const nextZoneLevelNumber = nextZoneLevel * 5;
  const levelsUntilNextZone = nextZoneLevelNumber - level;

  // Determine if we're on final level before zone change (to highlight urgency)
  const isPreZoneChangeLevel = level % 5 === 4;

  // Calculate the target radius for the next zone level
  const nextZoneTargetRadius = (() => {
    const maxRadius = 50;
    const minRadius = 5;
    const radiusDecrease = 4;
    return Math.max(minRadius, maxRadius - nextZoneLevel * radiusDecrease);
  })();

  // Calculate the percentage progress towards the next zone level target
  const getZoneCompletionPercentage = () => {
    if (isZoneChangeLevel) return 100; // Always 100% on zone change levels

    // Calculate how far we've shrunk from the initial zone radius toward the next zone target
    const initialZoneRadius = 50 - currentZoneLevel * 4;
    const totalShrinkNeeded = initialZoneRadius - nextZoneTargetRadius;
    const currentShrink = initialZoneRadius - safeZoneRadius;

    // Calculate the percentage and ensure it's between 0-100
    return Math.min(
      100,
      Math.max(0, (currentShrink / totalShrinkNeeded) * 100)
    );
  };

  // Update safe zone radius and apply damage outside the zone
  useFrame((state, delta) => {
    if (isPaused || isGameOver || !safeZoneActive) return;

    const currentState = useGameState.getState();
    const currentTime = state.clock.getElapsedTime();

    // Force the radius to target on zone change levels (divisible by 5)
    if (
      isZoneChangeLevel &&
      currentRadiusRef.current !== targetRadiusRef.current
    ) {
      currentRadiusRef.current = targetRadiusRef.current;

      // Update the game state to reflect this
      useGameState.setState({
        safeZoneRadius: targetRadiusRef.current,
      });

      // Skip the rest of the shrinking logic
      return;
    }

    // Only update the state if we need to shrink
    if (currentRadiusRef.current > currentState.safeZoneTargetRadius) {
      // Mark that shrinking is in progress
      isShrinkingRef.current = true;

      // Calculate new radius with a smoother transition
      const newRadius = Math.max(
        currentState.safeZoneTargetRadius,
        currentRadiusRef.current - currentState.safeZoneShrinkRate * delta * 0.8 // Added multiplier for smoother shrinking
      );

      // Only update state if the difference is significant (e.g., more than 0.01)
      if (Math.abs(currentRadiusRef.current - newRadius) > 0.01) {
        currentRadiusRef.current = newRadius;

        // Throttle state updates to be less frequent (e.g., every 200ms instead of 100ms)
        if (state.clock.elapsedTime - lastRadiusUpdateTime.current > 0.2) {
          useGameState.setState({
            safeZoneRadius: newRadius,
          });
          lastRadiusUpdateTime.current = state.clock.elapsedTime;
        }

        // Calculate progress percentage for visual feedback
        const totalShrinkAmount =
          initialRadiusRef.current - targetRadiusRef.current;
        const shrunkAmount =
          initialRadiusRef.current - currentRadiusRef.current;
        const progressPercentage = (shrunkAmount / totalShrinkAmount) * 100;
        setZoneProgress(Math.min(100, Math.max(0, progressPercentage)));
      }

      // Check if shrinking is complete
      if (
        Math.abs(currentRadiusRef.current - currentState.safeZoneTargetRadius) <
        0.1
      ) {
        isShrinkingRef.current = false;
        setZoneProgress(100); // Ensure we show 100% when complete
      }
    } else {
      // Reset shrinking flag when target is reached
      isShrinkingRef.current = false;
    }

    // Apply damage if player is outside the safe zone
    if (currentState.safeZoneActive && playerTankPosition) {
      const playerPosition2D = [playerTankPosition[0], playerTankPosition[2]];
      const centerPosition = [
        currentState.safeZoneCenter[0],
        currentState.safeZoneCenter[1],
      ];

      const distance = Math.sqrt(
        Math.pow(playerPosition2D[0] - centerPosition[0], 2) +
          Math.pow(playerPosition2D[1] - centerPosition[1], 2)
      );

      // If outside safe zone, apply damage periodically
      if (distance > currentRadiusRef.current) {
        const currentTime = state.clock.getElapsedTime();

        // Apply damage once per second
        if (currentTime - lastDamageTime.current >= 1) {
          takeDamage(currentState.safeZoneDamage);
          lastDamageTime.current = currentTime;
        }
      }
    }

    // Update meshes with current radius
    if (cylinderRef.current) {
      // Create a new geometry with the current radius
      if (Math.abs(cylinderRef.current.scale.x - 1) > 0.01) {
        cylinderRef.current.scale.set(1, 1, 1);

        // Replace the geometry with a new one using the current radius
        cylinderRef.current.geometry.dispose();
        cylinderRef.current.geometry = new THREE.CylinderGeometry(
          currentRadiusRef.current,
          currentRadiusRef.current,
          40, // Height of the cylinder
          64, // Segments around the cylinder
          1, // Height segments
          true // Open-ended
        );
      }
    }

    // Update the ring borders
    if (topRingRef.current && bottomRingRef.current) {
      topRingRef.current.geometry.dispose();
      bottomRingRef.current.geometry.dispose();

      // Create new ring geometries with current radius
      const ringThickness = 0.5;
      const newTopRingGeometry = new THREE.RingGeometry(
        currentRadiusRef.current - ringThickness,
        currentRadiusRef.current,
        64
      );
      const newBottomRingGeometry = new THREE.RingGeometry(
        currentRadiusRef.current - ringThickness,
        currentRadiusRef.current,
        64
      );

      topRingRef.current.geometry = newTopRingGeometry;
      bottomRingRef.current.geometry = newBottomRingGeometry;
    }

    // Update target safe zone visualization
    if (
      targetCylinderRef.current &&
      targetTopRingRef.current &&
      targetBottomRingRef.current &&
      currentState.safeZoneTargetRadius < currentRadiusRef.current
    ) {
      // Update target cylinder
      targetCylinderRef.current.geometry.dispose();
      targetCylinderRef.current.geometry = new THREE.CylinderGeometry(
        currentState.safeZoneTargetRadius,
        currentState.safeZoneTargetRadius,
        40,
        64,
        1,
        true
      );

      // Update target rings
      targetTopRingRef.current.geometry.dispose();
      targetBottomRingRef.current.geometry.dispose();

      const targetRingThickness = 0.3;
      const newTargetTopRingGeometry = new THREE.RingGeometry(
        currentState.safeZoneTargetRadius - targetRingThickness,
        currentState.safeZoneTargetRadius,
        64
      );
      const newTargetBottomRingGeometry = new THREE.RingGeometry(
        currentState.safeZoneTargetRadius - targetRingThickness,
        currentState.safeZoneTargetRadius,
        64
      );

      targetTopRingRef.current.geometry = newTargetTopRingGeometry;
      targetBottomRingRef.current.geometry = newTargetBottomRingGeometry;
    }
  });

  // Define color based on the zone level
  // Higher zone levels will have more intense colors to indicate more danger
  const getSafeZoneColor = () => {
    if (currentZoneLevel <= 1) return "#3399ff"; // Light blue for early zones
    if (currentZoneLevel <= 2) return "#33ccff"; // Medium blue
    if (currentZoneLevel <= 4) return "#3366ff"; // Darker blue
    if (currentZoneLevel <= 6) return "#6633ff"; // Purple
    if (currentZoneLevel <= 8) return "#9933ff"; // More purple
    return "#cc33ff"; // Pink/purple for very high levels
  };

  // Get ring border color (slightly brighter than the main zone color)
  const getRingColor = () => {
    if (currentZoneLevel <= 1) return "#33ccff"; // Lighter blue
    if (currentZoneLevel <= 2) return "#33eeff"; // Brighter blue
    if (currentZoneLevel <= 4) return "#3399ff"; // Bright medium blue
    if (currentZoneLevel <= 6) return "#9966ff"; // Brighter purple
    if (currentZoneLevel <= 8) return "#cc66ff"; // Bright purple
    return "#ff66ff"; // Bright pink for very high levels
  };

  // Safe zone opacity increases with zone level to make danger more visible
  const getSafeZoneOpacity = () => {
    const baseOpacity = 0.15;
    const zoneIncrease = Math.min(0.35, currentZoneLevel * 0.05);

    // Increase opacity when approaching the next zone level
    const urgencyBonus = isPreZoneChangeLevel ? 0.15 : 0;

    return baseOpacity + zoneIncrease + urgencyBonus;
  };

  // Get target zone color (red with intensity based on level)
  const getTargetZoneColor = () => {
    if (currentZoneLevel <= 2) return "#ff3333"; // Standard red
    if (currentZoneLevel <= 4) return "#ff1a1a"; // Brighter red
    if (currentZoneLevel <= 6) return "#ff0000"; // Pure red
    return "#cc0000"; // Dark red for high levels
  };

  // Calculate if this is a zone level with pulsing effect (every 5 levels)
  const shouldPulse = isZoneChangeLevel && isShrinkingRef.current;

  // Also pulse when we're about to change zones (last level before new zone)
  const shouldUrgencyPulse = isPreZoneChangeLevel && isShrinkingRef.current;

  // Use a different opacity for pulse effect on new zone levels
  const getPulseOpacity = () => {
    // This will be higher for more noticeable pulses
    return getSafeZoneOpacity() * 1.5;
  };

  return safeZoneActive ? (
    <group position={[safeZoneCenter[0], 20, safeZoneCenter[1]]}>
      {/* Current safe zone visualization - cylindrical zone */}
      <mesh ref={cylinderRef} position={[0, 0, 0]}>
        <cylinderGeometry
          args={[safeZoneRadius, safeZoneRadius, 40, 64, 1, true]}
        />
        <meshBasicMaterial
          color={getSafeZoneColor()}
          transparent
          opacity={
            shouldPulse || shouldUrgencyPulse
              ? getPulseOpacity()
              : getSafeZoneOpacity()
          }
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Current top circle border */}
      <mesh
        ref={topRingRef}
        position={[0, 20, 0]}
        rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[safeZoneRadius - 0.5, safeZoneRadius, 64]} />
        <meshBasicMaterial
          color={getRingColor()}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Current bottom circle border */}
      <mesh
        ref={bottomRingRef}
        position={[0, -20, 0]}
        rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[safeZoneRadius - 0.5, safeZoneRadius, 64]} />
        <meshBasicMaterial
          color={getRingColor()}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Target safe zone visualization - only show if target is smaller than current */}
      {safeZoneTargetRadius < safeZoneRadius && (
        <>
          {/* Target cylindrical zone */}
          <mesh ref={targetCylinderRef} position={[0, 0, 0]}>
            <cylinderGeometry
              args={[
                safeZoneTargetRadius,
                safeZoneTargetRadius,
                40,
                64,
                1,
                true,
              ]}
            />
            <meshBasicMaterial
              color={getTargetZoneColor()}
              transparent
              opacity={isPreZoneChangeLevel ? 0.08 : 0.05} // Increase opacity when approaching next zone
              side={THREE.DoubleSide}
              depthWrite={false}
              depthTest={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Target top ring */}
          <mesh
            ref={targetTopRingRef}
            position={[0, 20, 0]}
            rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={[safeZoneTargetRadius - 0.3, safeZoneTargetRadius, 64]}
            />
            <meshBasicMaterial
              color={getTargetZoneColor()}
              transparent
              opacity={isPreZoneChangeLevel ? 0.7 : 0.5} // Increase opacity when approaching next zone
              side={THREE.DoubleSide}
              depthWrite={false}
              depthTest={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Target bottom ring */}
          <mesh
            ref={targetBottomRingRef}
            position={[0, -20, 0]}
            rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={[safeZoneTargetRadius - 0.3, safeZoneTargetRadius, 64]}
            />
            <meshBasicMaterial
              color={getTargetZoneColor()}
              transparent
              opacity={isPreZoneChangeLevel ? 0.7 : 0.5} // Increase opacity when approaching next zone
              side={THREE.DoubleSide}
              depthWrite={false}
              depthTest={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </>
      )}

      {/* Add vertical lines connecting the circles */}
      {Array.from({ length: 16 }).map((_, index) => {
        const angle = (index / 16) * Math.PI * 2;
        const x = Math.sin(angle) * safeZoneRadius;
        const z = Math.cos(angle) * safeZoneRadius;
        return (
          <mesh key={`line-${index}`} position={[x, 0, z]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.2, 40, 0.2]} />
            <meshBasicMaterial
              color={getRingColor()}
              transparent
              opacity={0.3}
              depthWrite={false}
              depthTest={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        );
      })}

      {/* Add target zone marker lines if target zone exists */}
      {safeZoneTargetRadius < safeZoneRadius &&
        Array.from({ length: 8 }).map((_, index) => {
          const angle = (index / 8) * Math.PI * 2;
          const x = Math.sin(angle) * safeZoneTargetRadius;
          const z = Math.cos(angle) * safeZoneTargetRadius;
          return (
            <mesh
              key={`target-line-${index}`}
              position={[x, 0, z]}
              rotation={[0, 0, 0]}>
              <boxGeometry args={[0.15, 40, 0.15]} />
              <meshBasicMaterial
                color={getTargetZoneColor()}
                transparent
                opacity={isPreZoneChangeLevel ? 0.4 : 0.25} // Increase opacity when approaching next zone
                depthWrite={false}
                depthTest={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          );
        })}
    </group>
  ) : null;
};

export default SafeZone;

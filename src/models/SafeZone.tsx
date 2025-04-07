import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameState } from "../utils/gameState";
import * as THREE from "three";

const SafeZone = () => {
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
    isPreZoneChangeLevel,
  } = useGameState();

  const [zoneProgress, setZoneProgress] = useState(0);
  const [previewOpacity, setPreviewOpacity] = useState(0);

  const cylinderRef = useRef<THREE.Mesh>(null);
  const topRingRef = useRef<THREE.Mesh>(null);
  const bottomRingRef = useRef<THREE.Mesh>(null);
  const targetCylinderRef = useRef<THREE.Mesh>(null);
  const targetTopRingRef = useRef<THREE.Mesh>(null);
  const targetBottomRingRef = useRef<THREE.Mesh>(null);
  const nextZoneCylinderRef = useRef<THREE.Mesh>(null);
  const nextZoneTopRingRef = useRef<THREE.Mesh>(null);
  const nextZoneBottomRingRef = useRef<THREE.Mesh>(null);

  const lastDamageTime = useRef(0);
  const currentRadiusRef = useRef(safeZoneRadius);
  const isShrinkingRef = useRef(false);
  const targetRadiusRef = useRef(safeZoneTargetRadius);
  const initialRadiusRef = useRef(safeZoneRadius);
  const estimatedTimeToCompleteRef = useRef(0);
  const startShrinkTimeRef = useRef(0);
  const prevLevelRef = useRef(level);
  const isZoneCompletionEnforced = useRef(false);
  const animationTimeRef = useRef(0);
  const lastRadiusUpdateTime = useRef(0);

  const isZoneChangeLevel = level % 5 === 0 && level > 0;
  const currentZoneLevel = Math.floor(level / 5);
  const nextZoneLevel = currentZoneLevel + 1;
  const nextZoneLevelNumber = nextZoneLevel * 5;
  const levelsUntilNextZone = nextZoneLevelNumber - level;

  const nextZoneTargetRadius = (() => {
    const maxRadius = 50;
    const minRadius = 5;
    const radiusDecrease = 4;
    return Math.max(minRadius, maxRadius - nextZoneLevel * radiusDecrease);
  })();

  const getZoneCompletionPercentage = () => {
    if (isZoneChangeLevel) return 100;
    const initialZoneRadius = 50 - currentZoneLevel * 4;
    const totalShrinkNeeded = initialZoneRadius - nextZoneTargetRadius;
    const currentShrink = initialZoneRadius - safeZoneRadius;
    return Math.min(
      100,
      Math.max(0, (currentShrink / totalShrinkNeeded) * 100)
    );
  };

  useEffect(() => {
    if (level % 5 === 0 && level > 0 && prevLevelRef.current !== level) {
      currentRadiusRef.current = safeZoneTargetRadius;
      initialRadiusRef.current = safeZoneTargetRadius;
      isZoneCompletionEnforced.current = true;
      useGameState.setState({ safeZoneRadius: safeZoneTargetRadius });
    } else {
      isZoneCompletionEnforced.current = false;
    }
    prevLevelRef.current = level;

    if (
      (!isShrinkingRef.current || safeZoneRadius < currentRadiusRef.current) &&
      !isZoneCompletionEnforced.current
    ) {
      currentRadiusRef.current = safeZoneRadius;
      initialRadiusRef.current = safeZoneRadius;
      if (safeZoneRadius > safeZoneTargetRadius) {
        startShrinkTimeRef.current = Date.now() / 1000;
        const radiusDifference = safeZoneRadius - safeZoneTargetRadius;
        estimatedTimeToCompleteRef.current =
          radiusDifference / safeZoneShrinkRate;
      }
    }
    targetRadiusRef.current = safeZoneTargetRadius;
  }, [safeZoneRadius, safeZoneTargetRadius, safeZoneShrinkRate, level]);

  useEffect(() => {
    if (!isPreZoneChangeLevel || !safeZoneActive) {
      setPreviewOpacity(0);
      return;
    }
    const interval = setInterval(() => {
      setPreviewOpacity(0.1 + 0.4 * Math.abs(Math.sin(Date.now() / 800)));
    }, 50);
    return () => clearInterval(interval);
  }, [isPreZoneChangeLevel, safeZoneActive]);

  useFrame((state, delta) => {
    if (isPaused || isGameOver || !safeZoneActive) return;

    const currentState = useGameState.getState();
    const currentTime = state.clock.getElapsedTime();
    animationTimeRef.current += delta;

    if (
      isZoneChangeLevel &&
      currentRadiusRef.current !== targetRadiusRef.current
    ) {
      currentRadiusRef.current = targetRadiusRef.current;
      useGameState.setState({ safeZoneRadius: targetRadiusRef.current });
      return;
    }

    if (currentRadiusRef.current > currentState.safeZoneTargetRadius) {
      isShrinkingRef.current = true;
      const newRadius = Math.max(
        currentState.safeZoneTargetRadius,
        currentRadiusRef.current - currentState.safeZoneShrinkRate * delta * 1.5
      );

      if (Math.abs(currentRadiusRef.current - newRadius) > 0.01) {
        currentRadiusRef.current = newRadius;
        if (state.clock.elapsedTime - lastRadiusUpdateTime.current > 0.2) {
          useGameState.setState({ safeZoneRadius: newRadius });
          lastRadiusUpdateTime.current = state.clock.elapsedTime;
        }
        const totalShrinkAmount =
          initialRadiusRef.current - targetRadiusRef.current;
        const shrunkAmount =
          initialRadiusRef.current - currentRadiusRef.current;
        const progressPercentage = (shrunkAmount / totalShrinkAmount) * 100;
        setZoneProgress(Math.min(100, Math.max(0, progressPercentage)));
      }

      if (
        Math.abs(currentRadiusRef.current - currentState.safeZoneTargetRadius) <
        0.1
      ) {
        isShrinkingRef.current = false;
        setZoneProgress(100);
      }
    } else {
      isShrinkingRef.current = false;
    }

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

      if (distance > currentRadiusRef.current) {
        if (currentTime - lastDamageTime.current >= 1) {
          takeDamage(currentState.safeZoneDamage);
          lastDamageTime.current = currentTime;
        }
      }
    }

    if (cylinderRef.current) {
      if (Math.abs(cylinderRef.current.scale.x - 1) > 0.01) {
        cylinderRef.current.scale.set(1, 1, 1);
        cylinderRef.current.geometry.dispose();
        cylinderRef.current.geometry = new THREE.CylinderGeometry(
          currentRadiusRef.current,
          currentRadiusRef.current,
          40,
          64,
          1,
          true
        );
      }
    }

    if (topRingRef.current && bottomRingRef.current) {
      topRingRef.current.geometry.dispose();
      bottomRingRef.current.geometry.dispose();
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

    if (
      targetCylinderRef.current &&
      targetTopRingRef.current &&
      targetBottomRingRef.current &&
      currentState.safeZoneTargetRadius < currentRadiusRef.current
    ) {
      targetCylinderRef.current.geometry.dispose();
      targetCylinderRef.current.geometry = new THREE.CylinderGeometry(
        currentState.safeZoneTargetRadius,
        currentState.safeZoneTargetRadius,
        40,
        64,
        1,
        true
      );
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

    if (
      isPreZoneChangeLevel &&
      nextZoneCylinderRef.current &&
      nextZoneTopRingRef.current &&
      nextZoneBottomRingRef.current
    ) {
      const nextRingThickness = 0.3;
      nextZoneCylinderRef.current.geometry.dispose();
      nextZoneCylinderRef.current.geometry = new THREE.CylinderGeometry(
        nextZoneTargetRadius,
        nextZoneTargetRadius,
        40,
        64,
        1,
        true
      );
      nextZoneTopRingRef.current.geometry.dispose();
      nextZoneTopRingRef.current.geometry = new THREE.RingGeometry(
        nextZoneTargetRadius - nextRingThickness,
        nextZoneTargetRadius,
        64
      );
      nextZoneBottomRingRef.current.geometry.dispose();
      nextZoneBottomRingRef.current.geometry = new THREE.RingGeometry(
        nextZoneTargetRadius - nextRingThickness,
        nextZoneTargetRadius,
        64
      );
    }
  });

  // Define fixed colors for this map
  const safeZoneColor = "#33ccff"; // Light cyan to complement purple and green
  const ringColor = "#66d9ff"; // Slightly brighter cyan for the ring borders
  const targetZoneColor = "#ff4d4d"; // Orange-red for the warning zone
  const nextZoneColor = "#ff9500"; // Orange for next zone preview

  const getSafeZoneOpacity = () => {
    const baseOpacity = 0.15;
    const zoneIncrease = Math.min(0.35, currentZoneLevel * 0.05);
    const urgencyBonus = isPreZoneChangeLevel ? 0.15 : 0;
    return baseOpacity + zoneIncrease + urgencyBonus;
  };

  const shouldPulse = isZoneChangeLevel && isShrinkingRef.current;
  const shouldUrgencyPulse = isPreZoneChangeLevel && isShrinkingRef.current;

  const getPulseOpacity = () => {
    return getSafeZoneOpacity() * 1.5;
  };

  return safeZoneActive ? (
    <group position={[safeZoneCenter[0], 20, safeZoneCenter[1]]}>
      <mesh ref={cylinderRef} position={[0, 0, 0]}>
        <cylinderGeometry
          args={[safeZoneRadius, safeZoneRadius, 40, 64, 1, true]}
        />
        <meshBasicMaterial
          color={safeZoneColor}
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

      <mesh
        ref={topRingRef}
        position={[0, 20, 0]}
        rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[safeZoneRadius - 0.5, safeZoneRadius, 64]} />
        <meshBasicMaterial
          color={ringColor}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh
        ref={bottomRingRef}
        position={[0, -20, 0]}
        rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[safeZoneRadius - 0.5, safeZoneRadius, 64]} />
        <meshBasicMaterial
          color={ringColor}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {safeZoneTargetRadius < safeZoneRadius && (
        <>
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
              color={targetZoneColor}
              transparent
              opacity={isPreZoneChangeLevel ? 0.08 : 0.05}
              side={THREE.DoubleSide}
              depthWrite={false}
              depthTest={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          <mesh
            ref={targetTopRingRef}
            position={[0, 20, 0]}
            rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={[safeZoneTargetRadius - 0.3, safeZoneTargetRadius, 64]}
            />
            <meshBasicMaterial
              color={targetZoneColor}
              transparent
              opacity={isPreZoneChangeLevel ? 0.7 : 0.5}
              side={THREE.DoubleSide}
              depthWrite={false}
              depthTest={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          <mesh
            ref={targetBottomRingRef}
            position={[0, -20, 0]}
            rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={[safeZoneTargetRadius - 0.3, safeZoneTargetRadius, 64]}
            />
            <meshBasicMaterial
              color={targetZoneColor}
              transparent
              opacity={isPreZoneChangeLevel ? 0.7 : 0.5}
              side={THREE.DoubleSide}
              depthWrite={false}
              depthTest={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </>
      )}

      {isPreZoneChangeLevel && (
        <>
          <mesh ref={nextZoneCylinderRef} position={[0, 0, 0]}>
            <cylinderGeometry
              args={[
                nextZoneTargetRadius,
                nextZoneTargetRadius,
                40,
                64,
                1,
                true,
              ]}
            />
            <meshBasicMaterial
              color={nextZoneColor}
              transparent
              opacity={previewOpacity * 0.2}
              side={THREE.DoubleSide}
              depthWrite={false}
              depthTest={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          <mesh
            ref={nextZoneTopRingRef}
            position={[0, 20, 0]}
            rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={[nextZoneTargetRadius - 0.4, nextZoneTargetRadius, 64]}
            />
            <meshBasicMaterial
              color={nextZoneColor}
              transparent
              opacity={previewOpacity * 0.8}
              side={THREE.DoubleSide}
              depthWrite={false}
              depthTest={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          <mesh
            ref={nextZoneBottomRingRef}
            position={[0, -20, 0]}
            rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={[nextZoneTargetRadius - 0.4, nextZoneTargetRadius, 64]}
            />
            <meshBasicMaterial
              color={nextZoneColor}
              transparent
              opacity={previewOpacity * 0.8}
              side={THREE.DoubleSide}
              depthWrite={false}
              depthTest={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </>
      )}

      {Array.from({ length: 16 }).map((_, index) => {
        const angle = (index / 16) * Math.PI * 2;
        const x = Math.sin(angle) * safeZoneRadius;
        const z = Math.cos(angle) * safeZoneRadius;
        return (
          <mesh key={`line-${index}`} position={[x, 0, z]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.2, 40, 0.2]} />
            <meshBasicMaterial
              color={ringColor}
              transparent
              opacity={0.3}
              depthWrite={false}
              depthTest={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        );
      })}

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
                color={targetZoneColor}
                transparent
                opacity={isPreZoneChangeLevel ? 0.4 : 0.25}
                depthWrite={false}
                depthTest={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          );
        })}

      {isPreZoneChangeLevel &&
        Array.from({ length: 12 }).map((_, index) => {
          const angle = (index / 12) * Math.PI * 2;
          const x = Math.sin(angle) * nextZoneTargetRadius;
          const z = Math.cos(angle) * nextZoneTargetRadius;
          return (
            <mesh
              key={`next-zone-line-${index}`}
              position={[x, 0, z]}
              rotation={[0, 0, 0]}>
              <boxGeometry args={[0.15, 40, 0.15]} />
              <meshBasicMaterial
                color={nextZoneColor}
                transparent
                opacity={previewOpacity * 0.5}
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

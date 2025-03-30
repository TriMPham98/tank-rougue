import { useRef, useEffect } from "react";
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
  } = useGameState();

  // Reference to the circle mesh
  const circleRef = useRef<THREE.Mesh>(null);

  // Reference for damage tick
  const lastDamageTime = useRef(0);

  // Use refs to track current radius to avoid re-renders
  const currentRadiusRef = useRef(safeZoneRadius);

  // Set the initial value
  useEffect(() => {
    currentRadiusRef.current = safeZoneRadius;
  }, [safeZoneRadius]);

  // Update safe zone radius and apply damage outside the zone
  useFrame((state, delta) => {
    if (isPaused || isGameOver || !safeZoneActive) return;

    const currentState = useGameState.getState();

    // Only update the state if we need to shrink AND only update once per second
    if (currentRadiusRef.current > currentState.safeZoneTargetRadius) {
      // Calculate new radius
      const newRadius = Math.max(
        currentState.safeZoneTargetRadius,
        currentRadiusRef.current - currentState.safeZoneShrinkRate * delta
      );

      // Only update state if the difference is significant (e.g., more than 0.01)
      if (Math.abs(currentRadiusRef.current - newRadius) > 0.01) {
        currentRadiusRef.current = newRadius;

        // Throttle state updates to be less frequent (e.g., every 100ms)
        if (state.clock.elapsedTime - lastRadiusUpdateTime.current > 0.1) {
          useGameState.setState({
            safeZoneRadius: newRadius,
          });
          lastRadiusUpdateTime.current = state.clock.elapsedTime;
        }
      }
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

    // Update the circle's scale based on the current radius ref, not state
    if (circleRef.current) {
      circleRef.current.scale.set(
        currentRadiusRef.current,
        1,
        currentRadiusRef.current
      );
    }
  });

  // Missing ref declaration
  const lastRadiusUpdateTime = useRef(0);

  // Create a circle geometry for visualization
  const circleGeometry = new THREE.CircleGeometry(1, 64);

  return safeZoneActive ? (
    <group position={[safeZoneCenter[0], 0.1, safeZoneCenter[1]]}>
      {/* Safe zone visualization */}
      <mesh
        ref={circleRef}
        rotation={[-Math.PI / 2, 0, 0]} // Rotate to lay flat on the ground
        scale={[safeZoneRadius, 1, safeZoneRadius]}>
        <primitive object={circleGeometry} attach="geometry" />
        <meshBasicMaterial color="#3399ff" transparent opacity={0.2} />
      </mesh>

      {/* Safe zone border */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[safeZoneRadius, 1, safeZoneRadius]}>
        <ringGeometry args={[0.98, 1, 64]} />
        <meshBasicMaterial color="#33ccff" transparent opacity={0.8} />
      </mesh>
    </group>
  ) : null;
};

export default SafeZone;

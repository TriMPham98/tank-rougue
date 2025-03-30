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

  // Reference to the cylinder mesh
  const cylinderRef = useRef<THREE.Mesh>(null);
  // References to the ring borders
  const topRingRef = useRef<THREE.Mesh>(null);
  const bottomRingRef = useRef<THREE.Mesh>(null);

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
  });

  // Missing ref declaration
  const lastRadiusUpdateTime = useRef(0);

  return safeZoneActive ? (
    <group position={[safeZoneCenter[0], 20, safeZoneCenter[1]]}>
      {/* Safe zone visualization - cylindrical zone */}
      <mesh ref={cylinderRef} position={[0, 0, 0]}>
        <cylinderGeometry
          args={[safeZoneRadius, safeZoneRadius, 40, 64, 1, true]}
        />
        <meshBasicMaterial
          color="#3399ff"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest={false}
          renderOrder={-10}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Top circle border */}
      <mesh
        ref={topRingRef}
        position={[0, 20, 0]}
        rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[safeZoneRadius - 0.5, safeZoneRadius, 64]} />
        <meshBasicMaterial
          color="#33ccff"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest={false}
          renderOrder={-9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Bottom circle border */}
      <mesh
        ref={bottomRingRef}
        position={[0, -20, 0]}
        rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[safeZoneRadius - 0.5, safeZoneRadius, 64]} />
        <meshBasicMaterial
          color="#33ccff"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest={false}
          renderOrder={-9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Add vertical lines connecting the circles */}
      {Array.from({ length: 16 }).map((_, index) => {
        const angle = (index / 16) * Math.PI * 2;
        const x = Math.sin(angle) * safeZoneRadius;
        const z = Math.cos(angle) * safeZoneRadius;
        return (
          <mesh key={`line-${index}`} position={[x, 0, z]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.2, 40, 0.2]} />
            <meshBasicMaterial
              color="#33ccff"
              transparent
              opacity={0.3}
              depthWrite={false}
              depthTest={false}
              renderOrder={-9}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        );
      })}
    </group>
  ) : null;
};

export default SafeZone;

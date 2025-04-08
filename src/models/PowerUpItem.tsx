import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Box, Sphere } from "@react-three/drei";
import { Mesh, Vector3, MeshStandardMaterial } from "three";
import { PowerUp, useGameState } from "../utils/gameState";

interface PowerUpItemProps {
  powerUp: PowerUp;
}

const PowerUpItem = ({ powerUp }: PowerUpItemProps) => {
  const powerUpRef = useRef<Mesh>(null);
  const rotationRef = useRef(0);
  const materialRef = useRef<MeshStandardMaterial>(null);
  const lifeTimeRef = useRef(0);
  const fadeStartTimeRef = useRef(0);

  // Get only the collectPowerUp function, use direct store access for position
  const collectPowerUp = useGameState((state) => state.collectPowerUp);
  const getState = useRef(useGameState.getState).current;

  // Set up lifetime and fade effects
  useEffect(() => {
    // Power-up will live for 15 seconds before starting to fade
    fadeStartTimeRef.current = 15;
    // Total lifetime including fade (20 seconds)
    lifeTimeRef.current = 20;
  }, []);

  // Hover animation and collision detection with player tank
  useFrame((state, delta) => {
    if (!powerUpRef.current) return;

    // Access player position directly from store
    const playerTankPosition = getState().playerTankPosition;
    if (!playerTankPosition) return;

    // Update lifetime
    lifeTimeRef.current -= delta;

    // Check if it's time to fade out the power-up
    if (lifeTimeRef.current <= 5 && materialRef.current) {
      const fadeProgress = Math.max(0, lifeTimeRef.current / 5);
      materialRef.current.opacity = 0.7 * fadeProgress;

      // Set emissiveIntensity based on fade progress
      materialRef.current.emissiveIntensity = 0.5 * fadeProgress;
    }

    // Destroy power-up if lifetime reaches 0
    if (lifeTimeRef.current <= 0) {
      collectPowerUp(powerUp.id, false);
      return;
    }

    // Animate rotation and hover effect using ref instead of state
    rotationRef.current += delta * 2;

    // Hover effect - faster for drop items
    const hoverHeight = Math.sin(state.clock.getElapsedTime() * 3) * 0.2;
    powerUpRef.current.position.y = powerUp.position[1] + hoverHeight;

    // Apply rotation directly
    powerUpRef.current.rotation.y = rotationRef.current;

    // Check for collision with player tank
    const playerPos = new Vector3(...playerTankPosition);
    const powerUpPos = new Vector3(...powerUp.position);

    const distance = playerPos.distanceTo(powerUpPos);

    // If player is close enough, collect the power-up
    if (distance < 2) {
      collectPowerUp(powerUp.id, true);
    }
  });

  return (
    <group ref={powerUpRef} position={powerUp.position}>
      {/* Power-up base */}
      <Sphere args={[0.6, 16, 16]}>
        <meshStandardMaterial
          ref={materialRef}
          color="red"
          transparent
          opacity={0.7}
          emissive="red"
          emissiveIntensity={0.5}
        />
      </Sphere>

      {/* Health pack cross symbol */}
      <Box args={[0.3, 0.8, 0.3]} position={[0, 0, 0]}>
        <meshStandardMaterial color="white" />
      </Box>
      <Box args={[0.8, 0.3, 0.3]} position={[0, 0, 0]}>
        <meshStandardMaterial color="white" />
      </Box>

      {/* Power-up glow */}
      <pointLight color="red" intensity={1} distance={5} decay={2} />
    </group>
  );
};

export default PowerUpItem;

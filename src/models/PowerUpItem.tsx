import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Box, Sphere } from "@react-three/drei";
import { Mesh, Vector3 } from "three";
import { PowerUp, useGameState } from "../utils/gameState";

interface PowerUpItemProps {
  powerUp: PowerUp;
}

const PowerUpItem = ({ powerUp }: PowerUpItemProps) => {
  const powerUpRef = useRef<Mesh>(null);
  const [rotation, setRotation] = useState(0);

  // Get game state
  const { collectPowerUp, playerTankPosition } = useGameState((state) => ({
    collectPowerUp: state.collectPowerUp,
    playerTankPosition: state.playerTankPosition,
  }));

  // Hover animation and collision detection with player tank
  useFrame((state, delta) => {
    if (!powerUpRef.current || !playerTankPosition) return;

    // Animate rotation and hover effect
    setRotation((prev) => prev + delta * 2);

    // Hover up and down
    const hoverHeight = Math.sin(state.clock.getElapsedTime() * 2) * 0.2;
    powerUpRef.current.position.y = powerUp.position[1] + hoverHeight;

    // Apply rotation
    powerUpRef.current.rotation.y = rotation;

    // Check for collision with player tank
    const playerPos = new Vector3(...playerTankPosition);
    const powerUpPos = new Vector3(...powerUp.position);

    const distance = playerPos.distanceTo(powerUpPos);

    // If player is close enough, collect the power-up
    if (distance < 2) {
      collectPowerUp(powerUp.id);
    }
  });

  // Different colors based on power-up type
  const getColor = () => {
    switch (powerUp.type) {
      case "health":
        return "red";
      case "speed":
        return "blue";
      case "damage":
        return "orange";
      default:
        return "white";
    }
  };

  // Different icon based on power-up type
  const renderIcon = () => {
    switch (powerUp.type) {
      case "health":
        // Cross symbol for health
        return (
          <>
            <Box args={[0.3, 0.8, 0.3]} position={[0, 0, 0]}>
              <meshStandardMaterial color="white" />
            </Box>
            <Box args={[0.8, 0.3, 0.3]} position={[0, 0, 0]}>
              <meshStandardMaterial color="white" />
            </Box>
          </>
        );
      case "speed":
        // Arrow symbol for speed
        return (
          <>
            <Box
              args={[0.6, 0.3, 0.3]}
              position={[0, 0, 0]}
              rotation={[0, 0, Math.PI / 4]}>
              <meshStandardMaterial color="white" />
            </Box>
            <Box
              args={[0.6, 0.3, 0.3]}
              position={[0, 0, 0]}
              rotation={[0, 0, -Math.PI / 4]}>
              <meshStandardMaterial color="white" />
            </Box>
          </>
        );
      case "damage":
        // Star symbol for damage
        return (
          <>
            <Box args={[0.6, 0.3, 0.3]} position={[0, 0, 0]}>
              <meshStandardMaterial color="white" />
            </Box>
            <Box
              args={[0.6, 0.3, 0.3]}
              position={[0, 0, 0]}
              rotation={[0, 0, Math.PI / 3]}>
              <meshStandardMaterial color="white" />
            </Box>
            <Box
              args={[0.6, 0.3, 0.3]}
              position={[0, 0, 0]}
              rotation={[0, 0, -Math.PI / 3]}>
              <meshStandardMaterial color="white" />
            </Box>
          </>
        );
    }
  };

  return (
    <group ref={powerUpRef} position={powerUp.position}>
      {/* Power-up base */}
      <Sphere args={[0.6, 16, 16]}>
        <meshStandardMaterial
          color={getColor()}
          transparent
          opacity={0.7}
          emissive={getColor()}
          emissiveIntensity={0.5}
        />
      </Sphere>

      {/* Power-up icon */}
      {renderIcon()}

      {/* Power-up glow */}
      <pointLight color={getColor()} intensity={1} distance={5} decay={2} />
    </group>
  );
};

export default PowerUpItem;

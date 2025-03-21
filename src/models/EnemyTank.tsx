import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Box, Cylinder } from "@react-three/drei";
import { Mesh, Vector3 } from "three";
import { Enemy, useGameState } from "../utils/gameState";

interface EnemyTankProps {
  enemy: Enemy;
}

const EnemyTank = ({ enemy }: EnemyTankProps) => {
  const tankRef = useRef<Mesh>(null);
  const turretRef = useRef<Mesh>(null);

  // Use refs for values that shouldn't trigger re-renders
  const tankRotationRef = useRef(0);
  const turretRotationRef = useRef(0);
  const healthRef = useRef(enemy.health);

  // Only use the damageEnemy function from the store
  const damageEnemy = useGameState((state) => state.damageEnemy);

  // Get direct access to the store's getState function
  const getState = useRef(useGameState.getState).current;

  // Set initial position and rotation from enemy data
  useEffect(() => {
    if (tankRef.current) {
      tankRef.current.position.set(...enemy.position);
    }
    healthRef.current = enemy.health;
  }, []);

  // Update health ref when enemy health changes
  useEffect(() => {
    healthRef.current = enemy.health;
  }, [enemy.health]);

  // Enemy tank behavior
  useFrame((state, delta) => {
    if (!tankRef.current || !turretRef.current) return;

    // Get the latest player position directly from the store
    const playerTankPosition = getState().playerTankPosition;

    if (!playerTankPosition) return;

    // Calculate direction to player
    const directionToPlayer = new Vector3(
      playerTankPosition[0] - tankRef.current.position.x,
      0,
      playerTankPosition[2] - tankRef.current.position.z
    ).normalize();

    // Make the turret look at the player
    const targetTurretRotation = Math.atan2(
      directionToPlayer.x,
      directionToPlayer.z
    );
    turretRotationRef.current = targetTurretRotation;
    turretRef.current.rotation.y = turretRotationRef.current;

    // Only tank-type enemies move
    if (enemy.type === "tank") {
      // Calculate target rotation towards player
      const targetRotation = Math.atan2(
        directionToPlayer.x,
        directionToPlayer.z
      );

      // Smoothly rotate towards target rotation
      const rotationDiff = targetRotation - tankRotationRef.current;
      const wrappedDiff = ((rotationDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
      tankRotationRef.current += wrappedDiff * delta;
      tankRef.current.rotation.y = tankRotationRef.current;

      // Move towards player
      const moveSpeed = 1.5;
      const distanceToPlayer = new Vector3(
        playerTankPosition[0] - tankRef.current.position.x,
        0,
        playerTankPosition[2] - tankRef.current.position.z
      ).length();

      // Only move if not too close to player
      if (distanceToPlayer > 5) {
        tankRef.current.position.x +=
          Math.sin(tankRotationRef.current) * delta * moveSpeed;
        tankRef.current.position.z +=
          Math.cos(tankRotationRef.current) * delta * moveSpeed;
      }
    }
  });

  // Function to handle enemy being hit
  const handleHit = (damage: number) => {
    damageEnemy(enemy.id, damage);
  };

  // Calculate health percentage for the health bar
  const healthPercent = healthRef.current / 100;

  return (
    <group ref={tankRef}>
      {/* Enemy tank body */}
      <Box
        args={[1.5, 0.5, 2]}
        castShadow
        receiveShadow
        onClick={() => handleHit(25)}>
        <meshStandardMaterial
          color={enemy.type === "tank" ? "red" : "darkred"}
        />
      </Box>

      {/* Enemy tank turret */}
      <group position={[0, 0.5, 0]} ref={turretRef}>
        <Cylinder
          args={[0.6, 0.6, 0.4, 16]}
          position={[0, 0.2, 0]}
          castShadow
          onClick={() => handleHit(25)}>
          <meshStandardMaterial color="darkred" />
        </Cylinder>

        {/* Enemy tank cannon */}
        <Box
          args={[0.2, 0.2, 1.5]}
          position={[0, 0.2, 1]}
          castShadow
          onClick={() => handleHit(25)}>
          <meshStandardMaterial color="darkred" />
        </Box>
      </group>

      {/* Enemy tank tracks */}
      <Box
        args={[1.7, 0.2, 2.2]}
        position={[0, -0.3, 0]}
        castShadow
        receiveShadow
        onClick={() => handleHit(25)}>
        <meshStandardMaterial color="black" />
      </Box>

      {/* Health indicator */}
      <Box args={[1, 0.1, 0.1]} position={[0, 1.2, 0]}>
        <meshBasicMaterial color="red" />
      </Box>
      <Box
        args={[healthPercent, 0.1, 0.1]}
        position={[-(0.5 - healthPercent / 2), 1.2, 0]}>
        <meshBasicMaterial color="green" />
      </Box>
    </group>
  );
};

export default EnemyTank;

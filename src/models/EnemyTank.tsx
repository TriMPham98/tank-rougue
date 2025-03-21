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

  // State for health bar rendering
  const [healthPercent, setHealthPercent] = useState(1);

  // Only use required functions from the store
  const damageEnemy = useGameState((state) => state.damageEnemy);
  const updateEnemyPosition = useGameState(
    (state) => state.updateEnemyPosition
  );

  // Get direct access to the store's getState function
  const getState = useRef(useGameState.getState).current;

  // Store max health in a ref to use for health bar calculation
  const maxHealthRef = useRef(enemy.health);

  // Set max health once when component mounts
  useEffect(() => {
    maxHealthRef.current = enemy.health;
  }, []);

  // Set initial position and rotation from enemy data
  useEffect(() => {
    if (tankRef.current) {
      tankRef.current.position.set(...enemy.position);
    }
  }, []);

  // Enemy tank behavior
  useFrame((state, delta) => {
    if (!tankRef.current || !turretRef.current) return;

    // Get the latest player position directly from the store
    const playerTankPosition = getState().playerTankPosition;

    // Get the latest enemy data to update health bar
    const enemies = getState().enemies;
    const currentEnemy = enemies.find((e) => e.id === enemy.id);

    // Update health percentage if we found the enemy in the state
    if (currentEnemy) {
      const newHealthPercent = currentEnemy.health / maxHealthRef.current;
      if (newHealthPercent !== healthPercent) {
        setHealthPercent(newHealthPercent);
      }
    }

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

        // Update the enemy position in the game state to ensure accurate hit detection
        const newPosition: [number, number, number] = [
          tankRef.current.position.x,
          tankRef.current.position.y,
          tankRef.current.position.z,
        ];

        // Update position every few frames to reduce state updates
        if (Math.random() < 0.1) {
          updateEnemyPosition(enemy.id, newPosition);
        }
      }
    }
  });

  // Function to handle enemy being hit
  const handleHit = (damage: number) => {
    damageEnemy(enemy.id, damage);
  };

  return (
    <group ref={tankRef}>
      {/* Enemy tank/turret body */}
      <Box
        args={enemy.type === "tank" ? [1.5, 0.5, 2] : [1.8, 0.7, 1.8]}
        castShadow
        receiveShadow
        onClick={() => handleHit(25)}>
        <meshStandardMaterial
          color={enemy.type === "tank" ? "red" : "darkblue"}
        />
      </Box>

      {/* Enemy tank/turret turret */}
      <group position={[0, 0.5, 0]} ref={turretRef}>
        <Cylinder
          args={
            enemy.type === "tank" ? [0.6, 0.6, 0.4, 16] : [0.7, 0.5, 0.6, 8]
          }
          position={[0, 0.2, 0]}
          castShadow
          onClick={() => handleHit(25)}>
          <meshStandardMaterial
            color={enemy.type === "tank" ? "darkred" : "royalblue"}
          />
        </Cylinder>

        {/* Enemy tank/turret cannon */}
        <Box
          args={enemy.type === "tank" ? [0.2, 0.2, 1.5] : [0.25, 0.25, 2]}
          position={[0, 0.2, enemy.type === "tank" ? 1 : 1.2]}
          castShadow
          onClick={() => handleHit(25)}>
          <meshStandardMaterial
            color={enemy.type === "tank" ? "darkred" : "royalblue"}
          />
        </Box>
      </group>

      {/* Enemy tank/turret base */}
      <Box
        args={enemy.type === "tank" ? [1.7, 0.2, 2.2] : [2, 0.3, 2]}
        position={[0, -0.3, 0]}
        castShadow
        receiveShadow
        onClick={() => handleHit(25)}>
        <meshStandardMaterial
          color={enemy.type === "tank" ? "black" : "navy"}
        />
      </Box>

      {/* Health indicator */}
      <Box
        args={[1, 0.1, 0.1]}
        position={[0, enemy.type === "tank" ? 1.2 : 1.5, 0]}
        renderOrder={1}>
        <meshBasicMaterial color="red" transparent depthTest={false} />
      </Box>
      <Box
        args={[healthPercent, 0.1, 0.1]}
        position={[
          -(0.5 - healthPercent / 2),
          enemy.type === "tank" ? 1.2 : 1.5,
          0.00g1,
        ]}
        renderOrder={2}>
        <meshBasicMaterial color="green" transparent depthTest={false} />
      </Box>
    </group>
  );
};

export default EnemyTank;

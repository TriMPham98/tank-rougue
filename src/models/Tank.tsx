import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Box, Cylinder } from "@react-three/drei";
import { Group, Vector3 } from "three";
import { useKeyboardControls } from "../hooks/useKeyboardControls";
import { useGameState } from "../utils/gameState";
import { debug } from "../utils/debug";
import Projectile from "./Projectile";
import SniperRifle from "./SniperRifle"; // Make sure the import path is correct

interface TankProps {
  position: [number, number, number];
}

// Define a constant for spacing between secondary weapons
const SECONDARY_WEAPON_SPACING = 0.4; // Adjust this value as needed for visual spacing

const Tank = ({ position = [0, 0, 0] }: TankProps) => {
  const tankRef = useRef<Group>(null);
  const turretRef = useRef<Group>(null);

  // Use refs instead of state for values that shouldn't trigger renders
  const tankRotationRef = useRef(Math.PI); // Initialize with PI (180 degrees) to face forward
  const turretRotationRef = useRef(0);
  const lastShootTimeRef = useRef(0);
  const positionRef = useRef<[number, number, number]>([...position]);

  const isInitializedRef = useRef(false);

  const [projectiles, setProjectiles] = useState<
    { id: string; position: [number, number, number]; rotation: number }[]
  >([]);

  const { forward, backward, left, right, turretLeft, turretRight, shoot } =
    useKeyboardControls();

  // Get necessary game state values
  const playerTurretDamage = useGameState((state) => state.playerTurretDamage);
  const playerSpeed = useGameState((state) => state.playerSpeed);
  const playerFireRate = useGameState((state) => state.playerFireRate);
  const playerHealthRegen = useGameState((state) => state.playerHealthRegen);
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const updatePlayerPosition = useGameState(
    (state) => state.updatePlayerPosition
  );
  const healPlayer = useGameState((state) => state.healPlayer);
  const selectedWeapons = useGameState((state) => state.selectedWeapons);
  const terrainObstacles = useGameState((state) => state.terrainObstacles);

  // Filter out only the sniper rifles
  const sniperRifles = selectedWeapons.filter(
    (weapon) => weapon.id === "sniper"
  );
  const numSniperRifles = sniperRifles.length;

  // --- Centering Logic ---
  // Calculate the total width occupied by the sniper rifles
  const totalSniperWidth = (numSniperRifles - 1) * SECONDARY_WEAPON_SPACING;
  // Calculate the starting offset (most left position) to center the group
  const sniperStartOffset = -totalSniperWidth / 2;
  // --- End Centering Logic ---

  const checkTerrainCollision = (newX: number, newZ: number): boolean => {
    const mapSize = 50;
    if (Math.abs(newX) > mapSize - 1 || Math.abs(newZ) > mapSize - 1) {
      return true;
    }
    const tankPosition = new Vector3(newX, 0, newZ);
    const tankRadius = 1.25;
    for (const obstacle of terrainObstacles) {
      const obstaclePos = new Vector3(
        obstacle.position[0],
        0,
        obstacle.position[2]
      );
      const distance = obstaclePos.distanceTo(tankPosition);
      const obstacleRadius =
        obstacle.type === "tree" ? obstacle.size * 0.3 : obstacle.size * 0.75;
      if (distance < tankRadius + obstacleRadius) {
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    if (playerHealthRegen <= 0) return;
    const interval = setInterval(() => {
      if (!isPaused) {
        healPlayer(playerHealthRegen);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [playerHealthRegen, healPlayer, isPaused]);

  useEffect(() => {
    if (tankRef.current && !isInitializedRef.current) {
      isInitializedRef.current = true;
      tankRef.current.position.fromArray(position);
      const initialPos: [number, number, number] = [
        tankRef.current.position.x,
        tankRef.current.position.y,
        tankRef.current.position.z,
      ];
      positionRef.current = initialPos;
      updatePlayerPosition(initialPos);
      debug.log("Tank initialized at position:", initialPos);
    }
    return () => {
      debug.log("Tank component cleanup - preserve position state");
    };
  }, [position, updatePlayerPosition]); // Only depend on initial position and update function

  useFrame((state, delta) => {
    if (!tankRef.current || isPaused || isGameOver) return;

    // Rotation
    if (left) tankRotationRef.current += delta * 3.5;
    if (right) tankRotationRef.current -= delta * 3.5;
    tankRef.current.rotation.y = tankRotationRef.current;

    // Movement
    let moved = false;
    const moveSpeed = playerSpeed;
    if (forward || backward) {
      const moveDirection = forward ? 1 : -1;
      const potentialX =
        tankRef.current.position.x +
        Math.sin(tankRotationRef.current) * delta * moveSpeed * moveDirection;
      const potentialZ =
        tankRef.current.position.z +
        Math.cos(tankRotationRef.current) * delta * moveSpeed * moveDirection;
      if (!checkTerrainCollision(potentialX, potentialZ)) {
        tankRef.current.position.x = potentialX;
        tankRef.current.position.z = potentialZ;
        moved = true;
      }
    }

    // Turret rotation
    if (turretRef.current) {
      if (turretLeft) turretRotationRef.current += delta * 2.5;
      if (turretRight) turretRotationRef.current -= delta * 2.5;
      turretRef.current.rotation.y = turretRotationRef.current;
    }

    // Main turret auto-shooting
    const currentTime = state.clock.getElapsedTime();
    if (currentTime - lastShootTimeRef.current > playerFireRate) {
      debug.log("AUTO-FIRING MAIN TURRET!");
      const shootPosition: [number, number, number] = [
        tankRef.current.position.x +
          Math.sin(tankRotationRef.current + turretRotationRef.current) * 1.5,
        tankRef.current.position.y + 0.7,
        tankRef.current.position.z +
          Math.cos(tankRotationRef.current + turretRotationRef.current) * 1.5,
      ];
      setProjectiles((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substr(2, 9),
          position: shootPosition,
          rotation: tankRotationRef.current + turretRotationRef.current,
        },
      ]);
      lastShootTimeRef.current = currentTime;
    }

    // Log manual shoot button press if needed
    if (shoot) {
      debug.log(`Shoot button pressed (main turret auto-fires)`);
    }

    // Update position in game state if moved significantly
    if (moved) {
      const newPosition: [number, number, number] = [
        tankRef.current.position.x,
        tankRef.current.position.y,
        tankRef.current.position.z,
      ];
      if (
        Math.abs(positionRef.current[0] - newPosition[0]) > 0.01 ||
        Math.abs(positionRef.current[1] - newPosition[1]) > 0.01 ||
        Math.abs(positionRef.current[2] - newPosition[2]) > 0.01
      ) {
        positionRef.current = newPosition;
        updatePlayerPosition(newPosition);
        // debug.log("Updated position:", newPosition); // Optional: Reduce logging frequency
      }
    }
  });

  const removeProjectile = (id: string) => {
    setProjectiles((prev) => prev.filter((p) => p.id !== id));
  };

  useEffect(() => {
    if (sniperRifles.length > 0) {
      debug.log(`Sniper rifles equipped: ${sniperRifles.length}`);
    }
  }, [sniperRifles.length]); // Log only when the count changes

  return (
    <>
      <group ref={tankRef}>
        {/* Tank body */}
        <Box args={[1.5, 0.5, 2]} castShadow receiveShadow>
          <meshStandardMaterial color="green" />
        </Box>

        {/* Tank turret */}
        <group position={[0, 0.5, 0]} ref={turretRef}>
          <Cylinder
            args={[0.6, 0.6, 0.4, 16]}
            position={[0, 0.2, 0]}
            castShadow>
            <meshStandardMaterial color="darkgreen" />
          </Cylinder>
          {/* Tank cannon */}
          <Box args={[0.2, 0.2, 1.5]} position={[0, 0.2, 1]} castShadow>
            <meshStandardMaterial color="darkgreen" />
          </Box>
        </group>

        {/* Tank tracks */}
        <Box
          args={[0.3, 0.2, 2.2]}
          position={[-0.7, -0.3, 0]}
          castShadow
          receiveShadow>
          <meshStandardMaterial color="black" />
        </Box>
        <Box
          args={[0.3, 0.2, 2.2]}
          position={[0.7, -0.3, 0]}
          castShadow
          receiveShadow>
          <meshStandardMaterial color="black" />
        </Box>
      </group>

      {/* Main Turret Projectiles */}
      {projectiles.map((projectile) => (
        <Projectile
          key={projectile.id}
          id={projectile.id}
          position={projectile.position}
          rotation={projectile.rotation}
          damage={playerTurretDamage}
          onRemove={removeProjectile}
        />
      ))}

      {/* Render sniper rifles with calculated centered offsets */}
      {sniperRifles.map((weapon, index) => {
        // Calculate the specific offset for this weapon instance
        const currentOffset =
          sniperStartOffset + index * SECONDARY_WEAPON_SPACING;

        return (
          <SniperRifle
            // Use weapon.instanceId for a more stable key if available
            key={weapon.instanceId || `sniper-${index}`}
            tankPosition={positionRef.current} // Pass the ref's current value
            tankRotation={tankRotationRef.current} // Pass the ref's current value
            weaponInstance={weapon}
            positionOffset={currentOffset} // Pass the calculated centered offset
          />
        );
      })}
    </>
  );
};

export default Tank;

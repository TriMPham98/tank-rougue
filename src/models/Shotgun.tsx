// src/components/Shotgun.tsx
import React, { useRef, useEffect, FC } from "react"; // Import FC
import { useFrame, RootState } from "@react-three/fiber";
import { Box } from "@react-three/drei";
import { Group, Vector3 } from "three";
// Adjust path as needed for gameState and types
import { useGameState, SecondaryWeapon, Enemy } from "../utils/gameState";
import { debug } from "../utils/debug";
import ShotgunPellet from "./ShotgunPellet"; // Import the TSX component

// Define the props interface for the Shotgun itself
interface ShotgunProps {
  tankPosition: [number, number, number];
  tankRotation: number;
  weaponInstance: SecondaryWeapon; // Use the imported type
  positionOffset?: number; // Optional prop
}

// Define the structure for the data stored in projectilesRef
interface PelletData {
  id: string;
  position: [number, number, number];
  rotation: number;
  damage: number;
  speed: number;
  range: number;
  ttl: number;
}

const Shotgun: FC<ShotgunProps> = ({
  tankPosition,
  tankRotation,
  weaponInstance,
  positionOffset = 0, // Default value
}) => {
  // Type the refs
  const shotgunRef = useRef<Group>(null);
  const lastShootTimeRef = useRef<number>(0);
  const targetEnemyRef = useRef<string | null>(null);
  // Use the PelletData interface for the ref's array type
  const projectilesRef = useRef<PelletData[]>([]);

  // Access game state - Types are inferred
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const enemies = useGameState((state) => state.enemies);

  // Get properties from weapon instance (types inferred from SecondaryWeapon)
  const {
    cooldown,
    range: weaponRange, // Rename range to avoid conflict
    projectileSpeed,
    damage: damagePerShot, // Rename damage for clarity
    instanceId = "default_shotgun", // Provide default for instanceId
  } = weaponInstance;

  // Shotgun specific constants
  const PELLET_COUNT: number = 5;
  const SPREAD_ANGLE: number = 0.3;

  // Calculate damage per pellet
  const damagePerPellet: number =
    PELLET_COUNT > 0 ? damagePerShot / PELLET_COUNT : 0;

  // Calculate TTL
  const projectileTTL: number =
    projectileSpeed > 0 ? weaponRange / projectileSpeed + 0.5 : 2;

  // --- Find Nearest Enemy ---
  // Type the return value and the parameter
  const findNearestEnemy = (): string | null => {
    if (!enemies.length) return null;
    const tankPos = new Vector3(...tankPosition);
    let nearestEnemy: string | null = null;
    let minDistance: number = Infinity;
    // Type enemy within forEach
    enemies.forEach((enemy: Enemy) => {
      const enemyPos = new Vector3(...enemy.position);
      const distance: number = tankPos.distanceTo(enemyPos);
      if (distance < weaponRange && distance < minDistance) {
        minDistance = distance;
        nearestEnemy = enemy.id;
      }
    });
    return nearestEnemy;
  };

  // --- Calculate Angle To Enemy ---
  // Type the parameter and return value
  const calculateAngleToEnemy = (enemyId: string): number => {
    const enemy: Enemy | undefined = enemies.find((e) => e.id === enemyId);
    if (!enemy) return 0; // Return base rotation if enemy not found
    // Use current tank position for accuracy if it moves while aiming
    const currentTankPos =
      shotgunRef.current?.position ?? new Vector3(...tankPosition);
    const dx: number = enemy.position[0] - currentTankPos.x;
    const dz: number = enemy.position[2] - currentTankPos.z;
    return Math.atan2(dx, dz);
  };

  // --- Auto-aim and fire ---
  useFrame((state: RootState, delta: number) => {
    const currentShotgun = shotgunRef.current;
    if (!currentShotgun || isPaused || isGameOver) return;

    // Position weapon
    const horizontalOffset: number =
      Math.sin(tankRotation + Math.PI / 2) * positionOffset;
    const depthOffset: number =
      Math.cos(tankRotation + Math.PI / 2) * positionOffset;
    currentShotgun.position.x = tankPosition[0] + horizontalOffset;
    currentShotgun.position.y = tankPosition[1] + 0.5;
    currentShotgun.position.z = tankPosition[2] + depthOffset;
    // Base rotation applied first, then aiming rotation overrides if target exists
    currentShotgun.rotation.y = tankRotation;

    // Targeting Logic
    if (
      !targetEnemyRef.current ||
      !enemies.some((e) => e.id === targetEnemyRef.current)
    ) {
      targetEnemyRef.current = findNearestEnemy();
    }

    // Aiming and Firing
    if (targetEnemyRef.current) {
      const angleToEnemy: number = calculateAngleToEnemy(
        targetEnemyRef.current
      );
      currentShotgun.rotation.y = angleToEnemy; // Aim weapon model

      const currentTime: number = state.clock.getElapsedTime();
      if (currentTime - lastShootTimeRef.current > cooldown) {
        const fireOrigin: Vector3 = currentShotgun.position;
        const barrelLength: number = 1.2;
        const firePosition: [number, number, number] = [
          fireOrigin.x + Math.sin(angleToEnemy) * barrelLength,
          fireOrigin.y,
          fireOrigin.z + Math.cos(angleToEnemy) * barrelLength,
        ];

        // Fire multiple pellets
        for (let i = 0; i < PELLET_COUNT; i++) {
          const spreadOffset: number = (Math.random() - 0.5) * SPREAD_ANGLE;
          const pelletRotation: number = angleToEnemy + spreadOffset;
          const projectileId: string = `${instanceId}-pellet-${performance.now()}-${i}`; // Use performance.now() for better uniqueness

          // Create pellet data object matching the PelletData interface
          const newPelletData: PelletData = {
            id: projectileId,
            position: firePosition,
            rotation: pelletRotation,
            damage: damagePerPellet,
            speed: projectileSpeed,
            range: weaponRange,
            ttl: projectileTTL,
          };
          projectilesRef.current.push(newPelletData);
        }

        // debug.log(...); // Optional logging
        lastShootTimeRef.current = currentTime;
      }
    }
  });

  // Remove projectile - type the id parameter
  const removeProjectile = (id: string): void => {
    projectilesRef.current = projectilesRef.current.filter((p) => p.id !== id);
  };

  // --- Logging Mount/Unmount ---
  useEffect(() => {
    debug.log(
      `Shotgun instance ${instanceId} mounted, offset: ${positionOffset}`
    );
    return () => {
      debug.log(`Shotgun instance ${instanceId} unmounted`);
    };
  }, [instanceId, positionOffset]); // Dependencies are correct

  // Helper for Box args typing
  const boxArgs = (
    w: number,
    h: number,
    d: number
  ): [number, number, number] => [w, h, d];

  return (
    <>
      {/* Shotgun model */}
      <group ref={shotgunRef}>
        {/* Use helper for args */}
        <Box args={boxArgs(0.08, 0.1, 1.0)} position={[0, 0, 0.6]} castShadow>
          <meshStandardMaterial color="#5D4037" />
        </Box>
        <Box
          args={boxArgs(0.07, 0.15, 0.4)}
          position={[0, 0, 0]}
          rotation={[0.1, 0, 0]}
          castShadow>
          <meshStandardMaterial color="#3E2723" />
        </Box>
        <Box
          args={boxArgs(0.05, 0.04, 0.9)}
          position={[0.03, 0.03, 0.9]}
          castShadow>
          <meshStandardMaterial
            color="#444444"
            metalness={0.8}
            roughness={0.2}
          />
        </Box>
        <Box
          args={boxArgs(0.05, 0.04, 0.9)}
          position={[-0.03, 0.03, 0.9]}
          castShadow>
          <meshStandardMaterial
            color="#444444"
            metalness={0.8}
            roughness={0.2}
          />
        </Box>
        <Box
          args={boxArgs(0.03, 0.07, 0.12)}
          position={[0, -0.05, 0.3]}
          castShadow>
          <meshStandardMaterial color="#222222" />
        </Box>
        <Box
          args={boxArgs(0.02, 0.03, 0.02)}
          position={[0, 0.07, 1.35]}
          castShadow>
          <meshStandardMaterial color="#444444" />
        </Box>
        <Box
          args={boxArgs(0.1, 0.08, 0.05)}
          position={[0, 0.03, 1.4]}
          castShadow>
          <meshStandardMaterial
            color="#333333"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>
        <Box
          args={boxArgs(0.06, 0.02, 0.15)}
          position={[0, 0.08, 0.5]}
          castShadow>
          <meshStandardMaterial color="#555555" />
        </Box>
      </group>

      {/* Render all active pellets - type pelletData in map */}
      {projectilesRef.current.map((pelletData: PelletData) => (
        <ShotgunPellet
          key={pelletData.id}
          id={pelletData.id}
          position={pelletData.position}
          rotation={pelletData.rotation}
          damage={pelletData.damage}
          speed={pelletData.speed}
          range={pelletData.range}
          ttl={pelletData.ttl}
          onRemove={removeProjectile} // Pass the correctly typed callback
        />
      ))}
    </>
  );
};

export default Shotgun;

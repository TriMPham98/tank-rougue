// src/components/Shotgun.tsx
import React, { useRef, useEffect, FC } from "react";
import { useFrame, RootState } from "@react-three/fiber";
import { Box } from "@react-three/drei";
import { Group, Vector3 } from "three";
import { useGameState, SecondaryWeapon, Enemy } from "../utils/gameState"; // Adjust path if needed
import { debug } from "../utils/debug";
import ShotgunPellet from "./ShotgunPellet";

// --- UPDATED PROPS INTERFACE ---
interface ShotgunProps {
  weaponInstance: SecondaryWeapon;
  position: [number, number, number]; // Receive absolute position
  rotation: number; // Receive base rotation (tank body rotation)
}

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
  weaponInstance,
  position, // Use directly
  rotation, // Use directly (as base, aiming will override)
}) => {
  const shotgunRef = useRef<Group>(null);
  const lastShootTimeRef = useRef<number>(0);
  const targetEnemyRef = useRef<string | null>(null);
  const projectilesRef = useRef<PelletData[]>([]);

  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const enemies = useGameState((state) => state.enemies);

  const {
    cooldown,
    range: weaponRange,
    projectileSpeed,
    damage: damagePerShot,
    instanceId = "default_shotgun",
  } = weaponInstance;

  const PELLET_COUNT: number = 5;
  const SPREAD_ANGLE: number = 0.3;
  const damagePerPellet: number =
    PELLET_COUNT > 0 ? damagePerShot / PELLET_COUNT : 0;
  const projectileTTL: number =
    projectileSpeed > 0 ? weaponRange / projectileSpeed + 0.5 : 2;

  // Find Nearest Enemy (Uses weapon's position for distance check)
  const findNearestEnemy = (): string | null => {
    if (!enemies.length || !shotgunRef.current) return null;
    const weaponPos = shotgunRef.current.position; // Use actual weapon position
    let nearestEnemy: string | null = null;
    let minDistance: number = Infinity;
    enemies.forEach((enemy: Enemy) => {
      const enemyPos = new Vector3(...enemy.position);
      const distance: number = weaponPos.distanceTo(enemyPos); // Check distance from WEAPON
      if (distance < weaponRange && distance < minDistance) {
        minDistance = distance;
        nearestEnemy = enemy.id;
      }
    });
    return nearestEnemy;
  };

  // Calculate Angle To Enemy (Uses weapon's position)
  const calculateAngleToEnemy = (enemyId: string): number => {
    const enemy: Enemy | undefined = enemies.find((e) => e.id === enemyId);
    // Use the weapon's *current* world position from the ref
    if (!enemy || !shotgunRef.current)
      return shotgunRef.current?.rotation.y ?? 0; // Default to current rotation

    const currentWeaponPos = shotgunRef.current.position;
    const dx: number = enemy.position[0] - currentWeaponPos.x;
    const dz: number = enemy.position[2] - currentWeaponPos.z;
    return Math.atan2(dx, dz);
  };

  // --- Auto-aim and fire ---
  useFrame((state: RootState, delta: number) => {
    const currentShotgun = shotgunRef.current;
    if (!currentShotgun || isPaused || isGameOver) return;

    // --- Apply Position and Base Rotation from Props ---
    currentShotgun.position.fromArray(position);
    // We set the base rotation here, but the aiming logic below will override it if a target is found.
    // If no target is found, it defaults back to aligning with the tank body.
    currentShotgun.rotation.y = rotation;

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
        // --- Calculate Fire Position based on Aimed Weapon ---
        const fireOrigin: Vector3 = currentShotgun.position; // Weapon's current world position
        const aimedRotation = currentShotgun.rotation.y; // Weapon's current aimed rotation
        const barrelLength: number = 1.2; // Adjust as needed
        const firePosition: [number, number, number] = [
          fireOrigin.x + Math.sin(aimedRotation) * barrelLength,
          fireOrigin.y, // Use weapon's Y
          fireOrigin.z + Math.cos(aimedRotation) * barrelLength,
        ];

        // Fire multiple pellets
        for (let i = 0; i < PELLET_COUNT; i++) {
          const spreadOffset: number = (Math.random() - 0.5) * SPREAD_ANGLE;
          const pelletRotation: number = aimedRotation + spreadOffset; // Spread relative to aimed direction
          const projectileId: string = `${instanceId}-pellet-${performance.now()}-${i}`;

          const newPelletData: PelletData = {
            id: projectileId,
            position: firePosition, // Use calculated fire position
            rotation: pelletRotation, // Use pellet's specific rotation
            damage: damagePerPellet,
            speed: projectileSpeed,
            range: weaponRange,
            ttl: projectileTTL,
          };
          projectilesRef.current.push(newPelletData);
        }

        lastShootTimeRef.current = currentTime;
      }
    }
    // If no target, the rotation remains aligned with the tank body (set at the start of useFrame)
  });

  const removeProjectile = (id: string): void => {
    projectilesRef.current = projectilesRef.current.filter((p) => p.id !== id);
  };

  // --- Lifecycle Logging (Unchanged, but positionOffset is no longer relevant) ---
  useEffect(() => {
    debug.log(`Shotgun instance ${instanceId} mounted.`);
    return () => {
      debug.log(`Shotgun instance ${instanceId} unmounted`);
    };
  }, [instanceId]); // Only depends on instanceId now

  const boxArgs = (
    w: number,
    h: number,
    d: number
  ): [number, number, number] => [w, h, d];

  return (
    <>
      {/* Shotgun model - position/rotation handled by ref updates */}
      <group ref={shotgunRef}>
        {/* Model parts remain the same */}
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

      {/* Render projectiles */}
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
          onRemove={removeProjectile}
        />
      ))}
    </>
  );
};

export default Shotgun;

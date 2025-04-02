// src/components/RocketLauncher.tsx
import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Box, Cylinder } from "@react-three/drei";
import { Group, Vector3 } from "three";
import { useGameState, SecondaryWeapon, Enemy } from "../utils/gameState"; // Adjust path
import { debug } from "../utils/debug";
import RocketProjectile from "./RocketProjectile";

// --- UPDATED PROPS INTERFACE ---
interface RocketLauncherProps {
  weaponInstance: SecondaryWeapon;
  position: [number, number, number]; // Receive absolute position
  rotation: number; // Receive base rotation
}

const RocketLauncher = ({
  weaponInstance,
  position, // Use directly
  rotation, // Use directly (as base, aiming will override)
}: RocketLauncherProps) => {
  const launcherRef = useRef<Group>(null);
  const lastShootTimeRef = useRef(0);
  const targetEnemyRef = useRef<string | null>(null);
  const projectilesRef = useRef<
    {
      id: string;
      position: [number, number, number];
      rotation: number;
      targetId: string | null;
    }[]
  >([]);

  const playerTurretDamage = useGameState((state) => state.playerTurretDamage); // Keep for damage calc
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const enemies = useGameState((state) => state.enemies);

  const cooldown = weaponInstance.cooldown || 5;
  const weaponRange = weaponInstance.range || 40;
  const baseDamage = weaponInstance.damage || 30;
  const instanceId = weaponInstance.instanceId || "default_rocket";

  // Find Nearest Enemy (Uses weapon's position)
  const findNearestEnemy = (): string | null => {
    if (!enemies.length || !launcherRef.current) return null;
    const weaponPos = launcherRef.current.position; // Use weapon's actual position
    let nearestEnemy: string | null = null;
    let minDistance: number = Infinity;
    enemies.forEach((enemy: Enemy) => {
      const enemyPos = new Vector3(...enemy.position);
      const distance: number = weaponPos.distanceTo(enemyPos); // Check from WEAPON
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
    if (!enemy || !launcherRef.current)
      return launcherRef.current?.rotation.y ?? 0;

    const currentWeaponPos = launcherRef.current.position;
    const dx: number = enemy.position[0] - currentWeaponPos.x;
    const dz: number = enemy.position[2] - currentWeaponPos.z;
    return Math.atan2(dx, dz);
  };

  // Auto-aim and fire at enemies
  useFrame((state, delta) => {
    const currentLauncher = launcherRef.current;
    if (!currentLauncher || isPaused || isGameOver) return;

    // --- Apply Position and Base Rotation from Props ---
    currentLauncher.position.fromArray(position);
    currentLauncher.rotation.y = rotation; // Set base rotation

    // Targeting Logic
    if (
      !targetEnemyRef.current ||
      !enemies.some((e) => e.id === targetEnemyRef.current)
    ) {
      targetEnemyRef.current = findNearestEnemy();
    }

    // Aiming and Firing
    if (targetEnemyRef.current) {
      const angleToEnemy = calculateAngleToEnemy(targetEnemyRef.current);
      currentLauncher.rotation.y = angleToEnemy; // Aim weapon model

      const currentTime = state.clock.getElapsedTime();
      if (currentTime - lastShootTimeRef.current > cooldown) {
        // --- Calculate Fire Position based on Aimed Weapon ---
        const fireOrigin = currentLauncher.position;
        const aimedRotation = currentLauncher.rotation.y;
        const barrelLength = 1.5; // Adjust as needed
        const firePosition: [number, number, number] = [
          fireOrigin.x + Math.sin(aimedRotation) * barrelLength,
          fireOrigin.y + 0.1, // Offset slightly above launcher center
          fireOrigin.z + Math.cos(aimedRotation) * barrelLength,
        ];

        const finalDamage = baseDamage * (1 + playerTurretDamage / 10);
        const projectileId = Math.random().toString(36).substr(2, 9);

        projectilesRef.current.push({
          id: projectileId,
          position: firePosition,
          rotation: aimedRotation, // Rocket initially faces aim direction
          targetId: targetEnemyRef.current,
        });

        debug.log(
          `Rocket launcher ${instanceId} fired at enemy ${
            targetEnemyRef.current
          } (Damage: ${finalDamage.toFixed(1)})`
        );
        lastShootTimeRef.current = currentTime;
      }
    }
    // If no target, rotation remains aligned with tank body
  });

  const removeProjectile = (id: string) => {
    projectilesRef.current = projectilesRef.current.filter((p) => p.id !== id);
  };

  // --- Lifecycle Logging (Unchanged, positionOffset removed) ---
  useEffect(() => {
    debug.log(`Rocket launcher instance ${instanceId} mounted.`);
    return () => {
      debug.log(`Rocket launcher instance ${instanceId} unmounted`);
    };
  }, [instanceId]);

  return (
    <>
      {/* Rocket launcher model - position/rotation handled by ref updates */}
      <group ref={launcherRef}>
        {/* Model parts remain the same */}
        <Box args={[0.2, 0.25, 1.3]} position={[0, 0, 0.5]} castShadow>
          <meshStandardMaterial color="#303030" />
        </Box>
        <Cylinder
          args={[0.15, 0.15, 1.0, 12]}
          position={[0, 0, 1.0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow>
          <meshStandardMaterial
            color="#252525"
            metalness={0.6}
            roughness={0.3}
          />
        </Cylinder>
        <Cylinder
          args={[0.16, 0.14, 0.1, 12]}
          position={[0, 0, 1.5]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow>
          <meshStandardMaterial
            color="#1F1F1F"
            metalness={0.7}
            roughness={0.2}
          />
        </Cylinder>
        <Box args={[0.1, 0.18, 0.25]} position={[0, -0.2, 0.3]} castShadow>
          <meshStandardMaterial color="#202020" />
        </Box>
        <Box args={[0.06, 0.12, 0.2]} position={[0, 0.19, 0.3]} castShadow>
          <meshStandardMaterial
            color="#111111"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>
        <Box args={[0.3, 0.2, 0.4]} position={[0.25, 0, 0.4]} castShadow>
          <meshStandardMaterial color="#3A3A3A" />
        </Box>
        <Box args={[0.31, 0.05, 0.41]} position={[0.25, -0.08, 0.4]} castShadow>
          <meshStandardMaterial color="#FFCC00" />
        </Box>
      </group>

      {/* Render active projectiles */}
      {projectilesRef.current.map((projectile) => (
        <RocketProjectile
          key={projectile.id}
          id={projectile.id}
          position={projectile.position}
          rotation={projectile.rotation}
          damage={baseDamage * (1 + playerTurretDamage / 10)}
          targetId={projectile.targetId}
          onRemove={removeProjectile}
        />
      ))}
    </>
  );
};

export default RocketLauncher;

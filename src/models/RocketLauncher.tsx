import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Box, Cylinder } from "@react-three/drei";
import { Group, Vector3 } from "three";
import { useGameState, SecondaryWeapon } from "../utils/gameState";
import { debug } from "../utils/debug";
import RocketProjectile from "./RocketProjectile";

interface RocketLauncherProps {
  tankPosition: [number, number, number];
  tankRotation: number;
  weaponInstance: SecondaryWeapon;
  positionOffset?: number;
}

const RocketLauncher = ({
  tankPosition,
  tankRotation,
  weaponInstance,
  positionOffset = 0,
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

  // Access game state
  const playerTurretDamage = useGameState((state) => state.playerTurretDamage);
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const enemies = useGameState((state) => state.enemies);

  // Get weapon properties from weapon instance
  const cooldown = weaponInstance.cooldown || 5; // Very slow fire rate (5 seconds)
  const weaponRange = weaponInstance.range || 40; // Good range
  const baseDamage = weaponInstance.damage || 30; // High base damage
  const instanceId = weaponInstance.instanceId || "default";

  // Find nearest enemy for targeting
  const findNearestEnemy = (): string | null => {
    if (!enemies.length) return null;

    const tankPos = new Vector3(
      tankPosition[0],
      tankPosition[1],
      tankPosition[2]
    );
    let nearestEnemy = null;
    let minDistance = Infinity;

    enemies.forEach((enemy) => {
      const enemyPos = new Vector3(
        enemy.position[0],
        enemy.position[1],
        enemy.position[2]
      );
      const distance = tankPos.distanceTo(enemyPos);

      // Only consider enemies within the weapon's range
      if (distance < weaponRange && distance < minDistance) {
        minDistance = distance;
        nearestEnemy = enemy.id;
      }
    });

    return nearestEnemy;
  };

  // Calculate angle to target enemy
  const calculateAngleToEnemy = (enemyId: string): number => {
    const enemy = enemies.find((e) => e.id === enemyId);
    if (!enemy) return 0;

    const dx = enemy.position[0] - tankPosition[0];
    const dz = enemy.position[2] - tankPosition[2];

    return Math.atan2(dx, dz);
  };

  // Auto-aim and fire at enemies
  useFrame((state, delta) => {
    if (!launcherRef.current || isPaused || isGameOver) return;

    // Position the launcher relative to tank with offset
    // Apply horizontal offset based on positionOffset
    const horizontalOffset =
      Math.sin(tankRotation + Math.PI / 2) * positionOffset;
    const depthOffset = Math.cos(tankRotation + Math.PI / 2) * positionOffset;

    launcherRef.current.position.x = tankPosition[0] + horizontalOffset;
    launcherRef.current.position.y = tankPosition[1] + 0.6; // Position slightly higher
    launcherRef.current.position.z = tankPosition[2] + depthOffset;
    launcherRef.current.rotation.y = tankRotation;

    // Find a target if we don't have one or if current target no longer exists
    if (
      !targetEnemyRef.current ||
      !enemies.some((e) => e.id === targetEnemyRef.current)
    ) {
      targetEnemyRef.current = findNearestEnemy();
      if (targetEnemyRef.current) {
        debug.log(
          `Rocket launcher ${instanceId} locked on target: ${targetEnemyRef.current}`
        );
      }
    }

    // If we have a target, aim and fire
    if (targetEnemyRef.current) {
      // Calculate angle to enemy
      const angleToEnemy = calculateAngleToEnemy(targetEnemyRef.current);

      // Rotate the launcher to aim at enemy (auto-aim)
      launcherRef.current.rotation.y = angleToEnemy;

      // Fire if cooldown has passed
      const currentTime = state.clock.getElapsedTime();
      if (currentTime - lastShootTimeRef.current > cooldown) {
        // Calculate firing position (tip of the launcher barrel)
        const firePosition: [number, number, number] = [
          launcherRef.current.position.x + Math.sin(angleToEnemy) * 1.5,
          launcherRef.current.position.y + 0.1, // Slightly above the launcher
          launcherRef.current.position.z + Math.cos(angleToEnemy) * 1.5,
        ];

        // Apply damage multiplier based on player's turret damage stat
        const finalDamage = baseDamage * (1 + playerTurretDamage / 10);

        // Add new projectile
        const projectileId = Math.random().toString(36).substr(2, 9);
        projectilesRef.current.push({
          id: projectileId,
          position: firePosition,
          rotation: angleToEnemy,
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
  });

  // Remove projectile from the ref
  const removeProjectile = (id: string) => {
    projectilesRef.current = projectilesRef.current.filter((p) => p.id !== id);
  };

  // Log component lifecycle
  useEffect(() => {
    debug.log(
      `Rocket launcher instance ${instanceId} mounted, offset: ${positionOffset}`
    );
    return () => {
      debug.log(`Rocket launcher instance ${instanceId} unmounted`);
    };
  }, [instanceId, positionOffset]);

  return (
    <>
      {/* Rocket launcher model */}
      <group ref={launcherRef}>
        {/* Main launcher body */}
        <Box args={[0.2, 0.25, 1.3]} position={[0, 0, 0.5]} castShadow>
          <meshStandardMaterial color="#303030" />
        </Box>

        {/* Launcher barrel - thick tube */}
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

        {/* Front end opening */}
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

        {/* Grip/handle */}
        <Box args={[0.1, 0.18, 0.25]} position={[0, -0.2, 0.3]} castShadow>
          <meshStandardMaterial color="#202020" />
        </Box>

        {/* Sight/scope */}
        <Box args={[0.06, 0.12, 0.2]} position={[0, 0.19, 0.3]} castShadow>
          <meshStandardMaterial
            color="#111111"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>

        {/* Ammo container on side */}
        <Box args={[0.3, 0.2, 0.4]} position={[0.25, 0, 0.4]} castShadow>
          <meshStandardMaterial color="#3A3A3A" />
        </Box>

        {/* Warning stripes on ammo container */}
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

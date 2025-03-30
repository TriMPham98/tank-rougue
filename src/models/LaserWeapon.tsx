import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Box } from "@react-three/drei";
import { Group, Vector3 } from "three";
import { useGameState, SecondaryWeapon } from "../utils/gameState";
import { debug } from "../utils/debug";
import LaserBeam from "./LaserBeam";

interface LaserWeaponProps {
  tankPosition: [number, number, number];
  tankRotation: number;
  weaponInstance: SecondaryWeapon;
  positionOffset?: number;
}

const LaserWeapon = ({
  tankPosition,
  tankRotation,
  weaponInstance,
  positionOffset = 0,
}: LaserWeaponProps) => {
  const laserRef = useRef<Group>(null);
  const lastFireTimeRef = useRef(0);
  const targetEnemyRef = useRef<string | null>(null);
  const [isBeamActive, setIsBeamActive] = useState(false);
  const firingDurationRef = useRef(0);

  // Access game state
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const enemies = useGameState((state) => state.enemies);

  // Get properties from weapon instance
  const {
    cooldown,
    range: weaponRange,
    projectileSpeed,
    damage: laserDamage,
    instanceId = "default_laser",
  } = weaponInstance;

  // Laser specific constants
  const MAX_FIRING_DURATION = 2.5; // Seconds
  const DAMAGE_TICK_RATE = 0.1; // Apply damage every 100ms while firing
  const lastDamageTimeRef = useRef(0);

  // Find nearest enemy for auto-aim
  const findNearestEnemy = (): string | null => {
    if (!enemies.length) return null;

    const tankPos = new Vector3(...tankPosition);
    let nearestEnemy = null;
    let minDistance = Infinity;

    enemies.forEach((enemy) => {
      const enemyPos = new Vector3(...enemy.position);
      const distance = tankPos.distanceTo(enemyPos);

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
    if (!enemy) return tankRotation;

    const dx = enemy.position[0] - tankPosition[0];
    const dz = enemy.position[2] - tankPosition[2];

    return Math.atan2(dx, dz);
  };

  // Auto-aim and fire at enemies
  useFrame((state, delta) => {
    if (!laserRef.current || isPaused || isGameOver) return;

    // Position the laser relative to tank with offset
    const horizontalOffset =
      Math.sin(tankRotation + Math.PI / 2) * positionOffset;
    const depthOffset = Math.cos(tankRotation + Math.PI / 2) * positionOffset;

    laserRef.current.position.x = tankPosition[0] + horizontalOffset;
    laserRef.current.position.y = tankPosition[1] + 0.5;
    laserRef.current.position.z = tankPosition[2] + depthOffset;
    laserRef.current.rotation.y = tankRotation;

    // Find a target if we don't have one or if current target no longer exists
    if (
      !targetEnemyRef.current ||
      !enemies.some((e) => e.id === targetEnemyRef.current)
    ) {
      targetEnemyRef.current = findNearestEnemy();
    }

    // If we have a target, aim and potentially fire
    if (targetEnemyRef.current) {
      // Calculate angle to enemy
      const angleToEnemy = calculateAngleToEnemy(targetEnemyRef.current);

      // Rotate the laser to aim at enemy (auto-aim)
      laserRef.current.rotation.y = angleToEnemy;

      const currentTime = state.clock.getElapsedTime();

      // Check if we can fire the laser
      if (!isBeamActive && currentTime - lastFireTimeRef.current > cooldown) {
        // Start firing laser
        setIsBeamActive(true);
        firingDurationRef.current = 0;
        debug.log(
          `Laser ${instanceId} started firing at enemy ${targetEnemyRef.current}`
        );
      }

      // If laser is active, update duration and check if we need to stop
      if (isBeamActive) {
        firingDurationRef.current += delta;

        // Stop firing if max duration reached
        if (firingDurationRef.current >= MAX_FIRING_DURATION) {
          setIsBeamActive(false);
          lastFireTimeRef.current = currentTime;
          debug.log(
            `Laser ${instanceId} stopped firing (max duration reached)`
          );
        }
      }
    } else {
      // No target, stop firing
      if (isBeamActive) {
        setIsBeamActive(false);
        lastFireTimeRef.current = state.clock.getElapsedTime();
        debug.log(`Laser ${instanceId} stopped firing (no target)`);
      }
    }
  });

  // Add an effect to log when the component is mounted for debugging
  useEffect(() => {
    debug.log(
      `Laser weapon instance ${instanceId} mounted, offset: ${positionOffset}`
    );
    return () => {
      debug.log(`Laser weapon instance ${instanceId} unmounted`);
    };
  }, [instanceId, positionOffset]);

  return (
    <>
      {/* Laser weapon model */}
      <group ref={laserRef}>
        {/* Main body */}
        <Box args={[0.1, 0.1, 1.2]} position={[0, 0, 0.6]} castShadow>
          <meshStandardMaterial
            color="#444444"
            metalness={0.8}
            roughness={0.2}
          />
        </Box>

        {/* Energy core */}
        <Box args={[0.14, 0.14, 0.4]} position={[0, 0, 0.2]} castShadow>
          <meshStandardMaterial
            color="#30FFFF"
            emissive="#30FFFF"
            emissiveIntensity={isBeamActive ? 1.5 : 0.5}
          />
        </Box>

        {/* Barrel */}
        <Box args={[0.08, 0.08, 0.7]} position={[0, 0, 1.1]} castShadow>
          <meshStandardMaterial
            color="#333333"
            metalness={0.9}
            roughness={0.1}
          />
        </Box>

        {/* Emitter lens */}
        <Box args={[0.1, 0.1, 0.05]} position={[0, 0, 1.5]} castShadow>
          <meshStandardMaterial
            color="#00FFFF"
            emissive="#00FFFF"
            emissiveIntensity={isBeamActive ? 3.0 : 0.8}
          />
        </Box>

        {/* Cooling fins - top */}
        <Box args={[0.03, 0.15, 0.7]} position={[0, 0.12, 0.7]} castShadow>
          <meshStandardMaterial
            color="#555555"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>

        {/* Cooling fins - left */}
        <Box args={[0.15, 0.03, 0.7]} position={[0.12, 0, 0.7]} castShadow>
          <meshStandardMaterial
            color="#555555"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>

        {/* Cooling fins - right */}
        <Box args={[0.15, 0.03, 0.7]} position={[-0.12, 0, 0.7]} castShadow>
          <meshStandardMaterial
            color="#555555"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>

        {/* Power cables */}
        <Box args={[0.04, 0.04, 0.4]} position={[0.07, -0.07, 0.3]} castShadow>
          <meshStandardMaterial color="#222222" />
        </Box>

        {/* Status indicator */}
        <Box args={[0.03, 0.03, 0.05]} position={[0, 0.08, 0.05]} castShadow>
          <meshStandardMaterial
            color={isBeamActive ? "#FF3333" : "#33FF33"}
            emissive={isBeamActive ? "#FF0000" : "#00FF00"}
            emissiveIntensity={1.0}
          />
        </Box>
      </group>

      {/* Render laser beam when active */}
      {isBeamActive && targetEnemyRef.current && (
        <LaserBeam
          startPosition={[
            laserRef.current?.position.x || 0,
            laserRef.current?.position.y || 0,
            laserRef.current?.position.z || 0,
          ]}
          targetId={targetEnemyRef.current}
          rotation={laserRef.current?.rotation.y || 0}
          damage={laserDamage * DAMAGE_TICK_RATE}
          range={weaponRange}
          color="#00FFFF"
        />
      )}
    </>
  );
};

export default LaserWeapon;

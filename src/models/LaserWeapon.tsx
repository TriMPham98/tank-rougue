// src/components/LaserWeapon.tsx
import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Box } from "@react-three/drei";
import { Group, Vector3 } from "three";
import { useGameState, SecondaryWeapon, Enemy } from "../utils/gameState"; // Adjust path
import { debug } from "../utils/debug";
import LaserBeam from "./LaserBeam";

// --- UPDATED PROPS INTERFACE ---
interface LaserWeaponProps {
  weaponInstance: SecondaryWeapon;
  position: [number, number, number]; // Receive absolute position
  rotation: number; // Receive base rotation
}

const LaserWeapon = ({
  weaponInstance,
  position, // Use directly
  rotation, // Use directly (as base, aiming will override)
}: LaserWeaponProps) => {
  const laserRef = useRef<Group>(null);
  const lastFireTimeRef = useRef(0);
  const targetEnemyRef = useRef<string | null>(null);
  const [isBeamActive, setIsBeamActive] = useState(false);
  const firingDurationRef = useRef(0);

  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const enemies = useGameState((state) => state.enemies);

  const {
    cooldown,
    range: weaponRange,
    // projectileSpeed, // Not directly used for beam?
    damage: laserDamage,
    instanceId = "default_laser",
  } = weaponInstance;

  const MAX_FIRING_DURATION = 2.5;
  const DAMAGE_TICK_RATE = 0.1;
  // const lastDamageTimeRef = useRef(0); // Damage application likely handled within LaserBeam

  // Find Nearest Enemy (Uses weapon's position)
  const findNearestEnemy = (): string | null => {
    if (!enemies.length || !laserRef.current) return null;
    const weaponPos = laserRef.current.position; // Use weapon's actual position
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
    if (!enemy || !laserRef.current) return laserRef.current?.rotation.y ?? 0;

    const currentWeaponPos = laserRef.current.position;
    const dx: number = enemy.position[0] - currentWeaponPos.x;
    const dz: number = enemy.position[2] - currentWeaponPos.z;
    return Math.atan2(dx, dz);
  };

  // Auto-aim and fire at enemies
  useFrame((state, delta) => {
    const currentLaser = laserRef.current;
    if (!currentLaser || isPaused || isGameOver) return;

    // --- Apply Position and Base Rotation from Props ---
    currentLaser.position.fromArray(position);
    currentLaser.rotation.y = rotation; // Set base rotation

    // Targeting Logic
    if (
      !targetEnemyRef.current ||
      !enemies.some((e) => e.id === targetEnemyRef.current)
    ) {
      // Stop firing if target is lost
      if (isBeamActive) {
        setIsBeamActive(false);
        lastFireTimeRef.current = state.clock.getElapsedTime(); // Start cooldown now
        debug.log(`Laser ${instanceId} stopped firing (target lost/invalid)`);
      }
      targetEnemyRef.current = findNearestEnemy();
    }

    // Aiming and Firing Control
    if (targetEnemyRef.current) {
      const angleToEnemy = calculateAngleToEnemy(targetEnemyRef.current);
      currentLaser.rotation.y = angleToEnemy; // Aim weapon model

      const currentTime = state.clock.getElapsedTime();

      // Check if we can start firing
      if (!isBeamActive && currentTime - lastFireTimeRef.current > cooldown) {
        setIsBeamActive(true);
        firingDurationRef.current = 0;
        debug.log(
          `Laser ${instanceId} started firing at enemy ${targetEnemyRef.current}`
        );
      }

      // If laser is active, update duration and check stop conditions
      if (isBeamActive) {
        firingDurationRef.current += delta;
        // Stop if duration exceeds max OR if target goes out of range (check inside LaserBeam or here)
        // Simple duration check:
        if (firingDurationRef.current >= MAX_FIRING_DURATION) {
          setIsBeamActive(false);
          lastFireTimeRef.current = currentTime;
          debug.log(
            `Laser ${instanceId} stopped firing (max duration reached)`
          );
        }
        // Optional: Add range check here too
        const enemy = enemies.find((e) => e.id === targetEnemyRef.current);
        if (enemy) {
          const enemyPos = new Vector3(...enemy.position);
          if (currentLaser.position.distanceTo(enemyPos) > weaponRange) {
            setIsBeamActive(false);
            lastFireTimeRef.current = currentTime;
            debug.log(
              `Laser ${instanceId} stopped firing (target out of range)`
            );
          }
        }
      }
    } else {
      // No target, ensure beam is off
      if (isBeamActive) {
        setIsBeamActive(false);
        lastFireTimeRef.current = state.clock.getElapsedTime();
        debug.log(`Laser ${instanceId} stopped firing (no target found/left)`);
      }
    }
  });

  // --- Lifecycle Logging (Unchanged, positionOffset removed) ---
  useEffect(() => {
    debug.log(`Laser weapon instance ${instanceId} mounted.`);
    return () => {
      debug.log(`Laser weapon instance ${instanceId} unmounted`);
    };
  }, [instanceId]);

  // --- Calculate Beam Start Position ---
  // This needs to be accurate based on the weapon's current state
  const beamStartPosition = (): [number, number, number] => {
    if (!laserRef.current) return [0, 0, 0]; // Default fallback

    const weaponPos = laserRef.current.position;
    const weaponRot = laserRef.current.rotation.y;
    const emitterOffset = 1.5; // Distance from weapon center to emitter tip

    return [
      weaponPos.x + Math.sin(weaponRot) * emitterOffset,
      weaponPos.y, // Assuming beam comes from weapon's Y level
      weaponPos.z + Math.cos(weaponRot) * emitterOffset,
    ];
  };

  return (
    <>
      {/* Laser weapon model - position/rotation handled by ref updates */}
      <group ref={laserRef}>
        {/* Model parts remain the same */}
        <Box args={[0.1, 0.1, 1.2]} position={[0, 0, 0.6]} castShadow>
          <meshStandardMaterial
            color="#444444"
            metalness={0.8}
            roughness={0.2}
          />
        </Box>
        <Box args={[0.14, 0.14, 0.4]} position={[0, 0, 0.2]} castShadow>
          <meshStandardMaterial
            color="#30FFFF"
            emissive="#30FFFF"
            emissiveIntensity={isBeamActive ? 1.5 : 0.5}
          />
        </Box>
        <Box args={[0.08, 0.08, 0.7]} position={[0, 0, 1.1]} castShadow>
          <meshStandardMaterial
            color="#333333"
            metalness={0.9}
            roughness={0.1}
          />
        </Box>
        <Box args={[0.1, 0.1, 0.05]} position={[0, 0, 1.5]} castShadow>
          <meshStandardMaterial
            color="#00FFFF"
            emissive="#00FFFF"
            emissiveIntensity={isBeamActive ? 3.0 : 0.8}
          />
        </Box>
        <Box args={[0.03, 0.15, 0.7]} position={[0, 0.12, 0.7]} castShadow>
          <meshStandardMaterial
            color="#555555"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>
        <Box args={[0.15, 0.03, 0.7]} position={[0.12, 0, 0.7]} castShadow>
          <meshStandardMaterial
            color="#555555"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>
        <Box args={[0.15, 0.03, 0.7]} position={[-0.12, 0, 0.7]} castShadow>
          <meshStandardMaterial
            color="#555555"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>
        <Box args={[0.04, 0.04, 0.4]} position={[0.07, -0.07, 0.3]} castShadow>
          <meshStandardMaterial color="#222222" />
        </Box>
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
          // Calculate start position dynamically based on current weapon state
          startPosition={beamStartPosition()}
          targetId={targetEnemyRef.current}
          damage={laserDamage * DAMAGE_TICK_RATE} // Pass damage per tick
          range={weaponRange}
          color="#00FFFF"
          // Consider adding an onEnd callback if LaserBeam needs to notify when it naturally finishes
        />
      )}
    </>
  );
};

export default LaserWeapon;

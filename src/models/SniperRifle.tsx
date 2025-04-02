// src/components/SniperRifle.tsx
import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Box } from "@react-three/drei";
import { Group, Vector3 } from "three";
import { useGameState, SecondaryWeapon, Enemy } from "../utils/gameState"; // Adjust path
import { debug } from "../utils/debug";
import SniperProjectile from "./SniperProjectile";

// --- UPDATED PROPS INTERFACE ---
interface SniperRifleProps {
  weaponInstance: SecondaryWeapon;
  position: [number, number, number]; // Receive absolute position
  rotation: number; // Receive base rotation
}

const SniperRifle = ({
  weaponInstance,
  position, // Use directly
  rotation, // Use directly (as base, aiming will override)
}: SniperRifleProps) => {
  const rifleRef = useRef<Group>(null);
  const lastShootTimeRef = useRef(0);
  const targetEnemyRef = useRef<string | null>(null);
  const projectilesRef = useRef<
    {
      id: string;
      position: [number, number, number];
      rotation: number;
      targetId: string | null; // Keep targetId if SniperProjectile uses it for guidance/initial velocity
      // Add damage if SniperProjectile needs it directly
      damage: number;
    }[]
  >([]);

  const playerTurretDamage = useGameState((state) => state.playerTurretDamage); // Used for projectile damage
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const enemies = useGameState((state) => state.enemies);

  const cooldown = weaponInstance.cooldown;
  const weaponRange = weaponInstance.range;
  const baseDamage = weaponInstance.damage; // Get base damage
  const instanceId = weaponInstance.instanceId || "default_sniper";

  // Find Nearest Enemy (Uses weapon's position)
  const findNearestEnemy = (): string | null => {
    if (!enemies.length || !rifleRef.current) return null;
    const weaponPos = rifleRef.current.position; // Use weapon's actual position
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
    if (!enemy || !rifleRef.current) return rifleRef.current?.rotation.y ?? 0;

    const currentWeaponPos = rifleRef.current.position;
    const dx: number = enemy.position[0] - currentWeaponPos.x;
    const dz: number = enemy.position[2] - currentWeaponPos.z;
    return Math.atan2(dx, dz);
  };

  // Auto-aim and fire at enemies
  useFrame((state, delta) => {
    const currentRifle = rifleRef.current;
    if (!currentRifle || isPaused || isGameOver) return;

    // --- Apply Position and Base Rotation from Props ---
    currentRifle.position.fromArray(position);
    currentRifle.rotation.y = rotation; // Set base rotation

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
      currentRifle.rotation.y = angleToEnemy; // Aim weapon model

      const currentTime = state.clock.getElapsedTime();
      if (currentTime - lastShootTimeRef.current > cooldown) {
        // --- Calculate Fire Position based on Aimed Weapon ---
        const fireOrigin = currentRifle.position;
        const aimedRotation = currentRifle.rotation.y;
        const barrelLength = 1.8; // Adjust as needed for sniper barrel
        const firePosition: [number, number, number] = [
          fireOrigin.x + Math.sin(aimedRotation) * barrelLength,
          fireOrigin.y, // Use weapon's Y
          fireOrigin.z + Math.cos(aimedRotation) * barrelLength,
        ];

        // Calculate final damage including player stat bonus
        const finalDamage = baseDamage * (1 + playerTurretDamage / 10);

        const projectileId = Math.random().toString(36).substr(2, 9);
        projectilesRef.current.push({
          id: projectileId,
          position: firePosition,
          rotation: aimedRotation, // Projectile starts facing aim direction
          targetId: targetEnemyRef.current, // Pass target if needed by projectile
          damage: finalDamage, // Pass calculated damage
        });

        debug.log(
          `Sniper ${instanceId} fired at enemy ${targetEnemyRef.current}`
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
    debug.log(`Sniper rifle instance ${instanceId} mounted.`);
    return () => {
      debug.log(`Sniper rifle instance ${instanceId} unmounted`);
    };
  }, [instanceId]);

  return (
    <>
      {/* Sniper rifle model - position/rotation handled by ref updates */}
      <group ref={rifleRef}>
        {/* Model parts remain the same */}
        <Box
          args={[0.07, 0.08, 1.75]}
          position={[0, 0, 0.75]}
          rotation={[0, 0, 0]}
          castShadow>
          <meshStandardMaterial color="#252525" />
        </Box>
        <Box
          args={[0.06, 0.12, 0.4]}
          position={[0, 0.02, 0]}
          rotation={[0.1, 0, 0]}
          castShadow>
          <meshStandardMaterial color="#1A1A1A" />
        </Box>
        <Box args={[0.05, 0.05, 1.2]} position={[0, 0, 1.4]} castShadow>
          <meshStandardMaterial
            color="#202020"
            metalness={0.8}
            roughness={0.2}
          />
        </Box>
        <Box args={[0.08, 0.04, 0.25]} position={[0, 0.1, 1]} castShadow>
          <meshStandardMaterial color="#181818" />
        </Box>
        <Box args={[0.06, 0.15, 0.35]} position={[0, 0.19, 1]} castShadow>
          <meshStandardMaterial
            color="#111111"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>
        <Box args={[0.04, 0.04, 0.01]} position={[0, 0.19, 1.18]} castShadow>
          <meshStandardMaterial
            color="#88CCFF"
            emissive="#446688"
            emissiveIntensity={0.5}
          />
        </Box>
        <Box args={[0.04, 0.04, 0.01]} position={[0, 0.19, 0.83]} castShadow>
          <meshStandardMaterial color="#000000" />
        </Box>
        <Box
          args={[0.02, 0.02, 0.15]}
          position={[0.08, 0.02, 0.7]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow>
          <meshStandardMaterial color="#333333" metalness={0.6} />
        </Box>
        <Box args={[0.03, 0.07, 0.12]} position={[0, -0.05, 0.4]} castShadow>
          <meshStandardMaterial color="#222222" />
        </Box>
        <Box args={[0.05, 0.12, 0.2]} position={[0, -0.1, 0.6]} castShadow>
          <meshStandardMaterial color="#333333" />
        </Box>
        <Box
          args={[0.02, 0.08, 0.02]}
          position={[-0.05, -0.05, 2]}
          rotation={[0.3, 0, -0.3]}
          castShadow>
          <meshStandardMaterial color="#282828" />
        </Box>
        <Box
          args={[0.02, 0.08, 0.02]}
          position={[0.05, -0.05, 2]}
          rotation={[0.3, 0, 0.3]}
          castShadow>
          <meshStandardMaterial color="#282828" />
        </Box>

        {/* Laser sight */}
        <Box args={[0.03, 0.03, 0.1]} position={[0, 0.02, 2.05]} castShadow>
          <meshStandardMaterial
            color="red"
            emissive="red"
            emissiveIntensity={2}
          />
        </Box>

        {/* Laser beam effect */}
        <Box args={[0.005, 0.005, 5]} position={[0, 0.02, 4.5]}>
          <meshStandardMaterial
            color="red"
            emissive="red"
            emissiveIntensity={3}
            transparent={true}
            opacity={0.5}
          />
        </Box>
      </group>

      {/* Render projectiles */}
      {projectilesRef.current.map((projectile) => (
        <SniperProjectile
          key={projectile.id}
          id={projectile.id}
          position={projectile.position}
          rotation={projectile.rotation}
          damage={projectile.damage} // Pass damage from the stored data
          targetId={projectile.targetId}
          onRemove={removeProjectile}
        />
      ))}
    </>
  );
};

export default SniperRifle;

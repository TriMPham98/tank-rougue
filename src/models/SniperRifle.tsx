import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Box } from "@react-three/drei";
import { Group, Vector3 } from "three";
import { useGameState } from "../utils/gameState";
import { debug } from "../utils/debug";
import SniperProjectile from "./SniperProjectile";

interface SniperRifleProps {
  tankPosition: [number, number, number];
  tankRotation: number;
}

const SniperRifle = ({ tankPosition, tankRotation }: SniperRifleProps) => {
  const rifleRef = useRef<Group>(null);
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

  // Get cooldown from weapon properties (4 seconds for sniper)
  const cooldown = 4;

  // Find nearest enemy for auto-aim
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

      // Only consider enemies within the sniper's range (50 units)
      if (distance < 50 && distance < minDistance) {
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
    if (!rifleRef.current || isPaused || isGameOver) return;

    // Position the rifle relative to tank - adjusted for smaller model
    rifleRef.current.position.x = tankPosition[0];
    rifleRef.current.position.y = tankPosition[1] + 0.5; // Lower position on tank
    rifleRef.current.position.z = tankPosition[2];
    rifleRef.current.rotation.y = tankRotation;

    // Find a target if we don't have one or if current target no longer exists
    if (
      !targetEnemyRef.current ||
      !enemies.some((e) => e.id === targetEnemyRef.current)
    ) {
      targetEnemyRef.current = findNearestEnemy();
      if (targetEnemyRef.current) {
        debug.log(`Sniper locked on target: ${targetEnemyRef.current}`);
      }
    }

    // If we have a target, aim and fire
    if (targetEnemyRef.current) {
      // Calculate angle to enemy
      const angleToEnemy = calculateAngleToEnemy(targetEnemyRef.current);

      // Rotate the rifle to aim at enemy (auto-aim)
      rifleRef.current.rotation.y = angleToEnemy;

      // Fire if cooldown has passed
      const currentTime = state.clock.getElapsedTime();
      if (currentTime - lastShootTimeRef.current > cooldown) {
        // Calculate firing position (tip of the rifle barrel)
        const firePosition: [number, number, number] = [
          rifleRef.current.position.x + Math.sin(angleToEnemy) * 1.8, // Adjusted for smaller rifle
          rifleRef.current.position.y,
          rifleRef.current.position.z + Math.cos(angleToEnemy) * 1.8, // Adjusted for smaller rifle
        ];

        // Add new projectile
        const projectileId = Math.random().toString(36).substr(2, 9);
        projectilesRef.current.push({
          id: projectileId,
          position: firePosition,
          rotation: angleToEnemy,
          targetId: targetEnemyRef.current,
        });

        debug.log(`Sniper fired at enemy ${targetEnemyRef.current}`);
        lastShootTimeRef.current = currentTime;
      }
    }
  });

  // Remove projectile from the ref
  const removeProjectile = (id: string) => {
    projectilesRef.current = projectilesRef.current.filter((p) => p.id !== id);
  };

  return (
    <>
      {/* Sniper rifle model - now half the size with more details */}
      <group ref={rifleRef}>
        {/* Rifle main body - slimmer overall */}
        <Box
          args={[0.07, 0.08, 1.75]} // Half the size
          position={[0, 0, 0.75]}
          rotation={[0, 0, 0]}
          castShadow>
          <meshStandardMaterial color="#252525" />
        </Box>

        {/* Rifle stock */}
        <Box
          args={[0.06, 0.12, 0.4]}
          position={[0, 0.02, 0]}
          rotation={[0.1, 0, 0]}
          castShadow>
          <meshStandardMaterial color="#1A1A1A" />
        </Box>

        {/* Rifle barrel - longer, thinner */}
        <Box args={[0.05, 0.05, 1.2]} position={[0, 0, 1.4]} castShadow>
          <meshStandardMaterial
            color="#202020"
            metalness={0.8}
            roughness={0.2}
          />
        </Box>

        {/* Scope mount */}
        <Box args={[0.08, 0.04, 0.25]} position={[0, 0.1, 1]} castShadow>
          <meshStandardMaterial color="#181818" />
        </Box>

        {/* Main scope body */}
        <Box args={[0.06, 0.15, 0.35]} position={[0, 0.19, 1]} castShadow>
          <meshStandardMaterial
            color="#111111"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>

        {/* Scope front lens */}
        <Box args={[0.04, 0.04, 0.01]} position={[0, 0.19, 1.18]} castShadow>
          <meshStandardMaterial
            color="#88CCFF"
            emissive="#446688"
            emissiveIntensity={0.5}
          />
        </Box>

        {/* Scope rear lens */}
        <Box args={[0.04, 0.04, 0.01]} position={[0, 0.19, 0.83]} castShadow>
          <meshStandardMaterial color="#000000" />
        </Box>

        {/* Bolt handle */}
        <Box
          args={[0.02, 0.02, 0.15]}
          position={[0.08, 0.02, 0.7]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow>
          <meshStandardMaterial color="#333333" metalness={0.6} />
        </Box>

        {/* Trigger guard */}
        <Box args={[0.03, 0.07, 0.12]} position={[0, -0.05, 0.4]} castShadow>
          <meshStandardMaterial color="#222222" />
        </Box>

        {/* Magazine */}
        <Box args={[0.05, 0.12, 0.2]} position={[0, -0.1, 0.6]} castShadow>
          <meshStandardMaterial color="#333333" />
        </Box>

        {/* Bipod left leg */}
        <Box
          args={[0.02, 0.08, 0.02]}
          position={[-0.05, -0.05, 2]}
          rotation={[0.3, 0, -0.3]}
          castShadow>
          <meshStandardMaterial color="#282828" />
        </Box>

        {/* Bipod right leg */}
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
        <Box
          args={[0.005, 0.005, 5]}
          position={[0, 0.02, 4.5]}
          transparent={true}
          opacity={0.4}>
          <meshBasicMaterial
            color="red"
            emissive="red"
            emissiveIntensity={3}
            transparent={true}
            opacity={0.4}
          />
        </Box>
      </group>

      {/* Render all active projectiles */}
      {projectilesRef.current.map((projectile) => (
        <SniperProjectile
          key={projectile.id}
          id={projectile.id}
          position={projectile.position}
          rotation={projectile.rotation}
          damage={playerTurretDamage * 2} // Sniper does double damage
          targetId={projectile.targetId}
          onRemove={removeProjectile}
        />
      ))}
    </>
  );
};

export default SniperRifle;

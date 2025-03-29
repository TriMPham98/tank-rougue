import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import { Mesh, Vector3 } from "three";
import { useGameState } from "../utils/gameState";
import { debug } from "../utils/debug";

interface SniperProjectileProps {
  id: string;
  position: [number, number, number];
  rotation: number;
  damage: number;
  targetId: string | null; // The ID of the enemy to track
  onRemove: (id: string) => void;
}

const SniperProjectile = ({
  id,
  position,
  rotation,
  damage,
  targetId,
  onRemove,
}: SniperProjectileProps) => {
  const projectileRef = useRef<Mesh>(null);
  const hasCollidedRef = useRef(false);
  const initialPositionRef = useRef<[number, number, number]>([...position]);
  const distanceTraveledRef = useRef(0);

  // Access state functions
  const damageEnemy = useGameState((state) => state.damageEnemy);
  const playerBulletVelocity = useGameState(
    (state) => state.playerBulletVelocity
  );
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const terrainObstacles = useGameState((state) => state.terrainObstacles);

  // Get direct access to the store for latest enemy positions
  const getState = useRef(useGameState.getState).current;

  // Projectile movement with homing capability
  useFrame((state, delta) => {
    if (
      !projectileRef.current ||
      hasCollidedRef.current ||
      isPaused ||
      isGameOver
    )
      return;

    // Enhanced velocity for sniper shots
    const velocity = playerBulletVelocity * 1.5;
    let newDirection = new Vector3(Math.sin(rotation), 0, Math.cos(rotation));

    // Get fresh enemy data for tracking
    const enemies = getState().enemies;
    const targetEnemy = targetId
      ? enemies.find((e) => e.id === targetId)
      : null;

    if (targetEnemy) {
      // Calculate direction to target for tracking
      const currentPos = new Vector3(
        projectileRef.current.position.x,
        projectileRef.current.position.y,
        projectileRef.current.position.z
      );

      const targetPos = new Vector3(
        targetEnemy.position[0],
        targetEnemy.position[1] + 1, // Aim at the center of the enemy
        targetEnemy.position[2]
      );

      // Direction to target
      const directionToTarget = targetPos.clone().sub(currentPos).normalize();

      // Blend between straight line and homing (more homing as it gets closer)
      const distanceToTarget = currentPos.distanceTo(targetPos);
      const homingFactor = Math.max(0, Math.min(0.2, 10 / distanceToTarget)); // Increase homing as it gets closer

      // Blend the forward direction with direction to target
      newDirection = newDirection.lerp(directionToTarget, homingFactor);
      newDirection.normalize();

      // Debug tracking
      if (Math.random() < 0.01) {
        debug.log(
          `Sniper bullet tracking: distance=${distanceToTarget.toFixed(
            2
          )}, homing=${homingFactor.toFixed(2)}`
        );
      }
    }

    // Move projectile along calculated direction
    projectileRef.current.position.x += newDirection.x * delta * velocity;
    projectileRef.current.position.z += newDirection.z * delta * velocity;

    // Calculate distance traveled
    const currentPosition = new Vector3(
      projectileRef.current.position.x,
      projectileRef.current.position.y,
      projectileRef.current.position.z
    );
    const initialPosition = new Vector3(
      initialPositionRef.current[0],
      initialPositionRef.current[1],
      initialPositionRef.current[2]
    );
    distanceTraveledRef.current = currentPosition.distanceTo(initialPosition);

    // Remove projectile if it's gone too far (sniper bullets have longer range)
    if (distanceTraveledRef.current > 80) {
      debug.log(`Sniper bullet ${id} reached max range`);
      onRemove(id);
      return;
    }

    // Check for collisions with terrain obstacles
    const projectilePos = new Vector3(
      projectileRef.current.position.x,
      projectileRef.current.position.y,
      projectileRef.current.position.z
    );

    for (const obstacle of terrainObstacles) {
      const obstaclePos = new Vector3(...obstacle.position);
      const distanceToObstacle = obstaclePos.distanceTo(projectilePos);
      const collisionRadius =
        obstacle.type === "rock" ? obstacle.size : obstacle.size * 0.3;

      if (distanceToObstacle < collisionRadius) {
        if (!hasCollidedRef.current) {
          hasCollidedRef.current = true;
          debug.log(`Sniper bullet hit terrain obstacle`);
          onRemove(id);
          break;
        }
      }
    }

    if (hasCollidedRef.current) return;

    // Check for collisions with all enemies
    for (const enemy of enemies) {
      const enemyPos = new Vector3(...enemy.position);
      const distanceToEnemy = enemyPos.distanceTo(projectilePos);

      // Sniper bullets have better targeting
      const collisionRadius = enemy.type === "tank" ? 2.0 : 1.2;

      if (distanceToEnemy < collisionRadius) {
        if (!hasCollidedRef.current) {
          hasCollidedRef.current = true;

          // Apply extra critical hit chance for sniper (50% chance)
          const isCriticalHit = Math.random() < 0.5;
          const finalDamage = isCriticalHit ? damage * 1.5 : damage;

          debug.log(
            `Sniper hit on enemy ${enemy.id}${
              isCriticalHit ? " (CRITICAL HIT!)" : ""
            }`
          );

          // Apply damage to the enemy
          damageEnemy(enemy.id, finalDamage);

          // Check if enemy was destroyed
          const updatedEnemies = getState().enemies;
          const enemyDestroyed = !updatedEnemies.some((e) => e.id === enemy.id);

          if (enemyDestroyed) {
            debug.log(`Enemy ${enemy.id} eliminated by sniper`);
          }

          // Remove the projectile
          onRemove(id);
          break;
        }
      }
    }
  });

  return (
    <Sphere ref={projectileRef} args={[0.1, 8, 8]} position={position}>
      <meshStandardMaterial
        color="#00A0FF"
        emissive="#00A0FF"
        emissiveIntensity={3}
      />
      <pointLight color="#00A0FF" intensity={2} distance={8} decay={2} />
    </Sphere>
  );
};

export default SniperProjectile;

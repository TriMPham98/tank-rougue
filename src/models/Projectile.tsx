import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import { Mesh, Vector3 } from "three";
import { useGameState } from "../utils/gameState";
import { debug } from "../utils/debug";

interface ProjectileProps {
  id: string;
  position: [number, number, number];
  rotation: number;
  damage: number;
  onRemove: (id: string) => void;
  penetrationPower?: number; // Number of enemies the bullet can pass through
  isEnemy?: boolean; // Flag to determine if this is an enemy projectile
}

const Projectile = ({
  id,
  position,
  rotation,
  damage,
  onRemove,
  penetrationPower = 0, // Default to 0 (no penetration)
  isEnemy = false, // Default to player projectile
}: ProjectileProps) => {
  const projectileRef = useRef<Mesh>(null);
  const hasCollidedRef = useRef(false);
  const penetrationsLeftRef = useRef(penetrationPower);
  const hitEnemiesRef = useRef<Set<string>>(new Set());
  const initialPosRef = useRef(new Vector3(...position));

  // Access relevant game state functions
  const damageEnemy = useGameState((state) => state.damageEnemy);
  const takeDamage = useGameState((state) => state.takeDamage);
  const playerBulletVelocity = useGameState(
    (state) => state.playerBulletVelocity
  );
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const terrainObstacles = useGameState((state) => state.terrainObstacles);
  const playerPenetration = useGameState((state) => state.playerPenetration);

  // Get direct store access
  const getState = useRef(useGameState.getState).current;

  // Cache obstacle data for collision detection to avoid recreating in each frame
  const obstacleCollisionData = useMemo(
    () =>
      terrainObstacles.map((obstacle) => ({
        position: new Vector3(...obstacle.position),
        radius: obstacle.type === "rock" ? obstacle.size : obstacle.size * 1.5,
      })),
    [terrainObstacles]
  );

  // Set initial penetration power from either prop or player stat
  useRef(() => {
    // Only adjust penetration for player projectiles
    if (!isEnemy) {
      // Use the higher of the two values - either the explicit penetrationPower or player stat
      penetrationsLeftRef.current = Math.max(
        penetrationPower,
        playerPenetration
      );
    }
  }).current;

  // Constants
  const ENEMY_SPEED = 12;
  const PLAYER_COLLISION_RADIUS = 1.8;
  const MAP_SIZE = 50;
  const MAX_DISTANCE = 50;

  // Projectile movement and collision detection
  useFrame((_, delta) => {
    if (
      !projectileRef.current ||
      (hasCollidedRef.current &&
        (isEnemy || penetrationsLeftRef.current <= 0)) ||
      isPaused ||
      isGameOver
    )
      return;

    // Get current position as a Vector3 for easier calculations
    const currentPos = projectileRef.current.position;

    // Move projectile differently based on type
    if (isEnemy) {
      // Enemy projectile movement
      currentPos.x += Math.sin(rotation) * delta * ENEMY_SPEED;
      currentPos.z += Math.cos(rotation) * delta * ENEMY_SPEED;
    } else {
      // Player projectile movement
      currentPos.x += Math.sin(rotation) * delta * playerBulletVelocity;
      currentPos.z += Math.cos(rotation) * delta * playerBulletVelocity;
    }

    // Check map boundaries - Ground is 100x100 centered at origin
    if (
      Math.abs(currentPos.x) > MAP_SIZE ||
      Math.abs(currentPos.z) > MAP_SIZE
    ) {
      debug.log(`Projectile ${id} reached map boundary`);
      onRemove(id);
      return;
    }

    // Remove projectile if it's too far away
    const distance = currentPos.distanceTo(initialPosRef.current);
    if (distance > MAX_DISTANCE) {
      onRemove(id);
      return;
    }

    // Check for collisions with terrain obstacles
    for (const obstacle of obstacleCollisionData) {
      const distanceToObstacle = obstacle.position.distanceTo(currentPos);

      if (distanceToObstacle < obstacle.radius) {
        // Terrain always stops bullets regardless of penetration
        debug.log(`Projectile hit terrain obstacle`);
        onRemove(id);
        return;
      }
    }

    if (isEnemy) {
      // Enemy projectile - check for collision with player
      const playerTankPosition = getState().playerTankPosition;
      if (!playerTankPosition) return;

      const playerPos = new Vector3(...playerTankPosition);
      const distanceToPlayer = playerPos.distanceTo(currentPos);

      if (distanceToPlayer < PLAYER_COLLISION_RADIUS) {
        if (!hasCollidedRef.current) {
          hasCollidedRef.current = true;
          debug.log(
            `Enemy projectile hit player at distance ${distanceToPlayer.toFixed(
              2
            )}`
          );
          takeDamage(damage);
          onRemove(id);
        }
      }
    } else {
      // Player projectile - check for collisions with enemies
      const enemies = getState().enemies;

      // Check for collisions with enemies
      for (const enemy of enemies) {
        // Skip enemies we've already hit
        if (hitEnemiesRef.current.has(enemy.id)) continue;

        const enemyPos = new Vector3(...enemy.position);
        const distanceToEnemy = enemyPos.distanceTo(currentPos);

        // Use a larger collision radius for tanks since they're bigger and moving
        const collisionRadius = enemy.type === "tank" ? 2.5 : 1.5;

        if (distanceToEnemy < collisionRadius) {
          // Track this hit enemy
          hitEnemiesRef.current.add(enemy.id);

          debug.log(
            `Projectile hit enemy ${
              enemy.id
            } at distance ${distanceToEnemy.toFixed(2)} - Penetrations left: ${
              penetrationsLeftRef.current
            }`
          );

          // Apply damage to the enemy
          damageEnemy(enemy.id, damage);

          // Check if enemy was destroyed
          const updatedEnemies = getState().enemies;
          const enemyStillExists = updatedEnemies.some(
            (e) => e.id === enemy.id
          );

          if (!enemyStillExists) {
            debug.log(`Enemy ${enemy.id} was destroyed!`);
          }

          // Reduce penetration counter
          penetrationsLeftRef.current--;

          // Remove the projectile if it has no more penetration power
          if (penetrationsLeftRef.current < 0) {
            debug.log(
              `Projectile ${id} stopped after hitting ${hitEnemiesRef.current.size} enemies`
            );
            onRemove(id);
            return;
          }

          // We only process one collision per frame, so break
          break;
        }
      }
    }
  });

  return (
    <Sphere
      ref={projectileRef}
      args={[isEnemy ? 0.2 : 0.25, 8, 8]}
      position={position}>
      <meshStandardMaterial
        color={isEnemy ? "red" : "yellow"}
        emissive={isEnemy ? "red" : "orange"}
        emissiveIntensity={isEnemy ? 2 : 2}
      />
      <pointLight
        color={isEnemy ? "red" : "orange"}
        intensity={isEnemy ? 0.8 : 1}
        distance={isEnemy ? 3 : 5}
        decay={2}
      />
    </Sphere>
  );
};

export default Projectile;

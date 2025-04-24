import { useRef } from "react";
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
}

const Projectile = ({
  id,
  position,
  rotation,
  damage,
  onRemove,
  penetrationPower = 0, // Default to 0 (no penetration)
}: ProjectileProps) => {
  const projectileRef = useRef<Mesh>(null);
  const hasCollidedRef = useRef(false);
  const penetrationsLeftRef = useRef(penetrationPower);
  const hitEnemiesRef = useRef<Set<string>>(new Set());

  // Access only the damageEnemy function and bullet velocity
  const damageEnemy = useGameState((state) => state.damageEnemy);
  const playerBulletVelocity = useGameState(
    (state) => state.playerBulletVelocity
  );
  const playerPenetration = useGameState((state) => state.playerPenetration);
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const terrainObstacles = useGameState((state) => state.terrainObstacles);

  // Get direct store access
  const getState = useRef(useGameState.getState).current;

  // Set initial penetration power from either prop or player stat
  useRef(() => {
    // Use the higher of the two values - either the explicit penetrationPower or player stat
    penetrationsLeftRef.current = Math.max(penetrationPower, playerPenetration);
  }).current;

  // Projectile movement and collision detection
  useFrame((_, delta) => {
    if (
      !projectileRef.current ||
      (hasCollidedRef.current && penetrationsLeftRef.current <= 0) ||
      isPaused ||
      isGameOver
    )
      return;

    // Move projectile using the bullet velocity from game state
    projectileRef.current.position.x +=
      Math.sin(rotation) * delta * playerBulletVelocity;
    projectileRef.current.position.z +=
      Math.cos(rotation) * delta * playerBulletVelocity;

    // Check map boundaries - Ground is 100x100 centered at origin
    const mapSize = 50; // Half of the total ground size (100/2)
    if (
      Math.abs(projectileRef.current.position.x) > mapSize ||
      Math.abs(projectileRef.current.position.z) > mapSize
    ) {
      debug.log(`Projectile ${id} reached map boundary`);
      onRemove(id);
      return;
    }

    // Remove projectile if it's too far away
    const distance = new Vector3(
      projectileRef.current.position.x - position[0],
      0,
      projectileRef.current.position.z - position[2]
    ).length();

    if (distance > 50) {
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
        obstacle.type === "rock" ? obstacle.size : obstacle.size * 1.5;

      if (distanceToObstacle < collisionRadius) {
        // Terrain always stops bullets regardless of penetration
        debug.log(
          `Projectile hit terrain obstacle at distance ${distanceToObstacle.toFixed(
            2
          )}`
        );
        onRemove(id);
        return;
      }
    }

    // Get fresh enemies data
    const enemies = getState().enemies;

    // Log available enemies for debugging
    if (enemies.length > 0 && Math.random() < 0.01) {
      debug.log(`Projectile ${id} tracking ${enemies.length} enemies`);
    }

    // Check for collisions with enemies
    for (const enemy of enemies) {
      // Skip enemies we've already hit
      if (hitEnemiesRef.current.has(enemy.id)) continue;

      const enemyPos = new Vector3(...enemy.position);
      const distanceToEnemy = enemyPos.distanceTo(projectilePos);

      // Use a larger collision radius for tanks since they're bigger and moving
      const collisionRadius = enemy.type === "tank" ? 2.5 : 1.5;

      // If hit detection range is smaller than visual size, log it
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
        const enemyStillExists = updatedEnemies.some((e) => e.id === enemy.id);

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

        // Log enemy damage application
        debug.log(
          `Applied ${damage} damage to enemy ${
            enemy.id
          }, destroyed: ${!enemyStillExists}, continuing: ${
            penetrationsLeftRef.current >= 0
          }`
        );

        // We only process one collision per frame, so break
        break;
      }
    }
  });

  return (
    <Sphere ref={projectileRef} args={[0.25, 8, 8]} position={position}>
      <meshStandardMaterial
        color="yellow"
        emissive="orange"
        emissiveIntensity={2}
      />
      <pointLight color="orange" intensity={1} distance={5} decay={2} />
    </Sphere>
  );
};

export default Projectile;

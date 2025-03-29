import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import { Mesh, Vector3 } from "three";
import { useGameState } from "../utils/gameState";
import { debug } from "../utils/debug";

interface EnemyProjectileProps {
  id: string;
  position: [number, number, number];
  rotation: number;
  damage: number;
  onRemove: (id: string) => void;
}

const EnemyProjectile = ({
  id,
  position,
  rotation,
  damage,
  onRemove,
}: EnemyProjectileProps) => {
  const projectileRef = useRef<Mesh>(null);
  const hasCollidedRef = useRef(false);

  // Access only the takeDamage function
  const takeDamage = useGameState((state) => state.takeDamage);
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const terrainObstacles = useGameState((state) => state.terrainObstacles);

  // Get direct store access
  const getState = useRef(useGameState.getState).current;

  // Projectile movement and collision detection
  useFrame((state, delta) => {
    if (
      !projectileRef.current ||
      hasCollidedRef.current ||
      isPaused ||
      isGameOver
    )
      return;

    const speed = 12; // Slightly slower than player projectiles

    // Move projectile in the direction of rotation
    projectileRef.current.position.x += Math.sin(rotation) * delta * speed;
    projectileRef.current.position.z += Math.cos(rotation) * delta * speed;

    // Check map boundaries - Ground is 100x100 centered at origin
    const mapSize = 50; // Half of the total ground size (100/2)
    if (
      Math.abs(projectileRef.current.position.x) > mapSize ||
      Math.abs(projectileRef.current.position.z) > mapSize
    ) {
      debug.log(`Enemy projectile ${id} reached map boundary`);
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
        if (!hasCollidedRef.current) {
          hasCollidedRef.current = true;
          debug.log(
            `Enemy projectile hit terrain obstacle at distance ${distanceToObstacle.toFixed(
              2
            )}`
          );
          onRemove(id);
          break;
        }
      }
    }

    if (hasCollidedRef.current) return;

    // Get fresh player position data
    const playerTankPosition = getState().playerTankPosition;

    if (!playerTankPosition) return;

    // Check for collision with player
    const playerPos = new Vector3(...playerTankPosition);
    const distanceToPlayer = playerPos.distanceTo(projectilePos);

    // Player has a larger collision radius
    const collisionRadius = 1.8;

    if (distanceToPlayer < collisionRadius) {
      if (!hasCollidedRef.current) {
        hasCollidedRef.current = true;
        debug.log(
          `Enemy projectile ${id} hit player at distance ${distanceToPlayer.toFixed(
            2
          )}`
        );

        // Apply damage to the player
        takeDamage(damage);

        // Remove the projectile
        onRemove(id);

        debug.log(`Applied ${damage} damage to player`);
      }
    }
  });

  return (
    <Sphere ref={projectileRef} args={[0.2, 8, 8]} position={position}>
      <meshStandardMaterial color="red" emissive="red" emissiveIntensity={2} />
      <pointLight color="red" intensity={0.8} distance={3} decay={2} />
    </Sphere>
  );
};

export default EnemyProjectile;

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
}

const Projectile = ({
  id,
  position,
  rotation,
  damage,
  onRemove,
}: ProjectileProps) => {
  const projectileRef = useRef<Mesh>(null);
  const hasCollidedRef = useRef(false);

  // Access only the damageEnemy function
  const damageEnemy = useGameState((state) => state.damageEnemy);
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);

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

    const speed = 15;

    // Move projectile
    projectileRef.current.position.x += Math.sin(rotation) * delta * speed;
    projectileRef.current.position.z += Math.cos(rotation) * delta * speed;

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

    // Get fresh enemies data
    const enemies = getState().enemies;

    // Log available enemies for debugging
    if (enemies.length > 0 && Math.random() < 0.01) {
      debug.log(`Projectile ${id} tracking ${enemies.length} enemies`);
    }

    // Check for collisions with enemies
    for (const enemy of enemies) {
      const enemyPos = new Vector3(...enemy.position);
      const projectilePos = new Vector3(
        projectileRef.current.position.x,
        projectileRef.current.position.y,
        projectileRef.current.position.z
      );

      const distanceToEnemy = enemyPos.distanceTo(projectilePos);

      // Use a larger collision radius for tanks since they're bigger and moving
      const collisionRadius = enemy.type === "tank" ? 2.5 : 1.5;

      // If hit detection range is smaller than visual size, log it
      if (distanceToEnemy < collisionRadius) {
        if (!hasCollidedRef.current) {
          hasCollidedRef.current = true;
          debug.log(
            `Projectile hit enemy ${
              enemy.id
            } at distance ${distanceToEnemy.toFixed(2)}`
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

          // Remove the projectile
          onRemove(id);

          // Log enemy damage application
          debug.log(
            `Applied ${damage} damage to enemy ${
              enemy.id
            }, destroyed: ${!enemyStillExists}`
          );
          break;
        }
      } else {
        // Log near misses for debugging
        if (distanceToEnemy < 3 && Math.random() < 0.05) {
          debug.log(`Enemy ${enemy.id} not found after hit`);
        }
      }
    }
  });

  return (
    <Sphere ref={projectileRef} args={[0.2, 8, 8]} position={position}>
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

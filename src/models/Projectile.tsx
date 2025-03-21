import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import { Mesh, Vector3 } from "three";
import { useGameState } from "../utils/gameState";

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

  // Get direct store access
  const getState = useRef(useGameState.getState).current;

  // Projectile movement and collision detection
  useFrame((state, delta) => {
    if (!projectileRef.current || hasCollidedRef.current) return;

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
      console.log(`Projectile ${id} tracking ${enemies.length} enemies`);
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

      if (distanceToEnemy < 1.5) {
        // Collision detected - log the hit
        console.log(
          `Hit enemy ${enemy.id} (${enemy.type}) with damage ${damage}. Health before: ${enemy.health}`
        );

        // Damage the enemy and get the result
        const wasDestroyed = damageEnemy(enemy.id, damage);

        // Log the result of the hit
        if (wasDestroyed) {
          console.log(`Enemy ${enemy.id} was destroyed!`);
        } else {
          // Get updated health
          const updatedEnemy = getState().enemies.find(
            (e) => e.id === enemy.id
          );
          if (updatedEnemy) {
            console.log(
              `Enemy ${enemy.id} health after hit: ${updatedEnemy.health}`
            );
          } else {
            console.log(`Enemy ${enemy.id} not found after hit`);
          }
        }

        // Mark projectile as collided and remove it
        hasCollidedRef.current = true;
        onRemove(id);
        break;
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

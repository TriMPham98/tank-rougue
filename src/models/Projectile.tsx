import { useRef, useState } from "react";
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
  const [hasCollided, setHasCollided] = useState(false);

  // Get game state
  const { enemies, removeEnemy, increaseScore } = useGameState((state) => ({
    enemies: state.enemies,
    removeEnemy: state.removeEnemy,
    increaseScore: state.increaseScore,
  }));

  // Projectile movement and collision detection
  useFrame((state, delta) => {
    if (!projectileRef.current || hasCollided) return;

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
        // Collision detected
        // Update enemy health
        enemy.health -= damage;

        // If enemy health is depleted, remove it and increase score
        if (enemy.health <= 0) {
          removeEnemy(enemy.id);
          increaseScore(enemy.type === "tank" ? 100 : 150);
        }

        // Mark projectile as collided and remove it
        setHasCollided(true);
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

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

  // Get direct store access
  const getState = useRef(useGameState.getState).current;

  // Projectile movement and collision detection
  useFrame((state, delta) => {
    if (!projectileRef.current || hasCollidedRef.current) return;

    const speed = 12; // Slightly slower than player projectiles

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

    // Get fresh player position data
    const playerTankPosition = getState().playerTankPosition;

    if (!playerTankPosition) return;

    // Check for collision with player
    const playerPos = new Vector3(...playerTankPosition);
    const projectilePos = new Vector3(
      projectileRef.current.position.x,
      projectileRef.current.position.y,
      projectileRef.current.position.z
    );

    const distanceToPlayer = playerPos.distanceTo(projectilePos);

    // Player has a larger collision radius
    const collisionRadius = 2.0;

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
      <meshStandardMaterial
        color="red"
        emissive="orange"
        emissiveIntensity={2}
      />
      <pointLight color="orange" intensity={0.8} distance={3} decay={2} />
    </Sphere>
  );
};

export default EnemyProjectile;

import { useRef, useMemo } from "react";
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
  const initialPosRef = useRef(new Vector3(...position));

  // Access only the takeDamage function
  const takeDamage = useGameState((state) => state.takeDamage);
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const terrainObstacles = useGameState((state) => state.terrainObstacles);

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

  // Store movement direction to avoid recomputing each frame
  const movementDirection = useMemo(() => {
    return new Vector3(Math.sin(rotation), 0, Math.cos(rotation));
  }, [rotation]);

  // Constants
  const SPEED = 12;
  const MAP_SIZE = 50;
  const MAX_DISTANCE = 50;
  const PLAYER_COLLISION_RADIUS = 1.8;

  // Projectile movement and collision detection
  useFrame((state, delta) => {
    if (
      !projectileRef.current ||
      hasCollidedRef.current ||
      isPaused ||
      isGameOver
    )
      return;

    // Get current position as a Vector3 for easier calculations
    const currentPos = projectileRef.current.position;

    // Move projectile in the direction of rotation
    currentPos.addScaledVector(movementDirection, delta * SPEED);

    // Check map boundaries - Ground is 100x100 centered at origin
    if (
      Math.abs(currentPos.x) > MAP_SIZE ||
      Math.abs(currentPos.z) > MAP_SIZE
    ) {
      onRemove(id);
      return;
    }

    // Remove projectile if it's too far away
    const distance = currentPos.distanceTo(initialPosRef.current);
    if (distance > MAX_DISTANCE) {
      onRemove(id);
      return;
    }

    // Check for collisions with terrain obstacles using the cached data
    for (const obstacle of obstacleCollisionData) {
      const distanceToObstacle = obstacle.position.distanceTo(currentPos);

      if (distanceToObstacle < obstacle.radius) {
        if (!hasCollidedRef.current) {
          hasCollidedRef.current = true;
          onRemove(id);
          return;
        }
      }
    }

    // Get fresh player position data
    const playerTankPosition = getState().playerTankPosition;
    if (!playerTankPosition) return;

    // Check for collision with player
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
  });

  return (
    <Sphere ref={projectileRef} args={[0.2, 8, 8]} position={position}>
      <meshStandardMaterial color="red" emissive="red" emissiveIntensity={2} />
      <pointLight color="red" intensity={0.8} distance={3} decay={2} />
    </Sphere>
  );
};

export default EnemyProjectile;

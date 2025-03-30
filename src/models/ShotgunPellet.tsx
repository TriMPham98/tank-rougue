// src/components/ShotgunPellet.tsx
import React, { useRef, FC } from "react"; // Import FC for Functional Component type
import { useFrame, RootState } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import { Mesh, Vector3 } from "three";
// Adjust path as needed for gameState and types
import { useGameState } from "../utils/gameState";
import { debug } from "../utils/debug";

// Define the props interface
interface ShotgunPelletProps {
  id: string;
  position: [number, number, number];
  rotation: number; // Initial direction including spread
  damage: number;
  speed: number;
  range: number;
  ttl: number; // Time-to-live in seconds
  onRemove: (id: string) => void; // Type the callback function
}

const ShotgunPellet: FC<ShotgunPelletProps> = ({
  id,
  position,
  rotation,
  damage,
  speed,
  range,
  ttl,
  onRemove,
}) => {
  // Type the refs
  const pelletRef = useRef<Mesh>(null);
  const hasCollidedRef = useRef<boolean>(false);
  const initialPositionRef = useRef<Vector3>(new Vector3(...position));
  const startTimeRef = useRef<number>(performance.now());

  // Access state functions and data - Types are inferred from useGameState selectors
  const damageEnemy = useGameState((state) => state.damageEnemy);
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const terrainObstacles = useGameState((state) => state.terrainObstacles);
  const enemies = useGameState((state) => state.enemies);

  useFrame((state: RootState, delta: number) => {
    // Explicitly type state and delta
    // Use type guard for ref access
    const currentPellet = pelletRef.current;
    if (!currentPellet || hasCollidedRef.current || isPaused || isGameOver) {
      return;
    }

    // 1. Check Lifetime (TTL)
    const elapsedTime: number =
      (performance.now() - startTimeRef.current) / 1000;
    if (elapsedTime > ttl) {
      hasCollidedRef.current = true;
      onRemove(id);
      return;
    }

    // 2. Movement
    const moveDistance: number = speed * delta;
    currentPellet.position.x += Math.sin(rotation) * moveDistance;
    currentPellet.position.z += Math.cos(rotation) * moveDistance;
    const currentPosition: Vector3 = currentPellet.position;

    // 3. Check Range
    const distanceTraveled: number = currentPosition.distanceTo(
      initialPositionRef.current
    );
    if (distanceTraveled > range) {
      hasCollidedRef.current = true;
      onRemove(id);
      return;
    }

    // 4. Check Map Boundaries
    const mapSize: number = 50;
    if (
      Math.abs(currentPosition.x) > mapSize / 2 ||
      Math.abs(currentPosition.z) > mapSize / 2
    ) {
      hasCollidedRef.current = true;
      onRemove(id);
      return;
    }

    // 5. Check Collisions with Terrain
    for (const obstacle of terrainObstacles) {
      const obstaclePos = new Vector3(
        obstacle.position[0],
        obstacle.position[1],
        obstacle.position[2]
      );
      const obstacleRadius: number = obstacle.size * 0.75;
      const distanceToObstacle: number =
        currentPosition.distanceTo(obstaclePos);

      if (distanceToObstacle < obstacleRadius + 0.08) {
        // Collision with terrain
        hasCollidedRef.current = true;
        onRemove(id);
        return;
      }
    }

    // 6. Check Enemy Collisions
    for (const enemy of enemies) {
      const enemyPos = new Vector3(
        enemy.position[0],
        enemy.position[1],
        enemy.position[2]
      );
      const enemyRadius: number = enemy.type === "tank" ? 1.5 : 1.0; // Example radii
      const distanceToEnemy: number = currentPosition.distanceTo(enemyPos);

      if (distanceToEnemy < enemyRadius + 0.08) {
        // Hit enemy, apply damage
        damageEnemy(enemy.id, damage);
        hasCollidedRef.current = true;
        onRemove(id);
        return;
      }
    }
  });

  // Pellet visual representation
  // Type args explicitly for Sphere
  const sphereArgs: [
    radius?: number,
    widthSegments?: number,
    heightSegments?: number
  ] = [0.08, 6, 6];
  return (
    <Sphere ref={pelletRef} args={sphereArgs} position={position}>
      <meshStandardMaterial
        color="#FFD700"
        emissive="#FFA500"
        emissiveIntensity={1.5}
        metalness={0.4}
        roughness={0.6}
      />
    </Sphere>
  );
};

export default ShotgunPellet;

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere, Box } from "@react-three/drei";
import { Mesh, Vector3 } from "three";
import { useGameState } from "../utils/gameState";
import { debug } from "../utils/debug";

interface RocketProjectileProps {
  id: string;
  position: [number, number, number];
  rotation: number;
  damage: number;
  targetId: string | null; // The ID of the enemy to track
  onRemove: (id: string) => void;
}

const RocketProjectile = ({
  id,
  position,
  rotation,
  damage,
  targetId,
  onRemove,
}: RocketProjectileProps) => {
  const projectileRef = useRef<Mesh>(null);
  const hasExplodedRef = useRef(false);
  const initialPositionRef = useRef<[number, number, number]>([...position]);
  const distanceTraveledRef = useRef(0);
  const ageRef = useRef(0);

  // Arc parameters
  const maxHeight = 5; // Maximum height of the parabolic arc
  const heightRef = useRef(position[1]); // Current height, starts at initial position

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

  // Splash damage radius
  const splashRadius = 10;

  // Explode function for applying splash damage
  const explode = () => {
    if (hasExplodedRef.current || !projectileRef.current) return;

    hasExplodedRef.current = true;

    // Get explosion position
    const explosionPos = new Vector3(
      projectileRef.current.position.x,
      projectileRef.current.position.y,
      projectileRef.current.position.z
    );

    debug.log(
      `Rocket explosion at [${explosionPos.x.toFixed(
        2
      )}, ${explosionPos.y.toFixed(2)}, ${explosionPos.z.toFixed(
        2
      )}], radius: ${splashRadius}`
    );

    // Apply splash damage to all enemies within radius
    const enemies = getState().enemies;
    let hitCount = 0;

    for (const enemy of enemies) {
      const enemyPos = new Vector3(...enemy.position);
      const distanceToExplosion = enemyPos.distanceTo(explosionPos);

      if (distanceToExplosion <= splashRadius) {
        // Calculate damage falloff based on distance from explosion center
        const damageFactor = 1 - distanceToExplosion / splashRadius;
        const splashDamage = damage * damageFactor;

        debug.log(
          `Splash damage to enemy ${enemy.id}: ${splashDamage.toFixed(
            1
          )} at distance ${distanceToExplosion.toFixed(2)}`
        );

        // Apply damage to the enemy
        damageEnemy(enemy.id, splashDamage);
        hitCount++;
      }
    }

    debug.log(`Rocket explosion hit ${hitCount} enemies`);

    // Remove the projectile
    onRemove(id);
  };

  // Projectile movement with parabolic trajectory
  useFrame((state, delta) => {
    if (
      !projectileRef.current ||
      hasExplodedRef.current ||
      isPaused ||
      isGameOver
    )
      return;

    // Track age of projectile for arc calculation
    ageRef.current += delta;

    // Slower velocity for rocket
    const rocketVelocity = playerBulletVelocity * 0.8;

    // Basic forward movement
    projectileRef.current.position.x +=
      Math.sin(rotation) * delta * rocketVelocity;
    projectileRef.current.position.z +=
      Math.cos(rotation) * delta * rocketVelocity;

    // Get fresh enemy data for tracking
    const enemies = getState().enemies;
    const targetEnemy = targetId
      ? enemies.find((e) => e.id === targetId)
      : null;

    // Calculate progress toward target for parabolic arc
    let progress = 0;

    if (targetEnemy) {
      const currentPos = new Vector3(
        projectileRef.current.position.x,
        0, // Ignore y for distance calculation
        projectileRef.current.position.z
      );

      const targetPos = new Vector3(
        targetEnemy.position[0],
        0, // Ignore y for distance calculation
        targetEnemy.position[2]
      );

      const initialPos = new Vector3(
        initialPositionRef.current[0],
        0, // Ignore y for distance calculation
        initialPositionRef.current[2]
      );

      const totalDistance = initialPos.distanceTo(targetPos);
      const distanceToTarget = currentPos.distanceTo(targetPos);

      // Calculate progress (0 to 1) where 1 means reached target
      progress = 1 - distanceToTarget / totalDistance;

      // Parabolic height calculation (sin curve peaking at middle of journey)
      const heightFactor = Math.sin(progress * Math.PI);
      heightRef.current = position[1] + maxHeight * heightFactor;

      // Apply the calculated height
      projectileRef.current.position.y = heightRef.current;

      // Rotate rocket to point along trajectory
      if (progress > 0.5) {
        // After peak, start tilting downward
        const tiltFactor = (progress - 0.5) * 2; // 0 to 1
        projectileRef.current.rotation.x = (tiltFactor * Math.PI) / 2; // Tilt up to 90 degrees
      }
    } else {
      // If no target, use time-based parabola
      const flightTime = 3; // seconds for full arc
      progress = Math.min(ageRef.current / flightTime, 1);

      // Parabolic height calculation
      const heightFactor = Math.sin(progress * Math.PI);
      heightRef.current = position[1] + maxHeight * heightFactor;

      // Apply the calculated height
      projectileRef.current.position.y = heightRef.current;

      // Rotate rocket to point along trajectory
      if (progress > 0.5) {
        // After peak, start tilting downward
        const tiltFactor = (progress - 0.5) * 2; // 0 to 1
        projectileRef.current.rotation.x = (tiltFactor * Math.PI) / 2; // Tilt up to 90 degrees
      }
    }

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

    // Check map boundaries - Ground is 100x100 centered at origin
    const mapSize = 50; // Half of the total ground size (100/2)
    if (
      Math.abs(projectileRef.current.position.x) > mapSize ||
      Math.abs(projectileRef.current.position.z) > mapSize
    ) {
      debug.log(`Rocket ${id} reached map boundary`);
      explode();
      return;
    }

    // Remove projectile if it's gone too far
    if (distanceTraveledRef.current > 60) {
      debug.log(`Rocket ${id} reached max range`);
      explode();
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
        debug.log(`Rocket hit terrain obstacle`);
        explode();
        return;
      }
    }

    // Check for direct hit with enemies
    for (const enemy of enemies) {
      const enemyPos = new Vector3(...enemy.position);
      const distanceToEnemy = enemyPos.distanceTo(projectilePos);
      const collisionRadius = enemy.type === "tank" ? 1.8 : 1.0;

      if (distanceToEnemy < collisionRadius) {
        debug.log(`Direct rocket hit on enemy ${enemy.id}`);
        explode();
        return;
      }
    }

    // Explode when rocket hits ground (at end of arc)
    if (progress > 0.95) {
      debug.log(`Rocket ${id} reached target destination`);
      explode();
      return;
    }
  });

  return (
    <group ref={projectileRef} position={position} rotation={[0, rotation, 0]}>
      {/* Rocket body */}
      <Sphere args={[0.15, 8, 8]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#FF4400" />
      </Sphere>

      {/* Rocket body */}
      <Box args={[0.15, 0.15, 0.4]} position={[0, 0, -0.2]}>
        <meshStandardMaterial color="#AA3300" />
      </Box>

      {/* Fins */}
      <Box
        args={[0.05, 0.2, 0.1]}
        position={[0, 0.15, -0.35]}
        rotation={[0, 0, 0]}>
        <meshStandardMaterial color="#AA3300" />
      </Box>
      <Box
        args={[0.05, 0.2, 0.1]}
        position={[0, -0.15, -0.35]}
        rotation={[0, 0, 0]}>
        <meshStandardMaterial color="#AA3300" />
      </Box>
      <Box
        args={[0.2, 0.05, 0.1]}
        position={[0.15, 0, -0.35]}
        rotation={[0, 0, 0]}>
        <meshStandardMaterial color="#AA3300" />
      </Box>
      <Box
        args={[0.2, 0.05, 0.1]}
        position={[-0.15, 0, -0.35]}
        rotation={[0, 0, 0]}>
        <meshStandardMaterial color="#AA3300" />
      </Box>

      {/* Rocket flame effect */}
      <pointLight
        color="#FF6600"
        intensity={1}
        distance={2}
        decay={2}
        position={[0, 0, -0.5]}
      />
      <Sphere args={[0.1, 8, 8]} position={[0, 0, -0.5]}>
        <meshStandardMaterial
          color="#FFAA00"
          emissive="#FF6600"
          emissiveIntensity={2}
          transparent={true}
          opacity={0.7}
        />
      </Sphere>
    </group>
  );
};

export default RocketProjectile;

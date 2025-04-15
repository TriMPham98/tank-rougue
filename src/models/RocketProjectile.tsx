import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere, Box, Cylinder } from "@react-three/drei";
import { Mesh, Vector3, MeshStandardMaterial, Color, Group } from "three";
import { useGameState } from "../utils/gameState";
import { debug } from "../utils/debug";

// --- Explosion Effect Component ---

interface ExplosionEffectProps {
  position: Vector3;
  size?: number;
  duration?: number;
  color?: string;
  onComplete: () => void;
}

const ExplosionEffect = ({
  position,
  size = 5,
  duration = 0.4,
  color = "#FFA500",
  onComplete,
}: ExplosionEffectProps) => {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);
  const startTimeRef = useRef<number | null>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current || !materialRef.current) return;

    if (startTimeRef.current === null) {
      startTimeRef.current = clock.elapsedTime;
    }

    const elapsedTime = clock.elapsedTime - startTimeRef.current;
    const progress = Math.min(elapsedTime / duration, 1);

    const currentScale = progress * size;
    meshRef.current.scale.set(currentScale, currentScale, currentScale);
    materialRef.current.opacity = 1.0 - progress;
    materialRef.current.emissiveIntensity = (1.0 - progress) * 3;

    if (progress >= 1) {
      onComplete();
    }
  });

  useEffect(() => {
    return () => {};
  }, [onComplete]);

  return (
    <group position={position}>
      <Sphere ref={meshRef} args={[1, 16, 16]} scale={[0.01, 0.01, 0.01]}>
        <meshStandardMaterial
          ref={materialRef}
          color={color}
          emissive={new Color(color)}
          emissiveIntensity={3}
          transparent={true}
          opacity={1.0}
          depthWrite={false}
        />
      </Sphere>
      <pointLight color={color} intensity={2} distance={size * 1.5} decay={2} />
    </group>
  );
};

// --- Rocket Projectile Component ---

interface RocketProjectileProps {
  id: string;
  position: [number, number, number];
  rotation: number;
  damage: number;
  targetId: string | null;
  onRemove: (id: string) => void;
}

const GROUND_Y_LEVEL = 0.1;

const RocketProjectile = ({
  id,
  position,
  rotation,
  damage,
  targetId,
  onRemove,
}: RocketProjectileProps) => {
  const projectileGroupRef = useRef<Group>(null);
  const visualGroupRef = useRef<Group>(null);
  const hasExplodedRef = useRef(false);
  const initialPositionRef = useRef<Vector3>(new Vector3(...position));
  const distanceTraveledRef = useRef(0);
  const ageRef = useRef(0);
  // Store the target position at initialization
  const targetPositionRef = useRef<Vector3 | null>(null);

  const [isExploding, setIsExploding] = useState(false);
  const [explosionPosition, setExplosionPosition] = useState<Vector3 | null>(
    null
  );

  const maxHeight = 5;
  const splashRadius = 10;

  const damageEnemy = useGameState((state) => state.damageEnemy);
  const playerBulletVelocity = useGameState(
    (state) => state.playerBulletVelocity
  );
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const terrainObstacles = useGameState((state) => state.terrainObstacles);
  const getState = useRef(useGameState.getState).current;

  // Initialize target position if targetId is provided
  useEffect(() => {
    if (targetId) {
      const enemies = getState().enemies;
      const targetEnemy = enemies.find((e) => e.id === targetId);
      if (targetEnemy) {
        targetPositionRef.current = new Vector3(...targetEnemy.position);
        debug.log(
          `Rocket ${id} locked target position at [${targetPositionRef.current.x.toFixed(
            2
          )}, ${targetPositionRef.current.y.toFixed(
            2
          )}, ${targetPositionRef.current.z.toFixed(2)}]`
        );
      }
    }
  }, [targetId]); // Runs once on mount with targetId

  const explode = (explosionPos: Vector3) => {
    if (hasExplodedRef.current) return;
    hasExplodedRef.current = true;

    debug.log(
      `Rocket ${id} exploding at [${explosionPos.x.toFixed(
        2
      )}, ${explosionPos.y.toFixed(2)}, ${explosionPos.z.toFixed(2)}]`
    );

    setExplosionPosition(explosionPos.clone());
    setIsExploding(true);

    const enemies = getState().enemies;
    let hitCount = 0;
    for (const enemy of enemies) {
      const enemyPos = new Vector3(...enemy.position);
      const distanceToExplosion = enemyPos.distanceTo(explosionPos);

      if (distanceToExplosion <= splashRadius) {
        const damageFactor = Math.max(
          0,
          1 - distanceToExplosion / splashRadius
        );
        const splashDamage = damage * damageFactor;
        debug.log(
          `Splash damage to enemy ${enemy.id}: ${splashDamage.toFixed(
            1
          )} at distance ${distanceToExplosion.toFixed(2)}`
        );
        damageEnemy(enemy.id, splashDamage);
        hitCount++;
      }
    }
    debug.log(`Rocket ${id} explosion hit ${hitCount} enemies`);
  };

  useFrame((_, delta) => {
    // If exploding, the ExplosionEffect component handles its own logic/removal
    if (isExploding || !projectileGroupRef.current || isPaused || isGameOver) {
      return;
    }

    if (hasExplodedRef.current) {
      onRemove(id);
      return;
    }

    ageRef.current += delta;
    const rocketVelocity = playerBulletVelocity * 0.8;

    // Store previous position for trajectory calculations
    const prevPosition = projectileGroupRef.current.position.clone();

    // --- Basic Movement ---
    const moveDirection = new Vector3(
      Math.sin(rotation),
      0,
      Math.cos(rotation)
    );
    const moveDistance = delta * rocketVelocity;
    projectileGroupRef.current.position.addScaledVector(
      moveDirection,
      moveDistance
    );

    // --- Arc Calculation ---
    const currentPosXZ = new Vector3(
      projectileGroupRef.current.position.x,
      0,
      projectileGroupRef.current.position.z
    );
    const initialPosXZ = new Vector3(
      initialPositionRef.current.x,
      0,
      initialPositionRef.current.z
    );

    let progress = 0;
    if (targetPositionRef.current) {
      const targetPosXZ = new Vector3(
        targetPositionRef.current.x,
        0,
        targetPositionRef.current.z
      );
      const totalDistance = initialPosXZ.distanceTo(targetPosXZ);
      const distanceTraveledXZ = currentPosXZ.distanceTo(initialPosXZ);
      progress =
        totalDistance > 0.01
          ? Math.min(distanceTraveledXZ / totalDistance, 1.0)
          : 1.0;
    } else {
      const flightTime = 3;
      progress = Math.min(ageRef.current / flightTime, 1);
    }

    const heightFactor = Math.sin(progress * Math.PI);
    const calculatedY = initialPositionRef.current.y + maxHeight * heightFactor;
    // Apply height, but ensure it doesn't go below ground during flight
    projectileGroupRef.current.position.y = Math.max(
      GROUND_Y_LEVEL + 0.01,
      calculatedY
    );

    // --- Rotation Adjustment ---
    if (visualGroupRef.current) {
      // Check if the inner group ref is available
      const velocity = projectileGroupRef.current.position
        .clone()
        .sub(prevPosition);
      if (velocity.lengthSq() > 0.0001) {
        const horizontalVelocity = new Vector3(
          velocity.x,
          0,
          velocity.z
        ).length();
        const angle = Math.atan2(velocity.y, horizontalVelocity);
        visualGroupRef.current.rotation.x = -angle;
      }
    }
    // Keep Y rotation on the outer group aligned with initial firing direction
    projectileGroupRef.current.rotation.y = rotation;

    // --- Collision and Boundary Checks ---
    const currentPositionVec = projectileGroupRef.current.position;

    // 1. Ground Collision Check
    if (currentPositionVec.y <= GROUND_Y_LEVEL) {
      const explosionPos = currentPositionVec.clone();
      explosionPos.y = GROUND_Y_LEVEL + 0.1;
      explode(explosionPos);
      return;
    }

    // 2. Map Boundaries
    const mapSize = 50;
    if (
      Math.abs(currentPositionVec.x) > mapSize ||
      Math.abs(currentPositionVec.z) > mapSize
    ) {
      explode(currentPositionVec);
      return;
    }

    // 3. Max Range
    distanceTraveledRef.current = currentPositionVec.distanceTo(
      initialPositionRef.current
    );
    if (distanceTraveledRef.current > 60) {
      explode(currentPositionVec);
      return;
    }

    // 4. Terrain Obstacles
    for (const obstacle of terrainObstacles) {
      const obstaclePos = new Vector3(...obstacle.position);
      const distanceToObstacle = obstaclePos.distanceTo(currentPositionVec);
      const collisionRadius =
        obstacle.type === "rock" ? obstacle.size * 0.8 : obstacle.size * 0.5;

      if (distanceToObstacle < collisionRadius + 0.15) {
        explode(currentPositionVec);
        return;
      }
    }

    const enemies = getState().enemies;
    for (const enemy of enemies) {
      const enemyPos = new Vector3(...enemy.position);
      const distanceToEnemy = enemyPos.distanceTo(currentPositionVec);
      const collisionRadius = enemy.type === "tank" ? 1.8 : 1.0;

      if (distanceToEnemy < collisionRadius + 0.15) {
        explode(currentPositionVec);
        return;
      }
    }

    // Commit to target position
    if (targetPositionRef.current && progress >= 0.98) {
      debug.log(
        `Rocket ${id} reached target position (progress ${progress.toFixed(2)})`
      );
      const explosionPos = targetPositionRef.current.clone();
      explosionPos.y = Math.max(GROUND_Y_LEVEL + 0.1, currentPositionVec.y);
      explode(explosionPos);
      return;
    }
  });

  // --- Rendering ---
  if (isExploding && explosionPosition) {
    // Render the effect instead of the rocket
    return (
      <ExplosionEffect
        position={explosionPosition}
        size={splashRadius * 0.7}
        onComplete={() => onRemove(id)}
      />
    );
  }

  // Otherwise, render the rocket model
  // Use an outer group for position/yaw and an inner group for pitch
  return (
    <group
      ref={projectileGroupRef}
      position={position}
      rotation={[0, rotation, 0]}>
      <group ref={visualGroupRef} rotation={[0, 0, 0]}>
        {" "}
        {/* Inner group handles pitch */}
        {/* Rocket Nose Cone */}
        <Sphere args={[0.15, 8, 8]} position={[0, 0, 0.2]}>
          <meshStandardMaterial
            color="#FF4400"
            metalness={0.3}
            roughness={0.6}
          />
        </Sphere>
        {/* Rocket Body */}
        <Cylinder args={[0.15, 0.15, 0.4, 8]} position={[0, 0, 0]}>
          <meshStandardMaterial
            color="#AA3300"
            metalness={0.4}
            roughness={0.5}
          />
        </Cylinder>
        {/* Fins (Simplified) */}
        <Box
          args={[0.05, 0.3, 0.15]}
          position={[0.2, 0, -0.15]}
          rotation={[0, 0, Math.PI / 12]}>
          <meshStandardMaterial color="#AA3300" />
        </Box>
        <Box
          args={[0.05, 0.3, 0.15]}
          position={[-0.2, 0, -0.15]}
          rotation={[0, 0, -Math.PI / 12]}>
          <meshStandardMaterial color="#AA3300" />
        </Box>
        <Box
          args={[0.3, 0.05, 0.15]}
          position={[0, 0.2, -0.15]}
          rotation={[Math.PI / 12, 0, 0]}>
          <meshStandardMaterial color="#AA3300" />
        </Box>
        <Box
          args={[0.3, 0.05, 0.15]}
          position={[0, -0.2, -0.15]}
          rotation={[-Math.PI / 12, 0, 0]}>
          <meshStandardMaterial color="#AA3300" />
        </Box>
        {/* Rocket flame effect */}
        <pointLight
          color="#FF6600"
          intensity={1.5}
          distance={2}
          decay={2}
          position={[0, 0, -0.3]}
        />
        <Sphere args={[0.1, 8, 8]} position={[0, 0, -0.3]}>
          <meshStandardMaterial
            color="#FFAA00"
            emissive="#FF6600"
            emissiveIntensity={3}
            transparent={true}
            opacity={0.8}
          />
        </Sphere>
      </group>
    </group>
  );
};

export default RocketProjectile;

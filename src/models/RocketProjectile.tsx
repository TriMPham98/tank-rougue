import { useRef, useState, useEffect } from "react"; // Added useEffect
import { useFrame } from "@react-three/fiber";
import { Sphere, Box, Cylinder } from "@react-three/drei"; // Added Cylinder
import { Mesh, Vector3, MeshStandardMaterial, Color, Group } from "three"; // Added Group, MeshStandardMaterial, Color
import { useGameState } from "../utils/gameState";
import { debug } from "../utils/debug";

// --- Explosion Effect Component (Defined within the same file) ---

interface ExplosionEffectProps {
  position: Vector3;
  size?: number;
  duration?: number;
  color?: string;
  onComplete: () => void;
}

const ExplosionEffect = ({
  position,
  size = 5, // Corresponds roughly to splash radius / 2
  duration = 0.4, // Short duration
  color = "#FFA500", // Orange
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
    const progress = Math.min(elapsedTime / duration, 1); // 0 to 1

    // Expand
    const currentScale = progress * size;
    meshRef.current.scale.set(currentScale, currentScale, currentScale);

    // Fade out
    materialRef.current.opacity = 1.0 - progress;

    // Make emissive fade as well
    materialRef.current.emissiveIntensity = (1.0 - progress) * 3;

    // Clean up when done
    if (progress >= 1) {
      onComplete();
    }
  });

  // Ensure cleanup if component unmounts prematurely
  useEffect(() => {
    // console.log("ExplosionEffect mounted"); // Debug Mount
    return () => {
      // console.log("ExplosionEffect unmounting"); // Debug Unmount
      // Optional: If immediate cleanup is needed without waiting for animation
      // onComplete();
    };
  }, [onComplete]); // Dependency array includes onComplete

  return (
    <group position={position}>
      <Sphere ref={meshRef} args={[1, 16, 16]} scale={[0.01, 0.01, 0.01]}>
        {/* Start small */}
        <meshStandardMaterial
          ref={materialRef}
          color={color}
          emissive={new Color(color)} // Make it glow
          emissiveIntensity={3}
          transparent={true}
          opacity={1.0}
          depthWrite={false} // Often looks better for transparent effects
        />
      </Sphere>
      {/* Optional: Add a point light for effect */}
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

// Ground level - adjust if your ground isn't at Y=0
const GROUND_Y_LEVEL = 0.1;

const RocketProjectile = ({
  id,
  position,
  rotation,
  damage,
  targetId,
  onRemove,
}: RocketProjectileProps) => {
  const projectileGroupRef = useRef<Group>(null); // Ref the outer group for position/rotation
  const visualGroupRef = useRef<Group>(null); // Ref the inner group for pitch rotation
  const hasExplodedRef = useRef(false); // Tracks if explosion logic ran
  const initialPositionRef = useRef<Vector3>(new Vector3(...position));
  const distanceTraveledRef = useRef(0);
  const ageRef = useRef(0);

  // State for managing explosion visual
  const [isExploding, setIsExploding] = useState(false);
  const [explosionPosition, setExplosionPosition] = useState<Vector3 | null>(
    null
  );

  // Arc parameters
  const maxHeight = 5;

  // Access state functions
  const damageEnemy = useGameState((state) => state.damageEnemy);
  const playerBulletVelocity = useGameState(
    (state) => state.playerBulletVelocity
  );
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const terrainObstacles = useGameState((state) => state.terrainObstacles);

  const getState = useRef(useGameState.getState).current;

  const splashRadius = 10;

  const explode = (explosionPos: Vector3) => {
    // Prevent multiple explosion triggers
    if (hasExplodedRef.current) return;
    hasExplodedRef.current = true; // Mark as exploded IMMEDIATELY

    debug.log(
      `Rocket ${id} starting explosion at [${explosionPos.x.toFixed(
        2
      )}, ${explosionPos.y.toFixed(2)}, ${explosionPos.z.toFixed(
        2
      )}], radius: ${splashRadius}`
    );

    // Set state to render the explosion effect
    setExplosionPosition(explosionPos.clone()); // Store the exact position
    setIsExploding(true);

    // Apply splash damage (no visual delay needed for damage calculation)
    const enemies = getState().enemies;
    let hitCount = 0;
    for (const enemy of enemies) {
      const enemyPos = new Vector3(...enemy.position);
      const distanceToExplosion = enemyPos.distanceTo(explosionPos);

      if (distanceToExplosion <= splashRadius) {
        const damageFactor = Math.max(
          0,
          1 - distanceToExplosion / splashRadius
        ); // Ensure factor is not negative
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

    // Note: onRemove(id) is NOT called here anymore.
    // It will be called by ExplosionEffect's onComplete.
  };

  useFrame((state, delta) => {
    // If exploding, the ExplosionEffect component handles its own logic/removal
    if (isExploding || !projectileGroupRef.current || isPaused || isGameOver) {
      return;
    }

    // Check if already exploded (safety check)
    if (hasExplodedRef.current) {
      console.warn(
        `Rocket ${id} in useFrame despite hasExplodedRef being true.`
      );
      onRemove(id); // Force removal
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

    // --- Arc Calculation & Height Adjustment ---
    const enemies = getState().enemies;
    const targetEnemy = targetId
      ? enemies.find((e) => e.id === targetId)
      : null;

    let progress = 0;
    let targetPosXZ: Vector3 | null = null;

    if (targetEnemy) {
      targetPosXZ = new Vector3(
        targetEnemy.position[0],
        0,
        targetEnemy.position[2]
      );
    }

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

    if (targetPosXZ) {
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

    // --- Rotation Adjustment (Look along trajectory - Pitch only) ---
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
        visualGroupRef.current.rotation.x = -angle; // Apply pitch to the inner visual group
      }
    }
    // Keep Y rotation on the outer group aligned with initial firing direction
    projectileGroupRef.current.rotation.y = rotation;

    // --- Collision and Boundary Checks ---
    const currentPositionVec = projectileGroupRef.current.position;

    // 1. Ground Collision Check
    if (currentPositionVec.y <= GROUND_Y_LEVEL) {
      debug.log(
        `Rocket ${id} hit ground at Y=${currentPositionVec.y.toFixed(2)}`
      );
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
      debug.log(`Rocket ${id} reached map boundary`);
      explode(currentPositionVec);
      return;
    }

    // 3. Max Range
    distanceTraveledRef.current = currentPositionVec.distanceTo(
      initialPositionRef.current
    );
    if (distanceTraveledRef.current > 60) {
      debug.log(`Rocket ${id} reached max range`);
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
        // Added projectile radius
        debug.log(`Rocket ${id} hit terrain obstacle type ${obstacle.type}`);
        explode(currentPositionVec);
        return;
      }
    }

    // 5. Enemy Direct Hit
    for (const enemy of enemies) {
      const enemyPos = new Vector3(...enemy.position);
      const distanceToEnemy = enemyPos.distanceTo(currentPositionVec);
      const collisionRadius = enemy.type === "tank" ? 1.8 : 1.0;

      if (distanceToEnemy < collisionRadius + 0.15) {
        // Added projectile radius
        debug.log(`Direct rocket hit on enemy ${enemy.id}`);
        explode(currentPositionVec);
        return;
      }
    }

    // 6. Reached Target Destination Area (End of Arc)
    if (progress > 0.98) {
      debug.log(
        `Rocket ${id} reached target destination area (progress ${progress.toFixed(
          2
        )})`
      );
      explode(currentPositionVec);
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
        onComplete={() => onRemove(id)} // Pass the removal callback
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
          position={[0, 0, -0.3]} // Behind the body
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

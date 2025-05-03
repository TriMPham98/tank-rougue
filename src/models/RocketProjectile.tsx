// src/components/RocketProjectile.tsx
import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere, Box, Cylinder, Cone } from "@react-three/drei";
import {
  Mesh,
  Vector3,
  MeshStandardMaterial,
  Color,
  Group,
  AdditiveBlending,
  PointLight,
} from "three";
import { useGameState } from "../utils/gameState";
import { debug } from "../utils/debug";

// --- Improved Explosion Effect Component ---

interface ExplosionEffectProps {
  position: Vector3;
  size?: number;
  duration?: number;
  baseColor?: string;
  flashColor?: string;
  onComplete: () => void;
}

const ExplosionEffect = ({
  position,
  size = 5, // Base radius of the main explosion
  duration = 0.5, // Total duration
  baseColor = "#FFA500", // Orange/Yellow core
  flashColor = "#FFFFFF", // Initial white flash
  onComplete,
}: ExplosionEffectProps) => {
  const groupRef = useRef<Group>(null);
  const flashMeshRef = useRef<Mesh>(null);
  const flashMaterialRef = useRef<MeshStandardMaterial>(null);
  const coreMeshRef = useRef<Mesh>(null);
  const coreMaterialRef = useRef<MeshStandardMaterial>(null);
  const lightRef = useRef<PointLight>(null);
  const startTimeRef = useRef<number | null>(null);

  const flashDuration = duration * 0.3; // Flash lasts for the first 30%
  const coreDuration = duration * 0.9; // Core expands for 90%

  useFrame(({ clock }) => {
    if (
      !groupRef.current ||
      !flashMeshRef.current ||
      !flashMaterialRef.current ||
      !coreMeshRef.current ||
      !coreMaterialRef.current ||
      !lightRef.current
    )
      return;

    if (startTimeRef.current === null) {
      startTimeRef.current = clock.elapsedTime;
    }

    const elapsedTime = clock.elapsedTime - startTimeRef.current;
    const overallProgress = Math.min(elapsedTime / duration, 1);

    // Flash effect
    const flashProgress = Math.min(elapsedTime / flashDuration, 1);
    if (flashProgress < 1) {
      const flashScale = flashProgress * size * 0.8; // Flash is slightly smaller
      flashMeshRef.current.scale.set(flashScale, flashScale, flashScale);
      flashMaterialRef.current.opacity = (1.0 - flashProgress) * 0.8; // Rapid fade
      flashMaterialRef.current.emissiveIntensity = (1.0 - flashProgress) * 10;
      lightRef.current.intensity = (1.0 - flashProgress) * 5; // Intense initial light
      lightRef.current.distance = size * 2;
    } else {
      flashMeshRef.current.visible = false; // Hide flash after its duration
      lightRef.current.intensity = 0; // Turn off main flash light quickly
    }

    // Core explosion effect
    const coreProgress = Math.min(elapsedTime / coreDuration, 1);
    const currentScale = coreProgress * size;
    coreMeshRef.current.scale.set(currentScale, currentScale, currentScale);
    coreMaterialRef.current.opacity = (1.0 - coreProgress) * 0.9; // Slower fade than flash
    coreMaterialRef.current.emissiveIntensity = (1.0 - coreProgress) * 4;

    if (overallProgress >= 1) {
      onComplete();
    }
  });

  useEffect(() => {
    debug.log("ExplosionEffect mounted");
    return () => {
      debug.log("ExplosionEffect unmounted");
    };
  }, [onComplete]);

  return (
    <group ref={groupRef} position={position}>
      {/* Initial Flash Sphere */}
      <Sphere ref={flashMeshRef} args={[1, 16, 16]} scale={[0.01, 0.01, 0.01]}>
        <meshStandardMaterial
          ref={flashMaterialRef}
          color={flashColor}
          emissive={new Color(flashColor)}
          emissiveIntensity={10}
          transparent={true}
          opacity={0.8}
          depthWrite={false}
          blending={AdditiveBlending} // Make it glow brighter
        />
      </Sphere>
      {/* Core Explosion Sphere */}
      <Sphere ref={coreMeshRef} args={[1, 32, 32]} scale={[0.01, 0.01, 0.01]}>
        <meshStandardMaterial
          ref={coreMaterialRef}
          color={baseColor}
          emissive={new Color(baseColor)}
          emissiveIntensity={4}
          transparent={true}
          opacity={0.9}
          depthWrite={false}
          // blending={AdditiveBlending} // Optional: makes it glowier
        />
      </Sphere>
      {/* Point Light for illumination */}
      <pointLight
        ref={lightRef}
        color={flashColor} // Start with flash color
        intensity={5}
        distance={size * 2}
        decay={2}
      />
      {/* Fainter, longer lasting light from the core */}
      <pointLight
        color={baseColor}
        intensity={
          coreMaterialRef.current
            ? coreMaterialRef.current.emissiveIntensity * 0.5
            : 0
        } // Linked to core intensity
        distance={size * 1.5}
        decay={2.5}
      />
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
  const visualGroupRef = useRef<Group>(null); // Inner group for pitch and model details
  const flameRef = useRef<Mesh>(null); // Ref for the flame mesh
  const flameLightRef = useRef<PointLight>(null); // Ref for the flame light

  const hasExplodedRef = useRef(false);
  const initialPositionRef = useRef<Vector3>(new Vector3(...position));
  const distanceTraveledRef = useRef(0);
  const ageRef = useRef(0);
  const targetPositionRef = useRef<Vector3 | null>(null);

  const [isExploding, setIsExploding] = useState(false);
  const [explosionPosition, setExplosionPosition] = useState<Vector3 | null>(
    null
  );

  const maxHeight = 3; // Arc height
  const splashRadius = 5; // Reduced from 10 to 5 for smaller splash damage radius
  const visualExplosionSize = splashRadius * 0.8; // Control visual size separately

  const damageEnemy = useGameState((state) => state.damageEnemy);
  const playerBulletVelocity = useGameState(
    (state) => state.playerBulletVelocity
  );
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const terrainObstacles = useGameState((state) => state.terrainObstacles);
  const getState = useRef(useGameState.getState).current;

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
      } else {
        debug.warn(`Rocket ${id} could not find target enemy ID: ${targetId}`);
        targetPositionRef.current = null; // Target lost or destroyed
      }
    }
  }, [targetId]); // Re-evaluate if targetId changes (though unlikely in current setup)

  const explode = (explosionPos: Vector3) => {
    if (hasExplodedRef.current) return;
    hasExplodedRef.current = true;
    debug.log(
      `Rocket ${id} initiating explosion sequence at [${explosionPos.x.toFixed(
        2
      )}, ${explosionPos.y.toFixed(2)}, ${explosionPos.z.toFixed(2)}]`
    );

    setExplosionPosition(explosionPos.clone());
    setIsExploding(true); // Trigger rendering of ExplosionEffect

    // --- Damage Calculation (Functionality unchanged) ---
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
    debug.log(`Rocket ${id} explosion damaged ${hitCount} enemies.`);
    // --- End Damage Calculation ---
  };

  useFrame(({}, delta) => {
    // If exploding, the ExplosionEffect component handles its own logic/removal
    if (isExploding || isPaused || isGameOver) {
      if (isExploding && !projectileGroupRef.current) {
        // If exploding and the group is gone, likely already handled by onComplete
      }
      return;
    }

    // Check if the projectile group still exists before proceeding
    if (!projectileGroupRef.current || !visualGroupRef.current) {
      if (!hasExplodedRef.current) {
        // If not exploded and ref is gone, schedule removal safely
        debug.warn(`Rocket ${id} refs lost unexpectedly. Removing.`);
        onRemove(id);
      }
      return;
    }

    // Double-check if already exploded (safety)
    if (hasExplodedRef.current) {
      if (!isExploding) {
        // Should be exploding if flag is true
        debug.warn(
          `Rocket ${id} hasExplodedRef is true but isExploding is false. Forcing explosion state.`
        );
        setExplosionPosition(projectileGroupRef.current.position.clone());
        setIsExploding(true);
      }
      return; // Explosion effect handles removal via onComplete
    }

    ageRef.current += delta;
    const rocketVelocity = playerBulletVelocity * 0.8; // Speed remains the same

    const prevPosition = projectileGroupRef.current.position.clone();

    // --- Basic Movement (Functionality unchanged) ---
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

    // --- Arc Calculation (Functionality unchanged) ---
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
          : 1.0; // Prevent division by zero
    } else {
      // Fallback if no target (e.g., target destroyed, or fired without lock)
      const estimatedFlightTime = 4; // Estimate time to reach max range if no target
      progress = Math.min(ageRef.current / estimatedFlightTime, 1);
    }

    const heightFactor = Math.sin(progress * Math.PI); // Parabolic arc
    const calculatedY = initialPositionRef.current.y + maxHeight * heightFactor;
    projectileGroupRef.current.position.y = Math.max(
      GROUND_Y_LEVEL + 0.01,
      calculatedY // Allow hitting ground near end of arc
    );

    // --- Rotation Adjustment (Functionality unchanged) ---
    if (visualGroupRef.current) {
      const velocity = projectileGroupRef.current.position
        .clone()
        .sub(prevPosition);
      if (velocity.lengthSq() > 0.0001) {
        // Avoid calculating angle for tiny movements
        const horizontalVelocity = new Vector3(
          velocity.x,
          0,
          velocity.z
        ).length();
        // Calculate pitch based on vertical vs horizontal speed
        const angle = Math.atan2(velocity.y, horizontalVelocity);
        // Apply pitch to the inner visual group
        visualGroupRef.current.rotation.x = -angle;
      }
    }
    // Keep Y rotation (yaw) on the outer group aligned with initial firing direction
    projectileGroupRef.current.rotation.y = rotation;

    // --- Flame Flicker ---
    if (flameRef.current && flameLightRef.current) {
      const flicker = Math.random() * 0.2 + 0.9; // Random scale between 0.9 and 1.1
      flameRef.current.scale.set(flicker * 0.15, flicker * 0.15, flicker * 0.3); // Adjust base size if needed
      flameLightRef.current.intensity = (Math.random() * 0.5 + 1.5) * flicker; // Random intensity flicker
    }

    // --- Collision and Boundary Checks (Functionality unchanged) ---
    const currentPositionVec = projectileGroupRef.current.position;

    // 1. Ground Collision Check
    if (currentPositionVec.y <= GROUND_Y_LEVEL + 0.05) {
      // Slightly higher threshold
      const explosionPos = currentPositionVec.clone();
      explosionPos.y = GROUND_Y_LEVEL + 0.1; // Ensure explosion starts slightly above ground
      explode(explosionPos);
      return;
    }

    // 2. Map Boundaries
    const mapSize = 50;
    if (
      Math.abs(currentPositionVec.x) > mapSize ||
      Math.abs(currentPositionVec.z) > mapSize
    ) {
      debug.log(`Rocket ${id} hit map boundary.`);
      explode(currentPositionVec);
      return;
    }

    // 3. Max Range
    distanceTraveledRef.current = currentPositionVec.distanceTo(
      initialPositionRef.current
    );
    const maxRange = 60;
    if (distanceTraveledRef.current > maxRange) {
      debug.log(`Rocket ${id} exceeded max range.`);
      explode(currentPositionVec);
      return;
    }

    // 4. Terrain Obstacles
    for (const obstacle of terrainObstacles) {
      const obstaclePos = new Vector3(...obstacle.position);
      // Simple AABB check first for performance
      const size = obstacle.size || 1; // Default size if missing
      if (
        Math.abs(currentPositionVec.x - obstaclePos.x) < size &&
        Math.abs(currentPositionVec.z - obstaclePos.z) < size &&
        Math.abs(currentPositionVec.y - obstaclePos.y) < size * 1.5
      ) {
        // Check Y loosely
        // More accurate distance check if close
        const distanceToObstacle = obstaclePos.distanceTo(currentPositionVec);
        const collisionRadius =
          (obstacle.type === "rock" ? size * 0.8 : size * 0.5) + 0.15; // Add rocket radius

        if (distanceToObstacle < collisionRadius) {
          debug.log(`Rocket ${id} hit terrain obstacle.`);
          explode(currentPositionVec);
          return;
        }
      }
    }

    // 5. Enemy Collision (Direct Hit - triggers explosion)
    const enemies = getState().enemies;
    for (const enemy of enemies) {
      const enemyPos = new Vector3(...enemy.position);
      const collisionRadius = (enemy.type === "tank" ? 1.8 : 1.0) + 0.15; // Add rocket radius
      // Quick check on distance squared
      if (
        enemyPos.distanceToSquared(currentPositionVec) <
        collisionRadius * collisionRadius
      ) {
        debug.log(`Rocket ${id} directly hit enemy ${enemy.id}.`);
        // Explode slightly in front of the enemy center for visual effect
        const directionToEnemy = enemyPos
          .clone()
          .sub(currentPositionVec)
          .normalize();
        const explosionHitPos = currentPositionVec
          .clone()
          .addScaledVector(directionToEnemy, 0.1);
        explode(explosionHitPos);
        return;
      }
    }

    // 6. Proximity to Target (Commit to explosion near target)
    if (targetPositionRef.current && progress >= 0.98) {
      // Explode when very close to target destination
      debug.log(
        `Rocket ${id} reached target proximity (progress ${progress.toFixed(
          2
        )})`
      );
      // Use the stored target position for the explosion center
      const explosionPos = targetPositionRef.current.clone();
      // Ensure explosion happens at current height or slightly above ground, whichever is higher
      explosionPos.y = Math.max(GROUND_Y_LEVEL + 0.1, currentPositionVec.y);
      explode(explosionPos);
      return;
    }
  });

  // --- Conditional Rendering ---
  if (isExploding && explosionPosition) {
    // Render the improved explosion effect
    return (
      <ExplosionEffect
        position={explosionPosition}
        size={visualExplosionSize} // Use the visual size
        duration={0.6} // Slightly longer duration for visual appeal
        onComplete={() => {
          debug.log(
            `ExplosionEffect onComplete called for rocket ${id}. Removing projectile.`
          );
          onRemove(id); // Remove the projectile *after* the explosion effect finishes
        }}
      />
    );
  }

  // Render the improved rocket model
  return (
    <group
      ref={projectileGroupRef}
      position={position}
      rotation={[0, rotation, 0]} // Yaw handled by the outer group
      visible={!hasExplodedRef.current} // Hide the model immediately on explosion trigger
    >
      <group ref={visualGroupRef} rotation={[0, 0, 0]}>
        {" "}
        {/* Inner group handles pitch */}
        {/* Rocket Nose Cone */}
        <Cone
          args={[0.15, 0.3, 8]}
          position={[0, 0, 0.25]}
          rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial
            color="#E05A27" // Brighter orange-red
            metalness={0.4}
            roughness={0.5}
          />
        </Cone>
        {/* Rocket Body */}
        <Cylinder
          args={[0.15, 0.15, 0.6, 12]}
          position={[0, 0, -0.1]}
          rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial
            color="#A0401A" // Darker body
            metalness={0.5}
            roughness={0.4}
          />
        </Cylinder>
        {/* Rocket Nozzle */}
        <Cylinder
          args={[0.12, 0.14, 0.1, 12]}
          position={[0, 0, -0.45]}
          rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial
            color="#444444" // Dark metallic nozzle
            metalness={0.8}
            roughness={0.3}
          />
        </Cylinder>
        {/* Fins (Thinner, more detailed) */}
        <Box // Fin 1 (Top)
          args={[0.03, 0.25, 0.2]} // Thinner fin
          position={[0, 0.16, -0.25]}
          rotation={[0, 0, 0]} // Align with body
        >
          <meshStandardMaterial color="#903815" roughness={0.6} />
        </Box>
        <Box // Fin 2 (Bottom)
          args={[0.03, 0.25, 0.2]}
          position={[0, -0.16, -0.25]}
          rotation={[0, 0, 0]}>
          <meshStandardMaterial color="#903815" roughness={0.6} />
        </Box>
        <Box // Fin 3 (Right)
          args={[0.25, 0.03, 0.2]}
          position={[0.16, 0, -0.25]}
          rotation={[0, 0, 0]}>
          <meshStandardMaterial color="#903815" roughness={0.6} />
        </Box>
        <Box // Fin 4 (Left)
          args={[0.25, 0.03, 0.2]}
          position={[-0.16, 0, -0.25]}
          rotation={[0, 0, 0]}>
          <meshStandardMaterial color="#903815" roughness={0.6} />
        </Box>
        {/* Rocket flame effect - Slightly elongated sphere */}
        <Sphere
          ref={flameRef}
          args={[1, 12, 8]}
          position={[0, 0, -0.6]}
          scale={[0.15, 0.15, 0.3]}>
          <meshStandardMaterial
            color="#FFAA00"
            emissive="#FF6600"
            emissiveIntensity={4} // Brighter emissive
            transparent={true}
            opacity={0.85}
            depthWrite={false}
            blending={AdditiveBlending} // Makes the flame glow
          />
        </Sphere>
        {/* Point light for the flame */}
        <pointLight
          ref={flameLightRef}
          color="#FF8800" // Orange light
          intensity={2.0}
          distance={3}
          decay={2}
          position={[0, 0, -0.5]} // Position slightly ahead of the visual flame
        />
      </group>
    </group>
  );
};

export default RocketProjectile;

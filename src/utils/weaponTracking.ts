import { useRef, useMemo, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3, Line3, Sphere } from "three";
import { useGameState, SecondaryWeapon, Enemy, TerrainObstacle } from "./gameState";
import { debug } from "./debug";
import { useSound, SoundId } from "./sound"; // Assuming SoundId is exported

// --- Constants ---
const DEFAULT_COOLDOWN = 5;
const DEFAULT_RANGE = 40;
const DEFAULT_DAMAGE = 30;
const DEFAULT_BARREL_LENGTH = 1.5;
const DEFAULT_FIRE_OFFSET_Y = 0;
const PLAYER_COLLISION_RADIUS = 1.25; // Based on tank model size
const ROCK_COLLISION_RADIUS_MULTIPLIER = 0.75; // Multiplier for rock size
const DAMAGE_MODIFIER_DIVISOR = 10; // For playerTurretDamage calculation

// Type for weapon sound configuration
type WeaponSoundConfig = {
  [key: string]: { soundId: SoundId; volume: number };
};

const WEAPON_SOUND_CONFIG: WeaponSoundConfig = {
  shotgun: { soundId: "shotgun", volume: 0.1 },
  sniper: { soundId: "sniper", volume: 0.25 },
  rocket: { soundId: "rocket", volume: 0.35 },
  laser: { soundId: "laser", volume: 0.075 },
  // Add other weapon types here
};

// Common interface for weapon tracking props
export interface WeaponTrackingProps {
  weaponInstance: SecondaryWeapon;
  position: [number, number, number]; // Base position offset relative to parent
  rotation: number; // Base rotation relative to parent
  weaponRef: React.RefObject<Group>; // Ref to the weapon's 3D model Group
  onFire?: (
    firePosition: [number, number, number],
    targetId: string,
    damage: number
  ) => void;
  barrelLength?: number;
  fireOffsetY?: number;
}

// --- Helper Vectors (to avoid recreating in loops) ---
const vec3_shotStart = new Vector3();
const vec3_shotEnd = new Vector3();
const vec3_shotDirection = new Vector3();
const vec3_entityPosition = new Vector3();
const vec3_closestPoint = new Vector3();
const vec3_entityToStart = new Vector3();
const line3_shotPath = new Line3();
const sphere_collisionCheck = new Sphere();

/**
 * Custom hook to manage the targeting, aiming, and firing logic of a secondary weapon.
 * Handles target acquisition, collision checks (player and terrain), cooldowns, and firing events.
 *
 * @param weaponInstance - The configuration object for this specific weapon.
 * @param position - The base [x, y, z] position offset for the weapon model.
 * @param rotation - The base Y-axis rotation for the weapon model.
 * @param weaponRef - A React ref pointing to the THREE.Group representing the weapon model.
 * @param onFire - Callback function triggered when the weapon fires.
 * @param barrelLength - The distance from the weapon's origin to the muzzle.
 * @param fireOffsetY - The vertical offset from the weapon's origin for the firing point.
 */
export const useWeaponTracking = ({
  weaponInstance,
  position,
  rotation,
  weaponRef,
  onFire,
  barrelLength = DEFAULT_BARREL_LENGTH,
  fireOffsetY = DEFAULT_FIRE_OFFSET_Y,
}: WeaponTrackingProps) => {
  const lastShootTimeRef = useRef(0);
  const targetEnemyIdRef = useRef<string | null>(null);
  const sound = useSound();

  // Get necessary state from Zustand store
  const {
    playerTurretDamage,
    isPaused,
    isGameOver,
    enemies,
    playerTankPosition,
    terrainObstacles,
  } = useGameState((state) => ({
    playerTurretDamage: state.playerTurretDamage,
    isPaused: state.isPaused,
    isGameOver: state.isGameOver,
    enemies: state.enemies,
    playerTankPosition: state.playerTankPosition,
    terrainObstacles: state.terrainObstacles,
  }));

  // Memoize weapon properties to avoid recalculation unless weaponInstance changes
  const { cooldown, weaponRange, baseDamage, instanceId, weaponId, weaponRangeSq } =
    useMemo(() => {
      const id = weaponInstance.id || "unknown_weapon"; // e.g., "shotgun", "sniper"
      const instId = weaponInstance.instanceId || `default_${id}`; // Unique instance ID
      return {
        cooldown: weaponInstance.cooldown ?? DEFAULT_COOLDOWN,
        weaponRange: weaponInstance.range ?? DEFAULT_RANGE,
        weaponRangeSq: (weaponInstance.range ?? DEFAULT_RANGE) ** 2, // Pre-calculate squared range
        baseDamage: weaponInstance.damage ?? DEFAULT_DAMAGE,
        instanceId: instId,
        weaponId: id,
      };
    }, [weaponInstance]);

  /**
   * Checks if a line segment (shot path) intersects with a sphere (entity).
   * Uses pre-allocated vectors/shapes for performance.
   */
  const checkLineSegmentSphereCollision = useCallback(
    (
      start: Vector3,
      end: Vector3,
      sphereCenter: Vector3,
      sphereRadius: number
    ): boolean => {
      line3_shotPath.set(start, end);
      sphere_collisionCheck.set(sphereCenter, sphereRadius);
      return line3_shotPath.intersectsSphere(sphere_collisionCheck);

      /* // Alternative manual calculation (more verbose, but potentially clearer steps):
      // This calculates the closest point on the *infinite line* to the sphere center,
      // then checks if that point is *within the segment* and *within the radius*.
      vec3_shotDirection.copy(end).sub(start).normalize();
      vec3_entityToStart.copy(sphereCenter).sub(start);
      const projectionLength = vec3_entityToStart.dot(vec3_shotDirection);
      const shotLength = start.distanceTo(end);

      // Clamp projectionLength to be within the segment bounds [0, shotLength]
      const clampedProjectionLength = Math.max(0, Math.min(projectionLength, shotLength));

      vec3_closestPoint.copy(start).addScaledVector(vec3_shotDirection, clampedProjectionLength);

      const distanceSq = vec3_closestPoint.distanceToSquared(sphereCenter);
      return distanceSq < sphereRadius * sphereRadius;
      */
    },
    [] // No dependencies, uses external vectors/shapes
  );

  /** Checks if the shot path collides with the player tank. */
  const wouldCollideWithPlayer = useCallback(
    (firePosVec: Vector3, targetPosVec: Vector3): boolean => {
      if (!playerTankPosition) return false;
      vec3_entityPosition.fromArray(playerTankPosition);
      return checkLineSegmentSphereCollision(
        firePosVec,
        targetPosVec,
        vec3_entityPosition,
        PLAYER_COLLISION_RADIUS
      );
    },
    [playerTankPosition, checkLineSegmentSphereCollision]
  );

  /** Checks if the shot path collides with any solid terrain obstacles. */
  const wouldCollideWithTerrain = useCallback(
    (firePosVec: Vector3, targetPosVec: Vector3): boolean => {
      for (const obstacle of terrainObstacles) {
        // Skip non-solid obstacles or obstacles without size/position
        if (obstacle.type !== "rock" || !obstacle.size || !obstacle.position) continue;

        vec3_entityPosition.fromArray(obstacle.position);
        const obstacleRadius = obstacle.size * ROCK_COLLISION_RADIUS_MULTIPLIER;

        if (
          checkLineSegmentSphereCollision(
            firePosVec,
            targetPosVec,
            vec3_entityPosition,
            obstacleRadius
          )
        ) {
          return true; // Collision detected
        }
      }
      return false; // No collision with terrain
    },
    [terrainObstacles, checkLineSegmentSphereCollision]
  );

  /** Calculates the world position from where the weapon should fire. */
  const calculateFirePosition = useCallback(
    (aimedRotationY: number): Vector3 => {
      if (!weaponRef.current) return vec3_shotStart.set(0, 0, 0); // Should ideally not happen

      const weaponWorldPosition = weaponRef.current.getWorldPosition(vec3_shotStart); // Use world position

      // Calculate offset based on aim rotation *relative to the weapon's current orientation*
      // Assuming the weapon model points along +Z axis in its local space before rotation
      vec3_shotDirection
        .set(
          Math.sin(aimedRotationY) * barrelLength,
          fireOffsetY,
          Math.cos(aimedRotationY) * barrelLength
        )
        // We need to apply the weapon's base rotation (passed via props) as well,
        // or alternatively, ensure the passed 'rotation' prop is the world rotation.
        // Let's assume the 'rotation' prop is the base offset, and aimedRotationY is the final world aim.
        // A simpler way is to apply the offset in local space and transform to world space.

        // Simpler: Get world position, calculate offset based on *world* aim direction
        vec3_shotStart.set(
            weaponWorldPosition.x + Math.sin(aimedRotationY) * barrelLength,
            weaponWorldPosition.y + fireOffsetY,
            weaponWorldPosition.z + Math.cos(aimedRotationY) * barrelLength,
        );


      return vec3_shotStart; // Reusing the vector
    },
    [weaponRef, barrelLength, fireOffsetY] // rotation prop is not needed if we use world position/rotation
  );

  /** Finds the nearest valid enemy target within range. */
  const findNearestEnemy = useCallback((): string | null => {
    if (!enemies.length || !weaponRef.current) return null;

    const weaponWorldPos = weaponRef.current.getWorldPosition(vec3_entityPosition); // Use temporary vec
    let nearestEnemyId: string | null = null;
    let minDistanceSq: number = weaponRangeSq; // Start with max range squared

    for (const enemy of enemies) {
      vec3_shotEnd.fromArray(enemy.position); // Target position
      const distanceSq = weaponWorldPos.distanceToSquared(vec3_shotEnd);

      if (distanceSq < minDistanceSq) {
        // Potential target is within range, now check line of sight

        // Calculate the fire position *if* we were to aim at this enemy
        const angleToEnemy = Math.atan2(
          vec3_shotEnd.x - weaponWorldPos.x,
          vec3_shotEnd.z - weaponWorldPos.z
        );
        const potentialFirePos = calculateFirePosition(angleToEnemy); // Returns a reused vector

        // Check for collisions (use the calculated potential fire position)
        // Pass vectors directly to avoid array spread overhead
        if (
          !wouldCollideWithPlayer(potentialFirePos, vec3_shotEnd) &&
          !wouldCollideWithTerrain(potentialFirePos, vec3_shotEnd)
        ) {
          // This target is valid and closer than the previous best
          minDistanceSq = distanceSq;
          nearestEnemyId = enemy.id;
        }
      }
    }

    return nearestEnemyId;
  }, [
    enemies,
    weaponRef,
    weaponRangeSq,
    calculateFirePosition,
    wouldCollideWithPlayer,
    wouldCollideWithTerrain,
  ]);

  /** Calculates the Y-axis rotation needed to aim at the target enemy. */
  const calculateAngleToEnemy = useCallback((enemyId: string): number => {
    const enemy = enemies.find((e) => e.id === enemyId);
    const currentWeapon = weaponRef.current;

    if (!enemy || !currentWeapon) {
      // Return current rotation or base rotation if enemy/weapon not found
      return currentWeapon?.rotation.y ?? rotation;
    }

    const weaponWorldPos = currentWeapon.getWorldPosition(vec3_entityPosition); // Use temporary vec
    const dx = enemy.position[0] - weaponWorldPos.x;
    const dz = enemy.position[2] - weaponWorldPos.z;
    return Math.atan2(dx, dz); // Calculate angle in XZ plane
  }, [enemies, weaponRef, rotation]);


  // Main tracking and firing logic loop
  useFrame((state, delta) => {
    const currentWeapon = weaponRef.current;
    // Exit early if paused, game over, or weapon isn't mounted yet
    if (!currentWeapon || isPaused || isGameOver) return;

    // --- Positioning ---
    // Apply base position offset relative to parent
    currentWeapon.position.fromArray(position);
    // Apply base rotation offset relative to parent (will be overridden by aiming if target found)
    currentWeapon.rotation.y = rotation;

    // --- Targeting ---
    // Check if current target is still valid (exists and maybe within range - range check is implicit in findNearestEnemy)
    const currentTarget = targetEnemyIdRef.current
      ? enemies.find((e) => e.id === targetEnemyIdRef.current)
      : null;

    if (!currentTarget) {
      // No target or current target is gone, find a new one
      targetEnemyIdRef.current = findNearestEnemy();
    }
    // Optional: Add logic here to re-evaluate target periodically even if current one is valid,
    // e.g., if a closer enemy appears. For now, it keeps the target until it's gone.

    // --- Aiming & Firing ---
    if (targetEnemyIdRef.current) {
      // Re-fetch target data in case it moved (find() returns a snapshot)
      const targetEnemy = enemies.find(e => e.id === targetEnemyIdRef.current);
      if (!targetEnemy) {
         // Target disappeared between checks
         targetEnemyIdRef.current = null;
         return;
      }

      // Aim the weapon model
      const angleToEnemy = calculateAngleToEnemy(targetEnemyIdRef.current);
      currentWeapon.rotation.y = angleToEnemy; // Set world rotation for aiming

      // Firing logic
      const currentTime = state.clock.getElapsedTime();
      if (currentTime - lastShootTimeRef.current >= cooldown) {
        // Cooldown finished, prepare to fire

        const firePosVec = calculateFirePosition(angleToEnemy); // Returns reused vec3_shotStart
        vec3_shotEnd.fromArray(targetEnemy.position); // Target position

        // Final line-of-sight check before firing
        if (
          !wouldCollideWithPlayer(firePosVec, vec3_shotEnd) &&
          !wouldCollideWithTerrain(firePosVec, vec3_shotEnd)
        ) {
          // Clear to fire!
          lastShootTimeRef.current = currentTime;

          // Calculate damage
          const finalDamage = baseDamage * (1 + playerTurretDamage / DAMAGE_MODIFIER_DIVISOR);

          // Trigger the onFire callback (convert fire position vector back to array)
          onFire?.(
            firePosVec.toArray() as [number, number, number],
            targetEnemyIdRef.current,
            finalDamage
          );

          // Play sound
          const soundInfo = WEAPON_SOUND_CONFIG[weaponId];
          if (soundInfo) {
            sound.setVolume(soundInfo.soundId, soundInfo.volume);
            sound.play(soundInfo.soundId);
          } else {
            // Optional: Play a default sound or log warning for unconfigured weapons
            // console.warn(`No sound configured for weapon ID: ${weaponId}`);
          }

          debug.log(
            `Weapon ${instanceId} fired at enemy ${
              targetEnemyIdRef.current
            } (Damage: ${finalDamage.toFixed(1)})`
          );

        } else {
          // Path became blocked between target acquisition and firing.
          // Lose the target and try to find a new one next frame.
          targetEnemyIdRef.current = null;
          debug.log(`Weapon ${instanceId} fire blocked for target ${targetEnemy.id}`);
        }
      }
    }
    // If no target, weapon rotation remains at the base 'rotation' value set earlier.
  });

  // Return value: Consider if the calling component *needs* any of this.
  // If the hook is purely behavioral, it might not need to return anything.
  // Returning refs might be useful for debugging but couples the component to the hook's internals.
  // For now, returning a minimal set or nothing might be cleaner. Let's return nothing.
  // return { targetEnemyIdRef }; // Example: Only return if needed for UI/debug
  return {}; // Or return nothing if the hook is self-contained
};

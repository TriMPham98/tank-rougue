import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import { useGameState, SecondaryWeapon, Enemy } from "./gameState";
import { debug } from "./debug";
import { useSound } from "./sound";

// Common interface for weapon tracking props
export interface WeaponTrackingProps {
  weaponInstance: SecondaryWeapon;
  position: [number, number, number];
  rotation: number;
  weaponRef: React.RefObject<Group>;
  onFire?: (
    firePosition: [number, number, number],
    targetId: string,
    damage: number
  ) => void;
  barrelLength?: number;
  fireOffsetY?: number;
}

// Hook for shared weapon tracking logic
export const useWeaponTracking = ({
  weaponInstance,
  position,
  rotation,
  weaponRef,
  onFire,
  barrelLength = 1.5,
  fireOffsetY = 0,
}: WeaponTrackingProps) => {
  const lastShootTimeRef = useRef(0);
  const targetEnemyRef = useRef<string | null>(null);
  const sound = useSound();

  const playerTurretDamage = useGameState((state) => state.playerTurretDamage);
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const enemies = useGameState((state) => state.enemies);
  const playerTankPosition = useGameState((state) => state.playerTankPosition);
  const terrainObstacles = useGameState((state) => state.terrainObstacles);

  const cooldown = weaponInstance.cooldown || 5;
  const weaponRange = weaponInstance.range || 40;
  const baseDamage = weaponInstance.damage || 30;
  const instanceId = weaponInstance.instanceId || "default_weapon";

  // Check if a shot would collide with the player tank
  const wouldCollideWithPlayer = (
    firePosition: [number, number, number],
    targetPosition: [number, number, number]
  ): boolean => {
    if (!playerTankPosition) return false;

    // Create vectors for the shot path
    const shotStart = new Vector3(...firePosition);
    const shotEnd = new Vector3(...targetPosition);
    const playerPos = new Vector3(...playerTankPosition);

    // Calculate the closest point on the shot line to the player
    const shotDirection = shotEnd.clone().sub(shotStart).normalize();
    const playerToShotStart = playerPos.clone().sub(shotStart);
    const projection = playerToShotStart.dot(shotDirection);
    const closestPoint = shotStart
      .clone()
      .add(shotDirection.multiplyScalar(projection));

    // Calculate the distance from the player to the closest point on the shot line
    const distanceToShot = playerPos.distanceTo(closestPoint);

    // Player tank collision radius (based on the tank model size)
    const playerCollisionRadius = 1.25;

    // Check if the closest point is within the shot's path and within collision range
    const shotLength = shotStart.distanceTo(shotEnd);
    const isWithinShotPath = projection >= 0 && projection <= shotLength;

    return isWithinShotPath && distanceToShot < playerCollisionRadius;
  };

  // Check if a shot would collide with terrain obstacles
  const wouldCollideWithTerrain = (
    firePosition: [number, number, number],
    targetPosition: [number, number, number]
  ): boolean => {
    const shotStart = new Vector3(...firePosition);
    const shotEnd = new Vector3(...targetPosition);
    const shotDirection = shotEnd.clone().sub(shotStart).normalize();
    const shotLength = shotStart.distanceTo(shotEnd);

    for (const obstacle of terrainObstacles) {
      // Skip non-solid obstacles
      if (obstacle.type !== "rock") continue;

      const obstaclePos = new Vector3(...obstacle.position);
      const obstacleRadius = obstacle.size * 0.75; // Rock collision radius

      // Calculate closest point on shot line to obstacle center
      const obstacleToStart = obstaclePos.clone().sub(shotStart);
      const projection = obstacleToStart.dot(shotDirection);
      const closestPoint = shotStart
        .clone()
        .add(shotDirection.multiplyScalar(projection));

      // Reset shotDirection for next iteration since we modified it
      shotDirection.copy(shotEnd.clone().sub(shotStart).normalize());

      // Check if closest point is within the shot path
      const isWithinShotPath = projection >= 0 && projection <= shotLength;

      // Calculate distance from obstacle center to closest point on shot line
      const distanceToShot = obstaclePos.distanceTo(closestPoint);

      // If the shot passes close enough to the obstacle and is within the path, it's a collision
      if (isWithinShotPath && distanceToShot < obstacleRadius) {
        return true;
      }
    }
    return false;
  };

  // Find nearest enemy within range that won't cause self-damage or hit terrain
  const findNearestEnemy = (): string | null => {
    if (!enemies.length || !weaponRef.current) return null;
    const weaponPos = weaponRef.current.position;
    let nearestEnemy: string | null = null;
    let minDistance: number = Infinity;

    // Use regular for...of loop instead of forEach for proper control flow
    for (const enemy of enemies) {
      const enemyPos = new Vector3(...enemy.position);
      const distance: number = weaponPos.distanceTo(enemyPos);

      if (distance < weaponRange) {
        // Calculate fire position for this potential target
        const angleToEnemy = Math.atan2(
          enemyPos.x - weaponPos.x,
          enemyPos.z - weaponPos.z
        );
        const firePosition = calculateFirePosition(angleToEnemy);

        // Skip this enemy if the shot would hit the player or terrain
        if (
          wouldCollideWithPlayer(firePosition, enemy.position) ||
          wouldCollideWithTerrain(firePosition, enemy.position)
        ) {
          continue; // Skip to next enemy
        }

        if (distance < minDistance) {
          minDistance = distance;
          nearestEnemy = enemy.id;
        }
      }
    }

    return nearestEnemy;
  };

  // Calculate angle to enemy
  const calculateAngleToEnemy = (enemyId: string): number => {
    const enemy: Enemy | undefined = enemies.find((e) => e.id === enemyId);
    if (!enemy || !weaponRef.current) return weaponRef.current?.rotation.y ?? 0;

    const currentWeaponPos = weaponRef.current.position;
    const dx: number = enemy.position[0] - currentWeaponPos.x;
    const dz: number = enemy.position[2] - currentWeaponPos.z;
    return Math.atan2(dx, dz);
  };

  // Calculate fire position based on weapon orientation
  const calculateFirePosition = (
    aimedRotation: number
  ): [number, number, number] => {
    if (!weaponRef.current) return [0, 0, 0];

    const fireOrigin = weaponRef.current.position;
    return [
      fireOrigin.x + Math.sin(aimedRotation) * barrelLength,
      fireOrigin.y + fireOffsetY,
      fireOrigin.z + Math.cos(aimedRotation) * barrelLength,
    ];
  };

  // Main tracking and firing logic
  useFrame((state, delta) => {
    const currentWeapon = weaponRef.current;
    if (!currentWeapon || isPaused || isGameOver) return;

    // Apply position and base rotation from props
    currentWeapon.position.fromArray(position);
    currentWeapon.rotation.y = rotation; // Set base rotation

    // Targeting logic
    if (
      !targetEnemyRef.current ||
      !enemies.some((e) => e.id === targetEnemyRef.current)
    ) {
      targetEnemyRef.current = findNearestEnemy();
    }

    // Aiming and firing
    if (targetEnemyRef.current) {
      const targetEnemy = enemies.find((e) => e.id === targetEnemyRef.current);
      if (!targetEnemy) {
        targetEnemyRef.current = null;
        return;
      }

      const angleToEnemy = calculateAngleToEnemy(targetEnemyRef.current);
      currentWeapon.rotation.y = angleToEnemy; // Aim weapon model

      const currentTime = state.clock.getElapsedTime();
      if (currentTime - lastShootTimeRef.current > cooldown) {
        const firePosition = calculateFirePosition(angleToEnemy);

        // Double-check that the shot won't hit the player or terrain right before firing
        if (
          wouldCollideWithPlayer(firePosition, targetEnemy.position) ||
          wouldCollideWithTerrain(firePosition, targetEnemy.position)
        ) {
          // Shot would hit player or terrain, find new target
          targetEnemyRef.current = null;
          return;
        }

        const finalDamage = baseDamage * (1 + playerTurretDamage / 10);

        // Call the onFire callback if provided
        if (onFire) {
          onFire(firePosition, targetEnemyRef.current, finalDamage);
        }

        // Play the appropriate weapon sound based on the weapon type
        const weaponType = weaponInstance.id || "";
        if (weaponType === "shotgun") {
          sound.play("shotgun");
        } else if (weaponType === "sniper") {
          sound.play("sniper");
        }

        debug.log(
          `Weapon ${instanceId} fired at enemy ${
            targetEnemyRef.current
          } (Damage: ${finalDamage.toFixed(1)})`
        );

        lastShootTimeRef.current = currentTime;
      }
    }
    // If no target, rotation remains aligned with tank body
  });

  return {
    targetEnemyRef,
    findNearestEnemy,
    calculateAngleToEnemy,
    calculateFirePosition,
    lastShootTimeRef,
    cooldown,
    weaponRange,
    baseDamage,
    instanceId,
    playerTurretDamage,
  };
};

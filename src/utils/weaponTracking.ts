import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import { useGameState, SecondaryWeapon, Enemy } from "./gameState";
import { debug } from "./debug";

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

  const playerTurretDamage = useGameState((state) => state.playerTurretDamage);
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const enemies = useGameState((state) => state.enemies);

  const cooldown = weaponInstance.cooldown || 5;
  const weaponRange = weaponInstance.range || 40;
  const baseDamage = weaponInstance.damage || 30;
  const instanceId = weaponInstance.instanceId || "default_weapon";

  // Find nearest enemy within range
  const findNearestEnemy = (): string | null => {
    if (!enemies.length || !weaponRef.current) return null;
    const weaponPos = weaponRef.current.position;
    let nearestEnemy: string | null = null;
    let minDistance: number = Infinity;

    enemies.forEach((enemy: Enemy) => {
      const enemyPos = new Vector3(...enemy.position);
      const distance: number = weaponPos.distanceTo(enemyPos);
      if (distance < weaponRange && distance < minDistance) {
        minDistance = distance;
        nearestEnemy = enemy.id;
      }
    });

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
      const angleToEnemy = calculateAngleToEnemy(targetEnemyRef.current);
      currentWeapon.rotation.y = angleToEnemy; // Aim weapon model

      const currentTime = state.clock.getElapsedTime();
      if (currentTime - lastShootTimeRef.current > cooldown) {
        const firePosition = calculateFirePosition(angleToEnemy);
        const finalDamage = baseDamage * (1 + playerTurretDamage / 10);

        // Call the onFire callback if provided
        if (onFire) {
          onFire(firePosition, targetEnemyRef.current, finalDamage);
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

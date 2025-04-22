// src/components/RocketLauncher.tsx
import { useRef, useEffect, useState } from "react";
import { Box, Cylinder } from "@react-three/drei";
import { Group } from "three";
import { useGameState, SecondaryWeapon } from "../utils/gameState";
import { debug } from "../utils/debug";
import RocketProjectile from "./RocketProjectile";
import { useWeaponTracking } from "../utils/weaponTracking";

interface RocketLauncherProps {
  weaponInstance: SecondaryWeapon;
  position: [number, number, number];
  rotation: number;
}

const RocketLauncher = ({
  weaponInstance,
  position,
  rotation,
}: RocketLauncherProps) => {
  const launcherRef = useRef<Group>(null);
  // Changed from useRef to useState
  const [activeProjectiles, setActiveProjectiles] = useState<
    {
      id: string;
      position: [number, number, number];
      rotation: number;
      targetId: string | null;
    }[]
  >([]);

  const onFire = (
    firePosition: [number, number, number],
    targetId: string | null
  ) => {
    const projectileId = Math.random().toString(36).substring(2, 9);
    const newProjectile = {
      id: projectileId,
      position: firePosition,
      rotation: launcherRef.current?.rotation.y ?? 0,
      targetId: targetId,
    };
    // Use setActiveProjectiles to update the state
    setActiveProjectiles((prev) => [...prev, newProjectile]);
    debug.log(`Rocket fired: ${projectileId}`);
  };

  // Use the shared weapon tracking logic
  const { instanceId } = useWeaponTracking({
    weaponInstance,
    position,
    rotation,
    weaponRef: launcherRef as React.RefObject<Group>,
    barrelLength: 1.6, // Slightly adjusted barrel length
    fireOffsetY: 0.05, // Adjusted fire offset
    onFire: onFire, // Pass the callback
  });

  const removeProjectile = (id: string) => {
    setActiveProjectiles((prev) => prev.filter((p) => p.id !== id));
    debug.log(`Rocket projectile ${id} removed from active list.`);
  };

  useEffect(() => {
    debug.log(`Rocket launcher instance ${instanceId} mounted.`);
    return () => {
      debug.log(`Rocket launcher instance ${instanceId} unmounted`);
      // Clear projectiles associated with this specific launcher on unmount
      setActiveProjectiles([]); // Clear the local list
    };
  }, [instanceId]); // Dependency array ensures this runs once per instance

  return (
    <>
      {/* Launcher Model Group */}
      <group ref={launcherRef}>
        {/* Main Body Box */}
        <Box args={[0.3, 0.35, 1.4]} position={[0, 0, 0.6]} castShadow>
          <meshStandardMaterial
            color="#333338"
            metalness={0.4}
            roughness={0.6}
          />
        </Box>

        {/* Barrel Tube */}
        <Cylinder
          args={[0.18, 0.18, 1.2, 16]} // Slightly wider, more segments
          position={[0, 0, 1.1]} // Adjusted position
          rotation={[Math.PI / 2, 0, 0]}
          castShadow>
          <meshStandardMaterial
            color="#2A2A2F"
            metalness={0.7}
            roughness={0.3}
          />
        </Cylinder>

        {/* Muzzle Break / End Cap */}
        <Cylinder
          args={[0.2, 0.17, 0.15, 16]} // Tapered shape
          position={[0, 0, 1.7]} // Positioned at the end of the barrel
          rotation={[Math.PI / 2, 0, 0]}
          castShadow>
          <meshStandardMaterial
            color="#1E1E22"
            metalness={0.8}
            roughness={0.2}
          />
        </Cylinder>

        {/* Underslung Grip Box */}
        <Box args={[0.12, 0.22, 0.35]} position={[0, -0.25, 0.4]} castShadow>
          <meshStandardMaterial color="#25252A" />
        </Box>

        {/* Top Sight/Accessory Rail */}
        <Box args={[0.08, 0.08, 0.5]} position={[0, 0.22, 0.5]} castShadow>
          <meshStandardMaterial
            color="#151518"
            metalness={0.6}
            roughness={0.4}
          />
        </Box>

        {/* Side Panel Detail 1 */}
        <Box args={[0.05, 0.25, 0.6]} position={[0.2, 0, 0.7]} castShadow>
          <meshStandardMaterial color="#3A3A40" roughness={0.7} />
        </Box>
        {/* Side Panel Detail 2 (Opposite Side) */}
        <Box args={[0.05, 0.25, 0.6]} position={[-0.2, 0, 0.7]} castShadow>
          <meshStandardMaterial color="#3A3A40" roughness={0.7} />
        </Box>

        {/* Warning Stripe Detail */}
        <Box args={[0.31, 0.06, 0.45]} position={[0, -0.1, 0.7]} castShadow>
          <meshStandardMaterial
            color="#FFD700"
            emissive="#332200"
            roughness={0.5}
          />
        </Box>

        {/* Small Rivet/Bolt Details */}
        <Cylinder
          args={[0.02, 0.02, 0.06, 6]}
          position={[0.2, 0.15, 0.95]}
          rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial
            color="#555555"
            metalness={0.9}
            roughness={0.2}
          />
        </Cylinder>
        <Cylinder
          args={[0.02, 0.02, 0.06, 6]}
          position={[-0.2, 0.15, 0.95]}
          rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial
            color="#555555"
            metalness={0.9}
            roughness={0.2}
          />
        </Cylinder>
        <Cylinder
          args={[0.02, 0.02, 0.06, 6]}
          position={[0.2, -0.15, 0.95]}
          rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial
            color="#555555"
            metalness={0.9}
            roughness={0.2}
          />
        </Cylinder>
        <Cylinder
          args={[0.02, 0.02, 0.06, 6]}
          position={[-0.2, -0.15, 0.95]}
          rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial
            color="#555555"
            metalness={0.9}
            roughness={0.2}
          />
        </Cylinder>
      </group>

      {/* Render Active Projectiles */}
      {activeProjectiles.map((projectile) => (
        <RocketProjectile
          key={projectile.id}
          id={projectile.id}
          position={projectile.position}
          rotation={projectile.rotation}
          damage={
            weaponInstance.damage *
            (1 + useGameState.getState().playerTurretDamage / 10)
          }
          targetId={projectile.targetId}
          onRemove={removeProjectile}
        />
      ))}
    </>
  );
};

export default RocketLauncher;

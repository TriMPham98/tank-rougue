// src/components/RocketLauncher.tsx
import { useRef, useEffect } from "react";
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
  const projectilesRef = useRef<
    {
      id: string;
      position: [number, number, number];
      rotation: number;
      targetId: string | null;
    }[]
  >([]);

  // Use the shared weapon tracking logic
  const { instanceId } = useWeaponTracking({
    weaponInstance,
    position,
    rotation,
    weaponRef: launcherRef as React.RefObject<Group>,
    barrelLength: 1.5,
    fireOffsetY: 0.1,
    onFire: (firePosition, targetId) => {
      const projectileId = Math.random().toString(36).substr(2, 9);
      projectilesRef.current.push({
        id: projectileId,
        position: firePosition,
        rotation: launcherRef.current?.rotation.y ?? 0,
        targetId: targetId,
      });
    },
  });

  const removeProjectile = (id: string) => {
    projectilesRef.current = projectilesRef.current.filter((p) => p.id !== id);
  };

  useEffect(() => {
    debug.log(`Rocket launcher instance ${instanceId} mounted.`);
    return () => {
      debug.log(`Rocket launcher instance ${instanceId} unmounted`);
    };
  }, [instanceId]);

  return (
    <>
      <group ref={launcherRef}>
        <Box args={[0.2, 0.25, 1.3]} position={[0, 0, 0.5]} castShadow>
          <meshStandardMaterial color="#303030" />
        </Box>
        <Cylinder
          args={[0.15, 0.15, 1.0, 12]}
          position={[0, 0, 1.0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow>
          <meshStandardMaterial
            color="#252525"
            metalness={0.6}
            roughness={0.3}
          />
        </Cylinder>
        <Cylinder
          args={[0.16, 0.14, 0.1, 12]}
          position={[0, 0, 1.5]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow>
          <meshStandardMaterial
            color="#1F1F1F"
            metalness={0.7}
            roughness={0.2}
          />
        </Cylinder>
        <Box args={[0.1, 0.18, 0.25]} position={[0, -0.2, 0.3]} castShadow>
          <meshStandardMaterial color="#202020" />
        </Box>
        <Box args={[0.06, 0.12, 0.2]} position={[0, 0.19, 0.3]} castShadow>
          <meshStandardMaterial
            color="#111111"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>
        <Box args={[0.3, 0.2, 0.4]} position={[0.25, 0, 0.4]} castShadow>
          <meshStandardMaterial color="#3A3A3A" />
        </Box>
        <Box args={[0.31, 0.05, 0.41]} position={[0.25, -0.08, 0.4]} castShadow>
          <meshStandardMaterial color="#FFCC00" />
        </Box>
      </group>

      {projectilesRef.current.map((projectile) => (
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

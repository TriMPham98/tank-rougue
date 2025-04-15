// src/components/Shotgun.tsx
import React, { useRef, useEffect, FC } from "react";
import { Box } from "@react-three/drei";
import { Group } from "three";
import { debug } from "../utils/debug";
import ShotgunPellet from "./ShotgunPellet";
import { useWeaponTracking } from "../utils/weaponTracking";
import { SecondaryWeapon } from "../utils/gameState";

interface ShotgunProps {
  weaponInstance: SecondaryWeapon;
  position: [number, number, number];
  rotation: number;
}

interface PelletData {
  id: string;
  position: [number, number, number];
  rotation: number;
  damage: number;
  speed: number;
  range: number;
  ttl: number;
}

const Shotgun: FC<ShotgunProps> = ({ weaponInstance, position, rotation }) => {
  const shotgunRef = useRef<Group>(null);
  const projectilesRef = useRef<PelletData[]>([]);

  const {
    range: weaponRange,
    projectileSpeed,
    damage: damagePerShot,
    instanceId = "default_shotgun",
  } = weaponInstance;

  const PELLET_COUNT: number = 5;
  const SPREAD_ANGLE: number = 0.25;
  const damagePerPellet: number = damagePerShot / PELLET_COUNT;
  const projectileTTL: number = weaponRange / projectileSpeed;

  useWeaponTracking({
    weaponInstance,
    position,
    rotation,
    weaponRef: shotgunRef as React.RefObject<Group>,
    barrelLength: 1.2,
    onFire: (firePosition) => {
      debug.log(`Firing from position: ${firePosition}`);
      const currentRotation = shotgunRef.current?.rotation.y ?? rotation;

      for (let i = 0; i < PELLET_COUNT; i++) {
        const spreadOffset = (Math.random() - 0.5) * SPREAD_ANGLE;
        const pelletRotation = currentRotation + spreadOffset;
        const projectileId = `${instanceId}-pellet-${performance.now()}-${i}`;

        const newPelletData: PelletData = {
          id: projectileId,
          position: firePosition,
          rotation: pelletRotation,
          damage: damagePerPellet,
          speed: projectileSpeed,
          range: weaponRange,
          ttl: projectileTTL,
        };
        projectilesRef.current.push(newPelletData);
      }
    },
  });

  const removeProjectile = (id: string): void => {
    projectilesRef.current = projectilesRef.current.filter((p) => p.id !== id);
  };

  useEffect(() => {
    debug.log(`Shotgun instance ${instanceId} mounted.`);
    return () => {
      debug.log(`Shotgun instance ${instanceId} unmounted`);
    };
  }, [instanceId]);

  const boxArgs = (
    w: number,
    h: number,
    d: number
  ): [number, number, number] => [w, h, d];

  return (
    <>
      <group ref={shotgunRef}>
        <Box args={boxArgs(0.08, 0.1, 1.0)} position={[0, 0, 0.6]} castShadow>
          <meshStandardMaterial color="#5D4037" />
        </Box>
        <Box
          args={boxArgs(0.07, 0.15, 0.4)}
          position={[0, 0, 0]}
          rotation={[0.1, 0, 0]}
          castShadow>
          <meshStandardMaterial color="#3E2723" />
        </Box>
        <Box
          args={boxArgs(0.05, 0.04, 0.9)}
          position={[0.03, 0.03, 0.9]}
          castShadow>
          <meshStandardMaterial
            color="#444444"
            metalness={0.8}
            roughness={0.2}
          />
        </Box>
        <Box
          args={boxArgs(0.05, 0.04, 0.9)}
          position={[-0.03, 0.03, 0.9]}
          castShadow>
          <meshStandardMaterial
            color="#444444"
            metalness={0.8}
            roughness={0.2}
          />
        </Box>
        <Box
          args={boxArgs(0.03, 0.07, 0.12)}
          position={[0, -0.05, 0.3]}
          castShadow>
          <meshStandardMaterial color="#222222" />
        </Box>
        <Box
          args={boxArgs(0.02, 0.03, 0.02)}
          position={[0, 0.07, 1.35]}
          castShadow>
          <meshStandardMaterial color="#444444" />
        </Box>
        <Box
          args={boxArgs(0.1, 0.08, 0.05)}
          position={[0, 0.03, 1.4]}
          castShadow>
          <meshStandardMaterial
            color="#333333"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>
        <Box
          args={boxArgs(0.06, 0.02, 0.15)}
          position={[0, 0.08, 0.5]}
          castShadow>
          <meshStandardMaterial color="#555555" />
        </Box>
      </group>

      {projectilesRef.current.map((pelletData: PelletData) => (
        <ShotgunPellet
          key={pelletData.id}
          id={pelletData.id}
          position={pelletData.position}
          rotation={pelletData.rotation}
          damage={pelletData.damage}
          speed={pelletData.speed}
          range={pelletData.range}
          ttl={pelletData.ttl}
          onRemove={removeProjectile}
        />
      ))}
    </>
  );
};

export default Shotgun;

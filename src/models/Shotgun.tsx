// src/components/Shotgun.tsx
import React, { useRef, useEffect, FC } from "react";
import { Box } from "@react-three/drei";
import { Group } from "three";
import { useGameState, SecondaryWeapon } from "../utils/gameState"; // Adjust path if needed
import { debug } from "../utils/debug";
import ShotgunPellet from "./ShotgunPellet";
import { useWeaponTracking } from "../utils/weaponTracking";

// --- UPDATED PROPS INTERFACE ---
interface ShotgunProps {
  weaponInstance: SecondaryWeapon;
  position: [number, number, number]; // Receive absolute position
  rotation: number; // Receive base rotation (tank body rotation)
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

  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);

  const {
    cooldown,
    range: weaponRange,
    projectileSpeed,
    damage: damagePerShot,
    instanceId = "default_shotgun",
  } = weaponInstance;

  const PELLET_COUNT: number = 5;
  const SPREAD_ANGLE: number = 0.3;
  const damagePerPellet: number =
    PELLET_COUNT > 0 ? damagePerShot / PELLET_COUNT : 0;
  const projectileTTL: number =
    projectileSpeed > 0 ? weaponRange / projectileSpeed + 0.5 : 2;

  // Use the shared weapon tracking logic
  useWeaponTracking({
    weaponInstance,
    position,
    rotation,
    weaponRef: shotgunRef as React.RefObject<Group>,
    barrelLength: 1.2,
    onFire: (firePosition, targetId, damage) => {
      // Fire multiple pellets
      for (let i = 0; i < PELLET_COUNT; i++) {
        const spreadOffset: number = (Math.random() - 0.5) * SPREAD_ANGLE;
        const pelletRotation: number =
          shotgunRef.current?.rotation.y ?? 0 + spreadOffset; // Spread relative to aimed direction
        const projectileId: string = `${instanceId}-pellet-${performance.now()}-${i}`;

        const newPelletData: PelletData = {
          id: projectileId,
          position: firePosition, // Use calculated fire position
          rotation: pelletRotation, // Use pellet's specific rotation
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

  // --- Lifecycle Logging ---
  useEffect(() => {
    debug.log(`Shotgun instance ${instanceId} mounted.`);
    return () => {
      debug.log(`Shotgun instance ${instanceId} unmounted`);
    };
  }, [instanceId]); // Only depends on instanceId now

  const boxArgs = (
    w: number,
    h: number,
    d: number
  ): [number, number, number] => [w, h, d];

  return (
    <>
      {/* Shotgun model - position/rotation handled by ref updates */}
      <group ref={shotgunRef}>
        {/* Model parts remain the same */}
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

      {/* Render projectiles */}
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

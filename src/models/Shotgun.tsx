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
    projectileSpeed,
    damage: damagePerShot,
    instanceId = "default_shotgun",
  } = weaponInstance;

  const PELLET_COUNT: number = 5;
  const SPREAD_ANGLE: number = 0.25;
  const damagePerPellet: number = damagePerShot / PELLET_COUNT;

  // Get enhanced weapon range from weapon tracking
  const { weaponRange } = useWeaponTracking({
    weaponInstance,
    position,
    rotation,
    weaponRef: shotgunRef as React.RefObject<Group>,
    barrelLength: 1.2, // Approximate end of the barrels
    onFire: (firePosition) => {
      debug.log(`Firing from position: ${firePosition}`);
      const currentRotation = shotgunRef.current?.rotation.y ?? rotation;

      // Calculate TTL using enhanced range
      const projectileTTL: number = weaponRange / projectileSpeed;

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
          range: weaponRange, // Use enhanced range
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
        {/* Stock */}
        <Box
          args={boxArgs(0.08, 0.16, 0.5)} // Main stock part, slightly thicker and longer
          position={[0, -0.01, -0.15]} // Adjusted position for continuity
          rotation={[0.15, 0, 0]} // Slightly more angle
          castShadow>
          <meshStandardMaterial color="#3E2723" /> {/* Darker wood */}
        </Box>
        <Box
          args={boxArgs(0.06, 0.08, 0.2)} // Grip area
          position={[0, -0.05, 0.15]} // Connects to receiver and main stock
          rotation={[0.6, 0, 0]} // Steeper angle for grip
          castShadow>
          <meshStandardMaterial color="#5D4037" /> {/* Lighter wood */}
        </Box>

        {/* Receiver */}
        <Box
          args={boxArgs(0.09, 0.09, 0.3)} // Central body connecting parts
          position={[0, 0.03, 0.3]}
          castShadow>
          <meshStandardMaterial
            color="#404040"
            metalness={0.6}
            roughness={0.4}
          />
        </Box>
        {/* Ejection Port area detail */}
        <Box
          args={boxArgs(0.01, 0.03, 0.1)}
          position={[0.045, 0.04, 0.3]}
          castShadow>
          <meshStandardMaterial
            color="#222222"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>

        {/* Barrels - Side by side */}
        <Box
          args={boxArgs(0.04, 0.04, 1.0)} // Left Barrel
          position={[-0.03, 0.05, 0.95]} // Start further forward
          castShadow>
          <meshStandardMaterial
            color="#333333" // Darker metal
            metalness={0.8}
            roughness={0.2}
          />
        </Box>
        <Box
          args={boxArgs(0.04, 0.04, 1.0)} // Right Barrel
          position={[0.03, 0.05, 0.95]} // Start further forward
          castShadow>
          <meshStandardMaterial
            color="#333333" // Darker metal
            metalness={0.8}
            roughness={0.2}
          />
        </Box>
        {/* Barrel connection/brace */}
        <Box
          args={boxArgs(0.08, 0.015, 0.05)}
          position={[0, 0.05, 0.55]} // Near receiver
          castShadow>
          <meshStandardMaterial
            color="#444444"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>
        <Box
          args={boxArgs(0.08, 0.015, 0.05)}
          position={[0, 0.05, 1.3]} // Near muzzle
          castShadow>
          <meshStandardMaterial
            color="#444444"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>

        {/* Pump Handle */}
        <Box
          args={boxArgs(0.07, 0.05, 0.4)} // Slightly wider
          position={[0, -0.02, 0.7]} // Underneath barrels
          castShadow>
          <meshStandardMaterial color="#5D4037" /> {/* Wood color */}
        </Box>
        {/* Pump Handle ridges detail */}
        <Box
          args={boxArgs(0.075, 0.01, 0.03)}
          position={[0, -0.02, 0.6]}
          castShadow>
          <meshStandardMaterial color="#4a3128" />
        </Box>
        <Box
          args={boxArgs(0.075, 0.01, 0.03)}
          position={[0, -0.02, 0.8]}
          castShadow>
          <meshStandardMaterial color="#4a3128" />
        </Box>

        {/* Trigger Guard */}
        <Box
          args={boxArgs(0.015, 0.04, 0.15)} // Thin guard loop
          position={[0, -0.02, 0.22]}
          rotation={[0.2, 0, 0]}
          castShadow>
          <meshStandardMaterial
            color="#222222"
            metalness={0.5}
            roughness={0.5}
          />
        </Box>
        {/* Trigger */}
        <Box
          args={boxArgs(0.008, 0.03, 0.015)}
          position={[0, -0.005, 0.25]}
          rotation={[-0.3, 0, 0]}
          castShadow>
          <meshStandardMaterial
            color="#333333"
            metalness={0.6}
            roughness={0.4}
          />
        </Box>

        {/* Sight */}
        <Box
          args={boxArgs(0.015, 0.015, 0.015)} // Slightly smaller bead sight
          position={[0, 0.08, 1.44]} // Positioned top-center at the muzzle end
          castShadow>
          <meshStandardMaterial
            color="#cccccc"
            metalness={0.9}
            roughness={0.1}
          />
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

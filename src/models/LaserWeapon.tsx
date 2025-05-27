// src/components/LaserWeapon.tsx
import { useRef, useEffect, useState } from "react";
import { Box } from "@react-three/drei";
import { Group } from "three";
import { debug } from "../utils/debug";
import LaserBeam from "./LaserBeam";
import { useWeaponTracking } from "../utils/weaponTracking";
import { WeaponInstance } from "../utils/weapons";

// --- UPDATED PROPS INTERFACE ---
interface LaserWeaponProps {
  weaponInstance: WeaponInstance;
  position: [number, number, number];
  rotation: number;
}

const LaserWeapon = ({
  weaponInstance,
  position,
  rotation,
}: LaserWeaponProps) => {
  const laserRef = useRef<Group>(null);
  const [isBeamActive, setIsBeamActive] = useState(false);
  const firingDurationRef = useRef(0);

  const { damage: laserDamage, instanceId = "default_laser" } = weaponInstance;

  const DAMAGE_TICK_RATE = 0.1;

  // Use the shared weapon tracking logic and get enhanced range
  const { targetEnemyRef, weaponRange } = useWeaponTracking({
    weaponInstance,
    position,
    rotation,
    weaponRef: laserRef as React.RefObject<Group>,
    barrelLength: 1.5,
    onFire: (_firePosition, targetId) => {
      setIsBeamActive(true);
      firingDurationRef.current = 0;
      debug.log(`Laser ${instanceId} started firing at enemy ${targetId}`);
    },
  });

  // --- Calculate Beam Start Position ---
  const beamStartPosition = (): [number, number, number] => {
    if (!laserRef.current) return [0, 0, 0];

    const weaponPos = laserRef.current.position;
    const weaponRot = laserRef.current.rotation.y;
    const emitterOffset = 1.5;

    return [
      weaponPos.x + Math.sin(weaponRot) * emitterOffset,
      weaponPos.y,
      weaponPos.z + Math.cos(weaponRot) * emitterOffset,
    ];
  };

  // --- Lifecycle Logging ---
  useEffect(() => {
    debug.log(`Laser weapon instance ${instanceId} mounted.`);
    return () => {
      debug.log(`Laser weapon instance ${instanceId} unmounted`);
    };
  }, [instanceId]);

  return (
    <>
      {/* Laser weapon model */}
      <group ref={laserRef}>
        <Box args={[0.1, 0.1, 1.2]} position={[0, 0, 0.6]} castShadow>
          <meshStandardMaterial
            color="#444444"
            metalness={0.8}
            roughness={0.2}
          />
        </Box>
        <Box args={[0.14, 0.14, 0.4]} position={[0, 0, 0.2]} castShadow>
          <meshStandardMaterial
            color="#30FFFF"
            emissive="#30FFFF"
            emissiveIntensity={isBeamActive ? 1.5 : 0.5}
          />
        </Box>
        <Box args={[0.08, 0.08, 0.7]} position={[0, 0, 1.1]} castShadow>
          <meshStandardMaterial
            color="#333333"
            metalness={0.9}
            roughness={0.1}
          />
        </Box>
        <Box args={[0.1, 0.1, 0.05]} position={[0, 0, 1.5]} castShadow>
          <meshStandardMaterial
            color="#00FFFF"
            emissive="#00FFFF"
            emissiveIntensity={isBeamActive ? 3.0 : 0.8}
          />
        </Box>
        <Box args={[0.03, 0.15, 0.7]} position={[0, 0.12, 0.7]} castShadow>
          <meshStandardMaterial
            color="#555555"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>
        <Box args={[0.15, 0.03, 0.7]} position={[0.12, 0, 0.7]} castShadow>
          <meshStandardMaterial
            color="#555555"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>
        <Box args={[0.15, 0.03, 0.7]} position={[-0.12, 0, 0.7]} castShadow>
          <meshStandardMaterial
            color="#555555"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>
        <Box args={[0.04, 0.04, 0.4]} position={[0.07, -0.07, 0.3]} castShadow>
          <meshStandardMaterial color="#222222" />
        </Box>
        <Box args={[0.03, 0.03, 0.05]} position={[0, 0.08, 0.05]} castShadow>
          <meshStandardMaterial
            color={isBeamActive ? "#FF3333" : "#33FF33"}
            emissive={isBeamActive ? "#FF0000" : "#00FF00"}
            emissiveIntensity={1.0}
          />
        </Box>
      </group>

      {/* Render laser beam when active */}
      {isBeamActive && targetEnemyRef.current && (
        <LaserBeam
          startPosition={beamStartPosition()}
          targetId={targetEnemyRef.current}
          damage={laserDamage * DAMAGE_TICK_RATE}
          range={weaponRange}
          color="#00FFFF"
        />
      )}
    </>
  );
};

export default LaserWeapon;

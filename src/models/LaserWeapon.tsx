// src/components/LaserWeapon.tsx
import { useRef, useEffect, useState } from "react";
import { Box } from "@react-three/drei";
import { Group } from "three";
import { useGameState, SecondaryWeapon } from "../utils/gameState"; // Adjust path
import { debug } from "../utils/debug";
import LaserBeam from "./LaserBeam";
import { useWeaponTracking } from "../utils/weaponTracking";

// --- UPDATED PROPS INTERFACE ---
interface LaserWeaponProps {
  weaponInstance: SecondaryWeapon;
  position: [number, number, number]; // Receive absolute position
  rotation: number; // Receive base rotation
}

const LaserWeapon = ({
  weaponInstance,
  position,
  rotation,
}: LaserWeaponProps) => {
  const laserRef = useRef<Group>(null);
  const [isBeamActive, setIsBeamActive] = useState(false);
  const firingDurationRef = useRef(0);

  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);

  const {
    cooldown,
    range: weaponRange,
    damage: laserDamage,
    instanceId = "default_laser",
  } = weaponInstance;

  const MAX_FIRING_DURATION = 2.5;
  const DAMAGE_TICK_RATE = 0.1;

  // Use the shared weapon tracking logic
  const { targetEnemyRef } = useWeaponTracking({
    weaponInstance,
    position,
    rotation,
    weaponRef: laserRef as React.RefObject<Group>,
    barrelLength: 1.5,
    onFire: (firePosition, targetId, damage) => {
      setIsBeamActive(true);
      firingDurationRef.current = 0;
      debug.log(`Laser ${instanceId} started firing at enemy ${targetId}`);
    },
  });

  // --- Calculate Beam Start Position ---
  const beamStartPosition = (): [number, number, number] => {
    if (!laserRef.current) return [0, 0, 0]; // Default fallback

    const weaponPos = laserRef.current.position;
    const weaponRot = laserRef.current.rotation.y;
    const emitterOffset = 1.5; // Distance from weapon center to emitter tip

    return [
      weaponPos.x + Math.sin(weaponRot) * emitterOffset,
      weaponPos.y, // Assuming beam comes from weapon's Y level
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
      {/* Laser weapon model - position/rotation handled by ref updates */}
      <group ref={laserRef}>
        {/* Model parts remain the same */}
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
          // Calculate start position dynamically based on current weapon state
          startPosition={beamStartPosition()}
          targetId={targetEnemyRef.current}
          damage={laserDamage * DAMAGE_TICK_RATE} // Pass damage per tick
          range={weaponRange}
          color="#00FFFF"
          // Consider adding an onEnd callback if LaserBeam needs to notify when it naturally finishes
        />
      )}
    </>
  );
};

export default LaserWeapon;

// src/components/SniperRifle.tsx
import { useRef, useEffect } from "react";
import { Box } from "@react-three/drei";
import { Group } from "three";
import { SecondaryWeapon } from "../utils/gameState"; // Adjust path
import { debug } from "../utils/debug";
import SniperProjectile from "./SniperProjectile";
import { useWeaponTracking } from "../utils/weaponTracking";

// --- UPDATED PROPS INTERFACE ---
interface SniperRifleProps {
  weaponInstance: SecondaryWeapon;
  position: [number, number, number]; // Receive absolute position
  rotation: number; // Receive base rotation
}

const SniperRifle = ({
  weaponInstance,
  position,
  rotation,
}: SniperRifleProps) => {
  const rifleRef = useRef<Group>(null);
  const projectilesRef = useRef<
    {
      id: string;
      position: [number, number, number];
      rotation: number;
      targetId: string | null; // Keep targetId if SniperProjectile uses it for guidance/initial velocity
      // Add damage if SniperProjectile needs it directly
      damage: number;
    }[]
  >([]);

  // Use the shared weapon tracking logic
  const { instanceId } = useWeaponTracking({
    weaponInstance,
    position,
    rotation,
    weaponRef: rifleRef as React.RefObject<Group>,
    barrelLength: 1.8,
    onFire: (firePosition, targetId, damage) => {
      const projectileId = Math.random().toString(36).substr(2, 9);
      projectilesRef.current.push({
        id: projectileId,
        position: firePosition,
        rotation: rifleRef.current?.rotation.y ?? 0,
        targetId: targetId,
        damage: damage,
      });
    },
  });

  const removeProjectile = (id: string) => {
    projectilesRef.current = projectilesRef.current.filter((p) => p.id !== id);
  };

  // --- Lifecycle Logging ---
  useEffect(() => {
    debug.log(`Sniper rifle instance ${instanceId} mounted.`);
    return () => {
      debug.log(`Sniper rifle instance ${instanceId} unmounted`);
    };
  }, [instanceId]);

  return (
    <>
      {/* Sniper rifle model - position/rotation handled by ref updates */}
      <group ref={rifleRef}>
        {/* Model parts remain the same */}
        <Box
          args={[0.07, 0.08, 1.75]}
          position={[0, 0, 0.75]}
          rotation={[0, 0, 0]}
          castShadow>
          <meshStandardMaterial color="#252525" />
        </Box>
        <Box
          args={[0.06, 0.12, 0.4]}
          position={[0, 0.02, 0]}
          rotation={[0.1, 0, 0]}
          castShadow>
          <meshStandardMaterial color="#1A1A1A" />
        </Box>
        <Box args={[0.05, 0.05, 1.2]} position={[0, 0, 1.4]} castShadow>
          <meshStandardMaterial
            color="#202020"
            metalness={0.8}
            roughness={0.2}
          />
        </Box>
        <Box args={[0.08, 0.04, 0.25]} position={[0, 0.1, 1]} castShadow>
          <meshStandardMaterial color="#181818" />
        </Box>
        <Box args={[0.06, 0.15, 0.35]} position={[0, 0.19, 1]} castShadow>
          <meshStandardMaterial
            color="#111111"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>
        <Box args={[0.04, 0.04, 0.01]} position={[0, 0.19, 1.18]} castShadow>
          <meshStandardMaterial
            color="#88CCFF"
            emissive="#446688"
            emissiveIntensity={0.5}
          />
        </Box>
        <Box args={[0.04, 0.04, 0.01]} position={[0, 0.19, 0.83]} castShadow>
          <meshStandardMaterial color="#000000" />
        </Box>
        <Box
          args={[0.02, 0.02, 0.15]}
          position={[0.08, 0.02, 0.7]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow>
          <meshStandardMaterial color="#333333" metalness={0.6} />
        </Box>
        <Box args={[0.03, 0.07, 0.12]} position={[0, -0.05, 0.4]} castShadow>
          <meshStandardMaterial color="#222222" />
        </Box>
        <Box args={[0.05, 0.12, 0.2]} position={[0, -0.1, 0.6]} castShadow>
          <meshStandardMaterial color="#333333" />
        </Box>
        <Box
          args={[0.02, 0.08, 0.02]}
          position={[-0.05, -0.05, 2]}
          rotation={[0.3, 0, -0.3]}
          castShadow>
          <meshStandardMaterial color="#282828" />
        </Box>
        <Box
          args={[0.02, 0.08, 0.02]}
          position={[0.05, -0.05, 2]}
          rotation={[0.3, 0, 0.3]}
          castShadow>
          <meshStandardMaterial color="#282828" />
        </Box>

        {/* Laser sight */}
        <Box args={[0.03, 0.03, 0.1]} position={[0, 0.02, 2.05]} castShadow>
          <meshStandardMaterial
            color="red"
            emissive="red"
            emissiveIntensity={2}
          />
        </Box>

        {/* Laser beam effect */}
        <Box args={[0.005, 0.005, 5]} position={[0, 0.02, 4.5]}>
          <meshStandardMaterial
            color="red"
            emissive="red"
            emissiveIntensity={3}
            transparent={true}
            opacity={0.5}
          />
        </Box>
      </group>

      {/* Render projectiles */}
      {projectilesRef.current.map((projectile) => (
        <SniperProjectile
          key={projectile.id}
          id={projectile.id}
          position={projectile.position}
          rotation={projectile.rotation}
          damage={projectile.damage} // Pass damage from the stored data
          targetId={projectile.targetId}
          onRemove={removeProjectile}
        />
      ))}
    </>
  );
};

export default SniperRifle;

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
      penetrationPower: number; // Add penetration power property
    }[]
  >([]);

  // Use the shared weapon tracking logic
  const { instanceId } = useWeaponTracking({
    weaponInstance,
    position,
    rotation,
    weaponRef: rifleRef as React.RefObject<Group>,
    barrelLength: 2.0, // Adjusted slightly based on model changes
    onFire: (firePosition, targetId, damage) => {
      const projectileId = Math.random().toString(36).substr(2, 9);

      // Sniper rifles have penetration power to hit multiple targets in a row
      const penetrationPower = 3; // Can penetrate up to 3 enemies

      projectilesRef.current.push({
        id: projectileId,
        position: firePosition,
        rotation: rifleRef.current?.rotation.y ?? 0,
        targetId: targetId,
        damage: damage,
        penetrationPower: penetrationPower,
      });

      debug.log(`Fired sniper shot with penetration power ${penetrationPower}`);
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
        {/* --- Core Body & Stock --- */}
        {/* Main Receiver */}
        <Box
          args={[0.07, 0.08, 1.75]}
          position={[0, 0, 0.75]} // Base part
          castShadow>
          <meshStandardMaterial color="#252525" />
        </Box>
        {/* Stock/Receiver Connection */}
        <Box
          args={[0.06, 0.12, 0.4]}
          position={[0, 0.02, 0]} // Back section
          rotation={[0.1, 0, 0]}
          castShadow>
          <meshStandardMaterial color="#1A1A1A" />
        </Box>
        {/* Cheek Rest */}
        <Box
          args={[0.05, 0.05, 0.3]}
          position={[0, 0.08, 0.15]} // On top of stock back
          rotation={[0.1, 0, 0]}
          castShadow>
          <meshStandardMaterial color="#303030" />
        </Box>
        {/* Shoulder Pad */}
        <Box
          args={[0.065, 0.13, 0.05]}
          position={[0, 0.01, -0.2]} // Very back
          castShadow>
          <meshStandardMaterial color="#111111" roughness={0.6} />
        </Box>

        {/* --- Barrel & Muzzle --- */}
        {/* Barrel */}
        <Box
          args={[0.05, 0.05, 1.2]}
          position={[0, 0, 1.4]} // Forward from receiver
          castShadow>
          <meshStandardMaterial
            color="#202020"
            metalness={0.8}
            roughness={0.2}
          />
        </Box>
        {/* Muzzle Brake Base */}
        <Box
          args={[0.06, 0.06, 0.1]}
          position={[0, 0, 2.05]} // End of barrel
          castShadow>
          <meshStandardMaterial
            color="#151515"
            metalness={0.85}
            roughness={0.15}
          />
        </Box>
        {/* Muzzle Brake Slits (visual effect) */}
        <Box args={[0.07, 0.02, 0.08]} position={[0, 0.02, 2.05]} castShadow>
          <meshStandardMaterial color="#050505" />
        </Box>
        <Box args={[0.07, 0.02, 0.08]} position={[0, -0.02, 2.05]} castShadow>
          <meshStandardMaterial color="#050505" />
        </Box>

        {/* --- Scope --- */}
        {/* Scope Mount Base */}
        <Box
          args={[0.08, 0.04, 0.25]}
          position={[0, 0.1, 1]} // On top of receiver, z=1
          castShadow>
          <meshStandardMaterial color="#181818" />
        </Box>
        {/* Scope Main Tube */}
        <Box
          args={[0.06, 0.06, 0.5]} // Slightly longer, thinner
          position={[0, 0.19, 0.95]} // Centered around z=0.95, raised
          castShadow>
          <meshStandardMaterial
            color="#111111"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>
        {/* Scope Front Housing */}
        <Box
          args={[0.07, 0.07, 0.1]} // Slightly larger diameter
          position={[0, 0.19, 1.25]} // Front end of tube (0.95 + 0.5/2)
          castShadow>
          <meshStandardMaterial
            color="#101010"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>
        {/* Scope Eyepiece Housing */}
        <Box
          args={[0.07, 0.07, 0.1]} // Similar size
          position={[0, 0.19, 0.65]} // Back end of tube (0.95 - 0.5/2)
          castShadow>
          <meshStandardMaterial
            color="#101010"
            metalness={0.7}
            roughness={0.3}
          />
        </Box>
        {/* Scope Front Lens */}
        <Box
          args={[0.04, 0.04, 0.01]}
          position={[0, 0.19, 1.3]} // Front face of front housing (1.25 + 0.1/2)
          castShadow>
          <meshStandardMaterial
            color="#88CCFF"
            emissive="#446688"
            emissiveIntensity={0.5}
          />
        </Box>
        {/* Scope Rear Lens */}
        <Box
          args={[0.04, 0.04, 0.01]}
          position={[0, 0.19, 0.6]} // Back face of eyepiece housing (0.65 - 0.1/2)
          castShadow>
          <meshStandardMaterial color="#000000" />
        </Box>
        {/* Scope Top Turret */}
        <Box
          args={[0.03, 0.04, 0.03]} // Knob shape
          position={[0, 0.24, 0.95]} // Top center of main tube
          castShadow>
          <meshStandardMaterial color="#282828" metalness={0.5} />
        </Box>
        {/* Scope Side Turret */}
        <Box
          args={[0.04, 0.03, 0.03]} // Knob shape
          position={[0.05, 0.19, 0.95]} // Side center of main tube (Right side)
          castShadow>
          <meshStandardMaterial color="#282828" metalness={0.5} />
        </Box>

        {/* --- Bolt Handle --- */}
        <Box
          args={[0.02, 0.02, 0.15]}
          position={[0.08, 0.02, 0.7]} // Right side, z=0.7
          rotation={[0, 0, Math.PI / 2]}
          castShadow>
          <meshStandardMaterial color="#333333" metalness={0.6} />
        </Box>
        {/* Bolt Knob */}
        <Box
          args={[0.03, 0.03, 0.03]}
          position={[0.08, 0.02, 0.7 + 0.075]} // End of bolt handle shaft
          castShadow>
          <meshStandardMaterial color="#282828" metalness={0.6} />
        </Box>

        {/* --- Grip & Trigger Area --- */}
        {/* Pistol Grip */}
        <Box
          args={[0.04, 0.1, 0.12]} // Adjusted shape slightly
          position={[0, -0.06, 0.4]} // Below receiver, z=0.4
          rotation={[-0.2, 0, 0]} // Slight angle
          castShadow>
          <meshStandardMaterial color="#222222" />
        </Box>
        {/* Lower Receiver / Magazine Well */}
        <Box
          args={[0.05, 0.07, 0.2]} // Adjusted shape
          position={[0, -0.08, 0.65]} // Below receiver, front of grip
          castShadow>
          <meshStandardMaterial color="#333333" />
        </Box>
        {/* Magazine */}
        <Box
          args={[0.045, 0.09, 0.18]}
          position={[0, -0.13, 0.65]} // Hanging below mag well
          castShadow>
          <meshStandardMaterial color="#1E1E1E" />
        </Box>
        {/* Trigger Guard */}
        <Box
          args={[0.015, 0.04, 0.15]}
          position={[0, -0.1, 0.5]} // Below receiver, between grip and mag well
          castShadow>
          <meshStandardMaterial color="#151515" metalness={0.5} />
        </Box>
        {/* Trigger */}
        <Box
          args={[0.008, 0.02, 0.015]}
          position={[0, -0.08, 0.5]} // Inside trigger guard
          castShadow>
          <meshStandardMaterial color="#444444" metalness={0.7} />
        </Box>

        {/* --- Bipod --- */}
        {/* Bipod Mount */}
        <Box
          args={[0.04, 0.03, 0.05]}
          position={[0, -0.04, 1.8]} // Under barrel, near muzzle end
          castShadow>
          <meshStandardMaterial color="#282828" metalness={0.4} />
        </Box>
        {/* Left Bipod Leg */}
        <Box
          args={[0.015, 0.12, 0.015]} // Thinner, longer leg
          position={[-0.04, -0.09, 1.8]} // Attached lower, angled out
          rotation={[0.4, 0.1, -0.3]} // Folded angle
          castShadow>
          <meshStandardMaterial color="#282828" />
        </Box>
        {/* Right Bipod Leg */}
        <Box
          args={[0.015, 0.12, 0.015]} // Thinner, longer leg
          position={[0.04, -0.09, 1.8]} // Attached lower, angled out
          rotation={[0.4, -0.1, 0.3]} // Folded angle
          castShadow>
          <meshStandardMaterial color="#282828" />
        </Box>

        {/* --- Laser Sight (Optional - Kept from original) --- */}
        <Box
          args={[0.025, 0.025, 0.1]} // Slightly smaller
          position={[0, 0.05, 1.9]} // Mounted top/front of barrel maybe? Adjusted pos
          castShadow>
          <meshStandardMaterial
            color="darkred" // Less bright when off
            emissive="red"
            emissiveIntensity={1.5} // Slightly less intense
          />
        </Box>
        {/* Laser beam effect */}
        <Box args={[0.004, 0.004, 5]} position={[0, 0.05, 4.45]}>
          {" "}
          {/* Adjusted beam origin z = 1.9 + 0.1/2 + 5/2 = 1.95 + 2.5 = 4.45 */}
          <meshStandardMaterial
            color="red"
            emissive="red"
            emissiveIntensity={2.5} // Slightly less intense
            transparent={true}
            opacity={0.4} // Slightly less opaque
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
          damage={projectile.damage}
          targetId={projectile.targetId}
          penetrationPower={projectile.penetrationPower}
          onRemove={removeProjectile}
        />
      ))}
    </>
  );
};

export default SniperRifle;

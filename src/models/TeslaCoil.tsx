import { useRef, useEffect, useState, RefObject } from "react"; // Import RefObject
import { Box, Cylinder, Sphere, Torus } from "@react-three/drei";
import { Group, AdditiveBlending, Object3DEventMap } from "three"; // Import Object3DEventMap
import { SecondaryWeapon } from "../utils/gameState";
import { debug } from "../utils/debug";
import TeslaArc from "./TeslaArc";
import { useWeaponTracking } from "../utils/weaponTracking";

interface TeslaCoilProps {
  weaponInstance: SecondaryWeapon;
  position: [number, number, number];
  rotation: number;
}

interface ActiveArcData {
  id: string;
  position: [number, number, number];
  rotation: number;
  targetId: string;
  damage: number;
  range: number;
}

const TeslaCoil = ({ weaponInstance, position, rotation }: TeslaCoilProps) => {
  // Initialize the ref correctly for a Group
  const coilRef = useRef<Group<Object3DEventMap>>(null);
  const [activeArcs, setActiveArcs] = useState<ActiveArcData[]>([]);

  // Use the shared weapon tracking logic
  const { instanceId } = useWeaponTracking({
    weaponInstance,
    position,
    rotation,
    // Use type assertion here:
    weaponRef: coilRef as RefObject<Group<Object3DEventMap>>,
    barrelLength: 0,
    fireOffsetY: 0.7,
    onFire: (firePosition, targetId) => {
      if (!targetId) return;

      const arcId = `${instanceId}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 7)}`;
      setActiveArcs((prevArcs) => [
        ...prevArcs,
        {
          id: arcId,
          position: firePosition,
          rotation: coilRef.current?.rotation.y ?? 0,
          targetId: targetId,
          damage: weaponInstance.damage,
          range: weaponInstance.range,
        },
      ]);
    },
  });

  const removeArc = (id: string) => {
    setActiveArcs((prevArcs) => prevArcs.filter((arc) => arc.id !== id));
  };

  useEffect(() => {
    debug.log(`Tesla Coil instance ${instanceId} mounted.`);
    return () => {
      debug.log(`Tesla Coil instance ${instanceId} unmounted`);
      setActiveArcs([]);
    };
  }, [instanceId]);

  // Apply position and rotation to the group
  useEffect(() => {
    if (coilRef.current) {
      coilRef.current.position.set(...position);
      coilRef.current.rotation.set(0, rotation, 0);
    }
  }, [position, rotation]);

  // Model definition
  const baseColor = "#282828";
  const metalColor = "#606065";
  const coilColor = "#B04020";
  const conductorColor = "#C0C0C0";
  const insulatorColor = "#756550";
  const glowColor = "#80EEFF";

  return (
    <>
      {/* Tesla Coil weapon model Group */}
      <group ref={coilRef} scale={0.9}>
        {/* Base Plate */}
        <Box
          args={[0.45, 0.1, 0.85]}
          position={[0, -0.05, 0]}
          castShadow
          receiveShadow>
          <meshStandardMaterial
            color={baseColor}
            metalness={0.5}
            roughness={0.5}
          />
        </Box>
        {/* Lower Support Cylinder */}
        <Cylinder
          args={[0.22, 0.24, 0.15, 16]}
          position={[0, 0.075, 0]}
          castShadow
          receiveShadow>
          <meshStandardMaterial
            color={metalColor}
            metalness={0.8}
            roughness={0.3}
          />
        </Cylinder>

        {/* Main Coil Insulator Base */}
        <Cylinder
          args={[0.2, 0.2, 0.1, 8]}
          position={[0, 0.175, 0]}
          castShadow
          receiveShadow>
          <meshStandardMaterial
            color={insulatorColor}
            metalness={0.1}
            roughness={0.6}
          />
        </Cylinder>

        {/* Primary Coil Windings (Solid Cylinder for appearance) */}
        <Cylinder
          args={[0.18, 0.18, 0.4, 16]}
          position={[0, 0.425, 0]}
          castShadow
          receiveShadow>
          <meshStandardMaterial
            color={coilColor}
            metalness={0.7}
            roughness={0.4}
            wireframe={false}
          />
        </Cylinder>
        {/* Secondary Coil Winding Detail (Thin Torus Rings) */}
        {[...Array(8)].map((_, i) => (
          <Torus
            key={`coil-ring-${i}`}
            args={[0.185, 0.01, 8, 24]}
            position={[0, 0.25 + i * 0.05, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
            receiveShadow>
            <meshStandardMaterial
              color="#D06040"
              metalness={0.6}
              roughness={0.5}
            />
          </Torus>
        ))}

        {/* Top Insulator */}
        <Cylinder
          args={[0.12, 0.12, 0.08, 8]}
          position={[0, 0.625, 0]}
          castShadow
          receiveShadow>
          <meshStandardMaterial
            color={insulatorColor}
            metalness={0.1}
            roughness={0.6}
          />
        </Cylinder>

        {/* Top Torus Conductor */}
        <Torus
          args={[0.18, 0.06, 12, 32]}
          position={[0, 0.7, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow
          receiveShadow>
          <meshStandardMaterial
            color={conductorColor}
            metalness={0.95}
            roughness={0.1}
          />
        </Torus>

        {/* Electric Glow for Emitter */}
        <Sphere args={[0.12, 24, 24]} position={[0, 0.7, 0]}>
          <meshStandardMaterial
            color={glowColor}
            emissive={glowColor}
            emissiveIntensity={1.8}
            transparent={true}
            opacity={0.6}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </Sphere>

        {/* Side Supports (simplified) */}
        {[1, -1].map((sign) => (
          <Cylinder
            key={sign}
            args={[0.04, 0.04, 0.55, 8]}
            position={[sign * 0.21, 0.35, 0]}
            rotation={[0, 0, (Math.PI / 12) * -sign]}
            castShadow
            receiveShadow>
            <meshStandardMaterial
              color={metalColor}
              metalness={0.8}
              roughness={0.3}
            />
          </Cylinder>
        ))}

        {/* Power Indicator Light */}
        <Box args={[0.05, 0.05, 0.05]} position={[0, 0.175, 0.4]}>
          <meshStandardMaterial
            color="#00FFFF"
            emissive="#00FFFF"
            emissiveIntensity={2.0}
            toneMapped={false}
          />
        </Box>
        {/* Cosmetic bolt details on base */}
        {[0.3, -0.3].map((zOff) =>
          [0.18, -0.18].map((xOff) => (
            <Cylinder
              key={`${xOff}-${zOff}`}
              args={[0.02, 0.02, 0.12, 6]}
              position={[xOff, -0.05, zOff]}
              rotation={[Math.PI / 2, 0, 0]}>
              <meshStandardMaterial
                color="#1a1a1a"
                metalness={0.8}
                roughness={0.5}
              />
            </Cylinder>
          ))
        )}
      </group>

      {/* Render tesla arcs */}
      {activeArcs.map((arc) => (
        <TeslaArc
          key={arc.id}
          id={arc.id}
          position={arc.position}
          rotation={arc.rotation}
          damage={arc.damage}
          targetId={arc.targetId}
          range={arc.range}
          onRemove={removeArc}
        />
      ))}
    </>
  );
};

export default TeslaCoil;

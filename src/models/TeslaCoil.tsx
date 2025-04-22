import { useRef, useEffect } from "react";
import { Box, Cylinder, Sphere } from "@react-three/drei";
import { Group } from "three";
import { useGameState, SecondaryWeapon } from "../utils/gameState";
import { debug } from "../utils/debug";
import TeslaArc from "./TeslaArc";
import { useWeaponTracking } from "../utils/weaponTracking";

interface TeslaCoilProps {
  weaponInstance: SecondaryWeapon;
  position: [number, number, number];
  rotation: number;
}

const TeslaCoil = ({ weaponInstance, position, rotation }: TeslaCoilProps) => {
  const coilRef = useRef<Group>(null);
  const arcsRef = useRef<
    {
      id: string;
      position: [number, number, number];
      rotation: number;
      targetId: string;
    }[]
  >([]);

  // Use the shared weapon tracking logic
  const { instanceId } = useWeaponTracking({
    weaponInstance,
    position,
    rotation,
    weaponRef: coilRef as React.RefObject<Group>,
    barrelLength: 1.2,
    fireOffsetY: 0.3,
    onFire: (firePosition, targetId) => {
      if (!targetId) return;

      const arcId = Math.random().toString(36).substr(2, 9);
      arcsRef.current.push({
        id: arcId,
        position: firePosition,
        rotation: coilRef.current?.rotation.y ?? 0,
        targetId: targetId,
      });

      debug.log(`Tesla Coil ${instanceId} firing at enemy ${targetId}`);
    },
  });

  const removeArc = (id: string) => {
    arcsRef.current = arcsRef.current.filter((arc) => arc.id !== id);
  };

  useEffect(() => {
    debug.log(`Tesla Coil instance ${instanceId} mounted.`);
    return () => {
      debug.log(`Tesla Coil instance ${instanceId} unmounted`);
    };
  }, [instanceId]);

  return (
    <>
      {/* Tesla Coil weapon model */}
      <group ref={coilRef}>
        {/* Base */}
        <Box args={[0.25, 0.1, 0.75]} position={[0, -0.05, 0.3]} castShadow>
          <meshStandardMaterial
            color="#303030"
            metalness={0.7}
            roughness={0.2}
          />
        </Box>

        {/* Main coil housing */}
        <Cylinder
          args={[0.14, 0.18, 0.6, 12]}
          position={[0, 0.2, 0.3]}
          rotation={[0, 0, 0]}
          castShadow>
          <meshStandardMaterial
            color="#505050"
            metalness={0.8}
            roughness={0.3}
          />
        </Cylinder>

        {/* Coil windings */}
        <Cylinder
          args={[0.16, 0.16, 0.4, 12]}
          position={[0, 0.2, 0.3]}
          rotation={[0, 0, 0]}
          castShadow>
          <meshStandardMaterial
            color="#CC3311"
            metalness={0.6}
            roughness={0.4}
          />
        </Cylinder>

        {/* Top conductor */}
        <Sphere args={[0.1, 16, 16]} position={[0, 0.55, 0.3]} castShadow>
          <meshStandardMaterial
            color="#AAAAAA"
            metalness={0.9}
            roughness={0.1}
          />
        </Sphere>

        {/* Electric glow */}
        <Sphere args={[0.12, 16, 16]} position={[0, 0.55, 0.3]} castShadow>
          <meshStandardMaterial
            color="#80EEFF"
            emissive="#80EEFF"
            emissiveIntensity={1.0}
            transparent={true}
            opacity={0.6}
          />
        </Sphere>

        {/* Side conduits */}
        <Box args={[0.05, 0.3, 0.05]} position={[0.12, 0.2, 0.3]} castShadow>
          <meshStandardMaterial color="#707070" />
        </Box>
        <Box args={[0.05, 0.3, 0.05]} position={[-0.12, 0.2, 0.3]} castShadow>
          <meshStandardMaterial color="#707070" />
        </Box>

        {/* Power indicator */}
        <Box args={[0.03, 0.03, 0.05]} position={[0, 0, 0.65]} castShadow>
          <meshStandardMaterial
            color="#00FFFF"
            emissive="#00FFFF"
            emissiveIntensity={1.0}
          />
        </Box>
      </group>

      {/* Render tesla arcs */}
      {arcsRef.current.map((arc) => (
        <TeslaArc
          key={arc.id}
          id={arc.id}
          position={arc.position}
          rotation={arc.rotation}
          damage={weaponInstance.damage}
          targetId={arc.targetId}
          range={weaponInstance.range}
          onRemove={removeArc}
        />
      ))}
    </>
  );
};

export default TeslaCoil;

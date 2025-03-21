import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Box, Cylinder } from "@react-three/drei";
import { Mesh, Vector3 } from "three";
import { useKeyboardControls } from "../hooks/useKeyboardControls";
import { useGameState } from "../utils/gameState";
import Projectile from "./Projectile";

interface TankProps {
  position: [number, number, number];
  onPositionChange?: (position: [number, number, number]) => void;
}

const Tank = ({ position = [0, 0, 0], onPositionChange }: TankProps) => {
  const tankRef = useRef<Mesh>(null);
  const turretRef = useRef<Mesh>(null);
  const [tankRotation, setTankRotation] = useState(0);
  const [turretRotation, setTurretRotation] = useState(0);
  const [projectiles, setProjectiles] = useState<
    { id: string; position: [number, number, number]; rotation: number }[]
  >([]);
  const [lastShootTime, setLastShootTime] = useState(0);

  // Get keyboard controls
  const { forward, backward, left, right, turretLeft, turretRight, shoot } =
    useKeyboardControls();

  // Get game state
  const { playerDamage, isPaused } = useGameState((state) => ({
    playerDamage: state.playerDamage,
    isPaused: state.isPaused,
  }));

  // Set initial position
  useEffect(() => {
    if (tankRef.current) {
      tankRef.current.position.set(...position);
    }
  }, []);

  // Tank movement and rotation
  useFrame((state, delta) => {
    if (!tankRef.current || isPaused) return;

    // Rotation
    if (left) {
      setTankRotation((prev) => prev + delta * 2);
    }
    if (right) {
      setTankRotation((prev) => prev - delta * 2);
    }

    // Apply rotation
    tankRef.current.rotation.y = tankRotation;

    // Movement
    const moveSpeed = 3;
    let moved = false;

    if (forward) {
      tankRef.current.position.x += Math.sin(tankRotation) * delta * moveSpeed;
      tankRef.current.position.z += Math.cos(tankRotation) * delta * moveSpeed;
      moved = true;
    }
    if (backward) {
      tankRef.current.position.x -= Math.sin(tankRotation) * delta * moveSpeed;
      tankRef.current.position.z -= Math.cos(tankRotation) * delta * moveSpeed;
      moved = true;
    }

    // Turret rotation
    if (turretRef.current) {
      if (turretLeft) {
        setTurretRotation((prev) => prev + delta);
      }
      if (turretRight) {
        setTurretRotation((prev) => prev - delta);
      }
      turretRef.current.rotation.y = turretRotation;
    }

    // Handle shooting
    if (shoot && state.clock.getElapsedTime() - lastShootTime > 0.5) {
      // Can shoot every 0.5 seconds
      const shootPosition: [number, number, number] = [
        tankRef.current.position.x +
          Math.sin(tankRotation + turretRotation) * 1.5,
        tankRef.current.position.y + 0.7,
        tankRef.current.position.z +
          Math.cos(tankRotation + turretRotation) * 1.5,
      ];

      // Add new projectile
      setProjectiles((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substr(2, 9),
          position: shootPosition,
          rotation: tankRotation + turretRotation,
        },
      ]);

      setLastShootTime(state.clock.getElapsedTime());
    }

    // Notify parent of position change
    if (moved && onPositionChange) {
      onPositionChange([
        tankRef.current.position.x,
        tankRef.current.position.y,
        tankRef.current.position.z,
      ]);
    }
  });

  // Remove projectiles that are too far away
  const removeProjectile = (id: string) => {
    setProjectiles((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <>
      <group position={new Vector3(...position)} ref={tankRef}>
        {/* Tank body */}
        <Box args={[1.5, 0.5, 2]} castShadow receiveShadow>
          <meshStandardMaterial color="green" />
        </Box>

        {/* Tank turret */}
        <group position={[0, 0.5, 0]} ref={turretRef}>
          <Cylinder
            args={[0.6, 0.6, 0.4, 16]}
            position={[0, 0.2, 0]}
            castShadow>
            <meshStandardMaterial color="darkgreen" />
          </Cylinder>

          {/* Tank cannon */}
          <Box args={[0.2, 0.2, 1.5]} position={[0, 0.2, 1]} castShadow>
            <meshStandardMaterial color="darkgreen" />
          </Box>
        </group>

        {/* Tank tracks */}
        <Box
          args={[1.7, 0.2, 2.2]}
          position={[0, -0.3, 0]}
          castShadow
          receiveShadow>
          <meshStandardMaterial color="black" />
        </Box>
      </group>

      {/* Projectiles */}
      {projectiles.map((projectile) => (
        <Projectile
          key={projectile.id}
          id={projectile.id}
          position={projectile.position}
          rotation={projectile.rotation}
          damage={playerDamage}
          onRemove={removeProjectile}
        />
      ))}
    </>
  );
};

export default Tank;

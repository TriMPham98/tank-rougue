import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Box, Cylinder } from "@react-three/drei";
import { Mesh, Vector3, Group } from "three";
import { useKeyboardControls } from "../hooks/useKeyboardControls";
import { useGameState } from "../utils/gameState";
import Projectile from "./Projectile";

interface TankProps {
  position: [number, number, number];
}

const Tank = ({ position = [0, 0, 0] }: TankProps) => {
  const tankRef = useRef<Group>(null);
  const turretRef = useRef<Group>(null);

  // Use refs instead of state for values that shouldn't trigger renders
  const tankRotationRef = useRef(0);
  const turretRotationRef = useRef(0);
  const lastShootTimeRef = useRef(0);
  const positionRef = useRef<[number, number, number]>([...position]);

  // Add a ref to track if tank is already initialized
  const isInitializedRef = useRef(false);

  // Keep projectiles in state since we need to render them
  const [projectiles, setProjectiles] = useState<
    { id: string; position: [number, number, number]; rotation: number }[]
  >([]);

  // Get keyboard controls
  const { forward, backward, left, right, turretLeft, turretRight, shoot } =
    useKeyboardControls();

  // Get game state - only get what's needed
  const playerDamage = useGameState((state) => state.playerDamage);
  const isPaused = useGameState((state) => state.isPaused);
  const updatePlayerPosition = useGameState(
    (state) => state.updatePlayerPosition
  );

  // Set initial position once
  useEffect(() => {
    if (tankRef.current && !isInitializedRef.current) {
      // Only initialize once
      isInitializedRef.current = true;

      tankRef.current.position.x = position[0];
      tankRef.current.position.y = position[1];
      tankRef.current.position.z = position[2];

      // Update initial position in the game state - only once at startup
      const initialPos: [number, number, number] = [
        tankRef.current.position.x,
        tankRef.current.position.y,
        tankRef.current.position.z,
      ];
      positionRef.current = initialPos;
      updatePlayerPosition(initialPos);
      console.log("Tank initialized at position:", initialPos);
    }

    // Return cleanup function to preserve state during HMR
    return () => {
      // Don't reset isInitialized on unmount to prevent reinitializing on HMR
      console.log("Tank component cleanup - preserve position state");
    };
  }, [position, updatePlayerPosition]);

  // Tank movement and rotation - minimizing state updates
  useFrame((state, delta) => {
    if (!tankRef.current || isPaused) return;

    // More detailed debug logging
    if (
      forward ||
      backward ||
      left ||
      right ||
      turretLeft ||
      turretRight ||
      shoot
    ) {
      console.log("Control states:", {
        forward,
        backward,
        left,
        right,
        turretLeft,
        turretRight,
        shoot,
      });
    }

    // Rotation - directly modify the ref instead of using setState
    if (left) {
      tankRotationRef.current += delta * 2;
    }
    if (right) {
      tankRotationRef.current -= delta * 2;
    }

    // Apply rotation directly to the mesh
    tankRef.current.rotation.y = tankRotationRef.current;

    // Movement
    const moveSpeed = 3;
    let moved = false;

    if (forward) {
      // Log position before movement
      console.log("Before move - Position:", [
        tankRef.current.position.x,
        tankRef.current.position.y,
        tankRef.current.position.z,
      ]);

      tankRef.current.position.x +=
        Math.sin(tankRotationRef.current) * delta * moveSpeed;
      tankRef.current.position.z +=
        Math.cos(tankRotationRef.current) * delta * moveSpeed;
      moved = true;

      // Log position after movement
      console.log("After move - Position:", [
        tankRef.current.position.x,
        tankRef.current.position.y,
        tankRef.current.position.z,
      ]);
    }
    if (backward) {
      tankRef.current.position.x -=
        Math.sin(tankRotationRef.current) * delta * moveSpeed;
      tankRef.current.position.z -=
        Math.cos(tankRotationRef.current) * delta * moveSpeed;
      moved = true;
    }

    // Turret rotation - directly modify the ref
    if (turretRef.current) {
      if (turretLeft) {
        turretRotationRef.current += delta;
      }
      if (turretRight) {
        turretRotationRef.current -= delta;
      }
      turretRef.current.rotation.y = turretRotationRef.current;
    }

    // Handle shooting - use ref for timing check
    if (
      shoot &&
      state.clock.getElapsedTime() - lastShootTimeRef.current > 0.5
    ) {
      // Can shoot every 0.5 seconds
      const shootPosition: [number, number, number] = [
        tankRef.current.position.x +
          Math.sin(tankRotationRef.current + turretRotationRef.current) * 1.5,
        tankRef.current.position.y + 0.7,
        tankRef.current.position.z +
          Math.cos(tankRotationRef.current + turretRotationRef.current) * 1.5,
      ];

      // Add new projectile
      setProjectiles((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substr(2, 9),
          position: shootPosition,
          rotation: tankRotationRef.current + turretRotationRef.current,
        },
      ]);

      lastShootTimeRef.current = state.clock.getElapsedTime();
    }

    // Update position in game state if moved - throttle updates
    if (moved) {
      const newPosition: [number, number, number] = [
        tankRef.current.position.x,
        tankRef.current.position.y,
        tankRef.current.position.z,
      ];

      // Only update if position changed significantly (more than 0.01 units in any direction)
      if (
        Math.abs(positionRef.current[0] - newPosition[0]) > 0.01 ||
        Math.abs(positionRef.current[1] - newPosition[1]) > 0.01 ||
        Math.abs(positionRef.current[2] - newPosition[2]) > 0.01
      ) {
        positionRef.current = newPosition;
        updatePlayerPosition(newPosition);
        console.log("Updated position:", newPosition);
      }
    }
  });

  // Remove projectiles that are too far away
  const removeProjectile = (id: string) => {
    setProjectiles((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <>
      <group ref={tankRef}>
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

import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Box, Cylinder } from "@react-three/drei";
import { Group, Vector3 } from "three";
import { useKeyboardControls } from "../hooks/useKeyboardControls";
import { useGameState } from "../utils/gameState";
import { debug } from "../utils/debug";
import Projectile from "./Projectile";
import SniperRifle from "./SniperRifle"; // Assume updated path/component
import Shotgun from "./Shotgun"; // Assume updated path/component
import LaserWeapon from "./LaserWeapon"; // Assume updated path/component
import RocketLauncher from "./RocketLauncher"; // Assume updated path/component
import { WeaponInstance } from "../utils/weaponTypes"; // Assuming you have this type

interface TankProps {
  position: [number, number, number];
}

// Define constants for side weapon placement
const SIDE_WEAPON_DISTANCE = 2.0; // Distance from the tank center
const SIDE_WEAPON_Y_OFFSET = 0.2; // Vertical offset from tank base
const MAX_SIDE_WEAPONS = 4;

// Helper type for the weapon component map
type WeaponComponentType = React.ComponentType<{
  weaponInstance: WeaponInstance;
  position: [number, number, number];
  rotation: number;
  // Add other props if needed by specific weapon components (e.g., key)
}>;

// Map weapon IDs to their components
// Ensure these components are updated to accept `position` and `rotation` props
const WeaponComponents: Record<string, WeaponComponentType> = {
  sniper: SniperRifle,
  shotgun: Shotgun,
  laser: LaserWeapon,
  rocket: RocketLauncher,
};

const Tank = ({ position = [0, 0, 0] }: TankProps) => {
  const tankRef = useRef<Group>(null);
  const turretRef = useRef<Group>(null);

  const tankRotationRef = useRef(Math.PI);
  const turretRotationRef = useRef(0);
  const lastShootTimeRef = useRef(0);
  const positionRef = useRef<[number, number, number]>([...position]);
  const isInitializedRef = useRef(false);

  const [projectiles, setProjectiles] = useState<
    { id: string; position: [number, number, number]; rotation: number }[]
  >([]);

  const { forward, backward, left, right, turretLeft, turretRight, shoot } =
    useKeyboardControls();

  const playerTurretDamage = useGameState((state) => state.playerTurretDamage);
  const playerSpeed = useGameState((state) => state.playerSpeed);
  const playerFireRate = useGameState((state) => state.playerFireRate);
  const playerHealthRegen = useGameState((state) => state.playerHealthRegen);
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const updatePlayerPosition = useGameState(
    (state) => state.updatePlayerPosition
  );
  const healPlayer = useGameState((state) => state.healPlayer);
  const selectedWeapons = useGameState((state) => state.selectedWeapons);
  const terrainObstacles = useGameState((state) => state.terrainObstacles);

  // Get the first N weapons to be placed around the tank
  const sideWeapons = selectedWeapons.slice(0, MAX_SIDE_WEAPONS);

  // --- Collision Check (Unchanged) ---
  const checkTerrainCollision = (newX: number, newZ: number): boolean => {
    const mapSize = 50;
    if (Math.abs(newX) > mapSize - 1 || Math.abs(newZ) > mapSize - 1) {
      return true;
    }
    const tankPosition = new Vector3(newX, 0, newZ);
    const tankRadius = 1.25;
    for (const obstacle of terrainObstacles) {
      const obstaclePos = new Vector3(
        obstacle.position[0],
        0,
        obstacle.position[2]
      );
      const distance = obstaclePos.distanceTo(tankPosition);
      const obstacleRadius = obstacle.size * 0.75;
      if (distance < tankRadius + obstacleRadius) {
        return true;
      }
    }
    return false;
  };

  // --- Effects (Unchanged, removed logging for brevity) ---
  useEffect(() => {
    if (playerHealthRegen <= 0) return;
    const interval = setInterval(() => {
      if (!isPaused && !isGameOver) {
        healPlayer(playerHealthRegen);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [playerHealthRegen, healPlayer, isPaused, isGameOver]);

  useEffect(() => {
    if (tankRef.current && !isInitializedRef.current) {
      isInitializedRef.current = true;
      tankRef.current.position.fromArray(position);
      const initialPos: [number, number, number] = [
        tankRef.current.position.x,
        tankRef.current.position.y,
        tankRef.current.position.z,
      ];
      positionRef.current = initialPos;
      updatePlayerPosition(initialPos);
      debug.log("Tank initialized at position:", initialPos);
    }
    return () => {
      debug.log("Tank component cleanup - preserve position state");
    };
  }, [position, updatePlayerPosition]);

  // --- Frame Loop (Main turret shooting and movement logic unchanged) ---
  useFrame((state, delta) => {
    if (!tankRef.current || isPaused || isGameOver) return;

    // Rotation
    if (left) tankRotationRef.current += delta * 3.5;
    if (right) tankRotationRef.current -= delta * 3.5;
    tankRef.current.rotation.y = tankRotationRef.current;

    // Movement
    let moved = false;
    const moveSpeed = playerSpeed;
    if (forward || backward) {
      const moveDirection = forward ? 1 : -1;
      const potentialX =
        tankRef.current.position.x +
        Math.sin(tankRotationRef.current) * delta * moveSpeed * moveDirection;
      const potentialZ =
        tankRef.current.position.z +
        Math.cos(tankRotationRef.current) * delta * moveSpeed * moveDirection;
      if (!checkTerrainCollision(potentialX, potentialZ)) {
        tankRef.current.position.x = potentialX;
        tankRef.current.position.z = potentialZ;
        moved = true;
      }
    }

    // Turret rotation
    if (turretRef.current) {
      if (turretLeft) turretRotationRef.current += delta * 2.5;
      if (turretRight) turretRotationRef.current -= delta * 2.5;
      turretRef.current.rotation.y = turretRotationRef.current;
    }

    // Main turret auto-shooting
    const currentTime = state.clock.getElapsedTime();
    const timeSinceLastShot = currentTime - lastShootTimeRef.current;

    if (timeSinceLastShot >= playerFireRate) {
      const shotsMissed = Math.floor(timeSinceLastShot / playerFireRate);
      if (shotsMissed > 0) {
        const shootPosition: [number, number, number] = [
          tankRef.current.position.x +
            Math.sin(tankRotationRef.current + turretRotationRef.current) * 1.5,
          tankRef.current.position.y + 0.7, // Turret height offset
          tankRef.current.position.z +
            Math.cos(tankRotationRef.current + turretRotationRef.current) * 1.5,
        ];
        setProjectiles((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 9),
            position: shootPosition,
            rotation: tankRotationRef.current + turretRotationRef.current,
          },
        ]);
        lastShootTimeRef.current =
          currentTime - (timeSinceLastShot % playerFireRate);
      }
    }

    // Log manual shoot button press if needed
    if (shoot) {
      debug.log(`Shoot button pressed (main turret auto-fires)`);
    }

    // Update position in game state if moved significantly
    if (moved) {
      const newPosition: [number, number, number] = [
        tankRef.current.position.x,
        tankRef.current.position.y,
        tankRef.current.position.z,
      ];
      if (
        Math.abs(positionRef.current[0] - newPosition[0]) > 0.01 ||
        Math.abs(positionRef.current[1] - newPosition[1]) > 0.01 ||
        Math.abs(positionRef.current[2] - newPosition[2]) > 0.01
      ) {
        positionRef.current = newPosition;
        updatePlayerPosition(newPosition);
      }
    }
    // Update positionRef even if not moved significantly, so side weapons follow precisely
    else if (tankRef.current) {
      positionRef.current = [
        tankRef.current.position.x,
        tankRef.current.position.y,
        tankRef.current.position.z,
      ];
    }
  });

  const removeProjectile = (id: string) => {
    setProjectiles((prev) => prev.filter((p) => p.id !== id));
  };

  // Calculate current tank properties needed for side weapons
  // Doing this outside useFrame but before return ensures they have latest ref values for this render pass
  const currentTankPositionVec = new Vector3(...positionRef.current);
  const currentTankRotation = tankRotationRef.current; // Use the body rotation

  return (
    <>
      {/* Tank Mesh Group (Unchanged) */}
      <group ref={tankRef}>
        {/* Tank body */}
        <Box args={[1.5, 0.5, 2]} castShadow receiveShadow position={[0, 0, 0]}>
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
          <Box args={[0.2, 0.2, 1.5]} position={[0, 0.2, 1]} castShadow>
            <meshStandardMaterial color="darkgreen" />
          </Box>
        </group>
        {/* Tank tracks */}
        <Box
          args={[0.3, 0.2, 2.2]}
          position={[-0.7, -0.3, 0]}
          castShadow
          receiveShadow>
          <meshStandardMaterial color="black" />
        </Box>
        <Box
          args={[0.3, 0.2, 2.2]}
          position={[0.7, -0.3, 0]}
          castShadow
          receiveShadow>
          <meshStandardMaterial color="black" />
        </Box>
      </group>

      {/* Main Turret Projectiles (Unchanged) */}
      {projectiles.map((projectile) => (
        <Projectile
          key={projectile.id}
          id={projectile.id}
          position={projectile.position}
          rotation={projectile.rotation}
          damage={playerTurretDamage}
          onRemove={removeProjectile}
        />
      ))}

      {/* Render Side Weapons */}
      {sideWeapons.map((weapon, index) => {
        // Determine the component to render
        const WeaponComponent = WeaponComponents[weapon.id];
        if (!WeaponComponent) {
          console.warn(`No component found for weapon ID: ${weapon.id}`);
          return null; // Skip if component not found
        }

        // Calculate position based on index (0: front, 1: back, 2: left, 3: right)
        let offsetX = 0;
        let offsetZ = 0;
        const angle = currentTankRotation;
        const dist = SIDE_WEAPON_DISTANCE;

        switch (index) {
          case 0: // Front
            offsetX = dist * Math.sin(angle);
            offsetZ = dist * Math.cos(angle);
            break;
          case 1: // Back
            offsetX = -dist * Math.sin(angle);
            offsetZ = -dist * Math.cos(angle);
            break;
          case 2: // Left
            offsetX = -dist * Math.cos(angle); // Corrected from sin/cos mixup
            offsetZ = dist * Math.sin(angle); // Corrected from sin/cos mixup
            break;
          case 3: // Right
            offsetX = dist * Math.cos(angle); // Corrected from sin/cos mixup
            offsetZ = -dist * Math.sin(angle); // Corrected from sin/cos mixup
            break;
        }

        const weaponPosition: [number, number, number] = [
          currentTankPositionVec.x + offsetX,
          currentTankPositionVec.y + SIDE_WEAPON_Y_OFFSET, // Use defined Y offset
          currentTankPositionVec.z + offsetZ,
        ];

        return (
          <WeaponComponent
            // Use a stable key if possible (instanceId is good)
            key={weapon.instanceId || `side-weapon-${index}`}
            weaponInstance={weapon}
            position={weaponPosition} // Pass the calculated absolute world position
            rotation={currentTankRotation} // Pass the tank's body rotation
          />
        );
      })}
    </>
  );
};

export default Tank;

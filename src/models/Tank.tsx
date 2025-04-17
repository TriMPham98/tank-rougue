import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Box, Cylinder, Sphere } from "@react-three/drei";
import { Group, Vector3 } from "three";
import { useKeyboardControls } from "../hooks/useKeyboardControls";
import { useGameState, SecondaryWeapon } from "../utils/gameState";
import { debug } from "../utils/debug";
import { useSound, resetSoundTimer } from "../utils/sound";
import Projectile from "./Projectile";
import SniperRifle from "./SniperRifle";
import Shotgun from "./Shotgun";
import LaserWeapon from "./LaserWeapon";
import RocketLauncher from "./RocketLauncher";
import { WeaponInstance } from "../utils/weaponTypes";

interface TankProps {
  position: [number, number, number];
}

const SIDE_WEAPON_DISTANCE = 2.25;
const SIDE_WEAPON_Y_OFFSET = 0.2;
const MAX_SIDE_WEAPONS = 4;

type WeaponComponentType = React.ComponentType<{
  weaponInstance: WeaponInstance;
  position: [number, number, number];
  rotation: number;
}>;

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

  const {
    forward: keyForward,
    backward: keyBackward,
    left: keyLeft,
    right: keyRight,
    turretLeft: keyTurretLeft,
    turretRight: keyTurretRight,
    shoot: keyShoot,
  } = useKeyboardControls();

  // Select the entire state object
  const {
    moveX, // Absolute X from joystick
    moveZ, // Absolute Z from joystick
    forward, // Relative forward/backward (for potential fallback/other uses)
    strafe, // Relative strafe (for potential fallback/other uses)
    turretRotation: touchTurretRotation,
    isFiring: touchIsFiring,
    playerTurretDamage,
    playerSpeed,
    playerFireRate,
    playerHealthRegen,
    isPaused,
    isGameOver,
    updatePlayerPosition,
    healPlayer,
    selectedWeapons,
    terrainObstacles,
  } = useGameState(); // Still select entire state for simplicity

  const sound = useSound();

  const sideWeapons = selectedWeapons.slice(0, MAX_SIDE_WEAPONS);

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

  useEffect(() => {
    resetSoundTimer("playerCannon");
  }, [playerFireRate]);

  useFrame((state, delta) => {
    if (!tankRef.current || isPaused || isGameOver) return;

    let moved = false;
    const moveSpeed = playerSpeed;
    const turnSpeed = 3.5; // Rotation speed factor

    // --- Tank Rotation ---
    let targetRotation = tankRotationRef.current; // Initialize with current rotation
    // let applyRotationSmoothing = false; // Smoothing disabled for diagnostics

    if (keyLeft) {
      // Keyboard rotation takes precedence
      tankRotationRef.current += delta * turnSpeed;
    } else if (keyRight) {
      // Keyboard rotation takes precedence
      tankRotationRef.current -= delta * turnSpeed;
    } else if ((moveX !== 0 || moveZ !== 0) && !keyForward && !keyBackward) {
      // Joystick Rotation (if no keyboard movement/rotation)
      // Target direction based on absolute joystick input
      targetRotation = Math.atan2(moveX, moveZ);
      // applyRotationSmoothing = true; // Smoothing disabled

      // --- DIAGNOSTIC: Set rotation directly ---
      tankRotationRef.current = targetRotation;
      // --- END DIAGNOSTIC ---
    }

    // Apply smoothed rotation towards target if needed
    /* --- SMOOTHING DISABLED FOR DIAGNOSTICS --- 
    if (applyRotationSmoothing) {
      const rotationDiff = targetRotation - tankRotationRef.current;
      // Wrap the angle difference to the range [-PI, PI] to find shortest path
      let wrappedDiff = ((rotationDiff + Math.PI) % (Math.PI * 2)) - Math.PI;

      // Use linear interpolation (lerp) towards the target along the shortest path
      const lerpFactor = Math.min(1, delta * turnSpeed * 2.0); // Adjust multiplier as needed, cap at 1
      const snapThreshold = 0.01; // Small threshold to prevent micro-oscillations

      if (Math.abs(wrappedDiff) < snapThreshold) {
          // Snap if very close
          tankRotationRef.current = targetRotation;
      } else {
          // Lerp towards the target angle
          tankRotationRef.current += wrappedDiff * lerpFactor;
      }
    }
    */ // --- END SMOOTHING DISABLED ---

    // Normalize the final tank rotation to be within [0, 2*PI)
    tankRotationRef.current =
      (tankRotationRef.current + Math.PI * 2) % (Math.PI * 2);
    tankRef.current.rotation.y = tankRotationRef.current;

    // --- Tank Movement ---
    let potentialX = tankRef.current.position.x;
    let potentialZ = tankRef.current.position.z;
    let movementMagnitude = 0;

    if (keyForward || keyBackward) {
      // Keyboard movement (Relative Forward/Backward)
      movementMagnitude = keyForward ? 1 : -1;
      potentialX +=
        Math.sin(tankRotationRef.current) *
        delta *
        moveSpeed *
        movementMagnitude;
      potentialZ +=
        Math.cos(tankRotationRef.current) *
        delta *
        moveSpeed *
        movementMagnitude;
    } else if (moveX !== 0 || moveZ !== 0) {
      // Joystick movement (Move forward in the direction tank is facing)
      // Calculate magnitude from joystick vector length, clamp to 1
      movementMagnitude = Math.min(1, Math.sqrt(moveX * moveX + moveZ * moveZ));
      potentialX +=
        Math.sin(tankRotationRef.current) *
        delta *
        moveSpeed *
        movementMagnitude;
      potentialZ +=
        Math.cos(tankRotationRef.current) *
        delta *
        moveSpeed *
        movementMagnitude;
    }

    // Apply movement if magnitude > 0, no collision, and position changed
    if (
      movementMagnitude !== 0 &&
      (potentialX !== tankRef.current.position.x ||
        potentialZ !== tankRef.current.position.z) &&
      !checkTerrainCollision(potentialX, potentialZ)
    ) {
      tankRef.current.position.x = potentialX;
      tankRef.current.position.z = potentialZ;
      moved = true;
    }

    if (turretRef.current) {
      if (keyTurretLeft) turretRotationRef.current += delta * 2.5;
      if (keyTurretRight) turretRotationRef.current -= delta * 2.5;

      if (touchTurretRotation !== null) {
        turretRotationRef.current =
          touchTurretRotation - tankRotationRef.current;
      }

      turretRef.current.rotation.y = turretRotationRef.current;
    }

    const currentTime = state.clock.getElapsedTime();
    const timeSinceLastShot = currentTime - lastShootTimeRef.current;
    const isShootingRequested = keyShoot || touchIsFiring;

    if (timeSinceLastShot >= playerFireRate) {
      const shotsMissed = Math.floor(timeSinceLastShot / playerFireRate);
      if (shotsMissed > 0) {
        const shootPosition: [number, number, number] = [
          tankRef.current.position.x +
            Math.sin(tankRotationRef.current + turretRotationRef.current) *
              2.15,
          tankRef.current.position.y + 0.75,
          tankRef.current.position.z +
            Math.cos(tankRotationRef.current + turretRotationRef.current) *
              2.15,
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

        sound.setVolume("playerCannon", 0.2);
        sound.play("playerCannon");
      }
    }

    if (isShootingRequested) {
      debug.log(`Shoot button pressed (main turret auto-fires)`);
    }

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
    } else if (tankRef.current) {
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

  const currentTankPositionVec = new Vector3(...positionRef.current);
  const currentTankRotation = tankRotationRef.current;

  return (
    <>
      <group ref={tankRef}>
        {/* Tank Body - Slightly larger with angled armor */}
        <Box
          args={[1.8, 0.6, 2.2]}
          position={[0, 0, 0]}
          castShadow
          receiveShadow>
          <meshStandardMaterial
            color="#2E8B57"
            metalness={0.3}
            roughness={0.7}
          />
        </Box>
        {/* Sloped Rear Armor */}
        <Box
          args={[1.2, 0.4, 0.5]}
          position={[0, 0.2, -1.35]}
          rotation={[Math.PI / 6, 0, 0]}
          castShadow
          receiveShadow>
          <meshStandardMaterial
            color="#2E8B57"
            metalness={0.3}
            roughness={0.7}
          />
        </Box>
        {/* Tracks with detail */}
        <Box
          args={[0.4, 0.25, 2.4]}
          position={[-0.8, -0.3, 0]}
          castShadow
          receiveShadow>
          <meshStandardMaterial color="#333333" roughness={0.9} />
        </Box>
        <Box
          args={[0.4, 0.25, 2.4]}
          position={[0.8, -0.3, 0]}
          castShadow
          receiveShadow>
          <meshStandardMaterial color="#333333" roughness={0.9} />
        </Box>
        {/* Track Guards */}
        <Box
          args={[0.2, 0.1, 2.2]}
          position={[-0.8, 0.05, 0]}
          castShadow
          receiveShadow>
          <meshStandardMaterial
            color="#2E8B57"
            metalness={0.3}
            roughness={0.7}
          />
        </Box>
        <Box
          args={[0.2, 0.1, 2.2]}
          position={[0.8, 0.05, 0]}
          castShadow
          receiveShadow>
          <meshStandardMaterial
            color="#2E8B57"
            metalness={0.3}
            roughness={0.7}
          />
        </Box>

        {/* Turret Group */}
        <group position={[0, 0.5, 0]} ref={turretRef}>
          {/* Turret Base - Larger and more detailed */}
          <Cylinder
            args={[0.7, 0.8, 0.5, 20]}
            position={[0, 0.25, 0]}
            castShadow>
            <meshStandardMaterial
              color="darkolivegreen"
              metalness={0.4}
              roughness={0.6}
            />
          </Cylinder>
          {/* Turret Hatch */}
          <Cylinder
            args={[0.35, 0.35, 0.15, 16]}
            position={[0, 0.55, -0.3]}
            castShadow>
            <meshStandardMaterial
              color="darkolivegreen"
              metalness={0.4}
              roughness={0.6}
            />
          </Cylinder>
          {/* Main Barrel */}
          <Cylinder
            args={[0.12, 0.12, 1.8, 16]}
            position={[0, 0.25, 1.1]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow>
            <meshStandardMaterial
              color="gray"
              metalness={0.5}
              roughness={0.5}
            />
          </Cylinder>
          {/* Barrel Muzzle Brake */}
          <Cylinder
            args={[0.18, 0.18, 0.3, 16]}
            position={[0, 0.25, 2]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow>
            <meshStandardMaterial
              color="black"
              metalness={0.6}
              roughness={0.4}
            />
          </Cylinder>
          {/* Side Armor Plates */}
          <Box args={[0.25, 0.35, 1]} position={[0.65, 0.25, 0]} castShadow>
            <meshStandardMaterial
              color="darkolivegreen"
              metalness={0.4}
              roughness={0.6}
            />
          </Box>
          <Box args={[0.25, 0.35, 1]} position={[-0.65, 0.25, 0]} castShadow>
            <meshStandardMaterial
              color="darkolivegreen"
              metalness={0.4}
              roughness={0.6}
            />
          </Box>
          {/* Antenna */}
          <Cylinder
            args={[0.03, 0.03, 1.2, 8]}
            position={[0.4, 0.75, -0.4]}
            rotation={[0, 0, Math.PI / 8]}
            castShadow>
            <meshStandardMaterial
              color="silver"
              metalness={0.8}
              roughness={0.2}
            />
          </Cylinder>
          {/* Vision Port */}
          <Box args={[0.25, 0.15, 0.15]} position={[0, 0.4, 0.5]} castShadow>
            <meshStandardMaterial
              color="black"
              emissive="blue"
              emissiveIntensity={0.2}
            />
          </Box>
          {/* Heroic Accent - Glowing Crystal */}
          <Sphere args={[0.2, 16, 16]} position={[0, 0.75, 0]} castShadow>
            <meshStandardMaterial
              color="cyan"
              emissive="cyan"
              emissiveIntensity={0.5 + Math.sin(Date.now() * 0.005) * 0.3}
              transparent
              opacity={0.8}
            />
          </Sphere>
        </group>
      </group>

      {/* Main Turret Projectiles */}
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

      {/* Side Weapons */}
      {sideWeapons.map((weapon: SecondaryWeapon, index: number) => {
        const WeaponComponent = WeaponComponents[weapon.id];
        if (!WeaponComponent) {
          console.warn(`No component found for weapon ID: ${weapon.id}`);
          return null;
        }

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
            offsetX = -dist * Math.cos(angle);
            offsetZ = dist * Math.sin(angle);
            break;
          case 3: // Right
            offsetX = dist * Math.cos(angle);
            offsetZ = -dist * Math.sin(angle);
            break;
        }

        const weaponPosition: [number, number, number] = [
          currentTankPositionVec.x + offsetX,
          currentTankPositionVec.y + SIDE_WEAPON_Y_OFFSET,
          currentTankPositionVec.z + offsetZ,
        ];

        return (
          <WeaponComponent
            key={weapon.instanceId || `side-weapon-${index}`}
            weaponInstance={weapon}
            position={weaponPosition}
            rotation={currentTankRotation}
          />
        );
      })}
    </>
  );
};

export default Tank;

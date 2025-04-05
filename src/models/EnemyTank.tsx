import { useRef, useState, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Box, Cylinder, Sphere } from "@react-three/drei";
import { Vector3, Group, Quaternion, MeshStandardMaterial } from "three";
import { Enemy, useGameState } from "../utils/gameState";
import EnemyProjectile from "./EnemyProjectile";
import { debug } from "../utils/debug";

interface EnemyTankProps {
  enemy: Enemy;
}

const EnemyTank = ({ enemy }: EnemyTankProps) => {
  const tankRef = useRef<Group>(null);
  const turretRef = useRef<Group>(null); // Still needed for non-bombers
  const flashMaterialRef = useRef<MeshStandardMaterial>(null); // Ref for the flashing material

  const tankRotationRef = useRef(0);
  const turretRotationRef = useRef(0);
  const lastShootTimeRef = useRef(0);

  const [healthPercent, setHealthPercent] = useState(1);
  const [projectiles, setProjectiles] = useState<
    { id: string; position: [number, number, number]; rotation: number }[]
  >([]);

  const damageEnemy = useGameState((state) => state.damageEnemy);
  const updateEnemyPosition = useGameState(
    (state) => state.updateEnemyPosition
  );
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const getState = useRef(useGameState.getState).current;

  const maxHealthRef = useRef(enemy.health);

  const isBomber = enemy.type === "bomber";
  const isTank = enemy.type === "tank";
  const isTurret = enemy.type === "turret";
  const tankRadius = isBomber ? 1.2 : 1.25; // Adjusted bomber radius slightly for hovercraft base
  const moveSpeed = enemy.speed || (isBomber ? 2.5 : 1.5);

  useEffect(() => {
    maxHealthRef.current = enemy.health;
  }, []); // No dependency change needed

  useEffect(() => {
    if (tankRef.current) {
      tankRef.current.position.set(...enemy.position);
    }
  }, []); // No dependency change needed

  const checkTerrainCollision = useCallback(
    (newX: number, newZ: number): boolean => {
      const mapSize = 50;
      if (Math.abs(newX) > mapSize - 1 || Math.abs(newZ) > mapSize - 1) {
        return true;
      }

      const tankPosition = new Vector3(newX, 0, newZ);
      const terrainObstacles = getState().terrainObstacles;

      for (const obstacle of terrainObstacles) {
        if (obstacle.type === "rock") {
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
      }
      return false;
    },
    [tankRadius, getState]
  );

  // New function to detect obstacles ahead using ray-casting
  const detectObstacleAhead = useCallback(
    (
      position: Vector3,
      direction: Vector3,
      lookAheadDistance: number = 4
    ): boolean => {
      const terrainObstacles = getState().terrainObstacles;

      // Cast multiple rays in a small arc in front of the tank
      const rayAngles = [-15, 0, 15]; // Degrees
      const rayCount = rayAngles.length;

      for (const angleOffset of rayAngles) {
        // Calculate the ray direction with offset
        const rayDirection = direction.clone();
        const angleRad = (angleOffset * Math.PI) / 180;
        rayDirection.applyAxisAngle(new Vector3(0, 1, 0), angleRad);

        // Check each obstacle against this ray
        for (const obstacle of terrainObstacles) {
          if (obstacle.type === "rock") {
            const obstaclePos = new Vector3(
              obstacle.position[0],
              0,
              obstacle.position[2]
            );
            const obstacleRadius = obstacle.size * 0.75;

            // Vector from ray origin to obstacle center
            const originToObstacle = obstaclePos.clone().sub(position);

            // Project this vector onto the ray direction
            const projection = originToObstacle.dot(rayDirection);

            // If obstacle is behind the ray origin or too far, skip
            if (projection < 0 || projection > lookAheadDistance) continue;

            // Find closest point on ray to obstacle center
            const closestPoint = position
              .clone()
              .add(rayDirection.clone().multiplyScalar(projection));

            // Distance from this point to obstacle center
            const distanceToRay = obstaclePos.distanceTo(closestPoint);

            // If this distance is less than obstacle radius, ray hits obstacle
            if (distanceToRay < obstacleRadius + tankRadius * 0.5) {
              return true;
            }
          }
        }
      }

      return false;
    },
    [tankRadius, getState]
  );

  // Track positions to detect when tank is stuck
  const positionHistoryRef = useRef<Vector3[]>([]);
  const lastObstacleAvoidTimeRef = useRef(0);
  const stuckTimeoutRef = useRef(0);
  const avoidanceDirectionRef = useRef<Vector3 | null>(null);

  useFrame((state, delta) => {
    if (isPaused || isGameOver || !tankRef.current) return;

    if (!isBomber && !turretRef.current) return;

    const playerTankPosition = getState().playerTankPosition;
    if (!playerTankPosition) return;

    // --- Health Update ---
    const enemies = getState().enemies;
    const currentEnemy = enemies.find((e) => e.id === enemy.id);
    if (currentEnemy) {
      const newHealthPercent = currentEnemy.health / maxHealthRef.current;
      if (newHealthPercent !== healthPercent) {
        setHealthPercent(newHealthPercent);
      }
    } else {
      return;
    }

    const currentPositionVec = tankRef.current.position;
    const playerPositionVec = new Vector3(...playerTankPosition);

    const directionToPlayer = playerPositionVec
      .clone()
      .sub(currentPositionVec)
      .setY(0)
      .normalize();

    const distanceToPlayer = currentPositionVec.distanceTo(playerPositionVec);

    // --- Turret Rotation (Non-Bombers) ---
    if (!isBomber && turretRef.current) {
      const targetTurretRotation = Math.atan2(
        directionToPlayer.x,
        directionToPlayer.z
      );

      if (isTank) {
        const relativeRotation = targetTurretRotation - tankRotationRef.current;
        const turretRotationDiff = relativeRotation - turretRotationRef.current;
        const wrappedTurretDiff =
          ((turretRotationDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
        turretRotationRef.current += wrappedTurretDiff * delta * 3;
        turretRef.current.rotation.y = turretRotationRef.current;
      } else if (isTurret) {
        turretRotationRef.current = targetTurretRotation;
        turretRef.current.rotation.y = targetTurretRotation;
      }
    }

    // --- Shooting (Non-Bombers) ---
    if (!isBomber && turretRef.current) {
      const shootingRange = isTank ? 20 : 25;
      const fireRate = isTank ? 5.0 : 6.0;

      if (distanceToPlayer < shootingRange) {
        const timeSinceLastShot =
          state.clock.getElapsedTime() - lastShootTimeRef.current;
        if (timeSinceLastShot > fireRate) {
          const barrelEndLocalZ = isTank ? 1.75 : 2.2;
          const barrelEndLocal = new Vector3(0, 0.2, barrelEndLocalZ);
          const barrelEndWorld = turretRef.current.localToWorld(
            barrelEndLocal.clone()
          );

          const shootPosition: [number, number, number] = [
            barrelEndWorld.x,
            barrelEndWorld.y,
            barrelEndWorld.z,
          ];

          const worldQuaternion = new Quaternion();
          turretRef.current.getWorldQuaternion(worldQuaternion);
          const shootDirection = new Vector3(0, 0, 1).applyQuaternion(
            worldQuaternion
          );
          const projectileRotation = Math.atan2(
            shootDirection.x,
            shootDirection.z
          );

          setProjectiles((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substr(2, 9),
              position: shootPosition,
              rotation: projectileRotation,
            },
          ]);

          lastShootTimeRef.current = state.clock.getElapsedTime();
          debug.log(`Enemy ${enemy.id} (${enemy.type}) fired at player`);
        }
      }
    }

    // --- Movement and Body Rotation (Tank & Bomber) ---
    if (isTank || isBomber) {
      const currentTime = state.clock.getElapsedTime();
      const targetRotation = Math.atan2(
        directionToPlayer.x,
        directionToPlayer.z
      );
      const rotationDiff = targetRotation - tankRotationRef.current;
      const wrappedDiff = ((rotationDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
      const turnRate = isBomber ? 2.0 : 1.0;

      // Store current position for stuck detection (every ~0.5 seconds)
      if (currentTime % 0.5 < delta) {
        positionHistoryRef.current.push(currentPositionVec.clone());
        if (positionHistoryRef.current.length > 5) {
          positionHistoryRef.current.shift();
        }
      }

      // Check if tank is stuck by analyzing position history
      let isStuck = false;
      if (positionHistoryRef.current.length >= 5) {
        let totalMovement = 0;
        for (let i = 1; i < positionHistoryRef.current.length; i++) {
          totalMovement += positionHistoryRef.current[i].distanceTo(
            positionHistoryRef.current[i - 1]
          );
        }
        // If total movement over last 5 positions is very small, consider stuck
        isStuck = totalMovement < 0.5;
      }

      // Determine movement direction based on obstacle detection and stuck status
      let moveDirection = new Vector3(
        Math.sin(tankRotationRef.current),
        0,
        Math.cos(tankRotationRef.current)
      );

      let shouldChangeDirection = false;

      // If tank is approaching an obstacle
      const isObstacleAhead = detectObstacleAhead(
        currentPositionVec,
        moveDirection,
        isBomber ? 3 : 2
      );

      // Logic for obstacle avoidance and unsticking
      if (isObstacleAhead || isStuck) {
        // If we've been stuck for a while or just detected an obstacle
        if (isStuck || currentTime - lastObstacleAvoidTimeRef.current > 2) {
          shouldChangeDirection = true;
          lastObstacleAvoidTimeRef.current = currentTime;

          // Generate a new avoidance direction
          if (isStuck) {
            // When stuck, try a more dramatic direction change
            const playerDir = directionToPlayer.clone();
            // Choose between going left or right of the player
            const randomAngle =
              (Math.random() > 0.5 ? 1 : -1) *
              (Math.PI / 2 + (Math.random() * Math.PI) / 4);
            playerDir.applyAxisAngle(new Vector3(0, 1, 0), randomAngle);
            avoidanceDirectionRef.current = playerDir;
            stuckTimeoutRef.current = currentTime + 1.5; // Longer timeout when stuck
          } else {
            // For simple obstacle avoidance, rotate around the obstacle
            const avoidAngle = (Math.PI / 3) * (Math.random() > 0.5 ? 1 : -1);
            const avoidDir = moveDirection
              .clone()
              .applyAxisAngle(new Vector3(0, 1, 0), avoidAngle);
            avoidanceDirectionRef.current = avoidDir;
            stuckTimeoutRef.current = currentTime + 0.7;
          }
        }
      }

      // Use avoidance direction if active
      if (
        avoidanceDirectionRef.current &&
        currentTime < stuckTimeoutRef.current
      ) {
        // Gradually turn toward the avoidance direction
        const avoidRotation = Math.atan2(
          avoidanceDirectionRef.current.x,
          avoidanceDirectionRef.current.z
        );
        const avoidDiff = avoidRotation - tankRotationRef.current;
        const wrappedAvoidDiff =
          ((avoidDiff + Math.PI) % (Math.PI * 2)) - Math.PI;

        // Turn faster during avoidance
        const avoidTurnRate = (isBomber ? 3.0 : 2.0) * turnRate;
        tankRotationRef.current += wrappedAvoidDiff * delta * avoidTurnRate;
      } else {
        // Clear avoidance direction when timeout expires
        if (
          avoidanceDirectionRef.current &&
          currentTime >= stuckTimeoutRef.current
        ) {
          avoidanceDirectionRef.current = null;
        }

        // Normal rotation toward player when not avoiding
        tankRotationRef.current += wrappedDiff * delta * turnRate;
      }

      // Update tank's visual rotation
      tankRef.current.rotation.y = tankRotationRef.current;

      // Update move direction based on current rotation
      moveDirection = new Vector3(
        Math.sin(tankRotationRef.current),
        0,
        Math.cos(tankRotationRef.current)
      );

      let shouldMove = false;
      if (isBomber) {
        shouldMove = true;
      } else if (isTank) {
        shouldMove = distanceToPlayer > 8;
      }

      if (shouldMove) {
        const potentialX =
          currentPositionVec.x + moveDirection.x * delta * moveSpeed;
        const potentialZ =
          currentPositionVec.z + moveDirection.z * delta * moveSpeed;

        if (!checkTerrainCollision(potentialX, potentialZ)) {
          tankRef.current.position.x = potentialX;
          tankRef.current.position.z = potentialZ;

          if (isBomber) {
            tankRef.current.position.y =
              0.2 + Math.sin(state.clock.getElapsedTime() * 4) * 0.1;
          }

          if (Math.random() < 0.1) {
            const newPosition: [number, number, number] = [
              tankRef.current.position.x,
              tankRef.current.position.y,
              tankRef.current.position.z,
            ];
            updateEnemyPosition(enemy.id, newPosition);
          }
        } else if (!shouldChangeDirection) {
          // Only apply random rotation if we didn't already determine a direction change
          tankRotationRef.current +=
            (Math.random() - 0.5) * Math.PI * 0.5 * delta * 5;
          if (Math.random() < 0.05) {
            debug.log(`Enemy ${enemy.id} avoiding obstacle`);
          }
        }
      }

      if (isBomber && distanceToPlayer < 2) {
        debug.log(`Bomber ${enemy.id} exploded on player!`);
        const takeDamage = getState().takeDamage;
        takeDamage(25);
        damageEnemy(enemy.id, 1000);
      }
    }

    // --- Bomber Flashing Animation ---
    if (isBomber && flashMaterialRef.current) {
      const maxFlashDistance = 15; // Start flashing within this range
      const minFlashDistance = 2; // Max flash speed at this range (explosion range)
      const baseFreq = 0.5; // Very slow base frequency (0.5 flashes per second)
      const freqMultiplier = 1; // Minimal increase when close (up to 1.5 Hz max)

      const proximity = Math.max(
        0,
        Math.min(
          1,
          1 -
            (distanceToPlayer - minFlashDistance) /
              (maxFlashDistance - minFlashDistance)
        )
      );

      if (distanceToPlayer < maxFlashDistance) {
        const currentFreq = baseFreq + proximity * freqMultiplier;
        const sineValue = Math.sin(
          state.clock.elapsedTime * Math.PI * 2 * currentFreq
        );

        const flashFactor = (sineValue + 1) / 2;

        // Much gentler ranges
        const minOpacity = 0.05; // Barely visible at minimum
        const maxOpacity = 0.3; // Subtle at maximum
        const minIntensity = 0.1; // Very low glow
        const maxIntensity = 0.4; // Gentle peak

        flashMaterialRef.current.opacity =
          minOpacity + flashFactor * (maxOpacity - minOpacity);
        flashMaterialRef.current.emissiveIntensity =
          minIntensity + flashFactor * (maxIntensity - minIntensity);
        flashMaterialRef.current.needsUpdate = true;
      } else {
        flashMaterialRef.current.opacity = 0.0;
        flashMaterialRef.current.emissiveIntensity = 0;
        flashMaterialRef.current.needsUpdate = true;
      }
    }
  });

  const handleHit = useCallback(
    (damage: number) => {
      damageEnemy(enemy.id, damage);
    },
    [damageEnemy, enemy.id]
  );

  const removeProjectile = useCallback((id: string) => {
    setProjectiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Updated bomber geometry constants
  const bomberBaseRadius = 1.2;
  const bomberBaseBottomRadius = 1.4;
  const bomberBaseHeight = 0.3;
  const bomberCockpitSize = 0.8;
  const bomberThrusterRadius = 0.3;
  const bomberThrusterHeight = 0.6;

  return (
    <>
      <group ref={tankRef} name={`enemy-${enemy.id}-${enemy.type}`}>
        {isBomber ? (
          <>
            {/* Angular Hovercraft Base (Skirt) */}
            <Cylinder
              args={[
                bomberBaseRadius,
                bomberBaseBottomRadius,
                bomberBaseHeight,
                8,
              ]}
              position={[0, bomberBaseHeight / 2, 0]}
              castShadow
              receiveShadow
              onClick={() => handleHit(25)}>
              <meshStandardMaterial
                color="#4A4A4A"
                roughness={0.5}
                metalness={0.7}
              />
            </Cylinder>

            {/* Angular Cockpit */}
            <Box
              args={[
                bomberCockpitSize,
                bomberCockpitSize * 0.5,
                bomberCockpitSize,
              ]}
              position={[0, bomberBaseHeight + bomberCockpitSize * 0.25, 0]}
              rotation={[0, Math.PI / 4, 0]}
              castShadow
              onClick={() => handleHit(25)}>
              <meshStandardMaterial
                color="#FFD700"
                roughness={0.3}
                metalness={0.5}
              />
            </Box>

            {/* Rear Thruster Housing (Angular) */}
            <Cylinder
              args={[
                bomberThrusterRadius,
                bomberThrusterRadius,
                bomberThrusterHeight,
                6,
              ]}
              position={[
                0,
                bomberBaseHeight / 2 + 0.1,
                -bomberBaseRadius * 0.8,
              ]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
              onClick={() => handleHit(25)}>
              <meshStandardMaterial
                color="darkgray"
                roughness={0.4}
                metalness={0.6}
              />
            </Cylinder>

            {/* Side Thrusters (Fins) */}
            <Box
              args={[0.2, 0.4, bomberBaseRadius * 0.8]}
              position={[bomberBaseRadius * 0.8, bomberBaseHeight / 2 + 0.2, 0]}
              rotation={[0, 0, Math.PI / 6]}
              castShadow
              onClick={() => handleHit(25)}>
              <meshStandardMaterial
                color="#4A4A4A"
                roughness={0.5}
                metalness={0.7}
              />
            </Box>
            <Box
              args={[0.2, 0.4, bomberBaseRadius * 0.8]}
              position={[
                -bomberBaseRadius * 0.8,
                bomberBaseHeight / 2 + 0.2,
                0,
              ]}
              rotation={[0, 0, -Math.PI / 6]}
              castShadow
              onClick={() => handleHit(25)}>
              <meshStandardMaterial
                color="#4A4A4A"
                roughness={0.5}
                metalness={0.7}
              />
            </Box>

            {/* Flashing Sphere Effect */}
            <Sphere
              args={[bomberBaseRadius * 1.1, 24, 24]}
              position={[0, bomberBaseHeight / 2, 0]}
              renderOrder={1}>
              <meshStandardMaterial
                ref={flashMaterialRef}
                color="red"
                emissive="red"
                emissiveIntensity={0}
                transparent={true}
                opacity={0}
                depthWrite={false}
              />
            </Sphere>
          </>
        ) : (
          <>
            <Box
              args={isTank ? [1.5, 0.5, 2] : [1.8, 0.7, 1.8]}
              castShadow
              receiveShadow
              onClick={() => handleHit(25)}>
              <meshStandardMaterial color={isTank ? "red" : "darkblue"} />
            </Box>
            <group position={[0, 0.5, 0]} ref={turretRef}>
              <Cylinder
                args={isTank ? [0.6, 0.7, 0.4, 16] : [0.7, 0.8, 0.5, 16]}
                position={[0, 0.2, 0]}
                castShadow
                onClick={() => handleHit(25)}>
                <meshStandardMaterial
                  color={isTank ? "darkred" : "royalblue"}
                />
              </Cylinder>
              <Cylinder
                args={[0.3, 0.3, 0.1, 16]}
                position={[0, 0.45, -0.2]}
                castShadow
                onClick={() => handleHit(25)}>
                <meshStandardMaterial
                  color={isTank ? "darkred" : "royalblue"}
                />
              </Cylinder>
              <Cylinder
                args={isTank ? [0.1, 0.1, 1.5, 16] : [0.12, 0.12, 2, 16]}
                position={[0, 0.2, isTank ? 1 : 1.2]}
                rotation={[Math.PI / 2, 0, 0]}
                castShadow
                onClick={() => handleHit(25)}>
                <meshStandardMaterial color={isTank ? "darkgray" : "navy"} />
              </Cylinder>
              <Cylinder
                args={isTank ? [0.15, 0.15, 0.2, 16] : [0.18, 0.18, 0.25, 16]}
                position={[0, 0.2, isTank ? 1.85 : 2.35]}
                rotation={[Math.PI / 2, 0, 0]}
                castShadow
                onClick={() => handleHit(25)}>
                <meshStandardMaterial color={isTank ? "black" : "darkgray"} />
              </Cylinder>
              <Cylinder
                args={[0.02, 0.02, 1, 8]}
                position={[0.3, 0.65, -0.3]}
                rotation={[0, 0, Math.PI / 6]}
                castShadow
                onClick={() => handleHit(25)}>
                <meshStandardMaterial color="gray" />
              </Cylinder>
              <Box
                args={[0.2, 0.3, 0.8]}
                position={[isTank ? 0.55 : 0.65, 0.2, 0]}
                castShadow
                onClick={() => handleHit(25)}>
                <meshStandardMaterial
                  color={isTank ? "darkred" : "royalblue"}
                />
              </Box>
              <Box
                args={[0.2, 0.3, 0.8]}
                position={[isTank ? -0.55 : -0.65, 0.2, 0]}
                castShadow
                onClick={() => handleHit(25)}>
                <meshStandardMaterial
                  color={isTank ? "darkred" : "royalblue"}
                />
              </Box>
              <Box
                args={[0.2, 0.1, 0.1]}
                position={[0, 0.35, isTank ? 0.4 : 0.5]}
                castShadow
                onClick={() => handleHit(25)}>
                <meshStandardMaterial color="black" />
              </Box>
            </group>
            {isTank ? (
              <>
                <Box
                  args={[0.3, 0.2, 2.2]}
                  position={[-0.7, -0.3, 0]}
                  castShadow
                  receiveShadow
                  onClick={() => handleHit(25)}>
                  <meshStandardMaterial color="black" />
                </Box>
                <Box
                  args={[0.3, 0.2, 2.2]}
                  position={[0.7, -0.3, 0]}
                  castShadow
                  receiveShadow
                  onClick={() => handleHit(25)}>
                  <meshStandardMaterial color="black" />
                </Box>
              </>
            ) : (
              <Box
                args={[1.8, 0.3, 1.8]}
                position={[0, -0.15, 0]}
                castShadow
                receiveShadow
                onClick={() => handleHit(25)}>
                <meshStandardMaterial color="navy" />
              </Box>
            )}
          </>
        )}

        {/* Health Bar */}
        <Box
          args={[1, 0.1, 0.1]}
          position={[
            0,
            isBomber
              ? bomberBaseHeight + bomberCockpitSize * 0.5 + 0.2
              : isTank
              ? 1.2
              : 1.5,
            0,
          ]}
          renderOrder={1}>
          <meshBasicMaterial color="red" transparent depthTest={false} />
        </Box>
        <Box
          args={[healthPercent, 0.1, 0.1]}
          position={[
            -(1 - healthPercent) / 2,
            isBomber
              ? bomberBaseHeight + bomberCockpitSize * 0.5 + 0.2
              : isTank
              ? 1.2
              : 1.5,
            0.01,
          ]}
          renderOrder={2}>
          <meshBasicMaterial color="lime" transparent depthTest={false} />
        </Box>
      </group>

      {/* Enemy Projectiles */}
      {projectiles.map((projectile) => (
        <EnemyProjectile
          key={projectile.id}
          id={projectile.id}
          position={projectile.position}
          rotation={projectile.rotation}
          damage={isTank ? 10 : 15}
          onRemove={removeProjectile}
        />
      ))}
    </>
  );
};

export default EnemyTank;

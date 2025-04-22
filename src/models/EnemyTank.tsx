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
  const turretRef = useRef<Group>(null);
  const flashMaterialRef = useRef<MeshStandardMaterial>(null);

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
  const tankRadius = isBomber ? 1.2 : 1.25;
  const moveSpeed = enemy.speed || (isBomber ? 2.5 : 1.5);

  useEffect(() => {
    maxHealthRef.current = enemy.health;
  }, []);

  useEffect(() => {
    if (tankRef.current) {
      tankRef.current.position.set(...enemy.position);
    }
  }, []);

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
      const relativeRotation = targetTurretRotation - tankRotationRef.current;
      const turretRotationDiff = relativeRotation - turretRotationRef.current;
      const wrappedTurretDiff =
        ((turretRotationDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
      turretRotationRef.current += wrappedTurretDiff * delta * 3;
      turretRef.current.rotation.y = turretRotationRef.current;
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
      const turnRate = isBomber ? 2.0 : 1.0;

      // Potential Field Parameters
      const max_distance = 5;
      const attraction_strength = 1.0;
      const epsilon = 0.1;

      // Compute attractive force towards player
      const attractiveForce = directionToPlayer
        .clone()
        .multiplyScalar(attraction_strength);

      // Compute sum of repulsive forces from obstacles
      const sumRepulsive = new Vector3(0, 0, 0);
      const terrainObstacles = getState().terrainObstacles;
      for (const obstacle of terrainObstacles) {
        const obstaclePos = new Vector3(
          obstacle.position[0],
          0,
          obstacle.position[2]
        );
        const vectorToTank = currentPositionVec.clone().sub(obstaclePos);
        const distance = vectorToTank.length();
        const obstacleRadius = obstacle.size * 0.75;
        const effectiveDistance = distance - (tankRadius + obstacleRadius);
        if (effectiveDistance < max_distance) {
          const repulsiveDirection = vectorToTank.normalize();
          const repulsiveMagnitude = 1 / (effectiveDistance + epsilon);
          const repulsiveForce =
            repulsiveDirection.multiplyScalar(repulsiveMagnitude);
          sumRepulsive.add(repulsiveForce);
        }
      }

      // Compute net force
      const netForce = attractiveForce.clone().add(sumRepulsive);

      // Determine target direction
      const targetDirection =
        netForce.length() > 0 ? netForce.normalize() : directionToPlayer;

      // Set target rotation
      const targetRotation = Math.atan2(targetDirection.x, targetDirection.z);

      // Smoothly turn towards target rotation
      const rotationDiff = targetRotation - tankRotationRef.current;
      const wrappedDiff = ((rotationDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
      tankRotationRef.current += wrappedDiff * delta * turnRate;
      tankRef.current.rotation.y = tankRotationRef.current;

      // Determine if the tank should move
      let shouldMove = false;
      if (isBomber) {
        shouldMove = true;
      } else if (isTank) {
        shouldMove = distanceToPlayer > 8;
      }

      if (shouldMove) {
        const moveDirection = new Vector3(
          Math.sin(tankRotationRef.current),
          0,
          Math.cos(tankRotationRef.current)
        );
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
      const maxFlashDistance = 15;
      const minFlashDistance = 2;
      const baseFreq = 0.5;
      const freqMultiplier = 1;

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

        const minOpacity = 0.05;
        const maxOpacity = 0.3;
        const minIntensity = 0.1;
        const maxIntensity = 0.4;

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
                rotation={[0, 0, 0]}
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
            0.001,
          ]}
          renderOrder={2}>
          <meshBasicMaterial color="lime" transparent depthTest={false} />
        </Box>
      </group>

      {/* Enemy Projectiles */}
      {projectiles.map((projectile) => {
        const playerLevel = getState().playerLevel;
        let damage = 5; // Default damage for early game
        if (playerLevel > 15) {
          damage = 10; // Mid game damage
        }
        if (playerLevel > 25) {
          damage = 15; // Late mid game damage
        }
        if (playerLevel > 40) {
          damage = 20; // Late game damage
        }
        return (
          <EnemyProjectile
            key={projectile.id}
            id={projectile.id}
            position={projectile.position}
            rotation={projectile.rotation}
            damage={damage}
            onRemove={removeProjectile}
          />
        );
      })}
    </>
  );
};

export default EnemyTank;

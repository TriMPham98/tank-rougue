import { useRef, useState, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Box, Cylinder, Sphere, Cone } from "@react-three/drei";
import { Vector3, Group, Quaternion } from "three";
import { Enemy, useGameState } from "../utils/gameState";
import EnemyProjectile from "./EnemyProjectile";
import { debug } from "../utils/debug";

interface EnemyTankProps {
  enemy: Enemy;
}

const EnemyTank = ({ enemy }: EnemyTankProps) => {
  const tankRef = useRef<Group>(null);
  const turretRef = useRef<Group>(null);

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
  const tankRadius = isBomber ? 0.8 : 1.25;
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
    [tankRadius]
  );

  useFrame((state, delta) => {
    if (isPaused || isGameOver) return;

    if (isBomber) {
      if (!tankRef.current) return;
    } else {
      if (!tankRef.current || !turretRef.current) return;
    }

    const playerTankPosition = getState().playerTankPosition;
    if (!playerTankPosition) return;

    const enemies = getState().enemies;
    const currentEnemy = enemies.find((e) => e.id === enemy.id);

    if (currentEnemy) {
      const newHealthPercent = currentEnemy.health / maxHealthRef.current;
      if (newHealthPercent !== healthPercent) {
        setHealthPercent(newHealthPercent);
      }
    }

    const directionToPlayer = new Vector3(
      playerTankPosition[0] - tankRef.current.position.x,
      0,
      playerTankPosition[2] - tankRef.current.position.z
    ).normalize();

    const targetTurretRotation = Math.atan2(
      directionToPlayer.x,
      directionToPlayer.z
    );

    if (!isBomber) {
      if (isTank) {
        const relativeRotation = targetTurretRotation - tankRotationRef.current;
        const turretRotationDiff = relativeRotation - turretRotationRef.current;
        const wrappedTurretDiff =
          ((turretRotationDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
        turretRotationRef.current += wrappedTurretDiff * delta * 3;
      } else if (isTurret) {
        turretRotationRef.current = targetTurretRotation;
      }

      turretRef.current!.rotation.y = isTank
        ? turretRotationRef.current
        : targetTurretRotation;
    }

    const distanceToPlayer = new Vector3(
      playerTankPosition[0] - tankRef.current.position.x,
      0,
      playerTankPosition[2] - tankRef.current.position.z
    ).length();

    if (!isBomber) {
      const shootingRange = isTank ? 20 : 25;
      const fireRate = isTank ? 5.0 : 6.0;

      if (distanceToPlayer < shootingRange) {
        if (
          state.clock.getElapsedTime() - lastShootTimeRef.current >
          fireRate
        ) {
          const barrelEndLocalZ = isTank ? 1.75 : 2.2;
          const barrelEndLocal = new Vector3(0, 0.2, barrelEndLocalZ);
          const barrelEndWorld = turretRef.current!.localToWorld(
            barrelEndLocal.clone()
          );
          const shootPosition: [number, number, number] = [
            barrelEndWorld.x,
            barrelEndWorld.y,
            barrelEndWorld.z,
          ];

          const worldQuaternion = new Quaternion();
          turretRef.current!.getWorldQuaternion(worldQuaternion);
          const direction = new Vector3(0, 0, 1).applyQuaternion(
            worldQuaternion
          );
          const projectileRotation = Math.atan2(direction.x, direction.z);

          setProjectiles((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substr(2, 9),
              position: shootPosition,
              rotation: projectileRotation,
            },
          ]);

          lastShootTimeRef.current = state.clock.getElapsedTime();
          debug.log(`Enemy ${enemy.id} fired at player`);
        }
      }
    }

    if (isTank || isBomber) {
      const targetRotation = Math.atan2(
        directionToPlayer.x,
        directionToPlayer.z
      );
      const rotationDiff = targetRotation - tankRotationRef.current;
      const wrappedDiff = ((rotationDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
      const turnRate = isBomber ? 2.5 : 1;
      tankRotationRef.current += wrappedDiff * delta * turnRate;
      tankRef.current.rotation.y = tankRotationRef.current;

      if (isBomber || distanceToPlayer > 5) {
        const newX =
          tankRef.current.position.x +
          Math.sin(tankRotationRef.current) * delta * moveSpeed;
        const newZ =
          tankRef.current.position.z +
          Math.cos(tankRotationRef.current) * delta * moveSpeed;

        if (!checkTerrainCollision(newX, newZ)) {
          tankRef.current.position.x = newX;
          tankRef.current.position.z = newZ;

          if (isBomber) {
            tankRef.current.position.y =
              0.5 + Math.sin(state.clock.getElapsedTime() * 3) * 0.2;
          }

          if (Math.random() < 0.05) {
            const newPosition: [number, number, number] = [
              tankRef.current.position.x,
              tankRef.current.position.y,
              tankRef.current.position.z,
            ];
            updateEnemyPosition(enemy.id, newPosition);
          }
        } else {
          tankRotationRef.current += (Math.random() - 0.5) * Math.PI * 0.25;
          if (Math.random() < 0.1) {
            debug.log(`Enemy ${enemy.id} avoiding rock obstacle`);
          }
        }

        if (isBomber && distanceToPlayer < 2) {
          debug.log(`Bomber ${enemy.id} exploded on player!`);
          const takeDamage = getState().takeDamage;
          takeDamage(25);
          damageEnemy(enemy.id, 1000);
        }
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

  return (
    <>
      <group ref={tankRef}>
        {isBomber ? (
          <>
            <Sphere
              args={[0.8, 16, 16]}
              position={[0, 0, 0]}
              castShadow
              receiveShadow
              onClick={() => handleHit(25)}>
              <meshStandardMaterial
                color="yellow"
                emissive="orange"
                emissiveIntensity={0.3}
              />
            </Sphere>
            <Cylinder
              args={[0.3, 0.5, 0.8, 12]}
              position={[0, 0, -0.8]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
              receiveShadow
              onClick={() => handleHit(25)}>
              <meshStandardMaterial
                color="darkgray"
                emissive="red"
                emissiveIntensity={0.5}
              />
            </Cylinder>
            <Box
              args={[0.6, 0.1, 0.4]}
              position={[0.6, 0, 0]}
              castShadow
              receiveShadow
              onClick={() => handleHit(25)}>
              <meshStandardMaterial color="goldenrod" />
            </Box>
            <Box
              args={[0.6, 0.1, 0.4]}
              position={[-0.6, 0, 0]}
              castShadow
              receiveShadow
              onClick={() => handleHit(25)}>
              <meshStandardMaterial color="goldenrod" />
            </Box>
            <Sphere args={[0.85, 16, 16]} position={[0, 0, 0]} renderOrder={1}>
              <meshStandardMaterial
                color="red"
                transparent
                opacity={0.3 + Math.sin(Date.now() * 0.005) * 0.15}
                emissive="red"
                emissiveIntensity={0.2}
              />
            </Sphere>
          </>
        ) : (
          <Box
            args={isTank ? [1.5, 0.5, 2] : [1.8, 0.7, 1.8]}
            castShadow
            receiveShadow
            onClick={() => handleHit(25)}>
            <meshStandardMaterial color={isTank ? "red" : "darkblue"} />
          </Box>
        )}
        {!isBomber && (
          <group position={[0, 0.5, 0]} ref={turretRef}>
            {/* Turret Base */}
            <Cylinder
              args={isTank ? [0.6, 0.7, 0.4, 16] : [0.7, 0.8, 0.5, 16]}
              position={[0, 0.2, 0]}
              castShadow
              onClick={() => handleHit(25)}>
              <meshStandardMaterial color={isTank ? "darkred" : "royalblue"} />
            </Cylinder>
            {/* Turret Hatch */}
            <Cylinder
              args={[0.3, 0.3, 0.1, 16]}
              position={[0, 0.45, -0.2]}
              castShadow
              onClick={() => handleHit(25)}>
              <meshStandardMaterial color={isTank ? "darkred" : "royalblue"} />
            </Cylinder>
            {/* Main Barrel */}
            <Cylinder
              args={isTank ? [0.1, 0.1, 1.5, 16] : [0.12, 0.12, 2, 16]}
              position={[0, 0.2, isTank ? 1 : 1.2]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
              onClick={() => handleHit(25)}>
              <meshStandardMaterial color={isTank ? "darkgray" : "navy"} />
            </Cylinder>
            {/* Barrel Muzzle */}
            <Cylinder
              args={isTank ? [0.15, 0.15, 0.2, 16] : [0.18, 0.18, 0.25, 16]}
              position={[0, 0.2, isTank ? 1.85 : 2.35]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
              onClick={() => handleHit(25)}>
              <meshStandardMaterial color={isTank ? "black" : "darkgray"} />
            </Cylinder>
            {/* Antenna */}
            <Cylinder
              args={[0.02, 0.02, 1, 8]}
              position={[0.3, 0.65, -0.3]}
              rotation={[0, 0, Math.PI / 6]}
              castShadow
              onClick={() => handleHit(25)}>
              <meshStandardMaterial color="gray" />
            </Cylinder>
            {/* Side Armor Plate */}
            <Box
              args={[0.2, 0.3, 0.8]}
              position={[isTank ? 0.55 : 0.65, 0.2, 0]}
              castShadow
              onClick={() => handleHit(25)}>
              <meshStandardMaterial color={isTank ? "darkred" : "royalblue"} />
            </Box>
            <Box
              args={[0.2, 0.3, 0.8]}
              position={[isTank ? -0.55 : -0.65, 0.2, 0]}
              castShadow
              onClick={() => handleHit(25)}>
              <meshStandardMaterial color={isTank ? "darkred" : "royalblue"} />
            </Box>
            {/* Vision Port */}
            <Box
              args={[0.2, 0.1, 0.1]}
              position={[0, 0.35, isTank ? 0.4 : 0.5]}
              castShadow
              onClick={() => handleHit(25)}>
              <meshStandardMaterial color="black" />
            </Box>
          </group>
        )}
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
            args={[2, 0.3, 2]}
            position={[0, -0.3, 0]}
            castShadow
            receiveShadow
            onClick={() => handleHit(25)}>
            <meshStandardMaterial color={isBomber ? "goldenrod" : "navy"} />
          </Box>
        )}
        <Box
          args={[1, 0.1, 0.1]}
          position={[0, isBomber ? 1.2 : isTank ? 1.2 : 1.5, 0]}
          renderOrder={1}>
          <meshBasicMaterial color="red" transparent depthTest={false} />
        </Box>
        <Box
          args={[healthPercent, 0.1, 0.1]}
          position={[
            -(0.5 - healthPercent / 2),
            isBomber ? 1.2 : isTank ? 1.2 : 1.5,
            0.001,
          ]}
          renderOrder={2}>
          <meshBasicMaterial color="green" transparent depthTest={false} />
        </Box>
      </group>
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

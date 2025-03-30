import { useRef, useState, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Box, Cylinder } from "@react-three/drei";
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

  // Tank type dependent constants
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

  // Helper function to check collision with terrain obstacles, specifically rocks
  const checkTerrainCollision = useCallback(
    (newX: number, newZ: number): boolean => {
      // Map boundary check - Ground is 100x100 centered at origin
      const mapSize = 50; // Half of the total ground size (100/2)
      if (Math.abs(newX) > mapSize - 1 || Math.abs(newZ) > mapSize - 1) {
        return true; // Collision with map boundary
      }

      const tankPosition = new Vector3(newX, 0, newZ);
      const terrainObstacles = getState().terrainObstacles;

      for (const obstacle of terrainObstacles) {
        // Only check collisions with rocks
        if (obstacle.type === "rock") {
          const obstaclePos = new Vector3(
            obstacle.position[0],
            0,
            obstacle.position[2]
          );
          const distance = obstaclePos.distanceTo(tankPosition);

          // Use obstacle size to determine collision radius
          const obstacleRadius = obstacle.size * 0.75; // Rock collision radius

          if (distance < tankRadius + obstacleRadius) {
            return true; // Collision detected
          }
        }
      }
      return false; // No collision
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
      tankRotationRef.current += wrappedDiff * delta;
      tankRef.current.rotation.y = tankRotationRef.current;

      if (isBomber || distanceToPlayer > 5) {
        // Calculate new position
        const newX =
          tankRef.current.position.x +
          Math.sin(tankRotationRef.current) * delta * moveSpeed;
        const newZ =
          tankRef.current.position.z +
          Math.cos(tankRotationRef.current) * delta * moveSpeed;

        // Check for collision with terrain before moving
        if (!checkTerrainCollision(newX, newZ)) {
          // No collision, proceed with movement
          tankRef.current.position.x = newX;
          tankRef.current.position.z = newZ;

          // Only update position in game state occasionally to reduce state updates
          if (Math.random() < 0.05) {
            const newPosition: [number, number, number] = [
              tankRef.current.position.x,
              tankRef.current.position.y,
              tankRef.current.position.z,
            ];
            updateEnemyPosition(enemy.id, newPosition);
          }
        } else {
          // Collision detected, try to navigate around obstacle
          // Simple approach: rotate the tank slightly and try again next frame
          tankRotationRef.current += (Math.random() - 0.5) * Math.PI * 0.25;
          if (Math.random() < 0.1) {
            debug.log(`Enemy ${enemy.id} avoiding rock obstacle`);
          }
        }

        if (isBomber && distanceToPlayer < 2) {
          debug.log(`Bomber ${enemy.id} exploded on player!`);
          const takeDamage = getState().takeDamage;
          takeDamage(50);
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
        <Box
          args={
            isBomber
              ? [1.2, 0.8, 1.2]
              : isTank
              ? [1.5, 0.5, 2]
              : [1.8, 0.7, 1.8]
          }
          castShadow
          receiveShadow
          onClick={() => handleHit(25)}>
          <meshStandardMaterial
            color={isBomber ? "yellow" : isTank ? "red" : "darkblue"}
          />
        </Box>
        {!isBomber && (
          <group position={[0, 0.5, 0]} ref={turretRef}>
            <Cylinder
              args={isTank ? [0.6, 0.6, 0.4, 16] : [0.7, 0.5, 0.6, 8]}
              position={[0, 0.2, 0]}
              castShadow
              onClick={() => handleHit(25)}>
              <meshStandardMaterial color={isTank ? "darkred" : "royalblue"} />
            </Cylinder>
            <Box
              args={isTank ? [0.2, 0.2, 1.5] : [0.25, 0.25, 2]}
              position={[0, 0.2, isTank ? 1 : 1.2]}
              castShadow
              onClick={() => handleHit(25)}>
              <meshStandardMaterial color={isTank ? "darkred" : "royalblue"} />
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
          position={[0, isBomber ? 1.0 : isTank ? 1.2 : 1.5, 0]}
          renderOrder={1}>
          <meshBasicMaterial color="red" transparent depthTest={false} />
        </Box>
        <Box
          args={[healthPercent, 0.1, 0.1]}
          position={[
            -(0.5 - healthPercent / 2),
            isBomber ? 1.0 : isTank ? 1.2 : 1.5,
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

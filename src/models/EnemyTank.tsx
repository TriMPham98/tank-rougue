import { useRef, useState, useEffect } from "react";
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

  useEffect(() => {
    maxHealthRef.current = enemy.health;
  }, []);

  useEffect(() => {
    if (tankRef.current) {
      tankRef.current.position.set(...enemy.position);
    }
  }, []);

  useFrame((state, delta) => {
    if (!tankRef.current || !turretRef.current || isPaused || isGameOver)
      return;

    const playerTankPosition = getState().playerTankPosition;
    const enemies = getState().enemies;
    const currentEnemy = enemies.find((e) => e.id === enemy.id);

    if (currentEnemy) {
      const newHealthPercent = currentEnemy.health / maxHealthRef.current;
      if (newHealthPercent !== healthPercent) {
        setHealthPercent(newHealthPercent);
      }
    }

    if (!playerTankPosition) return;

    const directionToPlayer = new Vector3(
      playerTankPosition[0] - tankRef.current.position.x,
      0,
      playerTankPosition[2] - tankRef.current.position.z
    ).normalize();

    const targetTurretRotation = Math.atan2(
      directionToPlayer.x,
      directionToPlayer.z
    );

    if (enemy.type === "tank") {
      const relativeRotation = targetTurretRotation - tankRotationRef.current;
      const turretRotationDiff = relativeRotation - turretRotationRef.current;
      const wrappedTurretDiff =
        ((turretRotationDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
      turretRotationRef.current += wrappedTurretDiff * delta * 3;
    } else {
      turretRotationRef.current = targetTurretRotation;
    }

    turretRef.current.rotation.y =
      enemy.type === "tank" ? turretRotationRef.current : targetTurretRotation;

    const distanceToPlayer = new Vector3(
      playerTankPosition[0] - tankRef.current.position.x,
      0,
      playerTankPosition[2] - tankRef.current.position.z
    ).length();

    const shootingRange = enemy.type === "tank" ? 20 : 25;
    const fireRate = enemy.type === "tank" ? 2.5 : 3.0;

    if (distanceToPlayer < shootingRange) {
      if (state.clock.getElapsedTime() - lastShootTimeRef.current > fireRate) {
        const barrelEndLocalZ = enemy.type === "tank" ? 1.75 : 2.2;
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
        const direction = new Vector3(0, 0, 1).applyQuaternion(worldQuaternion);
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

    if (enemy.type === "tank") {
      const targetRotation = Math.atan2(
        directionToPlayer.x,
        directionToPlayer.z
      );
      const rotationDiff = targetRotation - tankRotationRef.current;
      const wrappedDiff = ((rotationDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
      tankRotationRef.current += wrappedDiff * delta;
      tankRef.current.rotation.y = tankRotationRef.current;

      const moveSpeed = 1.5;
      if (distanceToPlayer > 5) {
        tankRef.current.position.x +=
          Math.sin(tankRotationRef.current) * delta * moveSpeed;
        tankRef.current.position.z +=
          Math.cos(tankRotationRef.current) * delta * moveSpeed;

        const newPosition: [number, number, number] = [
          tankRef.current.position.x,
          tankRef.current.position.y,
          tankRef.current.position.z,
        ];
        if (Math.random() < 0.1) {
          updateEnemyPosition(enemy.id, newPosition);
        }
      }
    }
  });

  const handleHit = (damage: number) => {
    damageEnemy(enemy.id, damage);
  };

  const removeProjectile = (id: string) => {
    setProjectiles((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <>
      <group ref={tankRef}>
        <Box
          args={enemy.type === "tank" ? [1.5, 0.5, 2] : [1.8, 0.7, 1.8]}
          castShadow
          receiveShadow
          onClick={() => handleHit(25)}>
          <meshStandardMaterial
            color={enemy.type === "tank" ? "red" : "darkblue"}
          />
        </Box>
        <group position={[0, 0.5, 0]} ref={turretRef}>
          <Cylinder
            args={
              enemy.type === "tank" ? [0.6, 0.6, 0.4, 16] : [0.7, 0.5, 0.6, 8]
            }
            position={[0, 0.2, 0]}
            castShadow
            onClick={() => handleHit(25)}>
            <meshStandardMaterial
              color={enemy.type === "tank" ? "darkred" : "royalblue"}
            />
          </Cylinder>
          <Box
            args={enemy.type === "tank" ? [0.2, 0.2, 1.5] : [0.25, 0.25, 2]}
            position={[0, 0.2, enemy.type === "tank" ? 1 : 1.2]}
            castShadow
            onClick={() => handleHit(25)}>
            <meshStandardMaterial
              color={enemy.type === "tank" ? "darkred" : "royalblue"}
            />
          </Box>
        </group>
        {enemy.type === "tank" ? (
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
            <meshStandardMaterial color="navy" />
          </Box>
        )}
        <Box
          args={[1, 0.1, 0.1]}
          position={[0, enemy.type === "tank" ? 1.2 : 1.5, 0]}
          renderOrder={1}>
          <meshBasicMaterial color="red" transparent depthTest={false} />
        </Box>
        <Box
          args={[healthPercent, 0.1, 0.1]}
          position={[
            -(0.5 - healthPercent / 2),
            enemy.type === "tank" ? 1.2 : 1.5,
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
          damage={enemy.type === "tank" ? 10 : 15}
          onRemove={removeProjectile}
        />
      ))}
    </>
  );
};

export default EnemyTank;

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Cylinder } from "@react-three/drei";
import { Vector3, Mesh } from "three";
import { useGameState } from "../utils/gameState";
import { debug } from "../utils/debug";

interface LaserBeamProps {
  startPosition: [number, number, number];
  targetId: string;
  damage: number;
  range: number;
  color: string;
}

const DAMAGE_INTERVAL = 0.1; // Apply damage every 100ms

const LaserBeam = ({
  startPosition,
  targetId,
  damage,
  range,
  color,
}: LaserBeamProps) => {
  const beamRef = useRef<Mesh>(null);
  const lastDamageTimeRef = useRef(0);

  const damageEnemy = useGameState((state) => state.damageEnemy);
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const terrainObstacles = useGameState((state) => state.terrainObstacles);
  const enemies = useGameState((state) => state.enemies);

  const startVec = useRef(new Vector3()).current;
  const targetCenterVec = useRef(new Vector3()).current;
  const directionVec = useRef(new Vector3()).current;
  const endPointVec = useRef(new Vector3()).current;
  const midPointVec = useRef(new Vector3()).current;
  const obstaclePosVec = useRef(new Vector3()).current;
  const vecToObstacle = useRef(new Vector3()).current;

  useEffect(() => {
    debug.log(`Laser beam created, targeting enemy ${targetId}`);
    if (beamRef.current) {
      beamRef.current.visible = false;
    }
    return () => {
      debug.log(`Laser beam destroyed`);
    };
  }, [targetId]);

  useFrame((state) => {
    if (!beamRef.current) return;

    if (isPaused || isGameOver) {
      beamRef.current.visible = false;
      return;
    }

    const targetEnemy = enemies.find((e) => e.id === targetId);

    if (!targetEnemy) {
      beamRef.current.visible = false;
      return;
    }

    startVec.set(...startPosition);
    targetCenterVec.set(
      targetEnemy.position[0],
      targetEnemy.position[1] + 0.5,
      targetEnemy.position[2]
    );

    const distanceToTarget = startVec.distanceTo(targetCenterVec);

    if (distanceToTarget > range) {
      beamRef.current.visible = false;
      return;
    }

    directionVec.copy(targetCenterVec).sub(startVec);

    let effectiveBeamLength = distanceToTarget;
    let isBlocked = false;
    const directionNormalized = directionVec.clone().normalize();

    for (const obstacle of terrainObstacles) {
      obstaclePosVec.set(...obstacle.position);
      const obstacleRadius =
        (obstacle.type === "rock" ? obstacle.size : obstacle.size * 0.7) * 0.5 +
        0.1;

      vecToObstacle.copy(obstaclePosVec).sub(startVec);
      const tca = vecToObstacle.dot(directionNormalized);

      if (tca < 0 || tca > effectiveBeamLength) continue;

      const d2 = vecToObstacle.lengthSq() - tca * tca;
      const radiusSq = obstacleRadius * obstacleRadius;

      if (d2 <= radiusSq) {
        const thc = Math.sqrt(radiusSq - d2);
        const t0 = tca - thc;

        if (t0 >= 0 && t0 < effectiveBeamLength) {
          effectiveBeamLength = t0;
          isBlocked = true;
        }
      }
    }

    const MIN_BEAM_LENGTH = 0.01;
    if (effectiveBeamLength < MIN_BEAM_LENGTH) {
      beamRef.current.visible = false;
      return;
    }

    beamRef.current.visible = true;

    endPointVec
      .copy(startVec)
      .addScaledVector(directionNormalized, effectiveBeamLength);

    midPointVec.copy(startVec).lerp(endPointVec, 0.5);

    beamRef.current.position.copy(midPointVec);

    beamRef.current.rotation.set(0, 0, 0);
    beamRef.current.lookAt(endPointVec);
    beamRef.current.rotateX(Math.PI / 2);

    const beamThickness = 0.05;
    beamRef.current.scale.set(
      beamThickness,
      effectiveBeamLength,
      beamThickness
    );

    if (!isBlocked) {
      const currentTime = state.clock.getElapsedTime();
      if (currentTime - lastDamageTimeRef.current >= DAMAGE_INTERVAL) {
        damageEnemy(targetId, damage);
        lastDamageTimeRef.current = currentTime;
      }
    } else {
      lastDamageTimeRef.current = state.clock.getElapsedTime();
    }
  });

  return (
    <Cylinder ref={beamRef} args={[1, 1, 1, 8]} visible={false}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2.5}
        transparent={true}
        opacity={0.75}
        depthWrite={false}
      />
    </Cylinder>
  );
};

export default LaserBeam;

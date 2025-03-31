import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Cylinder } from "@react-three/drei";
// Import Mesh
import { Vector3, Object3D, MathUtils, Mesh } from "three";
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
  // CORRECTED: Type the ref as Mesh
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
      // Ensure beam starts potentially visible if conditions allow
      beamRef.current.visible = false; // Start hidden until first frame update
    }
    return () => {
      debug.log(`Laser beam destroyed`);
    };
  }, [targetId]);

  useFrame((state, delta) => {
    if (!beamRef.current) return; // Early exit if ref not ready

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
      targetEnemy.position[1] + 0.5, // Adjust Y offset if needed
      targetEnemy.position[2]
    );

    const distanceToTarget = startVec.distanceTo(targetCenterVec);

    if (distanceToTarget > range) {
      beamRef.current.visible = false;
      return;
    }

    directionVec.copy(targetCenterVec).sub(startVec); // Get direction vector (not normalized yet)

    // --- Obstacle Check ---
    let effectiveBeamLength = distanceToTarget;
    let isBlocked = false;
    const directionNormalized = directionVec.clone().normalize(); // Need normalized for raycasting

    for (const obstacle of terrainObstacles) {
      obstaclePosVec.set(...obstacle.position);
      // IMPORTANT: Adjust this radius calculation based on your obstacle geometry/size definition
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
          // Optimization: If we want the beam to stop at the very first thing it hits,
          // we could potentially break here, but checking all ensures we stop at the CLOSEST one.
        }
      }
    }

    // --- Zero Length Check ---
    const MIN_BEAM_LENGTH = 0.01; // Define a small threshold
    if (effectiveBeamLength < MIN_BEAM_LENGTH) {
      beamRef.current.visible = false;
      return; // Don't try to orient/scale a zero-length beam
    }

    // Make beam visible if it passed checks and has length
    beamRef.current.visible = true;

    // --- Beam Positioning, Orientation, and Scaling ---
    // Recalculate end point based on potentially shortened effectiveBeamLength
    // Use the *normalized* direction vector here
    endPointVec
      .copy(startVec)
      .addScaledVector(directionNormalized, effectiveBeamLength);

    midPointVec.copy(startVec).lerp(endPointVec, 0.5);

    beamRef.current.position.copy(midPointVec);

    // Orientation: Point Z towards end point, then rotate geometry
    beamRef.current.lookAt(endPointVec);
    // Reset potential accumulated rotation before applying the correction
    // (Though lookAt usually resets orientation, this ensures clean state)
    beamRef.current.rotation.set(0, 0, 0); // Reset local rotation
    beamRef.current.lookAt(endPointVec); // Apply lookAt
    beamRef.current.rotateX(Math.PI / 2); // Correct Cylinder alignment

    // Scaling
    const beamThickness = 0.05;
    beamRef.current.scale.set(
      beamThickness,
      effectiveBeamLength,
      beamThickness
    );

    // --- Apply Damage ---
    if (!isBlocked) {
      const currentTime = state.clock.getElapsedTime();
      if (currentTime - lastDamageTimeRef.current >= DAMAGE_INTERVAL) {
        damageEnemy(targetId, damage);
        lastDamageTimeRef.current = currentTime;
      }
    } else {
      lastDamageTimeRef.current = state.clock.getElapsedTime(); // Reset timer if blocked
    }
  });

  return (
    <Cylinder
      // Assign the CORRECTLY TYPED ref
      ref={beamRef}
      args={[1, 1, 1, 8]} // Base geometry (radiusTop=1, radiusBottom=1, height=1, radialSegments=8)
      visible={false} // Start invisible, useFrame controls visibility
    >
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2.5}
        transparent={true}
        opacity={0.75}
        depthWrite={false} // Good for transparency
      />
    </Cylinder>
  );
};

export default LaserBeam;

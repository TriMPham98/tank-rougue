import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3, AdditiveBlending } from "three";
import { Line, Sphere } from "@react-three/drei";
import { useGameState } from "../utils/gameState";
import { debug } from "../utils/debug";
import { useSound } from "../utils/sound";

interface TeslaArcProps {
  id: string;
  position: [number, number, number];
  rotation: number;
  damage: number;
  targetId: string;
  range: number;
  onRemove: (id: string) => void;
}

// Constants for the Tesla Arc behavior
const MAX_CHAIN_TARGETS = 3; // Maximum number of targets that can be hit by a single arc
const CHAIN_DAMAGE_FALLOFF = 0.7; // Damage reduction per chain jump (70% damage on first chain, 49% on second, etc.)
const ARC_LIFETIME = 0.5; // How long the arc stays visible in seconds
const CHAIN_RANGE = 10; // Range for secondary arcs to chain to nearby enemies
const ARC_SEGMENTS = 15; // Number of segments for the zigzag lightning effect
const FORK_PROBABILITY = 0.4; // Probability of a fork appearing on the main arc
const MAX_FORKS = 5; // Maximum number of forks per arc

// Types for enhanced visual effects
interface LightningFork {
  points: Vector3[];
  color: string;
  width: number;
  opacity: number;
}

interface GlowPoint {
  position: Vector3;
  size: number;
  color: string;
  intensity: number;
}

const TeslaArc = ({
  id,
  position,
  damage,
  targetId,
  onRemove,
}: TeslaArcProps) => {
  const groupRef = useRef<Group>(null);
  const startTimeRef = useRef(0);
  const hasProcessedChainRef = useRef(false);
  const primaryTargetPosRef = useRef<Vector3 | null>(null);
  const targetPositionsRef = useRef<Array<{ id: string; position: Vector3 }>>(
    []
  );
  const hasDamagedTargetsRef = useRef<Set<string>>(new Set());
  const animationTimeRef = useRef(0);

  // Lightning path points
  const [primaryArcPoints, setPrimaryArcPoints] = useState<Vector3[]>([]);
  const [chainArcPoints, setChainArcPoints] = useState<
    Array<{ points: Vector3[]; color: string }>
  >([]);

  // Enhanced visual effects
  const [forks, setForks] = useState<LightningFork[]>([]);
  const [glowPoints, setGlowPoints] = useState<GlowPoint[]>([]);
  const [arcOpacity, setArcOpacity] = useState(1.0);

  const damageEnemy = useGameState((state) => state.damageEnemy);
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const enemies = useGameState((state) => state.enemies);
  const sound = useSound();

  // Generate a zigzag lightning path between two points
  const generateLightningPath = (
    start: Vector3,
    end: Vector3,
    segments: number = ARC_SEGMENTS,
    volatility: number = 1.0
  ): Vector3[] => {
    const points: Vector3[] = [];
    points.push(start.clone());

    const direction = end.clone().sub(start);
    const length = direction.length();
    const segmentLength = length / segments;
    const mainDir = direction.clone().normalize();

    // Calculate perpendicular axes for random deviations
    const up = new Vector3(0, 1, 0);
    const perpendicular = new Vector3().crossVectors(direction, up).normalize();
    if (perpendicular.lengthSq() < 0.1) {
      perpendicular.set(1, 0, 0); // Fallback if direction is parallel to up
    }

    // Create another perpendicular vector for 3D zigzags
    const perpendicular2 = new Vector3()
      .crossVectors(mainDir, perpendicular)
      .normalize();

    // Generate zigzag segments with more randomness
    for (let i = 1; i < segments; i++) {
      const segmentPos = start
        .clone()
        .addScaledVector(mainDir, segmentLength * i);

      // More chaotic deviations based on volatility (higher for forks)
      const deviation1 =
        Math.random() *
        segmentLength *
        0.7 *
        volatility *
        (Math.random() > 0.5 ? 1 : -1);
      const deviation2 =
        Math.random() *
        segmentLength *
        0.5 *
        volatility *
        (Math.random() > 0.5 ? 1 : -1);

      // Add deviations in perpendicular directions for more 3D-like effect
      segmentPos.addScaledVector(perpendicular, deviation1);
      segmentPos.addScaledVector(perpendicular2, deviation2);

      // Add some vertical variation
      const vertDeviation =
        Math.random() *
        segmentLength *
        0.4 *
        volatility *
        (Math.random() > 0.5 ? 1 : -1);
      segmentPos.y += vertDeviation;

      points.push(segmentPos);
    }

    points.push(end.clone());
    return points;
  };

  // Generate random forks from the main lightning path
  const generateForks = (mainPath: Vector3[]): LightningFork[] => {
    const newForks: LightningFork[] = [];
    if (mainPath.length < 4) return newForks;

    // Consider only middle segments for forks (not start/end)
    const forkableSegments = mainPath.slice(1, -2);
    const numForks = Math.min(
      Math.floor(Math.random() * MAX_FORKS) + 1,
      forkableSegments.length
    );

    // Create random indices for forks
    const forkIndices = new Set<number>();
    while (forkIndices.size < numForks) {
      const idx = Math.floor(Math.random() * forkableSegments.length);
      if (Math.random() < FORK_PROBABILITY) {
        forkIndices.add(idx);
      }
    }

    // Create forks at selected points
    Array.from(forkIndices).forEach((idx) => {
      const startPoint = forkableSegments[idx];
      // Create random direction for fork
      const randomDir = new Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();

      // Create random length
      const forkLength = Math.random() * 2 + 0.5;
      const endPoint = startPoint
        .clone()
        .add(randomDir.multiplyScalar(forkLength));

      // Generate fork path with higher volatility
      const forkPoints = generateLightningPath(
        startPoint,
        endPoint,
        Math.floor(Math.random() * 5) + 4,
        2.0 // More chaotic pattern
      );

      // Add to forks collection
      newForks.push({
        points: forkPoints,
        color: "#80DDFF",
        width: 0.6 + Math.random() * 0.8,
        opacity: 0.6 + Math.random() * 0.3,
      });
    });

    return newForks;
  };

  // Generate glow points along the lightning path
  const generateGlowPoints = (path: Vector3[]): GlowPoint[] => {
    const glows: GlowPoint[] = [];

    // Add glows at segment junctions
    path.forEach((point, index) => {
      if (index % 2 === 0 && Math.random() > 0.5) {
        glows.push({
          position: point.clone(),
          size: 0.1 + Math.random() * 0.2,
          color: "#A0FFFF",
          intensity: 0.7 + Math.random() * 0.5,
        });
      }
    });

    // Always add bigger glow at the impact point
    if (path.length > 0) {
      glows.push({
        position: path[path.length - 1].clone(),
        size: 0.3 + Math.random() * 0.2,
        color: "#FFFFFF",
        intensity: 1.2,
      });
    }

    return glows;
  };

  // Process chain effect to nearby enemies
  const processChainEffect = () => {
    if (hasProcessedChainRef.current || !primaryTargetPosRef.current) return;

    hasProcessedChainRef.current = true;
    hasDamagedTargetsRef.current.add(targetId); // Mark primary target as damaged

    // Find eligible chain targets (enemies within range that haven't been hit yet)
    const potentialChainTargets = enemies.filter((enemy) => {
      if (hasDamagedTargetsRef.current.has(enemy.id)) return false;

      const enemyPos = new Vector3(...enemy.position);
      return primaryTargetPosRef.current!.distanceTo(enemyPos) <= CHAIN_RANGE;
    });

    // Sort by distance to primary target
    potentialChainTargets.sort((a, b) => {
      const aDist = primaryTargetPosRef.current!.distanceTo(
        new Vector3(...a.position)
      );
      const bDist = primaryTargetPosRef.current!.distanceTo(
        new Vector3(...b.position)
      );
      return aDist - bDist;
    });

    // Process up to MAX_CHAIN_TARGETS
    const chainTargets = potentialChainTargets.slice(0, MAX_CHAIN_TARGETS);

    // Generate chain arcs
    const chainArcs: Array<{ points: Vector3[]; color: string }> = [];
    let previousPos = primaryTargetPosRef.current;
    let currentDamage = damage * CHAIN_DAMAGE_FALLOFF;

    chainTargets.forEach((enemy, index) => {
      const enemyPos = new Vector3(...enemy.position).add(
        new Vector3(0, 0.5, 0)
      ); // Target center of enemy
      const color =
        index === 0 ? "#80EEFF" : index === 1 ? "#60CFFF" : "#40AFFF";

      // Create lightning path with decreasing detail for performance
      const arcPoints = generateLightningPath(
        previousPos,
        enemyPos,
        ARC_SEGMENTS - index * 3
      );
      chainArcs.push({ points: arcPoints, color });

      // Apply chain damage with damage falloff
      damageEnemy(enemy.id, currentDamage);
      debug.log(
        `Tesla Chain: Enemy ${enemy.id} damaged for ${currentDamage.toFixed(1)}`
      );

      // Mark as damaged and prepare for next chain
      hasDamagedTargetsRef.current.add(enemy.id);
      previousPos = enemyPos;
      currentDamage *= CHAIN_DAMAGE_FALLOFF;

      // Store for rendering
      targetPositionsRef.current.push({ id: enemy.id, position: enemyPos });

      // Play chain electricity sound with lowering volume
      sound.play("electricity", 0.4 - index * 0.1);
    });

    // Update state with all chain arcs
    setChainArcPoints(chainArcs);

    // Play Tesla sound
    sound.play("electricity", 0.5);
  };

  // Initialize component and handle cleanup
  useEffect(() => {
    startTimeRef.current = Date.now() / 1000;
    debug.log(`Tesla arc ${id} created, targeting enemy ${targetId}`);

    return () => {
      debug.log(`Tesla arc ${id} destroyed`);
    };
  }, [id, targetId]);

  // Handle frame updates
  useFrame((_, delta) => {
    if (isPaused || isGameOver) return;

    animationTimeRef.current += delta * 10; // For animating effects

    const currentTime = Date.now() / 1000;
    const elapsedTime = currentTime - startTimeRef.current;

    // Update opacity for fade-out effect
    const fadeoutStart = ARC_LIFETIME * 0.6;
    if (elapsedTime > fadeoutStart) {
      const remainingTime = ARC_LIFETIME - elapsedTime;
      const newOpacity = Math.max(
        0,
        remainingTime / (ARC_LIFETIME - fadeoutStart)
      );
      setArcOpacity(newOpacity);
    }

    // Check lifetime and remove if expired
    if (elapsedTime > ARC_LIFETIME) {
      onRemove(id);
      return;
    }

    // First frame setup: identify target position and initialize
    if (!primaryTargetPosRef.current) {
      const targetEnemy = enemies.find((e) => e.id === targetId);
      if (!targetEnemy) {
        onRemove(id);
        return;
      }

      // Apply primary damage
      damageEnemy(targetId, damage);

      // Set up start and end positions for the primary arc
      const startPos = new Vector3(...position);
      const targetPos = new Vector3(
        targetEnemy.position[0],
        targetEnemy.position[1] + 0.5, // Target center of enemy
        targetEnemy.position[2]
      );

      primaryTargetPosRef.current = targetPos;

      // Generate the zigzag lightning path
      const lightningPoints = generateLightningPath(startPos, targetPos);
      setPrimaryArcPoints(lightningPoints);

      // Generate forks from main arc
      const arcForks = generateForks(lightningPoints);
      setForks(arcForks);

      // Generate glow points
      const glows = generateGlowPoints(lightningPoints);
      setGlowPoints(glows);

      // Process chain damage immediately
      processChainEffect();
    }

    // Add subtle animation to glow points by updating their size
    if (glowPoints.length > 0) {
      setGlowPoints((prevGlows) =>
        prevGlows.map((glow) => ({
          ...glow,
          size:
            glow.size *
            (0.9 + Math.sin(animationTimeRef.current + Math.random()) * 0.2),
          intensity:
            glow.intensity *
            (0.9 + Math.cos(animationTimeRef.current * 1.5) * 0.2),
        }))
      );
    }
  });

  return (
    <group ref={groupRef}>
      {/* Primary arc to main target */}
      {primaryArcPoints.length > 0 && (
        <Line
          points={primaryArcPoints}
          color="#A0FFFF"
          lineWidth={2.5}
          transparent={true}
          opacity={arcOpacity}
          segments={true} // Important: renders segments for lightning effect
          blending={AdditiveBlending}
        />
      )}

      {/* Secondary forks from main arc */}
      {forks.map((fork, index) => (
        <Line
          key={`fork-${index}`}
          points={fork.points}
          color={fork.color}
          lineWidth={fork.width}
          transparent={true}
          opacity={fork.opacity * arcOpacity}
          segments={true}
          blending={AdditiveBlending}
        />
      ))}

      {/* Glow points along the lightning */}
      {glowPoints.map((glow, index) => (
        <Sphere
          key={`glow-${index}`}
          args={[glow.size, 8, 8]}
          position={glow.position}>
          <meshBasicMaterial
            color={glow.color}
            transparent={true}
            opacity={arcOpacity * glow.intensity}
            blending={AdditiveBlending}
          />
        </Sphere>
      ))}

      {/* Chain arcs to secondary targets */}
      {chainArcPoints.map((arc, index) => (
        <Line
          key={`chain-${index}`}
          points={arc.points}
          color={arc.color}
          lineWidth={1.8 - index * 0.4}
          transparent={true}
          opacity={arcOpacity * (1 - index * 0.15)}
          segments={true}
          blending={AdditiveBlending}
        />
      ))}
    </group>
  );
};

export default TeslaArc;

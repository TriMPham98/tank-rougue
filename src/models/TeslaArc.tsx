import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3, AdditiveBlending, Color } from "three";
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
const MAX_CHAIN_TARGETS = 3;
const CHAIN_DAMAGE_FALLOFF = 0.7;
const ARC_LIFETIME = 0.4;
const CHAIN_RANGE = 10;
const ARC_SEGMENTS = 12;
const FORK_PROBABILITY = 0.35;
const MAX_FORKS = 4;
const ARC_VOLATILITY = 1.2;
const FORK_VOLATILITY = 2.5;

// Types for enhanced visual effects
interface LightningFork {
  points: Vector3[];
  color: Color;
  width: number;
  opacity: number;
}

interface GlowPoint {
  position: Vector3;
  size: number;
  color: Color;
  intensity: number;
  isImpact?: boolean;
}

const TeslaArc = ({
  id,
  position,
  damage,
  targetId,
  onRemove,
}: TeslaArcProps) => {
  const groupRef = useRef<Group>(null);
  const startTimeRef = useRef(Date.now() / 1000);
  const hasProcessedChainRef = useRef(false);
  const primaryTargetPosRef = useRef<Vector3 | null>(null);
  const targetPositionsRef = useRef<Array<{ id: string; position: Vector3 }>>(
    []
  );
  const hasDamagedTargetsRef = useRef<Set<string>>(new Set());
  const animationTimeRef = useRef(0);

  const [primaryArcPoints, setPrimaryArcPoints] = useState<Vector3[]>([]);
  const [chainArcPoints, setChainArcPoints] = useState<
    Array<{ points: Vector3[]; color: Color; width: number }>
  >([]);

  const [forks, setForks] = useState<LightningFork[]>([]);
  const [glowPoints, setGlowPoints] = useState<GlowPoint[]>([]);
  const [arcOpacity, setArcOpacity] = useState(1.0);

  const damageEnemy = useGameState((state) => state.damageEnemy);
  const isPaused = useGameState((state) => state.isPaused);
  const isGameOver = useGameState((state) => state.isGameOver);
  const enemies = useGameState((state) => state.enemies);
  const sound = useSound();

  const generateLightningPath = (
    start: Vector3,
    end: Vector3,
    segments: number = ARC_SEGMENTS,
    volatility: number = ARC_VOLATILITY
  ): Vector3[] => {
    const points: Vector3[] = [];
    points.push(start.clone());
    const direction = end.clone().sub(start);
    const length = direction.length();
    if (length < 0.1) return [start, end];
    const segmentLength = length / segments;
    const mainDir = direction.clone().normalize();
    let perp1: Vector3;
    let perp2: Vector3;
    if (Math.abs(mainDir.y) > 0.9) {
      perp1 = new Vector3(1, 0, 0);
    } else {
      perp1 = new Vector3(0, 1, 0);
    }
    perp1.crossVectors(mainDir, perp1).normalize();
    perp2 = new Vector3().crossVectors(mainDir, perp1).normalize();
    for (let i = 1; i < segments; i++) {
      const segmentPos = start
        .clone()
        .addScaledVector(mainDir, segmentLength * i);
      const deviationScale = segmentLength * 0.6 * volatility;
      const deviation1 = (Math.random() * 2 - 1) * deviationScale;
      const deviation2 = (Math.random() * 2 - 1) * deviationScale;
      const deviation3 = (Math.random() * 2 - 1) * deviationScale * 0.5;
      segmentPos.addScaledVector(perp1, deviation1);
      segmentPos.addScaledVector(perp2, deviation2);
      segmentPos.y += deviation3;
      points.push(segmentPos);
    }
    points.push(end.clone());
    return points;
  };

  const generateForks = (mainPath: Vector3[]): LightningFork[] => {
    const newForks: LightningFork[] = [];
    if (mainPath.length < 3) return newForks;
    const numPossibleForks = mainPath.length - 2;
    const numForks = Math.min(
      MAX_FORKS,
      Math.floor(
        numPossibleForks * FORK_PROBABILITY * (Math.random() * 0.5 + 0.75)
      )
    );
    const forkIndices = new Set<number>();
    while (forkIndices.size < numForks && forkIndices.size < numPossibleForks) {
      const idx = Math.floor(Math.random() * numPossibleForks) + 1;
      forkIndices.add(idx);
    }
    forkIndices.forEach((idx) => {
      const startPoint = mainPath[idx];
      const randomDir = new Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      const forkLength = Math.random() * 1.5 + 0.8;
      const endPoint = startPoint
        .clone()
        .addScaledVector(randomDir, forkLength);
      const forkPoints = generateLightningPath(
        startPoint,
        endPoint,
        Math.floor(Math.random() * 4) + 3,
        FORK_VOLATILITY
      );
      newForks.push({
        points: forkPoints,
        color: new Color(0x60afff),
        width: 0.4 + Math.random() * 0.6,
        opacity: 0.5 + Math.random() * 0.3,
      });
    });
    return newForks;
  };

  const generateGlowPoints = (path: Vector3[]): GlowPoint[] => {
    const glows: GlowPoint[] = [];
    const baseColor = new Color(0xa0ffff);
    path.forEach((point, index) => {
      if (index > 0 && index < path.length - 1 && Math.random() > 0.6) {
        glows.push({
          position: point
            .clone()
            .add(
              new Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5
              ).multiplyScalar(0.1)
            ),
          size: 0.08 + Math.random() * 0.12,
          color: baseColor
            .clone()
            .lerp(new Color(0xffffff), Math.random() * 0.3),
          intensity: 0.6 + Math.random() * 0.4,
        });
      }
    });
    if (path.length > 0) {
      glows.push({
        position: path[path.length - 1].clone(),
        size: 0.4 + Math.random() * 0.2,
        color: new Color(0xffffff),
        intensity: 1.5 + Math.random() * 0.5,
        isImpact: true,
      });
    }
    return glows;
  };

  const processChainEffect = () => {
    if (hasProcessedChainRef.current || !primaryTargetPosRef.current) return;

    hasProcessedChainRef.current = true;
    hasDamagedTargetsRef.current.add(targetId);

    let lastHitPosition = primaryTargetPosRef.current;
    let availableDamage = damage * CHAIN_DAMAGE_FALLOFF;
    let chainCount = 0;
    const chainColors = [
      new Color(0x80eeff),
      new Color(0x60cfff),
      new Color(0x40afff),
    ];
    const chainWidths = [1.8, 1.5, 1.2];
    const newChainArcs: Array<{
      points: Vector3[];
      color: Color;
      width: number;
    }> = [];

    while (chainCount < MAX_CHAIN_TARGETS) {
      const potentialTargets = enemies.filter((enemy) => {
        if (hasDamagedTargetsRef.current.has(enemy.id)) return false;
        const enemyPos = new Vector3(...enemy.position);
        return (
          lastHitPosition.distanceToSquared(enemyPos) <=
          CHAIN_RANGE * CHAIN_RANGE
        );
      });
      if (potentialTargets.length === 0) break;
      potentialTargets.sort((a, b) => {
        const aDistSq = lastHitPosition.distanceToSquared(
          new Vector3(...a.position)
        );
        const bDistSq = lastHitPosition.distanceToSquared(
          new Vector3(...b.position)
        );
        return aDistSq - bDistSq;
      });
      const nextTarget = potentialTargets[0];
      const nextTargetPos = new Vector3(...nextTarget.position).add(
        new Vector3(0, 0.5, 0)
      );
      const arcPoints = generateLightningPath(
        lastHitPosition,
        nextTargetPos,
        Math.max(5, ARC_SEGMENTS - chainCount * 2),
        ARC_VOLATILITY + chainCount * 0.2
      );
      const arcColor = chainColors[chainCount % chainColors.length];
      const arcWidth = chainWidths[chainCount % chainWidths.length];
      newChainArcs.push({
        points: arcPoints,
        color: arcColor,
        width: arcWidth,
      });
      damageEnemy(nextTarget.id, availableDamage);
      debug.log(
        `Tesla Chain ${chainCount + 1}: Enemy ${
          nextTarget.id
        } damaged for ${availableDamage.toFixed(1)}`
      );
      hasDamagedTargetsRef.current.add(nextTarget.id);
      lastHitPosition = nextTargetPos;
      availableDamage *= CHAIN_DAMAGE_FALLOFF;
      targetPositionsRef.current.push({
        id: nextTarget.id,
        position: nextTargetPos,
      });
      chainCount++;
      // --- Sound Fix ---
      // Reverted to original sound ID, assuming "electricity" exists.
      // If even "electricity" doesn't exist, comment this out.
      sound.play("electricity", 0.35 - chainCount * 0.08);
      // Original attempt (caused errors):
      // sound.play("electricity_chain", 0.35 - chainCount * 0.08);
      // --- End Sound Fix ---
    }
    setChainArcPoints(newChainArcs);
    if (chainCount > 0) {
      debug.log(`Tesla arc ${id} chained to ${chainCount} additional targets.`);
    }
  };

  useEffect(() => {
    debug.log(`Tesla arc ${id} created, targeting enemy ${targetId}`);
    const targetEnemy = enemies.find((e) => e.id === targetId);
    if (!targetEnemy) {
      console.warn(`TeslaArc: Target enemy ${targetId} not found on creation.`);
      onRemove(id);
      return;
    }
    damageEnemy(targetId, damage);
    debug.log(
      `Tesla Primary: Enemy ${targetId} damaged for ${damage.toFixed(1)}`
    );
    const startPos = new Vector3(...position);
    const targetPos = new Vector3(
      targetEnemy.position[0],
      targetEnemy.position[1] + 0.5,
      targetEnemy.position[2]
    );
    primaryTargetPosRef.current = targetPos;
    const lightningPoints = generateLightningPath(startPos, targetPos);
    setPrimaryArcPoints(lightningPoints);
    setForks(generateForks(lightningPoints));
    setGlowPoints(generateGlowPoints(lightningPoints));

    // --- Sound Fix ---
    // Reverted to original sound ID, assuming "electricity" exists.
    // If even "electricity" doesn't exist, comment this out.
    sound.play("electricity", 0.6);
    // Original attempt (caused errors):
    // sound.play("electricity_hit", 0.6);
    // --- End Sound Fix ---

    targetPositionsRef.current.push({ id: targetId, position: targetPos });
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, targetId]);

  useFrame((_, delta) => {
    if (isPaused || isGameOver) return;
    const now = Date.now() / 1000;
    const elapsedTime = now - startTimeRef.current;
    animationTimeRef.current += delta * 15;
    if (primaryTargetPosRef.current && !hasProcessedChainRef.current) {
      processChainEffect();
    }
    const fadeoutStart = ARC_LIFETIME * 0.5;
    if (elapsedTime > fadeoutStart) {
      const remainingTime = ARC_LIFETIME - elapsedTime;
      const fadeDuration = ARC_LIFETIME - fadeoutStart;
      const newOpacity =
        fadeDuration > 0 ? Math.max(0, remainingTime / fadeDuration) : 0;
      setArcOpacity(newOpacity * newOpacity);
    } else {
      setArcOpacity(1.0);
    }
    if (elapsedTime >= ARC_LIFETIME) {
      onRemove(id);
      return;
    }
    setGlowPoints((prevGlows) =>
      prevGlows.map((glow) => {
        const pulseFactor = glow.isImpact ? 1.5 : 1.0;
        const randomTimeOffset = glow.position.x + glow.position.z;
        const sizeMultiplier =
          0.9 +
          Math.sin(animationTimeRef.current * pulseFactor + randomTimeOffset) *
            0.2;
        const intensityMultiplier =
          0.85 +
          Math.cos(
            animationTimeRef.current * 1.2 * pulseFactor + glow.position.y
          ) *
            0.15;
        return {
          ...glow,
          size: Math.max(
            0.02,
            (glow.isImpact ? 0.4 : 0.08) +
              Math.random() * (glow.isImpact ? 0.2 : 0.12) * sizeMultiplier
          ),
          intensity: Math.max(
            0.1,
            (glow.isImpact ? 1.5 : 0.6) +
              Math.random() * (glow.isImpact ? 0.5 : 0.4) * intensityMultiplier
          ),
        };
      })
    );
  });

  const lineMaterialProps = {
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  };

  const glowMaterialProps = {
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  };

  return (
    <group ref={groupRef}>
      {primaryArcPoints.length > 1 && (
        <Line
          points={primaryArcPoints}
          color={new Color(0xa0ffff)}
          lineWidth={2.8}
          opacity={arcOpacity}
          // --- Resolution Fix ---
          // Removed the problematic prop
          // material-resolution={[512, 512]}
          // --- End Resolution Fix ---
          {...lineMaterialProps}
        />
      )}
      {forks.map((fork, index) => (
        <Line
          key={`fork-${id}-${index}`}
          points={fork.points}
          color={fork.color}
          lineWidth={fork.width * arcOpacity}
          opacity={fork.opacity * arcOpacity}
          {...lineMaterialProps}
        />
      ))}
      {chainArcPoints.map((arc, index) => (
        <Line
          key={`chain-${id}-${index}`}
          points={arc.points}
          color={arc.color}
          lineWidth={arc.width * arcOpacity}
          opacity={arcOpacity * (1 - index * 0.1)}
          {...lineMaterialProps}
        />
      ))}
      {glowPoints.map((glow, index) => (
        <Sphere
          key={`glow-${id}-${index}`}
          args={[glow.size, 8, 8]}
          position={glow.position}>
          <meshBasicMaterial
            color={glow.color}
            opacity={arcOpacity * glow.intensity * (glow.isImpact ? 1.3 : 1.0)}
            {...glowMaterialProps}
          />
        </Sphere>
      ))}
    </group>
  );
};

export default TeslaArc;

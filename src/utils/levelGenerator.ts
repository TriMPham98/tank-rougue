import { Enemy, PowerUp, useGameState } from "./gameState";
import { debug } from "./debug";
import * as THREE from "three"; // Import THREE for Vector2

interface LevelConfig {
  gridSize: number;
  enemyCount: number;
}

// Helper function to check if a position is clear of obstacles
const isPositionClear = (
  x: number,
  z: number,
  terrainObstacles: Array<{
    position: [number, number, number];
    type: "rock";
    size: number;
  }>,
  minClearance: number = 8
): boolean => {
  for (const obstacle of terrainObstacles) {
    const dx = obstacle.position[0] - x;
    const dz = obstacle.position[2] - z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const rockMultiplier = 2.5;
    const requiredClearance = obstacle.size * rockMultiplier + minClearance;
    if (distance < requiredClearance) {
      return false;
    }
  }
  return true;
};

// Helper function to check if a position is within map boundaries
const isWithinMapBoundaries = (
  x: number,
  z: number,
  mapSize: number = 100
): boolean => {
  const halfMapSize = mapSize / 2;
  const buffer = 2;
  return (
    x >= -halfMapSize + buffer &&
    x <= halfMapSize - buffer &&
    z >= -halfMapSize + buffer &&
    z <= halfMapSize - buffer
  );
};

// Generate a random position on the grid, ensuring it's not too close to other entities or obstacles
export const generateRandomPosition = (
  gridSize: number,
  existingPositions: [number, number, number][],
  minDistanceFromExisting = 5,
  attempts = 300
): [number, number, number] => {
  const terrainObstacles = useGameState.getState().terrainObstacles;
  let attempts_count = 0;
  while (attempts_count < attempts) {
    const x = (Math.random() - 0.5) * gridSize;
    const z = (Math.random() - 0.5) * gridSize;
    const y = 0.5;

    if (!isWithinMapBoundaries(x, z)) {
      attempts_count++;
      continue;
    }
    if (!isPositionClear(x, z, terrainObstacles)) {
      attempts_count++;
      continue;
    }

    let isFarEnough = true;
    for (const pos of existingPositions) {
      const dx = pos[0] - x;
      const dz = pos[2] - z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance < minDistanceFromExisting) {
        isFarEnough = false;
        break;
      }
    }

    if (isFarEnough) {
      return [x, y, z];
    }
    attempts_count++;
  }

  debug.warn(
    "Could not find ideal spawn position, trying with reduced constraints"
  );
  const searchGrid = 10;
  for (let gridX = -searchGrid; gridX <= searchGrid; gridX += 2) {
    for (let gridZ = -searchGrid; gridZ <= searchGrid; gridZ += 2) {
      const x = (gridX / searchGrid) * (gridSize * 0.8);
      const z = (gridZ / searchGrid) * (gridSize * 0.8);
      const y = 0.5;
      if (!isWithinMapBoundaries(x, z)) continue;
      if (isPositionClear(x, z, terrainObstacles, 4)) {
        debug.log("Found spawn position using grid search:", { x, y, z });
        return [x, y, z];
      }
    }
  }

  debug.warn("Using last resort position finding technique");
  for (let radius = gridSize / 2; radius >= 5; radius -= 5) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 0.5;
      if (!isWithinMapBoundaries(x, z)) continue;
      if (isPositionClear(x, z, terrainObstacles, 3)) {
        debug.log("Found emergency spawn position at radius:", {
          radius,
          x,
          y,
          z,
        });
        return [x, y, z];
      }
    }
  }

  debug.error(
    "All position finding techniques failed - using emergency position"
  );
  const safePositions: [number, number, number][] = [
    [20, 0.5, 20],
    [-20, 0.5, 20],
    [-20, 0.5, -20],
    [20, 0.5, -20],
    [0, 0.5, 0],
  ];
  for (const pos of safePositions) {
    if (isPositionClear(pos[0], pos[2], terrainObstacles, 3)) {
      return pos;
    }
  }
  return [0, 0.5, 0];
};

// Generate enemies for the current level
export const generateEnemies = (
  level: number,
  playerPosition: [number, number, number]
): Omit<Enemy, "id">[] => {
  const gameState = useGameState.getState(); // Get current state
  const safeZoneCenter = gameState.safeZoneCenter;
  const safeZoneRadius = gameState.safeZoneRadius;
  const safeZoneActive = gameState.safeZoneActive;

  if (level === 1) {
    const enemyCount = 1;
    const gridSize = Math.min(40 + level * 2, 70);

    const config: LevelConfig = { gridSize, enemyCount };
    const enemies: Omit<Enemy, "id">[] = [];
    const existingPositions: [number, number, number][] = [playerPosition];

    const position = generateRandomPosition(config.gridSize, existingPositions);
    enemies.push({ position, health: 85, type: "tank", speed: 1.3 });
    return enemies;
  }

  const baseEnemyCount = 1;
  const maxEnemies = level >= 40 ? 20 : 15;

  let enemyCount;
  if (level <= 10) {
    enemyCount = Math.min(
      baseEnemyCount + Math.floor(Math.sqrt(level) * 1.25),
      maxEnemies
    );
  } else if (level < 40) {
    enemyCount = Math.min(
      baseEnemyCount + Math.floor(Math.sqrt(level) * 2),
      maxEnemies
    );
  } else {
    enemyCount = Math.min(
      baseEnemyCount + Math.floor(Math.sqrt(level) * 2.3),
      maxEnemies
    );
  }

  const gridSize = Math.min(40 + level * 2, 70);

  const config: LevelConfig = {
    gridSize,
    enemyCount,
  };
  const enemies: Omit<Enemy, "id">[] = [];
  const existingPositions: [number, number, number][] = [playerPosition];

  let turretCount = 0;
  const maxTurrets = 3;

  const turretMaxRegenAttempts = 15; // Max attempts to find position inside safe zone

  for (let i = 0; i < config.enemyCount; i++) {
    let position: [number, number, number];
    let type: "tank" | "turret" | "bomber";
    let health: number;
    let speed: number = 1;

    // Determine enemy type first
    const turretProbability = Math.min(0.1 + level * 0.02, 0.3);
    const bomberProbability =
      level >= 15 ? Math.min(0.15 + (level - 15) * 0.015, 0.3) : 0;
    const random = Math.random();

    if (level >= 15 && random < bomberProbability) {
      type = "bomber";
      health = 40 + level * 3;
      speed = 4.0;
    } else if (
      random < turretProbability + bomberProbability &&
      turretCount < maxTurrets
    ) {
      type = "turret";
      const turretBaseHealth = 50;
      const linearScale = level * 9;
      health = turretBaseHealth + linearScale;
      turretCount++;
    } else {
      type = "tank";
      const tankBaseHealth = 75;
      const linearScale = level * 9;
      health = tankBaseHealth + linearScale;
      speed = 1.3;
    }

    // Now generate position, checking safe zone for turrets
    let attempts = 0;
    let positionFound = false;
    while (attempts < turretMaxRegenAttempts && !positionFound) {
      position = generateRandomPosition(config.gridSize, existingPositions);

      if ((type === "turret" || type === "tank") && safeZoneActive) {
        const turretPosVec = new THREE.Vector2(position[0], position[2]);
        const centerVec = new THREE.Vector2(
          safeZoneCenter[0],
          safeZoneCenter[1]
        );
        const distanceToCenter = turretPosVec.distanceTo(centerVec);

        if (distanceToCenter <= safeZoneRadius) {
          positionFound = true; // Position is valid
        } else {
          // Position is outside the safe zone, try again
          attempts++;
          if (attempts >= turretMaxRegenAttempts) {
            debug.warn(
              `${type} spawn failed after ${attempts} attempts to find position in safe zone. Placing near center.`
            );
            const angle = Math.random() * Math.PI * 2;
            const radiusOffset = Math.min(safeZoneRadius * 0.8, 5);
            position = [
              safeZoneCenter[0] + Math.cos(angle) * radiusOffset,
              0.5,
              safeZoneCenter[1] + Math.sin(angle) * radiusOffset,
            ];
            if (
              !isPositionClear(
                position[0],
                position[2],
                gameState.terrainObstacles,
                3
              )
            ) {
              position = [safeZoneCenter[0], 0.5, safeZoneCenter[1]];
              debug.warn(
                `Fallback ${type} position near center also obstructed. Placing AT center.`
              );
            }
            positionFound = true;
          }
        }
      } else {
        positionFound = true;
      }
    }

    // @ts-ignore - position will be assigned within the loop or fallback
    existingPositions.push(position);
    enemies.push({
      // @ts-ignore - position will be assigned
      position,
      health,
      type,
      speed,
    });
  }

  return enemies;
};

// Generate power-ups for the current level
export const generatePowerUps = (): Omit<PowerUp, "id">[] => {
  // No longer spawn random power-ups at level generation
  // Power-ups will only drop from defeated enemies with a 5% chance
  return [];
};

// Generate a complete level
export const generateLevel = () => {
  const { spawnEnemy } = useGameState.getState();
  const enemies = generateEnemies(1, [0, 0.5, 0]); // Hardcode defaults as params unused
  const powerUps: Omit<PowerUp, "id">[] = [];

  enemies.forEach((enemy) => spawnEnemy(enemy));

  return { enemies, powerUps };
};

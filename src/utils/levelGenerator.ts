import { Enemy, PowerUp, useGameState } from "./gameState";
import { debug } from "./debug";

interface LevelConfig {
  gridSize: number;
  enemyCount: number;
  powerUpCount: number;
}

// Helper function to check if a position is clear of obstacles
const isPositionClear = (
  x: number,
  z: number,
  terrainObstacles: Array<{
    position: [number, number, number];
    type: "rock" | "tree";
    size: number;
  }>,
  minClearance: number = 5 // Increased clearance to prevent spawning inside rocks
): boolean => {
  for (const obstacle of terrainObstacles) {
    const dx = obstacle.position[0] - x;
    const dz = obstacle.position[2] - z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Since we only have rocks now, always use this clearance calculation
    const requiredClearance = obstacle.size * 1.5 + minClearance; // Increased multiplier for rock obstacles

    if (distance < requiredClearance) {
      return false;
    }
  }
  return true;
};

// Generate a random position on the grid, ensuring it's not too close to other entities or obstacles
export const generateRandomPosition = (
  gridSize: number,
  existingPositions: [number, number, number][],
  minDistanceFromExisting = 5,
  attempts = 200 // Increased from 100 to try harder to find valid positions
): [number, number, number] => {
  const terrainObstacles = useGameState.getState().terrainObstacles;

  // Try to find a position that is far enough from existing entities and obstacles
  let attempts_count = 0;
  while (attempts_count < attempts) {
    // Generate random x, z coordinates within the grid
    const x = (Math.random() - 0.5) * gridSize;
    const z = (Math.random() - 0.5) * gridSize;
    const y = 0.5; // Keep y-position consistent for now

    // Check if position is clear of obstacles
    if (!isPositionClear(x, z, terrainObstacles)) {
      attempts_count++;
      continue;
    }

    // Check distance from existing positions
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
      debug.log("Found clear spawn position:", { x, y, z });
      return [x, y, z];
    }

    attempts_count++;
  }

  // If we couldn't find a good position after max attempts, try with reduced constraints
  debug.warn(
    "Could not find ideal spawn position, trying with reduced constraints"
  );

  // More systematically search for a position
  const searchGrid = 8; // Search in a grid pattern
  for (let gridX = -searchGrid; gridX <= searchGrid; gridX += 2) {
    for (let gridZ = -searchGrid; gridZ <= searchGrid; gridZ += 2) {
      const x = (gridX / searchGrid) * (gridSize * 0.8); // Use 80% of the grid size
      const z = (gridZ / searchGrid) * (gridSize * 0.8);
      const y = 0.5;

      // Check if this grid position is clear
      if (isPositionClear(x, z, terrainObstacles, 3)) {
        // Reduced clearance but still safe
        debug.log("Found spawn position using grid search:", { x, y, z });
        return [x, y, z];
      }
    }
  }

  // Last resort - find any position not directly inside a rock
  debug.warn("Using last resort position finding technique");

  // Start from the edges and work inward
  for (let radius = gridSize / 2; radius >= 5; radius -= 5) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 0.5;

      if (isPositionClear(x, z, terrainObstacles, 2)) {
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

  // Absolute fallback - spawn at a safe known location well away from origin
  debug.error(
    "All position finding techniques failed - using emergency position"
  );
  return [20, 0.5, 20]; // Far corner position, less likely to have obstacles
};

// Generate enemies for the current level
export const generateEnemies = (
  level: number,
  playerPosition: [number, number, number]
): Omit<Enemy, "id">[] => {
  // More balanced difficulty progression formula
  // Base count + logarithmic growth function for better scaling
  const baseEnemyCount = 3;
  const maxEnemies = 25;
  const growthFactor = 2.5;

  const enemyCount = Math.min(
    Math.floor(baseEnemyCount + growthFactor * Math.log10(level + 1)),
    maxEnemies
  );

  // Adjust grid size based on level to make early levels more manageable
  const gridSize = Math.min(40 + level * 2, 70);

  const config: LevelConfig = {
    gridSize,
    enemyCount,
    powerUpCount: Math.min(1 + Math.floor(level / 2), 5), // Increase power-ups with level, max 5
  };

  const enemies: Omit<Enemy, "id">[] = [];
  const existingPositions: [number, number, number][] = [playerPosition];

  // Counter for turrets to ensure we don't exceed the limit
  let turretCount = 0;
  const maxTurrets = 3;

  // Create enemies
  for (let i = 0; i < config.enemyCount; i++) {
    const position = generateRandomPosition(config.gridSize, existingPositions);
    existingPositions.push(position);

    // Determine enemy type based on level and probabilities
    let type: "tank" | "turret" | "bomber";
    let health: number;
    let speed: number = 1;

    // Calculate probabilities based on level
    // Reduced turret probability to make them less frequent
    const turretProbability = Math.min(0.1 + level * 0.02, 0.3); // Reduced from 0.2 + level * 0.03, max 0.5
    const bomberProbability =
      level >= 5 ? Math.min(0.15 + (level - 5) * 0.03, 0.3) : 0; // Slightly reduced from previous values
    const random = Math.random();

    if (level >= 5 && random < bomberProbability) {
      type = "bomber";
      health = 40 + level * 3; // Lower health for bombers
      speed = 4.0; // Much faster movement speed
    } else if (
      random < turretProbability + bomberProbability &&
      turretCount < maxTurrets
    ) {
      type = "turret";
      const turretBaseHealth = 50;
      const linearScale = level * 10;
      const exponentialScale = Math.floor(Math.sqrt(level) * 5);
      health = turretBaseHealth + linearScale + exponentialScale;
      turretCount++;
    } else {
      type = "tank";
      const tankBaseHealth = 75;
      const linearScale = level * 10;
      const exponentialScale = Math.floor(Math.sqrt(level) * 5);
      health =
        tankBaseHealth + linearScale + Math.floor(exponentialScale * 0.7);
      // Slightly reduce speed for better gameplay balance with increased tank frequency
      speed = 1.3;
    }

    enemies.push({
      position,
      health,
      type,
      speed,
    });
  }

  return enemies;
};

// Generate power-ups for the current level
export const generatePowerUps = (
  level: number,
  playerPosition: [number, number, number],
  enemyPositions: [number, number, number][]
): Omit<PowerUp, "id">[] => {
  // Increased base power-up count and adjusted growth for more health power-ups
  const basePowerUpCount = 2; // Increased from 1
  const maxPowerUps = 8; // Increased from 6
  const powerUpGrowthFactor = 0.8; // Increased from 0.5

  const powerUpCount = Math.min(
    Math.floor(
      basePowerUpCount + powerUpGrowthFactor * Math.log10(level + 1) * 2
    ),
    maxPowerUps
  );

  // Adjust grid size to match enemy generation
  const gridSize = Math.min(40 + level * 2, 70);

  const config: LevelConfig = {
    gridSize,
    enemyCount: 0, // Not used in this function
    powerUpCount,
  };

  const powerUps: Omit<PowerUp, "id">[] = [];
  const existingPositions: [number, number, number][] = [
    playerPosition,
    ...enemyPositions,
  ];

  // Create power-ups (all health type now)
  for (let i = 0; i < config.powerUpCount; i++) {
    const position = generateRandomPosition(config.gridSize, existingPositions);
    existingPositions.push(position);

    powerUps.push({
      position,
      type: "health",
    });
  }

  return powerUps;
};

// Generate a complete level
export const generateLevel = (
  level: number,
  playerPosition: [number, number, number]
) => {
  // Get game state functions
  const { spawnEnemy, spawnPowerUp } = useGameState.getState();

  // Generate enemies
  const enemies = generateEnemies(level, playerPosition);

  // Get enemy positions for power-up generation
  const enemyPositions = enemies.map((e) => e.position);

  // Generate power-ups
  const powerUps = generatePowerUps(level, playerPosition, enemyPositions);

  // Spawn enemies and power-ups in the game state
  enemies.forEach((enemy) => spawnEnemy(enemy));
  powerUps.forEach((powerUp) => spawnPowerUp(powerUp));

  return {
    enemies,
    powerUps,
  };
};

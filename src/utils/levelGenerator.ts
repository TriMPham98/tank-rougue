import { Enemy, PowerUp, useGameState } from "./gameState";
import { debug } from "./debug";

interface LevelConfig {
  gridSize: number;
  enemyCount: number;
  powerUpCount: number;
}

// Function to check if a position is too close to another position
const isTooClose = (
  pos1: [number, number, number],
  pos2: [number, number, number],
  minDistance: number
): boolean => {
  const dx = pos1[0] - pos2[0];
  const dz = pos1[2] - pos2[2];
  const distanceSquared = dx * dx + dz * dz;
  return distanceSquared < minDistance * minDistance;
};

// Generate a random position on the grid, ensuring it's not too close to other entities
export const generateRandomPosition = (
  gridSize: number,
  existingPositions: [number, number, number][],
  minDistanceFromExisting = 5
): [number, number, number] => {
  // Try to find a position that is far enough from existing entities
  let attempts = 0;
  while (attempts < 100) {
    // Generate random x, z coordinates within the grid
    const x = (Math.random() - 0.5) * gridSize;
    const z = (Math.random() - 0.5) * gridSize;
    const y = 0.5; // Keep y-position consistent for now
    const potentialPosition: [number, number, number] = [x, y, z];

    // Check if this position is far enough from all existing positions
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

    // If position is valid, return it
    if (isFarEnough) {
      return potentialPosition;
    }

    attempts++;
  }

  // If we couldn't find a suitable position, log warning and return a fallback
  debug.warn("Could not find a suitable position after 100 attempts");

  // Fallback to a random position regardless of distance constraints
  const x = (Math.random() - 0.5) * gridSize;
  const z = (Math.random() - 0.5) * gridSize;
  return [x, 0.5, z];
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

  // Create enemies
  for (let i = 0; i < config.enemyCount; i++) {
    const position = generateRandomPosition(config.gridSize, existingPositions);
    existingPositions.push(position);

    // Determine enemy type based on level and probabilities
    let type: "tank" | "turret" | "bomber";
    let health: number;
    let speed: number = 1;

    // Calculate probabilities based on level
    const turretProbability = Math.min(0.2 + level * 0.03, 0.5);
    const bomberProbability =
      level >= 5 ? Math.min(0.2 + (level - 5) * 0.04, 0.4) : 0;
    const random = Math.random();

    if (level >= 5 && random < bomberProbability) {
      type = "bomber";
      health = 40 + level * 3; // Lower health for bombers
      speed = 4.0; // Much faster movement speed
    } else if (random < turretProbability + bomberProbability) {
      type = "turret";
      const turretBaseHealth = 50;
      const linearScale = level * 10;
      const exponentialScale = Math.floor(Math.sqrt(level) * 5);
      health = turretBaseHealth + linearScale + exponentialScale;
    } else {
      type = "tank";
      const tankBaseHealth = 75;
      const linearScale = level * 10;
      const exponentialScale = Math.floor(Math.sqrt(level) * 5);
      health =
        tankBaseHealth + linearScale + Math.floor(exponentialScale * 0.7);
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

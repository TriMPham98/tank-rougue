import { Enemy, PowerUp, useGameState } from "./gameState";

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
  minDistance: number = 5
): [number, number, number] => {
  const halfGrid = gridSize / 2;

  let attempts = 0;
  let position: [number, number, number];

  do {
    // Generate a random position within the grid
    position = [
      Math.random() * gridSize - halfGrid,
      0.5, // Fixed y position for now
      Math.random() * gridSize - halfGrid,
    ];

    attempts++;

    // Prevent infinite loop by limiting attempts
    if (attempts > 100) {
      console.warn("Could not find a suitable position after 100 attempts");
      break;
    }

    // Check if the position is too close to any existing positions
  } while (
    existingPositions.some((pos) => isTooClose(pos, position, minDistance))
  );

  return position;
};

// Generate enemies for the current level
export const generateEnemies = (
  level: number,
  playerPosition: [number, number, number]
): Omit<Enemy, "id">[] => {
  const config: LevelConfig = {
    gridSize: 50,
    enemyCount: Math.min(3 + level * 2, 20), // Increase enemies with level, max 20
    powerUpCount: Math.min(1 + Math.floor(level / 2), 5), // Increase power-ups with level, max 5
  };

  const enemies: Omit<Enemy, "id">[] = [];
  const existingPositions: [number, number, number][] = [playerPosition];

  // Create enemies
  for (let i = 0; i < config.enemyCount; i++) {
    const position = generateRandomPosition(config.gridSize, existingPositions);
    existingPositions.push(position);

    // Determine enemy type - more turrets in later levels
    const type = Math.random() < 0.3 + level * 0.05 ? "turret" : "tank";

    // Scale enemy health with level
    const health = type === "turret" ? 50 + level * 10 : 75 + level * 15;

    enemies.push({
      position,
      health,
      type,
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
  const config: LevelConfig = {
    gridSize: 50,
    enemyCount: Math.min(3 + level * 2, 20),
    powerUpCount: Math.min(1 + Math.floor(level / 2), 5),
  };

  const powerUps: Omit<PowerUp, "id">[] = [];
  const existingPositions: [number, number, number][] = [
    playerPosition,
    ...enemyPositions,
  ];

  // Power-up types with weighted probability
  const powerUpTypes: ("health" | "speed" | "damage")[] = [
    "health",
    "health", // Health is more common
    "speed",
    "damage",
  ];

  // Create power-ups
  for (let i = 0; i < config.powerUpCount; i++) {
    const position = generateRandomPosition(config.gridSize, existingPositions);
    existingPositions.push(position);

    // Select a random power-up type
    const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];

    powerUps.push({
      position,
      type,
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

import { useEffect, useRef } from "react";
import { useGameState } from "./gameState";
import { generateRandomPosition } from "./levelGenerator";
import { debug } from "./debug";

// Debug flag specifically for spawn statistics
const SPAWN_STATS_DEBUG = false;

// Base number of enemies at level 1
const BASE_ENEMIES = 3;
// Maximum enemies increases with level (capped at 8)
const getMaxEnemies = (level: number) =>
  Math.min(BASE_ENEMIES + Math.floor(level / 2), 8);

// Function to monitor enemy destruction and spawn new enemies
export const useRespawnManager = () => {
  // Store the previous enemy count
  const prevEnemyCountRef = useRef<number>(0);
  // Store previous enemy IDs for more accurate detection
  const prevEnemiesRef = useRef<string[]>([]);
  // Track enemies spawned in current round
  const enemiesSpawnedThisRoundRef = useRef<number>(0);
  // Track current level for level change detection
  const currentLevelRef = useRef<number>(1);
  // Track if we're currently spawning a wave
  const isSpawningWaveRef = useRef<boolean>(false);

  // Helper function to spawn a single enemy
  const spawnEnemy = (maxEnemies: number) => {
    const freshState = useGameState.getState();
    if (
      !freshState.isGameOver &&
      !freshState.isPaused &&
      freshState.enemies.length < maxEnemies
    ) {
      try {
        // Get all existing enemy positions to avoid overlap
        const existingPositions = [
          freshState.playerTankPosition,
          ...freshState.enemies.map((e: any) => e.position),
        ];

        // Set grid size based on level
        const gridSize = Math.min(40 + freshState.level * 2, 70);

        // Generate a random position for the new enemy
        const position = generateRandomPosition(gridSize, existingPositions);

        // Calculate probabilities based on level
        const turretProbability = Math.min(0.2 + freshState.level * 0.03, 0.5);
        const bomberProbability =
          freshState.level >= 5
            ? Math.min(0.2 + (freshState.level - 5) * 0.04, 0.4)
            : 0;
        const random = Math.random();

        // Determine enemy type and stats
        let type: "tank" | "turret" | "bomber";
        let health: number;
        let speed: number = 1;

        if (freshState.level >= 5 && random < bomberProbability) {
          type = "bomber";
          health = 40 + freshState.level * 3;
          speed = 4.0;
        } else if (random < turretProbability + bomberProbability) {
          type = "turret";
          const turretBaseHealth = 50;
          const linearScale = freshState.level * 10;
          const exponentialScale = Math.floor(Math.sqrt(freshState.level) * 5);
          health = turretBaseHealth + linearScale + exponentialScale;
        } else {
          type = "tank";
          const tankBaseHealth = 75;
          const linearScale = freshState.level * 10;
          const exponentialScale = Math.floor(Math.sqrt(freshState.level) * 5);
          health =
            tankBaseHealth + linearScale + Math.floor(exponentialScale * 0.7);
        }

        // Double check state one more time before spawning
        const finalState = useGameState.getState();
        if (
          !finalState.isGameOver &&
          !finalState.isPaused &&
          finalState.enemies.length < maxEnemies
        ) {
          freshState.spawnEnemy({
            position,
            health,
            type,
            speed,
          });

          enemiesSpawnedThisRoundRef.current++;
          if (SPAWN_STATS_DEBUG) {
            console.log(
              `[SPAWN STATS] New ${type} spawned - Active enemies: ${
                finalState.enemies.length + 1
              }/${maxEnemies} (Total spawned this round: ${
                enemiesSpawnedThisRoundRef.current
              })`
            );
          }
          return true;
        }
      } catch (error) {
        console.error(`Error spawning enemy: ${error}`);
      }
    }
    return false;
  };

  // Function to spawn a wave of enemies
  const spawnEnemyWave = (count: number) => {
    if (isSpawningWaveRef.current) {
      if (SPAWN_STATS_DEBUG) {
        console.log(`[SPAWN STATS] Wave spawn already in progress, skipping`);
      }
      return;
    }

    isSpawningWaveRef.current = true;
    let spawned = 0;

    const spawnNext = () => {
      const freshState = useGameState.getState();
      const maxEnemies = getMaxEnemies(freshState.level);

      if (spawned < count && freshState.enemies.length < maxEnemies) {
        if (spawnEnemy(maxEnemies)) {
          spawned++;
          if (spawned < count) {
            setTimeout(spawnNext, 300);
          } else {
            isSpawningWaveRef.current = false;
          }
        } else {
          // If spawn failed, try again after a short delay
          setTimeout(spawnNext, 100);
        }
      } else {
        isSpawningWaveRef.current = false;
      }
    };

    if (SPAWN_STATS_DEBUG) {
      console.log(`[SPAWN STATS] Starting wave spawn of ${count} enemies`);
    }
    spawnNext();
  };

  // Listen for changes in the enemies array
  useEffect(() => {
    // Initialize the previous enemy count and IDs
    const initialState = useGameState.getState();
    prevEnemyCountRef.current = initialState.enemies.length;
    prevEnemiesRef.current = initialState.enemies.map((e) => e.id);
    enemiesSpawnedThisRoundRef.current = initialState.enemies.length;
    currentLevelRef.current = initialState.level;

    const maxEnemies = getMaxEnemies(initialState.level);
    if (SPAWN_STATS_DEBUG) {
      console.log(
        `[SPAWN STATS] Initial enemies in round: ${enemiesSpawnedThisRoundRef.current} (Max: ${maxEnemies})`
      );
    }

    // Create a subscription to the game state
    const unsubscribe = useGameState.subscribe((state) => {
      // Check for level change
      if (state.level !== currentLevelRef.current) {
        const newMaxEnemies = getMaxEnemies(state.level);
        const currentEnemies = state.enemies.length;
        const additionalEnemiesNeeded = Math.max(
          0,
          newMaxEnemies - currentEnemies
        );

        if (SPAWN_STATS_DEBUG) {
          console.log(
            `[SPAWN STATS] Level ${currentLevelRef.current} completed - Level ${state.level} starting with ${currentEnemies} existing enemies (Max: ${newMaxEnemies}, Spawning: ${additionalEnemiesNeeded})`
          );
        }

        // Update level before spawning new wave
        currentLevelRef.current = state.level;
        enemiesSpawnedThisRoundRef.current = currentEnemies;

        // Only spawn additional enemies needed
        if (additionalEnemiesNeeded > 0) {
          // Spawn new wave after a short delay
          setTimeout(() => {
            spawnEnemyWave(additionalEnemiesNeeded);
          }, 500);
        }
      }

      const currentEnemyCount = state.enemies.length;
      const currentEnemyIds = state.enemies.map((e) => e.id);

      // Check if an enemy was just destroyed (removed from the array)
      if (prevEnemyCountRef.current > currentEnemyCount) {
        const maxEnemies = getMaxEnemies(state.level);
        if (SPAWN_STATS_DEBUG) {
          console.log(
            `[SPAWN STATS] Enemy destroyed - Current enemies: ${currentEnemyCount}/${maxEnemies}`
          );
        }

        // Only spawn new enemy if we're under the maximum limit and not spawning a wave
        if (currentEnemyCount < maxEnemies && !isSpawningWaveRef.current) {
          const respawnDelay = Math.max(3000 - state.level * 200, 1000);
          setTimeout(() => {
            spawnEnemy(maxEnemies);
          }, respawnDelay);
        }
      }

      // Update the previous enemy count and IDs
      prevEnemyCountRef.current = currentEnemyCount;
      prevEnemiesRef.current = currentEnemyIds;
    });

    return unsubscribe;
  }, []);

  return null;
};

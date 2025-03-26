import { useEffect, useRef } from "react";
import { useGameState } from "./gameState";
import { generateRandomPosition } from "./levelGenerator";
import { debug } from "./debug";

// Function to monitor enemy destruction and spawn new enemies
export const useRespawnManager = () => {
  // Store the previous enemy count
  const prevEnemyCountRef = useRef<number>(0);
  // Store previous enemy IDs for more accurate detection
  const prevEnemiesRef = useRef<string[]>([]);

  // Listen for changes in the enemies array
  useEffect(() => {
    debug.log("🔄 Respawn manager initialized");

    // Initialize the previous enemy count and IDs
    const initialState = useGameState.getState();
    prevEnemyCountRef.current = initialState.enemies.length;
    prevEnemiesRef.current = initialState.enemies.map((e) => e.id);

    debug.log(`🏁 Initial enemy count: ${prevEnemyCountRef.current}`);
    debug.log(`🏁 Initial enemies: ${prevEnemiesRef.current.join(", ")}`);

    // Create a subscription to the game state
    const unsubscribe = useGameState.subscribe((state) => {
      const currentEnemyCount = state.enemies.length;
      const currentEnemyIds = state.enemies.map((e) => e.id);

      // Find deleted enemy IDs
      const deletedEnemyIds = prevEnemiesRef.current.filter(
        (id) => !currentEnemyIds.includes(id)
      );

      // Check if an enemy was just destroyed (removed from the array)
      if (prevEnemyCountRef.current > currentEnemyCount) {
        debug.log(
          `🔴 Enemy destroyed: previous count ${prevEnemyCountRef.current}, current count ${currentEnemyCount}`
        );
        debug.log(`🔴 Deleted enemy IDs: ${deletedEnemyIds.join(", ")}`);

        // Get current player position for enemy generation
        const playerPos = state.playerTankPosition;

        // Log current enemies for debugging
        debug.log(`🔍 Current enemies: ${currentEnemyIds.join(", ")}`);

        // Get all existing enemy positions to avoid overlap
        const existingPositions = [
          playerPos,
          ...state.enemies.map((e) => e.position),
        ];

        // Set grid size based on level
        const gridSize = Math.min(40 + state.level * 2, 70);

        // Generate a random position for the new enemy
        const position = generateRandomPosition(gridSize, existingPositions);

        // Calculate probabilities based on level
        const turretProbability = Math.min(0.2 + state.level * 0.03, 0.5);
        const bomberProbability =
          state.level >= 5 ? Math.min(0.1 + (state.level - 5) * 0.02, 0.3) : 0;
        const random = Math.random();

        // Determine enemy type and stats
        let type: "tank" | "turret" | "bomber";
        let health: number;
        let speed: number = 1;

        if (state.level >= 5 && random < bomberProbability) {
          type = "bomber";
          health = 40 + state.level * 3; // Lower health for bombers
          speed = 2.5; // Faster movement speed
        } else if (random < turretProbability + bomberProbability) {
          type = "turret";
          const turretBaseHealth = 50;
          const linearScale = state.level * 10;
          const exponentialScale = Math.floor(Math.sqrt(state.level) * 5);
          health = turretBaseHealth + linearScale + exponentialScale;
        } else {
          type = "tank";
          const tankBaseHealth = 75;
          const linearScale = state.level * 10;
          const exponentialScale = Math.floor(Math.sqrt(state.level) * 5);
          health =
            tankBaseHealth + linearScale + Math.floor(exponentialScale * 0.7);
        }

        debug.log(
          `🟢 Preparing to spawn new ${type} at position [${position[0].toFixed(
            2
          )}, ${position[1].toFixed(2)}, ${position[2].toFixed(2)}]`
        );

        // Spawn the new enemy with a delay
        // Use a delay that decreases as level increases for more challenge
        const respawnDelay = Math.max(3000 - state.level * 200, 1000);

        setTimeout(() => {
          try {
            // Only spawn a new enemy if the game is still running
            if (!state.isGameOver && !state.isPaused) {
              state.spawnEnemy({
                position,
                health,
                type,
                speed,
              });

              debug.log(`✅ Spawned new ${type} with health ${health}`);
            }
          } catch (error) {
            debug.error(`❌ Error spawning enemy: ${error}`);
          }
        }, respawnDelay);
      } else if (prevEnemyCountRef.current < currentEnemyCount) {
        // New enemy appeared (either through respawn or level generation)
        const newEnemyIds = currentEnemyIds.filter(
          (id) => !prevEnemiesRef.current.includes(id)
        );
        debug.log(`🟢 New enemies detected: ${newEnemyIds.join(", ")}`);
      }

      // Update the previous enemy count and IDs
      prevEnemyCountRef.current = currentEnemyCount;
      prevEnemiesRef.current = currentEnemyIds;
    });

    // Clean up subscription when component unmounts
    return unsubscribe;
  }, []);

  return null;
};

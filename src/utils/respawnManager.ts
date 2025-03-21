import { useEffect, useRef } from "react";
import { useGameState } from "./gameState";
import { generateRandomPosition } from "./levelGenerator";

// Function to monitor enemy destruction and spawn new enemies
export const useRespawnManager = () => {
  // Store the previous enemy count
  const prevEnemyCountRef = useRef<number>(0);
  // Store previous enemy IDs for more accurate detection
  const prevEnemiesRef = useRef<string[]>([]);

  // Listen for changes in the enemies array
  useEffect(() => {
    console.log("🔄 Respawn manager initialized");

    // Initialize the previous enemy count and IDs
    const initialState = useGameState.getState();
    prevEnemyCountRef.current = initialState.enemies.length;
    prevEnemiesRef.current = initialState.enemies.map((e) => e.id);

    console.log(`🏁 Initial enemy count: ${prevEnemyCountRef.current}`);
    console.log(`🏁 Initial enemies: ${prevEnemiesRef.current.join(", ")}`);

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
        console.log(
          `🔴 Enemy destroyed: previous count ${prevEnemyCountRef.current}, current count ${currentEnemyCount}`
        );
        console.log(`🔴 Deleted enemy IDs: ${deletedEnemyIds.join(", ")}`);

        // Get current player position for enemy generation
        const playerPos = state.playerTankPosition;

        // Log current enemies for debugging
        console.log(`🔍 Current enemies: ${currentEnemyIds.join(", ")}`);

        // Get all existing enemy positions to avoid overlap
        const existingPositions = [
          playerPos,
          ...state.enemies.map((e) => e.position),
        ];

        // Generate a random position for the new enemy
        const position = generateRandomPosition(50, existingPositions);

        // Determine enemy type - more turrets in later levels
        const type =
          Math.random() < 0.3 + state.level * 0.05 ? "turret" : "tank";

        // Scale enemy health with level
        const health =
          type === "turret" ? 50 + state.level * 10 : 75 + state.level * 15;

        console.log(
          `🟢 Preparing to spawn new ${type} at position [${position[0].toFixed(
            2
          )}, ${position[1].toFixed(2)}, ${position[2].toFixed(2)}]`
        );

        // Spawn the new enemy with a delay
        setTimeout(() => {
          try {
            state.spawnEnemy({
              position,
              health,
              type,
            });

            console.log(`✅ Spawned new ${type} with health ${health}`);
          } catch (error) {
            console.error(`❌ Error spawning enemy: ${error}`);
          }
        }, 3000); // 3 seconds delay
      } else if (prevEnemyCountRef.current < currentEnemyCount) {
        // New enemy appeared (either through respawn or level generation)
        const newEnemyIds = currentEnemyIds.filter(
          (id) => !prevEnemiesRef.current.includes(id)
        );
        console.log(`🟢 New enemies detected: ${newEnemyIds.join(", ")}`);
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

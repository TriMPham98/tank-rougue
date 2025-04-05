import { useEffect, useRef } from "react";
import { useGameState } from "../utils/gameState";
import { generateRandomPosition } from "../utils/levelGenerator";
import { debug } from "../utils/debug";
import * as THREE from "three"; // Import THREE for Vector2

const SPAWN_STATS_DEBUG = false;

const BASE_ENEMIES = 1;
const getMaxEnemies = (level: number) => {
  if (level === 1) return 1;

  // Reduce tanks in early game (levels 2-10)
  if (level <= 10) {
    return Math.min(BASE_ENEMIES + Math.floor(Math.sqrt(level) * 1.25), 15);
  }
  // Standard progression (levels 11-39)
  else if (level < 40) {
    return Math.min(BASE_ENEMIES + Math.floor(Math.sqrt(level) * 2), 15);
  }
  // Increase difficulty for late game (level 40+)
  else {
    return Math.min(BASE_ENEMIES + Math.floor(Math.sqrt(level) * 2.3), 20);
  }
};

export const useRespawnManager = () => {
  const prevEnemyCountRef = useRef<number>(0);
  const prevEnemiesRef = useRef<string[]>([]);
  const enemiesSpawnedThisRoundRef = useRef<number>(0);
  const currentLevelRef = useRef<number>(1);
  const isSpawningWaveRef = useRef<boolean>(false);

  // Helper function to spawn a single enemy
  const spawnEnemy = (maxEnemies: number): boolean => {
    // Added return type boolean
    const freshState = useGameState.getState();
    if (
      !freshState.isGameOver &&
      !freshState.isPaused &&
      freshState.enemies.length < maxEnemies
    ) {
      const {
        safeZoneCenter,
        safeZoneRadius,
        safeZoneActive,
        terrainObstacles,
        playerTankPosition,
        level,
        enemies, // Get current enemies list
      } = freshState;

      let position: [number, number, number];
      let type: "tank" | "turret" | "bomber";
      let health: number;
      let speed: number = 1;

      const turretMaxRegenAttempts = 15; // Max attempts for respawn as well

      try {
        // Determine enemy type first
        const turretProbability = Math.min(0.1 + level * 0.02, 0.3);
        const bomberProbability =
          level >= 5 ? Math.min(0.15 + (level - 5) * 0.03, 0.3) : 0;
        const random = Math.random();
        const currentTurretCount = enemies.filter(
          (e) => e.type === "turret"
        ).length;
        const maxTurrets = 3;

        if (level >= 5 && random < bomberProbability) {
          type = "bomber";
          health = 40 + level * 3;
          speed = 4.0;
        } else if (
          random < turretProbability + bomberProbability &&
          currentTurretCount < maxTurrets
        ) {
          type = "turret";
          const turretBaseHealth = 50;
          // Note: Reverted health scaling slightly to match generateEnemies for consistency
          const linearScale = level * 9;
          health = turretBaseHealth + linearScale;
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
        const existingPositions = [
          playerTankPosition,
          ...enemies.map((e: any) => e.position),
        ];
        const gridSize = Math.min(40 + level * 2, 70);

        while (attempts < turretMaxRegenAttempts && !positionFound) {
          position = generateRandomPosition(
            gridSize,
            existingPositions,
            7,
            400
          );

          // Extra validation for distance from terrain obstacles (already in generateRandomPosition, but good failsafe)
          let isClear = true;
          for (const obstacle of terrainObstacles) {
            const dx = obstacle.position[0] - position[0];
            const dz = obstacle.position[2] - position[2];
            const distance = Math.sqrt(dx * dx + dz * dz);
            const minClearance = obstacle.size * 2.5 + 7;
            if (distance < minClearance) {
              isClear = false;
              debug.warn(
                "Respawn rejected spawn position too close to obstacle:",
                position
              );
              break;
            }
          }
          if (!isClear) {
            attempts++; // Count as an attempt even if rejected by obstacle
            continue; // Try generating a new position
          }

          // Check safe zone if it's a turret
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
                  `${type} RESPAWN failed after ${attempts} attempts to find position in safe zone. Placing near center.`
                );
                // Fallback logic similar to generateEnemies
                const angle = Math.random() * Math.PI * 2;
                const radiusOffset = Math.min(safeZoneRadius * 0.8, 5);
                position = [
                  safeZoneCenter[0] + Math.cos(angle) * radiusOffset,
                  0.5,
                  safeZoneCenter[1] + Math.sin(angle) * radiusOffset,
                ];
                // Basic check for fallback position
                let fallbackClear = true;
                for (const obstacle of terrainObstacles) {
                  const dx = obstacle.position[0] - position[0];
                  const dz = obstacle.position[2] - position[2];
                  if (Math.sqrt(dx * dx + dz * dz) < obstacle.size + 3) {
                    fallbackClear = false;
                    break;
                  }
                }
                if (!fallbackClear) {
                  position = [safeZoneCenter[0], 0.5, safeZoneCenter[1]];
                  debug.warn(
                    `Fallback ${type} RESPAWN position also obstructed. Placing AT center.`
                  );
                }
                positionFound = true; // Use the fallback position
              }
              // Loop continues to regenerate position
            }
          } else {
            // Not a turret/tank or safe zone inactive, position is fine
            positionFound = true;
          }
        }

        // Double check state one more time before spawning
        const finalState = useGameState.getState();
        if (
          !finalState.isGameOver &&
          !finalState.isPaused &&
          finalState.enemies.length < maxEnemies &&
          positionFound // Ensure a valid position was actually found/assigned
        ) {
          freshState.spawnEnemy({
            // @ts-ignore - position will be assigned
            position,
            health,
            type,
            speed,
          });

          enemiesSpawnedThisRoundRef.current++;
          if (SPAWN_STATS_DEBUG) {
            console.log(
              `[SPAWN STATS] New ${type} respawned - Active enemies: ${
                finalState.enemies.length + 1
              }/${maxEnemies} (Total spawned this round: ${
                enemiesSpawnedThisRoundRef.current
              })`
            );
          }
          return true; // Indicate successful spawn
        } else {
          if (!positionFound) {
            debug.error("Failed to find any valid position for enemy respawn.");
          }
        }
      } catch (error) {
        console.error(`Error spawning enemy: ${error}`);
      }
    }
    return false; // Indicate spawn failed or wasn't needed
  };

  // Function to spawn a wave of enemies
  const spawnEnemyWave = (count: number) => {
    if (isSpawningWaveRef.current) {
      if (SPAWN_STATS_DEBUG)
        console.log(`[SPAWN STATS] Wave spawn already in progress, skipping`);
      return;
    }
    isSpawningWaveRef.current = true;
    let spawned = 0;
    const spawnNext = () => {
      const freshState = useGameState.getState();
      const maxEnemies = getMaxEnemies(freshState.level);
      if (spawned < count && freshState.enemies.length < maxEnemies) {
        if (spawnEnemy(maxEnemies)) {
          // Use the boolean return value
          spawned++;
          if (spawned < count) {
            setTimeout(spawnNext, 300); // Stagger spawns slightly
          } else {
            isSpawningWaveRef.current = false; // Wave finished
            if (SPAWN_STATS_DEBUG)
              console.log(`[SPAWN STATS] Wave spawn of ${count} finished.`);
          }
        } else {
          // If spawn failed (e.g., couldn't find position), try again shortly
          debug.warn("Spawn attempt failed during wave, retrying...");
          setTimeout(spawnNext, 500); // Longer delay on failure retry
        }
      } else {
        isSpawningWaveRef.current = false; // Wave finished (or conditions met)
        if (SPAWN_STATS_DEBUG)
          console.log(
            `[SPAWN STATS] Wave spawn condition met (spawned: ${spawned}/${count}, max: ${maxEnemies}).`
          );
      }
    };
    if (SPAWN_STATS_DEBUG)
      console.log(`[SPAWN STATS] Starting wave spawn of ${count} enemies`);
    spawnNext();
  };

  // Listen for changes in the enemies array
  useEffect(() => {
    const initialState = useGameState.getState();
    prevEnemyCountRef.current = initialState.enemies.length;
    prevEnemiesRef.current = initialState.enemies.map((e) => e.id);
    enemiesSpawnedThisRoundRef.current = initialState.enemies.length;
    currentLevelRef.current = initialState.level;
    const initialMaxEnemies = getMaxEnemies(initialState.level);
    if (SPAWN_STATS_DEBUG) {
      console.log(
        `[SPAWN STATS] Initializing Respawn Manager - Level: ${initialState.level}, Enemies: ${initialState.enemies.length}/${initialMaxEnemies}`
      );
    }

    const unsubscribe = useGameState.subscribe((state, prevState) => {
      // Use prevState
      // Check for level change
      if (state.level !== currentLevelRef.current) {
        const newMaxEnemies = getMaxEnemies(state.level);
        const currentEnemies = state.enemies.length;
        // Calculate how many enemies were *intended* for the *previous* level
        const prevMaxEnemies = getMaxEnemies(currentLevelRef.current);
        // Determine how many new enemies to spawn based on the *new* level's max count
        const additionalEnemiesNeeded = Math.max(
          0,
          newMaxEnemies - currentEnemies
        );

        if (SPAWN_STATS_DEBUG) {
          console.log(
            `[SPAWN STATS] Level Change Detected: ${currentLevelRef.current} -> ${state.level}. Max Enemies: ${prevMaxEnemies} -> ${newMaxEnemies}. Current: ${currentEnemies}. Spawning: ${additionalEnemiesNeeded}`
          );
        }

        // Reset round spawn count only when level changes
        enemiesSpawnedThisRoundRef.current = currentEnemies; // Start count from existing enemies
        currentLevelRef.current = state.level;

        if (additionalEnemiesNeeded > 0) {
          setTimeout(() => {
            // Delay wave spawn slightly after level change
            spawnEnemyWave(additionalEnemiesNeeded);
          }, 500);
        }
      } else {
        // Only check for respawn if level hasn't changed in this update
        const currentEnemyCount = state.enemies.length;
        const currentEnemyIds = state.enemies.map((e) => e.id);

        // Check if an enemy was destroyed (count decreased AND ID removed)
        // Using ID check is more robust than just count
        const destroyedEnemyIds = prevEnemiesRef.current.filter(
          (id) => !currentEnemyIds.includes(id)
        );

        if (
          destroyedEnemyIds.length > 0 &&
          prevEnemyCountRef.current > currentEnemyCount
        ) {
          const maxEnemies = getMaxEnemies(state.level);
          if (SPAWN_STATS_DEBUG) {
            console.log(
              `[SPAWN STATS] ${
                destroyedEnemyIds.length
              } Enemy destroyed. Current: ${currentEnemyCount}/${maxEnemies}. IDs: ${destroyedEnemyIds.join(
                ", "
              )}`
            );
          }

          // Respawn logic: Only spawn if under max and not currently in a wave spawn
          if (currentEnemyCount < maxEnemies && !isSpawningWaveRef.current) {
            const respawnDelay = Math.max(4000 - state.level * 150, 1500); // Slightly longer base delay, scales down faster
            if (SPAWN_STATS_DEBUG)
              console.log(
                `[SPAWN STATS] Scheduling respawn in ${respawnDelay}ms`
              );
            setTimeout(() => {
              // Pass the current maxEnemies for the level
              spawnEnemy(maxEnemies);
            }, respawnDelay);
          } else {
            if (SPAWN_STATS_DEBUG)
              console.log(
                `[SPAWN STATS] Respawn skipped (At Max: ${
                  currentEnemyCount >= maxEnemies
                }, Spawning Wave: ${isSpawningWaveRef.current})`
              );
          }
        }

        // Update previous state references *after* comparison
        prevEnemyCountRef.current = currentEnemyCount;
        prevEnemiesRef.current = currentEnemyIds;
      }
    });

    return unsubscribe;
  }, []); // Empty dependency array ensures this runs only once on mount

  return null; // This hook doesn't render anything
};

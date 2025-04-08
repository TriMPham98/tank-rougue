import { create } from "zustand";
import { availableWeapons } from "./weapons";
import SoundManager from "./sound";

// Define the type for an enemy
export interface Enemy {
  id: string;
  position: [number, number, number];
  health: number;
  type: "tank" | "turret" | "bomber";
  speed?: number; // Speed multiplier for movement
}

// Define the type for a power-up
export interface PowerUp {
  id: string;
  position: [number, number, number];
  type: "health";
}

// Define available stats for upgrades
export type UpgradeableStat =
  | "tankSpeed"
  | "fireRate"
  | "cameraRange"
  | "maxHealth"
  | "healthRegen"
  | "turretDamage"
  | "bulletVelocity";

// Define the type for a secondary weapon
export interface SecondaryWeapon {
  id: string; // Weapon type ID (e.g., "rocket", "laser", etc.)
  instanceId?: string; // New field to track individual weapon instances
  name: string;
  description: string;
  damage: number;
  cooldown: number;
  range: number;
  projectileSpeed: number;
}

// Define the game state
interface GameState {
  // Player stats
  playerHealth: number;
  playerMaxHealth: number;
  playerSpeed: number;
  playerDamage: number;
  playerTurretDamage: number; // New stat for turret damage
  playerFireRate: number; // Time between shots in seconds
  playerCameraRange: number; // Camera zoom range
  playerHealthRegen: number; // Health regenerated per second
  playerBulletVelocity: number; // Speed of bullets
  score: number;
  level: number;
  enemiesDefeated: number;
  enemiesRequiredForNextLevel: number;

  // Safe zone (PUBG-like circle)
  safeZoneRadius: number;
  safeZoneCenter: [number, number];
  safeZoneTargetRadius: number;
  safeZoneShrinkRate: number;
  safeZoneDamage: number;
  safeZoneActive: boolean;
  isPreZoneChangeLevel: boolean; // New property to identify levels right before zone changes

  // Upgrade system
  showUpgradeUI: boolean;
  availableUpgrades: UpgradeableStat[];

  // Player position for tracking
  playerTankPosition: [number, number, number];

  // Game entities
  enemies: Enemy[];
  powerUps: PowerUp[];

  // Game state flags
  isGameOver: boolean;
  isPaused: boolean;

  // Terrain obstacles
  terrainObstacles: Array<{
    id: string;
    position: [number, number, number];
    type: "rock";
    size: number;
  }>;

  // Weapon selection system
  showWeaponSelection: boolean;
  availableWeapons: SecondaryWeapon[];
  selectedWeapons: SecondaryWeapon[];

  // Actions
  takeDamage: (amount: number) => void;
  healPlayer: (amount: number) => void;
  increaseScore: (amount: number) => void;
  spawnEnemy: (enemy: Omit<Enemy, "id">) => void;
  removeEnemy: (id: string) => void;
  spawnPowerUp: (powerUp: Omit<PowerUp, "id">) => void;
  collectPowerUp: (id: string) => void;
  restartGame: () => void;
  togglePause: () => void;
  advanceLevel: () => void;
  updatePlayerPosition: (position: [number, number, number]) => void;
  damageEnemy: (id: string, amount: number) => boolean; // Returns true if enemy is destroyed
  updateEnemyPosition: (id: string, position: [number, number, number]) => void; // Add function to update enemy position
  incrementEnemyDefeatCount: () => void; // New function to track enemy defeats
  upgradeStat: (stat: UpgradeableStat) => void; // New function to upgrade a stat
  addTerrainObstacle: (obstacle: {
    position: [number, number, number];
    type: "rock";
    size: number;
  }) => void;
  removeTerrainObstacle: (id: string) => void;
  selectWeapon: (weapon: SecondaryWeapon) => void;
  closeWeaponSelection: () => void;
  updateEnemyPositions: (
    enemyMoves: { id: string; newPosition: [number, number, number] }[]
  ) => void;
}

// Create the game state store
export const useGameState = create<GameState>((set, get) => ({
  // Initial player stats
  playerHealth: 100,
  playerMaxHealth: 100,
  playerSpeed: 3,
  playerDamage: 25,
  playerTurretDamage: 50, // Keep consistent at 50
  playerFireRate: 2, // 0.5 shots per second (2 seconds between shots)
  playerCameraRange: 12, // Default camera distance
  playerHealthRegen: 0, // No health regen at start
  playerBulletVelocity: 15, // Initial bullet velocity
  score: 0,
  level: 1,
  enemiesDefeated: 0,
  enemiesRequiredForNextLevel: 1, // Changed: Initial threshold - level 1 only needs 1 enemy

  // Safe zone (PUBG-like circle)
  safeZoneRadius: 50, // Initial radius covers the whole map
  safeZoneCenter: [0, 0], // Center of the map
  safeZoneTargetRadius: 50, // Target radius for shrinking
  safeZoneShrinkRate: 0.05, // Increased from 0.035 to 0.05 for faster shrinking
  safeZoneDamage: 1, // Damage per second outside the safe zone
  safeZoneActive: false, // Safe zone not active initially
  isPreZoneChangeLevel: false, // Initial value

  // Upgrade system
  showUpgradeUI: false,
  availableUpgrades: [],

  // Initial player position
  playerTankPosition: [0, 0.5, 0],

  // Initial game entities
  enemies: [],
  powerUps: [],

  // Initial game state flags
  isGameOver: false,
  isPaused: false,

  // Terrain obstacles
  terrainObstacles: [],

  // Weapon selection system
  showWeaponSelection: false,
  availableWeapons,
  selectedWeapons: [],

  // Actions
  takeDamage: (amount) =>
    set((state) => {
      const newHealth = Math.max(0, state.playerHealth - amount);
      return {
        playerHealth: newHealth,
        isGameOver: newHealth <= 0,
      };
    }),

  healPlayer: (amount) =>
    set((state) => ({
      playerHealth: Math.min(
        state.playerMaxHealth,
        state.playerHealth + amount
      ),
    })),

  increaseScore: (amount) =>
    set((state) => ({
      score: state.score + amount,
    })),

  spawnEnemy: (enemy) =>
    set((state) => {
      // If this is a turret, check if we already have 3 turrets
      if (enemy.type === "turret") {
        const currentTurrets = state.enemies.filter(
          (e) => e.type === "turret"
        ).length;
        if (currentTurrets >= 3) {
          // Change this enemy to a tank instead
          enemy.type = "tank";
          // Adjust health and speed to match tank stats
          const tankBaseHealth = 75;
          const linearScale = state.level * 9; // Updated to match levelGenerator.ts
          enemy.health = tankBaseHealth + linearScale;
          enemy.speed = 1.3;
        }
      }

      // Apply map boundary constraints to ensure enemies stay in the map
      const constrainedPosition = enforceMapBoundaries(enemy.position);

      return {
        enemies: [
          ...state.enemies,
          { ...enemy, id: Math.random().toString(36).substr(2, 9) },
        ],
      };
    }),

  removeEnemy: (id) =>
    set((state) => ({
      enemies: state.enemies.filter((enemy) => enemy.id !== id),
    })),

  spawnPowerUp: (powerUp) =>
    set((state) => ({
      powerUps: [
        ...state.powerUps,
        { ...powerUp, id: Math.random().toString(36).substr(2, 9) },
      ],
    })),

  collectPowerUp: (id) =>
    set((state) => {
      const powerUp = state.powerUps.find((p) => p.id === id);
      if (!powerUp) return state;

      const newPowerUps = state.powerUps.filter((p) => p.id !== id);
      let updates: Partial<GameState> = { powerUps: newPowerUps };

      // Only handle health power-up
      updates = {
        ...updates,
        playerHealth: Math.min(state.playerMaxHealth, state.playerHealth + 25),
      };

      return updates;
    }),

  restartGame: () =>
    set({
      playerHealth: 100,
      playerMaxHealth: 100,
      playerSpeed: 3,
      playerDamage: 25,
      playerTurretDamage: 50, // Keep consistent at 50
      playerFireRate: 2, // 0.5 shots per second (2 seconds between shots)
      playerCameraRange: 12,
      playerHealthRegen: 0,
      playerBulletVelocity: 15,
      score: 0,
      level: 1,
      playerTankPosition: [0, 0.5, 0],
      enemies: [],
      powerUps: [],
      isGameOver: false,
      isPaused: false,
      enemiesDefeated: 0,
      enemiesRequiredForNextLevel: 1,
      showUpgradeUI: false,
      availableUpgrades: [],
      terrainObstacles: [],
      showWeaponSelection: false,
      availableWeapons,
      selectedWeapons: [],

      // Reset safe zone
      safeZoneRadius: 50,
      safeZoneCenter: [0, 0],
      safeZoneTargetRadius: 50,
      safeZoneShrinkRate: 0.05, // Increased from 0.035 to 0.05 for faster shrinking
      safeZoneDamage: 1,
      safeZoneActive: false,
      isPreZoneChangeLevel: false,
    }),

  togglePause: () =>
    set((state) => ({
      isPaused: !state.isPaused,
    })),

  incrementEnemyDefeatCount: () => {
    set((state) => {
      // If upgrade UI is already showing or game is over, don't trigger another level up
      if (state.showUpgradeUI || state.isGameOver) {
        return state;
      }

      const newCount = state.enemiesDefeated + 1;
      const shouldAdvanceLevel = newCount >= state.enemiesRequiredForNextLevel;

      // If reaching the required count, automatically advance level
      if (shouldAdvanceLevel) {
        // We'll call advanceLevel from here instead of returning a new object
        setTimeout(() => {
          // Check again to make sure UI isn't already showing before advancing
          const currentState = get();
          if (!currentState.showUpgradeUI && !currentState.isGameOver) {
            get().advanceLevel();
          }
        }, 500); // Give a small delay before advancing level
      }

      return { enemiesDefeated: newCount };
    });
  },

  advanceLevel: () =>
    set((state) => {
      // Don't advance level if game is over
      if (state.isGameOver) {
        return state;
      }

      const newLevel = state.level + 1;

      // Play level up sound at 25% volume
      SoundManager.setVolume("levelUp", 0.25);
      SoundManager.play("levelUp");

      // Check if this is a level right before a zone change (levels 4, 9, 14, etc.)
      const isPreZoneChangeLevel = newLevel % 5 === 4 && newLevel >= 4;

      // Calculate required enemies for next level based on game phase
      // Early game (levels 1-24): 1-12 enemies
      // Mid game (levels 25-50): 13-25 enemies
      // Late game (levels 51+): 25+ enemies with steeper scaling
      let nextLevelRequirement;

      if (newLevel <= 24) {
        // Early game: Linear scaling from 1 to 12
        nextLevelRequirement = Math.ceil(newLevel / 2);
      } else if (newLevel <= 50) {
        // Mid game: Linear scaling from 13 to 25
        nextLevelRequirement = 12 + Math.ceil((newLevel - 24) / 2);
      } else {
        // Late game: Steeper scaling starting from 25
        const baseRequirement = 25;
        const lateGameLevel = newLevel - 50;
        // Exponential growth for late game
        nextLevelRequirement = baseRequirement + Math.ceil(lateGameLevel * 1.5);
      }

      // Generate random upgrade options (3 options) - only needed if below level 51
      let availableUpgrades: UpgradeableStat[] = [];

      // Only generate upgrade options if below level 51
      if (newLevel <= 50) {
        const allUpgrades: UpgradeableStat[] = [
          "tankSpeed",
          "cameraRange",
          "maxHealth",
          "healthRegen",
          "turretDamage",
          "bulletVelocity",
        ];

        // Only add fireRate if not maxed out
        if (state.playerFireRate > 0.286) {
          // 0.286s = 3.5 shots/sec
          allUpgrades.push("fireRate");
        }

        const shuffled = [...allUpgrades].sort(() => 0.5 - Math.random());
        availableUpgrades = shuffled.slice(0, 3);
      }

      // Calculate main turret damage increase based on a diminishing percentage of NPC health scaling
      // NPCs gain health at level * 9 rate (linear scaling)
      // Start at 65% scaling but decrease to 55% at higher levels
      const baseNpcHealthScaling = 9; // From levelGenerator.ts
      let turretScalingPercentage = 0.65; // Start at 65% of NPC health scaling

      // Gradually reduce scaling percentage as levels increase
      if (newLevel > 10) {
        // Decrease by 0.01 for each level above 10, bottoming out at 0.55 (55%)
        turretScalingPercentage = Math.max(0.55, 0.65 - (newLevel - 10) * 0.01);
      }

      // Calculate the turret damage increase for this level
      const turretDamageIncrease = Math.floor(
        baseNpcHealthScaling * turretScalingPercentage
      );

      // Adjust safe zone for the new level
      const maxRadius = 50;
      const minRadius = 5; // Reduced from 10 to make the final zone smaller
      const radiusDecrease = 4; // Decreased from 5 for less aggressive shrinking

      // Calculate new target radius for the circle
      // Only reduce the zone every 5 levels
      const zoneReductionLevel = Math.floor(newLevel / 5);
      const newTargetRadius = Math.max(
        minRadius,
        maxRadius - zoneReductionLevel * radiusDecrease
      );

      // Estimate average enemy count for the next few levels
      const avgEnemiesPerLevel = Math.ceil((newLevel + 2) / 2); // Simple approximation

      // Estimate total enemies needed to be killed before next zone change
      // Need to sum the enemies required for each level from current to next zone change
      let totalEnemiesBeforeNextZone = 0;
      for (let i = 0; i < zoneReductionLevel; i++) {
        const levelNum = newLevel + i;
        // Use the same formula as the game uses to calculate enemies required per level
        if (levelNum <= 24) {
          totalEnemiesBeforeNextZone += Math.ceil(levelNum / 2);
        } else if (levelNum <= 50) {
          totalEnemiesBeforeNextZone += 12 + Math.ceil((levelNum - 24) / 2);
        } else {
          const baseRequirement = 25;
          const lateGameLevel = levelNum - 50;
          totalEnemiesBeforeNextZone +=
            baseRequirement + Math.ceil(lateGameLevel * 1.5);
        }
      }

      // Estimate time to next zone change based on enemies needed
      // Assume it takes ~10 seconds to defeat each enemy (very rough estimate)
      const estimatedSecondsToNextZone = totalEnemiesBeforeNextZone * 10;

      // Calculate shrink rate based on need
      let newShrinkRate;
      let newCurrentRadius = state.safeZoneRadius;

      // If we just entered a level divisible by 5, the zone should already be at target radius
      // For all other levels, calculate the appropriate shrink rate
      if (newLevel % 5 === 0 && newLevel > 0) {
        // On levels divisible by 5, force the current radius to equal the target
        newCurrentRadius = newTargetRadius;
        // Set a default shrink rate since we won't be shrinking until next zone level
        newShrinkRate = 0.01;
      } else {
        // For other levels, we need to shrink at the right pace
        // Calculate the NEXT zone target radius (for the next level divisible by 5)
        const nextZoneLevel = Math.floor(newLevel / 5) + 1;
        const nextZoneTargetRadius = Math.max(
          minRadius,
          maxRadius - nextZoneLevel * radiusDecrease
        );

        // Calculate how much we need to shrink total
        const totalRadiusToShrink = state.safeZoneRadius - nextZoneTargetRadius;

        // We must complete this shrinking before reaching the next level divisible by 5
        // Set a safety factor to ensure it completes slightly before reaching that level
        const safetyFactor = 0.3; // Changed from 0.4 to 0.3 for even faster shrinking

        // Calculate required shrink rate with late game scaling
        let baseShrinkRate =
          totalRadiusToShrink / (estimatedSecondsToNextZone * safetyFactor);

        // Increase shrink rate in late game (after level 50)
        if (newLevel > 50) {
          const lateGameMultiplier = 1 + (newLevel - 50) * 0.1; // 10% increase per level after 50
          baseShrinkRate *= lateGameMultiplier;
        }

        // Ensure minimum shrink rate
        const calculatedShrinkRate = Math.max(0.01, baseShrinkRate);

        // Cap the shrink rate at a reasonable maximum to avoid too rapid shrinking
        const maxShrinkRate = 0.15; // Increased from 0.1 to 0.15 for faster shrinking
        newShrinkRate = Math.min(maxShrinkRate, calculatedShrinkRate);
      }

      // Keep the safe zone center position fixed instead of randomly moving it
      const currentCenter = state.safeZoneCenter;

      // If this is the first level or the safe zone wasn't active, set the current radius to max
      if (!state.safeZoneActive) {
        newCurrentRadius = maxRadius;
      }

      // Only activate the safe zone if we're at level 5 or beyond
      const shouldActivateSafeZone = newLevel >= 5;

      // Increase damage outside safe zone as levels progress with late game scaling
      const baseDamage = 1;
      const damageIncreasePerLevel = 0.5;
      // Only increase damage every 5 levels
      let newSafeZoneDamage =
        baseDamage + zoneReductionLevel * damageIncreasePerLevel;

      // Add late game damage scaling (after level 50)
      if (newLevel > 50) {
        const lateGameLevel = newLevel - 50;
        // Exponential damage increase in late game
        const lateGameMultiplier = 1 + Math.pow(lateGameLevel * 0.2, 1.5);
        newSafeZoneDamage *= lateGameMultiplier;
      }

      return {
        level: newLevel,
        playerDamage: state.playerDamage + 5, // Linear damage increase of 5 per level
        playerTurretDamage: state.playerTurretDamage + turretDamageIncrease, // Diminishing % of NPC health scaling
        enemiesDefeated: 0, // Reset counter for the new level
        enemiesRequiredForNextLevel: nextLevelRequirement,
        showUpgradeUI: newLevel <= 50, // Only show upgrade UI if level is 50 or below
        availableUpgrades, // Set available upgrades
        isPreZoneChangeLevel, // Set the flag for pre-zone change level

        // Update safe zone parameters
        safeZoneRadius: newCurrentRadius,
        safeZoneCenter: currentCenter, // Keep current center position
        safeZoneTargetRadius: newTargetRadius,
        safeZoneShrinkRate: newShrinkRate,
        safeZoneActive: shouldActivateSafeZone,
        safeZoneDamage: newSafeZoneDamage,
      };
    }),

  updatePlayerPosition: (position) => {
    // Enforce map boundaries to ensure player stays within playable area
    const constrainedPosition = enforceMapBoundaries(position);
    set(() => ({ playerTankPosition: constrainedPosition }));
  },

  // Add function to update enemy position in state
  updateEnemyPosition: (id, position) => {
    // Enforce map boundaries to ensure enemy stays within playable area
    const constrainedPosition = enforceMapBoundaries(position);

    set((state) => {
      const updatedEnemies = state.enemies.map((enemy) => {
        if (enemy.id === id) {
          return { ...enemy, position: constrainedPosition };
        }
        return enemy;
      });
      return { enemies: updatedEnemies };
    });
  },

  damageEnemy: (id, amount) => {
    const state = get();
    const enemy = state.enemies.find((e) => e.id === id);

    if (!enemy) return false;

    const newHealth = enemy.health - amount;
    const isDestroyed = newHealth <= 0;

    if (isDestroyed) {
      get().removeEnemy(id);
      get().increaseScore(enemy.type === "tank" ? 100 : 150);
      get().incrementEnemyDefeatCount(); // Track the enemy defeat
      // Play enemy defeat sound at 17% volume
      SoundManager.setVolume("npcImpact", 0.175);
      SoundManager.play("npcImpact");
      return true;
    } else {
      set((state) => ({
        enemies: state.enemies.map((e) =>
          e.id === id ? { ...e, health: newHealth } : e
        ),
      }));
      return false;
    }
  },

  // New functions for the upgrade system
  upgradeStat: (stat: UpgradeableStat) =>
    set((state) => {
      // Don't apply upgrades for levels above 50
      if (state.level > 50) {
        return { showUpgradeUI: false };
      }

      // Apply the upgrade based on stat type
      const updates: Partial<GameState> = {
        showUpgradeUI: false, // Hide the upgrade UI after selection
      };

      switch (stat) {
        case "tankSpeed":
          updates.playerSpeed = state.playerSpeed + 0.5; // Linear increase by 0.5
          break;
        case "fireRate":
          // Cap at 3.5 shots/sec (0.286s between shots)
          const minFireRate = 0.286; // 3.5 shots per second
          // Convert current fire rate to shots per second
          const currentShotsPerSecond = 1 / state.playerFireRate;
          // Add 0.1 shots per second
          const newShotsPerSecond = currentShotsPerSecond + 0.1;
          // Cap at 3.5 shots per second
          const cappedShotsPerSecond = Math.min(3.5, newShotsPerSecond);
          // Convert back to time between shots
          const newFireRate = 1 / cappedShotsPerSecond;
          updates.playerFireRate = newFireRate;
          break;
        case "cameraRange":
          updates.playerCameraRange = state.playerCameraRange + 2; // Linear increase by 2
          break;
        case "maxHealth":
          updates.playerMaxHealth = state.playerMaxHealth + 25; // Linear increase by 25
          // Also heal the player when max health increases
          updates.playerHealth = state.playerHealth + 25;
          break;
        case "healthRegen":
          updates.playerHealthRegen = state.playerHealthRegen + 0.5; // Linear increase by 0.5
          break;
        case "turretDamage":
          // Calculate upgrade based on the same diminishing percentage of NPC health scaling
          const baseNpcHealthScaling = 9; // From levelGenerator.ts
          let turretScalingPercentage = 0.65; // Start at 65% of NPC health scaling

          // Gradually reduce scaling percentage as levels increase
          if (state.level > 10) {
            turretScalingPercentage = Math.max(
              0.55,
              0.65 - (state.level - 10) * 0.01
            );
          }

          const baseUpgrade = 12; // Increase base upgrade to offset diminishing scaling
          const levelScaling = Math.floor(
            state.level * baseNpcHealthScaling * turretScalingPercentage
          );
          const totalIncrease = baseUpgrade + levelScaling;

          updates.playerTurretDamage = state.playerTurretDamage + totalIncrease;
          break;
        case "bulletVelocity":
          updates.playerBulletVelocity = state.playerBulletVelocity + 2; // Linear increase by 2
          break;
      }

      return updates;
    }),

  addTerrainObstacle: (obstacle) =>
    set((state) => ({
      terrainObstacles: [
        ...state.terrainObstacles,
        { ...obstacle, id: Math.random().toString(36).substr(2, 9) },
      ],
    })),

  removeTerrainObstacle: (id) =>
    set((state) => ({
      terrainObstacles: state.terrainObstacles.filter(
        (obstacle) => obstacle.id !== id
      ),
    })),

  selectWeapon: (weapon) => {
    console.log("*** BEFORE selectWeapon execution ***");
    console.log("Current state snapshot:", useGameState.getState());

    set((state) => {
      console.log("gameState.selectWeapon called with weapon:", weapon.name);
      console.log("Current selectedWeapons:", state.selectedWeapons);
      console.log("Current showWeaponSelection:", state.showWeaponSelection);

      // Create a new instance of the weapon with a unique instanceId
      const weaponInstance = {
        ...weapon,
        instanceId: Math.random().toString(36).substr(2, 9), // Generate a unique ID for this instance
      };

      const updatedState = {
        selectedWeapons: [...state.selectedWeapons, weaponInstance],
        showWeaponSelection: false,
      };

      console.log("New state to be applied:", updatedState);

      // Return the updated state
      return updatedState;
    });

    // Log the state after update
    setTimeout(() => {
      console.log("*** AFTER selectWeapon execution ***");
      console.log("Updated state snapshot:", useGameState.getState());
      console.log(
        "showWeaponSelection is now:",
        useGameState.getState().showWeaponSelection
      );
    }, 0);
  },

  closeWeaponSelection: () => {
    console.log("*** BEFORE closeWeaponSelection execution ***");
    console.log("Current state snapshot:", useGameState.getState());

    set((state) => {
      console.log("gameState.closeWeaponSelection called");
      console.log("Current showWeaponSelection:", state.showWeaponSelection);

      console.log("Setting showWeaponSelection to false");
      return {
        showWeaponSelection: false,
      };
    });

    // Log the state after update
    setTimeout(() => {
      console.log("*** AFTER closeWeaponSelection execution ***");
      console.log("Updated state snapshot:", useGameState.getState());
      console.log(
        "showWeaponSelection is now:",
        useGameState.getState().showWeaponSelection
      );
    }, 0);
  },

  updateEnemyPositions: (enemyMoves) => {
    set((state) => {
      const updatedEnemies = state.enemies.map((enemy) => {
        const move = enemyMoves.find((m) => m.id === enemy.id);
        if (move) {
          // Apply map boundary constraints
          const constrainedPosition = enforceMapBoundaries(move.newPosition);
          return {
            ...enemy,
            position: constrainedPosition,
          };
        }
        return enemy;
      });

      return { enemies: updatedEnemies };
    });
  },
}));

// Helper function to keep entities within map boundaries
const enforceMapBoundaries = (
  position: [number, number, number]
): [number, number, number] => {
  const mapSize = 100; // Ground plane size
  const halfMapSize = mapSize / 2;
  const buffer = 2; // Buffer from edge

  const constrainedPosition: [number, number, number] = [...position];

  // Constrain X position
  if (constrainedPosition[0] < -halfMapSize + buffer) {
    constrainedPosition[0] = -halfMapSize + buffer;
  } else if (constrainedPosition[0] > halfMapSize - buffer) {
    constrainedPosition[0] = halfMapSize - buffer;
  }

  // Constrain Z position
  if (constrainedPosition[2] < -halfMapSize + buffer) {
    constrainedPosition[2] = -halfMapSize + buffer;
  } else if (constrainedPosition[2] > halfMapSize - buffer) {
    constrainedPosition[2] = halfMapSize - buffer;
  }

  return constrainedPosition;
};

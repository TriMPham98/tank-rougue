import { create } from "zustand";
import { availableWeapons } from "./weapons";

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
  playerTurretDamage: 100, // 4x the original value
  playerFireRate: 2, // 1 second between shots
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
  safeZoneShrinkRate: 0.02, // How fast the circle shrinks (reduced from 0.05)
  safeZoneDamage: 1, // Damage per second outside the safe zone
  safeZoneActive: false, // Safe zone not active initially

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
          const linearScale = state.level * 10;
          const exponentialScale = Math.floor(Math.sqrt(state.level) * 5);
          enemy.health =
            tankBaseHealth + linearScale + Math.floor(exponentialScale * 0.7);
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
      playerTurretDamage: 50, // Reset to our doubled value
      playerFireRate: 0.665, // Reset to our 33% increased value
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
      safeZoneShrinkRate: 0.02, // Updated from 0.05 to match new slower shrink rate
      safeZoneDamage: 1,
      safeZoneActive: false,
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

      // Generate random upgrade options (3 options)
      const allUpgrades: UpgradeableStat[] = [
        "tankSpeed",
        "fireRate",
        "cameraRange",
        "maxHealth",
        "healthRegen",
        "turretDamage",
        "bulletVelocity",
      ];

      const shuffled = [...allUpgrades].sort(() => 0.5 - Math.random());
      const availableUpgrades = shuffled.slice(0, 3);

      // Adjust safe zone for the new level
      const maxRadius = 50;
      const minRadius = 5; // Reduced from 10 to make the final zone smaller
      const radiusDecrease = 4; // Decreased from 5 for less aggressive shrinking

      // Calculate new target radius for the circle
      const newTargetRadius = Math.max(
        minRadius,
        maxRadius - (newLevel - 1) * radiusDecrease
      );

      // Increase damage outside safe zone as levels progress
      const baseDamage = 1;
      const damageIncreasePerLevel = 0.5;
      const newSafeZoneDamage =
        baseDamage + (newLevel - 1) * damageIncreasePerLevel;

      // Increase shrink rate as levels progress, but at a slower rate
      const baseShrinkRate = 0.02; // Reduced from 0.05
      const shrinkRateIncreasePerLevel = 0.01; // Reduced from 0.02
      const newShrinkRate =
        baseShrinkRate + (newLevel - 1) * shrinkRateIncreasePerLevel;

      // Keep the safe zone center position fixed instead of randomly moving it
      const currentCenter = state.safeZoneCenter;

      // If this is the first level or the safe zone wasn't active, set the current radius to max
      const newCurrentRadius = !state.safeZoneActive
        ? maxRadius
        : state.safeZoneRadius;

      return {
        level: newLevel,
        playerDamage: state.playerDamage + 5, // Linear damage increase of 5 per level
        enemiesDefeated: 0, // Reset counter for the new level
        enemiesRequiredForNextLevel: nextLevelRequirement,
        showUpgradeUI: true, // Show upgrade UI after level up
        availableUpgrades, // Set available upgrades

        // Update safe zone parameters
        safeZoneRadius: newCurrentRadius,
        safeZoneCenter: currentCenter, // Keep current center position
        safeZoneTargetRadius: newTargetRadius,
        safeZoneShrinkRate: newShrinkRate,
        safeZoneActive: true,
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
      // Apply the upgrade based on stat type
      const updates: Partial<GameState> = {
        showUpgradeUI: false, // Hide the upgrade UI after selection
      };

      switch (stat) {
        case "tankSpeed":
          updates.playerSpeed = state.playerSpeed + 0.5; // Linear increase by 0.5
          break;
        case "fireRate":
          // Lower number = faster firing
          updates.playerFireRate = Math.max(0.1, state.playerFireRate - 0.05); // Linear decrease by 0.05
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
          updates.playerTurretDamage = state.playerTurretDamage + 5; // Linear increase by 5
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

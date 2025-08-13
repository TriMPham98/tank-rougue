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
  type: "health" | "coin";
  value?: number; // Used for coins
}

// Define available stats for upgrades
export type UpgradeableStat =
  | "tankSpeed"
  | "fireRate"
  | "cameraRange"
  | "maxHealth"
  | "healthRegen"
  | "turretDamage"
  | "bulletVelocity"
  | "penetration";

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

// Define the type for terrain obstacles
interface ObstacleData {
  id: string;
  position: [number, number, number];
  type: "rock";
  size: number;
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
  playerPenetration: number; // Number of enemies a bullet can pass through
  playerLevel: number; // Player's current level
  score: number;
  coins: number; // Player currency collected from coin drops
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
  playerTurretRotation: number; // Absolute turret rotation for minimap

  // Game entities
  enemies: Enemy[];
  powerUps: PowerUp[];

  // Game state flags
  isGameOver: boolean;
  isPaused: boolean;
  isGameStarted: boolean; // New flag to track if the game has started
  shouldResetCameraAnimation: boolean; // Flag to reset camera animation on game start
  isWireframeAssembled: boolean; // Flag to indicate wireframe assembly completion
  isTerrainReady: boolean; // Flag to indicate terrain generation completion

  // Mobile orientation handling
  isLandscapeOrientationRequired: boolean; // Flag to indicate if landscape orientation is required
  showOrientationWarning: boolean; // Flag to control the display of orientation warning

  // Terrain obstacles
  terrainObstacles: Array<ObstacleData>;

  // Weapon selection system
  showWeaponSelection: boolean;
  availableWeapons: SecondaryWeapon[];
  selectedWeapons: SecondaryWeapon[];

  // Input state
  forward: number; // -1 to 1 (backward to forward)
  strafe: number; // -1 to 1 (left to right)
  moveX: number; // -1 to 1 (absolute world X movement)
  moveZ: number; // -1 to 1 (absolute world Z movement)
  turretRotation: number | null; // Angle in radians
  isFiring: boolean;

  // Actions
  takeDamage: (amount: number) => void;
  healPlayer: (amount: number) => void;
  increaseScore: (amount: number) => void;
  spawnEnemy: (enemy: Omit<Enemy, "id">) => void;
  removeEnemy: (id: string) => void;
  spawnPowerUp: (powerUp: Omit<PowerUp, "id">) => void;
  collectPowerUp: (id: string, byPlayer?: boolean) => void;
  restartGame: () => void;
  togglePause: () => void;
  advanceLevel: () => void;
  updatePlayerPosition: (position: [number, number, number]) => void;
  updatePlayerTurretRotation: (rotation: number) => void;
  damageEnemy: (id: string, amount: number) => boolean; // Returns true if enemy is destroyed
  updateEnemyPosition: (id: string, position: [number, number, number]) => void; // Add function to update enemy position
  incrementEnemyDefeatCount: () => void; // New function to track enemy defeats
  upgradeStat: (stat: UpgradeableStat) => void; // New function to upgrade a stat
  setTerrainObstacles: (obstacles: Array<ObstacleData>) => void; // ADDED
  selectWeapon: (weapon: SecondaryWeapon) => void;
  closeWeaponSelection: () => void;
  updateEnemyPositions: (
    enemyMoves: { id: string; newPosition: [number, number, number] }[]
  ) => void;
  setInput: (input: {
    forward?: number | null;
    strafe?: number | null;
    moveX?: number | null;
    moveZ?: number | null;
    turretRotation?: number | null;
    isFiring?: boolean;
  }) => void;
  startGame: () => void; // New action to start the game
  returnToMainMenu: () => void; // New action to return to main menu
  setOrientationWarning: (show: boolean) => void; // New action to control orientation warning
  checkOrientation: () => void; // New action to check device orientation
  toggleFirstPersonView: () => void;
  isFirstPersonView: boolean;
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
  playerCameraRange: 8, // Default camera distance
  playerHealthRegen: 0, // No health regen at start
  playerBulletVelocity: 15, // Initial bullet velocity
  playerPenetration: 0, // No penetration at start
  playerLevel: 1, // Initial player level
  score: 0,
  coins: 0,
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
  playerTurretRotation: 0, // Initial turret rotation

  // Initial game entities
  enemies: [],
  powerUps: [],

  // Initial game state flags
  isGameOver: false,
  isPaused: false,
  isGameStarted: false,
  shouldResetCameraAnimation: true,
  isWireframeAssembled: false, // Initial state
  isTerrainReady: false, // Initial state
  isFirstPersonView: false,

  // Mobile orientation handling
  isLandscapeOrientationRequired: true, // Landscape orientation is required for mobile
  showOrientationWarning: false, // Don't show warning initially

  // Terrain obstacles
  terrainObstacles: [], // Initial state

  // Weapon selection system
  showWeaponSelection: false,
  availableWeapons,
  selectedWeapons: [],

  // Input state
  forward: 0,
  strafe: 0,
  moveX: 0,
  moveZ: 0,
  turretRotation: null,
  isFiring: false,

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

  collectPowerUp: (id, byPlayer = false) =>
    set((state) => {
      const powerUp = state.powerUps.find((p) => p.id === id);
      if (!powerUp) return state;

      const newPowerUps = state.powerUps.filter((p) => p.id !== id);
      let updates: Partial<GameState> = { powerUps: newPowerUps };

      // Handle power-up by type
      if (powerUp.type === "health") {
        // Apply only if collected by player or on expire? Keep original behavior: heal only when collected
        if (byPlayer) {
          updates = {
            ...updates,
            playerHealth: Math.min(
              state.playerMaxHealth,
              state.playerHealth + 25
            ),
          };
          SoundManager.setVolume("healthPickUp", 0.385);
          SoundManager.play("healthPickUp");
        }
      } else if (powerUp.type === "coin") {
        // Award coins only when collected by player
        if (byPlayer) {
          const coinValue = powerUp.value ?? 1;
          updates = {
            ...updates,
            coins: (state.coins || 0) + coinValue,
          };
          // Reuse pickup sound for now
          SoundManager.setVolume("healthPickUp", 0.3);
          SoundManager.play("healthPickUp");
        }
      }

      return updates;
    }),

  restartGame: () => {
    // Play tank deploy sound when game is restarted
    SoundManager.setVolume("deployTank", 0.55);
    SoundManager.play("deployTank");

    return set({
      playerHealth: 100,
      playerMaxHealth: 100,
      playerSpeed: 3,
      playerDamage: 25,
      playerTurretDamage: 50, // Keep consistent at 50
      playerFireRate: 2, // 0.5 shots per second (2 seconds between shots)
      playerCameraRange: 8,
      playerHealthRegen: 0,
      playerBulletVelocity: 15,
      playerLevel: 1, // Reset player level
      score: 0,
      coins: 0,
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
      terrainObstacles: [], // Reset on restart
      showWeaponSelection: false,
      availableWeapons,
      selectedWeapons: [],
      showOrientationWarning: false, // Reset orientation warning
      isFirstPersonView: false,

      // Reset safe zone
      safeZoneRadius: 50,
      safeZoneCenter: [0, 0],
      safeZoneTargetRadius: 50,
      safeZoneShrinkRate: 0.05, // Increased from 0.035 to 0.05 for faster shrinking
      safeZoneDamage: 1,
      safeZoneActive: false,
      isPreZoneChangeLevel: false,
      shouldResetCameraAnimation: true,
      isWireframeAssembled: false, // Reset on restart
      isTerrainReady: false, // Reset on restart
    });
  },

  togglePause: () =>
    set((state) => {
      const newState = { isPaused: !state.isPaused };
      return newState;
    }),

  startGame: () =>
    set(() => ({
      isGameStarted: true,
      shouldResetCameraAnimation: true,
      isPaused: false,
    })),

  incrementEnemyDefeatCount: () => {
    set((state) => {
      // If upgrade UI is already showing or game is over, don't trigger another level up
      if (state.showUpgradeUI || state.isGameOver) {
        return state;
      }

      // Increment the enemy defeat count
      const newCount = state.enemiesDefeated + 1;

      // Check if we've reached the required number of enemies for the next level
      if (newCount >= state.enemiesRequiredForNextLevel) {
        // Calculate how many enemies are left over after advancing one level
        const remainingEnemies = newCount - state.enemiesRequiredForNextLevel;

        // First, update the state with the new enemy count
        // This ensures we don't lose track of defeated enemies
        const updatedState = { enemiesDefeated: remainingEnemies };

        // Then advance the level after a short delay
        setTimeout(() => {
          // Check again to make sure UI isn't already showing before advancing
          const currentState = get();
          if (!currentState.showUpgradeUI && !currentState.isGameOver) {
            // Advance one level
            get().advanceLevel();
          }
        }, 500);

        return updatedState;
      }

      // If we haven't reached the required count yet, just update the count
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

      // Play level up sound at 165% volume
      SoundManager.setVolume("levelUp", 1.65);
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
        // Fix: Use a more gradual scaling for late game to prevent level jumps
        nextLevelRequirement =
          baseRequirement + Math.ceil(lateGameLevel * 0.75);
      }

      // Generate random upgrade options (3 options) - only needed if below level 51
      let availableUpgrades: UpgradeableStat[] = [];

      // Only generate upgrade options if below level 51
      if (newLevel <= 50) {
        let possibleUpgrades: UpgradeableStat[] = [
          "tankSpeed",
          // "cameraRange", // Removed from initial list, handled below
          "maxHealth",
          "healthRegen",
          "turretDamage",
          "bulletVelocity",
          // "penetration" removed from main list to make it rare
        ];

        // Only add fireRate if not maxed out (3.0 shots/sec)
        if (state.playerFireRate > 0.333) {
          possibleUpgrades.push("fireRate");
        }

        // Only add cameraRange if not capped at 14m
        if (state.playerCameraRange < 14) {
          possibleUpgrades.push("cameraRange");
        }

        // Make penetration a rare upgrade (25% chance to be offered)
        // Only consider adding penetration if not already at max (3)
        if (state.playerPenetration < 3 && Math.random() < 0.25) {
          possibleUpgrades.push("penetration");
        }

        const shuffled = [...possibleUpgrades].sort(() => 0.5 - Math.random());
        // Ensure we don't try to slice more than available
        const upgradesToOffer = Math.min(3, shuffled.length);
        availableUpgrades = shuffled.slice(0, upgradesToOffer);
      }

      // Calculate main turret damage to be slightly below enemy tank health
      // Tank health scales at level * 9 rate (linear scaling)
      // We'll keep turret damage at around 70% of a tank's health
      const tankBaseHealth = 75;
      const linearHealthScale = 9; // From levelGenerator.ts
      const tankHealth = tankBaseHealth + newLevel * linearHealthScale;

      // Set turret damage to be ~85% of tank health - enough to kill in 2 shots without upgrades
      const baseTurretDamage = Math.floor(tankHealth * 0.85);

      // We don't automatically increase damage with level - player must choose upgrades
      // Just set initial value if it's level 1
      const newTurretDamage =
        newLevel === 1 ? baseTurretDamage : state.playerTurretDamage;

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
        playerLevel: newLevel, // Update player level to match game level
        playerDamage: state.playerDamage + 5, // Linear damage increase of 5 per level
        playerTurretDamage: newTurretDamage,
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

  updatePlayerTurretRotation: (rotation) => {
    set(() => ({ playerTurretRotation: rotation }));
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

      // Calculate distance between player and enemy
      const playerPos = state.playerTankPosition;
      const enemyPos = enemy.position;
      const dx = playerPos[0] - enemyPos[0];
      const dz = playerPos[2] - enemyPos[2];
      const distance = Math.sqrt(dx * dx + dz * dz);

      // Set volume based on distance (max volume at 0 distance, min volume at 50 distance)
      const maxVolume = 0.1925; // Maximum volume (19.25%)
      const minVolume = 0.011; // Minimum volume (1.1%)
      const maxDistance = 50; // Maximum distance for volume calculation
      const volume = Math.max(
        minVolume,
        maxVolume * (1 - distance / maxDistance)
      );

      SoundManager.setVolume("npcImpact", volume);
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
        isPaused: false, // Explicitly unpause the game after upgrading
      };

      switch (stat) {
        case "tankSpeed":
          updates.playerSpeed = state.playerSpeed + 0.5; // Linear increase by 0.5
          break;
        case "fireRate":
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
          // Calculate current enemy tank health at player's level
          const tankBaseHealth = 75;
          const linearHealthScale = 9; // From levelGenerator.ts
          const currentTankHealth =
            tankBaseHealth + state.level * linearHealthScale;

          // Calculate damage upgrade to be ~25% of a tank's current health
          // This ensures that with enough upgrades, player can eventually one-shot tanks
          const damageIncrease = Math.max(
            15,
            Math.floor(currentTankHealth * 0.25)
          );

          updates.playerTurretDamage =
            state.playerTurretDamage + damageIncrease;
          break;
        case "bulletVelocity":
          updates.playerBulletVelocity = state.playerBulletVelocity + 2; // Linear increase by 2
          break;
        case "penetration":
          // Max value is 3
          updates.playerPenetration = Math.min(3, state.playerPenetration + 1); // Linear increase by 1, max 3
          break;
      }

      return updates;
    }),

  setTerrainObstacles: (obstacles) =>
    set(() => ({
      terrainObstacles: obstacles,
    })),

  selectWeapon: (weapon) => {
    set((state) => {
      // Create a new instance of the weapon with a unique instanceId
      const weaponInstance = {
        ...weapon,
        instanceId: Math.random().toString(36).substr(2, 9), // Generate a unique ID for this instance
      };

      // Return the updated state
      return {
        selectedWeapons: [...state.selectedWeapons, weaponInstance],
        showWeaponSelection: false,
      };
    });
  },

  closeWeaponSelection: () => {
    set(() => {
      return {
        showWeaponSelection: false,
      };
    });
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

  setInput: (input) => {
    set(() => {
      const newState: Partial<GameState> = {};

      if (input.forward !== undefined && input.forward !== null) {
        newState.forward = input.forward;
      }

      if (input.strafe !== undefined && input.strafe !== null) {
        newState.strafe = input.strafe;
      }

      // Handle moveX and moveZ
      if (input.moveX !== undefined && input.moveX !== null) {
        newState.moveX = input.moveX;
      }
      if (input.moveZ !== undefined && input.moveZ !== null) {
        newState.moveZ = input.moveZ;
      }

      if (input.turretRotation !== undefined) {
        newState.turretRotation = input.turretRotation;

        // Add debug logging for turret rotation
        const debug =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1";

        if (debug && input.turretRotation !== null) {
          // Console log removed
        }
      }

      if (input.isFiring !== undefined) {
        newState.isFiring = input.isFiring;
      }

      return newState;
    });
  },

  // Action to return to the main menu
  returnToMainMenu: () => {
    // Reset the state similar to restartGame, but also set isGameStarted to false
    set({
      playerHealth: 100,
      playerMaxHealth: 100,
      playerSpeed: 3,
      playerDamage: 25,
      playerTurretDamage: 50,
      playerFireRate: 2,
      playerCameraRange: 8,
      playerHealthRegen: 0,
      playerBulletVelocity: 15,
      playerPenetration: 0,
      playerLevel: 1,
      score: 0,
      coins: 0,
      level: 1,
      playerTankPosition: [0, 0.5, 0],
      enemies: [],
      powerUps: [],
      isGameOver: false,
      isPaused: false, // Ensure unpaused
      isGameStarted: false, // Go back to main menu
      enemiesDefeated: 0,
      enemiesRequiredForNextLevel: 1,
      showUpgradeUI: false,
      availableUpgrades: [],
      terrainObstacles: [],
      showWeaponSelection: false,
      availableWeapons,
      selectedWeapons: [],
      showOrientationWarning: false, // Reset orientation warning
      safeZoneRadius: 50,
      safeZoneCenter: [0, 0],
      safeZoneTargetRadius: 50,
      safeZoneShrinkRate: 0.05,
      safeZoneDamage: 1,
      safeZoneActive: false,
      isPreZoneChangeLevel: false,
      shouldResetCameraAnimation: true,
      isWireframeAssembled: false,
      isTerrainReady: false,
      forward: 0, // Reset input states
      strafe: 0,
      moveX: 0,
      moveZ: 0,
      turretRotation: null,
      isFiring: false,
      isFirstPersonView: false,
    });
  },

  setOrientationWarning: (show: boolean) => {
    set(() => ({ showOrientationWarning: show }));
  },

  checkOrientation: () => {
    // Only run for mobile devices, not for tablets
    const isMobileDevice =
      /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) && !document.body.classList.contains("tablet-device");

    // ADDITION: If not a mobile device, always hide the orientation warning and return
    if (!isMobileDevice) {
      set(() => ({ showOrientationWarning: false }));
      return;
    }

    // Check if the device is in portrait mode
    const isPortrait = window.matchMedia("(orientation: portrait)").matches;

    if (isPortrait) {
      // Set the orientation warning flag
      set((state) => {
        // Only pause the game if it's started and not already paused
        if (state.isGameStarted && !state.isPaused) {
          // Pause the game
          state.togglePause();
        }

        // Override any weapon selection or upgrade UI
        return {
          showOrientationWarning: true,
          showWeaponSelection: false,
          showUpgradeUI: false,
        };
      });
    } else {
      // Hide the orientation warning, but don't automatically unpause
      set(() => ({ showOrientationWarning: false }));
    }
  },

  toggleFirstPersonView: () =>
    set((state) => ({ isFirstPersonView: !state.isFirstPersonView })),
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

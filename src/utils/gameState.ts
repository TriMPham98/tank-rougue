import { create } from "zustand";

// Define the type for an enemy
export interface Enemy {
  id: string;
  position: [number, number, number];
  health: number;
  type: "tank" | "turret";
}

// Define the type for a power-up
export interface PowerUp {
  id: string;
  position: [number, number, number];
  type: "health" | "speed" | "damage";
}

// Define the game state
interface GameState {
  // Player stats
  playerHealth: number;
  playerMaxHealth: number;
  playerSpeed: number;
  playerDamage: number;
  score: number;
  level: number;
  enemiesDefeated: number;
  enemiesRequiredForNextLevel: number;

  // Player position for tracking
  playerTankPosition: [number, number, number];

  // Game entities
  enemies: Enemy[];
  powerUps: PowerUp[];

  // Game state flags
  isGameOver: boolean;
  isPaused: boolean;

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
}

// Create the game state store
export const useGameState = create<GameState>((set, get) => ({
  // Initial player stats
  playerHealth: 100,
  playerMaxHealth: 100,
  playerSpeed: 3,
  playerDamage: 25,
  score: 0,
  level: 1,
  enemiesDefeated: 0,
  enemiesRequiredForNextLevel: 5, // Initial threshold for level 1→2

  // Initial player position
  playerTankPosition: [0, 0.5, 0],

  // Initial game entities
  enemies: [],
  powerUps: [],

  // Initial game state flags
  isGameOver: false,
  isPaused: false,

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
    set((state) => ({
      enemies: [
        ...state.enemies,
        { ...enemy, id: Math.random().toString(36).substr(2, 9) },
      ],
    })),

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
      let updates = { powerUps: newPowerUps };

      switch (powerUp.type) {
        case "health":
          updates = {
            ...updates,
            playerHealth: Math.min(
              state.playerMaxHealth,
              state.playerHealth + 25
            ),
          };
          break;
        case "speed":
          updates = { ...updates, playerSpeed: state.playerSpeed + 0.5 };
          break;
        case "damage":
          updates = { ...updates, playerDamage: state.playerDamage + 5 };
          break;
      }

      return updates;
    }),

  restartGame: () =>
    set({
      playerHealth: 100,
      playerMaxHealth: 100,
      playerSpeed: 3,
      playerDamage: 25,
      score: 0,
      level: 1,
      playerTankPosition: [0, 0.5, 0],
      enemies: [],
      powerUps: [],
      isGameOver: false,
      isPaused: false,
      enemiesDefeated: 0,
      enemiesRequiredForNextLevel: 5,
    }),

  togglePause: () =>
    set((state) => ({
      isPaused: !state.isPaused,
    })),

  incrementEnemyDefeatCount: () => {
    set((state) => {
      const newCount = state.enemiesDefeated + 1;
      const shouldAdvanceLevel = newCount >= state.enemiesRequiredForNextLevel;

      // If reaching the required count, automatically advance level
      if (shouldAdvanceLevel) {
        // We'll call advanceLevel from here instead of returning a new object
        setTimeout(() => {
          get().advanceLevel();
        }, 500); // Give a small delay before advancing level
      }

      return { enemiesDefeated: newCount };
    });
  },

  advanceLevel: () =>
    set((state) => {
      const newLevel = state.level + 1;

      // Calculate new requirements for next level
      // Progressively more enemies needed to reach higher levels
      const baseRequirement = 5;
      const scalingFactor = 2;
      const nextLevelRequirement = Math.floor(
        baseRequirement + scalingFactor * Math.log10(newLevel + 1) * newLevel
      );

      return {
        level: newLevel,
        playerDamage: state.playerDamage + Math.floor(newLevel / 2),
        enemiesDefeated: 0, // Reset counter for the new level
        enemiesRequiredForNextLevel: nextLevelRequirement,
      };
    }),

  updatePlayerPosition: (position) =>
    set((state) => {
      if (
        state.playerTankPosition[0] === position[0] &&
        state.playerTankPosition[1] === position[1] &&
        state.playerTankPosition[2] === position[2]
      ) {
        return state;
      }
      return { playerTankPosition: position };
    }),

  // Add function to update enemy position in state
  updateEnemyPosition: (id, position) =>
    set((state) => ({
      enemies: state.enemies.map((e) => (e.id === id ? { ...e, position } : e)),
    })),

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
}));

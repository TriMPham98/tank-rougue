import { useState, useEffect, useRef } from "react";
import "./App.css";
import GameScene from "./components/GameScene";
import GameUI from "./components/GameUI";
import { useGameState } from "./utils/gameState";

function App() {
  // Use a ref to ensure initialization only happens once
  const initialized = useRef(false);
  const { restartGame, togglePause, isPaused, spawnEnemy, spawnPowerUp } =
    useGameState();

  // Initialize game on first render
  useEffect(() => {
    // Only run initialization once
    if (!initialized.current) {
      console.log("Initializing game...");

      // Set game to initial state
      restartGame();
      console.log("Game restarted");

      // Generate initial enemies and power-ups
      try {
        console.log("Spawning enemies and power-ups...");

        // Generate some enemies at different positions
        spawnEnemy({
          position: [5, 0.5, 5],
          health: 100,
          type: "tank",
        });

        spawnEnemy({
          position: [-5, 0.5, 5],
          health: 100,
          type: "turret",
        });

        spawnEnemy({
          position: [8, 0.5, -8],
          health: 120,
          type: "tank",
        });

        spawnEnemy({
          position: [-8, 0.5, -8],
          health: 80,
          type: "turret",
        });

        // Add some power-ups
        spawnPowerUp({
          position: [3, 0.5, -3],
          type: "health",
        });

        spawnPowerUp({
          position: [-3, 0.5, 3],
          type: "damage",
        });

        initialized.current = true;
      } catch (error) {
        console.error("Error initializing game:", error);
      }
    }
  }, [restartGame, spawnEnemy, spawnPowerUp]);

  // Handle escape key for pausing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        togglePause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [togglePause]);

  return (
    <div
      className="app"
      style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <GameScene />
      <GameUI />
    </div>
  );
}

export default App;

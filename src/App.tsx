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

  console.log("App component rendered");

  // Initialize game on first render
  useEffect(() => {
    console.log(
      "App initialization effect running, initialized:",
      initialized.current
    );

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
        console.log("Enemy 1 spawned");

        spawnEnemy({
          position: [-5, 0.5, 5],
          health: 100,
          type: "turret",
        });
        console.log("Enemy 2 spawned");

        spawnEnemy({
          position: [8, 0.5, -8],
          health: 120,
          type: "tank",
        });
        console.log("Enemy 3 spawned");

        spawnEnemy({
          position: [-8, 0.5, -8],
          health: 80,
          type: "turret",
        });
        console.log("Enemy 4 spawned");

        // Add some power-ups
        spawnPowerUp({
          position: [3, 0.5, -3],
          type: "health",
        });
        console.log("Power-up 1 spawned");

        spawnPowerUp({
          position: [-3, 0.5, 3],
          type: "damage",
        });
        console.log("Power-up 2 spawned");

        console.log("Enemies and power-ups spawned successfully");
        initialized.current = true;
      } catch (error) {
        console.error("Error initializing game:", error);
      }
    }
  }, [restartGame, spawnEnemy, spawnPowerUp]);

  // Handle escape key for pausing
  useEffect(() => {
    console.log("Setting up keyboard handler");

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        console.log("Toggle pause");
        togglePause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      console.log("Removing keyboard handler");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [togglePause]);

  return (
    <div className="app">
      <GameScene />
      <GameUI />
    </div>
  );
}

export default App;

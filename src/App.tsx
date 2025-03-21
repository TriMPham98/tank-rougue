import { useState, useEffect, useRef } from "react";
import "./App.css";
import GameScene from "./components/GameScene";
import GameUI from "./components/GameUI";
import { useGameState } from "./utils/gameState";
import { generateLevel } from "./utils/levelGenerator";

function App() {
  // Use a ref to ensure initialization only happens once
  const initialized = useRef(false);
  const { restartGame, togglePause, isPaused, level, showUpgradeUI } =
    useGameState();

  // Initialize game on first render
  useEffect(() => {
    // Only run initialization once
    if (!initialized.current) {
      // Set game to initial state
      restartGame();

      // Generate initial enemies and power-ups based on level 1
      try {
        const playerPosition: [number, number, number] = [0, 0.5, 0];
        generateLevel(1, playerPosition);

        initialized.current = true;
      } catch (error) {
        console.error("Error initializing game:", error);
      }
    }
  }, [restartGame]);

  // Handle escape key for pausing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showUpgradeUI) {
        togglePause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [togglePause, showUpgradeUI]);

  // Automatically pause the game when upgrade UI is shown
  useEffect(() => {
    if (showUpgradeUI && !isPaused) {
      togglePause();
    }
  }, [showUpgradeUI, isPaused, togglePause]);

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

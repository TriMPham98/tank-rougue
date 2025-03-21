import { useState, useEffect, useRef } from "react";
import "./App.css";
import GameScene from "./components/GameScene";
import GameUI from "./components/GameUI";
import { useGameState } from "./utils/gameState";
import { generateLevel } from "./utils/levelGenerator";
import { debug } from "./utils/debug";

function App() {
  // Use a ref to ensure initialization only happens once
  const initialized = useRef(false);
  // Add the wasPaused ref at the top level
  const wasPaused = useRef(false);

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
        debug.error("Error initializing game:", error);
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

  // Only pause the game when upgrade UI is shown, but don't keep it paused after
  useEffect(() => {
    if (showUpgradeUI && !isPaused) {
      // Pause the game when upgrade UI appears
      togglePause();
      wasPaused.current = false; // Note that it wasn't paused before
    } else if (!showUpgradeUI && isPaused && wasPaused.current === false) {
      // Resume the game when upgrade UI is dismissed, but only if we paused it
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

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
  // Add a ref to track last toggle time
  const lastToggleTime = useRef(0);

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
        // Prevent multiple toggles within 200ms
        const now = Date.now();
        if (now - lastToggleTime.current < 200) {
          return;
        }
        lastToggleTime.current = now;
        togglePause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [togglePause, showUpgradeUI, isPaused]);

  // Only pause the game when upgrade UI is shown, but don't keep it paused after
  useEffect(() => {
    // Store the current pause state when upgrade UI changes
    if (showUpgradeUI) {
      wasPaused.current = isPaused;
      if (!isPaused) {
        // Only pause if not already paused
        togglePause();
      }
    } else if (!wasPaused.current) {
      // Only unpause if we were the ones who paused it
      if (isPaused) {
        togglePause();
      }
    }
  }, [showUpgradeUI]); // Only run when showUpgradeUI changes

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

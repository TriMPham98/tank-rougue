import { useEffect, useRef } from "react";
import "./App.css";
import GameScene from "./components/GameScene";
import GameUI from "./components/GameUI";
import { useGameState } from "./utils/gameState";
import { generateLevel } from "./utils/levelGenerator";
import { debug } from "./utils/debug";
import AudioUnlock from "./components/AudioUnlock";
import StartScreen from "./components/StartScreen";

function App() {
  // Use a ref to ensure initialization only happens once
  const initialized = useRef(false);
  // Add the wasPaused ref at the top level
  const wasPaused = useRef(false);
  // Add a ref to track last toggle time
  const lastToggleTime = useRef(0);

  const {
    restartGame,
    togglePause,
    isPaused,
    level,
    showUpgradeUI,
    advanceLevel,
    isGameStarted,
  } = useGameState();

  // Initialize game state on first render, but don't start the game automatically
  useEffect(() => {
    // Only run basic initialization once, without starting the game
    if (!initialized.current) {
      try {
        initialized.current = true;
      } catch (error) {
        debug.error("Error initializing game:", error);
      }
    }
  }, []);

  // Handle escape key for pausing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only respond to keyboard controls if the game has started
      if (!isGameStarted) return;

      if (e.key === "Escape" && !showUpgradeUI) {
        // Prevent multiple toggles within 200ms
        const now = Date.now();
        if (now - lastToggleTime.current < 200) {
          return;
        }
        lastToggleTime.current = now;
        togglePause();
      }

      // Debug key for testing level progression (press 'L' to level up)
      if ((e.key === "l" || e.key === "L") && e.shiftKey) {
        debug.log(
          `Advancing level from ${level} to ${level + 1} for lighting test`
        );
        advanceLevel();

        // Generate new level enemies
        try {
          generateLevel();
        } catch (error) {
          debug.error("Error generating level:", error);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    togglePause,
    showUpgradeUI,
    isPaused,
    level,
    advanceLevel,
    isGameStarted,
  ]);

  // Only pause the game when upgrade UI is shown, but don't keep it paused after
  useEffect(() => {
    // Only process this logic if the game has started
    if (!isGameStarted) return;

    // Store the current pause state when upgrade UI appears
    if (showUpgradeUI) {
      wasPaused.current = isPaused;
      if (!isPaused) {
        // Only pause if not already paused
        togglePause();
      }
    } else if (wasPaused.current === false && isPaused) {
      // If we were NOT paused before the upgrade UI appeared,
      // and we're still paused after it disappeared, unpause the game
      togglePause();
      // Reset the wasPaused state
      wasPaused.current = false;
    }
  }, [showUpgradeUI, isGameStarted, isPaused, togglePause]);

  // Only render start screen if game not started
  if (!isGameStarted) {
    return <StartScreen />;
  }

  return (
    <div className="app">
      <GameScene />
      <GameUI />
      <AudioUnlock />
    </div>
  );
}

export default App;

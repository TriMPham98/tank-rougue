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
  // Ref to track if the current pause state was initiated by the upgrade UI effect
  const pausedByUpgradeUI = useRef(false);
  // Add a ref to track last toggle time
  const lastToggleTime = useRef(0);

  const {
    togglePause,
    isPaused,
    level,
    showUpgradeUI,
    advanceLevel,
    isGameStarted,
    checkOrientation,
    showOrientationWarning,
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

  // Handle mobile device orientation changes
  useEffect(() => {
    // Set up orientation change detection
    const handleOrientationChange = () => {
      // Check orientation and update game state
      checkOrientation();
    };

    // Initial check
    checkOrientation();

    // Add event listeners for orientation changes
    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("resize", handleOrientationChange);

    return () => {
      // Clean up event listeners
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("resize", handleOrientationChange);
    };
  }, [checkOrientation]);

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

  // Effect to automatically pause/unpause ONLY when the upgrade UI appears/disappears
  useEffect(() => {
    if (!isGameStarted) return;

    if (showUpgradeUI) {
      // Upgrade UI is now showing
      if (!isPaused) {
        // If game is not paused, pause it and remember we did it.
        pausedByUpgradeUI.current = true;
        togglePause();
      } else {
        // If game was already paused (manually), ensure our flag is false.
        pausedByUpgradeUI.current = false;
      }
    } else {
      // Upgrade UI is now hidden
      if (isPaused && pausedByUpgradeUI.current) {
        // If the game is paused AND we paused it for the UI, unpause it.
        togglePause();
      }
      // Always reset the flag when UI is hidden.
      pausedByUpgradeUI.current = false;
    }
    // Dependencies ONLY include showUpgradeUI and isGameStarted
    // to prevent running when isPaused changes manually.
  }, [showUpgradeUI, isGameStarted, togglePause]);

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

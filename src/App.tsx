import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import GameScene from "./components/GameScene";
import GameUI from "./components/GameUI";
import { useGameState } from "./utils/gameState";
import { generateLevel } from "./utils/levelGenerator";

function App() {
  const { level, restartGame, togglePause, isPaused } = useGameState();
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Initialize game when first loaded
  useEffect(() => {
    if (isFirstLoad) {
      restartGame();
      // Generate first level with player at center position
      generateLevel(1, [0, 0.5, 0]);
      setIsFirstLoad(false);
    }
  }, [isFirstLoad, restartGame]);

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
    <div className="app">
      <GameScene />
      <GameUI />
    </div>
  );
}

export default App;

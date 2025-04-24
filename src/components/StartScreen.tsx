import React, { useEffect, useState } from "react";
import "./StartScreen.css";
import { useGameState } from "../utils/gameState";
import { generateLevel } from "../utils/levelGenerator";

const StartScreen: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const { startGame, restartGame } = useGameState();

  useEffect(() => {
    const checkMobile = () => {
      return (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) ||
        "ontouchstart" in window ||
        window.matchMedia("(max-width: 768px)").matches
      );
    };

    setIsMobile(checkMobile());
  }, []);

  const handleStartGame = () => {
    restartGame();
    generateLevel();
    startGame();
  };

  return (
    <div className={`start-screen military-theme ${isMobile ? "mobile" : ""}`}>
      <div className="start-screen-content">
        <h1 className="game-title">ROGUE TANK ROYALE</h1>
        <h2 className="game-subtitle">TACTICAL COMBAT SIMULATOR</h2>

        <div className="title-decoration">
          <div className="line"></div>
          <div className="circle"></div>
          <div className="line"></div>
        </div>

        <button className="start-button" onClick={handleStartGame}>
          DEPLOY UNIT
        </button>

        <div className="version-badge">v1.0.0</div>
      </div>
    </div>
  );
};

export default StartScreen;

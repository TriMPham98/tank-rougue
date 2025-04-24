import React, { useEffect, useState } from "react";
import "./StartScreen.css";
import { useGameState } from "../utils/gameState";
import { generateLevel } from "../utils/levelGenerator";

const StartScreen: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const { startGame, restartGame } = useGameState();
  const [subtitleText, setSubtitleText] = useState("");
  const fullSubtitle = "TACTICAL COMBAT SIMULATOR";

  useEffect(() => {
    // Check if the device is mobile
    const checkMobile = () =>
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      "ontouchstart" in window ||
      window.matchMedia("(max-width: 768px)").matches;
    setIsMobile(checkMobile());

    let charIndex = 0;
    setSubtitleText(""); // Reset subtitle text on mount
    const typingTimeout = setTimeout(() => {
      const typingInterval = setInterval(() => {
        if (charIndex < fullSubtitle.length) {
          setSubtitleText(fullSubtitle.slice(0, charIndex + 1));
          charIndex++;
        } else {
          clearInterval(typingInterval);
        }
      }, 100);
      return () => clearInterval(typingInterval); // Cleanup interval
    }, 1500); // 1.5s delay before typing starts

    // Add keyboard event listener for SPACEBAR and ENTER
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === " " || event.key === "Enter") {
        handleStartGame();
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      clearTimeout(typingTimeout); // Cleanup timeout on unmount
      window.removeEventListener("keydown", handleKeyPress); // Cleanup event listener
    };
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
        <h2 className="game-subtitle">
          {subtitleText}
          {subtitleText.length < fullSubtitle.length && (
            <span className="typing-cursor">|</span>
          )}
        </h2>
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

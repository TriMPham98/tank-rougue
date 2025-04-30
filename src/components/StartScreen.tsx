import React, { useEffect, useState } from "react";
import "./StartScreen.css";
import { useGameState } from "../utils/gameState";
import { generateLevel } from "../utils/levelGenerator";
import { useSound } from "../utils/sound";
import TankWireframeDisplay from "./TankWireframeDisplay";

const StartScreen: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const { startGame, restartGame } = useGameState();
  const [subtitleText, setSubtitleText] = useState("");
  const fullSubtitle = "Evade, Upgrade, Survive";
  const sound = useSound();

  useEffect(() => {
    // Check if the device is mobile with improved detection
    const checkMobile = () => {
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || "ontouchstart" in window;

      const isSmallScreen = window.matchMedia("(max-width: 768px)").matches;

      return isMobileDevice || isSmallScreen;
    };

    const updateMobileState = () => {
      setIsMobile(checkMobile());
    };

    // Set initial mobile state
    updateMobileState();

    // Update on resize events
    window.addEventListener("resize", updateMobileState);

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
      window.removeEventListener("resize", updateMobileState); // Cleanup resize listener
    };
  }, []);

  const handleStartGame = () => {
    sound.play("deployTank");
    restartGame();
    generateLevel(); // Generate level first

    // Short delay to ensure terrain is generated before starting camera animation
    setTimeout(() => {
      startGame();
    }, 100);
  };

  return (
    <div className={`start-screen military-theme ${isMobile ? "mobile" : ""}`}>
      {/* Tank wireframe as background */}
      <div className="tank-wireframe-background">
        <TankWireframeDisplay width="100%" height="100%" isBackground={true} />
      </div>

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
      </div>
    </div>
  );
};

export default StartScreen;

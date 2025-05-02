import React, { useEffect, useState } from "react";
import "./StartScreen.css";
import { useGameState } from "../utils/gameState";
import { generateLevel } from "../utils/levelGenerator";
import { useSound } from "../utils/sound";
import TankWireframeDisplay from "./TankWireframeDisplay";
import { AnimState } from "./TankWireframe";

type TransitionStep = "idle" | "fading" | "assembling";

const StartScreen: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const { startGame, restartGame, isGameStarted } = useGameState((state) => {
    console.log("GameState update: isGameStarted?", state.isGameStarted);
    return {
      startGame: state.startGame,
      restartGame: state.restartGame,
      isGameStarted: state.isGameStarted,
    };
  });
  const [subtitleText, setSubtitleText] = useState("");
  const fullSubtitle = "Evade, Upgrade, Survive";
  const sound = useSound();
  const [transitionStep, setTransitionStep] = useState<TransitionStep>("idle");
  const [wireframeAnimMode, setWireframeAnimMode] = useState<AnimState>(
    AnimState.IDLE
  );

  console.log(
    `StartScreen Render: transitionStep=${transitionStep}, wireframeAnimMode=${AnimState[wireframeAnimMode]}`
  );

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

    // Only run typing animation if not transitioning
    let typingInterval: NodeJS.Timeout | undefined;
    let typingTimeout: NodeJS.Timeout | undefined;
    let charIndex = 0;
    setSubtitleText(""); // Reset subtitle text on mount
    if (transitionStep === "idle") {
      typingTimeout = setTimeout(() => {
        typingInterval = setInterval(() => {
          if (charIndex < fullSubtitle.length) {
            setSubtitleText(fullSubtitle.slice(0, charIndex + 1));
            charIndex++;
          } else {
            clearInterval(typingInterval);
          }
        }, 100);
      }, 1500); // 1.5s delay before typing starts
    }

    // Add keyboard event listener for SPACEBAR and ENTER
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === " " || event.key === "Enter") {
        if (transitionStep === "idle") {
          handleStartGame();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      clearTimeout(typingTimeout); // Cleanup timeout on unmount
      clearInterval(typingInterval); // Cleanup interval
      window.removeEventListener("keydown", handleKeyPress); // Cleanup event listener
      window.removeEventListener("resize", updateMobileState); // Cleanup resize listener
    };
  }, [transitionStep]);

  const handleStartGame = () => {
    // Prevent triggering if already started or transitioning
    if (isGameStarted || transitionStep !== "idle") {
      console.log(
        "handleStartGame: Aborted (already started or transitioning)"
      );
      return;
    }
    console.log(
      "handleStartGame: Initiated - Playing sound and starting fade/animation/setup."
    );
    sound.play("deployTank");

    // Start fade-out CSS
    setTransitionStep("fading");

    // Start animation immediately
    setWireframeAnimMode(AnimState.ASSEMBLING_TRANSITION);

    // Setup game state immediately
    restartGame();
    generateLevel();
  };

  // Handler for when the assembly animation completes
  const handleAssemblyComplete = (finalState: AnimState) => {
    console.log(
      `handleAssemblyComplete: Called with finalState=${AnimState[finalState]}`
    );
    // Log the state values *right before* the check
    console.log(
      `handleAssemblyComplete: Checking condition: transitionStep === "${transitionStep}", finalState === AnimState.IDLE (${
        finalState === AnimState.IDLE
      }), isGameStarted === ${isGameStarted}`
    );

    // The transitionStep will be 'fading' when the animation completes in this flow
    if (transitionStep === "fading" && finalState === AnimState.IDLE) {
      // Ensure game hasn't already been started somehow
      if (!isGameStarted) {
        console.log(
          "handleAssemblyComplete: Condition MET. Calling startGame()"
        );
        startGame(); // Now start the actual game
      } else {
        console.log(
          "handleAssemblyComplete: Condition MET but game already started."
        );
      }
    } else {
      console.log("handleAssemblyComplete: Condition NOT MET.");
    }
  };

  return (
    <div className={`start-screen military-theme ${isMobile ? "mobile" : ""}`}>
      {/* Tank wireframe as background */}
      <div className="tank-wireframe-background">
        <TankWireframeDisplay
          width="100%"
          height="100%"
          isBackground={true}
          animationMode={wireframeAnimMode}
          onAnimationComplete={handleAssemblyComplete}
        />
      </div>

      {/* Apply fading class based on transition state */}
      <div
        className={`start-screen-content ${
          transitionStep !== "idle" ? "fading-out" : ""
        }`}>
        <h1 className="game-title">ROGUE TANK ROYALE</h1>
        <h2 className="game-subtitle">
          {subtitleText}
          {subtitleText.length < fullSubtitle.length &&
            transitionStep === "idle" && (
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
      {/* Conditionally render Loading text during fade/assembly */}
      {transitionStep === "fading" && (
        <div className="loading-text">Loading...</div>
      )}
    </div>
  );
};

export default StartScreen;

import { useEffect, useRef, useState } from "react";
import { useGameState } from "../utils/gameState";
import "./MobileJoysticks.css";

// Store touch identifiers
let leftTouchId: number | null = null;
let rightTouchId: number | null = null;

const MobileJoysticks = () => {
  const { setInput } = useGameState();
  // State for joystick positions
  const [leftActive, setLeftActive] = useState(false);
  const [rightActive, setRightActive] = useState(false);

  const leftJoystickRef = useRef<HTMLDivElement>(null);
  const leftStickRef = useRef<HTMLDivElement>(null);
  const rightJoystickRef = useRef<HTMLDivElement>(null);
  const rightStickRef = useRef<HTMLDivElement>(null);

  // Handle mobile detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    };

    setIsMobile(checkMobile());

    if ("ontouchstart" in window) {
      setIsMobile(true);
    }

    // Handle passive event listeners for mobile browsers
    if (leftJoystickRef.current) {
      document.addEventListener("touchmove", preventDefaultForTouch, {
        passive: false,
      });
    }

    return () => {
      leftTouchId = null;
      rightTouchId = null;
      document.removeEventListener("touchmove", preventDefaultForTouch);
    };
  }, []);

  // Function to prevent default touch behavior globally
  const preventDefaultForTouch = (e: TouchEvent) => {
    if (
      leftJoystickRef.current?.contains(e.target as Node) ||
      rightJoystickRef.current?.contains(e.target as Node)
    ) {
      e.preventDefault();
    }
  };

  if (!isMobile) return null;

  // Left joystick handlers (movement)
  const handleLeftStart = (e: React.TouchEvent) => {
    if (leftTouchId !== null) return;

    const touch = e.changedTouches[0];
    if (touch) {
      leftTouchId = touch.identifier;
      setLeftActive(true);

      if (leftJoystickRef.current && leftStickRef.current) {
        leftStickRef.current.style.transform = `translate(0px, 0px)`;
      }
    }
  };

  const handleLeftMove = (e: React.TouchEvent) => {
    if (
      !leftActive ||
      leftTouchId === null ||
      !leftJoystickRef.current ||
      !leftStickRef.current
    )
      return;

    let touch = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === leftTouchId) {
        touch = e.touches[i];
        break;
      }
    }

    if (!touch) {
      handleLeftEnd(e);
      return;
    }

    const joystickRect = leftJoystickRef.current.getBoundingClientRect();
    const centerX = joystickRect.width / 2;
    const centerY = joystickRect.height / 2;
    let deltaX = touch.clientX - (joystickRect.left + centerX);
    let deltaY = touch.clientY - (joystickRect.top + centerY);
    const maxRadius = joystickRect.width / 2 - 10;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > maxRadius) {
      const ratio = maxRadius / distance;
      deltaX *= ratio;
      deltaY *= ratio;
    }

    leftStickRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    const moveX = deltaX / maxRadius;
    const moveZ = deltaY / maxRadius;

    setInput({
      moveX,
      moveZ,
    });
  };

  const handleLeftEnd = (e: React.TouchEvent) => {
    let touchEnded = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === leftTouchId) {
        touchEnded = true;
        break;
      }
    }

    if (!touchEnded) return;

    leftTouchId = null;
    setLeftActive(false);

    if (leftStickRef.current) {
      leftStickRef.current.style.transform = `translate(0px, 0px)`;
      setInput({
        moveX: 0,
        moveZ: 0,
      });
    }
  };

  // Right joystick handlers (turret rotation)
  const handleRightStart = (e: React.TouchEvent) => {
    if (rightTouchId !== null) return;

    const touch = e.changedTouches[0];
    if (touch) {
      rightTouchId = touch.identifier;
      setRightActive(true);

      if (rightJoystickRef.current && rightStickRef.current) {
        rightStickRef.current.style.transform = `translate(0px, 0px)`;
      }
    }
  };

  const handleRightMove = (e: React.TouchEvent) => {
    if (
      !rightActive ||
      rightTouchId === null ||
      !rightJoystickRef.current ||
      !rightStickRef.current
    )
      return;

    let touch = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === rightTouchId) {
        touch = e.touches[i];
        break;
      }
    }

    if (!touch) {
      handleRightEnd(e);
      return;
    }

    const joystickRect = rightJoystickRef.current.getBoundingClientRect();
    const centerX = joystickRect.width / 2;
    const centerY = joystickRect.height / 2;
    let deltaX = touch.clientX - (joystickRect.left + centerX);
    let deltaY = touch.clientY - (joystickRect.top + centerY);
    const maxRadius = joystickRect.width / 2 - 10;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > maxRadius) {
      const ratio = maxRadius / distance;
      deltaX *= ratio;
      deltaY *= ratio;
    }

    rightStickRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    // Use the absolute simplest angle calculation: Math.atan2(y, x)
    // This gives an angle in radians (-π to π) where 0 is to the right (3 o'clock)
    const angleRadians = Math.atan2(deltaY, deltaX);

    // Convert to degrees for better readability
    const angleDegrees = angleRadians * (180 / Math.PI);

    // For our game, we want 0 to be at 12 o'clock (up), so rotate by -90 degrees
    // But in screen coordinates, +y points down, so we need to use the opposite
    let gameAngleDegrees = angleDegrees - 90;

    // Invert left/right orientation to fix the turret rotation direction
    gameAngleDegrees = 360 - gameAngleDegrees;

    // Normalize to 0-360 range for consistency
    if (gameAngleDegrees < 0) {
      gameAngleDegrees += 360;
    }
    if (gameAngleDegrees >= 360) {
      gameAngleDegrees -= 360;
    }

    // Only log in development
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      console.log(
        "Joystick:",
        { x: deltaX, y: deltaY },
        "Angle (degrees):",
        gameAngleDegrees
      );
    }

    // Convert back to radians for the game engine (if needed)
    const gameAngleRadians = gameAngleDegrees * (Math.PI / 180);

    // Send the angle to the game
    setInput({
      turretRotation: gameAngleRadians, // Send as radians if your game expects radians
      isFiring: true,
    });
  };

  const handleRightEnd = (e: React.TouchEvent) => {
    let touchEnded = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === rightTouchId) {
        touchEnded = true;
        break;
      }
    }

    if (!touchEnded) return;

    rightTouchId = null;
    setRightActive(false);

    if (rightStickRef.current) {
      rightStickRef.current.style.transform = `translate(0px, 0px)`;

      // Important: Keep the last turret rotation but stop firing
      setInput({
        isFiring: false,
        // Don't modify turretRotation
      });
    }
  };

  return (
    <div className="mobile-joysticks">
      <div
        className="joystick-container left-joystick"
        ref={leftJoystickRef}
        onTouchStart={handleLeftStart}
        onTouchMove={handleLeftMove}
        onTouchEnd={handleLeftEnd}
        style={{ touchAction: "none" }}>
        <div className="joystick-base">
          <div className="joystick-stick" ref={leftStickRef}></div>
        </div>
        <div className="joystick-label">MOVE</div>
      </div>

      <div
        className="joystick-container right-joystick"
        ref={rightJoystickRef}
        onTouchStart={handleRightStart}
        onTouchMove={handleRightMove}
        onTouchEnd={handleRightEnd}
        style={{ touchAction: "none" }}>
        <div className="joystick-base">
          <div className="joystick-stick" ref={rightStickRef}></div>
        </div>
        <div className="joystick-label">AIM & FIRE</div>
      </div>
    </div>
  );
};

export default MobileJoysticks;

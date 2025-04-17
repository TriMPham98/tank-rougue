import { useEffect, useRef, useState } from "react";
import { useGameState } from "../utils/gameState";
import "./MobileJoysticks.css";

interface JoystickPosition {
  x: number;
  y: number;
}

const MobileJoysticks = () => {
  const { setInput } = useGameState();
  const [rightActive, setRightActive] = useState(false);
  const [, setRightPosition] = useState<JoystickPosition>({ x: 0, y: 0 });
  const [dpadDirection, setDpadDirection] = useState<{
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  }>({ up: false, down: false, left: false, right: false });

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

    // Also show joysticks if touch is supported
    if ("ontouchstart" in window) {
      setIsMobile(true);
    }
  }, []);

  // If not mobile, don't render joysticks
  if (!isMobile) return null;

  // D-pad handlers
  const handleDpadPress = (
    direction: "up" | "down" | "left" | "right",
    isPressed: boolean
  ) => {
    // Update the D-pad state
    setDpadDirection((prev) => ({
      ...prev,
      [direction]: isPressed,
    }));

    // Calculate the movement values based on active directions
    const newDpadState = {
      ...dpadDirection,
      [direction]: isPressed,
    };

    // Convert D-pad state to movement values
    let forward = 0;
    let strafe = 0;

    if (newDpadState.up) forward = 1;
    if (newDpadState.down) forward = -1;
    if (newDpadState.left) strafe = -1;
    if (newDpadState.right) strafe = 1;

    // Send movement input to game state
    setInput({
      forward,
      strafe,
      turretRotation: null, // Don't modify turret with D-pad
    });
  };

  // Right joystick handlers (turret rotation)
  const handleRightStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setRightActive(true);

    if (rightJoystickRef.current && rightStickRef.current) {
      setRightPosition({ x: 0, y: 0 });
      rightStickRef.current.style.transform = `translate(0px, 0px)`;
    }
  };

  const handleRightMove = (e: React.TouchEvent) => {
    if (!rightActive || !rightJoystickRef.current || !rightStickRef.current)
      return;
    e.preventDefault();

    const touch = e.touches[0];
    const joystickRect = rightJoystickRef.current.getBoundingClientRect();

    // Calculate position relative to joystick center
    const centerX = joystickRect.width / 2;
    const centerY = joystickRect.height / 2;

    let deltaX = touch.clientX - (joystickRect.left + centerX);
    let deltaY = touch.clientY - (joystickRect.top + centerY);

    // Limit distance to joystick radius
    const maxRadius = joystickRect.width / 2 - 10;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > maxRadius) {
      const ratio = maxRadius / distance;
      deltaX *= ratio;
      deltaY *= ratio;
    }

    // Update joystick position
    setRightPosition({ x: deltaX, y: deltaY });
    rightStickRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    // Calculate absolute angle based on joystick position
    const angle = Math.atan2(deltaY, deltaX);

    // Invert rotation, adjust by -90 degrees, and offset by 180 degrees
    // Inverting rotation: -angle
    // 180 degree offset: + Math.PI
    // -90 degree adjustment: - Math.PI/2
    // Combined: -angle - Math.PI/2 + Math.PI = -angle + Math.PI/2
    const correctedAngle = -angle + Math.PI / 2;

    // Send absolute turret rotation input to game state
    setInput({
      forward: null, // Don't modify movement with right stick
      strafe: null, // Don't modify strafe with right stick
      turretRotation: correctedAngle, // Set inverted and adjusted turret rotation angle
      isFiring: true, // Fire when aiming
    });
  };

  const handleRightEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setRightActive(false);

    if (rightStickRef.current) {
      rightStickRef.current.style.transform = `translate(0px, 0px)`;
      setRightPosition({ x: 0, y: 0 });

      // Stop firing when joystick is released
      setInput({
        isFiring: false,
      });

      // Don't reset turret rotation when joystick is released
      // This allows the turret to stay in its current position
    }
  };

  return (
    <div className="mobile-joysticks">
      {/* D-pad for Movement */}
      <div className="dpad-container">
        <div className="dpad">
          <button
            className="dpad-button dpad-up"
            onTouchStart={() => handleDpadPress("up", true)}
            onTouchEnd={() => handleDpadPress("up", false)}>
            ▲
          </button>
          <button
            className="dpad-button dpad-down"
            onTouchStart={() => handleDpadPress("down", true)}
            onTouchEnd={() => handleDpadPress("down", false)}>
            ▼
          </button>
          <button
            className="dpad-button dpad-left"
            onTouchStart={() => handleDpadPress("left", true)}
            onTouchEnd={() => handleDpadPress("left", false)}>
            ◀
          </button>
          <button
            className="dpad-button dpad-right"
            onTouchStart={() => handleDpadPress("right", true)}
            onTouchEnd={() => handleDpadPress("right", false)}>
            ▶
          </button>
          <div className="dpad-center"></div>
        </div>
        <div className="dpad-label">MOVE</div>
      </div>

      {/* Right Joystick - Turret */}
      <div
        className="joystick-container right-joystick"
        ref={rightJoystickRef}
        onTouchStart={handleRightStart}
        onTouchMove={handleRightMove}
        onTouchEnd={handleRightEnd}>
        <div className="joystick-base">
          <div className="joystick-stick" ref={rightStickRef}></div>
        </div>
        <div className="joystick-label">AIM & FIRE</div>
      </div>
    </div>
  );
};

export default MobileJoysticks;

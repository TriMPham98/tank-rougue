import { useEffect, useRef, useState } from "react";
import { useGameState } from "../utils/gameState";
import "./MobileJoysticks.css";

interface JoystickPosition {
  x: number;
  y: number;
}

const MobileJoysticks = () => {
  const { setInput } = useGameState();
  const [leftActive, setLeftActive] = useState(false);
  const [rightActive, setRightActive] = useState(false);
  const [, setLeftPosition] = useState<JoystickPosition>({ x: 0, y: 0 });
  const [, setRightPosition] = useState<JoystickPosition>({ x: 0, y: 0 });

  const leftJoystickRef = useRef<HTMLDivElement>(null);
  const rightJoystickRef = useRef<HTMLDivElement>(null);
  const leftStickRef = useRef<HTMLDivElement>(null);
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

  // Left joystick handlers (movement)
  const handleLeftStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setLeftActive(true);

    if (leftJoystickRef.current && leftStickRef.current) {
      const joystickRect = leftJoystickRef.current.getBoundingClientRect();
      setLeftPosition({ x: 0, y: 0 });
      leftStickRef.current.style.transform = `translate(0px, 0px)`;
    }
  };

  const handleLeftMove = (e: React.TouchEvent) => {
    if (!leftActive || !leftJoystickRef.current || !leftStickRef.current)
      return;
    e.preventDefault();

    const touch = e.touches[0];
    const joystickRect = leftJoystickRef.current.getBoundingClientRect();

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
    setLeftPosition({ x: deltaX, y: deltaY });
    leftStickRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    // Calculate normalized values for input (-1 to 1)
    const normalizedX = deltaX / maxRadius;
    const normalizedY = deltaY / maxRadius;

    // Send movement input to game state
    setInput({
      forward: -normalizedY, // Forward is negative Y (up)
      strafe: normalizedX, // Strafe is X
      turretRotation: null, // Don't modify turret with left stick
    });
  };

  const handleLeftEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setLeftActive(false);

    if (leftStickRef.current) {
      leftStickRef.current.style.transform = `translate(0px, 0px)`;
      setLeftPosition({ x: 0, y: 0 });

      // Reset movement when joystick is released
      setInput({
        forward: 0,
        strafe: 0,
        turretRotation: null,
      });
    }
  };

  // Right joystick handlers (turret rotation)
  const handleRightStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setRightActive(true);

    if (rightJoystickRef.current && rightStickRef.current) {
      const joystickRect = rightJoystickRef.current.getBoundingClientRect();
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

    // Calculate rotation angle based on joystick position
    const angle = Math.atan2(deltaY, deltaX);

    // Send turret rotation input to game state
    setInput({
      forward: null, // Don't modify movement with right stick
      strafe: null, // Don't modify strafe with right stick
      turretRotation: angle, // Set turret rotation angle
    });
  };

  const handleRightEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setRightActive(false);

    if (rightStickRef.current) {
      rightStickRef.current.style.transform = `translate(0px, 0px)`;
      setRightPosition({ x: 0, y: 0 });

      // Don't reset turret rotation when joystick is released
      // This allows the turret to stay in its current position
    }
  };

  return (
    <div className="mobile-joysticks">
      {/* Left Joystick - Movement */}
      <div
        className="joystick-container left-joystick"
        ref={leftJoystickRef}
        onTouchStart={handleLeftStart}
        onTouchMove={handleLeftMove}
        onTouchEnd={handleLeftEnd}>
        <div className="joystick-base">
          <div className="joystick-stick" ref={leftStickRef}></div>
        </div>
        <div className="joystick-label">MOVE</div>
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
        <div className="joystick-label">AIM</div>
      </div>

      {/* Fire Button */}
      <div
        className="fire-button"
        onTouchStart={(e) => {
          e.preventDefault();
          setInput({ isFiring: true });
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          setInput({ isFiring: false });
        }}>
        FIRE
      </div>
    </div>
  );
};

export default MobileJoysticks;

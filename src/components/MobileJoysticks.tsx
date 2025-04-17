import { useEffect, useRef, useState } from "react";
import { useGameState } from "../utils/gameState";
import "./MobileJoysticks.css";

interface JoystickPosition {
  x: number;
  y: number;
}

const MobileJoysticks = () => {
  const { setInput } = useGameState();
  // State for joystick positions (commented out as unused)
  // const [leftPosition, setLeftPosition] = useState<JoystickPosition>({ x: 0, y: 0 });
  const [leftActive, setLeftActive] = useState(false);
  // const [rightPosition, setRightPosition] = useState<JoystickPosition>({ x: 0, y: 0 });
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

    // Also show joysticks if touch is supported
    if ("ontouchstart" in window) {
      setIsMobile(true);
    }
  }, []);

  // If not mobile, don't render joysticks
  if (!isMobile) return null;

  // Left joystick handlers (movement)
  const handleLeftStart = (_e: React.TouchEvent) => {
    setLeftActive(true);

    if (leftJoystickRef.current && leftStickRef.current) {
      // setLeftPosition({ x: 0, y: 0 }); // Commented out as unused
      leftStickRef.current.style.transform = `translate(0px, 0px)`;
    }
  };

  const handleLeftMove = (e: React.TouchEvent) => {
    if (!leftActive || !leftJoystickRef.current || !leftStickRef.current)
      return;

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
    // setLeftPosition({ x: deltaX, y: deltaY }); // Commented out as unused
    leftStickRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    // Calculate absolute movement values based on joystick position
    // Right = +X (East)
    // Up = -Z (North) - Inverted Z calculation
    const moveX = deltaX / maxRadius;
    const moveZ = deltaY / maxRadius; // Changed from -deltaY to deltaY

    // Send absolute movement input to game state
    setInput({
      moveX,
      moveZ,
      turretRotation: null, // Don't modify turret with left stick
    });
  };

  const handleLeftEnd = () => {
    setLeftActive(false);

    if (leftStickRef.current) {
      leftStickRef.current.style.transform = `translate(0px, 0px)`;
      // setLeftPosition({ x: 0, y: 0 }); // Commented out as unused

      // Stop absolute movement when joystick is released
      setInput({
        moveX: 0,
        moveZ: 0,
      });
    }
  };

  // Right joystick handlers (turret rotation)
  const handleRightStart = (_e: React.TouchEvent) => {
    setRightActive(true);

    if (rightJoystickRef.current && rightStickRef.current) {
      // setRightPosition({ x: 0, y: 0 }); // Commented out as unused
      rightStickRef.current.style.transform = `translate(0px, 0px)`;
    }
  };

  const handleRightMove = (e: React.TouchEvent) => {
    if (!rightActive || !rightJoystickRef.current || !rightStickRef.current)
      return;

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
    // setRightPosition({ x: deltaX, y: deltaY }); // Commented out as unused
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
      moveX: null, // Don't modify movement with right stick
      moveZ: null, // Don't modify movement with right stick
      turretRotation: correctedAngle, // Set inverted and adjusted turret rotation angle
      isFiring: true, // Fire when aiming
    });
  };

  const handleRightEnd = (_e: React.TouchEvent) => {
    setRightActive(false);

    if (rightStickRef.current) {
      rightStickRef.current.style.transform = `translate(0px, 0px)`;
      // setRightPosition({ x: 0, y: 0 }); // Commented out as unused

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
      {/* Left Joystick for Movement */}
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

      {/* Right Joystick - Turret */}
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

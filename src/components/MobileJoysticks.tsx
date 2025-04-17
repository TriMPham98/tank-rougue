import { useEffect, useRef, useState } from "react";
import { useGameState } from "../utils/gameState";
import "./MobileJoysticks.css";

// Store touch identifiers
let leftTouchId: number | null = null;
let rightTouchId: number | null = null;

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

    // Cleanup touch identifiers on unmount
    return () => {
      leftTouchId = null;
      rightTouchId = null;
    };
  }, []);

  // If not mobile, don't render joysticks
  if (!isMobile) return null;

  // Left joystick handlers (movement)
  const handleLeftStart = (e: React.TouchEvent) => {
    // Prevent default behavior like scrolling
    e.preventDefault();

    // Only handle the first touch on the left joystick
    if (leftTouchId !== null) return;

    const touch = e.changedTouches[0];
    if (touch) {
      leftTouchId = touch.identifier;
      setLeftActive(true);

      if (leftJoystickRef.current && leftStickRef.current) {
        // setLeftPosition({ x: 0, y: 0 }); // Commented out as unused
        leftStickRef.current.style.transform = `translate(0px, 0px)`;
      }
      // Start movement immediately if needed (optional, based on desired feel)
      // handleLeftMove(e);
    }
  };

  const handleLeftMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (
      !leftActive ||
      leftTouchId === null ||
      !leftJoystickRef.current ||
      !leftStickRef.current
    )
      return;

    // Find the correct touch
    let touch = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === leftTouchId) {
        touch = e.touches[i];
        break;
      }
    }

    // If the touch is not found (e.g., lifted unexpectedly), end the movement
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
    });
  };

  const handleLeftEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    let touchEnded = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === leftTouchId) {
        touchEnded = true;
        break;
      }
    }

    if (!touchEnded) return; // Only process if the tracked touch ended

    leftTouchId = null; // Clear the touch ID
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
  const handleRightStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (rightTouchId !== null) return;

    const touch = e.changedTouches[0];
    if (touch) {
      rightTouchId = touch.identifier;
      setRightActive(true);

      if (rightJoystickRef.current && rightStickRef.current) {
        rightStickRef.current.style.transform = `translate(0px, 0px)`;
      }
      // Start aiming/firing immediately if needed
      // handleRightMove(e);
    }
  };

  const handleRightMove = (e: React.TouchEvent) => {
    e.preventDefault();
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
      turretRotation: correctedAngle,
      isFiring: true,
    });
  };

  const handleRightEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    let touchEnded = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === rightTouchId) {
        touchEnded = true;
        break;
      }
    }

    if (!touchEnded) return;

    rightTouchId = null; // Clear the touch ID
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

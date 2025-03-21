import { useState, useEffect } from "react";
import { debug } from "../utils/debug";

interface KeyboardControls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  turretLeft: boolean;
  turretRight: boolean;
  shoot: boolean;
}

export const useKeyboardControls = (): KeyboardControls => {
  const [keys, setKeys] = useState<KeyboardControls>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    turretLeft: false,
    turretRight: false,
    shoot: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      debug.log(
        "Key pressed:",
        e.key,
        e.type,
        "Active element:",
        document.activeElement?.tagName || "none"
      );

      switch (e.key.toLowerCase()) {
        case "w":
          setKeys((keys) => ({ ...keys, forward: true }));
          break;
        case "s":
          setKeys((keys) => ({ ...keys, backward: true }));
          break;
        case "a":
          setKeys((keys) => ({ ...keys, left: true }));
          break;
        case "d":
          setKeys((keys) => ({ ...keys, right: true }));
          break;
        case "j":
          setKeys((keys) => ({ ...keys, turretLeft: true }));
          break;
        case "k":
          setKeys((keys) => ({ ...keys, turretRight: true }));
          break;
        case " ":
          setKeys((keys) => ({ ...keys, shoot: true }));
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      debug.log(
        "Key released:",
        e.key,
        e.type,
        "Active element:",
        document.activeElement?.tagName || "none"
      );

      switch (e.key.toLowerCase()) {
        case "w":
          setKeys((keys) => ({ ...keys, forward: false }));
          break;
        case "s":
          setKeys((keys) => ({ ...keys, backward: false }));
          break;
        case "a":
          setKeys((keys) => ({ ...keys, left: false }));
          break;
        case "d":
          setKeys((keys) => ({ ...keys, right: false }));
          break;
        case "j":
          setKeys((keys) => ({ ...keys, turretLeft: false }));
          break;
        case "k":
          setKeys((keys) => ({ ...keys, turretRight: false }));
          break;
        case " ":
          setKeys((keys) => ({ ...keys, shoot: false }));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
    };
  }, []);

  return keys;
};

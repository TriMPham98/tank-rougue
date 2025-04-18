import { useEffect, useState } from "react";
import { useSound } from "../utils/sound";

const AudioUnlock = () => {
  const [unlocked, setUnlocked] = useState(false);
  const sound = useSound();

  useEffect(() => {
    const handleUserInteraction = () => {
      if (unlocked) return;

      // Try to play and immediately stop a sound to unlock audio on mobile
      try {
        // Play a silent sound
        sound.setVolume("playerCannon", 0.01);
        sound.play("playerCannon");

        // Mark as unlocked
        setUnlocked(true);

        // Remove event listeners
        document.removeEventListener("touchstart", handleUserInteraction);
        document.removeEventListener("click", handleUserInteraction);
        document.removeEventListener("keydown", handleUserInteraction);
      } catch (error) {
        console.warn("Failed to unlock audio:", error);
      }
    };

    // Add event listeners for user interaction
    document.addEventListener("touchstart", handleUserInteraction, {
      once: true,
    });
    document.addEventListener("click", handleUserInteraction, { once: true });
    document.addEventListener("keydown", handleUserInteraction, { once: true });

    return () => {
      // Clean up event listeners
      document.removeEventListener("touchstart", handleUserInteraction);
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
    };
  }, [unlocked, sound]);

  // This component doesn't render anything visible
  return null;
};

export default AudioUnlock;

// Sound management utility for the game
import { useRef } from "react";

// Class to handle sound effects
class SoundManager {
  private static instance: SoundManager;
  private sounds: Map<string, HTMLAudioElement>;
  private lastPlayTime: Map<string, number>;
  private audioUnlocked: boolean = false;

  private constructor() {
    this.sounds = new Map();
    this.lastPlayTime = new Map();
    this.loadSounds();
    this.setupAudioUnlockForMobile();
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private setupAudioUnlockForMobile(): void {
    // Function to unlock audio on mobile
    const unlockAudio = () => {
      if (this.audioUnlocked) return;

      // Create and play a silent sound to unlock audio
      const silentSound = new Audio();
      silentSound
        .play()
        .then(() => {
          this.audioUnlocked = true;
          console.log("Audio unlocked successfully");
        })
        .catch((error) => {
          console.warn("Could not unlock audio automatically:", error);
        });

      // Also try to unlock all registered sounds
      this.sounds.forEach((sound) => {
        sound.load();
        sound
          .play()
          .then(() => {
            sound.pause();
            sound.currentTime = 0;
          })
          .catch(() => {
            // Ignore errors, this is just an attempt
          });
      });
    };

    // Listen for various user interaction events to unlock audio
    const unlockEvents = [
      "touchstart",
      "touchend",
      "mousedown",
      "keydown",
      "click",
    ];
    const unlockHandler = () => {
      unlockAudio();
      // Remove event listeners after unlocking
      unlockEvents.forEach((event) => {
        document.removeEventListener(event, unlockHandler);
      });
    };

    // Add event listeners
    unlockEvents.forEach((event) => {
      document.addEventListener(event, unlockHandler);
    });
  }

  private loadSounds(): void {
    // Register sounds with their paths - correctly referencing files in the public folder
    this.registerSound("playerCannon", "./assets/sounds/playerCannon.mp3");
    this.registerSound("shotgun", "./assets/sounds/shotgunBlast.mp3");
    this.registerSound("sniper", "./assets/sounds/sniperShot.mp3");
    this.registerSound("rocket", "./assets/sounds/rocketLauncher.mp3");
    this.registerSound("laser", "./assets/sounds/laserBurst.mp3");
    this.registerSound("npcImpact", "./assets/sounds/npcImpact.mp3");
    this.registerSound("levelUp", "./assets/sounds/levelUpSnare.mp3");
    this.registerSound("healthPickUp", "./assets/sounds/healthPickUp.mp3");
    this.registerSound("zoneWarning", "./assets/sounds/zoneWarning.mp3");
    this.registerSound("airRaidSiren", "./assets/sounds/airRaidSiren.mp3");
    // Add more sounds here as needed
  }

  private registerSound(id: string, path: string): void {
    const audio = new Audio(path);
    audio.preload = "auto";
    this.sounds.set(id, audio);
    this.lastPlayTime.set(id, 0);
  }

  public play(id: string, minDelay = 0): void {
    const sound = this.sounds.get(id);
    const now = Date.now();
    const lastPlay = this.lastPlayTime.get(id) || 0;

    if (!sound) {
      console.warn(`Sound with id ${id} not found`);
      return;
    }

    // Check if enough time has passed since last play
    if (now - lastPlay < minDelay) {
      return;
    }

    // Reset if already playing
    sound.currentTime = 0;
    sound.play().catch((error) => {
      console.warn(`Error playing sound ${id}:`, error);
    });

    this.lastPlayTime.set(id, now);
  }

  public stop(id: string): void {
    const sound = this.sounds.get(id);
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  }

  public setVolume(id: string, volume: number): void {
    const sound = this.sounds.get(id);
    if (sound) {
      sound.volume = Math.max(0, Math.min(1, volume));
    }
  }

  public playLoop(id: string, volume = 1): void {
    const sound = this.sounds.get(id);
    if (!sound) {
      console.warn(`Sound with id ${id} not found`);
      return;
    }

    sound.volume = Math.max(0, Math.min(1, volume));
    sound.loop = true;
    sound.play().catch((error) => {
      console.warn(`Error playing sound ${id}:`, error);
    });
  }

  public stopLoop(id: string): void {
    const sound = this.sounds.get(id);
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
      sound.loop = false;
    }
  }
}

// Hook for components to access the sound manager
export const useSound = () => {
  const soundManager = useRef(SoundManager.getInstance());

  return {
    play: (id: string, minDelay = 0) => soundManager.current.play(id, minDelay),
    stop: (id: string) => soundManager.current.stop(id),
    setVolume: (id: string, volume: number) =>
      soundManager.current.setVolume(id, volume),
    playLoop: (id: string, volume = 1) =>
      soundManager.current.playLoop(id, volume),
    stopLoop: (id: string) => soundManager.current.stopLoop(id),
    resetSoundTimer: (id: string) => {
      const lastPlayTimeMap = (soundManager.current as any).lastPlayTime;
      if (lastPlayTimeMap) {
        lastPlayTimeMap.set(id, 0);
      }
    },
  };
};

// Reset sound manager's last play time for a specific sound
export const resetSoundTimer = (id: string): void => {
  const soundManager = SoundManager.getInstance();
  const lastPlayTimeMap = (soundManager as any).lastPlayTime;
  if (lastPlayTimeMap) {
    lastPlayTimeMap.set(id, 0);
  }
};

export default SoundManager.getInstance();

import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameState } from "../utils/gameState";
import * as THREE from "three";
import { useSound } from "../utils/sound";

// Interface for individual bombs
interface Bomb {
  id: string;
  position: [number, number, number];
  timeLeft: number; // Time until explosion, becomes negative to track explosion fade
  hasExploded: boolean;
}

// Store persistent siren state outside component to prevent unmount issues
const globalSirenState = {
  isSirenPlaying: false, // Is the sound currently playing?
  sirenStartTime: 0,
  sirenEndTime: 0,
  sirenDuration: 14000, // 14 seconds
  shouldStartBombing: false, // Should bombs be dropping?
  sirenLevel: 0, // Which level (if any) triggered the current red zone sequence? 0 means none.
  isRedZoneWarning: false, // Track warning UI state globally
  // Store properties needed to resume visuals if remounted during bombing
  activeRadius: 0,
  activeCenter: [0, 0] as [number, number],
};

const RedZone = () => {
  // Access game state
  const {
    isRedZoneActive, // Visual indicator active
    isRedZoneWarning, // Warning UI active (can be true during siren before visuals)
    redZoneRadius,
    redZoneCenter,
    playerTankPosition,
    enemies,
    takeDamage,
    damageEnemy,
    isPaused,
    isGameOver,
    level,
  } = useGameState();

  // Sound effects
  const { play, playLoop, stopLoop, resetSoundTimer } = useSound();

  // Refs and state
  const cylinderRef = useRef<THREE.Mesh>(null);
  const topRingRef = useRef<THREE.Mesh>(null);
  const bombMeshRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const [bombs, setBombs] = useState<Bomb[]>([]);
  const wasPaused = useRef(false);
  const hasSyncedWarningState = useRef(false); // To sync zustand state on mount
  const initializedLevelCheck = useRef(false); // Prevent effect re-run for same level instance

  // Constants for red zone
  const EXPLOSION_RADIUS = 3;
  const BOMB_DAMAGE = 25;
  const BOMB_INTERVAL = 0.25;
  const BOMB_FALL_DURATION = 2; // Time it takes for bomb to fall
  const MAX_ACTIVE_BOMBS = 30;
  const RED_ZONE_BOMBING_DURATION = 10000; // How long bombing lasts
  const EXPLOSION_FADE_DURATION = 0.5; // How long explosion visuals last

  // Timer for spawning bombs
  const lastBombTime = useRef(0);

  // Flash effect for explosions
  const [flashIntensity, setFlashIntensity] = useState(0);

  // Synchronize zustand state with global state on initial mount if needed
  useEffect(() => {
    if (!hasSyncedWarningState.current) {
      hasSyncedWarningState.current = true;
      // Infer the state type from the hook's return type
      let stateUpdates: Partial<ReturnType<typeof useGameState.getState>> = {};

      if (globalSirenState.isRedZoneWarning !== isRedZoneWarning) {
        console.log(
          "Syncing initial isRedZoneWarning state from global to zustand"
        );
        stateUpdates.isRedZoneWarning = globalSirenState.isRedZoneWarning;
      }

      // Check if we should be in the bombing phase visually
      if (
        globalSirenState.sirenLevel !== 0 && // A sequence is active
        globalSirenState.shouldStartBombing && // It's bombing time
        !isRedZoneActive // But visuals aren't showing
      ) {
        console.log(
          "Syncing initial isRedZoneActive state from global to zustand (bombing phase)"
        );
        stateUpdates.isRedZoneActive = true;
        stateUpdates.isRedZoneWarning = true; // Warning should also be active
        // Restore visual parameters from global state
        stateUpdates.redZoneRadius = globalSirenState.activeRadius;
        stateUpdates.redZoneCenter = globalSirenState.activeCenter;
      } else if (
        globalSirenState.sirenLevel !== 0 && // A sequence is active
        !globalSirenState.shouldStartBombing && // It's siren time
        isRedZoneActive // But visuals are showing (shouldn't be)
      ) {
        console.log(
          "Syncing: Turning off active visuals during siren phase on mount"
        );
        stateUpdates.isRedZoneActive = false;
        stateUpdates.isRedZoneWarning = true; // Keep warning on
      }

      if (Object.keys(stateUpdates).length > 0) {
        // Use setTimeout to avoid potential immediate state loop if zustand notifies synchronously
        setTimeout(() => useGameState.setState(stateUpdates), 0);
      }
    }
    // Only run on mount essentially, but depend on the zustand states to trigger initial check
  }, [isRedZoneWarning, isRedZoneActive]);

  // Resume siren sound if component remounts while siren should be playing
  useEffect(() => {
    console.log("Component mounted - checking siren state");
    if (
      globalSirenState.sirenLevel !== 0 && // A level initiated a sequence
      !globalSirenState.shouldStartBombing && // Bombing hasn't started yet (still in siren phase)
      Date.now() < globalSirenState.sirenEndTime && // Siren time hasn't expired
      !globalSirenState.isSirenPlaying // And it's not already playing (e.g., due to pause logic)
    ) {
      console.log(
        "Restarting siren sound that was interrupted by unmount/remount"
      );
      resetSoundTimer("airRaidSiren");
      playLoop("airRaidSiren", 1.5);
      globalSirenState.isSirenPlaying = true;

      // Ensure warning UI is on
      if (!globalSirenState.isRedZoneWarning) {
        globalSirenState.isRedZoneWarning = true;
        setTimeout(() => useGameState.setState({ isRedZoneWarning: true }), 0);
      }
      // Ensure visuals are off during siren phase
      if (useGameState.getState().isRedZoneActive) {
        setTimeout(() => useGameState.setState({ isRedZoneActive: false }), 0);
      }
    }

    // Note: No cleanup needed here to stop the siren, as it's managed globally by timeouts.
  }, [playLoop, resetSoundTimer]);

  // Core Red Zone Activation Logic based on Level
  useEffect(() => {
    // Prevent setup if game is paused/over or already initialized for this specific level instance
    if (isPaused || isGameOver || initializedLevelCheck.current) {
      return;
    }

    let config: { levelNum: number; radius: number } | null = null;

    // Define red zone parameters for specific levels
    switch (level) {
      case 15:
        config = { levelNum: 15, radius: 20 };
        break;
      case 25:
        config = { levelNum: 25, radius: 15 };
        break;
      case 35:
        config = { levelNum: 35, radius: 12 };
        break;
      case 45:
        config = { levelNum: 45, radius: 10 };
        break;
      default:
        break; // Not a red zone level
    }

    // If it's a designated red zone level and no other red zone sequence is currently active
    if (config && globalSirenState.sirenLevel === 0) {
      console.log(`Attempting red zone setup for level ${config.levelNum}`);
      initializedLevelCheck.current = true; // Mark as attempting setup for this level instance
      setupRedZone(config.levelNum, config.radius);
    } else if (config && globalSirenState.sirenLevel !== 0) {
      console.log(
        `Skipping red zone setup for level ${config.levelNum}: Another zone active (Level ${globalSirenState.sirenLevel})`
      );
    }

    // Cleanup function: Reset the initialization flag when the level changes or component unmounts
    // This allows the effect to run again if the player revisits the level (e.g., debugging)
    return () => {
      console.log(`Cleaning up level effect for level ${level}`);
      initializedLevelCheck.current = false;
    };
  }, [level, isPaused, isGameOver, playLoop, resetSoundTimer, stopLoop]); // Rerun when level or pause/gameover state changes

  // Function to initiate the Red Zone sequence (Siren -> Bombing -> Deactivation)
  const setupRedZone = (levelNum: number, radius: number) => {
    console.log(`Red Zone sequence triggered for Level ${levelNum}`);
    globalSirenState.sirenLevel = levelNum; // Lock this level as the active one

    // --- Siren Phase ---
    globalSirenState.shouldStartBombing = false; // Ensure bombing is off initially
    globalSirenState.isSirenPlaying = true; // Mark siren sound as playing
    globalSirenState.isRedZoneWarning = true; // Turn on warning UI
    globalSirenState.sirenStartTime = Date.now();
    globalSirenState.sirenEndTime =
      globalSirenState.sirenStartTime + globalSirenState.sirenDuration;

    // Clear any leftover bombs from a previous zone immediately
    setBombs([]);

    console.log(
      `Level ${levelNum}: Siren started at ${globalSirenState.sirenStartTime}, will end at ${globalSirenState.sirenEndTime}`
    );

    // Update Zustand state (async) - Warning ON, Visuals OFF
    setTimeout(
      () =>
        useGameState.setState({
          isRedZoneWarning: true,
          isRedZoneActive: false,
        }),
      0
    );

    // Play the siren sound
    resetSoundTimer("airRaidSiren");
    stopLoop("airRaidSiren"); // Stop any previous just in case
    playLoop("airRaidSiren", 1.5);

    // --- Transition to Bombing Phase ---
    const sirenTimeoutId = setTimeout(() => {
      // Check if this level is still the one controlling the red zone when the timer fires
      if (globalSirenState.sirenLevel !== levelNum) {
        console.warn(
          `Level ${levelNum}: Aborting bombing start as sirenLevel changed to ${globalSirenState.sirenLevel}.`
        );
        // Ensure siren sound is stopped if this timeout fires unexpectedly late
        if (globalSirenState.isSirenPlaying) {
          stopLoop("airRaidSiren");
          globalSirenState.isSirenPlaying = false;
        }
        return; // Don't proceed to bombing
      }

      // Check if game ended or paused during siren
      if (
        useGameState.getState().isGameOver ||
        useGameState.getState().isPaused
      ) {
        console.log(
          `Level ${levelNum}: Aborting bombing start due to game over/pause.`
        );
        // Clean up siren state if it was still marked as playing
        if (globalSirenState.isSirenPlaying) {
          stopLoop("airRaidSiren");
          globalSirenState.isSirenPlaying = false;
        }
        // Reset global state since the sequence is aborted
        globalSirenState.sirenLevel = 0;
        globalSirenState.isRedZoneWarning = false;
        globalSirenState.shouldStartBombing = false;
        // Also update zustand state
        setTimeout(
          () =>
            useGameState.setState({
              isRedZoneWarning: false,
              isRedZoneActive: false,
            }),
          0
        );
        return;
      }

      console.log(`Level ${levelNum}: Siren finished. Starting bombing phase.`);
      globalSirenState.isSirenPlaying = false; // Mark siren sound as stopped
      stopLoop("airRaidSiren"); // Explicitly stop sound

      // Calculate Red Zone position
      const { safeZoneCenter, safeZoneRadius } = useGameState.getState();
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * (safeZoneRadius * 0.7);
      const redZoneCenterX = safeZoneCenter[0] + Math.cos(angle) * distance;
      const redZoneCenterZ = safeZoneCenter[1] + Math.sin(angle) * distance;
      const newCenter: [number, number] = [redZoneCenterX, redZoneCenterZ];

      // Store active parameters globally for potential remount sync
      globalSirenState.activeRadius = radius;
      globalSirenState.activeCenter = newCenter;

      // Activate visuals and bombing logic
      globalSirenState.shouldStartBombing = true;
      useGameState.setState({
        isRedZoneActive: true, // Turn on visuals
        redZoneRadius: radius,
        redZoneCenter: newCenter,
        isRedZoneWarning: true, // Keep warning UI on
      });

      // --- Schedule Deactivation ---
      const deactivationTimeoutId = setTimeout(() => {
        console.log(
          `Attempting deactivation for level ${levelNum} bombing phase.`
        );
        // Check if this level is *still* the one controlling the red zone
        if (globalSirenState.sirenLevel === levelNum) {
          console.log(
            ` -> Deactivating zone and warning for Level ${levelNum}.`
          );
          useGameState.setState({
            isRedZoneActive: false,
            isRedZoneWarning: false,
          });
          globalSirenState.sirenLevel = 0; // *** CRUCIAL: Release the lock ***
          globalSirenState.shouldStartBombing = false;
          globalSirenState.isRedZoneWarning = false;
          globalSirenState.activeRadius = 0; // Clear stored params
          globalSirenState.activeCenter = [0, 0];
          setBombs([]); // Clear any remaining bomb visuals
        } else {
          console.log(
            ` -> Skipping deactivation for Level ${levelNum} timer: Global level is now ${globalSirenState.sirenLevel}.`
          );
        }
      }, RED_ZONE_BOMBING_DURATION); // Deactivate after bombing duration
    }, globalSirenState.sirenDuration); // Start bombing after siren duration
  };

  // Handle Pause/Resume state changes for sound
  useEffect(() => {
    if (isPaused) {
      // If siren sound was playing when paused, stop the sound playback temporarily
      if (globalSirenState.isSirenPlaying) {
        console.log("Game paused: Stopping siren sound temporarily.");
        stopLoop("airRaidSiren");
        // Keep globalSirenState.isSirenPlaying = true (meaning it *should* be playing)
      }
      wasPaused.current = true;
    } else {
      // Game resumed
      if (wasPaused.current) {
        console.log("Game resumed.");
        // Check if a siren *should* be playing (was marked as playing before pause and time hasn't expired)
        if (
          globalSirenState.isSirenPlaying &&
          Date.now() < globalSirenState.sirenEndTime
        ) {
          console.log("Resuming siren sound.");
          resetSoundTimer("airRaidSiren"); // Reset timer state in sound manager
          playLoop("airRaidSiren", 1.5); // Resume playing sound
        } else if (
          globalSirenState.isSirenPlaying && // It thought it was playing
          Date.now() >= globalSirenState.sirenEndTime // But time expired while paused
        ) {
          console.log(
            "Siren time finished while paused. Ensuring sound is stopped."
          );
          stopLoop("airRaidSiren"); // Ensure sound is stopped if needed
          globalSirenState.isSirenPlaying = false; // Correct the state: it's no longer supposed to be playing
        }
        wasPaused.current = false;
      }
    }
  }, [isPaused, playLoop, stopLoop, resetSoundTimer]);

  // Process red zone bombs and explosions (Bombing Phase Logic)
  useFrame((state, delta) => {
    // Only run bombing logic if the game is active, a red zone level sequence is running, and it's in the bombing phase
    if (
      isPaused ||
      isGameOver ||
      !isRedZoneActive || // Use zustand state for visual activity
      !globalSirenState.shouldStartBombing // Use global state for bombing logic flag
    ) {
      // If bombing should stop but there are still bombs visually, clear them
      if (!globalSirenState.shouldStartBombing && bombs.length > 0) {
        // Check if bombs are just explosion visuals fading out
        const nonExplodingBombs = bombs.filter((b) => !b.hasExploded);
        if (nonExplodingBombs.length > 0) {
          console.log("Clearing leftover bombs as bombing phase ended.");
          setBombs(
            bombs.filter(
              (b) => b.hasExploded && b.timeLeft > -EXPLOSION_FADE_DURATION
            )
          ); // Keep fading explosions
        } else if (bombs.every((b) => b.timeLeft <= -EXPLOSION_FADE_DURATION)) {
          // All explosions have faded, clear completely
          setBombs([]);
        }
      }
      return;
    }

    const currentTime = state.clock.getElapsedTime();

    // Slowly decay flash intensity
    if (flashIntensity > 0) {
      setFlashIntensity(Math.max(0, flashIntensity - delta * 2)); // Decay rate
    }

    // Check if we should spawn a new bomb
    if (
      currentTime - lastBombTime.current > BOMB_INTERVAL &&
      bombs.filter((b) => !b.hasExploded).length < MAX_ACTIVE_BOMBS
    ) {
      lastBombTime.current = currentTime;

      // Calculate random position within the red zone using current zustand state
      const currentRadius = useGameState.getState().redZoneRadius;
      const currentCenter = useGameState.getState().redZoneCenter;

      if (currentRadius > 0) {
        // Ensure radius is valid before spawning
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * currentRadius;
        const x = currentCenter[0] + Math.cos(angle) * distance;
        const z = currentCenter[1] + Math.sin(angle) * distance;

        // Add new bomb
        const newBomb: Bomb = {
          id: Math.random().toString(36).substring(2, 9),
          position: [x, 10, z], // Start high in the air
          timeLeft: BOMB_FALL_DURATION, // Time until impact
          hasExploded: false,
        };
        setBombs((prev) => [...prev, newBomb]);
      }
    }

    // Update existing bombs
    setBombs((prevBombs) => {
      const updatedBombs = prevBombs
        .map((bomb) => {
          if (bomb.hasExploded) {
            // Handle explosion fade-out
            const newTimeLeft = bomb.timeLeft - delta;
            if (newTimeLeft <= -EXPLOSION_FADE_DURATION) {
              return null; // Mark for removal
            }
            return { ...bomb, timeLeft: newTimeLeft };
          }

          // Handle falling bomb
          const newTimeLeft = bomb.timeLeft - delta;
          let newPosition = bomb.position;

          // Calculate fall progress (0 to 1)
          const fallProgress = Math.max(
            0,
            Math.min(1, 1 - newTimeLeft / BOMB_FALL_DURATION)
          );
          newPosition = [
            bomb.position[0],
            Math.max(0.5, 10 - fallProgress * 9.5), // Stop just above ground
            bomb.position[2],
          ];

          // Check if bomb should explode (hits ground)
          if (newTimeLeft <= 0) {
            // Play explosion sound
            play("npcImpact", 0); // TODO: Use a dedicated explosion sound?

            // Trigger flash effect
            setFlashIntensity((prev) => Math.min(1, prev + 0.3)); // Add intensity, capped at 1

            // Check for player damage
            const currentPlayerPos = useGameState.getState().playerTankPosition;
            if (currentPlayerPos) {
              const playerDistSq =
                Math.pow(currentPlayerPos[0] - newPosition[0], 2) + // Use final position
                Math.pow(currentPlayerPos[2] - newPosition[2], 2);
              if (playerDistSq <= EXPLOSION_RADIUS * EXPLOSION_RADIUS) {
                takeDamage(BOMB_DAMAGE);
              }
            }

            // Check for enemy damage
            const currentEnemies = useGameState.getState().enemies;
            currentEnemies.forEach((enemy) => {
              const enemyDistSq =
                Math.pow(enemy.position[0] - newPosition[0], 2) +
                Math.pow(enemy.position[2] - newPosition[2], 2);
              if (enemyDistSq <= EXPLOSION_RADIUS * EXPLOSION_RADIUS) {
                damageEnemy(enemy.id, BOMB_DAMAGE);
              }
            });

            // Mark bomb as exploded and reset timeLeft for fade duration
            return {
              ...bomb,
              hasExploded: true,
              timeLeft: 0,
              position: newPosition,
            };
          }

          // Update falling bomb state
          return {
            ...bomb,
            timeLeft: newTimeLeft,
            position: newPosition,
          };
        })
        .filter((bomb) => bomb !== null) as Bomb[]; // Filter out bombs marked for removal

      // Cleanup refs for bombs that no longer exist
      const currentBombIds = new Set(updatedBombs.map((b) => b.id));
      bombMeshRefs.current.forEach((_, id) => {
        if (!currentBombIds.has(id)) {
          bombMeshRefs.current.delete(id);
        }
      });

      return updatedBombs;
    });
  });

  // Render the Red Zone visuals and bombs
  return (
    <group visible={isRedZoneActive || (isRedZoneWarning && !isRedZoneActive)}>
      {/* Global flash effect for explosions */}
      {flashIntensity > 0 && (
        <ambientLight args={["#ff5500", flashIntensity * 2]} />
      )}

      {/* Red zone cylinder (only visible when bombing active) */}
      {isRedZoneActive && redZoneRadius > 0 && (
        <mesh
          ref={cylinderRef}
          position={[redZoneCenter[0], 0, redZoneCenter[1]]}
          visible={isRedZoneActive} // Explicitly control visibility
        >
          <cylinderGeometry
            args={[redZoneRadius, redZoneRadius, 40, 64, 1, true]}
          />
          <meshBasicMaterial
            color="#ff0000"
            transparent
            opacity={0.1} // Consistent opacity during active phase
            side={THREE.DoubleSide}
            depthWrite={false} // Prevent hiding things behind it
          />
        </mesh>
      )}

      {/* Red zone top ring (only visible when bombing active) */}
      {isRedZoneActive && redZoneRadius > 0 && (
        <mesh
          ref={topRingRef}
          position={[redZoneCenter[0], 20, redZoneCenter[1]]}
          rotation={[Math.PI / 2, 0, 0]}
          visible={isRedZoneActive}>
          <ringGeometry args={[redZoneRadius - 0.5, redZoneRadius, 64]} />
          <meshBasicMaterial
            color="#ff0000"
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Bombs (Falling or Exploding) */}
      {bombs.map((bomb) => (
        <group key={bomb.id} position={bomb.position}>
          {!bomb.hasExploded ? (
            // Falling bomb mesh
            <mesh
              ref={(mesh) => {
                if (mesh) bombMeshRefs.current.set(bomb.id, mesh);
                // Deletion handled in useFrame cleanup
              }}>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshStandardMaterial color="#111111" />
            </mesh>
          ) : (
            // Explosion mesh
            <mesh
              visible={bomb.timeLeft > -EXPLOSION_FADE_DURATION} // Only visible during fade
            >
              <sphereGeometry args={[EXPLOSION_RADIUS, 16, 16]} />
              <meshBasicMaterial
                color="#ff5500"
                transparent
                // Calculate opacity based on remaining fade time
                opacity={
                  Math.max(
                    0,
                    (EXPLOSION_FADE_DURATION + bomb.timeLeft) /
                      EXPLOSION_FADE_DURATION
                  ) * 0.6
                }
                depthWrite={false}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
};

export default RedZone;

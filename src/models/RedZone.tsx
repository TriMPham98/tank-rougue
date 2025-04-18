import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameState } from "../utils/gameState";
import * as THREE from "three";
import { useSound } from "../utils/sound";

// Interface for individual bombs
interface Bomb {
  id: string;
  position: [number, number, number];
  timeLeft: number;
  hasExploded: boolean;
}

// Store persistent siren state outside component to prevent unmount issues
const globalSirenState = {
  isSirenPlaying: false,
  sirenStartTime: 0,
  sirenEndTime: 0,
  sirenDuration: 14000, // 14 seconds
  shouldStartBombing: false,
  sirenLevel: 0, // Which level triggered the siren
  isRedZoneWarning: false, // Track warning state globally
};

const RedZone = () => {
  // Access game state
  const {
    isRedZoneActive,
    isRedZoneWarning,
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
  const isRedZoneActive15 = useRef(false);
  const isRedZoneActive25 = useRef(false);
  const isRedZoneActive35 = useRef(false);
  const isRedZoneActive45 = useRef(false);
  const wasPaused = useRef(false);
  const sirenPlayedAfterResume = useRef(false);
  const hasSyncedWarningState = useRef(false);

  // Constants for red zone
  const EXPLOSION_RADIUS = 3;
  const BOMB_DAMAGE = 25;
  const BOMB_INTERVAL = 0.25; // Decreased from 0.5 to 0.25 for more frequent bombs
  const BOMB_DURATION = 2; // Time until a bomb explodes
  const MAX_ACTIVE_BOMBS = 30; // Increased from 20 to 30

  // Timer for spawning bombs
  const lastBombTime = useRef(0);

  // Flash effect for explosions
  const [flashIntensity, setFlashIntensity] = useState(0);

  // Synchronize warning state with global state to avoid duplicate state updates
  useEffect(() => {
    if (!hasSyncedWarningState.current) {
      hasSyncedWarningState.current = true;
      if (globalSirenState.isRedZoneWarning !== isRedZoneWarning) {
        // Only update game state when the initial values don't match
        useGameState.setState({
          isRedZoneWarning: globalSirenState.isRedZoneWarning,
        });
      }
    }
  }, [isRedZoneWarning]);

  // Continue siren playback on component mount if it should be playing
  useEffect(() => {
    console.log("Component mounted - checking siren state");

    // If siren should be playing but isn't, restart it
    if (
      globalSirenState.isSirenPlaying &&
      Date.now() < globalSirenState.sirenEndTime
    ) {
      console.log("Restarting siren that was interrupted");
      resetSoundTimer("airRaidSiren");
      playLoop("airRaidSiren", 1.5);

      // Update global state instead of directly updating React state
      globalSirenState.isRedZoneWarning = true;
      // Only update UI state if needed and outside the current render cycle
      setTimeout(() => {
        if (!isRedZoneWarning) {
          useGameState.setState({ isRedZoneWarning: true });
        }
      }, 0);

      // Calculate remaining time
      const remainingTime = globalSirenState.sirenEndTime - Date.now();
      console.log(`Siren should continue for ${remainingTime}ms more`);

      // Set up timeout to stop siren and start bombing when the original duration is complete
      if (remainingTime > 0) {
        setTimeout(() => {
          console.log(
            `Siren timeout triggered after component remount (elapsed total: ${
              Date.now() - globalSirenState.sirenStartTime
            }ms)`
          );

          if (globalSirenState.isSirenPlaying) {
            console.log("Stopping siren after full duration");
            stopLoop("airRaidSiren");
            globalSirenState.isSirenPlaying = false;
          }

          console.log("Starting bombing after siren completion");
          globalSirenState.shouldStartBombing = true;
          globalSirenState.isRedZoneWarning = true;
        }, remainingTime);
      }
    }

    return () => {
      // Don't stop the siren on unmount anymore, let it continue playing
      console.log("Component unmounting - preserving siren state");
    };
  }, [isRedZoneWarning, playLoop, resetSoundTimer, stopLoop]);

  // Log siren state for debugging
  useEffect(() => {
    const interval = setInterval(() => {
      if (globalSirenState.isSirenPlaying) {
        const elapsedTime = Date.now() - globalSirenState.sirenStartTime;
        console.log(
          `Siren playing for ${elapsedTime}ms of ${
            globalSirenState.sirenDuration
          }ms (remaining: ${globalSirenState.sirenDuration - elapsedTime}ms)`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Track pause state changes
  useEffect(() => {
    // If game was paused and is now resumed
    if (wasPaused.current && !isPaused && isRedZoneActive) {
      if (!sirenPlayedAfterResume.current) {
        console.log("Game resumed - starting siren");
        // Play siren once after resume
        resetSoundTimer("airRaidSiren");
        stopLoop("airRaidSiren");

        // Start timer
        globalSirenState.sirenStartTime = Date.now();
        globalSirenState.sirenEndTime =
          globalSirenState.sirenStartTime + globalSirenState.sirenDuration;
        console.log(
          `Siren started at ${globalSirenState.sirenStartTime}, will end at ${globalSirenState.sirenEndTime} (duration: ${globalSirenState.sirenDuration}ms)`
        );

        playLoop("airRaidSiren", 1.5);
        globalSirenState.isSirenPlaying = true;
        sirenPlayedAfterResume.current = true;

        // Show the warning UI
        globalSirenState.isRedZoneWarning = true;

        // Update UI in next tick to avoid render loop
        setTimeout(() => {
          useGameState.setState({
            isRedZoneWarning: true,
          });
        }, 0);

        // Reset bombing flag
        globalSirenState.shouldStartBombing = false;

        // Set a timeout to start bombing after the siren plays
        setTimeout(() => {
          console.log(
            `Siren timeout triggered (actual elapsed: ${
              Date.now() - globalSirenState.sirenStartTime
            }ms)`
          );

          if (globalSirenState.isSirenPlaying) {
            console.log("Stopping siren after timeout");
            stopLoop("airRaidSiren");
            globalSirenState.isSirenPlaying = false;
          }

          console.log("Starting bombing after siren");
          globalSirenState.shouldStartBombing = true;
          globalSirenState.isRedZoneWarning = true;
        }, globalSirenState.sirenDuration);
      }
    }

    // Update wasPaused for next check
    wasPaused.current = isPaused;

    // Reset flags when red zone deactivates
    if (!isRedZoneActive) {
      sirenPlayedAfterResume.current = false;
      globalSirenState.shouldStartBombing = false;
    }
  }, [isPaused, isRedZoneActive, resetSoundTimer, stopLoop, playLoop]);

  // Check if we should be in a red zone level - using a ref to track initialization
  const initializedLevels = useRef(false);
  useEffect(() => {
    if (initializedLevels.current) {
      return;
    }
    initializedLevels.current = true;

    const setupRedZone = (
      levelNum: number,
      isActiveRef: React.MutableRefObject<boolean>,
      radius: number
    ) => {
      // If a siren is already playing, don't interrupt it or reset timers.
      // The original timeout will handle stopping the siren and starting bombing.
      if (globalSirenState.isSirenPlaying) {
        console.log(
          `Level ${levelNum} check: Siren already playing, skipping new siren start.`
        );
        // Ensure the correct red zone properties are still set if the level matches,
        // even if the siren part is skipped.
        if (level === levelNum && !isActiveRef.current) {
          console.log(
            `Level ${levelNum}: Setting up red zone visuals and future deactivation timer.`
          );
          isActiveRef.current = true; // Mark this level's red zone as conceptually active
          globalSirenState.sirenLevel = levelNum; // Track which level *initiated* the current sequence

          // Set the visual properties and warning state immediately
          const safeZoneCenterX = useGameState.getState().safeZoneCenter[0];
          const safeZoneCenterZ = useGameState.getState().safeZoneCenter[1];
          const safeZoneRadius = useGameState.getState().safeZoneRadius;
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * (safeZoneRadius * 0.7);
          const redZoneCenterX = safeZoneCenterX + Math.cos(angle) * distance;
          const redZoneCenterZ = safeZoneCenterZ + Math.sin(angle) * distance;

          useGameState.setState({
            isRedZoneActive: true, // Activate visuals immediately
            redZoneRadius: radius,
            redZoneCenter: [redZoneCenterX, redZoneCenterZ],
            isRedZoneWarning: true, // Keep warning active
          });

          // Set the deactivation timer, relative to *now*, but don't touch bombing state
          // Deactivate 10 seconds *after* the siren finishes (total duration + 10s)
          const sirenEndTime = globalSirenState.sirenEndTime;
          const now = Date.now();
          const deactivateDelay = Math.max(0, sirenEndTime - now) + 10000; // Delay from now

          console.log(
            `Level ${levelNum}: Scheduling deactivation in ${deactivateDelay}ms`
          );
          setTimeout(() => {
            console.log(
              `Deactivating red zone for level ${levelNum} (originally triggered) - checking level match.`
            );
            // Check if this *specific* level trigger should still deactivate
            // Avoid deactivating if another red zone level took over
            if (globalSirenState.sirenLevel === levelNum) {
              console.log(
                ` -> Level ${levelNum} MATCHES global ${globalSirenState.sirenLevel}. Deactivating zone and warning.`
              );
              useGameState.setState({
                isRedZoneActive: false,
                isRedZoneWarning: false, // Warning off only when zone deactivates
              });
              globalSirenState.sirenLevel = 0; // Clear the initiating level
              // Ensure bombing stops and global warning is off if this level was the controller
              globalSirenState.shouldStartBombing = false;
              globalSirenState.isRedZoneWarning = false;
            } else {
              console.log(
                ` -> Level ${levelNum} DOES NOT MATCH global ${globalSirenState.sirenLevel}. Skipping deactivation/warning off.`
              );
            }
            isActiveRef.current = false; // Allow this level trigger again later
            sirenPlayedAfterResume.current = false; // Reset resume flag if needed
          }, deactivateDelay);
        }
        return; // Exit the function, do not proceed with siren logic
      }

      // Proceed only if the level matches, ref isn't active, and this level didn't already start a siren
      if (
        level === levelNum &&
        !isActiveRef.current &&
        globalSirenState.sirenLevel !== levelNum // Check global level lock
      ) {
        console.log(`Level ${levelNum} red zone triggered`);
        isActiveRef.current = true;
        globalSirenState.sirenLevel = levelNum;

        // Reset sound timer first to ensure it plays
        resetSoundTimer("airRaidSiren");

        // Stop any existing playback
        stopLoop("airRaidSiren");

        // Reset bombing flag
        globalSirenState.shouldStartBombing = false;

        // Start timer
        globalSirenState.sirenStartTime = Date.now();
        globalSirenState.sirenEndTime =
          globalSirenState.sirenStartTime + globalSirenState.sirenDuration;
        console.log(
          `Level ${levelNum}: Siren started at ${globalSirenState.sirenStartTime}, will end at ${globalSirenState.sirenEndTime} (duration: ${globalSirenState.sirenDuration}ms)`
        );

        // Set warning state in global state
        globalSirenState.isRedZoneWarning = true;

        // Update UI state in next tick to avoid render loop
        setTimeout(() => {
          useGameState.setState({
            isRedZoneWarning: true,
          });
        }, 0);

        // Force play with increased volume
        setTimeout(() => {
          console.log(`Starting siren for level ${levelNum}`);
          playLoop("airRaidSiren", 1.5);
          globalSirenState.isSirenPlaying = true;
        }, 100);

        // Wait for siren duration before activating the red zone
        setTimeout(() => {
          console.log(
            `Level ${levelNum}: Siren timeout triggered (actual elapsed: ${
              Date.now() - globalSirenState.sirenStartTime
            }ms)`
          );

          // Select a random position within the safe zone
          const safeZoneCenterX = useGameState.getState().safeZoneCenter[0];
          const safeZoneCenterZ = useGameState.getState().safeZoneCenter[1];
          const safeZoneRadius = useGameState.getState().safeZoneRadius;

          // Random angle and distance (not at edge of safe zone)
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * (safeZoneRadius * 0.7); // Stay within 70% of safe zone radius
          const redZoneCenterX = safeZoneCenterX + Math.cos(angle) * distance;
          const redZoneCenterZ = safeZoneCenterZ + Math.sin(angle) * distance;

          // Update redZoneCenter and activate
          useGameState.setState({
            isRedZoneActive: true,
            redZoneRadius: radius,
            redZoneCenter: [redZoneCenterX, redZoneCenterZ],
            isRedZoneWarning: true,
          });

          // Stop siren and start bombing
          if (globalSirenState.isSirenPlaying) {
            console.log(`Stopping siren after level ${levelNum} timeout`);
            stopLoop("airRaidSiren");
            globalSirenState.isSirenPlaying = false;
          }

          console.log(`Starting bombing for level ${levelNum}`);
          globalSirenState.shouldStartBombing = true;

          // Set timer to deactivate red zone after 10 seconds *from bombing start*
          setTimeout(() => {
            console.log(
              `Deactivating red zone for level ${levelNum} - checking level match.`
            );
            // Check if this level is still the one controlling the red zone
            if (globalSirenState.sirenLevel === levelNum) {
              console.log(
                ` -> Level ${levelNum} MATCHES global ${globalSirenState.sirenLevel}. Deactivating zone and warning.`
              );
              useGameState.setState({
                isRedZoneActive: false,
                isRedZoneWarning: false,
              });
              globalSirenState.sirenLevel = 0; // Clear the level lock
              globalSirenState.shouldStartBombing = false; // Bombing stops
              globalSirenState.isRedZoneWarning = false; // Warning off
            } else {
              console.log(
                ` -> Level ${levelNum} DOES NOT MATCH global ${globalSirenState.sirenLevel}. Skipping deactivation/warning off.`
              );
            }
            isActiveRef.current = false;
            sirenPlayedAfterResume.current = false; // Reset resume flag
            // Don't reset globalSirenState.shouldStartBombing = false here if another level took over?
            // Let's reset bombing flag only if *this* level is deactivating.
          }, 10000); // 10 seconds *after* bombing starts
        }, globalSirenState.sirenDuration);
      }
    };

    // Setup red zones for different levels
    setupRedZone(15, isRedZoneActive15, 20);
    setupRedZone(25, isRedZoneActive25, 15);
    setupRedZone(35, isRedZoneActive35, 12);
    setupRedZone(45, isRedZoneActive45, 10);

    // Reset initialization flag when level changes
    return () => {
      initializedLevels.current = false;
    };
  }, [level, playLoop, resetSoundTimer, stopLoop]);

  // Add event listener to detect pause/play of game
  useEffect(() => {
    // Log the state of the siren and game
    console.log(
      `Game state changed - isPaused: ${isPaused}, isSirenPlaying: ${globalSirenState.isSirenPlaying}, isRedZoneActive: ${isRedZoneActive}`
    );

    // If game is paused, log that we're pausing siren
    if (isPaused && globalSirenState.isSirenPlaying) {
      console.log(
        "Game paused while siren was playing - siren will continue on resume"
      );
    }
  }, [isPaused, isRedZoneActive]);

  // Process red zone bombs and explosions
  useFrame((state, delta) => {
    if (
      isPaused ||
      isGameOver ||
      !isRedZoneActive ||
      !globalSirenState.shouldStartBombing
    )
      return;

    const currentTime = state.clock.getElapsedTime();

    // Slowly decay flash intensity
    if (flashIntensity > 0) {
      setFlashIntensity(Math.max(0, flashIntensity - delta * 2));
    }

    // Check if we should spawn a new bomb
    if (
      currentTime - lastBombTime.current > BOMB_INTERVAL &&
      bombs.filter((b) => !b.hasExploded).length < MAX_ACTIVE_BOMBS
    ) {
      lastBombTime.current = currentTime;

      // Calculate random position within the red zone
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * redZoneRadius;
      const x = redZoneCenter[0] + Math.cos(angle) * distance;
      const z = redZoneCenter[1] + Math.sin(angle) * distance;

      // Add new bomb
      const newBomb: Bomb = {
        id: Math.random().toString(36).substring(2, 9),
        position: [x, 10, z], // Start high in the air
        timeLeft: BOMB_DURATION,
        hasExploded: false,
      };

      setBombs((prev) => [...prev, newBomb]);
    }

    // Update existing bombs
    setBombs((prev) =>
      prev.map((bomb) => {
        if (bomb.hasExploded) return bomb;

        const newTimeLeft = bomb.timeLeft - delta;

        // Check if bomb should explode
        if (newTimeLeft <= 0) {
          // Play explosion sound
          play("npcImpact", 0);

          // Create a flash effect
          setFlashIntensity((prev) => Math.min(1, prev + 0.3));

          // Check for player in explosion radius
          if (playerTankPosition) {
            const playerDist = Math.sqrt(
              Math.pow(playerTankPosition[0] - bomb.position[0], 2) +
                Math.pow(playerTankPosition[2] - bomb.position[2], 2)
            );

            if (playerDist <= EXPLOSION_RADIUS) {
              takeDamage(BOMB_DAMAGE);
            }
          }

          // Check for enemies in explosion radius
          for (const enemy of enemies) {
            const enemyDist = Math.sqrt(
              Math.pow(enemy.position[0] - bomb.position[0], 2) +
                Math.pow(enemy.position[2] - bomb.position[2], 2)
            );

            if (enemyDist <= EXPLOSION_RADIUS) {
              damageEnemy(enemy.id, BOMB_DAMAGE);
            }
          }

          return {
            ...bomb,
            hasExploded: true,
          };
        }

        return {
          ...bomb,
          timeLeft: newTimeLeft,
          // Move bomb downward as it falls
          position: [
            bomb.position[0],
            Math.max(0.5, 10 - (1 - newTimeLeft / BOMB_DURATION) * 10),
            bomb.position[2],
          ],
        };
      })
    );

    // Remove old exploded bombs
    if (bombs.some((b) => b.hasExploded)) {
      setTimeout(() => {
        setBombs((prev) => prev.filter((b) => !b.hasExploded));
      }, 1000); // Keep explosion for 1 second
    }
  });

  return (
    <group visible={isRedZoneActive}>
      {/* Global flash effect for explosions */}
      {flashIntensity > 0 && (
        <ambientLight color="#ff5500" intensity={flashIntensity} />
      )}

      {/* Red zone cylinder */}
      <mesh
        ref={cylinderRef}
        position={[redZoneCenter[0], 0, redZoneCenter[1]]}
        rotation={[0, 0, 0]}>
        <cylinderGeometry
          args={[redZoneRadius, redZoneRadius, 40, 64, 1, true]}
        />
        <meshBasicMaterial
          color="#ff0000"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Red zone top ring */}
      <mesh
        ref={topRingRef}
        position={[redZoneCenter[0], 20, redZoneCenter[1]]}
        rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[redZoneRadius - 0.5, redZoneRadius, 64]} />
        <meshBasicMaterial
          color="#ff0000"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Bombs */}
      {bombs.map((bomb) => (
        <group
          key={bomb.id}
          position={[bomb.position[0], bomb.position[1], bomb.position[2]]}>
          {!bomb.hasExploded ? (
            <mesh
              ref={(mesh) => {
                if (mesh) {
                  bombMeshRefs.current.set(bomb.id, mesh);
                } else {
                  bombMeshRefs.current.delete(bomb.id);
                }
              }}>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshStandardMaterial color="#111111" />
            </mesh>
          ) : (
            <mesh>
              <sphereGeometry args={[EXPLOSION_RADIUS, 16, 16]} />
              <meshBasicMaterial color="#ff5500" transparent opacity={0.6} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
};

export default RedZone;

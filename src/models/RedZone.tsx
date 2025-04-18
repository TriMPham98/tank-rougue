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

const RedZone = () => {
  // Access game state
  const {
    isRedZoneActive,
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
  const { play, playLoop, stopLoop } = useSound();

  // Refs and state
  const cylinderRef = useRef<THREE.Mesh>(null);
  const topRingRef = useRef<THREE.Mesh>(null);
  const bombMeshRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const [bombs, setBombs] = useState<Bomb[]>([]);
  const isSirenPlaying = useRef(false);
  const isRedZoneActive25 = useRef(false);
  const isRedZoneActive35 = useRef(false);
  const isRedZoneActive45 = useRef(false);

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

  // Check if we should be in a red zone level
  useEffect(() => {
    // Update red zone active state based on level
    if (level === 25 && !isRedZoneActive25.current) {
      isRedZoneActive25.current = true;

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
        redZoneCenter: [redZoneCenterX, redZoneCenterZ],
      });

      // Play air raid siren
      playLoop("airRaidSiren", 0.8);
      isSirenPlaying.current = true;

      // Set timer to deactivate red zone after 10 seconds
      setTimeout(() => {
        useGameState.setState({ isRedZoneActive: false });
        isRedZoneActive25.current = false;
        if (isSirenPlaying.current) {
          stopLoop("airRaidSiren");
          isSirenPlaying.current = false;
        }
      }, 10000);
    }

    if (level === 35 && !isRedZoneActive35.current) {
      isRedZoneActive35.current = true;

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
        redZoneCenter: [redZoneCenterX, redZoneCenterZ],
      });

      // Play air raid siren
      playLoop("airRaidSiren", 0.8);
      isSirenPlaying.current = true;

      // Set timer to deactivate red zone after 10 seconds
      setTimeout(() => {
        useGameState.setState({ isRedZoneActive: false });
        isRedZoneActive35.current = false;
        if (isSirenPlaying.current) {
          stopLoop("airRaidSiren");
          isSirenPlaying.current = false;
        }
      }, 10000);
    }

    if (level === 45 && !isRedZoneActive45.current) {
      isRedZoneActive45.current = true;

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
        redZoneCenter: [redZoneCenterX, redZoneCenterZ],
      });

      // Play air raid siren
      playLoop("airRaidSiren", 0.8);
      isSirenPlaying.current = true;

      // Set timer to deactivate red zone after 10 seconds
      setTimeout(() => {
        useGameState.setState({ isRedZoneActive: false });
        isRedZoneActive45.current = false;
        if (isSirenPlaying.current) {
          stopLoop("airRaidSiren");
          isSirenPlaying.current = false;
        }
      }, 10000);
    }
  }, [level, playLoop, stopLoop]);

  // Cleanup sound when component unmounts
  useEffect(() => {
    return () => {
      if (isSirenPlaying.current) {
        stopLoop("airRaidSiren");
        isSirenPlaying.current = false;
      }
    };
  }, [stopLoop]);

  // Process red zone bombs and explosions
  useFrame((state, delta) => {
    if (isPaused || isGameOver || !isRedZoneActive) return;

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

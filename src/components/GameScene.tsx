import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Sky, OrbitControls, Environment, Stats } from "@react-three/drei";
import Tank from "../models/Tank";
import EnemyTank from "../models/EnemyTank";
import PowerUpItem from "../models/PowerUpItem";
import Ground from "../models/Ground";
import TerrainObstacle from "../models/TerrainObstacle";
import {
  Suspense,
  useRef,
  useEffect,
  memo,
  Component,
  ErrorInfo,
  ReactNode,
  useState,
} from "react";
import { useGameState } from "../utils/gameState";
import { Vector3, SpotLight as ThreeSpotLight } from "three";
import "./GameScene.css";
import { useRespawnManager } from "../utils/respawnManager";
import { debug } from "../utils/debug";

// Error boundary component to catch and display errors
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    debug.error("Canvas error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            color: "red",
            padding: "20px",
            backgroundColor: "black",
            border: "1px solid red",
            borderRadius: "4px",
          }}>
          <h2>Something went wrong in the 3D scene</h2>
          <p>{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Component to handle the respawning of enemies
const EnemyRespawnManager = () => {
  // Use the respawn manager hook
  useRespawnManager();
  return null;
};

// Component to follow the player's tank with the camera
const FollowCamera = memo(() => {
  const { camera } = useThree();

  // Get a direct reference to the store's getState function
  const getState = useRef(useGameState.getState).current;

  // Create refs to store values without causing re-renders
  const offsetRef = useRef(new Vector3(0, 8, -12));
  const targetPositionRef = useRef(new Vector3());

  useFrame(() => {
    // Access state directly from the store
    const playerPosition = getState().playerTankPosition;
    const cameraRange = getState().playerCameraRange;

    if (playerPosition) {
      // Update offset based on camera rotation and camera range
      const distanceBehind = -cameraRange;
      offsetRef.current.x = -Math.sin(camera.rotation.y) * distanceBehind;
      offsetRef.current.y = 8 + (cameraRange - 12) * 0.3; // Adjust height slightly based on range
      offsetRef.current.z = -Math.cos(camera.rotation.y) * distanceBehind;

      // Calculate target position
      targetPositionRef.current.set(
        playerPosition[0] + offsetRef.current.x,
        playerPosition[1] + offsetRef.current.y,
        playerPosition[2] + offsetRef.current.z
      );

      // Smoothly interpolate camera position
      camera.position.lerp(targetPositionRef.current, 0.05);

      // Make camera look at the player
      camera.lookAt(playerPosition[0], playerPosition[1], playerPosition[2]);
    }
  });

  return null;
});

// Separate component to handle spotlight updates inside the Canvas
const SpotlightUpdater = () => {
  // Get direct access to the store state
  const getState = useRef(useGameState.getState).current;
  const spotLightRef = useRef<ThreeSpotLight>(null);

  // Update spotlight position on every frame
  useFrame(() => {
    const playerTankPosition = getState().playerTankPosition;

    if (spotLightRef.current && playerTankPosition) {
      spotLightRef.current.position.set(
        playerTankPosition[0],
        playerTankPosition[1] + 10,
        playerTankPosition[2]
      );
    }
  });

  return (
    <spotLight
      ref={spotLightRef}
      position={[0, 10, 0]} // Default position, will be updated in useFrame
      angle={0.4}
      penumbra={0.5}
      intensity={1.0}
      castShadow
      shadow-bias={-0.001}
    />
  );
};

// Scene Content as a separate component to load within Canvas
interface SceneContentProps {
  playerTank: React.ReactNode;
}

const SceneContent = memo(({ playerTank }: SceneContentProps) => {
  // Get direct access to the store state
  const getState = useRef(useGameState.getState).current;

  // Use state to trigger re-renders when enemies or terrain obstacles change
  const [enemies, setEnemies] = useState(getState().enemies);
  const [terrainObstacles, setTerrainObstacles] = useState(
    getState().terrainObstacles
  );

  // Subscribe to changes in the enemy list and terrain obstacles
  useEffect(() => {
    const unsubscribe = useGameState.subscribe((state) => {
      if (state.enemies !== enemies) {
        setEnemies(state.enemies);
      }
      if (state.terrainObstacles !== terrainObstacles) {
        setTerrainObstacles(state.terrainObstacles);
      }
    });

    return unsubscribe;
  }, [enemies, terrainObstacles]);

  return (
    <Suspense fallback={null}>
      {/* Enemy respawn manager */}
      <EnemyRespawnManager />

      {/* Ambient light for overall scene brightness */}
      <ambientLight intensity={0.5} />

      {/* Main directional light (sun) */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* Player spotlight with its own updater component */}
      <SpotlightUpdater />

      {/* Player tank - use the memoized instance */}
      {playerTank}

      {/* Enemy tanks - Using component instances ensures they handle their own updates */}
      {enemies.map((enemy) => (
        <EnemyTank key={`enemy-${enemy.id}`} enemy={enemy} />
      ))}

      {/* Power-ups */}
      {getState().powerUps.map((powerUp) => (
        <PowerUpItem key={`powerup-${powerUp.id}`} powerUp={powerUp} />
      ))}

      {/* Terrain obstacles */}
      {terrainObstacles.map((obstacle) => (
        <TerrainObstacle
          key={`obstacle-${obstacle.id}`}
          position={obstacle.position}
          type={obstacle.type}
          size={obstacle.size}
        />
      ))}

      <Ground />
      <Sky sunPosition={[100, 100, 20]} />

      {/* Camera that follows player */}
      <FollowCamera />

      {/* Dev controls - disabled to prevent keyboard input interference */}
      <OrbitControls enabled={false} />

      <Environment preset="sunset" />
    </Suspense>
  );
});

// Move terrain obstacle generation to a separate component
const TerrainObstacleGenerator = () => {
  const addTerrainObstacle = useGameState((state) => state.addTerrainObstacle);
  const [isTerrainReady, setIsTerrainReady] = useState(false);

  useEffect(() => {
    debug.log("TerrainObstacleGenerator: Starting obstacle generation");
    try {
      // Generate some random terrain obstacles
      const obstacleCount = 20; // Increased count for better coverage
      const spawnClearanceRadius = 10; // Keep spawn area clear

      for (let i = 0; i < obstacleCount; i++) {
        let x = (Math.random() - 0.5) * 80;
        let z = (Math.random() - 0.5) * 80;

        // Ensure obstacles are not too close to spawn point (0, 0)
        const distanceFromSpawn = Math.sqrt(x * x + z * z);
        if (distanceFromSpawn < spawnClearanceRadius) {
          // If too close to spawn, move it outside the clearance radius
          const angle = Math.atan2(z, x);
          x = Math.cos(angle) * spawnClearanceRadius;
          z = Math.sin(angle) * spawnClearanceRadius;
          debug.log("Adjusted obstacle position away from spawn area", {
            x,
            z,
          });
        }

        const obstacleType: "tree" | "rock" =
          Math.random() < 0.6 ? "tree" : "rock";

        // Different size ranges for trees and rocks
        const size =
          obstacleType === "tree"
            ? 1.5 + Math.random() * 1.5 // Trees are generally taller
            : 1 + Math.random() * 1.5; // Rocks are more varied in size

        // Check if this position is too close to existing obstacles
        const existingObstacles = useGameState.getState().terrainObstacles;
        let isTooClose = false;
        const minObstacleSpacing = 3; // Minimum spacing between obstacles

        for (const existing of existingObstacles) {
          const dx = existing.position[0] - x;
          const dz = existing.position[2] - z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          if (distance < (existing.size + size) * 0.5 + minObstacleSpacing) {
            isTooClose = true;
            break;
          }
        }

        if (!isTooClose) {
          const obstacle = {
            position: [x, 0, z] as [number, number, number],
            type: obstacleType,
            size,
          };
          debug.log(
            `TerrainObstacleGenerator: Adding obstacle ${
              i + 1
            }/${obstacleCount}`,
            obstacle
          );
          addTerrainObstacle(obstacle);
        } else {
          // Try again for this obstacle
          i--;
          continue;
        }
      }
      setIsTerrainReady(true);
      debug.log(
        "TerrainObstacleGenerator: All obstacles generated successfully"
      );
    } catch (error) {
      debug.error(
        "TerrainObstacleGenerator: Failed to generate obstacles:",
        error
      );
    }
  }, [addTerrainObstacle]);

  if (!isTerrainReady) {
    debug.log("TerrainObstacleGenerator: Not ready, showing loading indicator");
    return (
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>
    );
  }

  debug.log("TerrainObstacleGenerator: Ready");
  return null;
};

// Main game scene component
const GameScene = () => {
  // Canvas reference for handling focus
  const canvasRef = useRef<HTMLDivElement>(null);

  // Effect for focusing the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set tabIndex to make canvas focusable
      canvas.tabIndex = 0;

      // Add direct keyboard event listener for debugging
      const handleKeyDown = (e: KeyboardEvent) => {
        debug.log("Canvas keydown event:", e.key);
      };

      canvas.addEventListener("keydown", handleKeyDown);

      // Focus canvas initially
      canvas.focus();

      return () => {
        canvas.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, []);

  return (
    <ErrorBoundary>
      <div
        ref={canvasRef}
        className="canvas-container"
        style={{ width: "100vw", height: "100vh" }}>
        <Canvas
          shadows
          camera={{ position: [0, 8, -12], fov: 60 }}
          style={{ width: "100vw", height: "100vh" }}
          onCreated={() => debug.log("Canvas created")}>
          <color attach="background" args={["#87CEEB"]} />
          <fog attach="fog" args={["#87CEEB", 30, 100]} />
          <Stats />
          <TerrainObstacleGenerator />
          <SceneContent playerTank={<Tank position={[0, 0.5, 0]} />} />
        </Canvas>
      </div>
    </ErrorBoundary>
  );
};

export default GameScene;

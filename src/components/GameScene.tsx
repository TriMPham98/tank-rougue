import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Sky, OrbitControls, Stats } from "@react-three/drei";
import Tank from "../models/Tank";
import EnemyTank from "../models/EnemyTank";
import PowerUpItem from "../models/PowerUpItem";
import Ground from "../models/Ground";
import TerrainObstacle from "../models/TerrainObstacle";
import SafeZone from "../models/SafeZone";
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

// Custom hook to calculate light intensity based on game level
const useLightIntensity = () => {
  const level = useGameState((state) => state.level);

  // Calculate ambient light intensity (starts at 0.5, decreases to 0.05 by level 40)
  const ambientIntensity = Math.max(0.05, 0.5 - (level / 40) * 0.45);

  // Calculate ambient light color (gradually shifts to blue-ish night tint)
  const nightFactor = Math.min(1, level / 40);
  const ambientR = 1 - nightFactor * 0.9; // 1.0 -> 0.1
  const ambientG = 1 - nightFactor * 0.7; // 1.0 -> 0.3
  const ambientB = 1 - nightFactor * 0.3; // 1.0 -> 0.7

  // Calculate directional light intensity (starts at 1.5, decreases to 0.3 by level 40)
  const directionalIntensity = Math.max(0.3, 1.5 - (level / 40) * 1.2);

  // Calculate spotlight intensity (starts at 1.0, increases to 1.8 by level 40)
  const spotlightIntensity = Math.min(1.8, 1.0 + (level / 40) * 0.8);

  // Calculate spotlight angle (starts at 0.4, increases to 0.7 by level 40)
  const spotlightAngle = Math.min(0.7, 0.4 + (level / 40) * 0.3);

  // Calculate spotlight penumbra (starts at 0.5, increases to 0.8 by level 40)
  const spotlightPenumbra = Math.min(0.8, 0.5 + (level / 40) * 0.3);

  // Calculate spotlight distance (how far it can reach)
  const spotlightDistance = Math.min(30, 15 + (level / 40) * 15);

  // Calculate background sky color (blue to dark blue/black)
  const skyFactor = Math.max(0, 1 - level / 40);
  const r = Math.floor(135 * skyFactor); // 87 in hex
  const g = Math.floor(206 * skyFactor); // CE in hex
  const b = Math.min(
    255,
    Math.floor(235 * skyFactor) + Math.floor((1 - skyFactor) * 51)
  ); // EB -> 33
  const skyColor = `rgb(${r}, ${g}, ${b})`;

  // Calculate fog density (increases with level)
  const fogNear = Math.max(20, 30 - (level / 40) * 15);
  const fogFar = Math.max(50, 100 - (level / 40) * 50);

  // Calculate sky turbidity and rayleigh values for Sky component
  const turbidity = Math.min(20, 10 + (level / 40) * 10); // 10-20, higher is hazier
  const rayleigh = Math.max(0.2, 1 - (level / 40) * 0.8); // 1-0.2, lower makes sky darker blue

  // Adjust sunPosition to set sun lower in the sky as levels progress
  const sunElevation = Math.max(5, 20 - (level / 40) * 15); // 20-5, lower is sunset
  const sunAzimuth = 180; // Fixed azimuth (180 = north)

  return {
    ambientIntensity,
    ambientR,
    ambientG,
    ambientB,
    directionalIntensity,
    spotlightIntensity,
    spotlightAngle,
    spotlightPenumbra,
    spotlightDistance,
    skyColor,
    fogNear,
    fogFar,
    turbidity,
    rayleigh,
    sunElevation,
    sunAzimuth,
  };
};

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
  useRespawnManager();
  return null;
};

// Component to follow the player's tank with the camera
const FollowCamera = memo(() => {
  const { camera } = useThree();
  const getState = useRef(useGameState.getState).current;
  const offsetRef = useRef(new Vector3(0, 8, -12));
  const targetPositionRef = useRef(new Vector3());

  useFrame(() => {
    const playerPosition = getState().playerTankPosition;
    const cameraRange = getState().playerCameraRange;

    if (playerPosition) {
      const distanceBehind = -cameraRange;
      offsetRef.current.x = -Math.sin(camera.rotation.y) * distanceBehind;
      offsetRef.current.y = 8 + (cameraRange - 12) * 0.3;
      offsetRef.current.z = -Math.cos(camera.rotation.y) * distanceBehind;
      targetPositionRef.current.set(
        playerPosition[0] + offsetRef.current.x,
        playerPosition[1] + offsetRef.current.y,
        playerPosition[2] + offsetRef.current.z
      );
      camera.position.lerp(targetPositionRef.current, 0.05);
      camera.lookAt(playerPosition[0], playerPosition[1], playerPosition[2]);
    }
  });

  return null;
});

// Separate component to handle spotlight updates inside the Canvas
const SpotlightUpdater = () => {
  const getState = useRef(useGameState.getState).current;
  const spotLightRef = useRef<ThreeSpotLight>(null);
  const {
    spotlightIntensity,
    spotlightAngle,
    spotlightPenumbra,
    spotlightDistance,
  } = useLightIntensity();

  useFrame(() => {
    const playerTankPosition = getState().playerTankPosition;

    if (spotLightRef.current && playerTankPosition) {
      spotLightRef.current.position.set(
        playerTankPosition[0],
        playerTankPosition[1] + 10,
        playerTankPosition[2]
      );
      spotLightRef.current.intensity = spotlightIntensity;
      spotLightRef.current.angle = spotlightAngle;
      spotLightRef.current.penumbra = spotlightPenumbra;
      spotLightRef.current.distance = spotlightDistance;
    }
  });

  return (
    <spotLight
      ref={spotLightRef}
      position={[0, 10, 0]}
      angle={spotlightAngle}
      penumbra={spotlightPenumbra}
      intensity={spotlightIntensity}
      distance={spotlightDistance}
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
  const getState = useRef(useGameState.getState).current;
  const {
    ambientIntensity,
    ambientR,
    ambientG,
    ambientB,
    directionalIntensity,
    turbidity,
    rayleigh,
    sunAzimuth,
  } = useLightIntensity();
  const [enemies, setEnemies] = useState(getState().enemies);
  const [terrainObstacles, setTerrainObstacles] = useState(
    getState().terrainObstacles
  );

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
      <EnemyRespawnManager />
      <ambientLight
        intensity={ambientIntensity}
        color={[ambientR, ambientG, ambientB]}
      />
      <directionalLight
        position={[10, 20, 10]}
        intensity={directionalIntensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <SpotlightUpdater />
      <SafeZone />
      {playerTank}
      {enemies.map((enemy) => (
        <EnemyTank key={`enemy-${enemy.id}`} enemy={enemy} />
      ))}
      {getState().powerUps.map((powerUp) => (
        <PowerUpItem key={`powerup-${powerUp.id}`} powerUp={powerUp} />
      ))}
      {terrainObstacles.map((obstacle) => (
        <TerrainObstacle
          key={`obstacle-${obstacle.id}`}
          position={obstacle.position}
          size={obstacle.size}
        />
      ))}
      <Ground />
      <Sky turbidity={turbidity} rayleigh={rayleigh} azimuth={sunAzimuth} />
      <FollowCamera />
      <OrbitControls enabled={false} />
    </Suspense>
  );
});

// Move terrain obstacle generation to a separate component
const TerrainObstacleGenerator = () => {
  const addTerrainObstacle = useGameState((state) => state.addTerrainObstacle);
  const isGameOver = useGameState((state) => state.isGameOver);
  const [isTerrainReady, setIsTerrainReady] = useState(false);

  useEffect(() => {
    debug.log("TerrainObstacleGenerator: Starting obstacle generation");
    try {
      const obstacleCount = 20;
      const spawnClearanceRadius = 15;
      let totalAttempts = 0;
      const maxAttempts = 500;
      let successfulPlacements = 0;

      while (
        successfulPlacements < obstacleCount &&
        totalAttempts < maxAttempts
      ) {
        totalAttempts++;
        let x = (Math.random() - 0.5) * 75;
        let z = (Math.random() - 0.5) * 75;
        const distanceFromSpawn = Math.sqrt(x * x + z * z);
        if (distanceFromSpawn < spawnClearanceRadius) {
          const angle = Math.atan2(z, x);
          x = Math.cos(angle) * spawnClearanceRadius;
          z = Math.sin(angle) * spawnClearanceRadius;
          debug.log("Adjusted obstacle position away from spawn area", {
            x,
            z,
          });
        }
        const size = 1 + Math.random() * 1.2;
        const existingObstacles = useGameState.getState().terrainObstacles;
        let isTooClose = false;
        const minObstacleSpacing = 8;

        for (const existing of existingObstacles) {
          const dx = existing.position[0] - x;
          const dz = existing.position[2] - z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          const requiredSpace =
            (existing.size + size) * 1.2 + minObstacleSpacing;

          if (distance < requiredSpace) {
            isTooClose = true;
            break;
          }
        }

        if (!isTooClose) {
          const obstacle = {
            id: `rock-${successfulPlacements}-${Date.now()}`,
            position: [x, 0, z] as [number, number, number],
            size,
          };
          debug.log(
            `TerrainObstacleGenerator: Adding obstacle ${
              successfulPlacements + 1
            }/${obstacleCount}`,
            obstacle
          );
          addTerrainObstacle({
            position: obstacle.position,
            type: "rock",
            size: obstacle.size,
          });
          successfulPlacements++;
        }
      }

      debug.log(
        `TerrainObstacleGenerator: Placed ${successfulPlacements} obstacles after ${totalAttempts} attempts`
      );
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
  }, [addTerrainObstacle, isGameOver]);

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
  const canvasRef = useRef<HTMLDivElement>(null);
  const { skyColor, fogNear, fogFar } = useLightIntensity();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.tabIndex = 0;
      const handleKeyDown = (e: KeyboardEvent) => {
        debug.log("Canvas keydown event:", e.key);
      };
      canvas.addEventListener("keydown", handleKeyDown);
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
          <color attach="background" args={[skyColor]} />
          <fog attach="fog" args={[skyColor, fogNear, fogFar]} />
          <Stats />
          <TerrainObstacleGenerator />
          <SceneContent playerTank={<Tank position={[0, 0.5, 0]} />} />
        </Canvas>
      </div>
    </ErrorBoundary>
  );
};

export default GameScene;

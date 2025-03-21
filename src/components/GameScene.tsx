import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  Sky,
  OrbitControls,
  Environment,
  useHelper,
  Stats,
  SpotLight,
} from "@react-three/drei";
import Tank from "../models/Tank";
import EnemyTank from "../models/EnemyTank";
import PowerUpItem from "../models/PowerUpItem";
import Ground from "../models/Ground";
import {
  Suspense,
  useRef,
  useEffect,
  useMemo,
  memo,
  Component,
  ErrorInfo,
  ReactNode,
  useState,
} from "react";
import { useGameState } from "../utils/gameState";
import { SpotLightHelper, Vector3 } from "three";
import "./GameScene.css";

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
    console.error("Canvas error caught by boundary:", error, errorInfo);
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

    if (playerPosition) {
      // Update offset based on camera rotation
      offsetRef.current.x = -Math.sin(camera.rotation.y) * 12;
      offsetRef.current.z = -Math.cos(camera.rotation.y) * 12;

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
  const spotLightRef = useRef<THREE.SpotLight>(null);

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
const SceneContent = memo(({ playerTank }) => {
  // Get direct access to the store state
  const getState = useRef(useGameState.getState).current;

  return (
    <Suspense fallback={null}>
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
      {getState().enemies.map((enemy) => (
        <EnemyTank key={enemy.id} enemy={enemy} />
      ))}

      {/* Power-ups */}
      {getState().powerUps.map((powerUp) => (
        <PowerUpItem key={powerUp.id} powerUp={powerUp} />
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

// Main game scene component
const GameScene = () => {
  const [enemies, setEnemies] = useState(0);
  const [powerUps, setPowerUps] = useState(0);

  // Create a memoized player tank component that won't re-render
  const PlayerTank = useMemo(() => {
    return <Tank position={[0, 0.5, 0]} />;
  }, []);

  // Canvas reference for handling focus
  const canvasRef = useRef(null);

  // Effect for focusing the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set tabIndex to make canvas focusable
      canvas.tabIndex = 0;

      // Force focus on click
      const handleCanvasClick = () => {
        canvas.focus();
        console.log("Canvas focused");
      };

      // Add direct keyboard event listener for debugging
      const handleKeyDown = (e) => {
        console.log("Canvas keydown event:", e.key);
      };

      canvas.addEventListener("click", handleCanvasClick);
      canvas.addEventListener("keydown", handleKeyDown);

      // Focus canvas initially
      canvas.focus();

      return () => {
        canvas.removeEventListener("click", handleCanvasClick);
        canvas.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, []);

  // Get direct access to the store state that's read-only and doesn't trigger re-renders
  const getState = useRef(useGameState.getState).current;

  // Refs for values needed in rendering
  const enemiesRef = useRef(getState().enemies);
  const powerUpsRef = useRef(getState().powerUps);

  // Subscribe to state changes outside of render to update refs
  useEffect(() => {
    const unsubscribe = useGameState.subscribe((state) => {
      enemiesRef.current = state.enemies;
      powerUpsRef.current = state.powerUps;
    });

    return unsubscribe;
  }, []);

  // Debug: log state changes
  useEffect(() => {
    console.log("GameScene rendered", {
      enemies: enemiesRef.current.length,
      powerUps: powerUpsRef.current.length,
    });
  }, []);

  // Using this effect to log when Canvas is created
  useEffect(() => {
    console.log("Canvas container mounted");
    return () => console.log("Canvas container unmounted");
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
          onCreated={() => console.log("Canvas created")}>
          <color attach="background" args={["#87CEEB"]} />
          <fog attach="fog" args={["#87CEEB", 30, 100]} />
          <Stats />
          <SceneContent playerTank={PlayerTank} />
        </Canvas>
      </div>
    </ErrorBoundary>
  );
};

export default GameScene;

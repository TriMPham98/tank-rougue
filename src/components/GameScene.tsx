import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  Sky,
  OrbitControls,
  Environment,
  useHelper,
  Stats,
} from "@react-three/drei";
import Tank from "../models/Tank";
import EnemyTank from "../models/EnemyTank";
import PowerUpItem from "../models/PowerUpItem";
import Ground from "../models/Ground";
import { Suspense, useRef, useEffect, useMemo, memo } from "react";
import { useGameState } from "../utils/gameState";
import { SpotLightHelper, Vector3 } from "three";

// Component to follow the player's tank with the camera
// Memoize this component to prevent unnecessary re-renders
const FollowCamera = memo(() => {
  const { camera } = useThree();
  // Use selector function with an === equality check to prevent unnecessary updates
  const playerPosition = useGameState(
    (state) => state.playerTankPosition,
    (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
  );

  // Store the current position in a ref to avoid recreating vectors on each frame
  const positionRef = useRef(playerPosition);

  // Update the ref when playerPosition changes
  useEffect(() => {
    positionRef.current = playerPosition;
  }, [playerPosition]);

  useFrame(() => {
    const currentPosition = positionRef.current;
    if (currentPosition) {
      // Position camera behind and above the player tank
      const offset = new Vector3(
        -Math.sin(camera.rotation.y) * 12,
        8,
        -Math.cos(camera.rotation.y) * 12
      );

      const targetPosition = new Vector3(
        currentPosition[0] + offset.x,
        currentPosition[1] + offset.y,
        currentPosition[2] + offset.z
      );

      // Smoothly interpolate camera position
      camera.position.lerp(targetPosition, 0.05);

      // Make camera look at the player
      camera.lookAt(currentPosition[0], currentPosition[1], currentPosition[2]);
    }
  });

  return null;
});

const GameScene = () => {
  const spotLightRef = useRef<THREE.SpotLight>(null);

  // Get game state - only read values, don't update within the component
  // Use useMemo to prevent recreation on every render
  const gameState = useGameState();

  const { enemies, powerUps, isPaused, playerTankPosition } = useMemo(
    () => ({
      enemies: gameState.enemies,
      powerUps: gameState.powerUps,
      isPaused: gameState.isPaused,
      playerTankPosition: gameState.playerTankPosition,
    }),
    [
      gameState.enemies,
      gameState.powerUps,
      gameState.isPaused,
      gameState.playerTankPosition,
    ]
  );

  // Only log on significant state changes to reduce renders
  useEffect(() => {
    console.log("GameScene rendered", { enemies, powerUps, isPaused });
  }, [enemies.length, powerUps.length, isPaused]);

  // Debug: display light helper
  useEffect(() => {
    if (spotLightRef.current) {
      console.log("Spotlight created");
    }
  }, []);

  // Memoize the position so it doesn't create a new array each render
  const spotlightPosition = useMemo(
    () => [
      playerTankPosition[0],
      playerTankPosition[1] + 10,
      playerTankPosition[2],
    ],
    [playerTankPosition[0], playerTankPosition[1], playerTankPosition[2]]
  );

  return (
    <Canvas shadows camera={{ position: [0, 10, 20], fov: 60 }}>
      <color attach="background" args={["#87CEEB"]} />
      <fog attach="fog" args={["#87CEEB", 30, 100]} />
      <Stats />

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

        {/* Player spotlight */}
        <spotLight
          ref={spotLightRef}
          position={spotlightPosition}
          angle={0.4}
          penumbra={0.5}
          intensity={1.0}
          castShadow
          shadow-bias={-0.001}
        />

        {/* Player tank */}
        <Tank position={[0, 0.5, 0]} />

        {/* Enemy tanks */}
        {enemies.map((enemy) => (
          <EnemyTank key={enemy.id} enemy={enemy} />
        ))}

        {/* Power-ups */}
        {powerUps.map((powerUp) => (
          <PowerUpItem key={powerUp.id} powerUp={powerUp} />
        ))}

        <Ground />
        <Sky sunPosition={[100, 100, 20]} />

        {/* Camera that follows player */}
        <FollowCamera />

        {/* Dev controls - enable for development */}
        <OrbitControls enabled={true} />

        <Environment preset="sunset" />
      </Suspense>
    </Canvas>
  );
};

export default GameScene;

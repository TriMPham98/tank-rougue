import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Sky, OrbitControls, Environment, useHelper } from "@react-three/drei";
import Tank from "../models/Tank";
import EnemyTank from "../models/EnemyTank";
import PowerUpItem from "../models/PowerUpItem";
import Ground from "../models/Ground";
import { Suspense, useRef, useEffect, useState } from "react";
import { useGameState } from "../utils/gameState";
import { SpotLightHelper, Vector3 } from "three";

// Component to follow the player's tank with the camera
const FollowCamera = ({
  playerPosition,
}: {
  playerPosition: [number, number, number];
}) => {
  const { camera } = useThree();

  useFrame(() => {
    if (playerPosition) {
      // Position camera behind and above the player tank
      const offset = new Vector3(
        -Math.sin(camera.rotation.y) * 12,
        8,
        -Math.cos(camera.rotation.y) * 12
      );

      const targetPosition = new Vector3(
        playerPosition[0] + offset.x,
        playerPosition[1] + offset.y,
        playerPosition[2] + offset.z
      );

      // Smoothly interpolate camera position
      camera.position.lerp(targetPosition, 0.05);

      // Make camera look at the player
      camera.lookAt(playerPosition[0], playerPosition[1], playerPosition[2]);
    }
  });

  return null;
};

const GameScene = () => {
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const [playerPosition, setPlayerPosition] = useState<
    [number, number, number]
  >([0, 0.5, 0]);

  // Get game state
  const { enemies, powerUps, isPaused } = useGameState((state) => ({
    enemies: state.enemies,
    powerUps: state.powerUps,
    isPaused: state.isPaused,
  }));

  // Update player tank position in the game state
  const updatePlayerPosition = (position: [number, number, number]) => {
    setPlayerPosition(position);
    useGameState.setState({ playerTankPosition: position });
  };

  // Display a helper for the spotlight in development
  // useHelper(spotLightRef, SpotLightHelper, 'yellow');

  // Pause game physics when game is paused
  useEffect(() => {
    if (isPaused) {
      // You could add logic here to pause animations or physics
    }
  }, [isPaused]);

  return (
    <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
      <Suspense fallback={null}>
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[10, 10, 10]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        {/* Player spotlight */}
        <spotLight
          ref={spotLightRef}
          position={[
            playerPosition[0],
            playerPosition[1] + 10,
            playerPosition[2],
          ]}
          angle={0.4}
          penumbra={0.5}
          intensity={1.0}
          castShadow
          shadow-bias={-0.001}
        />

        {/* Player tank */}
        <Tank
          position={playerPosition}
          onPositionChange={updatePlayerPosition}
        />

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

        {/* Dev controls - consider removing in production */}
        <OrbitControls enabled={false} />

        <Environment preset="sunset" />

        {/* Camera that follows the player */}
        <FollowCamera playerPosition={playerPosition} />
      </Suspense>
    </Canvas>
  );
};

export default GameScene;

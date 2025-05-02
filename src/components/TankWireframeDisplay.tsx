import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import TankWireframe, { AnimState } from "./TankWireframe";

interface TankWireframeDisplayProps {
  width?: string;
  height?: string;
  isBackground?: boolean;
  animationMode?: AnimState;
  onAnimationComplete?: (finalState: AnimState) => void;
}

const TankWireframeDisplay: React.FC<TankWireframeDisplayProps> = ({
  width = "100%",
  height = "300px",
  isBackground = false,
  animationMode,
  onAnimationComplete,
}) => {
  return (
    <div style={{ width, height }}>
      <Canvas
        camera={{
          position: isBackground ? [10, 3, 0] : [7.5, 0.5, 0],
          fov: isBackground ? 40 : 35,
        }}
        style={{
          background: isBackground ? "transparent" : "rgba(0, 0, 0, 0.2)",
          borderRadius: isBackground ? "0" : "8px",
          boxShadow: isBackground
            ? "none"
            : "0 0 10px rgba(0, 255, 0, 0.3) inset",
        }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <group position={[0, -0.7, 0]}>
          <TankWireframe
            animationMode={animationMode}
            onAnimationComplete={onAnimationComplete}
          />
        </group>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={true}
          autoRotateSpeed={isBackground ? 0.5 : 1.5}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
};

export default TankWireframeDisplay;

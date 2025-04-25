import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import TankWireframe from "./TankWireframe";

interface TankWireframeDisplayProps {
  width?: string;
  height?: string;
}

const TankWireframeDisplay: React.FC<TankWireframeDisplayProps> = ({
  width = "100%",
  height = "300px",
}) => {
  return (
    <div style={{ width, height }}>
      <Canvas
        camera={{ position: [7.5, 0.5, 0], fov: 35 }}
        style={{
          background: "rgba(0, 0, 0, 0.2)",
          borderRadius: "8px",
          boxShadow: "0 0 10px rgba(0, 255, 0, 0.3) inset",
        }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <group position={[0, -0.7, 0]}>
          <TankWireframe />
        </group>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={true}
          autoRotateSpeed={1.5}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
};

export default TankWireframeDisplay;

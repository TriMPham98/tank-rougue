import { useRef } from "react";
import { Mesh } from "three";
import { useTexture, Grid } from "@react-three/drei";

const Ground = () => {
  const groundRef = useRef<Mesh>(null);

  return (
    <group>
      {/* Ground plane */}
      <mesh
        ref={groundRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#3f7c42" roughness={0.8} />
      </mesh>

      {/* Grid for visual reference */}
      <Grid
        position={[0, 0.01, 0]}
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6f8a5c"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2c5e1e"
        fadeDistance={50}
        fadeStrength={1}
      />
    </group>
  );
};

export default Ground;

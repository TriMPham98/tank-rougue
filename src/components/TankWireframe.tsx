import React, { useRef } from "react";
import { Box, Cylinder, Sphere } from "@react-three/drei";
import { Group } from "three";

const TankWireframe: React.FC = () => {
  const tankRef = useRef<Group>(null);
  const turretRef = useRef<Group>(null);

  return (
    <group ref={tankRef} position={[0, 0, 0]} scale={1.2}>
      {/* Tank Body */}
      <Box args={[1.8, 0.6, 2.2]} position={[0, 0, 0]}>
        <meshBasicMaterial color="#00FF00" wireframe={true} />
      </Box>
      <Box
        args={[1.2, 0.4, 0.5]}
        position={[0, 0.2, -1.35]}
        rotation={[Math.PI / 6, 0, 0]}>
        <meshBasicMaterial color="#00FF00" wireframe={true} />
      </Box>
      <Box args={[0.5, 0.1, 0.3]} position={[-0.5, 0.35, -0.8]}>
        <meshBasicMaterial color="#00FF00" wireframe={true} />
      </Box>
      <Box args={[0.5, 0.1, 0.3]} position={[0.5, 0.35, -0.8]}>
        <meshBasicMaterial color="#00FF00" wireframe={true} />
      </Box>
      <Box args={[0.8, 0.1, 0.25]} position={[0, 0.35, 0.9]}>
        <meshBasicMaterial color="#00FF00" wireframe={true} />
      </Box>

      {/* Lights (front and back) */}
      <Box args={[0.15, 0.1, 0.05]} position={[-0.6, 0.1, 1.15]}>
        <meshBasicMaterial color="#00FF00" wireframe={true} />
      </Box>
      <Box args={[0.15, 0.1, 0.05]} position={[0.6, 0.1, 1.15]}>
        <meshBasicMaterial color="#00FF00" wireframe={true} />
      </Box>
      <Box args={[0.15, 0.1, 0.05]} position={[-0.75, 0.1, -1.15]}>
        <meshBasicMaterial color="#00FF00" wireframe={true} />
      </Box>
      <Box args={[0.15, 0.1, 0.05]} position={[0.75, 0.1, -1.15]}>
        <meshBasicMaterial color="#00FF00" wireframe={true} />
      </Box>

      {/* Tank Tracks */}
      <Box args={[0.4, 0.25, 2.4]} position={[-0.8, -0.3, 0]}>
        <meshBasicMaterial color="#00FF00" wireframe={true} />
      </Box>
      <Box args={[0.4, 0.25, 2.4]} position={[0.8, -0.3, 0]}>
        <meshBasicMaterial color="#00FF00" wireframe={true} />
      </Box>
      <Box args={[0.2, 0.1, 2.2]} position={[-0.8, 0.05, 0]}>
        <meshBasicMaterial color="#00FF00" wireframe={true} />
      </Box>
      <Box args={[0.2, 0.1, 2.2]} position={[0.8, 0.05, 0]}>
        <meshBasicMaterial color="#00FF00" wireframe={true} />
      </Box>

      {/* Tank Rollers */}
      {[...Array(6)].map((_, i) => (
        <Cylinder
          key={`roller-l-${i}`}
          args={[0.12, 0.12, 0.1, 8]}
          position={[-0.8, -0.3, -0.8 + i * 0.36]}
          rotation={[0, 0, Math.PI / 2]}>
          <meshBasicMaterial color="#00FF00" wireframe={true} />
        </Cylinder>
      ))}
      {[...Array(6)].map((_, i) => (
        <Cylinder
          key={`roller-r-${i}`}
          args={[0.12, 0.12, 0.1, 8]}
          position={[0.8, -0.3, -0.8 + i * 0.36]}
          rotation={[0, 0, Math.PI / 2]}>
          <meshBasicMaterial color="#00FF00" wireframe={true} />
        </Cylinder>
      ))}

      {/* Tank Turret */}
      <group position={[0, 0.5, 0]} ref={turretRef}>
        <Cylinder args={[0.7, 0.8, 0.5, 20]} position={[0, 0.25, 0]}>
          <meshBasicMaterial color="#00FF00" wireframe={true} />
        </Cylinder>
        <Cylinder args={[0.35, 0.35, 0.15, 16]} position={[0, 0.55, -0.3]}>
          <meshBasicMaterial color="#00FF00" wireframe={true} />
        </Cylinder>
        <Cylinder
          args={[0.12, 0.12, 1.8, 16]}
          position={[0, 0.25, 1.1]}
          rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color="#00FF00" wireframe={true} />
        </Cylinder>
        <Cylinder
          args={[0.18, 0.18, 0.3, 16]}
          position={[0, 0.25, 2]}
          rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color="#00FF00" wireframe={true} />
        </Cylinder>
        <Box args={[0.25, 0.35, 1]} position={[-0.65, 0.25, 0]}>
          <meshBasicMaterial color="#00FF00" wireframe={true} />
        </Box>
        <Box args={[0.25, 0.35, 1]} position={[0.65, 0.25, 0]}>
          <meshBasicMaterial color="#00FF00" wireframe={true} />
        </Box>
        <Cylinder args={[0.05, 0.05, 0.2, 8]} position={[0.4, 0.55, -0.4]}>
          <meshBasicMaterial color="#00FF00" wireframe={true} />
        </Cylinder>
        <Cylinder args={[0.02, 0.02, 1.0, 8]} position={[0.4, 1.0, -0.4]}>
          <meshBasicMaterial color="#00FF00" wireframe={true} />
        </Cylinder>
        <Box args={[0.25, 0.15, 0.15]} position={[0, 0.4, 0.5]}>
          <meshBasicMaterial color="#00FF00" wireframe={true} />
        </Box>
        <Sphere args={[0.15, 16, 16]} position={[0, 0.6, 0.2]}>
          <meshBasicMaterial color="#00FF00" wireframe={true} />
        </Sphere>
      </group>
    </group>
  );
};

export default TankWireframe;

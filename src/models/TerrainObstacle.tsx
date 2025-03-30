import { useRef } from "react";
import { Mesh, Group } from "three";
import { Cylinder, Cone, Box } from "@react-three/drei";

interface TerrainObstacleProps {
  position: [number, number, number];
  type: "rock";
  size?: number;
}

const TerrainObstacle = ({
  position,
  type,
  size = 1,
}: TerrainObstacleProps) => {
  const obstacleRef = useRef<Group>(null);

  return (
    <group ref={obstacleRef} position={position}>
      <group>
        {/* Main rock body */}
        <Box
          args={[size * 1.5, size * 0.8, size * 1.5]}
          position={[0, size * 0.4, 0]}
          castShadow
          receiveShadow>
          <meshStandardMaterial color="#6b6b6b" roughness={0.9} />
        </Box>
        {/* Additional rock pieces for more natural look */}
        <Box
          args={[size * 0.8, size * 0.4, size * 0.8]}
          position={[size * 0.3, size * 0.6, size * 0.3]}
          rotation={[0.2, 0.3, 0.1]}
          castShadow
          receiveShadow>
          <meshStandardMaterial color="#6b6b6b" roughness={0.9} />
        </Box>
        <Box
          args={[size * 0.6, size * 0.3, size * 0.6]}
          position={[-size * 0.2, size * 0.8, -size * 0.2]}
          rotation={[-0.1, 0.2, -0.2]}
          castShadow
          receiveShadow>
          <meshStandardMaterial color="#6b6b6b" roughness={0.9} />
        </Box>
      </group>
    </group>
  );
};

export default TerrainObstacle;

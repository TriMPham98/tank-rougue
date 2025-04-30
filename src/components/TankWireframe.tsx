import React, { useRef, useState } from "react";
import { Box, Cylinder, Sphere } from "@react-three/drei";
import { Group, Vector3 } from "three";
import { useFrame } from "@react-three/fiber";

// Animation states
enum AnimState {
  ASSEMBLING,
  ROTATING,
  PAUSED,
}

// Easing function (ease-out cubic)
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const TankWireframe: React.FC = () => {
  const tankRef = useRef<Group>(null);
  const turretRef = useRef<Group>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [animState, setAnimState] = useState<AnimState>(AnimState.ASSEMBLING);
  const [rotationAngle, setRotationAngle] = useState(0);

  // Define the starting positions for each piece (far away)
  const startingPositions = {
    body: new Vector3(0, 20, 0),
    frontPart: new Vector3(0, 25, -1.35),
    leftDetail: new Vector3(-30, 0.35, -0.8),
    rightDetail: new Vector3(30, 0.35, -0.8),
    rearDetail: new Vector3(0, 20, 0.9),
    frontLeftLight: new Vector3(-20, 0.1, 15),
    frontRightLight: new Vector3(20, 0.1, 15),
    rearLeftLight: new Vector3(-30, 0.1, -15),
    rearRightLight: new Vector3(30, 0.1, -15),
    leftTrack: new Vector3(-30, -0.3, 0),
    rightTrack: new Vector3(30, -0.3, 0),
    leftTrackTop: new Vector3(-30, 0.05, 0),
    rightTrackTop: new Vector3(30, 0.05, 0),
    turretBase: new Vector3(0, 30, 0),
    turretTop: new Vector3(0, 35, -0.3),
    cannon: new Vector3(0, 0.25, 15),
    cannonTip: new Vector3(0, 0.25, 16),
    leftArmor: new Vector3(-30, 0.25, 0),
    rightArmor: new Vector3(30, 0.25, 0),
    antenna: new Vector3(0.4, 30, -0.4),
    antennaTop: new Vector3(0.4, 35, -0.4),
    sight: new Vector3(0, 20, 0.5),
    dome: new Vector3(0, 30, 0.2),
    turretConnector: new Vector3(0, 28, 0), // Start position for the connector
  };

  // Define the target positions (final positions)
  const targetPositions = {
    body: new Vector3(0, 0, 0),
    frontPart: new Vector3(0, 0.2, -1.35),
    leftDetail: new Vector3(-0.5, 0.35, -0.8),
    rightDetail: new Vector3(0.5, 0.35, -0.8),
    rearDetail: new Vector3(0, 0.35, 0.9),
    frontLeftLight: new Vector3(-0.6, 0.1, 1.15),
    frontRightLight: new Vector3(0.6, 0.1, 1.15),
    rearLeftLight: new Vector3(-0.75, 0.1, -1.15),
    rearRightLight: new Vector3(0.75, 0.1, -1.15),
    leftTrack: new Vector3(-0.8, -0.3, 0),
    rightTrack: new Vector3(0.8, -0.3, 0),
    leftTrackTop: new Vector3(-0.8, 0.05, 0),
    rightTrackTop: new Vector3(0.8, 0.05, 0),
    turretBase: new Vector3(0, 0.25, 0),
    turretTop: new Vector3(0, 0.55, -0.3),
    cannon: new Vector3(0, 0.25, 1.1),
    cannonTip: new Vector3(0, 0.25, 2),
    leftArmor: new Vector3(-0.65, 0.25, 0),
    rightArmor: new Vector3(0.65, 0.25, 0),
    antenna: new Vector3(0.4, 0.55, -0.4),
    antennaTop: new Vector3(0.4, 1.0, -0.4),
    sight: new Vector3(0, 0.4, 0.5),
    dome: new Vector3(0, 0.6, 0.2),
    turretConnector: new Vector3(0, 0.4, 0), // Target position below the turret group
  };

  // Animation timing for each part (when they start moving, between 0 and 1)
  const animationStarts = {
    body: 0,
    frontPart: 0.05,
    leftDetail: 0.1,
    rightDetail: 0.1,
    rearDetail: 0.15,
    frontLeftLight: 0.2,
    frontRightLight: 0.2,
    rearLeftLight: 0.22,
    rearRightLight: 0.22,
    leftTrack: 0.25,
    rightTrack: 0.25,
    leftTrackTop: 0.28,
    rightTrackTop: 0.28,
    rollers: 0.32,
    turretConnector: 0.43, // Start slightly before the turret base
    turretBase: 0.45,
    turretTop: 0.5,
    cannon: 0.55,
    cannonTip: 0.6,
    leftArmor: 0.65,
    rightArmor: 0.65,
    antenna: 0.7,
    antennaTop: 0.72,
    sight: 0.75,
    dome: 0.78,
  };

  // Roller positions with calculated interpolations
  const rollerPositionsLeft = [...Array(6)].map((_, i) => ({
    start: new Vector3(-30, -0.3, -0.8 + i * 0.36),
    end: new Vector3(-0.8, -0.3, -0.8 + i * 0.36),
    delay: i * 0.01, // Slight delay between each roller
  }));

  const rollerPositionsRight = [...Array(6)].map((_, i) => ({
    start: new Vector3(30, -0.3, -0.8 + i * 0.36),
    end: new Vector3(0.8, -0.3, -0.8 + i * 0.36),
    delay: i * 0.01,
  }));

  // Calculate position based on animation progress
  const getPosition = (partName: string, progress: number) => {
    const start = startingPositions[partName as keyof typeof startingPositions];
    const end = targetPositions[partName as keyof typeof targetPositions];
    const partStartTime =
      animationStarts[partName as keyof typeof animationStarts];

    // If animation hasn't reached this part yet, return start position
    if (progress < partStartTime) return start;

    // If part is fully assembled, return end position
    if (progress > partStartTime + 0.2) return end;

    // Otherwise, calculate interpolated position with easing
    const partProgress = (progress - partStartTime) / 0.2;
    const easedProgress = easeOutCubic(partProgress);
    return new Vector3(
      start.x + (end.x - start.x) * easedProgress,
      start.y + (end.y - start.y) * easedProgress,
      start.z + (end.z - start.z) * easedProgress
    );
  };

  // Get roller position with individual delays
  const getRollerPosition = (
    isLeft: boolean,
    index: number,
    progress: number
  ) => {
    const positions = isLeft ? rollerPositionsLeft : rollerPositionsRight;
    const { start, end, delay } = positions[index];
    const rollerStartTime = animationStarts.rollers + delay;

    if (progress < rollerStartTime) return start;
    if (progress > rollerStartTime + 0.15) return end;

    const partProgress = (progress - rollerStartTime) / 0.15;
    const easedProgress = easeOutCubic(partProgress); // Apply easing
    return new Vector3(
      start.x + (end.x - start.x) * easedProgress,
      start.y + (end.y - start.y) * easedProgress,
      start.z + (end.z - start.z) * easedProgress
    );
  };

  // Animation loop using useFrame
  useFrame((_, delta) => {
    if (animState === AnimState.ASSEMBLING) {
      setAnimationProgress((prev) => {
        const newProgress = prev + delta * 0.1; // Control speed of assembly (halved from 0.2)
        if (newProgress >= 1) {
          // Assembly complete, start rotation
          setAnimState(AnimState.ROTATING);
          return 1;
        }
        return newProgress;
      });
    } else if (animState === AnimState.ROTATING) {
      // Rotate the tank 360 degrees
      setRotationAngle((prev) => {
        const newAngle = prev + delta * 0.1; // Match assembly animation speed (halved from 0.2)
        if (newAngle >= Math.PI / 3.5) {
          // Majority of rotation complete, pause before restarting
          setAnimState(AnimState.PAUSED);
          setTimeout(() => {
            setAnimationProgress(0);
            setRotationAngle(0);
            setAnimState(AnimState.ASSEMBLING);
          }, 1000);
          return Math.PI / 3.5;
        }
        return newAngle;
      });
    }
  });

  return (
    <group
      ref={tankRef}
      position={[0, 0, 0]}
      scale={1.2}
      rotation={[0, rotationAngle, 0]}>
      {/* Tank Body */}
      <Box
        args={[1.8, 0.6, 2.2]}
        position={getPosition("body", animationProgress).toArray()}>
        <meshBasicMaterial
          color="#00FF00"
          wireframe={true}
          opacity={0.8}
          transparent={true}
        />
      </Box>
      <Box
        args={[1.2, 0.4, 0.5]}
        position={getPosition("frontPart", animationProgress).toArray()}
        rotation={[Math.PI / 6, 0, 0]}>
        <meshBasicMaterial
          color="#00FF00"
          wireframe={true}
          opacity={0.8}
          transparent={true}
        />
      </Box>
      <Box
        args={[0.5, 0.1, 0.3]}
        position={getPosition("leftDetail", animationProgress).toArray()}>
        <meshBasicMaterial
          color="#00FF00"
          wireframe={true}
          opacity={0.8}
          transparent={true}
        />
      </Box>
      <Box
        args={[0.5, 0.1, 0.3]}
        position={getPosition("rightDetail", animationProgress).toArray()}>
        <meshBasicMaterial
          color="#00FF00"
          wireframe={true}
          opacity={0.8}
          transparent={true}
        />
      </Box>
      <Box
        args={[0.8, 0.1, 0.25]}
        position={getPosition("rearDetail", animationProgress).toArray()}>
        <meshBasicMaterial
          color="#00FF00"
          wireframe={true}
          opacity={0.8}
          transparent={true}
        />
      </Box>

      {/* Lights (front and back) */}
      <Box
        args={[0.15, 0.1, 0.05]}
        position={getPosition("frontLeftLight", animationProgress).toArray()}>
        <meshBasicMaterial
          color="#00FF00"
          wireframe={true}
          opacity={0.8}
          transparent={true}
        />
      </Box>
      <Box
        args={[0.15, 0.1, 0.05]}
        position={getPosition("frontRightLight", animationProgress).toArray()}>
        <meshBasicMaterial
          color="#00FF00"
          wireframe={true}
          opacity={0.8}
          transparent={true}
        />
      </Box>
      <Box
        args={[0.15, 0.1, 0.05]}
        position={getPosition("rearLeftLight", animationProgress).toArray()}>
        <meshBasicMaterial
          color="#00FF00"
          wireframe={true}
          opacity={0.8}
          transparent={true}
        />
      </Box>
      <Box
        args={[0.15, 0.1, 0.05]}
        position={getPosition("rearRightLight", animationProgress).toArray()}>
        <meshBasicMaterial
          color="#00FF00"
          wireframe={true}
          opacity={0.8}
          transparent={true}
        />
      </Box>

      {/* Tank Tracks */}
      <Box
        args={[0.4, 0.25, 2.4]}
        position={getPosition("leftTrack", animationProgress).toArray()}>
        <meshBasicMaterial
          color="#00FF00"
          wireframe={true}
          opacity={0.8}
          transparent={true}
        />
      </Box>
      <Box
        args={[0.4, 0.25, 2.4]}
        position={getPosition("rightTrack", animationProgress).toArray()}>
        <meshBasicMaterial
          color="#00FF00"
          wireframe={true}
          opacity={0.8}
          transparent={true}
        />
      </Box>
      <Box
        args={[0.2, 0.1, 2.2]}
        position={getPosition("leftTrackTop", animationProgress).toArray()}>
        <meshBasicMaterial
          color="#00FF00"
          wireframe={true}
          opacity={0.8}
          transparent={true}
        />
      </Box>
      <Box
        args={[0.2, 0.1, 2.2]}
        position={getPosition("rightTrackTop", animationProgress).toArray()}>
        <meshBasicMaterial
          color="#00FF00"
          wireframe={true}
          opacity={0.8}
          transparent={true}
        />
      </Box>

      {/* Tank Rollers */}
      {[...Array(6)].map((_, i) => (
        <Cylinder
          key={`roller-l-${i}`}
          args={[0.12, 0.12, 0.1, 6]}
          position={getRollerPosition(true, i, animationProgress).toArray()}
          rotation={[0, 0, Math.PI / 2]}>
          <meshBasicMaterial
            color="#00FF00"
            wireframe={true}
            opacity={0.8}
            transparent={true}
          />
        </Cylinder>
      ))}
      {[...Array(6)].map((_, i) => (
        <Cylinder
          key={`roller-r-${i}`}
          args={[0.12, 0.12, 0.1, 6]}
          position={getRollerPosition(false, i, animationProgress).toArray()}
          rotation={[0, 0, Math.PI / 2]}>
          <meshBasicMaterial
            color="#00FF00"
            wireframe={true}
            opacity={0.8}
            transparent={true}
          />
        </Cylinder>
      ))}

      {/* Turret Connecting Cylinder */}
      <Cylinder
        args={[0.6, 0.6, 0.15, 12]} // Reduced height from 0.2 to 0.15
        position={getPosition("turretConnector", animationProgress).toArray()}>
        <meshBasicMaterial
          color="#00FF00"
          wireframe={true}
          opacity={0.8}
          transparent={true}
        />
      </Cylinder>

      {/* Tank Turret Group */}
      <group position={[0, 0.475, 0]} ref={turretRef}>
        {" "}
        // Lowered y-position from 0.5 to 0.475
        <Cylinder
          args={[0.7, 0.8, 0.5, 12]}
          position={getPosition("turretBase", animationProgress).toArray()}>
          <meshBasicMaterial
            color="#00FF00"
            wireframe={true}
            opacity={0.8}
            transparent={true}
          />
        </Cylinder>
        <Cylinder
          args={[0.35, 0.35, 0.15, 8]}
          position={getPosition("turretTop", animationProgress).toArray()}>
          <meshBasicMaterial
            color="#00FF00"
            wireframe={true}
            opacity={0.8}
            transparent={true}
          />
        </Cylinder>
        <Cylinder
          args={[0.12, 0.12, 1.8, 8]}
          position={getPosition("cannon", animationProgress).toArray()}
          rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial
            color="#00FF00"
            wireframe={true}
            opacity={0.8}
            transparent={true}
          />
        </Cylinder>
        <Cylinder
          args={[0.18, 0.18, 0.3, 8]}
          position={getPosition("cannonTip", animationProgress).toArray()}
          rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial
            color="#00FF00"
            wireframe={true}
            opacity={0.8}
            transparent={true}
          />
        </Cylinder>
        <Box
          args={[0.25, 0.35, 1]}
          position={getPosition("leftArmor", animationProgress).toArray()}>
          <meshBasicMaterial
            color="#00FF00"
            wireframe={true}
            opacity={0.8}
            transparent={true}
          />
        </Box>
        <Box
          args={[0.25, 0.35, 1]}
          position={getPosition("rightArmor", animationProgress).toArray()}>
          <meshBasicMaterial
            color="#00FF00"
            wireframe={true}
            opacity={0.8}
            transparent={true}
          />
        </Box>
        <Cylinder
          args={[0.05, 0.05, 0.2, 6]}
          position={getPosition("antenna", animationProgress).toArray()}>
          <meshBasicMaterial
            color="#00FF00"
            wireframe={true}
            opacity={0.8}
            transparent={true}
          />
        </Cylinder>
        <Cylinder
          args={[0.02, 0.02, 1.0, 6]}
          position={getPosition("antennaTop", animationProgress).toArray()}>
          <meshBasicMaterial
            color="#00FF00"
            wireframe={true}
            opacity={0.8}
            transparent={true}
          />
        </Cylinder>
        <Box
          args={[0.25, 0.15, 0.15]}
          position={getPosition("sight", animationProgress).toArray()}>
          <meshBasicMaterial
            color="#00FF00"
            wireframe={true}
            opacity={0.8}
            transparent={true}
          />
        </Box>
        <Sphere
          args={[0.15, 8, 8]}
          position={getPosition("dome", animationProgress).toArray()}>
          <meshBasicMaterial
            color="#00FF00"
            wireframe={true}
            opacity={0.8}
            transparent={true}
          />
        </Sphere>
      </group>
    </group>
  );
};

export default TankWireframe;

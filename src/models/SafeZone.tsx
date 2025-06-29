import { useRef, useEffect, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameState } from "../utils/gameState";
import * as THREE from "three";
import { useSound } from "../utils/sound";

const SafeZone = () => {
  const {
    safeZoneRadius,
    safeZoneCenter,
    safeZoneTargetRadius,
    safeZoneShrinkRate,
    safeZoneActive,
    playerTankPosition,
    takeDamage,
    isPaused,
    isGameOver,
    level,
    isPreZoneChangeLevel,
  } = useGameState();

  const { playLoop, stopLoop } = useSound();
  const [previewOpacity, setPreviewOpacity] = useState(0);
  const isSoundPlaying = useRef(false);

  const cylinderRef = useRef<THREE.Mesh>(null);
  const topRingRef = useRef<THREE.Mesh>(null);
  const bottomRingRef = useRef<THREE.Mesh>(null);
  const targetCylinderRef = useRef<THREE.Mesh>(null);
  const targetTopRingRef = useRef<THREE.Mesh>(null);
  const targetBottomRingRef = useRef<THREE.Mesh>(null);
  const nextZoneCylinderRef = useRef<THREE.Mesh>(null);
  const nextZoneTopRingRef = useRef<THREE.Mesh>(null);
  const nextZoneBottomRingRef = useRef<THREE.Mesh>(null);

  const cylinderMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const targetCylinderMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const nextZoneCylinderMaterialRef = useRef<THREE.ShaderMaterial>(null);

  const lastDamageTime = useRef(0);
  const currentRadiusRef = useRef(safeZoneRadius);
  const isShrinkingRef = useRef(false);
  const targetRadiusRef = useRef(safeZoneTargetRadius);
  const initialRadiusRef = useRef(safeZoneRadius);
  const estimatedTimeToCompleteRef = useRef(0);
  const startShrinkTimeRef = useRef(0);
  const prevLevelRef = useRef(level);
  const isZoneCompletionEnforced = useRef(false);
  const animationTimeRef = useRef(0);
  const lastRadiusUpdateTime = useRef(0);

  const isZoneChangeLevel = level % 5 === 0 && level > 0;
  const currentZoneLevel = Math.floor(level / 5);
  const nextZoneLevel = currentZoneLevel + 1;

  const nextZoneTargetRadius = (() => {
    const maxRadius = 50;
    const minRadius = 5;
    const radiusDecrease = 4;
    return Math.max(minRadius, maxRadius - nextZoneLevel * radiusDecrease);
  })();

  const zoneShader = useMemo(() => {
    return {
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color() },
        opacity: { value: 0.2 },
        pulseActive: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        uniform float opacity;
        uniform float pulseActive;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          // Horizontal grid lines
          float gridY = mod(vPosition.y * 0.5 + time * 0.8, 16.0);
          float horizontalLines = step(0.98, (1.0 - abs(sin(gridY))));
          
          // Edge highlight
          float edgeHighlight = smoothstep(0.95, 1.0, vUv.y) + smoothstep(0.95, 1.0, 1.0 - vUv.y);
          
          // Wave pattern
          float waves = 0.5 + 0.5 * sin(vUv.y * 20.0 + time * 1.5);
          
          // Subtle hexagon pattern
          float hexPattern = 0.5 + 0.5 * sin(vUv.y * 30.0 + vUv.x * 30.0 + time);
          
          // Pulse effect when active
          float pulse = pulseActive * 0.3 * (0.5 + 0.5 * sin(time * 3.0));
          
          // Final color
          vec3 finalColor = color * (1.0 + horizontalLines * 0.3 + edgeHighlight * 0.2 + hexPattern * 0.1);
          float finalOpacity = opacity * (1.0 + horizontalLines * 0.2 + waves * 0.05 + pulse);
          
          gl_FragColor = vec4(finalColor, finalOpacity);
        }
      `,
    };
  }, []);

  const ringShader = useMemo(() => {
    return {
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color() },
        opacity: { value: 0.6 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        uniform float opacity;
        varying vec2 vUv;
        
        void main() {
          // Pulsing glow
          float pulse = 0.15 * sin(time * 3.0);
          
          // Rotating patterns
          float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
          float dist = length(vUv - vec2(0.5));
          float pattern = 0.5 + 0.5 * sin(angle * 20.0 + time * 1.0);
          
          vec3 finalColor = color * (1.0 + pulse + pattern * 0.1);
          float finalOpacity = opacity * (1.0 + pulse * 0.5 + pattern * 0.1);
          
          gl_FragColor = vec4(finalColor, finalOpacity);
        }
      `,
    };
  }, []);

  useEffect(() => {
    if (level % 5 === 0 && level > 0 && prevLevelRef.current !== level) {
      currentRadiusRef.current = safeZoneTargetRadius;
      initialRadiusRef.current = safeZoneTargetRadius;
      isZoneCompletionEnforced.current = true;
      useGameState.setState({ safeZoneRadius: safeZoneTargetRadius });
    } else {
      isZoneCompletionEnforced.current = false;
    }
    prevLevelRef.current = level;

    if (
      (!isShrinkingRef.current || safeZoneRadius < currentRadiusRef.current) &&
      !isZoneCompletionEnforced.current
    ) {
      currentRadiusRef.current = safeZoneRadius;
      initialRadiusRef.current = safeZoneRadius;
      if (safeZoneRadius > safeZoneTargetRadius) {
        startShrinkTimeRef.current = Date.now() / 1000;
        const radiusDifference = safeZoneRadius - safeZoneTargetRadius;
        estimatedTimeToCompleteRef.current =
          radiusDifference / safeZoneShrinkRate;
      }
    }
    targetRadiusRef.current = safeZoneTargetRadius;
  }, [safeZoneRadius, safeZoneTargetRadius, safeZoneShrinkRate, level]);

  useEffect(() => {
    if (!isPreZoneChangeLevel || !safeZoneActive || isPaused || isGameOver) {
      if (isSoundPlaying.current) {
        stopLoop("zoneWarning");
        isSoundPlaying.current = false;
      }
    } else if (!isSoundPlaying.current) {
      playLoop("zoneWarning", 1.375);
      isSoundPlaying.current = true;
    }
  }, [
    isPreZoneChangeLevel,
    safeZoneActive,
    isPaused,
    isGameOver,
    playLoop,
    stopLoop,
  ]);

  useEffect(() => {
    if (!isPreZoneChangeLevel || !safeZoneActive) {
      setPreviewOpacity(0);
      return;
    }

    const interval = setInterval(() => {
      setPreviewOpacity(0.1 + 0.4 * Math.abs(Math.sin(Date.now() / 800)));
    }, 50);

    return () => {
      clearInterval(interval);
    };
  }, [isPreZoneChangeLevel, safeZoneActive]);

  useFrame((state, delta) => {
    if (isPaused || isGameOver || !safeZoneActive) return;

    const currentState = useGameState.getState();
    const currentTime = state.clock.getElapsedTime();
    animationTimeRef.current += delta;

    if (cylinderMaterialRef.current) {
      cylinderMaterialRef.current.uniforms.time.value =
        animationTimeRef.current;
      cylinderMaterialRef.current.uniforms.pulseActive.value =
        shouldPulse || shouldUrgencyPulse ? 1.0 : 0.0;
      cylinderMaterialRef.current.uniforms.opacity.value =
        shouldPulse || shouldUrgencyPulse
          ? getPulseOpacity()
          : getSafeZoneOpacity();
    }

    if (targetCylinderMaterialRef.current) {
      targetCylinderMaterialRef.current.uniforms.time.value =
        animationTimeRef.current;
    }

    if (nextZoneCylinderMaterialRef.current) {
      nextZoneCylinderMaterialRef.current.uniforms.time.value =
        animationTimeRef.current;
      nextZoneCylinderMaterialRef.current.uniforms.opacity.value =
        previewOpacity * 0.2;
    }

    if (
      isZoneChangeLevel &&
      currentRadiusRef.current !== targetRadiusRef.current
    ) {
      currentRadiusRef.current = targetRadiusRef.current;
      useGameState.setState({ safeZoneRadius: targetRadiusRef.current });
      return;
    }

    if (currentRadiusRef.current > currentState.safeZoneTargetRadius) {
      isShrinkingRef.current = true;
      const newRadius = Math.max(
        currentState.safeZoneTargetRadius,
        currentRadiusRef.current - currentState.safeZoneShrinkRate * delta * 1.5
      );

      if (Math.abs(currentRadiusRef.current - newRadius) > 0.01) {
        currentRadiusRef.current = newRadius;
        if (state.clock.elapsedTime - lastRadiusUpdateTime.current > 0.2) {
          useGameState.setState({ safeZoneRadius: newRadius });
          lastRadiusUpdateTime.current = state.clock.elapsedTime;
        }
      }

      if (
        Math.abs(currentRadiusRef.current - currentState.safeZoneTargetRadius) <
        0.1
      ) {
        isShrinkingRef.current = false;
      }
    } else {
      isShrinkingRef.current = false;
    }

    if (currentState.safeZoneActive && playerTankPosition) {
      const playerPosition2D = [playerTankPosition[0], playerTankPosition[2]];
      const centerPosition = [
        currentState.safeZoneCenter[0],
        currentState.safeZoneCenter[1],
      ];
      const distance = Math.sqrt(
        Math.pow(playerPosition2D[0] - centerPosition[0], 2) +
          Math.pow(playerPosition2D[1] - centerPosition[1], 2)
      );

      if (distance > currentRadiusRef.current) {
        if (currentTime - lastDamageTime.current >= 1) {
          takeDamage(currentState.safeZoneDamage);
          lastDamageTime.current = currentTime;
        }
      }
    }

    if (cylinderRef.current) {
      if (Math.abs(cylinderRef.current.scale.x - 1) > 0.01) {
        cylinderRef.current.scale.set(1, 1, 1);
        cylinderRef.current.geometry.dispose();
        cylinderRef.current.geometry = new THREE.CylinderGeometry(
          currentRadiusRef.current,
          currentRadiusRef.current,
          40,
          64,
          1,
          true
        );
      }
    }

    if (topRingRef.current && bottomRingRef.current) {
      topRingRef.current.geometry.dispose();
      bottomRingRef.current.geometry.dispose();
      const ringThickness = 0.5;
      const newTopRingGeometry = new THREE.RingGeometry(
        currentRadiusRef.current - ringThickness,
        currentRadiusRef.current,
        64
      );
      const newBottomRingGeometry = new THREE.RingGeometry(
        currentRadiusRef.current - ringThickness,
        currentRadiusRef.current,
        64
      );
      topRingRef.current.geometry = newTopRingGeometry;
      bottomRingRef.current.geometry = newBottomRingGeometry;
    }

    if (
      targetCylinderRef.current &&
      targetTopRingRef.current &&
      targetBottomRingRef.current &&
      currentState.safeZoneTargetRadius < currentRadiusRef.current
    ) {
      targetCylinderRef.current.geometry.dispose();
      targetCylinderRef.current.geometry = new THREE.CylinderGeometry(
        currentState.safeZoneTargetRadius,
        currentState.safeZoneTargetRadius,
        40,
        64,
        1,
        true
      );
      targetTopRingRef.current.geometry.dispose();
      targetBottomRingRef.current.geometry.dispose();
      const targetRingThickness = 0.3;
      const newTargetTopRingGeometry = new THREE.RingGeometry(
        currentState.safeZoneTargetRadius - targetRingThickness,
        currentState.safeZoneTargetRadius,
        64
      );
      const newTargetBottomRingGeometry = new THREE.RingGeometry(
        currentState.safeZoneTargetRadius - targetRingThickness,
        currentState.safeZoneTargetRadius,
        64
      );
      targetTopRingRef.current.geometry = newTargetTopRingGeometry;
      targetBottomRingRef.current.geometry = newTargetBottomRingGeometry;
    }

    if (
      isPreZoneChangeLevel &&
      nextZoneCylinderRef.current &&
      nextZoneTopRingRef.current &&
      nextZoneBottomRingRef.current
    ) {
      const nextRingThickness = 0.3;
      nextZoneCylinderRef.current.geometry.dispose();
      nextZoneCylinderRef.current.geometry = new THREE.CylinderGeometry(
        nextZoneTargetRadius,
        nextZoneTargetRadius,
        40,
        64,
        1,
        true
      );
      nextZoneTopRingRef.current.geometry.dispose();
      nextZoneTopRingRef.current.geometry = new THREE.RingGeometry(
        nextZoneTargetRadius - nextRingThickness,
        nextZoneTargetRadius,
        64
      );
      nextZoneBottomRingRef.current.geometry.dispose();
      nextZoneBottomRingRef.current.geometry = new THREE.RingGeometry(
        nextZoneTargetRadius - nextRingThickness,
        nextZoneTargetRadius,
        64
      );
    }
  });

  const safeZoneColor = "#33ccff";
  const ringColor = "#66d9ff";
  const targetZoneColor = "#ff4d4d";
  const nextZoneColor = "#ff9500";

  const getSafeZoneOpacity = () => {
    const baseOpacity = 0.01;
    const zoneIncrease = Math.min(0.35, currentZoneLevel * 0.05);
    const urgencyBonus = isPreZoneChangeLevel ? 0.15 : 0;
    return baseOpacity + zoneIncrease + urgencyBonus;
  };

  const shouldPulse = isZoneChangeLevel && isShrinkingRef.current;
  const shouldUrgencyPulse = isPreZoneChangeLevel && isShrinkingRef.current;

  const getPulseOpacity = () => {
    return getSafeZoneOpacity() * 1.5;
  };

  return safeZoneActive ? (
    <group position={[safeZoneCenter[0], 20, safeZoneCenter[1]]}>
      <mesh ref={cylinderRef} position={[0, 0, 0]}>
        <cylinderGeometry
          args={[safeZoneRadius, safeZoneRadius, 40, 64, 1, true]}
        />
        <shaderMaterial
          ref={cylinderMaterialRef}
          args={[
            {
              ...zoneShader,
              transparent: true,
              side: THREE.DoubleSide,
              depthWrite: false,
              depthTest: false,
              blending: THREE.AdditiveBlending,
              uniforms: {
                ...zoneShader.uniforms,
                color: { value: new THREE.Color(safeZoneColor) },
                opacity: { value: getSafeZoneOpacity() },
              },
            },
          ]}
        />
      </mesh>

      <mesh
        ref={topRingRef}
        position={[0, 20, 0]}
        rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[safeZoneRadius - 0.5, safeZoneRadius, 64]} />
        <shaderMaterial
          args={[
            {
              ...ringShader,
              transparent: true,
              side: THREE.DoubleSide,
              depthWrite: false,
              depthTest: false,
              blending: THREE.AdditiveBlending,
              uniforms: {
                ...ringShader.uniforms,
                color: { value: new THREE.Color(ringColor) },
                opacity: { value: 0.6 },
              },
            },
          ]}
        />
      </mesh>

      <mesh
        ref={bottomRingRef}
        position={[0, -20, 0]}
        rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[safeZoneRadius - 0.5, safeZoneRadius, 64]} />
        <shaderMaterial
          args={[
            {
              ...ringShader,
              transparent: true,
              side: THREE.DoubleSide,
              depthWrite: false,
              depthTest: false,
              blending: THREE.AdditiveBlending,
              uniforms: {
                ...ringShader.uniforms,
                color: { value: new THREE.Color(ringColor) },
                opacity: { value: 0.6 },
              },
            },
          ]}
        />
      </mesh>

      {safeZoneTargetRadius < safeZoneRadius && (
        <>
          <mesh ref={targetCylinderRef} position={[0, 0, 0]}>
            <cylinderGeometry
              args={[
                safeZoneTargetRadius,
                safeZoneTargetRadius,
                40,
                64,
                1,
                true,
              ]}
            />
            <shaderMaterial
              ref={targetCylinderMaterialRef}
              args={[
                {
                  ...zoneShader,
                  transparent: true,
                  side: THREE.DoubleSide,
                  depthWrite: false,
                  depthTest: false,
                  blending: THREE.AdditiveBlending,
                  uniforms: {
                    ...zoneShader.uniforms,
                    color: { value: new THREE.Color(targetZoneColor) },
                    opacity: { value: isPreZoneChangeLevel ? 0.08 : 0.05 },
                    pulseActive: { value: isPreZoneChangeLevel ? 1.0 : 0.0 },
                  },
                },
              ]}
            />
          </mesh>

          <mesh
            ref={targetTopRingRef}
            position={[0, 20, 0]}
            rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={[safeZoneTargetRadius - 0.3, safeZoneTargetRadius, 64]}
            />
            <shaderMaterial
              args={[
                {
                  ...ringShader,
                  transparent: true,
                  side: THREE.DoubleSide,
                  depthWrite: false,
                  depthTest: false,
                  blending: THREE.AdditiveBlending,
                  uniforms: {
                    ...ringShader.uniforms,
                    color: { value: new THREE.Color(targetZoneColor) },
                    opacity: { value: isPreZoneChangeLevel ? 0.7 : 0.5 },
                  },
                },
              ]}
            />
          </mesh>

          <mesh
            ref={targetBottomRingRef}
            position={[0, -20, 0]}
            rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={[safeZoneTargetRadius - 0.3, safeZoneTargetRadius, 64]}
            />
            <shaderMaterial
              args={[
                {
                  ...ringShader,
                  transparent: true,
                  side: THREE.DoubleSide,
                  depthWrite: false,
                  depthTest: false,
                  blending: THREE.AdditiveBlending,
                  uniforms: {
                    ...ringShader.uniforms,
                    color: { value: new THREE.Color(targetZoneColor) },
                    opacity: { value: isPreZoneChangeLevel ? 0.7 : 0.5 },
                  },
                },
              ]}
            />
          </mesh>
        </>
      )}

      {isPreZoneChangeLevel && (
        <>
          <mesh ref={nextZoneCylinderRef} position={[0, 0, 0]}>
            <cylinderGeometry
              args={[
                nextZoneTargetRadius,
                nextZoneTargetRadius,
                40,
                64,
                1,
                true,
              ]}
            />
            <shaderMaterial
              ref={nextZoneCylinderMaterialRef}
              args={[
                {
                  ...zoneShader,
                  transparent: true,
                  side: THREE.DoubleSide,
                  depthWrite: false,
                  depthTest: false,
                  blending: THREE.AdditiveBlending,
                  uniforms: {
                    ...zoneShader.uniforms,
                    color: { value: new THREE.Color(nextZoneColor) },
                    opacity: { value: previewOpacity * 0.2 },
                    pulseActive: { value: 1.0 },
                  },
                },
              ]}
            />
          </mesh>

          <mesh
            ref={nextZoneTopRingRef}
            position={[0, 20, 0]}
            rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={[nextZoneTargetRadius - 0.4, nextZoneTargetRadius, 64]}
            />
            <shaderMaterial
              args={[
                {
                  ...ringShader,
                  transparent: true,
                  side: THREE.DoubleSide,
                  depthWrite: false,
                  depthTest: false,
                  blending: THREE.AdditiveBlending,
                  uniforms: {
                    ...ringShader.uniforms,
                    color: { value: new THREE.Color(nextZoneColor) },
                    opacity: { value: previewOpacity * 0.8 },
                  },
                },
              ]}
            />
          </mesh>

          <mesh
            ref={nextZoneBottomRingRef}
            position={[0, -20, 0]}
            rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={[nextZoneTargetRadius - 0.4, nextZoneTargetRadius, 64]}
            />
            <shaderMaterial
              args={[
                {
                  ...ringShader,
                  transparent: true,
                  side: THREE.DoubleSide,
                  depthWrite: false,
                  depthTest: false,
                  blending: THREE.AdditiveBlending,
                  uniforms: {
                    ...ringShader.uniforms,
                    color: { value: new THREE.Color(nextZoneColor) },
                    opacity: { value: previewOpacity * 0.8 },
                  },
                },
              ]}
            />
          </mesh>
        </>
      )}
    </group>
  ) : null;
};

export default SafeZone;

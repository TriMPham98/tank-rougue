import React, { useState, useEffect } from "react";
import { globalFPSTracker } from "../utils/fpsTracker";

interface FPSDisplayProps {
  visible?: boolean;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  updateInterval?: number; // How often to update the display (in ms)
}

const FPSDisplay: React.FC<FPSDisplayProps> = ({
  visible = true,
  position = "top-left",
  updateInterval = 500, // Update every 500ms
}) => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    averageFrameTime: 0,
    minFrameTime: 0,
    maxFrameTime: 0,
    frameCount: 0,
  });

  const [gameInfo, setGameInfo] = useState({
    level: 1,
    secondaryWeapons: 0,
  });

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      const currentMetrics = globalFPSTracker.getMetrics();
      setMetrics(currentMetrics);

      // Update game info
      setGameInfo({
        level: globalFPSTracker.getCurrentLevel(),
        secondaryWeapons: globalFPSTracker.getSecondaryWeaponCount(),
      });
    }, updateInterval);

    return () => clearInterval(interval);
  }, [visible, updateInterval]);

  if (!visible) return null;

  const getPositionStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: "fixed",
      zIndex: 9999,
      padding: "8px 12px",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      color: "#fff",
      fontFamily: "monospace",
      fontSize: "12px",
      borderRadius: "4px",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      backdropFilter: "blur(4px)",
      minWidth: "120px",
    };

    switch (position) {
      case "top-left":
        return { ...baseStyles, top: "10px", left: "10px" };
      case "top-right":
        return { ...baseStyles, top: "10px", right: "10px" };
      case "bottom-left":
        return { ...baseStyles, bottom: "10px", left: "10px" };
      case "bottom-right":
        return { ...baseStyles, bottom: "10px", right: "10px" };
      default:
        return { ...baseStyles, top: "10px", left: "10px" };
    }
  };

  const getPerformanceColor = (fps: number): string => {
    if (fps >= 55) return "#4ade80"; // Green
    if (fps >= 45) return "#fbbf24"; // Yellow
    if (fps >= 30) return "#fb923c"; // Orange
    return "#ef4444"; // Red
  };

  const getPerformanceIcon = (fps: number): string => {
    if (fps >= 55) return "✅";
    if (fps >= 45) return "🟡";
    if (fps >= 30) return "🟠";
    return "🔴";
  };

  return (
    <div style={getPositionStyles()}>
      <div style={{ marginBottom: "4px", fontWeight: "bold" }}>
        <span style={{ color: getPerformanceColor(metrics.fps) }}>
          {getPerformanceIcon(metrics.fps)} {metrics.fps.toFixed(1)} FPS
        </span>
      </div>
      <div style={{ fontSize: "10px", opacity: 0.8, marginBottom: "4px" }}>
        <div>Level: {gameInfo.level}</div>
        <div>Weapons: {gameInfo.secondaryWeapons}</div>
      </div>
      <div style={{ fontSize: "10px", opacity: 0.8 }}>
        <div>Frame: {metrics.averageFrameTime.toFixed(1)}ms</div>
        <div>Min: {metrics.minFrameTime.toFixed(1)}ms</div>
        <div>Max: {metrics.maxFrameTime.toFixed(1)}ms</div>
      </div>
    </div>
  );
};

export default FPSDisplay;

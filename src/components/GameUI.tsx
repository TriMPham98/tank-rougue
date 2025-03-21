import { useGameState } from "../utils/gameState";
import "../assets/GameUI.css";

const GameUI = () => {
  const {
    playerHealth,
    playerMaxHealth,
    score,
    level,
    enemiesDefeated,
    enemiesRequiredForNextLevel,
    isGameOver,
    isPaused,
    restartGame,
    togglePause,
  } = useGameState();

  // Calculate health percentage for health bar
  const healthPercentage = (playerHealth / playerMaxHealth) * 100;

  // Calculate level progress percentage
  const levelProgressPercentage =
    (enemiesDefeated / enemiesRequiredForNextLevel) * 100;

  // Define health bar color based on health percentage
  const getHealthColor = () => {
    if (healthPercentage > 60) return "#4caf50";
    if (healthPercentage > 30) return "#ffc107";
    return "#f44336";
  };

  // Define level color based on level
  const getLevelColor = () => {
    if (level <= 3) return "#4caf50"; // Green for early levels
    if (level <= 7) return "#2196f3"; // Blue for mid levels
    if (level <= 12) return "#ff9800"; // Orange for higher levels
    return "#f44336"; // Red for very high levels
  };

  return (
    <div className="game-ui">
      {/* Top HUD */}
      <div className="top-hud">
        <div className="health-container">
          <div className="health-label">
            HP: {playerHealth}/{playerMaxHealth}
          </div>
          <div className="health-bar-container">
            <div
              className="health-bar"
              style={{
                width: `${healthPercentage}%`,
                backgroundColor: getHealthColor(),
              }}
            />
          </div>
        </div>

        <div className="score-container">
          <div className="score-label">Score: {score}</div>
        </div>

        <div className="level-container">
          <div
            className="level-label"
            style={{
              color: getLevelColor(),
              fontWeight: "bold",
              fontSize: "1.2em",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
            <span>Level</span>
            <div
              className="level-indicator"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: getLevelColor(),
                color: "#fff",
                fontSize: "1.1em",
                fontWeight: "bold",
                boxShadow: "0 0 8px rgba(0,0,0,0.3)",
              }}>
              {level}
            </div>
          </div>
          <div
            className="level-info"
            style={{ fontSize: "0.8em", opacity: 0.8 }}>
            Enemies: {Math.floor(3 + 2.5 * Math.log10(level + 1))}
          </div>

          {/* Level progress bar */}
          <div
            className="level-progress-container"
            style={{
              width: "100%",
              height: "6px",
              backgroundColor: "#333",
              borderRadius: "3px",
              marginTop: "5px",
              overflow: "hidden",
            }}>
            <div
              className="level-progress-bar"
              style={{
                width: `${levelProgressPercentage}%`,
                height: "100%",
                backgroundColor: getLevelColor(),
                transition: "width 0.3s ease-out",
              }}
            />
          </div>
          <div
            className="level-progress-label"
            style={{
              fontSize: "0.75em",
              textAlign: "right",
              marginTop: "2px",
            }}>
            {enemiesDefeated}/{enemiesRequiredForNextLevel} for next level
          </div>
        </div>
      </div>

      {/* Game over overlay */}
      {isGameOver && (
        <div className="overlay">
          <div className="overlay-content">
            <h2>Game Over</h2>
            <p>Your score: {score}</p>
            <p>Level reached: {level}</p>
            <button onClick={restartGame}>Restart Game</button>
          </div>
        </div>
      )}

      {/* Pause overlay */}
      {isPaused && !isGameOver && (
        <div className="overlay">
          <div className="overlay-content">
            <h2>Game Paused</h2>
            <button onClick={togglePause}>Resume Game</button>
          </div>
        </div>
      )}

      {/* Controls info */}
      <div className="controls-info">
        <p>WASD: Move | J/K: Rotate Turret | Space: Shoot | ESC: Pause</p>
      </div>
    </div>
  );
};

export default GameUI;

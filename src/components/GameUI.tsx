import { useGameState } from "../utils/gameState";
import "../assets/GameUI.css";

const GameUI = () => {
  const {
    playerHealth,
    playerMaxHealth,
    score,
    level,
    isGameOver,
    isPaused,
    restartGame,
    togglePause,
  } = useGameState();

  // Calculate health percentage for health bar
  const healthPercentage = (playerHealth / playerMaxHealth) * 100;

  // Define health bar color based on health percentage
  const getHealthColor = () => {
    if (healthPercentage > 60) return "#4caf50";
    if (healthPercentage > 30) return "#ffc107";
    return "#f44336";
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
          <div className="level-label">Level: {level}</div>
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

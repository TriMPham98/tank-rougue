# Tank Rogue

A roguelike tank game built with React and Three.js where you control a tank in a procedurally generated world, fighting enemy tanks and collecting power-ups.

## Features

- 3D tank combat with shooting mechanics
- Procedurally generated levels with increasing difficulty
- Different types of enemies (tanks and turrets)
- Power-up system (health, speed, damage)
- Game state management with score, health, and levels
- Third-person camera that follows the player
- Advanced state management with Zustand
- Optimized rendering with React Three Fiber

## Controls

- **W/A/S/D** - Move the tank forward, left, backward, right
- **Q/E** - Rotate the turret left/right
- **Space** - Shoot
- **ESC** - Pause game

## Power-ups

- **Red (Health)** - Restore health
- **Blue (Speed)** - Increase movement speed
- **Orange (Damage)** - Increase weapon damage

## Enemies

- **Red Tanks** - Mobile enemies that chase the player
- **Dark Red Turrets** - Stationary enemies that rotate to aim at the player

## Recent Improvements

- Fixed state management issues that caused performance problems
- Implemented centralized player position tracking in the game state
- Added proper enemy damage handling through the game state
- Improved camera following mechanics
- Enhanced lighting and shadows for better visuals
- Fixed initialization of enemies and power-ups

## Architecture

The game uses a centralized state management approach with Zustand:

1. **Game State**: Core state management for player stats, enemies, power-ups, and game status
2. **Components**: React components for UI and game elements
3. **Models**: 3D models and behavior for tanks, enemies, and projectiles
4. **Hooks**: Custom React hooks for keyboard controls and other functionality

## Development

### Prerequisites

- Node.js (v14.x or higher)
- npm or yarn

### Installation

1. Clone the repository

   ```
   git clone https://github.com/yourusername/tank-rogue.git
   cd tank-rogue
   ```

2. Install dependencies

   ```
   npm install
   ```

3. Run the development server

   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Technology Stack

- **React** - UI framework
- **Three.js** - 3D rendering
- **React Three Fiber** - React renderer for Three.js
- **React Three Drei** - Useful helpers for React Three Fiber
- **Zustand** - State management
- **TypeScript** - Type safety
- **Vite** - Fast development server and build tool

## Future Improvements

- Add sound effects and background music
- Implement more enemy types
- Add obstacles and terrain variations
- Create more weapon types
- Implement a minimap
- Add local storage for saving high scores
- Implement game levels with increasing difficulty
- Add mobile device support with touch controls

## License

MIT

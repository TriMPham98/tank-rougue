# 🎮 Game Performance Monitoring Guide

This guide explains how to monitor and measure your game's performance using the built-in FPS tracking system.

## 📊 Automatic Console Logging

The game automatically tracks and logs performance metrics to the browser console **ONLY when you advance to a new level**. Open your browser's developer tools (F12) and check the Console tab to see:

- **Current Level**: Your current game level
- **Secondary Weapons**: Number of secondary weapons equipped
- **Average FPS**: Frames per second over the last 60 frames
- **Average Frame Time**: Time taken to render each frame (in milliseconds)
- **Best/Worst Frame Time**: Performance range indicators
- **Performance Assessment**: Automatic rating (Excellent/Good/Fair/Poor)
- **Level Change Analysis**: Special insights when advancing levels

## ⌨️ Keyboard Shortcuts

While playing the game, you can use these keyboard shortcuts for real-time performance monitoring:

| Shortcut    | Action                                          |
| ----------- | ----------------------------------------------- |
| `Shift + F` | Show current level, weapons, and FPS in console |
| `Shift + P` | Force detailed performance report to console    |
| `Shift + H` | Toggle on-screen FPS display                    |

## 📈 On-Screen FPS Display

Press `Shift + H` to show/hide a real-time FPS counter in the top-right corner of the screen. The display shows:

- **Current FPS** with color-coded performance indicator
- **Current Level** and **Secondary Weapon Count**
- **Frame Time** (average time per frame)
- **Min/Max Frame Times** (performance range)

### Performance Color Coding:

- 🟢 **Green (55+ FPS)**: Excellent performance
- 🟡 **Yellow (45-54 FPS)**: Good performance
- 🟠 **Orange (30-44 FPS)**: Fair performance
- 🔴 **Red (<30 FPS)**: Poor performance

## 🔧 Technical Details

### How It Works

- Uses `performance.now()` for high-precision timing
- Tracks the last 60 frames for rolling average calculations
- Integrates with React Three Fiber's `useFrame` hook
- Minimal performance overhead (< 0.1ms per frame)

### Metrics Explained

- **FPS (Frames Per Second)**: How many frames your game renders each second. Higher is better.
- **Frame Time**: How long each frame takes to render. Lower is better (16.67ms = 60 FPS).
- **Min/Max Frame Times**: Shows performance consistency. Smaller range = more stable performance.

## 🎯 Performance Targets

For optimal gaming experience:

- **Target**: 60 FPS (16.67ms frame time)
- **Minimum**: 30 FPS (33.33ms frame time)
- **Excellent**: 55+ FPS consistently
- **Playable**: 30+ FPS with minimal drops

## 🐛 Troubleshooting Performance Issues

If you're experiencing low FPS:

1. **Check Console Logs**: Look for performance warnings or errors
2. **Monitor Frame Time Spikes**: Large max frame times indicate stuttering
3. **Test Different Scenarios**: Performance may vary by game level or enemy count
4. **Browser Performance**: Try closing other tabs or applications

## 💡 Tips for Better Performance

- Use the FPS display to identify performance bottlenecks
- Monitor performance during intense gameplay moments
- **Watch for performance drops when advancing levels** - automatic level reports help identify problematic levels
- **Track secondary weapon impact** - more weapons = more processing overhead
- **Use `Shift + P` for manual performance checks** - since automatic logging only happens on level changes
- Check if performance degrades over time (memory leaks)
- Compare performance across different browsers/devices
- **Level-specific optimization**: Use the per-level reports to identify which levels cause performance issues

---

_The FPS tracking system is designed to help you optimize your game's performance and ensure a smooth gaming experience for all players._

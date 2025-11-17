# Story Point Knights Team Battle

A browser-based team combat game where ALL players fight simultaneously on screen in fast-paced battles.

![Game Type](https://img.shields.io/badge/Type-Browser%20Game-blue)
![No Dependencies](https://img.shields.io/badge/Dependencies-None-green)
![Players](https://img.shields.io/badge/Players-2--20-orange)

## Overview

Story Point Knights Team Battle is a chaotic, action-packed game where:
- ALL players displayed and fighting on screen at once
- Players with same story points = teammates
- Teams automatically split left vs right
- Fast movement and simultaneous combat
- Player controls one knight, AI controls the rest
- Same team cannot attack each other
- Last team standing wins!

## Features

- **Team-Based Combat**: Same story points = teammates, auto-split into left vs right
- **All Players On Screen**: Every knight displayed and fighting simultaneously
- **Random Stats**: Each player gets 5 unique stat bonuses affecting HP and damage
- **Fast-Paced Action**: 2.5x faster movement than original version
- **Smart AI**: All non-player knights autonomously seek and attack enemies
- **Team Protection**: Same team cannot damage each other
- **Simple Controls**: Arrow keys for movement, space bar to attack
- **No Installation**: Runs directly in any modern web browser

## How to Launch

### Method 1: Double-Click (Easiest)
1. Navigate to the game folder
2. Double-click `index.html`
3. The game will open in your default web browser

### Method 2: Open from Browser
1. Open your web browser (Chrome, Firefox, Safari, Edge)
2. Press `Ctrl+O` (Windows/Linux) or `Cmd+O` (Mac)
3. Navigate to and select `index.html`
4. Click "Open"

### Method 3: Drag and Drop
1. Open your web browser
2. Drag `index.html` into the browser window
3. Drop to launch

### Method 4: Local Server (Optional)
If you prefer using a local server:

**Python 3:**
```bash
python -m http.server 8000
```

**Python 2:**
```bash
python -m SimpleHTTPServer 8000
```

**Node.js (http-server):**
```bash
npx http-server
```

Then open `http://localhost:8000` in your browser.

## How to Play

### Setup Phase
1. **Add Players**: Enter player names and select story points (Fibonacci: 1, 2, 3, 5, 8, 13, 21, 34, 55, 89)
2. **Team Formation**: Players with same story points automatically become teammates
3. **Review Stats**: Each player gets random stats showing their HP and damage
4. **Start Battle**: Need at least 2 players to begin

### Battle Phase
**ALL players spawn immediately and fight at once!**

**Teams:**
- Left side: Lower story point values (RED)
- Right side: Higher story point values (CYAN)
- Same team members have matching colors
- Story point badges shown below each knight

**Controls:**
- **Arrow Keys** (↑↓←→) or **WASD**: Move your knight (first one added)
- **Space Bar**: Attack nearby enemies
- **AI**: All other knights fight autonomously

**Battle Info:**
- Green/yellow/red health bars show HP remaining
- Attack range shown as circles when attacking
- Live counter shows knights alive per team
- Battle log shows all combat events
- Center line divides the battlefield

### Victory
- Eliminate all enemy team members to win
- Your team's survivors and stats displayed
- Start a new battle with different teams

## Game Mechanics

### Stats System
Each player receives 5 random stat levels (1-5):
- **Stat 1**: HP Boost - adds 3-15 HP
- **Stat 2**: Damage Boost - adds 2-10 damage
- **Stat 3**: Balanced - adds 1-5 HP and damage
- **Stat 4**: Extra HP - adds 2-10 HP
- **Stat 5**: Extra Damage - adds 1.5-7.5 damage

Base stats: 20 HP, 5 damage

### Combat
- Attack range: 100 pixels
- Attack cooldown: ~0.33 seconds (20 frames)
- Movement speed: 8 pixels per frame (FAST!)
- Knights can move freely in all directions
- Team-based: Cannot attack same team
- AI re-evaluates targets every 15 frames
- Battles end when one entire team is eliminated

### Team Formation
- Story points determine team membership
- Lower half of story point values → Left team (RED)
- Upper half of story point values → Right team (CYAN)
- If all same story points, alternates players left/right
- Visual team indicators: color + story point badges

## Browser Compatibility

Works on all modern browsers:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Opera 76+

## Technical Details

- **No Dependencies**: Pure HTML, CSS, and JavaScript
- **No Build Process**: Works immediately without compilation
- **No Internet Required**: Fully offline capable
- **Canvas-Based**: Smooth 60 FPS rendering at 1400×800px
- **AI System**: Autonomous knight behavior with target acquisition
- **Team Logic**: Smart attack validation prevents friendly fire

## File Structure

```
Story Point Knights Team Battle/
├── index.html    # Main game structure (3 screens)
├── styles.css    # Visual styling and animations
├── game.js       # Game logic, AI, team system
├── CLAUDE.md     # Developer documentation
└── README.md     # This file
```

## Troubleshooting

**Game won't load?**
- Ensure JavaScript is enabled in your browser
- Try a different browser
- Check browser console for errors (F12)

**Controls not working?**
- Click on the game canvas to focus it
- Make sure you're in battle phase
- You only control the FIRST knight added (all others are AI)
- Check that your knight is alive (not showing 💀)

**Performance issues?**
- Close other browser tabs
- Try a different browser (Chrome recommended)
- Restart your browser

## Credits

Created with vanilla JavaScript - no frameworks, no dependencies, just pure game development fun!

## License

Free to use and modify for personal and educational purposes.

---

**Ready to battle?** Just open `index.html` and let the tournament begin! ⚔️

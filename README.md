# Battle Cursor

An intense cursor-based combat arena game with endless waves, diverse enemies, and explosive action!

![image alt](https://github.com/Yasas-Sri/Battle-cursor/blob/d03e4c68de588865bfa7f1d064b723f5db25f931/Screenshot%20from%202025-12-04%2020-32-09.png) 
![image alt](https://github.com/Yasas-Sri/Battle-cursor/blob/d03e4c68de588865bfa7f1d064b723f5db25f931/Screenshot%20from%202025-12-04%2020-32-45.png)

## Features

### Core Combat System

- **Unique Cursor Combat**: Control a glowing cursor in fast-paced arena combat
- **Advanced Shooting**:
  - **Quick Shot**: Left-click to fire projectiles
  - **Charge Shot**: Hold left-click to charge a 3x damage power shot
  - **Multi-Shot**: Power-up that fires 3 bullets in a spread
  - **Bullet Bouncing**: Shots ricochet off walls
- **Tactical Abilities**:
  - **Dash**: Right-click for quick dodges with invulnerability
  - **Wall Placement**: Click and drag to create defensive barriers
  - **Shield**: Absorbs damage when activated

### Enemy Types

- **Normal** : Balanced enemies
- **Sniper** : Long-range attackers that keep distance
- **Tank** : High health, slow but deadly
- **Splitter** : Divides into smaller enemies on death
- **Kamikaze** : Explodes on contact, damaging nearby foes
- **Support** : Heals other enemies
- **Boss** : Powerful multi-phase enemies every 10 kills

### Power-Up System

- **Speed Boost**: Increased movement
- **Rapid Fire**: Faster shooting
- **Shield**: 3-hit protection
- **Multi-Shot**: Fire 3 bullets at once
- **Slow Motion**: Slows down time
- **Magnet**: Auto-collect power-ups

### Progression Features

- **Dynamic Difficulty**: Enemies scale with time survived and kills
- **Combo System**: Chain kills for up to 5x score multipliers
- **Wave Progression**: Track difficulty through wave numbers
- **Boss Waves**: Epic battles every 10 enemy defeats
- **Local Leaderboard**: Top 10 high scores saved

### Visual Polish

- **Particle Effects**: Explosive visual feedback
- **Screen Shake**: Dynamic camera on big hits
- **Damage Numbers**: Floating combat text with combo highlights
- **Health Bars**: Enemy health visualization
- **Neon Aesthetic**: Cyberpunk-inspired glowing effects

## How to Play

1. Open `index.html` in your browser
2. Click "Start Game"
3. Survive and defeat as many enemies as you can!

##  Controls

- **W/A/S/D**: Move your cursor
- **Left Click**: Quick shoot
- **Hold Left Click**: Charge powerful shot (1 second)
- **Right Click**: Dash with invulnerability (3-second cooldown)
- **Click + Drag**: Place walls (4-second cooldown)

## Objective

Survive as long as possible, defeat enemies, build combos, and achieve the highest score!

Survive as long as possible, defeat enemies, and rack up the highest score!

## Project Structure

```
Battle Cursor/
├── index.html      # Main HTML file
├── styles.css      # Game styling and UI
├── game.js         # Complete game logic
└── README.md       # This file
```

## 🎮 Game Mechanics

### Player Stats

- **Health**: 5 HP
- **Dash Distance**: 150px
- **Dash Cooldown**: 3 seconds
- **Shoot Cooldown**: 0.25 seconds

### Walls

- **Duration**: 2 seconds
- **Max Length**: 150px
- **Cooldown**: 4 seconds
- Blocks projectiles but not players

### Enemies

- Spawn continuously throughout the match
- Move towards the player
- Shoot projectiles
- Worth 100 points each

## Visual Features

- **Neon aesthetics** with cyan and magenta color scheme
- **Particle trails** for movement and projectiles
- **Glowing effects** on all game objects
- **Grid-based background** for spatial awareness
- **Smooth animations** and transitions

## Technical Details

- Pure JavaScript (no frameworks)
- HTML5 Canvas for rendering
- 60 FPS game loop
- Efficient collision detection
- Responsive design

# 🎄 Christmas Magic / ⭐ Starry Night

**English** | [中文版](README_ZH.md)

A 3D particle effects project based on Three.js and MediaPipe, with gesture interaction control. Includes two effect modes: **Christmas Tree** and **Starry Night Constellations**, switchable in real-time.

## ✨ Features

### 🎄 Christmas Tree Mode
- 🌟 **Particle Christmas Tree** - 2500+ golden particles forming a 3D Christmas tree with layers and trunk
- 🎁 **Christmas Gifts** - 20 different colored and sized 3D gift boxes floating in the tree
- 📷 **Photo Wall** - 15 photos randomly distributed among particles, clickable to enlarge
- ⭐ **Twinkling Stars** - Tree-top star + starry background + scattered twinkling particles

### ⭐ Starry Night Mode
- 🌌 **7 Constellations** - Orion, Ursa Major, Scorpius, Cygnus, Leo, Andromeda, Gemini
- ✨ **Constellation Lines** - Lines between stars change with selection state
- 🌠 **Shooting Stars** - Random shooting stars across the night sky
- 🌈 **Nebula Background** - Purple and blue nebula particles
- 📍 **Constellation Info** - Hover or click to show constellation names in Chinese and English

### 🖐️ Common Features
- **Gesture Control** - Interact through camera-recognized gestures
- 💫 **Physics Effects** - Particles with inertia, gravity, damping and other physical properties
- 🌸 **Bloom Effect** - Post-processing glow effect
- 🔄 **Effect Switcher** - One-click switch between effects via top-right buttons

## 🎮 Gesture Controls

| Gesture | Christmas Mode | Starry Mode |
|---------|----------------|-------------|
| ✋ **Open Palm** | Rotate tree + distance zoom | Rotate sky + distance zoom |
| ☝️ **Point Finger** | Select photo (hover 0.5s) | Highlight constellation |
| 🤏 **Pinch** | Zoom view (with inertia) | Zoom view (with inertia) |
| ✊ **Fist** | Transform to sphere | Gather scattered stars |
| ✌️ **V Sign** | Explode/gather particles | Scatter/gather stars |
| 🖱️ **Mouse Click** | Click photo to enlarge | Select/deselect constellation |

## 🚀 Quick Start

### Option 1: VS Code Live Server

1. Install **Live Server** extension in VS Code
2. Right-click on `index.html`
3. Select **Open with Live Server**
4. Browser opens automatically at `http://127.0.0.1:5500`

### Option 2: Python HTTP Server

```bash
# Python 3
cd christmas-magic
python -m http.server 8080

# Then open browser
# http://localhost:8080
```

### Option 3: Node.js

```bash
# Install http-server (if not installed)
npm install -g http-server

# Run
cd christmas-magic
http-server -p 8080

# Visit http://localhost:8080
```

### Option 4: PowerShell Simple Server

```powershell
cd christmas-magic
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8080/")
$listener.Start()
Write-Host "Server running at http://localhost:8080"
# Press Ctrl+C to stop
```

## ⚠️ Important Notes

1. **Must use HTTP Server**
   - Cannot open `index.html` directly by double-clicking
   - ES modules and camera permissions require HTTP server

2. **Camera Permission Required**
   - Browser will request camera permission on first visit
   - Click "Allow" to enable gesture control

3. **Recommended Browsers**
   - Chrome (Recommended)
   - Edge
   - Firefox

4. **HTTPS Requirement**
   - HTTPS is required when deploying to remote servers
   - HTTP works for localhost

## 📁 Project Structure

```
christmas-magic/
├── index.html       # Main HTML file with shader code
├── style.css        # Stylesheet
├── main.js          # Main entry, effect switching logic
├── script.js        # Christmas tree effect logic
├── starry-night.js  # Starry night constellation effect logic
├── README.md        # English documentation
└── README_ZH.md     # Chinese documentation
```

## 🛠️ Tech Stack

- **Three.js v0.160.0** - 3D rendering engine
- **MediaPipe Hands** - Gesture recognition
- **GLSL** - Custom particle shaders
- **ES Modules** - JavaScript modularization

## 🎨 Customization

Modify the `CONFIG` object in `script.js` to adjust effects:

```javascript
const CONFIG = {
    tree: {
        particleCount: 2500,  // Number of particles
        height: 4,            // Tree height
        baseRadius: 1.5,      // Base radius
    },
    physics: {
        gravity: -0.0003,     // Gravity
        damping: 0.95,        // Damping
        returnForce: 0.008,   // Return force
    },
    bloom: {
        strength: 1.5,        // Glow strength
        radius: 0.4,          // Glow radius
    },
    // ...
};
```

## 🐛 FAQ

### Q: Gesture recognition not working?
- Ensure camera permission is granted
- Check if lighting is sufficient
- Keep hands visible in camera view

### Q: Blank page?
- Make sure to use HTTP server instead of opening file directly
- Check browser console for errors
- Ensure network can access CDN resources

### Q: Performance issues?
- Reduce `CONFIG.tree.particleCount` particle count
- Lower `CONFIG.bloom.strength` glow intensity
- Close other resource-intensive programs

## 📜 License

MIT License

---

🎅 **Merry Christmas!** 🎄

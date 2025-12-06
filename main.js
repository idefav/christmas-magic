
// ============================================
// Main Entry Point - Effect Switcher
// Supports switching between Christmas Tree and Starry Night
// ============================================

// 当前效果模式
let currentMode = 'christmas'; // 'christmas' | 'starry'
let christmasModule = null;
let starryModule = null;
let handsInitialized = false;

// DOM Elements
const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');

// MediaPipe Hands (shared)
let hands = null;
let handCamera = null;

// ============================================
// Effect Switcher UI
// ============================================

function createSwitcherUI() {
    const switcher = document.createElement('div');
    switcher.id = 'effect-switcher';
    switcher.innerHTML = `
        <button id="btn-christmas" class="effect-btn active" title="Christmas Tree">
            🎄
        </button>
        <button id="btn-starry" class="effect-btn" title="Starry Night">
            ⭐
        </button>
    `;
    document.body.appendChild(switcher);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        #effect-switcher {
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 1000;
        }
        
        .effect-btn {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.3);
            background: rgba(0, 0, 0, 0.5);
            color: white;
            font-size: 24px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .effect-btn:hover {
            border-color: rgba(255, 255, 255, 0.8);
            transform: scale(1.1);
            background: rgba(0, 0, 0, 0.7);
        }
        
        .effect-btn.active {
            border-color: #ffd700;
            box-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
            background: rgba(255, 215, 0, 0.2);
        }
        
        #btn-starry.active {
            border-color: #87CEEB;
            box-shadow: 0 0 15px rgba(135, 206, 235, 0.5);
            background: rgba(135, 206, 235, 0.2);
        }
        
        .effect-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        /* Transition overlay */
        #transition-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: black;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.5s ease;
            z-index: 999;
        }
        
        #transition-overlay.active {
            opacity: 1;
        }
    `;
    document.head.appendChild(style);
    
    // Add transition overlay
    const overlay = document.createElement('div');
    overlay.id = 'transition-overlay';
    document.body.appendChild(overlay);
    
    // Event listeners
    document.getElementById('btn-christmas').addEventListener('click', () => switchEffect('christmas'));
    document.getElementById('btn-starry').addEventListener('click', () => switchEffect('starry'));
}

// ============================================
// Effect Switching Logic
// ============================================

async function switchEffect(mode) {
    if (mode === currentMode) return;
    
    const btnChristmas = document.getElementById('btn-christmas');
    const btnStarry = document.getElementById('btn-starry');
    const overlay = document.getElementById('transition-overlay');
    
    // Disable buttons during transition
    btnChristmas.disabled = true;
    btnStarry.disabled = true;
    
    // Show transition overlay
    overlay.classList.add('active');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Clean up current effect
    cleanupCurrentEffect();
    
    // Remove constellation info if exists
    const constellationInfo = document.getElementById('constellation-info');
    if (constellationInfo) {
        constellationInfo.remove();
    }
    
    // Switch mode
    currentMode = mode;
    
    // Update button states
    btnChristmas.classList.toggle('active', mode === 'christmas');
    btnStarry.classList.toggle('active', mode === 'starry');
    
    // Initialize new effect
    if (mode === 'christmas') {
        await initChristmasEffect();
    } else {
        await initStarryEffect();
    }
    
    // Hide transition overlay
    await new Promise(resolve => setTimeout(resolve, 300));
    overlay.classList.remove('active');
    
    // Re-enable buttons
    btnChristmas.disabled = false;
    btnStarry.disabled = false;
    
    console.log(`✨ Switched to ${mode === 'christmas' ? '🎄 Christmas Tree' : '⭐ Starry Night'} effect`);
}

function cleanupCurrentEffect() {
    // Get the canvas and clear it
    const canvas = document.getElementById('three-canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
}

async function initChristmasEffect() {
    if (!christmasModule) {
        try {
            christmasModule = await import('./script.js');
            console.log('Christmas module loaded:', christmasModule);
            console.log('Available exports:', Object.keys(christmasModule));
        } catch (error) {
            console.error('Failed to load script.js:', error);
            return;
        }
    }
    
    if (typeof christmasModule.initThreeScene === 'function') {
        christmasModule.initThreeScene();
    } else {
        console.error('initThreeScene is not a function:', christmasModule.initThreeScene);
        console.error('Module contents:', christmasModule);
    }
    
    // Update title
    const titleElement = document.getElementById('title');
    if (titleElement) {
        titleElement.textContent = 'MERRY CHRISTMAS';
        titleElement.style.textShadow = '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.4)';
    }
    
    // Update hands callback
    if (hands) {
        hands.onResults(christmasModule.onResults);
    }
}

async function initStarryEffect() {
    if (!starryModule) {
        try {
            starryModule = await import('./starry-night-v2.js');
            console.log('Starry module loaded:', starryModule);
            console.log('Available exports:', Object.keys(starryModule));
        } catch (error) {
            console.error('Failed to load starry-night-v2.js:', error);
            return;
        }
    }
    
    if (typeof starryModule.initThreeScene === 'function') {
        starryModule.initThreeScene();
    } else {
        console.error('initThreeScene is not a function:', starryModule.initThreeScene);
    }
    
    // Update title
    const titleElement = document.getElementById('title');
    if (titleElement) {
        titleElement.textContent = 'STARRY NIGHT';
        titleElement.style.textShadow = '0 0 20px rgba(135, 206, 235, 0.8), 0 0 40px rgba(135, 206, 235, 0.4)';
    }
    
    // Update hands callback
    if (hands) {
        hands.onResults(starryModule.onResults);
    }
}

// ============================================
// MediaPipe Hands Initialization
// ============================================

async function initHands() {
    hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
    });

    handCamera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({ image: videoElement });
        },
        width: 640,
        height: 480
    });
    
    handsInitialized = true;
}

// ============================================
// Main Initialization
// ============================================

async function init() {
    // Set canvas size for debug view
    canvasElement.width = 640;
    canvasElement.height = 480;
    
    // Create switcher UI
    createSwitcherUI();
    
    // Initialize hands
    await initHands();
    
    // Initialize default effect (Christmas)
    await initChristmasEffect();
    
    // Start hand tracking
    handCamera.start();
    
    console.log('🎉 Effect Switcher initialized!');
    console.log('📍 Click the buttons in the top-right corner to switch effects:');
    console.log('   🎄 Christmas Tree - 3D particle Christmas tree with gifts');
    console.log('   ⭐ Starry Night - Constellations in the night sky');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

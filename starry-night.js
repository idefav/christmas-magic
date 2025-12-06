
// ============================================
// Starry Night - Enhanced Constellation Effect
// Three.js + MediaPipe Hands
// 12 Zodiac + Famous Constellations with Grab Effect
// ============================================

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CONSTELLATIONS } from './constellations.js';

// === DOM Elements (lazy initialization) ===
let canvas, cursor, loading, videoElement, canvasElement, canvasCtx;

function initDOMElements() {
    canvas = document.getElementById('three-canvas');
    cursor = document.getElementById('cursor');
    loading = document.getElementById('loading');
    videoElement = document.getElementById('input_video');
    canvasElement = document.getElementById('output_canvas');
    canvasCtx = canvasElement.getContext('2d');
}

// === Three.js Variables ===
let scene, camera, renderer, composer;
let starGroup;
let constellationGroups = {};
let constellationStars = [];
let constellationLines = [];
let bgParticles;
let starUniforms, bgUniforms;
let raycaster, mouse;

// 状态
let isScattered = false;
let grabbedConstellation = null;
let grabStartPos = new THREE.Vector3();

// Hand tracking state
let smoothedHandSize = 0;
let handSizeCalibrated = false;
let handSizeBaseline = 0;
let lastHandSize = 0;
let gestureStartTime = 0;

// === Configuration ===
const CONFIG = {
    physics: { damping: 0.96, returnForce: 0.01 },
    starField: { count: 1500, radius: 100 },
    bloom: { strength: 2.5, radius: 0.6, threshold: 0.08 },
    camera: { fov: 60, near: 0.1, far: 1000, initialZ: 15, minZ: 6, maxZ: 30 }
};

// === Gesture State ===
let lastGesture = 'NONE';
let lastHandPos = { x: 0.5, y: 0.5 };
let smoothedPos = { x: 0.5, y: 0.5 };
let isGestureActive = false;
let autoRotate = true;
let gestureVelocity = { rotX: 0, rotY: 0, zoom: 0 };
let highlightedConstellation = null;
let constellationInfoElement = null;
let shootingStars = [];

// ============================================
// Three.js Scene Initialization
// ============================================

export function initThreeScene() {
    // Initialize DOM elements first
    initDOMElements();
    
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000511);
    
    // Camera
    camera = new THREE.PerspectiveCamera(
        CONFIG.camera.fov,
        window.innerWidth / window.innerHeight,
        CONFIG.camera.near,
        CONFIG.camera.far
    );
    camera.position.z = CONFIG.camera.initialZ;
    
    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Star Group
    starGroup = new THREE.Group();
    scene.add(starGroup);
    
    // Raycaster
    raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 0.3;
    mouse = new THREE.Vector2();
    
    // Create scene elements
    createConstellations();
    createBackgroundStars();
    createNebulaParticles();
    createShootingStars();
    
    // Post-processing
    setupPostProcessing();
    
    // Create constellation info display
    createConstellationInfo();
    
    // Event listeners
    window.addEventListener('resize', onWindowResize);
    canvas.addEventListener('click', onCanvasClick);
    
    // Start animation
    animate();
}

// ============================================
// Constellation System
// ============================================

function createConstellations() {
    const constellationKeys = Object.keys(CONSTELLATIONS);
    
    constellationKeys.forEach((key, constIndex) => {
        const constellation = CONSTELLATIONS[key];
        const baseOffset = new THREE.Vector3(
            (constIndex % 3 - 1) * 3,
            Math.floor(constIndex / 3) * 2 - 1,
            (Math.random() - 0.5) * 2
        );
        
        const starMeshes = [];
        constellation.stars.forEach((starData, starIndex) => {
            const position = new THREE.Vector3(
                starData.x + baseOffset.x,
                starData.y + baseOffset.y,
                starData.z + baseOffset.z
            );
            
            const starMesh = createStarSprite(starData.size, constellation.color, starData.name);
            starMesh.position.copy(position);
            starMesh.userData = {
                constellation: key,
                starIndex: starIndex,
                originalPosition: position.clone(),
                targetPosition: position.clone(),
                velocity: new THREE.Vector3(0, 0, 0),
                phase: {
                    offset: Math.random() * Math.PI * 2,
                    speed: 0.5 + Math.random() * 1.5,
                    amplitude: 0.002 + Math.random() * 0.003
                },
                baseSize: starData.size,
                name: starData.name
            };
            
            starGroup.add(starMesh);
            starMeshes.push(starMesh);
            constellationStars.push(starMesh);
        });
        
        constellation.lines.forEach(([startIdx, endIdx]) => {
            const line = createConstellationLine(
                starMeshes[startIdx].position,
                starMeshes[endIdx].position,
                constellation.color
            );
            line.userData = {
                constellation: key,
                startStar: starMeshes[startIdx],
                endStar: starMeshes[endIdx]
            };
            starGroup.add(line);
            constellationLines.push(line);
        });
    });
}

function createStarSprite(size, color, name) {
    const canvas2d = document.createElement('canvas');
    canvas2d.width = 64;
    canvas2d.height = 64;
    const ctx = canvas2d.getContext('2d');
    
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    const colorObj = new THREE.Color(color);
    
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.1, `rgb(${Math.floor(colorObj.r * 255)}, ${Math.floor(colorObj.g * 255)}, ${Math.floor(colorObj.b * 255)})`);
    gradient.addColorStop(0.4, `rgba(${Math.floor(colorObj.r * 255)}, ${Math.floor(colorObj.g * 255)}, ${Math.floor(colorObj.b * 255)}, 0.5)`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    if (size > 1.2) {
        ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(32, 8);
        ctx.lineTo(32, 56);
        ctx.moveTo(8, 32);
        ctx.lineTo(56, 32);
        ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas2d);
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size * 0.5, size * 0.5, 1);
    
    return sprite;
}

function createConstellationLine(start, end, color) {
    const points = [start.clone(), end.clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
    });
    
    return new THREE.Line(geometry, material);
}

function updateConstellationLines() {
    constellationLines.forEach(line => {
        const positions = line.geometry.attributes.position.array;
        const startStar = line.userData.startStar;
        const endStar = line.userData.endStar;
        
        positions[0] = startStar.position.x;
        positions[1] = startStar.position.y;
        positions[2] = startStar.position.z;
        positions[3] = endStar.position.x;
        positions[4] = endStar.position.y;
        positions[5] = endStar.position.z;
        
        line.geometry.attributes.position.needsUpdate = true;
    });
}

// ============================================
// Background Stars
// ============================================

function createBackgroundStars() {
    const { count, radius } = CONFIG.starField;
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const randoms = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = radius * (0.5 + Math.random() * 0.5);
        
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
        
        const colorChoice = Math.random();
        if (colorChoice < 0.6) {
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 1.0;
            colors[i * 3 + 2] = 1.0;
        } else if (colorChoice < 0.8) {
            colors[i * 3] = 0.7 + Math.random() * 0.3;
            colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
            colors[i * 3 + 2] = 1.0;
        } else {
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
            colors[i * 3 + 2] = 0.5 + Math.random() * 0.3;
        }
        
        sizes[i] = 0.5 + Math.random() * 2.0;
        randoms[i] = Math.random();
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    
    starUniforms = {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
    };
    
    const material = new THREE.ShaderMaterial({
        vertexShader: `
            uniform float uTime;
            uniform float uPixelRatio;
            attribute vec3 aColor;
            attribute float aSize;
            attribute float aRandom;
            varying vec3 vColor;
            varying float vAlpha;
            
            void main() {
                vColor = aColor;
                
                vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                vec4 viewPosition = viewMatrix * modelPosition;
                vec4 projectedPosition = projectionMatrix * viewPosition;
                gl_Position = projectedPosition;
                
                float twinkle = sin(uTime * (1.0 + aRandom * 2.0) + aRandom * 6.28) * 0.4 + 0.6;
                vAlpha = twinkle * (0.4 + aRandom * 0.6);
                
                gl_PointSize = aSize * uPixelRatio * twinkle * (100.0 / -viewPosition.z);
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vAlpha;
            
            void main() {
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha = pow(alpha, 1.5);
                
                gl_FragColor = vec4(vColor, alpha * vAlpha);
            }
        `,
        uniforms: starUniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const stars = new THREE.Points(geometry, material);
    scene.add(stars);
}

// ============================================
// Nebula Particles
// ============================================

function createNebulaParticles() {
    const count = 150;
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const randoms = new Float32Array(count);
    
    const nebulaColors = [
        new THREE.Color(0x4B0082),
        new THREE.Color(0x8A2BE2),
        new THREE.Color(0x9370DB),
        new THREE.Color(0x1E90FF),
        new THREE.Color(0xFF69B4),
        new THREE.Color(0x00CED1),
    ];
    
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 40;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 10;
        
        const color = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        sizes[i] = 2 + Math.random() * 5;
        randoms[i] = Math.random();
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    
    bgUniforms = {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
    };
    
    const material = new THREE.ShaderMaterial({
        vertexShader: `
            uniform float uTime;
            uniform float uPixelRatio;
            attribute vec3 aColor;
            attribute float aSize;
            attribute float aRandom;
            varying vec3 vColor;
            varying float vAlpha;
            
            void main() {
                vColor = aColor;
                
                vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                vec4 viewPosition = viewMatrix * modelPosition;
                vec4 projectedPosition = projectionMatrix * viewPosition;
                gl_Position = projectedPosition;
                
                float pulse = sin(uTime * 0.3 + aRandom * 6.28) * 0.3 + 0.7;
                vAlpha = pulse * 0.15;
                
                gl_PointSize = aSize * uPixelRatio * pulse * (150.0 / -viewPosition.z);
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vAlpha;
            
            void main() {
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha = pow(alpha, 2.0);
                
                gl_FragColor = vec4(vColor, alpha * vAlpha);
            }
        `,
        uniforms: bgUniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    bgParticles = new THREE.Points(geometry, material);
    scene.add(bgParticles);
}

// ============================================
// Shooting Stars
// ============================================

function createShootingStars() {
    setInterval(() => {
        if (Math.random() > 0.7) {
            createShootingStar();
        }
    }, 2000);
}

function createShootingStar() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(30 * 3);
    
    const startX = (Math.random() - 0.5) * 30;
    const startY = 10 + Math.random() * 5;
    const startZ = -5 + Math.random() * 10;
    
    const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        -1,
        (Math.random() - 0.5)
    ).normalize();
    
    for (let i = 0; i < 30; i++) {
        positions[i * 3] = startX;
        positions[i * 3 + 1] = startY;
        positions[i * 3 + 2] = startZ;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.LineBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    const line = new THREE.Line(geometry, material);
    line.userData = {
        startPos: new THREE.Vector3(startX, startY, startZ),
        direction: direction,
        speed: 0.5 + Math.random() * 0.3,
        progress: 0,
        life: 1.0
    };
    
    scene.add(line);
    shootingStars.push(line);
}

function updateShootingStars() {
    for (let i = shootingStars.length - 1; i >= 0; i--) {
        const star = shootingStars[i];
        const data = star.userData;
        data.progress += data.speed * 0.05;
        data.life -= 0.02;
        
        if (data.life <= 0) {
            scene.remove(star);
            star.geometry.dispose();
            star.material.dispose();
            shootingStars.splice(i, 1);
            continue;
        }
        
        const positions = star.geometry.attributes.position.array;
        for (let j = 29; j > 0; j--) {
            positions[j * 3] = positions[(j - 1) * 3];
            positions[j * 3 + 1] = positions[(j - 1) * 3 + 1];
            positions[j * 3 + 2] = positions[(j - 1) * 3 + 2];
        }
        
        positions[0] = data.startPos.x + data.direction.x * data.progress * 20;
        positions[1] = data.startPos.y + data.direction.y * data.progress * 20;
        positions[2] = data.startPos.z + data.direction.z * data.progress * 20;
        
        star.geometry.attributes.position.needsUpdate = true;
        star.material.opacity = data.life * 0.8;
    }
}

// ============================================
// Constellation Info Display
// ============================================

function createConstellationInfo() {
    constellationInfoElement = document.createElement('div');
    constellationInfoElement.id = 'constellation-info';
    constellationInfoElement.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 20, 0.8);
        border: 1px solid rgba(135, 206, 235, 0.5);
        border-radius: 10px;
        padding: 15px 25px;
        color: white;
        font-family: 'Segoe UI', Arial, sans-serif;
        text-align: center;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
        z-index: 100;
    `;
    document.body.appendChild(constellationInfoElement);
}

function showConstellationInfo(constellation) {
    if (!constellationInfoElement) return;
    
    const data = CONSTELLATIONS[constellation];
    constellationInfoElement.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 5px;">${data.nameCN}</div>
        <div style="font-size: 14px; color: rgba(255,255,255,0.7);">${data.name}</div>
        <div style="font-size: 12px; color: rgba(135,206,235,0.8); margin-top: 8px;">
            ⭐ ${data.stars.length} stars
        </div>
    `;
    constellationInfoElement.style.opacity = '1';
}

function hideConstellationInfo() {
    if (constellationInfoElement) {
        constellationInfoElement.style.opacity = '0';
    }
}

// ============================================
// Post-Processing
// ============================================

function setupPostProcessing() {
    composer = new EffectComposer(renderer);
    
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        CONFIG.bloom.strength,
        CONFIG.bloom.radius,
        CONFIG.bloom.threshold
    );
    composer.addPass(bloomPass);
}

// ============================================
// Animation Loop
// ============================================

function animate() {
    requestAnimationFrame(animate);
    
    const time = performance.now() * 0.001;
    
    if (starUniforms) starUniforms.uTime.value = time;
    if (bgUniforms) bgUniforms.uTime.value = time;
    
    applyGestureInertia();
    updateConstellationStars(time);
    updateConstellationLines();
    updateShootingStars();
    
    if (autoRotate && starGroup) {
        starGroup.rotation.y += 0.0005;
    }
    
    if (composer) {
        composer.render();
    }
}

function updateConstellationStars(time) {
    constellationStars.forEach(star => {
        const data = star.userData;
        
        const twinkle = Math.sin(time * data.phase.speed + data.phase.offset) * 0.3 + 0.7;
        const scale = data.baseSize * 0.5 * twinkle;
        star.scale.set(scale, scale, 1);
        
        if (!isScattered) {
            const offset = Math.sin(time * data.phase.speed * 0.5 + data.phase.offset) * data.phase.amplitude;
            star.position.x = data.targetPosition.x + offset;
            star.position.y = data.targetPosition.y + Math.cos(time * data.phase.speed * 0.3 + data.phase.offset) * data.phase.amplitude;
        }
        
        if (highlightedConstellation && data.constellation === highlightedConstellation) {
            star.scale.multiplyScalar(1.3);
            star.material.opacity = 1.0;
        }
    });
    
    constellationLines.forEach(line => {
        if (highlightedConstellation && line.userData.constellation === highlightedConstellation) {
            line.material.opacity = 0.8;
        } else {
            line.material.opacity = 0.3;
        }
    });
}

function applyGestureInertia() {
    if (!isGestureActive) {
        if (Math.abs(gestureVelocity.rotX) > 0.0001 || Math.abs(gestureVelocity.rotY) > 0.0001) {
            starGroup.rotation.x += gestureVelocity.rotX;
            starGroup.rotation.y += gestureVelocity.rotY;
            
            gestureVelocity.rotX *= 0.95;
            gestureVelocity.rotY *= 0.95;
            
            starGroup.rotation.x = Math.max(-0.8, Math.min(0.8, starGroup.rotation.x));
        }
        
        if (Math.abs(gestureVelocity.zoom) > 0.001) {
            camera.position.z += gestureVelocity.zoom;
            camera.position.z = Math.max(CONFIG.camera.minZ, Math.min(CONFIG.camera.maxZ, camera.position.z));
            gestureVelocity.zoom *= 0.92;
        }
    }
}

// ============================================
// Interaction
// ============================================

function onCanvasClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(constellationStars);
    
    if (intersects.length > 0) {
        const clickedStar = intersects[0].object;
        const constellation = clickedStar.userData.constellation;
        
        if (highlightedConstellation === constellation) {
            highlightedConstellation = null;
            hideConstellationInfo();
        } else {
            highlightedConstellation = constellation;
            showConstellationInfo(constellation);
        }
    } else {
        highlightedConstellation = null;
        hideConstellationInfo();
    }
}

function scatterStars() {
    isScattered = true;
    autoRotate = false;
    
    constellationStars.forEach(star => {
        const data = star.userData;
        data.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
        );
    });
}

function gatherStars() {
    isScattered = false;
    
    constellationStars.forEach(star => {
        const data = star.userData;
        data.velocity = new THREE.Vector3(0, 0, 0);
    });
}

// ============================================
// Window Resize Handler
// ============================================

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    composer.setSize(window.innerWidth, window.innerHeight);
    
    if (starUniforms) {
        starUniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    }
}

// ============================================
// MediaPipe Hands Integration
// ============================================

export function onResults(results) {
    if (!loading.classList.contains('hidden')) {
        loading.classList.add('hidden');
    }
    
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
            drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1 });
        }
        
        handleGestures(results.multiHandLandmarks[0]);
    } else {
        cursor.classList.add('hidden');
        isGestureActive = false;
        autoRotate = true;
    }
    
    canvasCtx.restore();
}

// ============================================
// Gesture Recognition & Control
// ============================================

function handleGestures(landmarks) {
    const palmCenter = getPalmCenter(landmarks);
    
    const rawX = 1 - palmCenter.x;
    const rawY = palmCenter.y;
    
    smoothedPos.x = smoothedPos.x * 0.7 + rawX * 0.3;
    smoothedPos.y = smoothedPos.y * 0.7 + rawY * 0.3;
    
    const screenX = smoothedPos.x * window.innerWidth;
    const screenY = smoothedPos.y * window.innerHeight;
    cursor.style.left = `${screenX}px`;
    cursor.style.top = `${screenY}px`;
    cursor.classList.remove('hidden');
    
    const currentHandSize = getHandSize(landmarks);
    smoothedHandSize = smoothedHandSize * 0.8 + currentHandSize * 0.2;
    
    if (!handSizeCalibrated) {
        handSizeBaseline = currentHandSize;
        smoothedHandSize = currentHandSize;
        handSizeCalibrated = true;
    }
    
    const gesture = recognizeGesture(landmarks);
    
    if (gesture === 'OPEN_PALM') {
        applyHandDistanceZoom();
    }
    
    processContinuousGesture(gesture, landmarks, smoothedPos);
    
    lastHandPos.x = smoothedPos.x;
    lastHandPos.y = smoothedPos.y;
    lastHandSize = currentHandSize;
    lastGesture = gesture;
}

function applyHandDistanceZoom() {
    if (!handSizeCalibrated) return;
    
    const sizeRatio = smoothedHandSize / handSizeBaseline;
    const zoomSensitivity = 4.0;
    const targetZ = CONFIG.camera.initialZ - (sizeRatio - 1.0) * zoomSensitivity;
    const currentZ = camera.position.z;
    const newZ = currentZ + (targetZ - currentZ) * 0.1;
    
    camera.position.z = Math.max(CONFIG.camera.minZ, Math.min(CONFIG.camera.maxZ, newZ));
}

function getPalmCenter(landmarks) {
    const wrist = landmarks[0];
    const middleMCP = landmarks[9];
    
    return {
        x: (wrist.x + middleMCP.x) / 2,
        y: (wrist.y + middleMCP.y) / 2
    };
}

function getHandSize(landmarks) {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const middleTip = landmarks[12];
    const pinkyTip = landmarks[20];
    const middleMCP = landmarks[9];
    
    const palmDiagonal = Math.hypot(wrist.x - middleTip.x, wrist.y - middleTip.y);
    const palmWidth = Math.hypot(thumbTip.x - pinkyTip.x, thumbTip.y - pinkyTip.y);
    const palmHeight = Math.hypot(wrist.x - middleMCP.x, wrist.y - middleMCP.y);
    
    return (palmDiagonal + palmWidth + palmHeight) / 3;
}

function recognizeGesture(lm) {
    const thumbTip = lm[4];
    const indexTip = lm[8];
    
    function isExtended(tipId, pipId) {
        return lm[tipId].y < lm[pipId].y;
    }
    
    const indexExtended = isExtended(8, 6);
    const middleExtended = isExtended(12, 10);
    const ringExtended = isExtended(16, 14);
    const pinkyExtended = isExtended(20, 18);
    
    const pinchDistance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
    if (pinchDistance < 0.06) {
        return 'PINCH';
    }
    
    if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
        return 'FIST';
    }
    
    if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
        return 'OPEN_PALM';
    }
    
    if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
        return 'V_SIGN';
    }
    
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
        return 'POINT';
    }
    
    return 'NONE';
}

function processContinuousGesture(gesture, landmarks, currentPos) {
    const deltaX = currentPos.x - lastHandPos.x;
    const deltaY = currentPos.y - lastHandPos.y;
    const screenX = currentPos.x * window.innerWidth;
    const screenY = currentPos.y * window.innerHeight;
    
    checkConstellationHover(screenX, screenY);
    
    if (gesture === 'OPEN_PALM') {
        autoRotate = false;
        isGestureActive = true;
        cursor.classList.add('active');
        
        const rotDeltaY = deltaX * 5;
        const rotDeltaX = deltaY * 3;
        
        starGroup.rotation.y += rotDeltaY;
        starGroup.rotation.x += rotDeltaX;
        
        gestureVelocity.rotX = rotDeltaX;
        gestureVelocity.rotY = rotDeltaY;
        
        starGroup.rotation.x = Math.max(-0.8, Math.min(0.8, starGroup.rotation.x));
    }
    else if (gesture === 'POINT') {
        cursor.classList.add('active');
    }
    else if (gesture === 'PINCH') {
        autoRotate = false;
        isGestureActive = true;
        cursor.classList.add('active');
        
        const zoomDelta = -deltaY * 10;
        camera.position.z += zoomDelta;
        camera.position.z = Math.max(CONFIG.camera.minZ, Math.min(CONFIG.camera.maxZ, camera.position.z));
        
        gestureVelocity.zoom = zoomDelta;
    }
    else if (gesture === 'FIST') {
        cursor.classList.add('active');
        
        if (isScattered) {
            gatherStars();
        }
        
        const rotDeltaY = deltaX * 5;
        const rotDeltaX = deltaY * 3;
        starGroup.rotation.y += rotDeltaY;
        starGroup.rotation.x += rotDeltaX;
        gestureVelocity.rotX = rotDeltaX;
        gestureVelocity.rotY = rotDeltaY;
        starGroup.rotation.x = Math.max(-0.8, Math.min(0.8, starGroup.rotation.x));
    }
    else if (gesture === 'V_SIGN' && lastGesture !== 'V_SIGN') {
        if (isScattered) {
            gatherStars();
            console.log('⭐ Gathering stars...');
        } else {
            scatterStars();
            console.log('💫 Scattering stars!');
        }
    }
    else {
        cursor.classList.remove('active');
        gestureStartTime = 0;
        isGestureActive = false;
        
        if (gesture === 'NONE') {
            autoRotate = true;
        }
    }
}

function checkConstellationHover(screenX, screenY) {
    mouse.x = (screenX / window.innerWidth) * 2 - 1;
    mouse.y = -(screenY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(constellationStars);
    
    if (intersects.length > 0) {
        const hoveredStar = intersects[0].object;
        const constellation = hoveredStar.userData.constellation;
        
        if (highlightedConstellation !== constellation) {
            highlightedConstellation = constellation;
            showConstellationInfo(constellation);
        }
    }
}

// ============================================
// Initialization
// ============================================

export function init() {
    canvasElement.width = 640;
    canvasElement.height = 480;
    
    const titleElement = document.getElementById('title');
    if (titleElement) {
        titleElement.textContent = 'STARRY NIGHT';
        titleElement.style.textShadow = '0 0 20px rgba(135, 206, 235, 0.8), 0 0 40px rgba(135, 206, 235, 0.4)';
    }
    
    initThreeScene();
    
    console.log('🌟 Starry Night initialized!');
    console.log('Constellations:');
    Object.keys(CONSTELLATIONS).forEach(key => {
        console.log(`  ⭐ ${CONSTELLATIONS[key].nameCN} (${CONSTELLATIONS[key].name})`);
    });
    console.log('Gestures:');
    console.log('  ✋ Open Palm - Rotate view + Distance zoom');
    console.log('  ☝️ Point - Highlight constellation');
    console.log('  🤏 Pinch - Zoom in/out');
    console.log('  ✊ Fist - Gather scattered stars');
    console.log('  ✌️ V-Sign - Scatter / Gather stars');
    console.log('  🖱️ Click - Select constellation');
}

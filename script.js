
// ============================================
// 3D Christmas Tree with Gesture Control
// Three.js + MediaPipe Hands
// ============================================

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

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
let treeGroup, treeParticles, starField, treeStar;
let treeUniforms, starUniforms;
let photoFrames = [];  // 照片框数组
let raycaster, mouse;  // 射线检测
let selectedPhoto = null;  // 当前选中的照片
let expandedPhoto = null;  // 当前放大的照片
let photoExpandAnimation = null;  // 照片放大动画

// 粒子物理数据
let particleVelocities = [];  // 速度
let particleAccelerations = [];  // 加速度
let particleTargets = [];  // 目标位置（圣诞树形状）
let particlePhases = [];  // 相位（用于无规律运动）
let isExploded = false;  // 是否爆炸状态

// === Configuration ===
const CONFIG = {
    tree: {
        particleCount: 2500,
        height: 4,
        baseRadius: 1.5,
        colors: [
            new THREE.Color(0xffd700),  // Gold
            new THREE.Color(0xffaa00),  // Orange gold
            new THREE.Color(0xffcc33),  // Light gold
            new THREE.Color(0xff6600),  // Orange
            new THREE.Color(0xff0000),  // Red (ornaments)
        ]
    },
    physics: {
        gravity: -0.0003,  // 重力（减弱）
        damping: 0.95,  // 阻尼（增强）
        returnForce: 0.008,  // 回归力（增强，保持形状）
        turbulence: 0.001,  // 湍流强度（减弱）
        maxSpeed: 0.015,  // 最大速度（减小）
    },
    photos: {
        count: 15,  // 照片数量
        size: 0.35,  // 照片大小
    },
    starField: {
        count: 500,
        radius: 50
    },
    bloom: {
        strength: 1.5,
        radius: 0.4,
        threshold: 0.2
    },
    camera: {
        fov: 60,
        near: 0.1,
        far: 1000,
        initialZ: 6,
        minZ: 3,
        maxZ: 10
    }
};

// === Gesture Control State ===
let lastGesture = 'NONE';
let gestureStartTime = 0;
let lastHandPos = { x: 0.5, y: 0.5 };
let smoothedPos = { x: 0.5, y: 0.5 };
let lastPinchDist = 0;
let isGestureActive = false;
let autoRotate = true;

// 手势惯性系统
let gestureVelocity = { rotX: 0, rotY: 0, zoom: 0 };
let isFistShape = false;  // 是否握拳变球形
let sphereTargets = [];  // 球形目标位置

// 手势远近识别
let lastHandSize = 0;  // 上一帧手掌大小
let smoothedHandSize = 0;  // 平滑后的手掌大小
let handSizeBaseline = 0;  // 基线手掌大小（用于比较）
let handSizeCalibrated = false;  // 是否已校准

// 背景闪烁粒子
let bgParticles, bgUniforms;

// 圣诞礼包
let giftBoxes = [];
let giftTargets = [];  // 礼包目标位置
let giftSphereTargets = [];  // 礼包球形目标位置

// Gesture handlers registry (extensible)
const gestureHandlers = {
    OPEN_PALM: null,
    FIST: null,
    PINCH: null,
    V_SIGN: null,
    // Add more gestures here
};

// ============================================
// Three.js Scene Initialization
// ============================================

export function initThreeScene() {
    // Initialize DOM elements first
    initDOMElements();
    
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
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
    
    // Tree Group (for rotation control)
    treeGroup = new THREE.Group();
    scene.add(treeGroup);
    
    // Raycaster for photo selection
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Create scene elements
    createChristmasTree();
    createSphereTargets();  // 创建球形目标位置
    createTreeStar();
    createGiftBoxes();  // 创建圣诞礼包
    createPhotoWall();  // 添加照片墙
    createStarField();
    createBackgroundParticles();  // 创建背景闪烁粒子
    
    // Post-processing (Bloom effect)
    setupPostProcessing();
    
    // Mouse/Touch events for photo interaction
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('touchend', onCanvasTouchEnd);
    
    // Event listeners
    window.addEventListener('resize', onWindowResize);
    
    // Start animation
    animate();
}

// ============================================
// Christmas Tree Particle System with Physics
// ============================================

function createChristmasTree() {
    const { particleCount, height, baseRadius, colors } = CONFIG.tree;
    
    // Geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const randoms = new Float32Array(particleCount);
    const colorArray = new Float32Array(particleCount * 3);
    
    // 初始化物理数组
    particleVelocities = [];
    particleAccelerations = [];
    particleTargets = [];
    particlePhases = [];
    
    for (let i = 0; i < particleCount; i++) {
        // 生成更逼真的圣诞树形状
        const t = Math.pow(Math.random(), 0.7);  // 底部密度更高
        
        // Y position: from top to bottom
        const targetY = (1 - t) * height - height / 2;
        
        // 使用多层锥形来模拟圣诞树的层次感
        const layer = Math.floor(t * 6);  // 6层
        const layerT = (t * 6) % 1;  // 层内位置
        
        // 每一层的半径略有波动，形成层次感
        const layerRadius = (t * baseRadius) * (0.85 + Math.sin(layer * Math.PI) * 0.15);
        
        // 树干（底部10%的粒子形成细小的树干）
        let radiusAtY;
        if (t > 0.92) {
            // 树干部分
            radiusAtY = 0.08 + Math.random() * 0.05;
        } else {
            // 树冠部分 - 添加层次感和自然的凹凸
            const baseLayerRadius = t * baseRadius;
            const waveEffect = Math.sin(targetY * 4) * 0.1;  // 波浪效果
            radiusAtY = baseLayerRadius * (0.7 + waveEffect + Math.random() * 0.3);
        }
        
        // 随机角度
        const angle = Math.random() * Math.PI * 2;
        
        // 表面分布（大部分粒子在表面，少部分在内部）
        const surfaceBias = Math.pow(Math.random(), 0.3);  // 偏向表面
        const randomRadius = radiusAtY * surfaceBias;
        
        const targetX = Math.cos(angle) * randomRadius;
        const targetZ = Math.sin(angle) * randomRadius;
        
        // 保存目标位置
        particleTargets.push(new THREE.Vector3(targetX, targetY, targetZ));
        
        // 初始位置 - 更接近目标位置（减少跑到树形状的时间）
        const initRadius = 1.5 + Math.random() * 2;
        const initAngle = Math.random() * Math.PI * 2;
        const initY = (Math.random() - 0.5) * 4;
        
        positions[i * 3] = Math.cos(initAngle) * initRadius;
        positions[i * 3 + 1] = initY;
        positions[i * 3 + 2] = Math.sin(initAngle) * initRadius;
        
        // 初始速度 - 更小
        particleVelocities.push(new THREE.Vector3(
            (Math.random() - 0.5) * 0.005,
            (Math.random() - 0.5) * 0.005,
            (Math.random() - 0.5) * 0.005
        ));
        
        // 加速度
        particleAccelerations.push(new THREE.Vector3(0, 0, 0));
        
        // 随机相位（用于无规律运动）- 更柔和的参数
        particlePhases.push({
            offset: Math.random() * Math.PI * 2,
            speedX: 0.2 + Math.random() * 0.5,
            speedY: 0.1 + Math.random() * 0.3,
            speedZ: 0.2 + Math.random() * 0.5,
            amplitudeX: 0.002 + Math.random() * 0.004,
            amplitudeY: 0.001 + Math.random() * 0.003,
            amplitudeZ: 0.002 + Math.random() * 0.004,
        });
        
        // Random value for shader animation
        randoms[i] = Math.random();
        
        // Color - mostly gold with some red ornaments
        const color = Math.random() > 0.85 
            ? colors[4]  // Red ornament
            : colors[Math.floor(Math.random() * 4)];  // Gold variants
        
        colorArray[i * 3] = color.r;
        colorArray[i * 3 + 1] = color.g;
        colorArray[i * 3 + 2] = color.b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colorArray, 3));
    
    // Shader Material
    treeUniforms = {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
    };
    
    const material = new THREE.ShaderMaterial({
        vertexShader: document.getElementById('vertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShader').textContent,
        uniforms: treeUniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    treeParticles = new THREE.Points(geometry, material);
    treeGroup.add(treeParticles);
}

// 创建球形目标位置（用于握拳手势）
function createSphereTargets() {
    const { particleCount } = CONFIG.tree;
    sphereTargets = [];
    
    const sphereRadius = 1.8;  // 球形半径
    
    for (let i = 0; i < particleCount; i++) {
        // 均匀分布在球面上（Fibonacci球）
        const phi = Math.acos(1 - 2 * (i + 0.5) / particleCount);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        
        // 添加一些随机性使其更自然
        const r = sphereRadius * (0.85 + Math.random() * 0.3);
        
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);
        
        sphereTargets.push(new THREE.Vector3(x, y, z));
    }
}

// 更新粒子物理
function updateParticlePhysics(time) {
    if (!treeParticles) return;
    
    const positions = treeParticles.geometry.attributes.position.array;
    const { gravity, damping, returnForce, turbulence, maxSpeed } = CONFIG.physics;
    
    // 选择目标：球形或圣诞树形
    const currentTargets = isFistShape ? sphereTargets : particleTargets;
    // 球形变换时使用更强的力
    const currentForce = isFistShape ? returnForce * 2.5 : returnForce;
    
    for (let i = 0; i < particleTargets.length; i++) {
        const i3 = i * 3;
        const vel = particleVelocities[i];
        const target = currentTargets[i];
        const phase = particlePhases[i];
        
        // 当前位置
        const x = positions[i3];
        const y = positions[i3 + 1];
        const z = positions[i3 + 2];
        
        if (!isExploded) {
            // 向目标位置的吸引力
            const dx = target.x - x;
            const dy = target.y - y;
            const dz = target.z - z;
            
            vel.x += dx * currentForce;
            vel.y += dy * currentForce;
            vel.z += dz * currentForce;
            
            // 添加无规律湍流运动（球形时减弱）
            const turbMult = isFistShape ? 0.3 : 1.0;
            vel.x += Math.sin(time * phase.speedX + phase.offset) * phase.amplitudeX * turbMult;
            vel.y += Math.cos(time * phase.speedY + phase.offset * 1.3) * phase.amplitudeY * turbMult;
            vel.z += Math.sin(time * phase.speedZ + phase.offset * 0.7) * phase.amplitudeZ * turbMult;
        } else {
            // 爆炸状态 - 重力效果
            vel.y += gravity;
        }
        
        // 阻尼
        vel.x *= damping;
        vel.y *= damping;
        vel.z *= damping;
        
        // 限制最大速度
        const speed = vel.length();
        if (speed > maxSpeed) {
            vel.multiplyScalar(maxSpeed / speed);
        }
        
        // 更新位置
        positions[i3] += vel.x;
        positions[i3 + 1] += vel.y;
        positions[i3 + 2] += vel.z;
    }
    
    treeParticles.geometry.attributes.position.needsUpdate = true;
}

// 爆炸效果
function explodeParticles() {
    isExploded = true;
    autoRotate = false;
    
    for (let i = 0; i < particleVelocities.length; i++) {
        const vel = particleVelocities[i];
        // 随机爆炸方向
        vel.x = (Math.random() - 0.5) * 0.15;
        vel.y = Math.random() * 0.1 + 0.05;  // 向上
        vel.z = (Math.random() - 0.5) * 0.15;
    }
    
    // 照片也爆炸
    photoFrames.forEach(photo => {
        if (photo.userData.velocity) {
            photo.userData.velocity.x = (Math.random() - 0.5) * 0.1;
            photo.userData.velocity.y = Math.random() * 0.08;
            photo.userData.velocity.z = (Math.random() - 0.5) * 0.1;
            // 加速旋转
            photo.userData.angularVelocity.x = (Math.random() - 0.5) * 0.05;
            photo.userData.angularVelocity.y = (Math.random() - 0.5) * 0.05;
            photo.userData.angularVelocity.z = (Math.random() - 0.5) * 0.03;
        }
    });
    
    // 星星也爆炸
    if (treeStar && treeStar.userData) {
        treeStar.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.05,
            0.1 + Math.random() * 0.05,
            (Math.random() - 0.5) * 0.05
        );
    }
    
    // 礼包也爆炸
    giftBoxes.forEach(gift => {
        if (gift.userData.velocity) {
            gift.userData.velocity.x = (Math.random() - 0.5) * 0.12;
            gift.userData.velocity.y = Math.random() * 0.1 + 0.03;
            gift.userData.velocity.z = (Math.random() - 0.5) * 0.12;
            // 加速旋转
            gift.userData.angularVelocity.x = (Math.random() - 0.5) * 0.08;
            gift.userData.angularVelocity.y = (Math.random() - 0.5) * 0.08;
            gift.userData.angularVelocity.z = (Math.random() - 0.5) * 0.05;
        }
    });
}

// 聚合粒子
function gatherParticles() {
    isExploded = false;
    
    // 重置星星位置
    if (treeStar && treeStar.userData) {
        treeStar.position.copy(treeStar.userData.originalPosition);
        treeStar.userData.velocity.set(0, 0, 0);
    }
    
    // 照片恢复较小的随机运动
    photoFrames.forEach(photo => {
        if (photo.userData.angularVelocity) {
            photo.userData.angularVelocity.x = (Math.random() - 0.5) * 0.01;
            photo.userData.angularVelocity.y = (Math.random() - 0.5) * 0.01;
            photo.userData.angularVelocity.z = (Math.random() - 0.5) * 0.005;
        }
    });
    
    // 礼包恢复较小的随机运动
    giftBoxes.forEach(gift => {
        if (gift.userData.angularVelocity) {
            gift.userData.angularVelocity.x = (Math.random() - 0.5) * 0.02;
            gift.userData.angularVelocity.y = (Math.random() - 0.5) * 0.02;
            gift.userData.angularVelocity.z = (Math.random() - 0.5) * 0.01;
        }
    });
}

// ============================================
// Tree Top Star (Sprite with Canvas Texture)
// ============================================

function createStarTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    const centerX = size / 2;
    const centerY = size / 2;
    const outerRadius = size / 2 - 4;
    const innerRadius = outerRadius * 0.4;
    const spikes = 5;
    
    // Draw star path
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI / spikes) - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    
    // Gradient fill
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, outerRadius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, '#ffffa0');
    gradient.addColorStop(0.6, '#ffd700');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    
    // Glow effect (draw multiple times with blur)
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 20;
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw again for stronger glow
    ctx.shadowBlur = 10;
    ctx.fill();
    
    // Bright center
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.fill();
    
    return new THREE.CanvasTexture(canvas);
}

function createTreeStar() {
    const texture = createStarTexture();
    
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    treeStar = new THREE.Sprite(material);
    treeStar.position.y = CONFIG.tree.height / 2 + 0.3;
    treeStar.scale.set(0.8, 0.8, 1);
    
    // 物理属性
    treeStar.userData = {
        originalPosition: treeStar.position.clone(),
        velocity: new THREE.Vector3(0, 0, 0)
    };
    
    treeGroup.add(treeStar);
}

// ============================================
// Gift Boxes - 圣诞礼包
// ============================================

// 创建礼包纹理
function createGiftBoxTexture(boxColor, ribbonColor) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // 礼包主体
    ctx.fillStyle = boxColor;
    ctx.fillRect(0, 0, size, size);
    
    // 添加一些阴影/高光效果
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // 横向丝带
    ctx.fillStyle = ribbonColor;
    ctx.fillRect(0, size * 0.4, size, size * 0.2);
    
    // 纵向丝带
    ctx.fillRect(size * 0.4, 0, size * 0.2, size);
    
    // 丝带高光
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(size * 0.42, 0, size * 0.05, size);
    ctx.fillRect(0, size * 0.42, size, size * 0.05);
    
    // 蝴蝶结（简化版）
    ctx.fillStyle = ribbonColor;
    ctx.beginPath();
    ctx.ellipse(size * 0.5, size * 0.35, size * 0.15, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(size * 0.35, size * 0.45, size * 0.08, size * 0.12, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(size * 0.65, size * 0.45, size * 0.08, size * 0.12, 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    return new THREE.CanvasTexture(canvas);
}

function createGiftBoxes() {
    const { height, baseRadius } = CONFIG.tree;
    const giftCount = 20;  // 礼包数量
    
    // 礼包颜色组合 [盒子颜色, 丝带颜色]
    const colorCombos = [
        ['#e74c3c', '#f1c40f'],  // 红盒金带
        ['#27ae60', '#e74c3c'],  // 绿盒红带
        ['#3498db', '#f39c12'],  // 蓝盒橙带
        ['#9b59b6', '#1abc9c'],  // 紫盒青带
        ['#f39c12', '#e74c3c'],  // 橙盒红带
        ['#1abc9c', '#f1c40f'],  // 青盒金带
        ['#e74c3c', '#ffffff'],  // 红盒白带
        ['#2c3e50', '#f1c40f'],  // 深蓝盒金带
    ];
    
    giftTargets = [];
    giftSphereTargets = [];
    
    for (let i = 0; i < giftCount; i++) {
        // 随机选择颜色组合
        const [boxColor, ribbonColor] = colorCombos[i % colorCombos.length];
        const texture = createGiftBoxTexture(boxColor, ribbonColor);
        
        // 随机大小 (0.08 - 0.18)
        const boxSize = 0.08 + Math.random() * 0.1;
        
        // 创建立方体几何体
        const geometry = new THREE.BoxGeometry(boxSize, boxSize * 0.8, boxSize);
        
        // 材质
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
        });
        
        const gift = new THREE.Mesh(geometry, material);
        
        // 目标位置 - 分布在圣诞树形状内（主要在中下部）
        const t = 0.3 + Math.random() * 0.7;  // 主要在中下部
        const targetY = (1 - t) * height - height / 2;
        const radiusAtY = t * baseRadius * 0.9;
        const angle = Math.random() * Math.PI * 2;
        const radius = radiusAtY * (0.4 + Math.random() * 0.6);
        
        const targetX = Math.cos(angle) * radius;
        const targetZ = Math.sin(angle) * radius;
        
        const targetPos = new THREE.Vector3(targetX, targetY, targetZ);
        giftTargets.push(targetPos);
        
        // 球形目标位置
        const sphereRadius = 1.8;
        const phi = Math.acos(1 - 2 * (i + 0.5) / giftCount);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        const sr = sphereRadius * (0.85 + Math.random() * 0.3);
        giftSphereTargets.push(new THREE.Vector3(
            sr * Math.sin(phi) * Math.cos(theta),
            sr * Math.cos(phi),
            sr * Math.sin(phi) * Math.sin(theta)
        ));
        
        // 初始位置 - 随机散布
        const initRadius = 1.5 + Math.random() * 3;
        const initAngle = Math.random() * Math.PI * 2;
        const initY = (Math.random() - 0.5) * 4;
        
        gift.position.set(
            Math.cos(initAngle) * initRadius,
            initY,
            Math.sin(initAngle) * initRadius
        );
        
        // 随机旋转
        gift.rotation.x = Math.random() * Math.PI * 2;
        gift.rotation.y = Math.random() * Math.PI * 2;
        gift.rotation.z = Math.random() * Math.PI * 2;
        
        // 存储物理数据
        gift.userData = {
            targetPosition: targetPos.clone(),
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01
            ),
            angularVelocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.01
            ),
            phase: {
                offset: Math.random() * Math.PI * 2,
                speedX: 0.2 + Math.random() * 0.5,
                speedY: 0.15 + Math.random() * 0.4,
                speedZ: 0.2 + Math.random() * 0.5,
                amplitudeX: 0.002 + Math.random() * 0.004,
                amplitudeY: 0.0015 + Math.random() * 0.003,
                amplitudeZ: 0.002 + Math.random() * 0.004,
                rotSpeed: 0.3 + Math.random() * 0.5,
            },
            index: i
        };
        
        treeGroup.add(gift);
        giftBoxes.push(gift);
    }
}

// 更新礼包物理
function updateGiftPhysics(time) {
    const { gravity, damping, returnForce } = CONFIG.physics;
    
    // 选择目标：球形或圣诞树形
    const currentTargets = isFistShape ? giftSphereTargets : giftTargets;
    const currentForce = isFistShape ? returnForce * 2.5 : returnForce;
    
    giftBoxes.forEach((gift, index) => {
        const data = gift.userData;
        const vel = data.velocity;
        const phase = data.phase;
        const target = currentTargets[index];
        
        if (!isExploded) {
            // 向目标位置的吸引力
            const dx = target.x - gift.position.x;
            const dy = target.y - gift.position.y;
            const dz = target.z - gift.position.z;
            
            vel.x += dx * currentForce * 0.7;
            vel.y += dy * currentForce * 0.7;
            vel.z += dz * currentForce * 0.7;
            
            // 无规律运动
            const turbMult = isFistShape ? 0.3 : 1.0;
            vel.x += Math.sin(time * phase.speedX + phase.offset) * phase.amplitudeX * turbMult;
            vel.y += Math.cos(time * phase.speedY + phase.offset * 1.5) * phase.amplitudeY * turbMult;
            vel.z += Math.sin(time * phase.speedZ + phase.offset * 0.8) * phase.amplitudeZ * turbMult;
            
            // 轻微旋转
            gift.rotation.x += Math.sin(time * phase.rotSpeed + phase.offset) * 0.003;
            gift.rotation.y += Math.cos(time * phase.rotSpeed * 0.8 + phase.offset) * 0.004;
            gift.rotation.z += Math.sin(time * phase.rotSpeed * 0.6 + phase.offset) * 0.002;
        } else {
            // 爆炸状态 - 重力
            vel.y += gravity * 2;
            
            // 旋转加速
            gift.rotation.x += data.angularVelocity.x;
            gift.rotation.y += data.angularVelocity.y;
            gift.rotation.z += data.angularVelocity.z;
        }
        
        // 阻尼
        vel.x *= damping;
        vel.y *= damping;
        vel.z *= damping;
        
        // 限制速度
        const speed = vel.length();
        if (speed > 0.06) {
            vel.multiplyScalar(0.06 / speed);
        }
        
        // 更新位置
        gift.position.x += vel.x;
        gift.position.y += vel.y;
        gift.position.z += vel.z;
    });
}

// ============================================
// Photo Wall - 照片随机混合在粒子中
// ============================================

function createPhotoWall() {
    const { count, size } = CONFIG.photos;
    const { height, baseRadius } = CONFIG.tree;
    const textureLoader = new THREE.TextureLoader();
    
    for (let i = 0; i < count; i++) {
        // 使用随机图片
        const imageUrl = `https://picsum.photos/seed/${i + 100}/200/200`;
        
        // 创建照片材质
        const texture = textureLoader.load(imageUrl);
        texture.colorSpace = THREE.SRGBColorSpace;
        
        // 照片几何体（平面）
        const geometry = new THREE.PlaneGeometry(size, size);
        
        // 照片材质
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
        });
        
        const photo = new THREE.Mesh(geometry, material);
        
        // 随机分布在圣诞树形状内部（锥形分布）
        const t = Math.random();  // 0=顶部, 1=底部
        const targetY = (1 - t) * height - height / 2;
        const radiusAtY = t * baseRadius * 1.2;  // 稍微超出粒子范围
        const angle = Math.random() * Math.PI * 2;
        const radius = radiusAtY * (0.3 + Math.random() * 0.7);
        
        const targetX = Math.cos(angle) * radius;
        const targetZ = Math.sin(angle) * radius;
        
        // 初始位置 - 随机散布
        const initRadius = 2 + Math.random() * 4;
        const initAngle = Math.random() * Math.PI * 2;
        const initY = (Math.random() - 0.5) * 5;
        
        photo.position.set(
            Math.cos(initAngle) * initRadius,
            initY,
            Math.sin(initAngle) * initRadius
        );
        
        // 随机旋转
        photo.rotation.x = (Math.random() - 0.5) * 0.5;
        photo.rotation.y = Math.random() * Math.PI * 2;
        photo.rotation.z = (Math.random() - 0.5) * 0.3;
        
        // 存储物理数据
        photo.userData = {
            // 目标位置（圣诞树形状内）
            targetPosition: new THREE.Vector3(targetX, targetY, targetZ),
            targetRotation: new THREE.Euler(
                (Math.random() - 0.5) * 0.3,
                Math.random() * Math.PI * 2,
                (Math.random() - 0.5) * 0.2
            ),
            // 原始数据（用于恢复）
            originalPosition: new THREE.Vector3(targetX, targetY, targetZ),
            originalRotation: photo.rotation.clone(),
            originalScale: photo.scale.clone(),
            // 物理属性
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.01
            ),
            angularVelocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.01
            ),
            // 无规律运动参数
            phase: {
                offset: Math.random() * Math.PI * 2,
                speedX: 0.3 + Math.random(),
                speedY: 0.2 + Math.random() * 0.8,
                speedZ: 0.3 + Math.random(),
                amplitudeX: 0.003 + Math.random() * 0.008,
                amplitudeY: 0.002 + Math.random() * 0.005,
                amplitudeZ: 0.003 + Math.random() * 0.008,
                rotSpeed: 0.1 + Math.random() * 0.3,
            },
            index: i,
            imageUrl: imageUrl
        };
        
        // 添加发光边框
        const borderGeometry = new THREE.PlaneGeometry(size + 0.04, size + 0.04);
        const borderMaterial = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5
        });
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.z = -0.001;
        photo.add(border);
        photo.userData.border = border;
        
        treeGroup.add(photo);
        photoFrames.push(photo);
    }
}

// 更新照片物理
function updatePhotoPhysics(time) {
    const { gravity, damping, returnForce } = CONFIG.physics;
    
    photoFrames.forEach(photo => {
        if (photo === expandedPhoto) return;  // 跳过放大的照片
        
        const data = photo.userData;
        const vel = data.velocity;
        const phase = data.phase;
        const target = data.targetPosition;
        
        if (!isExploded) {
            // 向目标位置的吸引力
            const dx = target.x - photo.position.x;
            const dy = target.y - photo.position.y;
            const dz = target.z - photo.position.z;
            
            vel.x += dx * returnForce * 0.8;
            vel.y += dy * returnForce * 0.8;
            vel.z += dz * returnForce * 0.8;
            
            // 无规律运动
            vel.x += Math.sin(time * phase.speedX + phase.offset) * phase.amplitudeX;
            vel.y += Math.cos(time * phase.speedY + phase.offset * 1.5) * phase.amplitudeY;
            vel.z += Math.sin(time * phase.speedZ + phase.offset * 0.8) * phase.amplitudeZ;
            
            // 轻微旋转
            photo.rotation.y += Math.sin(time * phase.rotSpeed + phase.offset) * 0.002;
            photo.rotation.x += Math.cos(time * phase.rotSpeed * 0.7 + phase.offset) * 0.001;
        } else {
            // 爆炸状态 - 重力
            vel.y += gravity * 1.5;
            
            // 旋转加速
            photo.rotation.x += data.angularVelocity.x;
            photo.rotation.y += data.angularVelocity.y;
            photo.rotation.z += data.angularVelocity.z;
        }
        
        // 阻尼
        vel.x *= damping;
        vel.y *= damping;
        vel.z *= damping;
        
        // 限制速度
        const speed = vel.length();
        if (speed > 0.08) {
            vel.multiplyScalar(0.08 / speed);
        }
        
        // 更新位置
        photo.position.x += vel.x;
        photo.position.y += vel.y;
        photo.position.z += vel.z;
    });
}

// 照片点击/选择处理
function onCanvasClick(event) {
    handlePhotoInteraction(event.clientX, event.clientY);
}

function onCanvasTouchEnd(event) {
    if (event.changedTouches.length > 0) {
        const touch = event.changedTouches[0];
        handlePhotoInteraction(touch.clientX, touch.clientY);
    }
}

function handlePhotoInteraction(clientX, clientY) {
    // 如果有放大的照片，点击关闭
    if (expandedPhoto) {
        closeExpandedPhoto();
        return;
    }
    
    // 转换为标准化设备坐标
    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(photoFrames);
    
    if (intersects.length > 0) {
        const photo = intersects[0].object;
        expandPhoto(photo);
    }
}

// 通过手势选择照片（使用屏幕坐标）
function checkPhotoHover(screenX, screenY) {
    mouse.x = (screenX / window.innerWidth) * 2 - 1;
    mouse.y = -(screenY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(photoFrames);
    
    // 重置所有照片边框
    photoFrames.forEach(photo => {
        if (photo !== expandedPhoto && photo.userData && photo.userData.border) {
            photo.userData.border.material.opacity = 0.5;
            photo.userData.border.material.color.setHex(0xffd700);
        }
    });
    
    if (intersects.length > 0 && !expandedPhoto) {
        const photo = intersects[0].object;
        // 确保是照片而不是边框
        if (photo.userData && photo.userData.border) {
            selectedPhoto = photo;
            // 高亮选中的照片
            photo.userData.border.material.opacity = 1.0;
            photo.userData.border.material.color.setHex(0xffffff);
            return photo;
        }
    }
    
    selectedPhoto = null;
    return null;
}

// 放大照片
function expandPhoto(photo) {
    if (expandedPhoto) return;
    
    expandedPhoto = photo;
    autoRotate = false;
    
    // 保存当前状态
    photo.userData.savedPosition = photo.position.clone();
    photo.userData.savedRotation = photo.rotation.clone();
    photo.userData.savedScale = photo.scale.clone();
    
    // 计算目标位置（屏幕中心，面向相机）
    const targetPosition = new THREE.Vector3(0, 0, camera.position.z - 2);
    const targetScale = new THREE.Vector3(4, 4, 1);
    
    // 从 treeGroup 移到 scene（避免跟随旋转）
    const worldPos = new THREE.Vector3();
    photo.getWorldPosition(worldPos);
    treeGroup.remove(photo);
    scene.add(photo);
    photo.position.copy(worldPos);
    
    // 动画
    const duration = 400;
    const startTime = performance.now();
    const startPosition = photo.position.clone();
    const startScale = photo.scale.clone();
    const startRotation = photo.rotation.clone();
    
    function animateExpand() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        photo.position.lerpVectors(startPosition, targetPosition, eased);
        photo.scale.lerpVectors(startScale, targetScale, eased);
        photo.rotation.set(0, 0, 0);  // 面向相机
        
        // 边框变亮
        photo.userData.border.material.opacity = 0.8 + 0.2 * eased;
        photo.userData.border.material.color.setHex(0xffffff);
        
        if (progress < 1) {
            photoExpandAnimation = requestAnimationFrame(animateExpand);
        } else {
            photoExpandAnimation = null;
        }
    }
    
    animateExpand();
    console.log('📷 Photo expanded:', photo.userData.index);
}

// 关闭放大的照片
function closeExpandedPhoto() {
    if (!expandedPhoto) return;
    
    const photo = expandedPhoto;
    
    // 取消正在进行的动画
    if (photoExpandAnimation) {
        cancelAnimationFrame(photoExpandAnimation);
    }
    
    // 恢复位置
    const duration = 300;
    const startTime = performance.now();
    const startPosition = photo.position.clone();
    const startScale = photo.scale.clone();
    
    const targetPosition = photo.userData.savedPosition;
    const targetScale = photo.userData.savedScale;
    
    function animateClose() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        photo.position.lerpVectors(startPosition, targetPosition, eased);
        photo.scale.lerpVectors(startScale, targetScale, eased);
        
        photo.userData.border.material.opacity = 0.8 - 0.2 * eased;
        
        if (progress < 1) {
            requestAnimationFrame(animateClose);
        } else {
            // 移回 treeGroup
            scene.remove(photo);
            treeGroup.add(photo);
            photo.position.copy(photo.userData.originalPosition);
            photo.rotation.copy(photo.userData.originalRotation);
            photo.scale.copy(photo.userData.originalScale);
            photo.userData.border.material.color.setHex(0xffd700);
            photo.userData.border.material.opacity = 0.6;
            
            expandedPhoto = null;
            autoRotate = true;
            console.log('📷 Photo closed');
        }
    }
    
    animateClose();
}

// ============================================
// Star Field Background
// ============================================

function createStarField() {
    const { count, radius } = CONFIG.starField;
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
        // Random position on sphere surface
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        randoms[i] = Math.random();
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    
    starUniforms = {
        uTime: { value: 0 }
    };
    
    const material = new THREE.ShaderMaterial({
        vertexShader: document.getElementById('starVertexShader').textContent,
        fragmentShader: document.getElementById('starFragmentShader').textContent,
        uniforms: starUniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    starField = new THREE.Points(geometry, material);
    scene.add(starField);
}

// 创建背景闪烁粒子
function createBackgroundParticles() {
    const count = 200;  // 离散粒子数量
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
        // 随机分布在场景中（避开中心圣诞树区域）
        let x, y, z;
        do {
            x = (Math.random() - 0.5) * 20;
            y = (Math.random() - 0.5) * 15;
            z = (Math.random() - 0.5) * 15;
        } while (Math.sqrt(x*x + z*z) < 3 && y > -3 && y < 4);  // 避开圣诞树区域
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        randoms[i] = Math.random();
        sizes[i] = 0.5 + Math.random() * 1.5;  // 不同大小
        
        // 金色/白色/暖色调
        const colorChoice = Math.random();
        if (colorChoice < 0.4) {
            // 金色
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 0.85;
            colors[i * 3 + 2] = 0.3;
        } else if (colorChoice < 0.7) {
            // 白色
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 1.0;
            colors[i * 3 + 2] = 0.9;
        } else {
            // 橙红色
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 0.5 + Math.random() * 0.3;
            colors[i * 3 + 2] = 0.2;
        }
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    
    bgUniforms = {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
    };
    
    // 自定义着色器用于闪烁效果
    const material = new THREE.ShaderMaterial({
        vertexShader: `
            uniform float uTime;
            uniform float uPixelRatio;
            attribute float aRandom;
            attribute float aSize;
            attribute vec3 aColor;
            varying float vAlpha;
            varying vec3 vColor;
            
            void main() {
                vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                vec4 viewPosition = viewMatrix * modelPosition;
                vec4 projectedPosition = projectionMatrix * viewPosition;
                gl_Position = projectedPosition;
                
                // 闪烁效果 - 使用多个正弦波叠加
                float twinkle1 = sin(uTime * (2.0 + aRandom * 3.0) + aRandom * 6.28) * 0.5 + 0.5;
                float twinkle2 = sin(uTime * (1.0 + aRandom * 2.0) + aRandom * 3.14) * 0.5 + 0.5;
                float twinkle = twinkle1 * twinkle2;
                
                // 随机闪烁（有时完全消失）
                float blink = step(0.3, sin(uTime * (0.5 + aRandom * 1.5) + aRandom * 10.0) * 0.5 + 0.5);
                
                vAlpha = twinkle * blink * (0.3 + aRandom * 0.7);
                vColor = aColor;
                
                gl_PointSize = aSize * uPixelRatio * 15.0 * (1.0 / -viewPosition.z) * (0.5 + twinkle * 0.5);
            }
        `,
        fragmentShader: `
            varying float vAlpha;
            varying vec3 vColor;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                // 柔和的圆形光晕
                float glow = 1.0 - smoothstep(0.0, 0.5, dist);
                glow = pow(glow, 1.5);
                
                gl_FragColor = vec4(vColor, glow * vAlpha);
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
// Post-Processing (Bloom Effect)
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
    
    // Update shader uniforms
    if (treeUniforms) treeUniforms.uTime.value = time;
    if (starUniforms) starUniforms.uTime.value = time;
    if (bgUniforms) bgUniforms.uTime.value = time;
    
    // 应用手势惯性
    applyGestureInertia();
    
    // 更新粒子物理
    updateParticlePhysics(time);
    
    // 更新照片物理
    updatePhotoPhysics(time);
    
    // 更新礼包物理
    updateGiftPhysics(time);
    
    // Star breathing animation
    if (treeStar) {
        const breathe = 1 + 0.15 * Math.sin(time * 2);
        treeStar.scale.set(0.8 * breathe, 0.8 * breathe, 1);
        
        // 星星也跟随物理（如果爆炸）
        if (isExploded && treeStar.userData.velocity) {
            treeStar.userData.velocity.y += CONFIG.physics.gravity;
            treeStar.position.y += treeStar.userData.velocity.y;
        }
    }
    
    // Auto rotation when no gesture
    if (autoRotate && treeGroup && !isExploded) {
        treeGroup.rotation.y += 0.003;
    }
    
    // Render with post-processing
    if (composer) {
        composer.render();
    }
}

// 应用手势惯性
function applyGestureInertia() {
    if (!isGestureActive && !expandedPhoto && !isExploded) {
        // 应用旋转惯性
        if (Math.abs(gestureVelocity.rotX) > 0.0001 || Math.abs(gestureVelocity.rotY) > 0.0001) {
            treeGroup.rotation.x += gestureVelocity.rotX;
            treeGroup.rotation.y += gestureVelocity.rotY;
            
            // 阻尼衰减
            gestureVelocity.rotX *= 0.95;
            gestureVelocity.rotY *= 0.95;
            
            // Clamp X rotation
            treeGroup.rotation.x = Math.max(-0.5, Math.min(0.5, treeGroup.rotation.x));
        }
        
        // 应用缩放惯性
        if (Math.abs(gestureVelocity.zoom) > 0.001) {
            camera.position.z += gestureVelocity.zoom;
            camera.position.z = Math.max(CONFIG.camera.minZ, Math.min(CONFIG.camera.maxZ, camera.position.z));
            
            gestureVelocity.zoom *= 0.92;
        }
    }
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
    
    if (treeUniforms) {
        treeUniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    }
}

// ============================================
// MediaPipe Hands Integration
// ============================================

export function onResults(results) {
    // Hide loading
    if (!loading.classList.contains('hidden')) {
        loading.classList.add('hidden');
    }
    
    // Draw debug canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Draw hand landmarks
        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
            drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1 });
        }
        
        // Process gestures
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
    // Get palm center (average of key points)
    const palmCenter = getPalmCenter(landmarks);
    
    // Mirror X coordinate (camera is mirrored)
    const rawX = 1 - palmCenter.x;
    const rawY = palmCenter.y;
    
    // Low-pass filter for smooth movement
    smoothedPos.x = smoothedPos.x * 0.7 + rawX * 0.3;
    smoothedPos.y = smoothedPos.y * 0.7 + rawY * 0.3;
    
    // Update cursor position
    const screenX = smoothedPos.x * window.innerWidth;
    const screenY = smoothedPos.y * window.innerHeight;
    cursor.style.left = `${screenX}px`;
    cursor.style.top = `${screenY}px`;
    cursor.classList.remove('hidden');
    
    // 计算手掌大小（用于远近识别）
    const currentHandSize = getHandSize(landmarks);
    
    // 平滑手掌大小
    smoothedHandSize = smoothedHandSize * 0.8 + currentHandSize * 0.2;
    
    // 校准基线（第一次检测到手时）
    if (!handSizeCalibrated) {
        handSizeBaseline = currentHandSize;
        smoothedHandSize = currentHandSize;
        handSizeCalibrated = true;
        console.log('👋 Hand size calibrated:', handSizeBaseline.toFixed(3));
    }
    
    // Recognize gesture
    const gesture = recognizeGesture(landmarks);
    
    // 在开掌状态下应用远近缩放
    if (gesture === 'OPEN_PALM' && !expandedPhoto) {
        applyHandDistanceZoom();
    }
    
    // Process continuous gestures (every frame)
    processContinuousGesture(gesture, landmarks, smoothedPos);
    
    // Update last position and hand size
    lastHandPos.x = smoothedPos.x;
    lastHandPos.y = smoothedPos.y;
    lastHandSize = currentHandSize;
    lastGesture = gesture;
}

// 应用手势远近缩放
function applyHandDistanceZoom() {
    if (!handSizeCalibrated) return;
    
    // 计算手掌大小相对于基线的变化
    const sizeRatio = smoothedHandSize / handSizeBaseline;
    
    // 设置缩放范围
    // 手距离远（手掌看起来小）-> 缩小 -> sizeRatio < 1
    // 手距离近（手掌看起来大）-> 放大 -> sizeRatio > 1
    
    // 缩放灵敏度
    const zoomSensitivity = 3.0;
    
    // 计算目标缩放值
    // sizeRatio 1.0 = 基线（默认位置）
    // sizeRatio 1.3 = 手接近 -> 放大（camera.z 减小）
    // sizeRatio 0.7 = 手远离 -> 缩小（camera.z 增大）
    
    const targetZ = CONFIG.camera.initialZ - (sizeRatio - 1.0) * zoomSensitivity;
    
    // 缓动进入目标位置
    const currentZ = camera.position.z;
    const newZ = currentZ + (targetZ - currentZ) * 0.1;
    
    // 限制范围
    camera.position.z = Math.max(CONFIG.camera.minZ, Math.min(CONFIG.camera.maxZ, newZ));
}

function getPalmCenter(landmarks) {
    // Use wrist (0) and middle finger MCP (9) for palm center
    const wrist = landmarks[0];
    const middleMCP = landmarks[9];
    
    return {
        x: (wrist.x + middleMCP.x) / 2,
        y: (wrist.y + middleMCP.y) / 2
    };
}

// 计算手掌大小（用于远近识别）
function getHandSize(landmarks) {
    // 使用多个关键点的距离来估算手掌大小
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const pinkyTip = landmarks[20];
    const middleMCP = landmarks[9];
    
    // 计算手掌对角线距离（手腕到中指指尖）
    const palmDiagonal = Math.hypot(
        wrist.x - middleTip.x,
        wrist.y - middleTip.y
    );
    
    // 计算手掌宽度（拇指到小指）
    const palmWidth = Math.hypot(
        thumbTip.x - pinkyTip.x,
        thumbTip.y - pinkyTip.y
    );
    
    // 计算手掌高度（手腕到中指根部）
    const palmHeight = Math.hypot(
        wrist.x - middleMCP.x,
        wrist.y - middleMCP.y
    );
    
    // 综合这些指标
    return (palmDiagonal + palmWidth + palmHeight) / 3;
}

function recognizeGesture(lm) {
    const thumbTip = lm[4];
    const indexTip = lm[8];
    const middleTip = lm[12];
    const ringTip = lm[16];
    const pinkyTip = lm[20];
    
    // Helper: is finger extended?
    function isExtended(tipId, pipId) {
        return lm[tipId].y < lm[pipId].y;
    }
    
    const indexExtended = isExtended(8, 6);
    const middleExtended = isExtended(12, 10);
    const ringExtended = isExtended(16, 14);
    const pinkyExtended = isExtended(20, 18);
    
    // Pinch: Thumb and Index close together
    const pinchDistance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
    if (pinchDistance < 0.06) {
        return 'PINCH';
    }
    
    // Fist: All fingers closed
    if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
        return 'FIST';
    }
    
    // Open Palm: All fingers open
    if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
        return 'OPEN_PALM';
    }
    
    // V-Sign: Index and Middle open, others closed
    if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
        return 'V_SIGN';
    }
    
    // Point: Only index extended
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
    
    // 检测悬停的照片
    if (gesture !== 'POINT') {
        checkPhotoHover(screenX, screenY);
    }
    
    // OPEN_PALM: Rotate tree (relative control) with inertia
    if (gesture === 'OPEN_PALM') {
        if (expandedPhoto) {
            // 如果有放大的照片，张开手掌关闭它
            closeExpandedPhoto();
            return;
        }
        
        // 如果之前是握拳状态，松开后恢复圣诞树形状
        if (isFistShape) {
            isFistShape = false;
            console.log('🎄 Restoring tree shape...');
        }
        
        autoRotate = false;
        isGestureActive = true;
        cursor.classList.add('active');
        
        // Map hand movement to tree rotation
        const rotDeltaY = deltaX * 5;
        const rotDeltaX = deltaY * 3;
        
        treeGroup.rotation.y += rotDeltaY;
        treeGroup.rotation.x += rotDeltaX;
        
        // 记录速度用于惯性
        gestureVelocity.rotX = rotDeltaX;
        gestureVelocity.rotY = rotDeltaY;
        
        // Clamp X rotation
        treeGroup.rotation.x = Math.max(-0.5, Math.min(0.5, treeGroup.rotation.x));
    }
    // POINT: Select and expand photo (食指指向)
    else if (gesture === 'POINT') {
        cursor.classList.add('active');
        
        // 检测指向的照片
        const hoveredPhoto = checkPhotoHover(screenX, screenY);
        
        // 如果持续指向同一照片超过 0.5 秒，则放大
        if (hoveredPhoto && !expandedPhoto) {
            if (selectedPhoto === hoveredPhoto) {
                if (!gestureStartTime) {
                    gestureStartTime = performance.now();
                } else if (performance.now() - gestureStartTime > 500) {
                    expandPhoto(hoveredPhoto);
                    gestureStartTime = 0;
                }
            } else {
                gestureStartTime = performance.now();
            }
        }
    }
    // PINCH: Zoom (relative control based on pinch distance) with inertia
    else if (gesture === 'PINCH') {
        if (expandedPhoto) return;  // 照片放大时禁用缩放
        
        autoRotate = false;
        isGestureActive = true;
        cursor.classList.add('active');
        
        // Use vertical movement for zoom
        const zoomDelta = -deltaY * 10;
        camera.position.z += zoomDelta;
        camera.position.z = Math.max(CONFIG.camera.minZ, Math.min(CONFIG.camera.maxZ, camera.position.z));
        
        // 记录速度用于惯性
        gestureVelocity.zoom = zoomDelta;
    }
    // FIST: Transform to sphere shape
    else if (gesture === 'FIST') {
        if (expandedPhoto) {
            if (lastGesture !== 'FIST') {
                closeExpandedPhoto();
            }
        } else if (isExploded) {
            if (lastGesture !== 'FIST') {
                // 如果已爆炸，握拳聚合
                gatherParticles();
            }
        } else {
            // 握拳时变成球形
            if (!isFistShape) {
                isFistShape = true;
                autoRotate = false;
                console.log('🔵 Transforming to sphere...');
            }
            cursor.classList.add('active');
            
            // 握拳时也可以旋转
            const rotDeltaY = deltaX * 5;
            const rotDeltaX = deltaY * 3;
            treeGroup.rotation.y += rotDeltaY;
            treeGroup.rotation.x += rotDeltaX;
            gestureVelocity.rotX = rotDeltaX;
            gestureVelocity.rotY = rotDeltaY;
            treeGroup.rotation.x = Math.max(-0.5, Math.min(0.5, treeGroup.rotation.x));
        }
    }
    // V_SIGN: 爆炸/聚合粒子
    else if (gesture === 'V_SIGN' && lastGesture !== 'V_SIGN') {
        if (!expandedPhoto) {
            if (isExploded) {
                gatherParticles();
                console.log('🎄 Gathering particles...');
            } else {
                explodeParticles();
                console.log('💥 Exploding particles!');
            }
        }
    }
    else {
        cursor.classList.remove('active');
        gestureStartTime = 0;
        isGestureActive = false;
        
        // 没有手势时，如果是球形状态，恢复圣诞树
        if (gesture === 'NONE') {
            if (isFistShape) {
                isFistShape = false;
                console.log('🎄 Restoring tree shape...');
            }
            if (!expandedPhoto) {
                autoRotate = true;
            }
        }
    }
}

function resetView() {
    console.log('Resetting view...');
    
    // Smooth reset animation
    const targetRotationX = 0;
    const targetRotationY = 0;
    const targetCameraZ = CONFIG.camera.initialZ;
    
    // Use simple animation
    const duration = 500;
    const startTime = performance.now();
    const startRotationX = treeGroup.rotation.x;
    const startRotationY = treeGroup.rotation.y;
    const startCameraZ = camera.position.z;
    
    function animateReset() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        
        treeGroup.rotation.x = startRotationX + (targetRotationX - startRotationX) * eased;
        treeGroup.rotation.y = startRotationY + (targetRotationY - startRotationY) * eased;
        camera.position.z = startCameraZ + (targetCameraZ - startCameraZ) * eased;
        
        if (progress < 1) {
            requestAnimationFrame(animateReset);
        } else {
            autoRotate = true;
        }
    }
    
    animateReset();
}

// ============================================
// Initialization (exported for main.js)
// ============================================

export function init() {
    // Set canvas size for debug view
    canvasElement.width = 640;
    canvasElement.height = 480;
    
    // Initialize Three.js scene
    initThreeScene();
    
    console.log('🎄 3D Christmas Tree initialized!');
    console.log('Gestures:');
    console.log('  ✋ Open Palm - Rotate tree (with inertia) + Distance zoom (near=zoom in, far=zoom out)');
    console.log('  ☝️ Point - Select & expand photo (hold 0.5s)');
    console.log('  🤏 Pinch - Zoom in/out (with inertia)');
    console.log('  ✊ Fist - Transform to sphere / Release to restore tree');
    console.log('  ✌️ V-Sign - Explode / Gather particles');
    console.log('  🖱️ Click - Click on photo to expand');
}

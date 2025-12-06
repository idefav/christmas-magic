
// ============================================
// Starry Night V2 - 星辰大海效果
// Three.js + MediaPipe Hands
// 默认星星散布，手势捏取后显示星座连线
// ============================================

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CONSTELLATIONS } from './constellations-v2.js';

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
let constellationStars = [];   // 星座的星星
let constellationLines = [];   // 星座连线
let bgParticles;
let oceanUniforms, bgUniforms;
let raycaster, mouse;

// === 状态 ===
let activeConstellation = null;    // 当前激活的星座
let isGrabbing = false;            // 是否正在捏取

// Hand tracking state
let smoothedHandSize = 0;
let handSizeCalibrated = false;
let handSizeBaseline = 0;
let lastHandSize = 0;

// === Configuration ===
const CONFIG = {
    oceanStars: { count: 2500, radius: 80 },
    bloom: { strength: 1.5, radius: 0.4, threshold: 0.1 },  // 增强bloom效果
    camera: { fov: 60, near: 0.1, far: 1000, initialZ: 20, minZ: 8, maxZ: 40 },
    grab: { 
        lineAnimDuration: 1500,
    }
};

// === Gesture State ===
let lastGesture = 'NONE';
let lastHandPos = { x: 0.5, y: 0.5 };
let smoothedPos = { x: 0.5, y: 0.5 };
let isGestureActive = false;
let autoRotate = true;
let gestureVelocity = { rotX: 0, rotY: 0, zoom: 0 };
let constellationInfoElement = null;
let shootingStars = [];
let constellationsMap = {};

// === Camera Animation State ===
let cameraAnimation = {
    isAnimating: false,
    startRotation: { x: 0, y: 0 },
    targetRotation: { x: 0, y: 0 },
    startZoom: 20,
    targetZoom: 12,
    progress: 0,
    duration: 1200,  // ms
    startTime: 0,
    originalRotation: { x: 0, y: 0 },
    originalZoom: 20
};

// === 星座展开动画状态 ===
let constellationExpand = {
    isAnimating: false,
    progress: 0,
    duration: 1500,  // ms
    startTime: 0,
    stars: [],       // { mesh, startPos, targetPos }
    phase: 'idle'    // 'idle' | 'expanding' | 'expanded' | 'collapsing'
};

// ============================================
// Three.js Scene Initialization
// ============================================

export function initThreeScene() {
    initDOMElements();
    
    // Scene - 深邃的蓝色夜空
    scene = new THREE.Scene();
    // 创建渐变背景
    createGradientBackground();
    
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
    raycaster.params.Points.threshold = 0.5;
    mouse = new THREE.Vector2();
    
    // Create scene elements
    createOceanOfStars();
    createConstellations();
    createNebulaParticles();
    createShootingStars();
    
    // Post-processing
    setupPostProcessing();
    
    // UI
    createConstellationInfo();
    
    // Event listeners
    window.addEventListener('resize', onWindowResize);
    canvas.addEventListener('click', onCanvasClick);
    
    // Start animation
    animate();
}

// ============================================
// 渐变背景
// ============================================

function createGradientBackground() {
    // 纯黑色背景
    scene.background = new THREE.Color(0x000000);
}

// ============================================
// 星辰大海 - Ocean of Stars (十字星芒效果)
// ============================================

function createOceanOfStars() {
    const { count, radius } = CONFIG.oceanStars;
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const randoms = new Float32Array(count);
    const twinklePhases = new Float32Array(count);
    
    // 更明亮的白色/淡蓝色星星
    const starColors = [
        new THREE.Color(0xFFFFFF),  // 纯白
        new THREE.Color(0xE8F4FF),  // 淡蓝白
        new THREE.Color(0xD4EAFF),  // 浅蓝
        new THREE.Color(0xC0E0FF),  // 淡天蓝
        new THREE.Color(0xFFFFFF),  // 纯白（增加白色权重）
    ];
    
    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = radius * (0.3 + Math.random() * 0.7);
        
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
        
        const color = starColors[Math.floor(Math.random() * starColors.length)];
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        // 调整星星大小分布，更多明亮的大星星
        const sizeRandom = Math.random();
        if (sizeRandom > 0.95) {
            sizes[i] = 4.0 + Math.random() * 3.0;  // 超亮星星
        } else if (sizeRandom > 0.85) {
            sizes[i] = 2.5 + Math.random() * 2.0;  // 亮星星
        } else if (sizeRandom > 0.6) {
            sizes[i] = 1.2 + Math.random() * 1.5;  // 中等星星
        } else {
            sizes[i] = 0.4 + Math.random() * 0.8;  // 小星星
        }
        
        randoms[i] = Math.random();
        twinklePhases[i] = Math.random() * Math.PI * 2;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    geometry.setAttribute('aTwinkle', new THREE.BufferAttribute(twinklePhases, 1));
    
    oceanUniforms = {
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
            attribute float aTwinkle;
            varying vec3 vColor;
            varying float vAlpha;
            
            void main() {
                vColor = aColor;
                
                vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                vec4 viewPosition = viewMatrix * modelPosition;
                vec4 projectedPosition = projectionMatrix * viewPosition;
                gl_Position = projectedPosition;
                
                float twinkleSpeed = 0.5 + aRandom * 2.0;
                float twinkle = sin(uTime * twinkleSpeed + aTwinkle) * 0.3 + 0.7;
                float brightness = 0.5 + aRandom * 0.5;
                vAlpha = twinkle * brightness;
                
                float distanceFactor = 80.0 / max(-viewPosition.z, 1.0);
                gl_PointSize = aSize * uPixelRatio * twinkle * distanceFactor;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vAlpha;
            
            void main() {
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);
                
                // 十字星芒效果
                vec2 uv = gl_PointCoord - vec2(0.5);
                float crossH = exp(-abs(uv.y) * 15.0) * exp(-abs(uv.x) * 3.0);  // 水平光芒
                float crossV = exp(-abs(uv.x) * 15.0) * exp(-abs(uv.y) * 3.0);  // 垂直光芒
                float cross = max(crossH, crossV) * 0.8;
                
                // 中心光点
                float core = exp(-dist * 8.0);
                
                // 外部光晕
                float glow = exp(-dist * 3.0) * 0.6;
                
                // 组合效果
                float alpha = core + glow + cross;
                alpha *= vAlpha;
                
                // 限制范围
                if (dist > 0.5 && cross < 0.01) discard;
                
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        uniforms: oceanUniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const stars = new THREE.Points(geometry, material);
    scene.add(stars);
}

// ============================================
// 星座系统 - 默认隐藏连线
// ============================================

function createConstellations() {
    const constellationKeys = Object.keys(CONSTELLATIONS);
    const gridSize = Math.ceil(Math.sqrt(constellationKeys.length));
    
    constellationKeys.forEach((key, constIndex) => {
        const constellation = CONSTELLATIONS[key];
        
        const theta = (constIndex % gridSize) / gridSize * Math.PI * 2;
        const phi = Math.floor(constIndex / gridSize) / gridSize * Math.PI * 0.6 + Math.PI * 0.2;
        const radius = 25;
        
        const baseOffset = new THREE.Vector3(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi) - 5,
            radius * Math.sin(phi) * Math.sin(theta)
        );
        
        const constellationData = {
            key: key,
            stars: [],
            lines: [],
            artLines: [],   // 拟物图线条
            center: baseOffset.clone(),
            isActive: false
        };
        
        constellation.stars.forEach((starData, starIndex) => {
            const localPos = new THREE.Vector3(
                starData.x * 3.0,
                starData.y * 3.0,
                starData.z * 0.5
            );
            
            const position = localPos.add(baseOffset);
            
            // 默认使用明亮的白色/淡蓝色
            const defaultColor = 0xd0e8ff;
            const starMesh = createConstellationStar(starData.size, defaultColor);
            starMesh.position.copy(position);
            starMesh.userData = {
                constellation: key,
                starIndex: starIndex,
                starName: starData.name,
                originalPosition: position.clone(),
                baseSize: starData.size,
                phase: Math.random() * Math.PI * 2,
                // 保存原始星座数据中的相对位置，用于展开动画
                relativeX: starData.x,
                relativeY: starData.y,
                // 保存星座原始颜色，选中时使用
                constellationColor: constellation.color,
                defaultColor: defaultColor
            };
            
            starGroup.add(starMesh);
            constellationData.stars.push(starMesh);
            constellationStars.push(starMesh);
        });
        
        constellation.lines.forEach(([startIdx, endIdx]) => {
            // 确保索引有效
            if (startIdx >= constellationData.stars.length || endIdx >= constellationData.stars.length) {
                console.warn(`Invalid line index for ${key}: ${startIdx}-${endIdx}`);
                return;
            }
            
            const startStar = constellationData.stars[startIdx];
            const endStar = constellationData.stars[endIdx];
            
            if (!startStar || !endStar) {
                console.warn(`Missing star for line in ${key}`);
                return;
            }
            
            // 默认使用亮白色连线
            const defaultLineColor = 0xd0e8ff;
            const line = createConstellationLine(
                startStar.position,
                endStar.position,
                defaultLineColor
            );
            line.material.opacity = 0;
            line.userData = {
                constellation: key,
                startStar: startStar,
                endStar: endStar,
                targetOpacity: 0,
                constellationColor: constellation.color,
                defaultColor: defaultLineColor
            };
            starGroup.add(line);
            constellationData.lines.push(line);
            constellationLines.push(line);
        });
        
        console.log(`📌 ${key}: Created ${constellationData.stars.length} stars, ${constellationData.lines.length} lines`);
        
        // 创建拟物图线条 (artLines)
        if (constellation.artLines && constellation.artLines.length > 0) {
            constellation.artLines.forEach((pathPoints, artIndex) => {
                // pathPoints 是一组连续的点，用于绘制一条艺术线条
                const artLine = createArtLine(pathPoints, constellation.color, baseOffset);
                artLine.material.opacity = 0;
                artLine.userData = {
                    constellation: key,
                    artIndex: artIndex,
                    targetOpacity: 0,
                    constellationColor: constellation.color,
                    defaultColor: 0xd0e8ff,
                    // 保存原始点数据用于展开时重新计算
                    originalPoints: pathPoints
                };
                starGroup.add(artLine);
                constellationData.artLines.push(artLine);
            });
        }
        
        constellationsMap[key] = constellationData;
    });
}

function createConstellationStar(size, color) {
    const canvas2d = document.createElement('canvas');
    canvas2d.width = 128;
    canvas2d.height = 128;
    const ctx = canvas2d.getContext('2d');
    
    const colorObj = new THREE.Color(color);
    const r = Math.floor(colorObj.r * 255);
    const g = Math.floor(colorObj.g * 255);
    const b = Math.floor(colorObj.b * 255);
    
    // 清除画布
    ctx.clearRect(0, 0, 128, 128);
    
    // 绘制十字光芒
    const cx = 64, cy = 64;
    
    // 水平光芒
    const hGradient = ctx.createLinearGradient(0, cy, 128, cy);
    hGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    hGradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.3)`);
    hGradient.addColorStop(0.5, `rgba(255, 255, 255, 0.9)`);
    hGradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.3)`);
    hGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = hGradient;
    ctx.fillRect(0, cy - 3, 128, 6);
    
    // 垂直光芒
    const vGradient = ctx.createLinearGradient(cx, 0, cx, 128);
    vGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    vGradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.3)`);
    vGradient.addColorStop(0.5, `rgba(255, 255, 255, 0.9)`);
    vGradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.3)`);
    vGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = vGradient;
    ctx.fillRect(cx - 3, 0, 6, 128);
    
    // 中心光点和光晕
    const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 32);
    coreGradient.addColorStop(0, '#ffffff');
    coreGradient.addColorStop(0.15, `rgba(${r}, ${g}, ${b}, 1)`);
    coreGradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.4)`);
    coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.fill();
    
    const texture = new THREE.CanvasTexture(canvas2d);
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size * 0.3, size * 0.3, 1);
    
    return sprite;
}

function createConstellationLine(start, end, color) {
    // 使用 BufferGeometry 以便后续更新位置
    const positions = new Float32Array(6);
    positions[0] = start.x;
    positions[1] = start.y;
    positions[2] = start.z;
    positions[3] = end.x;
    positions[4] = end.y;
    positions[5] = end.z;
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        linewidth: 2  // 注意：WebGL 中 linewidth 可能不生效
    });
    
    return new THREE.Line(geometry, material);
}

// 创建拟物图艺术线条
function createArtLine(pathPoints, color, baseOffset) {
    // pathPoints 格式: [{ x, y, z }, { x, y, z }, ...]
    const scale = 3.0;  // 与星星位置一致的缩放
    
    const points = pathPoints.map(p => new THREE.Vector3(
        p.x * scale + baseOffset.x,
        p.y * scale + baseOffset.y,
        (p.z || 0) * 0.5 + baseOffset.z
    ));
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        linewidth: 1  // 注意: WebGL 不支持大于1的线宽
    });
    
    return new THREE.Line(geometry, material);
}

// ============================================
// 星座激活效果
// ============================================

function activateConstellation(key) {
    if (activeConstellation === key) return;
    
    if (activeConstellation) {
        deactivateConstellation(activeConstellation);
    }
    
    activeConstellation = key;
    const constellation = constellationsMap[key];
    if (!constellation) return;
    
    constellation.isActive = true;
    showConstellationInfo(key);
    
    // 给星星和连线染上星座颜色
    colorizeConstellation(constellation, true);
    
    // 开始星座展开动画（星星移动到屏幕中央并铺开）
    startConstellationExpand(key, constellation);
    
    console.log(`✨ Activated: ${CONSTELLATIONS[key].nameCN} (${CONSTELLATIONS[key].name})`);
}

function deactivateConstellation(key) {
    const constellation = constellationsMap[key];
    if (!constellation) return;
    
    constellation.isActive = false;
    
    // 恢复星星和连线的默认颜色
    colorizeConstellation(constellation, false);
    
    constellation.lines.forEach(line => {
        line.userData.targetOpacity = 0;
    });
    
    // 隐藏拟物图线条
    constellation.artLines.forEach(artLine => {
        artLine.userData.targetOpacity = 0;
    });
    
    if (activeConstellation === key) {
        activeConstellation = null;
        hideConstellationInfo();
        
        // 开始收缩动画，星星回到原位
        startConstellationCollapse();
    }
}

// 给星座染色或恢复默认颜色
function colorizeConstellation(constellation, activate) {
    // 给星星染色
    constellation.stars.forEach(star => {
        const ud = star.userData;
        const targetColor = activate ? ud.constellationColor : ud.defaultColor;
        
        // 重新创建星星纹理
        const newTexture = createStarTexture(targetColor);
        star.material.map.dispose();
        star.material.map = newTexture;
        star.material.needsUpdate = true;
    });
    
    // 给连线染色
    constellation.lines.forEach(line => {
        const ud = line.userData;
        const targetColor = activate ? ud.constellationColor : ud.defaultColor;
        line.material.color.setHex(targetColor);
    });
    
    // 给拟物图线条染色
    constellation.artLines.forEach(artLine => {
        const ud = artLine.userData;
        const targetColor = activate ? ud.constellationColor : ud.defaultColor;
        artLine.material.color.setHex(targetColor);
    });
}

// 创建星星纹理（带十字光芒）
function createStarTexture(color) {
    const canvas2d = document.createElement('canvas');
    canvas2d.width = 128;
    canvas2d.height = 128;
    const ctx = canvas2d.getContext('2d');
    
    const colorObj = new THREE.Color(color);
    const r = Math.floor(colorObj.r * 255);
    const g = Math.floor(colorObj.g * 255);
    const b = Math.floor(colorObj.b * 255);
    
    // 清除画布
    ctx.clearRect(0, 0, 128, 128);
    
    // 绘制十字光芒
    const cx = 64, cy = 64;
    
    // 水平光芒
    const hGradient = ctx.createLinearGradient(0, cy, 128, cy);
    hGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    hGradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.3)`);
    hGradient.addColorStop(0.5, `rgba(255, 255, 255, 0.9)`);
    hGradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.3)`);
    hGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = hGradient;
    ctx.fillRect(0, cy - 3, 128, 6);
    
    // 垂直光芒
    const vGradient = ctx.createLinearGradient(cx, 0, cx, 128);
    vGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    vGradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.3)`);
    vGradient.addColorStop(0.5, `rgba(255, 255, 255, 0.9)`);
    vGradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.3)`);
    vGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = vGradient;
    ctx.fillRect(cx - 3, 0, 6, 128);
    
    // 中心光点和光晕
    const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 32);
    coreGradient.addColorStop(0, '#ffffff');
    coreGradient.addColorStop(0.15, `rgba(${r}, ${g}, ${b}, 1)`);
    coreGradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.4)`);
    coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.fill();
    
    return new THREE.CanvasTexture(canvas2d);
}

// ============================================
// 星座展开动画 - 星星移动到屏幕中央并铺开
// ============================================

function startConstellationExpand(key, constellation) {
    // 停止自动旋转
    autoRotate = false;
    gestureVelocity.rotX = 0;
    gestureVelocity.rotY = 0;
    gestureVelocity.zoom = 0;
    
    // 保存原始相机状态
    if (constellationExpand.phase === 'idle') {
        cameraAnimation.originalRotation.x = starGroup.rotation.x;
        cameraAnimation.originalRotation.y = starGroup.rotation.y;
        cameraAnimation.originalZoom = camera.position.z;
    }
    
    // 获取该星座的所有星星
    const constellationStarMeshes = constellationStars.filter(
        star => star.userData.constellation === key
    );
    
    // 计算星座的边界
    const data = CONSTELLATIONS[key];
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    constellationStarMeshes.forEach(star => {
        const ud = star.userData;
        minX = Math.min(minX, ud.relativeX);
        maxX = Math.max(maxX, ud.relativeX);
        minY = Math.min(minY, ud.relativeY);
        maxY = Math.max(maxY, ud.relativeY);
    });
    
    const originalWidth = maxX - minX || 1;
    const originalHeight = maxY - minY || 1;
    const originalCenterX = (minX + maxX) / 2;
    const originalCenterY = (minY + maxY) / 2;
    
    // 计算展开后的目标位置（在屏幕中央铺开）
    // 展开比例：让星座占据屏幕合适的范围
    const expandScale = 6 / Math.max(originalWidth, originalHeight);
    
    // 设置展开动画数据
    constellationExpand.stars = constellationStarMeshes.map(star => {
        const ud = star.userData;
        
        // 计算目标位置（相对于屏幕中心展开）
        const targetX = (ud.relativeX - originalCenterX) * expandScale;
        const targetY = (ud.relativeY - originalCenterY) * expandScale;
        
        return {
            mesh: star,
            startPos: star.position.clone(),
            targetPos: new THREE.Vector3(targetX, targetY, 0),
            originalPos: ud.originalPosition.clone(),  // 保存真正的原始位置
            originalSize: ud.baseSize
        };
    });
    
    // 开始动画
    constellationExpand.isAnimating = true;
    constellationExpand.progress = 0;
    constellationExpand.startTime = performance.now();
    constellationExpand.phase = 'expanding';
    
    // 同时移动相机到正视图，与展开动画同步
    cameraAnimation.startRotation.x = starGroup.rotation.x;
    cameraAnimation.startRotation.y = starGroup.rotation.y;
    cameraAnimation.startZoom = camera.position.z;
    cameraAnimation.targetRotation.x = 0;
    cameraAnimation.targetRotation.y = 0;
    cameraAnimation.targetZoom = 10;  // 拉近相机
    cameraAnimation.duration = constellationExpand.duration;  // 与展开动画同步
    cameraAnimation.isAnimating = true;
    cameraAnimation.progress = 0;
    cameraAnimation.startTime = performance.now();
}

function startConstellationCollapse() {
    if (constellationExpand.phase !== 'expanded' && constellationExpand.phase !== 'expanding') {
        return;
    }
    
    // 反转动画：从当前位置回到原始位置
    constellationExpand.stars.forEach(item => {
        item.startPos = item.mesh.position.clone();
        item.targetPos = item.originalPos.clone();  // 使用保存的原始位置
    });
    
    constellationExpand.isAnimating = true;
    constellationExpand.progress = 0;
    constellationExpand.startTime = performance.now();
    constellationExpand.phase = 'collapsing';
    
    // 恢复相机位置，与收缩动画同步
    cameraAnimation.startRotation.x = starGroup.rotation.x;
    cameraAnimation.startRotation.y = starGroup.rotation.y;
    cameraAnimation.startZoom = camera.position.z;
    cameraAnimation.targetRotation.x = cameraAnimation.originalRotation.x;
    cameraAnimation.targetRotation.y = cameraAnimation.originalRotation.y;
    cameraAnimation.targetZoom = cameraAnimation.originalZoom;
    cameraAnimation.duration = constellationExpand.duration;  // 与收缩动画同步
    cameraAnimation.isAnimating = true;
    cameraAnimation.progress = 0;
    cameraAnimation.startTime = performance.now();
    
    // 动画结束后恢复自动旋转
    setTimeout(() => {
        if (!activeConstellation) {
            autoRotate = true;
        }
    }, constellationExpand.duration);
}

function updateConstellationExpand() {
    if (!constellationExpand.isAnimating) return;
    
    const elapsed = performance.now() - constellationExpand.startTime;
    constellationExpand.progress = Math.min(elapsed / constellationExpand.duration, 1);
    
    // 根据动画阶段选择不同的缓动函数
    let eased;
    if (constellationExpand.phase === 'expanding') {
        eased = easeOutBack(constellationExpand.progress);
    } else {
        // 收缩使用更平滑的缓动
        eased = easeOutCubic(constellationExpand.progress);
    }
    
    // 更新每个星星的位置
    constellationExpand.stars.forEach(item => {
        item.mesh.position.lerpVectors(item.startPos, item.targetPos, eased);
        
        // 展开时星星稍微放大一点点
        if (constellationExpand.phase === 'expanding') {
            const scale = item.originalSize * 0.3 * (1 + eased * 0.2);
            item.mesh.scale.set(scale, scale, 1);
        } else if (constellationExpand.phase === 'collapsing') {
            const scale = item.originalSize * 0.3 * (1.2 - eased * 0.2);
            item.mesh.scale.set(scale, scale, 1);
        }
    });
    
    // 动画完成
    if (constellationExpand.progress >= 1) {
        constellationExpand.isAnimating = false;
        
        if (constellationExpand.phase === 'expanding') {
            constellationExpand.phase = 'expanded';
            // 展开完成后开始连线动画
            const constellation = constellationsMap[activeConstellation];
            if (constellation) {
                animateLineReveal(constellation);
            }
        } else if (constellationExpand.phase === 'collapsing') {
            constellationExpand.phase = 'idle';
            // 恢复拟物图线条的原始位置
            restoreArtLinesPosition();
            constellationExpand.stars = [];
        }
    }
}

function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeOutElastic(t) {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

function updateCameraAnimation() {
    if (!cameraAnimation.isAnimating) return;
    
    const elapsed = performance.now() - cameraAnimation.startTime;
    cameraAnimation.progress = Math.min(elapsed / cameraAnimation.duration, 1);
    
    // 使用 ease-out 缓动函数
    const eased = 1 - Math.pow(1 - cameraAnimation.progress, 3);
    
    // 插值旋转
    starGroup.rotation.x = lerp(cameraAnimation.startRotation.x, cameraAnimation.targetRotation.x, eased);
    starGroup.rotation.y = lerpAngle(cameraAnimation.startRotation.y, cameraAnimation.targetRotation.y, eased);
    
    // 插值缩放
    camera.position.z = lerp(cameraAnimation.startZoom, cameraAnimation.targetZoom, eased);
    
    // 动画完成
    if (cameraAnimation.progress >= 1) {
        cameraAnimation.isAnimating = false;
    }
}

function lerp(start, end, t) {
    return start + (end - start) * t;
}

function lerpAngle(start, end, t) {
    // 处理角度插值，选择最短路径
    let diff = end - start;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return start + diff * t;
}

function animateLineReveal(constellation) {
    const duration = CONFIG.grab.lineAnimDuration;
    const startTime = performance.now();
    const totalLines = constellation.lines.length;
    const totalArtLines = constellation.artLines.length;
    
    console.log(`🔗 Starting line reveal for constellation with ${totalLines} lines and ${totalArtLines} artLines`);
    
    // 更新拟物图线条的位置（展开后居中显示）
    updateArtLinesForExpanded(constellation);
    
    function animate() {
        if (!constellation.isActive) return;
        
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        // 显示星星之间的连线
        constellation.lines.forEach((line, index) => {
            // 每条线依次出现，延迟递增
            const lineDelay = totalLines > 1 ? (index / (totalLines - 1)) * 0.5 : 0;  // 修复除以0的问题
            const lineProgress = Math.max(0, Math.min(1, (eased - lineDelay) / (1 - lineDelay + 0.001)));
            // 线条透明度
            line.userData.targetOpacity = lineProgress * 1.0;
        });
        
        // 显示拟物图线条（稍微延迟，在星星连线之后）
        if (totalArtLines > 0) {
            constellation.artLines.forEach((artLine, index) => {
                // 拟物图线条延迟出现，在星星连线显示到一半后开始
                const artDelay = 0.3 + (totalArtLines > 1 ? (index / (totalArtLines - 1)) * 0.3 : 0);
                const artProgress = Math.max(0, Math.min(1, (eased - artDelay) / (1 - artDelay + 0.001)));
                artLine.userData.targetOpacity = artProgress * 0.6;  // 拟物图线条稍微透明一些
            });
        }
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // 动画完成后确保所有线条完全显示
            constellation.lines.forEach(line => {
                line.userData.targetOpacity = 1.0;
            });
            constellation.artLines.forEach(artLine => {
                artLine.userData.targetOpacity = 0.6;
            });
            console.log(`✅ Line reveal completed`);
        }
    }
    
    animate();
}

// 更新拟物图线条位置以适应展开后的布局
function updateArtLinesForExpanded(constellation) {
    const key = constellation.key;
    const data = CONSTELLATIONS[key];
    
    if (!data.artLines || data.artLines.length === 0) return;
    
    // 计算星座的边界（与 startConstellationExpand 一致）
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    data.stars.forEach(star => {
        minX = Math.min(minX, star.x);
        maxX = Math.max(maxX, star.x);
        minY = Math.min(minY, star.y);
        maxY = Math.max(maxY, star.y);
    });
    
    const originalWidth = maxX - minX || 1;
    const originalHeight = maxY - minY || 1;
    const originalCenterX = (minX + maxX) / 2;
    const originalCenterY = (minY + maxY) / 2;
    
    // 展开比例（与 startConstellationExpand 一致）
    const expandScale = 6 / Math.max(originalWidth, originalHeight);
    
    // 更新每条拟物图线条的几何体
    constellation.artLines.forEach((artLine, index) => {
        const originalPoints = data.artLines[index];
        
        // 计算展开后的新位置
        const newPoints = originalPoints.map(p => {
            const newX = (p.x - originalCenterX) * expandScale;
            const newY = (p.y - originalCenterY) * expandScale;
            return new THREE.Vector3(newX, newY, 0);
        });
        
        // 更新几何体
        artLine.geometry.dispose();
        artLine.geometry = new THREE.BufferGeometry().setFromPoints(newPoints);
    });
}

// 恢复拟物图线条到原始位置
function restoreArtLinesPosition() {
    Object.keys(constellationsMap).forEach(key => {
        const constellation = constellationsMap[key];
        const data = CONSTELLATIONS[key];
        
        if (!data.artLines || data.artLines.length === 0) return;
        
        const baseOffset = constellation.center;
        const scale = 3.0;  // 与星星位置一致的缩放
        
        constellation.artLines.forEach((artLine, index) => {
            const originalPoints = data.artLines[index];
            
            // 恢复原始位置
            const points = originalPoints.map(p => new THREE.Vector3(
                p.x * scale + baseOffset.x,
                p.y * scale + baseOffset.y,
                (p.z || 0) * 0.5 + baseOffset.z
            ));
            
            // 更新几何体
            artLine.geometry.dispose();
            artLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
        });
    });
}

// ============================================
// 星云粒子
// ============================================

function createNebulaParticles() {
    const count = 300;  // 增加粒子数量
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const randoms = new Float32Array(count);
    
    // 深蓝紫色调星云（参考图2效果）
    const nebulaColors = [
        new THREE.Color(0x0a0a25),  // 深蓝黑
        new THREE.Color(0x101040),  // 深紫蓝
        new THREE.Color(0x1a1a55),  // 紫蓝
        new THREE.Color(0x0d1a4a),  // 深蓝
        new THREE.Color(0x1e2a6a),  // 中蓝
        new THREE.Color(0x2a1a5a),  // 紫色调
    ];
    
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 80;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 50 - 25;
        
        const color = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        sizes[i] = 4 + Math.random() * 12;
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
                
                float pulse = sin(uTime * 0.2 + aRandom * 6.28) * 0.2 + 0.8;
                vAlpha = pulse * 0.08;
                
                gl_PointSize = aSize * uPixelRatio * pulse * (120.0 / -viewPosition.z);
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
                alpha = pow(alpha, 2.5);
                
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
// 流星效果
// ============================================

function createShootingStars() {
    // 增加流星频率：每1秒检查一次，80%概率生成
    setInterval(() => {
        if (Math.random() > 0.2) {
            createShootingStar();
        }
        // 额外概率生成第二颗流星
        if (Math.random() > 0.5) {
            setTimeout(() => createShootingStar(), 300 + Math.random() * 500);
        }
    }, 1000);
}

function createShootingStar() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(40 * 3);
    
    const startX = (Math.random() - 0.5) * 50;
    const startY = 15 + Math.random() * 10;
    const startZ = -10 + Math.random() * 20;
    
    const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        -1,
        (Math.random() - 0.5) * 0.5
    ).normalize();
    
    for (let i = 0; i < 40; i++) {
        positions[i * 3] = startX;
        positions[i * 3 + 1] = startY;
        positions[i * 3 + 2] = startZ;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.LineBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
    });
    
    const line = new THREE.Line(geometry, material);
    line.userData = {
        startPos: new THREE.Vector3(startX, startY, startZ),
        direction: direction,
        speed: 0.4 + Math.random() * 0.3,
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
        data.progress += data.speed * 0.04;
        data.life -= 0.015;
        
        if (data.life <= 0) {
            scene.remove(star);
            star.geometry.dispose();
            star.material.dispose();
            shootingStars.splice(i, 1);
            continue;
        }
        
        const positions = star.geometry.attributes.position.array;
        for (let j = 39; j > 0; j--) {
            positions[j * 3] = positions[(j - 1) * 3];
            positions[j * 3 + 1] = positions[(j - 1) * 3 + 1];
            positions[j * 3 + 2] = positions[(j - 1) * 3 + 2];
        }
        
        positions[0] = data.startPos.x + data.direction.x * data.progress * 30;
        positions[1] = data.startPos.y + data.direction.y * data.progress * 30;
        positions[2] = data.startPos.z + data.direction.z * data.progress * 30;
        
        star.geometry.attributes.position.needsUpdate = true;
        star.material.opacity = data.life * 0.9;
    }
}

// ============================================
// 星座信息显示
// ============================================

function createConstellationInfo() {
    constellationInfoElement = document.createElement('div');
    constellationInfoElement.id = 'constellation-info';
    constellationInfoElement.style.cssText = `
        position: fixed;
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, rgba(10, 10, 30, 0.9), rgba(20, 20, 50, 0.8));
        border: 1px solid rgba(100, 150, 255, 0.3);
        border-radius: 15px;
        padding: 20px 35px;
        color: white;
        font-family: 'Segoe UI', Arial, sans-serif;
        text-align: center;
        opacity: 0;
        transition: all 0.4s ease;
        pointer-events: none;
        z-index: 100;
        backdrop-filter: blur(10px);
        box-shadow: 0 0 30px rgba(100, 150, 255, 0.2);
    `;
    document.body.appendChild(constellationInfoElement);
}

function showConstellationInfo(key) {
    if (!constellationInfoElement) return;
    
    const data = CONSTELLATIONS[key];
    const colorHex = '#' + data.color.toString(16).padStart(6, '0');
    
    constellationInfoElement.innerHTML = `
        <div style="font-size: 32px; margin-bottom: 8px;">${data.symbol}</div>
        <div style="font-size: 26px; margin-bottom: 5px; color: ${colorHex}; text-shadow: 0 0 10px ${colorHex};">${data.nameCN}</div>
        <div style="font-size: 14px; color: rgba(255,255,255,0.6);">${data.name}</div>
        <div style="font-size: 12px; color: rgba(150,200,255,0.7); margin-top: 10px;">
            ${data.date} · ${data.stars.length} 颗星
        </div>
    `;
    constellationInfoElement.style.opacity = '1';
    constellationInfoElement.style.transform = 'translateX(-50%) translateY(0)';
}

function hideConstellationInfo() {
    if (constellationInfoElement) {
        constellationInfoElement.style.opacity = '0';
        constellationInfoElement.style.transform = 'translateX(-50%) translateY(10px)';
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
    
    if (oceanUniforms) oceanUniforms.uTime.value = time;
    if (bgUniforms) bgUniforms.uTime.value = time;
    
    // 更新相机动画
    updateCameraAnimation();
    
    // 更新星座展开动画
    updateConstellationExpand();
    
    applyGestureInertia();
    updateConstellationStars(time);
    updateConstellationLines();
    updateShootingStars();
    
    if (autoRotate && starGroup && !cameraAnimation.isAnimating && !constellationExpand.isAnimating) {
        starGroup.rotation.y += 0.0003;
    }
    
    if (composer) {
        composer.render();
    }
}

function updateConstellationStars(time) {
    constellationStars.forEach(star => {
        const data = star.userData;
        
        // 如果星座正在展开/收缩动画中，跳过该星座的星星
        const isInExpandAnimation = constellationExpand.isAnimating && 
            constellationExpand.stars.some(item => item.mesh === star);
        
        if (isInExpandAnimation) {
            // 展开动画中的星星由 updateConstellationExpand 控制
            star.material.opacity = 1.0;
            return;
        }
        
        // 如果星座已展开，保持展开后的大小
        const isExpanded = constellationExpand.phase === 'expanded' &&
            constellationExpand.stars.some(item => item.mesh === star);
        
        if (isExpanded) {
            star.material.opacity = 1.0;
            return;
        }
        
        const twinkle = Math.sin(time * 1.5 + data.phase) * 0.2 + 0.8;
        
        if (activeConstellation === data.constellation) {
            // 选中的星座星星稍大一些
            const scale = data.baseSize * 0.8 * twinkle;
            star.scale.set(scale, scale, 1);
            star.material.opacity = 1.0;
        } else {
            // 未选中的星座星星，比背景星星稍亮一点
            const scale = data.baseSize * 0.4 * twinkle;
            star.scale.set(scale, scale, 1);
            star.material.opacity = 0.85;
        }
    });
}

function updateConstellationLines() {
    constellationLines.forEach(line => {
        const current = line.material.opacity;
        const target = line.userData.targetOpacity;
        
        line.material.opacity += (target - current) * 0.08;
        
        const startStar = line.userData.startStar;
        const endStar = line.userData.endStar;
        
        // 更新线条位置
        const positions = line.geometry.attributes.position.array;
        positions[0] = startStar.position.x;
        positions[1] = startStar.position.y;
        positions[2] = startStar.position.z;
        positions[3] = endStar.position.x;
        positions[4] = endStar.position.y;
        positions[5] = endStar.position.z;
        line.geometry.attributes.position.needsUpdate = true;
    });
    
    // 更新拟物图线条透明度
    Object.values(constellationsMap).forEach(constellation => {
        constellation.artLines.forEach(artLine => {
            const current = artLine.material.opacity;
            const target = artLine.userData.targetOpacity;
            artLine.material.opacity += (target - current) * 0.08;
        });
    });
}

function applyGestureInertia() {
    // 如果相机动画正在进行，不应用手势惯性
    if (cameraAnimation.isAnimating) return;
    
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
        
        if (activeConstellation === constellation) {
            deactivateConstellation(constellation);
        } else {
            activateConstellation(constellation);
        }
    } else if (activeConstellation) {
        deactivateConstellation(activeConstellation);
    }
}

function findNearestConstellation(screenPos) {
    mouse.x = (screenPos.x) * 2 - 1;
    mouse.y = -(screenPos.y) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(constellationStars);
    
    if (intersects.length > 0) {
        return intersects[0].object.userData.constellation;
    }
    return null;
}

// ============================================
// Window Resize
// ============================================

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    composer.setSize(window.innerWidth, window.innerHeight);
    
    if (oceanUniforms) {
        oceanUniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    }
}

// ============================================
// MediaPipe Hands Integration
// ============================================

export function onResults(results) {
    if (loading && !loading.classList.contains('hidden')) {
        loading.classList.add('hidden');
    }
    
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00BFFF', lineWidth: 2 });
            drawLandmarks(canvasCtx, landmarks, { color: '#87CEEB', lineWidth: 1 });
        }
        
        handleGestures(results.multiHandLandmarks[0]);
    } else {
        cursor.classList.add('hidden');
        isGestureActive = false;
        autoRotate = true;
        
        if (isGrabbing) {
            isGrabbing = false;
        }
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
    processGesture(gesture, smoothedPos);
    
    lastHandPos.x = smoothedPos.x;
    lastHandPos.y = smoothedPos.y;
    lastHandSize = currentHandSize;
    lastGesture = gesture;
}

function processGesture(gesture, currentPos) {
    const deltaX = currentPos.x - lastHandPos.x;
    const deltaY = currentPos.y - lastHandPos.y;
    
    // 捏取手势 - 激活星座
    if (gesture === 'PINCH') {
        cursor.classList.add('active');
        cursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
        
        if (!isGrabbing) {
            const nearestConstellation = findNearestConstellation(currentPos);
            if (nearestConstellation) {
                isGrabbing = true;
                activateConstellation(nearestConstellation);
            }
        }
        
        autoRotate = false;
        isGestureActive = true;
    }
    else if (gesture === 'OPEN_PALM') {
        cursor.classList.add('active');
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        autoRotate = false;
        isGestureActive = true;
        
        const rotDeltaY = deltaX * 4;
        const rotDeltaX = deltaY * 2.5;
        
        starGroup.rotation.y += rotDeltaY;
        starGroup.rotation.x += rotDeltaX;
        
        gestureVelocity.rotX = rotDeltaX;
        gestureVelocity.rotY = rotDeltaY;
        
        starGroup.rotation.x = Math.max(-0.8, Math.min(0.8, starGroup.rotation.x));
        
        applyHandDistanceZoom();
        
        if (isGrabbing) {
            isGrabbing = false;
        }
    }
    else if (gesture === 'POINT') {
        cursor.classList.add('active');
        
        const nearestConstellation = findNearestConstellation(currentPos);
        if (nearestConstellation && nearestConstellation !== activeConstellation) {
            const constellation = constellationsMap[nearestConstellation];
            if (constellation) {
                constellation.lines.forEach(line => {
                    if (line.userData.targetOpacity < 0.3) {
                        line.userData.targetOpacity = 0.3;
                    }
                });
            }
        }
    }
    else if (gesture === 'FIST') {
        cursor.classList.add('active');
        
        if (activeConstellation) {
            deactivateConstellation(activeConstellation);
        }
        isGrabbing = false;
    }
    else {
        cursor.classList.remove('active');
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        isGestureActive = false;
        
        if (gesture === 'NONE') {
            autoRotate = true;
        }
        
        Object.keys(constellationsMap).forEach(key => {
            if (key !== activeConstellation) {
                const constellation = constellationsMap[key];
                constellation.lines.forEach(line => {
                    if (line.userData.targetOpacity > 0 && key !== activeConstellation) {
                        line.userData.targetOpacity = 0;
                    }
                });
            }
        });
    }
}

function applyHandDistanceZoom() {
    if (!handSizeCalibrated) return;
    
    const sizeRatio = smoothedHandSize / handSizeBaseline;
    const zoomSensitivity = 5.0;
    const targetZ = CONFIG.camera.initialZ - (sizeRatio - 1.0) * zoomSensitivity;
    const currentZ = camera.position.z;
    const newZ = currentZ + (targetZ - currentZ) * 0.08;
    
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
    
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
        return 'POINT';
    }
    
    return 'NONE';
}

// ============================================
// Initialization
// ============================================

export function init() {
    initDOMElements();
    canvasElement.width = 640;
    canvasElement.height = 480;
    
    const titleElement = document.getElementById('title');
    if (titleElement) {
        titleElement.textContent = '星辰大海';
        titleElement.style.textShadow = '0 0 20px rgba(100, 150, 255, 0.8), 0 0 40px rgba(100, 150, 255, 0.4)';
    }
    
    initThreeScene();
    
    console.log('🌌 星辰大海 V2 initialized!');
    console.log('手势说明:');
    console.log('  ✋ 张开手掌 - 旋转星空 + 距离缩放');
    console.log('  ☝️ 指向 - 预览星座连线');
    console.log('  🤏 捏取 - 激活星座，显示完整连线');
    console.log('  ✊ 握拳 - 取消星座显示');
    console.log('  🖱️ 点击 - 切换星座显示');
}

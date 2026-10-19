import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ArrowRight } from 'lucide-react';

// Photorealistic black marble showroom background with luxury dark walnut wooden pedestal
import heroWoodPedestalBg from '../assets/images/hero_wood_table_pedestal.jpg';

interface RotatingRingHeroProps {
  onExploreClick: (target: 'rings' | 'anklets' | 'bestsellers') => void;
}

/**
 * Creates an authentic 57-facet Round Brilliant Cut Diamond geometry with exact facet angles
 */
function createBrilliantCutDiamondGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();

  // Proportional constants for a modern round brilliant cut matching reference image
  const yTable = 0.35;
  const rTable = 0.54; // Wide, radiant table facet

  const yStar = 0.23;
  const rStar = 0.74;

  const yGirdleTop = 0.08;
  const yGirdleBot = 0.02;
  const rGirdle = 0.98;

  const yPavilion = -0.32;
  const rPavilion = 0.60;

  const yCulet = -0.74;

  const centerTable = [0, yTable, 0];
  const culet = [0, yCulet, 0];
  const centerDiamond = [0, -0.1, 0];

  const tablePts: number[][] = [];
  const starPts: number[][] = [];
  const gtopMain: number[][] = [];
  const gtopHalf: number[][] = [];
  const gbotMain: number[][] = [];
  const gbotHalf: number[][] = [];
  const pavHalf: number[][] = [];

  for (let i = 0; i < 8; i++) {
    const aMain = (i * Math.PI) / 4;
    const aHalf = ((i + 0.5) * Math.PI) / 4;

    tablePts.push([rTable * Math.cos(aMain), yTable, rTable * Math.sin(aMain)]);
    starPts.push([rStar * Math.cos(aHalf), yStar, rStar * Math.sin(aHalf)]);

    gtopMain.push([rGirdle * Math.cos(aMain), yGirdleTop, rGirdle * Math.sin(aMain)]);
    gtopHalf.push([rGirdle * Math.cos(aHalf), yGirdleTop, rGirdle * Math.sin(aHalf)]);

    gbotMain.push([rGirdle * Math.cos(aMain), yGirdleBot, rGirdle * Math.sin(aMain)]);
    gbotHalf.push([rGirdle * Math.cos(aHalf), yGirdleBot, rGirdle * Math.sin(aHalf)]);

    pavHalf.push([rPavilion * Math.cos(aHalf), yPavilion, rPavilion * Math.sin(aHalf)]);
  }

  const rawTriangles: number[][][] = [];

  // 1. Table facets (8 triangles from center to table rim)
  for (let i = 0; i < 8; i++) {
    rawTriangles.push([centerTable, tablePts[(i + 1) % 8], tablePts[i]]);
  }

  // 2. Star facets (8 triangles: table[i], star[i], table[i+1])
  for (let i = 0; i < 8; i++) {
    rawTriangles.push([tablePts[i], starPts[i], tablePts[(i + 1) % 8]]);
  }

  // 3. Bezel (Kite) facets: 16 triangles (2 per kite)
  for (let i = 0; i < 8; i++) {
    const im1 = (i - 1 + 8) % 8;
    rawTriangles.push([tablePts[i], gtopMain[i], starPts[i]]);
    rawTriangles.push([tablePts[i], starPts[im1], gtopMain[i]]);
  }

  // 4. Upper girdle facets: 16 triangles
  for (let i = 0; i < 8; i++) {
    const ip1 = (i + 1) % 8;
    rawTriangles.push([starPts[i], gtopHalf[i], gtopMain[i]]);
    rawTriangles.push([starPts[i], gtopMain[ip1], gtopHalf[i]]);
  }

  // 5. Girdle vertical band (16 quads = 32 triangles)
  for (let i = 0; i < 8; i++) {
    const ip1 = (i + 1) % 8;
    rawTriangles.push([gtopMain[i], gbotHalf[i], gbotMain[i]]);
    rawTriangles.push([gtopMain[i], gtopHalf[i], gbotHalf[i]]);
    rawTriangles.push([gtopHalf[i], gbotMain[ip1], gbotHalf[i]]);
    rawTriangles.push([gtopHalf[i], gtopMain[ip1], gbotMain[ip1]]);
  }

  // 6. Lower girdle facets: 16 triangles
  for (let i = 0; i < 8; i++) {
    const ip1 = (i + 1) % 8;
    rawTriangles.push([gbotMain[i], gbotHalf[i], pavHalf[i]]);
    rawTriangles.push([gbotHalf[i], gbotMain[ip1], pavHalf[i]]);
  }

  // 7. Pavilion main facets: 16 triangles tapering down to the culet point
  for (let i = 0; i < 8; i++) {
    const ip1 = (i + 1) % 8;
    rawTriangles.push([gbotMain[i], pavHalf[i], culet]);
    rawTriangles.push([pavHalf[i], gbotMain[ip1], culet]);
  }

  // Assemble non-indexed positions and ensure consistent outward face normals
  const positions: number[] = [];
  for (const tri of rawTriangles) {
    let [p1, p2, p3] = tri;
    const v12 = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
    const v13 = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
    const normal = [
      v12[1] * v13[2] - v12[2] * v13[1],
      v12[2] * v13[0] - v12[0] * v13[2],
      v12[0] * v13[1] - v12[1] * v13[0],
    ];
    const centroid = [
      (p1[0] + p2[0] + p3[0]) / 3 - centerDiamond[0],
      (p1[1] + p2[1] + p3[1]) / 3 - centerDiamond[1],
      (p1[2] + p2[2] + p3[2]) / 3 - centerDiamond[2],
    ];
    const dot = normal[0] * centroid[0] + normal[1] * centroid[1] + normal[2] * centroid[2];
    if (dot < 0) {
      const tmp = p2;
      p2 = p3;
      p3 = tmp;
    }
    positions.push(...p1, ...p2, ...p3);
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates internal crystal facet geometry
 * Generates layered optical refraction depth while maintaining 100% crystal-clear transparency
 */
function createDiamondInnerCrystalGeometry(): THREE.BufferGeometry {
  const outer = createBrilliantCutDiamondGeometry();
  const inner = outer.clone();
  inner.scale(0.975, 0.975, 0.975);
  return inner;
}

/**
 * Creates high-brilliance diamond studio environment map
 * Pure crystal-white softbox arrays, octabox dome, and sharp facet contrast reflectors
 * Specially tuned to maximize diamond brilliance, fire, and crystal-clear white radiance
 */
function createDiamondEnvironmentMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // 1. Crystal Studio Ambience: Crisp, clean ice-white/daylight gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
  bgGrad.addColorStop(0, '#ffffff');    // Pure white zenith dome
  bgGrad.addColorStop(0.30, '#f2f7fc'); // Pristine crystal studio sky
  bgGrad.addColorStop(0.60, '#dbe7f4'); // Crisp horizon
  bgGrad.addColorStop(0.85, '#22262d'); // Darker bottom to provide contrast for lower facets
  bgGrad.addColorStop(1, '#0e1115');    // Base floor
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // 2. High-contrast Scintillation Flags (Narrow dark strips that make white facets razor-sharp)
  ctx.fillStyle = '#0a0d12';
  for (let x = 60; x < 1024; x += 160) {
    ctx.fillRect(x, 40, 22, 380);
  }

  // 3. Overhead Giant Octabox (Top center softbox)
  const octaGrad = ctx.createRadialGradient(512, 90, 10, 512, 90, 240);
  octaGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  octaGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.98)');
  octaGrad.addColorStop(0.7, 'rgba(235, 245, 255, 0.65)');
  octaGrad.addColorStop(1, 'rgba(220, 240, 255, 0)');
  ctx.fillStyle = octaGrad;
  ctx.beginPath();
  ctx.ellipse(512, 90, 320, 90, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4. Ring of 16 Brilliant White Diamond Facet Studio Reflectors
  for (let i = 0; i < 16; i++) {
    const x = (i / 16) * 1024 + 32;
    const y = 80 + Math.sin(i * 1.2) * 50;
    const r = 45 + (i % 3) * 10;

    const spot = ctx.createRadialGradient(x, y, 2, x, y, r);
    spot.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    spot.addColorStop(0.35, 'rgba(255, 255, 255, 0.95)');
    spot.addColorStop(0.7, 'rgba(225, 242, 255, 0.50)');
    spot.addColorStop(1, 'rgba(215, 235, 255, 0)');
    ctx.fillStyle = spot;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Crisp Horizontal Prismatic Ribbon at upper horizon (subtle rainbow dispersion hint)
  const ribbonGrad = ctx.createLinearGradient(0, 130, 0, 170);
  ribbonGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  ribbonGrad.addColorStop(0.3, 'rgba(220, 240, 255, 0.85)');
  ribbonGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)');
  ribbonGrad.addColorStop(0.7, 'rgba(245, 230, 255, 0.85)');
  ribbonGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = ribbonGrad;
  ctx.fillRect(0, 130, 1024, 40);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates high-dynamic studio reflection map tuned for a luxury black marble & gold showroom
 * Features dark showroom flags, warm gold veining streaks, and crisp spotlight softboxes
 */
function createStudioEnvironmentMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep luxury showroom studio base (dark flags provide essential metallic contrast)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
  bgGrad.addColorStop(0, '#070605');    // Dark showroom ceiling
  bgGrad.addColorStop(0.35, '#12100e'); // Black marble wall
  bgGrad.addColorStop(0.55, '#1c1814'); // Ambient horizon line
  bgGrad.addColorStop(0.8, '#2a221a');  // Gold bounce transition
  bgGrad.addColorStop(1, '#6b5435');    // Warm bronze/gold pedestal plinth bounce
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // 2. High-contrast Dark Flags (essential for razor-sharp chrome metallic specular definition)
  ctx.fillStyle = '#030202';
  ctx.fillRect(40, 30, 90, 440);
  ctx.fillRect(420, 30, 80, 440);
  ctx.fillRect(860, 30, 100, 440);

  // 3. Elegant Gold Vein Streaks in Environment (subtle warm metallic glints)
  ctx.strokeStyle = 'rgba(218, 175, 105, 0.45)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(80, 40);
  ctx.bezierCurveTo(220, 140, 360, 220, 480, 310);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(235, 195, 120, 0.35)';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(600, 80);
  ctx.bezierCurveTo(700, 180, 820, 260, 940, 340);
  ctx.stroke();

  // 4. Primary Spotlight Softbox (Upper-Left Spotlight)
  const spotGrad = ctx.createRadialGradient(240, 110, 5, 240, 110, 220);
  spotGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  spotGrad.addColorStop(0.3, 'rgba(255, 248, 230, 0.98)');
  spotGrad.addColorStop(0.65, 'rgba(240, 205, 140, 0.50)');
  spotGrad.addColorStop(1, 'rgba(240, 205, 140, 0)');
  ctx.fillStyle = spotGrad;
  ctx.beginPath();
  ctx.ellipse(240, 110, 260, 110, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // 5. Overhead Diffused Skylight Strip
  const skyGrad = ctx.createLinearGradient(0, 40, 0, 150);
  skyGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  skyGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
  skyGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(160, 40, 680, 90);

  // 6. Crisp Right Rim Strip Light (sharp edge definition on silver and gold contours)
  const rightRim = ctx.createLinearGradient(740, 0, 840, 0);
  rightRim.addColorStop(0, 'rgba(255, 255, 255, 0)');
  rightRim.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)');
  rightRim.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = rightRim;
  ctx.fillRect(740, 50, 100, 390);

  // 7. Warm Bronze/Gold Pedestal Floor Reflection
  const floorGrad = ctx.createRadialGradient(512, 440, 10, 512, 440, 280);
  floorGrad.addColorStop(0, 'rgba(220, 175, 100, 0.85)');
  floorGrad.addColorStop(0.5, 'rgba(180, 140, 75, 0.35)');
  floorGrad.addColorStop(1, 'rgba(130, 95, 45, 0)');
  ctx.fillStyle = floorGrad;
  ctx.beginPath();
  ctx.ellipse(512, 440, 440, 80, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates procedural 4-point/8-point crystal starburst lens glint texture
 * Simulates intense facet specular glints catching studio spotlights
 */
function createDiamondSparkleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 128, 128);
  const cx = 64;
  const cy = 64;

  // Central intense white core
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  coreGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.95)');
  coreGrad.addColorStop(0.55, 'rgba(225, 245, 255, 0.45)');
  coreGrad.addColorStop(1, 'rgba(210, 235, 255, 0)');
  ctx.fillStyle = coreGrad;
  ctx.fillRect(0, 0, 128, 128);

  // 4 Primary Beams (Vertical & Horizontal spikes)
  const drawSpike = (angle: number, length: number, width: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    const grad = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -length);
    ctx.lineTo(width / 2, 0);
    ctx.lineTo(0, length);
    ctx.lineTo(-width / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  drawSpike(0, 56, 3.5);           // Vertical spike
  drawSpike(Math.PI / 2, 56, 3.5); // Horizontal spike
  drawSpike(Math.PI / 4, 32, 2.0); // Diagonal 45 deg spike
  drawSpike(-Math.PI / 4, 32, 2.0);// Diagonal -45 deg spike

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates soft contact shadow texture for grounding ring on pedestal and pedestal on floor
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 115);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  grad.addColorStop(0.35, 'rgba(10, 8, 6, 0.50)');
  grad.addColorStop(0.70, 'rgba(20, 16, 12, 0.18)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export const RotatingRingHero: React.FC<RotatingRingHeroProps> = ({ onExploreClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [hasWebGLError, setHasWebGLError] = useState(false);

  // Interaction drag state
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const dragDeltaRef = useRef(0);

  // Reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- 1. Scene, Camera, and Renderer ---
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      38,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    // Camera placed for natural product-photography depth and optimal framing above text
    const updateCameraDistance = () => {
      const isMobile = window.innerWidth < 768;
      camera.position.set(0, 0.42, isMobile ? 6.2 : 5.0);
      camera.lookAt(0, 0.35, 0);
    };
    updateCameraDistance();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch (e) {
      console.warn('[Aurelle 3D] WebGL not supported, using high-res poster fallback:', e);
      setHasWebGLError(true);
      return;
    }

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);

    // --- 2. Environment Map & Showroom Spotlight Directional Lighting ---
    // Luxury showroom environment map for metallic silver ring and gold pedestal
    const envTexture = createStudioEnvironmentMap();
    scene.environment = envTexture;

    // Dedicated high-brilliance crystal white studio reflection map for diamond
    const diamondEnvTexture = createDiamondEnvironmentMap();

    // Ambient dark luxury showroom illumination
    const ambientLight = new THREE.AmbientLight(0x221c18, 1.2);
    scene.add(ambientLight);

    // 1. Primary Spotlight matching upper-left spotlight in background image
    const spotLight = new THREE.SpotLight(0xfff5e6, 4.2, 25, Math.PI / 4, 0.45, 1.2);
    spotLight.position.set(-4.5, 6.0, 3.5);
    spotLight.target.position.set(0, 0.2, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);

    // 2. Overhead Key Softbox: warm ivory softbox
    const keyLight = new THREE.DirectionalLight(0xffeed6, 1.8);
    keyLight.position.set(-2.5, 4.5, 2.5);
    scene.add(keyLight);

    // 3. Dedicated Crystal-White Diamond Key Spotlight (Pure 6500K daylight white focused directly on solitaire diamond at y ~ 1.03)
    const diamondSpotLight = new THREE.SpotLight(0xffffff, 6.5, 20, Math.PI / 4, 0.35, 1.0);
    diamondSpotLight.position.set(-1.2, 5.0, 3.2);
    diamondSpotLight.target.position.set(0, 1.03, 0.12);
    scene.add(diamondSpotLight);
    scene.add(diamondSpotLight.target);

    // 4. Front Crystal Brilliance Directional Light (creates sparkling planar facet specular highlights)
    const diamondFrontFill = new THREE.DirectionalLight(0xf5f8ff, 2.8);
    diamondFrontFill.position.set(0.5, 3.2, 3.5);
    scene.add(diamondFrontFill);

    // 5. Overhead High-Key Spot directly illuminating diamond crown table
    const diamondTopLight = new THREE.DirectionalLight(0xffffff, 2.4);
    diamondTopLight.position.set(0, 5.2, 0.5);
    scene.add(diamondTopLight);

    // 6. Warm Gold Pedestal Bounce from below
    const goldBounceLight = new THREE.DirectionalLight(0xd4af37, 1.3);
    goldBounceLight.position.set(0, -2.5, 2.0);
    scene.add(goldBounceLight);

    // 7. Crisp Right Rim Light: defines silver band edges sharply against black marble
    const edgeRimLight = new THREE.DirectionalLight(0xe8f0fc, 1.8);
    edgeRimLight.position.set(4.0, 2.5, -2.8);
    scene.add(edgeRimLight);

    // --- 3. Luxury Physical Materials ---
    // Polished 925 Sterling Silver Material (solid silver chrome tone with high-contrast specular reflections)
    const silverMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf5f7fb,
      metalness: 1.0,
      roughness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMap: envTexture,
      envMapIntensity: 3.5,
    });

    // Outer Solitaire Diamond Shell: High facet scintillation contrast, crystal clarity & dispersion
    const diamondMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.04,
      roughness: 0.0,
      transmission: 0.30, // Controlled transmission so it retains full canvas contrast & alpha!
      opacity: 0.98,
      transparent: true,
      ior: 2.417,
      dispersion: 0.08,
      thickness: 1.2,
      specularIntensity: 6.0,
      specularColor: new THREE.Color(0xffffff),
      envMap: diamondEnvTexture,
      envMapIntensity: 4.8,
      flatShading: true,
    });

    // Inner Total Internal Reflection (TIR) Core: reflects pure crystal white light through the crown
    const diamondCoreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf4f8ff,
      metalness: 0.88,
      roughness: 0.02,
      clearcoat: 1.0,
      clearcoatRoughness: 0.01,
      envMap: diamondEnvTexture,
      envMapIntensity: 5.5,
      flatShading: true,
    });

    // --- 4. Luxury Dark Walnut Wooden Pedestal Table (Integrated in Showroom Background) ---
    // Soft contact grounding shadow directly on top of the wooden table disc beneath the ring
    const pedestalGroup = new THREE.Group();
    const contactShadowTexture = createContactShadowTexture();
    const pedestalShadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const pedestalShadowMat = new THREE.MeshBasicMaterial({
      map: contactShadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    });
    const pedestalShadowPlane = new THREE.Mesh(pedestalShadowGeo, pedestalShadowMat);
    pedestalShadowPlane.rotation.x = -Math.PI / 2;
    pedestalShadowPlane.position.y = -0.065;
    pedestalGroup.add(pedestalShadowPlane);
    scene.add(pedestalGroup);

    // --- 5. Ring Assembly Construction (Continuous 360° Rotation above Wooden Pedestal) ---
    const ringAssemblyGroup = new THREE.Group();
    const ringMeshOffsetGroup = new THREE.Group();

    // A. Solitaire Diamond (Outer Crystal-Clear Shell + Inner Crystal Refractor + Facet Edge Outlines)
    const diamondGeometry = createBrilliantCutDiamondGeometry();
    const diamondMesh = new THREE.Mesh(diamondGeometry, diamondMaterial);
    diamondMesh.position.set(0, 0.08, 0);

    const diamondCoreGeometry = createDiamondInnerCrystalGeometry();
    const diamondCoreMesh = new THREE.Mesh(diamondCoreGeometry, diamondCoreMaterial);
    diamondMesh.add(diamondCoreMesh);

    // Crisp crystal facet edge highlight lines for photorealistic facet definition
    const diamondEdgeGeo = new THREE.EdgesGeometry(diamondGeometry, 12);
    const diamondEdgeMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const diamondEdgeLines = new THREE.LineSegments(diamondEdgeGeo, diamondEdgeMat);
    diamondMesh.add(diamondEdgeLines);

    // Micro-sparkle light focused directly above diamond table facet for dazzling scintillation
    const crownSparkle = new THREE.PointLight(0xffffff, 3.2, 4.0, 1.2);
    crownSparkle.position.set(0, 0.55, 0.35);
    diamondMesh.add(crownSparkle);

    // Procedural crystal starburst scintillation glints on crown facets
    const sparkleTexture = createDiamondSparkleTexture();
    const sparkleMat = new THREE.SpriteMaterial({
      map: sparkleTexture,
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sparkleSprite1 = new THREE.Sprite(sparkleMat);
    sparkleSprite1.scale.set(0.38, 0.38, 0.38);
    sparkleSprite1.position.set(0.22, 0.36, 0.20);
    diamondMesh.add(sparkleSprite1);

    const sparkleSprite2 = new THREE.Sprite(sparkleMat);
    sparkleSprite2.scale.set(0.28, 0.28, 0.28);
    sparkleSprite2.position.set(-0.20, 0.38, -0.12);
    diamondMesh.add(sparkleSprite2);

    ringMeshOffsetGroup.add(diamondMesh);

    // B. Six Tapered Claws (Prongs) Holding the Diamond
    // Engineered to wrap cleanly around the outside of the gallery wire rim and clasp the crown facets
    const prongsGroup = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const clawCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(cosA * 0.44, -0.48, sinA * 0.44), // Base collar join
        new THREE.Vector3(cosA * 0.68, -0.32, sinA * 0.68), // Mid-lower pavilion
        new THREE.Vector3(cosA * 0.88, -0.16, sinA * 0.88), // Welds to outside of gallery wire rim
        new THREE.Vector3(cosA * 1.03,  0.05, sinA * 1.03), // Wraps outside girdle
        new THREE.Vector3(cosA * 0.94,  0.18, sinA * 0.94), // Claws over crown facet
      ]);
      const clawGeo = new THREE.TubeGeometry(clawCurve, 24, 0.054, 12, false);
      const clawMesh = new THREE.Mesh(clawGeo, silverMaterial);
      prongsGroup.add(clawMesh);

      // Rounded tip bead clasping the crown
      const beadGeo = new THREE.SphereGeometry(0.062, 16, 16);
      const beadMesh = new THREE.Mesh(beadGeo, silverMaterial);
      beadMesh.position.set(cosA * 0.94, 0.18, sinA * 0.94);
      prongsGroup.add(beadMesh);
    }
    ringMeshOffsetGroup.add(prongsGroup);

    // C. Gallery Wire Ring (Collet Collar) - Prominent, polished 925 sterling silver rim
    // Positioned at y = -0.16 with radius 0.85 and thickness 0.052, sitting snugly on the outside of the pavilion
    const galleryWireGeo = new THREE.TorusGeometry(0.85, 0.052, 20, 64);
    const galleryWireMesh = new THREE.Mesh(galleryWireGeo, silverMaterial);
    galleryWireMesh.rotation.x = Math.PI / 2;
    galleryWireMesh.position.y = -0.16;
    ringMeshOffsetGroup.add(galleryWireMesh);

    // D. Base Collet Collar
    const baseCollarGeo = new THREE.TorusGeometry(0.44, 0.046, 16, 40);
    const baseCollarMesh = new THREE.Mesh(baseCollarGeo, silverMaterial);
    baseCollarMesh.rotation.x = Math.PI / 2;
    baseCollarMesh.position.y = -0.48;
    ringMeshOffsetGroup.add(baseCollarMesh);

    // E. Ring Shank (Cathedral Band with Comfort-Fit Taper)
    const bandPoints = [
      new THREE.Vector3(-0.44, -0.48, 0),
      new THREE.Vector3(-0.70, -0.65, 0),
      new THREE.Vector3(-0.98, -0.95, 0),
      new THREE.Vector3(-1.08, -1.25, 0),
      new THREE.Vector3(-0.95, -1.65, 0),
      new THREE.Vector3(-0.55, -2.00, 0),
      new THREE.Vector3( 0.0,  -2.10, 0),
      new THREE.Vector3( 0.55, -2.00, 0),
      new THREE.Vector3( 0.95, -1.65, 0),
      new THREE.Vector3( 1.08, -1.25, 0),
      new THREE.Vector3( 0.98, -0.95, 0),
      new THREE.Vector3( 0.70, -0.65, 0),
      new THREE.Vector3( 0.44, -0.48, 0),
    ];
    const bandCurve = new THREE.CatmullRomCurve3(bandPoints);
    const bandGeo = new THREE.TubeGeometry(bandCurve, 96, 0.11, 24, false);
    const bandMesh = new THREE.Mesh(bandGeo, silverMaterial);
    ringMeshOffsetGroup.add(bandMesh);

    // F. Delicate cathedral under-gallery support bridges
    const bridgeCurveL = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.70, -0.65, 0),
      new THREE.Vector3(-0.40, -0.58, 0),
      new THREE.Vector3( 0.0,  -0.54, 0),
    ]);
    const bridgeGeoL = new THREE.TubeGeometry(bridgeCurveL, 16, 0.038, 10, false);
    const bridgeMeshL = new THREE.Mesh(bridgeGeoL, silverMaterial);
    ringMeshOffsetGroup.add(bridgeMeshL);

    const bridgeCurveR = new THREE.CatmullRomCurve3([
      new THREE.Vector3( 0.70, -0.65, 0),
      new THREE.Vector3( 0.40, -0.58, 0),
      new THREE.Vector3( 0.0,  -0.54, 0),
    ]);
    const bridgeGeoR = new THREE.TubeGeometry(bridgeCurveR, 16, 0.038, 10, false);
    const bridgeMeshR = new THREE.Mesh(bridgeGeoR, silverMaterial);
    ringMeshOffsetGroup.add(bridgeMeshR);

    // Offset ring internally so rotation axis aligns through its geometric center
    ringMeshOffsetGroup.position.set(0, 0.82, 0);
    ringAssemblyGroup.add(ringMeshOffsetGroup);

    // Balanced scale: prominent luxury focal point resting on the wooden table
    const RING_SCALE = 0.56;
    ringAssemblyGroup.scale.set(RING_SCALE, RING_SCALE, RING_SCALE);

    // Base position so the bottom of the band rests right on the wooden table disc
    const RING_BASE_Y = 0.62;
    ringAssemblyGroup.position.y = RING_BASE_Y;

    // Natural editorial presentation posture (14° forward tilt and 2° organic angle)
    ringAssemblyGroup.rotation.x = Math.PI * 0.08;
    ringAssemblyGroup.rotation.z = Math.PI * 0.015;

    scene.add(ringAssemblyGroup);

    // Notify component that 3D canvas is ready to smoothly fade in
    setIsSceneReady(true);

    // --- 6. Animation Loop (Smooth 14-second 360° rotation: ONLY the ring rotates) ---
    let animationFrameId: number;
    let lastTime = performance.now();
    const ROTATION_SPEED = (Math.PI * 2) / 14; // 1 full rotation every 14 seconds

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      if (!prefersReducedMotion) {
        // Continuous rotation around vertical axis (ONLY ring rotates, pedestal remains stationary)
        ringAssemblyGroup.rotation.y += ROTATION_SPEED * delta;

        // Apply any interactive user drag inertia
        if (dragDeltaRef.current !== 0) {
          ringAssemblyGroup.rotation.y += dragDeltaRef.current * 0.015;
          dragDeltaRef.current *= 0.92;
        }

        // Subtle organic floating levitation (gentle 1.2% amplitude around pedestal resting base)
        ringAssemblyGroup.position.y = RING_BASE_Y + Math.sin(currentTime * 0.001) * 0.012;

        // Synchronize diamond scintillation glints with facet rotation angles
        const rot = ringAssemblyGroup.rotation.y;
        const glint1 = Math.pow(Math.max(0, Math.sin(rot * 4 + 0.8)), 14);
        const glint2 = Math.pow(Math.max(0, Math.cos(rot * 4 + 2.4)), 14);
        sparkleSprite1.scale.setScalar(0.48 * glint1);
        sparkleSprite1.material.opacity = glint1;
        sparkleSprite2.scale.setScalar(0.38 * glint2);
        sparkleSprite2.material.opacity = glint2;
      } else {
        // Fixed elegant three-quarter perspective when reduced motion is preferred
        ringAssemblyGroup.rotation.y = Math.PI * 0.28;
        ringAssemblyGroup.position.y = RING_BASE_Y;
        sparkleSprite1.material.opacity = 0.6;
        sparkleSprite2.material.opacity = 0.4;
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // --- 7. Responsive Resize Handling ---
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      updateCameraDistance();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // --- 8. Interactive Drag Handlers (Non-intrusive) ---
    const handlePointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - lastMousePosRef.current.x;
      dragDeltaRef.current = deltaX;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    // --- 9. Comprehensive WebGL Cleanup on Unmount ---
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);

      renderer.dispose();
      envTexture.dispose();
      diamondEnvTexture.dispose();
      sparkleTexture.dispose();
      sparkleMat.dispose();
      contactShadowTexture.dispose();

      pedestalShadowGeo.dispose();
      pedestalShadowMat.dispose();

      diamondGeometry.dispose();
      diamondMaterial.dispose();
      diamondCoreGeometry.dispose();
      diamondCoreMaterial.dispose();
      diamondEdgeGeo.dispose();
      diamondEdgeMat.dispose();
      galleryWireGeo.dispose();
      baseCollarGeo.dispose();
      bandGeo.dispose();
      bridgeGeoL.dispose();
      bridgeGeoR.dispose();
      silverMaterial.dispose();

      if (container.contains(domElement)) {
        container.removeChild(domElement);
      }
    };
  }, [prefersReducedMotion]);

  return (
    <section
      aria-label="AURELLE Luxury Fine Silver Jewellery"
      className="relative w-full overflow-hidden bg-[#0A0908] text-[#FFFFFF] min-h-[760px] md:min-h-[820px] lg:h-[92vh] max-h-[1020px] flex items-end justify-center border-b border-[#D7C5AF]/20"
    >
      {/* 1. Black Marble & Gold Veins Luxury Showroom Background with Dark Walnut Wooden Table Pedestal */}
      <div className="absolute inset-0 overflow-hidden select-none">
        {/* Photorealistic Dark Black Marble Wall with Gold Veins, Spotlight & Dark Walnut Wooden Pedestal Table */}
        <img
          src={heroWoodPedestalBg}
          alt="Luxury black marble jewellery showroom with dark walnut wooden pedestal table"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* 3D WebGL Canvas Container (normal pointer cursor) */}
        {!hasWebGLError && (
          <div
            ref={containerRef}
            className={`absolute inset-0 w-full h-full cursor-default transition-opacity duration-700 ${
              isSceneReady ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
      </div>

      {/* 2. Editorial Typography & Call-To-Action Overlay */}
      <div className="absolute inset-0 z-20 w-full h-full pointer-events-none">
        {/* Left Side Content Block: Vertically Centered */}
        <div className="absolute left-6 sm:left-10 md:left-14 lg:left-16 xl:left-20 top-1/2 -translate-y-1/2 max-w-sm sm:max-w-md lg:max-w-xl text-left pointer-events-auto space-y-3 sm:space-y-3.5">
          <span className="text-[11px] sm:text-xs md:text-sm font-mono uppercase tracking-[0.32em] text-[#E0BA79] font-medium block drop-shadow-md">
            AURELLE FINE SILVER
          </span>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif-display text-[#FFFFFF] leading-[1.08] tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
            A Little Extraordinary
          </h1>
        </div>

        {/* Right Bottom Corner: Explore Collection Button (consistent ~40-60px spacing) */}
        <div className="absolute right-6 sm:right-10 md:right-14 lg:right-16 xl:right-20 bottom-8 sm:bottom-10 md:bottom-12 lg:bottom-14 pointer-events-auto">
          <button
            type="button"
            onClick={() => onExploreClick('rings')}
            className="px-8 sm:px-10 py-3.5 sm:py-4 rounded-full bg-[#A85F49] hover:bg-[#8F4E3A] text-[#FFFFFF] text-xs sm:text-sm font-mono uppercase tracking-wider transition-all duration-300 shadow-[0_6px_24px_rgba(0,0,0,0.6)] hover:shadow-2xl flex items-center gap-3 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>Explore Collection</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

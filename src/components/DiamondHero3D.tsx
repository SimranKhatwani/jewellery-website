import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface HeroPage {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  buttonText: string;
  targetId: string;
  cameraPos: [number, number, number];
  lookAt: [number, number, number];
  rotationSpeed: number;
}

const HERO_PAGES: HeroPage[] = [
  {
    id: 1,
    badge: '01 / 04 · AURELLE FINE SILVER',
    title: 'A Little Extraordinary',
    subtitle: 'Faceted prismatic light suspended in harmony with solid 925 sterling silver craftsmanship.',
    buttonText: 'Explore Collection',
    targetId: 'rings',
    cameraPos: [0, 0.4, 3.6],
    lookAt: [0, 0, 0],
    rotationSpeed: 0.35,
  },
  {
    id: 2,
    badge: '02 / 04 · SCULPTURAL SILHOUETTES',
    title: 'Solid Silver Rings',
    subtitle: 'Expressive molten contours and architectural signet forms shaped with ergonomic inner comfort.',
    buttonText: 'Discover Silver Rings',
    targetId: 'rings',
    cameraPos: [0.8, 0.9, 3.2],
    lookAt: [0, 0.1, 0],
    rotationSpeed: 0.45,
  },
  {
    id: 3,
    badge: '03 / 04 · FLUID DRAPE',
    title: 'Delicate Silver Anklets',
    subtitle: 'Diamond-cut flat curb links, silky snake ribbons, and custom clasps engineered for effortless hang.',
    buttonText: 'Discover Silver Anklets',
    targetId: 'anklets',
    cameraPos: [-0.9, 0.6, 3.3],
    lookAt: [0, -0.05, 0],
    rotationSpeed: 0.3,
  },
  {
    id: 4,
    badge: '04 / 04 · THE SIGNATURES',
    title: 'Everyday Silver Luxury',
    subtitle: 'Understated permanence designed for effortless personal styling and lasting brilliance.',
    buttonText: 'View Bestsellers',
    targetId: 'bestsellers',
    cameraPos: [0, 1.2, 3.4],
    lookAt: [0, 0, 0],
    rotationSpeed: 0.4,
  },
];

interface DiamondHero3DProps {
  onExploreClick: (targetId: string) => void;
}

export const DiamondHero3D: React.FC<DiamondHero3DProps> = ({ onExploreClick }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Ref to hold state for Three.js render loop
  const stateRef = useRef({
    pageIndex: 0,
    targetCamPos: new THREE.Vector3(0, 0.4, 3.6),
    targetLookAt: new THREE.Vector3(0, 0, 0),
    rotSpeed: 0.35,
  });

  const goToPage = useCallback((index: number) => {
    const nextIndex = (index + HERO_PAGES.length) % HERO_PAGES.length;
    setCurrentPageIndex(nextIndex);
    const p = HERO_PAGES[nextIndex];
    stateRef.current.pageIndex = nextIndex;
    stateRef.current.targetCamPos.set(...p.cameraPos);
    stateRef.current.targetLookAt.set(...p.lookAt);
    stateRef.current.rotSpeed = p.rotationSpeed;
  }, []);

  const handleNext = useCallback(() => {
    goToPage(currentPageIndex + 1);
  }, [goToPage, currentPageIndex]);

  const handlePrev = useCallback(() => {
    goToPage(currentPageIndex - 1);
  }, [goToPage, currentPageIndex]);

  // Keyboard navigation (ArrowLeft & ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- 1. Scene & Renderer ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1A1917); // Soft rich charcoal
    scene.fog = new THREE.FogExp2(0x1A1917, 0.05);

    const camera = new THREE.PerspectiveCamera(
      36,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0.4, 3.6);

    const renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: false,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // --- 2. Studio Environment for Refraction & Reflections ---
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const studioEnv = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = studioEnv;
    pmremGenerator.dispose();

    // --- 3. Studio Lighting ---
    const keyLight = new THREE.DirectionalLight(0xFFFFFF, 3.5);
    keyLight.position.set(4, 5, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xDCE4EE, 3.8);
    rimLight.position.set(-4, 3, -4);
    scene.add(rimLight);

    const hemiLight = new THREE.HemisphereLight(0xF8F7F3, 0x1A1917, 1.2);
    scene.add(hemiLight);

    const diamondPrismSpot = new THREE.SpotLight(0xFFFFFF, 5.0, 10, Math.PI / 4, 0.5);
    diamondPrismSpot.position.set(0, 3.5, 2.5);
    scene.add(diamondPrismSpot);

    // --- 4. Precision Faceted Diamond Geometry ---
    // Create an authentic brilliant-cut diamond geometry
    const diamondGroup = new THREE.Group();

    const segments = 16;
    const tableRadius = 0.52;
    const tableY = 0.44;
    const girdleRadius = 0.95;
    const girdleUpperY = 0.06;
    const girdleLowerY = -0.06;
    const culetY = -0.92;

    const vertices: number[] = [];

    // Table center
    const tableCenterIdx = 0;
    vertices.push(0, tableY, 0);

    // Table ring vertices (1 to segments)
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      vertices.push(Math.cos(angle) * tableRadius, tableY, Math.sin(angle) * tableRadius);
    }

    // Upper girdle ring vertices (segments + 1 to 2 * segments)
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      vertices.push(Math.cos(angle) * girdleRadius, girdleUpperY, Math.sin(angle) * girdleRadius);
    }

    // Lower girdle ring vertices (2 * segments + 1 to 3 * segments)
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      vertices.push(Math.cos(angle) * girdleRadius, girdleLowerY, Math.sin(angle) * girdleRadius);
    }

    // Culet bottom tip vertex
    const culetIdx = vertices.length / 3;
    vertices.push(0, culetY, 0);

    const indices: number[] = [];

    // 1. Table Facets (center to table ring)
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      indices.push(tableCenterIdx, 1 + i, 1 + next);
    }

    // 2. Crown Facets (table ring to upper girdle)
    const upperGirdleStart = segments + 1;
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const t1 = 1 + i;
      const t2 = 1 + next;
      const g1 = upperGirdleStart + i;
      const g2 = upperGirdleStart + next;

      // Triangle 1: Star/Kite upper
      indices.push(t1, g1, t2);
      // Triangle 2: Upper girdle
      indices.push(t2, g1, g2);
    }

    // 3. Girdle Facets (vertical ribbon)
    const lowerGirdleStart = 2 * segments + 1;
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const u1 = upperGirdleStart + i;
      const u2 = upperGirdleStart + next;
      const l1 = lowerGirdleStart + i;
      const l2 = lowerGirdleStart + next;

      indices.push(u1, l1, u2);
      indices.push(u2, l1, l2);
    }

    // 4. Pavilion Facets (lower girdle to bottom culet)
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const l1 = lowerGirdleStart + i;
      const l2 = lowerGirdleStart + next;

      indices.push(l1, culetIdx, l2);
    }

    const diamondGeo = new THREE.BufferGeometry();
    diamondGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    diamondGeo.setIndex(indices);
    // Flat normals for crisp brilliant diamond facets
    diamondGeo.computeVertexNormals();

    // Diamond Physical Material: high transmission, high IOR (2.42), low roughness
    const diamondMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xFFFFFF),
      metalness: 0.0,
      roughness: 0.02,
      transmission: 0.96,
      ior: 2.42,
      thickness: 1.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      reflectivity: 0.98,
      attenuationColor: new THREE.Color(0xF0F5FA),
      attenuationDistance: 2.2,
      envMapIntensity: 2.4,
    });

    const diamondMesh = new THREE.Mesh(diamondGeo, diamondMaterial);
    diamondMesh.castShadow = true;
    diamondMesh.scale.set(0.72, 0.72, 0.72);
    diamondGroup.add(diamondMesh);

    // --- 5. Sterling Silver Halo Orbit Rings Framing the Diamond ---
    const silverMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xE8ECED),
      metalness: 0.98,
      roughness: 0.12,
      clearcoat: 0.8,
      reflectivity: 0.95,
      envMapIntensity: 1.6,
    });

    // Primary graceful silver orbital ring
    const silverRingGeo1 = new THREE.TorusGeometry(1.05, 0.038, 32, 96);
    const silverRing1 = new THREE.Mesh(silverRingGeo1, silverMaterial);
    silverRing1.rotation.x = Math.PI * 0.38;
    silverRing1.rotation.y = Math.PI * 0.12;
    silverRing1.castShadow = true;
    diamondGroup.add(silverRing1);

    // Secondary fine silver orbital ring
    const silverRingGeo2 = new THREE.TorusGeometry(1.22, 0.022, 24, 96);
    const silverRing2 = new THREE.Mesh(silverRingGeo2, silverMaterial);
    silverRing2.rotation.x = -Math.PI * 0.42;
    silverRing2.rotation.z = Math.PI * 0.25;
    silverRing2.castShadow = true;
    diamondGroup.add(silverRing2);

    // Subtle floating silver micro-beads along orbit
    const beadGeo = new THREE.SphereGeometry(0.042, 16, 16);
    for (let i = 0; i < 4; i++) {
      const bead = new THREE.Mesh(beadGeo, silverMaterial);
      const angle = (i / 4) * Math.PI * 2;
      bead.position.set(Math.cos(angle) * 1.05, Math.sin(angle * 2) * 0.15, Math.sin(angle) * 1.05);
      diamondGroup.add(bead);
    }

    scene.add(diamondGroup);

    // Subtle soft contact grounding beneath the floating jewelry
    const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext('2d');
    if (ctx) {
      const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
      g.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
      g.addColorStop(0.5, 'rgba(0, 0, 0, 0.15)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.15;
    scene.add(shadowPlane);

    // --- 6. Render & Animation Loop ---
    let animId: number;
    let lastTime = performance.now();
    const currentLookAt = new THREE.Vector3(0, 0, 0);

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);

      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const state = stateRef.current;

      // Smooth camera gliding between pages
      camera.position.lerp(state.targetCamPos, delta * 2.2);
      currentLookAt.lerp(state.targetLookAt, delta * 2.2);
      camera.lookAt(currentLookAt);

      // Continuous, mesmerizing organic rotation of the 3D diamond and silver orbits
      diamondMesh.rotation.y += state.rotSpeed * delta;
      diamondMesh.rotation.x = Math.sin(time * 0.0008) * 0.18;
      diamondMesh.rotation.z = Math.cos(time * 0.0006) * 0.12;

      // Gentle floating levitation
      diamondGroup.position.y = Math.sin(time * 0.0012) * 0.06;

      // Counter-rotating silver orbital halos
      silverRing1.rotation.z += 0.22 * delta;
      silverRing2.rotation.z -= 0.18 * delta;

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    // Resize listener
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);

      renderer.dispose();
      studioEnv.dispose();
      diamondGeo.dispose();
      diamondMaterial.dispose();
      silverRingGeo1.dispose();
      silverRingGeo2.dispose();
      silverMaterial.dispose();
      beadGeo.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTex.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const page = HERO_PAGES[currentPageIndex];

  return (
    <section
      aria-label="AURELLE 3D Diamond & Silver Experience"
      className="relative w-full h-[65vh] min-h-[480px] max-h-[740px] bg-[#1A1917] overflow-hidden select-none"
    >
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Atmospheric Subtle Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#1A1917] via-transparent to-[#1A1917]/40" />

      {/* Left Navigation Arrow to switch page */}
      <button
        onClick={handlePrev}
        className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-30 p-3 sm:p-3.5 rounded-full bg-[#1A1917]/60 text-white border border-white/20 hover:bg-[#FFFFFF] hover:text-[#1A1917] transition-all duration-200 backdrop-blur-xs shadow-lg group active:scale-95"
        aria-label="Previous showcase page"
        title="Previous Page (or press Left Arrow)"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:-translate-x-0.5" />
      </button>

      {/* Right Navigation Arrow to switch page */}
      <button
        onClick={handleNext}
        className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30 p-3 sm:p-3.5 rounded-full bg-[#1A1917]/60 text-white border border-white/20 hover:bg-[#FFFFFF] hover:text-[#1A1917] transition-all duration-200 backdrop-blur-xs shadow-lg group active:scale-95"
        aria-label="Next showcase page"
        title="Next Page (or press Right Arrow)"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:translate-x-0.5" />
      </button>

      {/* Editorial Content Overlay (Synced with active page) */}
      <div className="absolute inset-x-0 bottom-12 sm:bottom-16 z-20 pointer-events-none">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          
          {/* Main Headline & Description */}
          <div className="max-w-xl space-y-3 pointer-events-auto">
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-[#C6C7C8] font-medium bg-[#1A1917]/70 backdrop-blur-xs px-3 py-1 rounded-sm border border-white/10">
              <Sparkles className="w-3 h-3 text-white" />
              <span>{page.badge}</span>
            </span>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif-display font-light tracking-tight text-[#FFFFFF] leading-[1.12]">
              {page.title}
            </h1>

            <p className="text-xs sm:text-sm text-[#F8F7F3]/85 font-light leading-relaxed max-w-md">
              {page.subtitle}
            </p>

            <div className="pt-2">
              <button
                onClick={() => onExploreClick(page.targetId)}
                className="px-7 py-3 bg-[#FFFFFF] text-[#1A1917] text-xs uppercase tracking-[0.2em] font-medium rounded-sm hover:bg-[#C6C7C8] transition-colors shadow-md"
              >
                {page.buttonText}
              </button>
            </div>
          </div>

          {/* Page Indicators & Switcher */}
          <div className="pointer-events-auto flex items-center gap-3 bg-[#1A1917]/70 backdrop-blur-xs px-4 py-2 rounded-full border border-white/15 self-start md:self-end">
            {HERO_PAGES.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => goToPage(idx)}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentPageIndex
                    ? 'w-8 h-2 bg-[#FFFFFF]'
                    : 'w-2 h-2 bg-white/35 hover:bg-white/70'
                }`}
                aria-label={`Go to page ${p.id}`}
              />
            ))}
            <span className="text-xs font-mono text-white/80 tabular-nums ml-1">
              0{currentPageIndex + 1} / 0{HERO_PAGES.length}
            </span>
          </div>

        </div>
      </div>
    </section>
  );
};

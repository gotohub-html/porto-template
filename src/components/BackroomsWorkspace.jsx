import { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Custom CRT / liminal post-processing: scanlines, chromatic aberration,
// vignette, animated film grain and a subtle barrel warp. One fullscreen pass.
const CRTShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uIntensity: { value: 1 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uIntensity;
    uniform vec2 uResolution;

    float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }

    void main() {
      vec2 uv = vUv;
      // subtle barrel distortion
      vec2 cc = uv - 0.5;
      float dist = dot(cc, cc);
      uv = uv + cc * dist * 0.12;

      // chromatic aberration scaled by distance from center
      float ca = (0.0015 + dist * 0.006) * uIntensity;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + vec2(ca, 0.0)).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - vec2(ca, 0.0)).b;

      // scanlines
      float scan = sin(uv.y * uResolution.y * 1.4) * 0.02 * uIntensity;
      col -= scan;

      // rolling brightness bar (VHS tracking)
      float roll = sin(uv.y * 3.0 + uTime * 0.6);
      col += smoothstep(0.985, 1.0, roll) * 0.05;

      // animated film grain
      float g = rand(uv + fract(uTime)) - 0.5;
      col += g * 0.05 * uIntensity;

      // vignette (gentle — keep the room readable)
      float vig = smoothstep(1.1, 0.15, dist * 1.6);
      col *= mix(1.0, vig, 0.45);

      // drop pixels that fell outside after warp
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) col = vec3(0.0);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

/**
 * BACKROOMS — Level 0 (Walkable First-Person 3D).
 *
 * Replaces the old Win95 desktop concept. The visitor "no-clips" into an
 * endless liminal space of yellow rooms and pillars, lit by a single buzzing
 * fluorescent tube overhead. Portfolio content lives on glowing wall kiosks
 * scattered through the maze — walk up to one and read it. One kiosk is the
 * EXIT that returns you to the polished portfolio.
 *
 * Everything (geometry, lighting, audio) is generated procedurally. No assets.
 *
 *  Desktop : click to lock pointer, WASD / arrows to walk, mouse to look,
 *            E to read a kiosk, ESC to release the cursor.
 *  Mobile  : left thumb joystick to walk, drag the right side to look,
 *            tap READ when near a kiosk.
 */

// --- World constants ---
const CELL = 4;
const COLS = 24;
const ROWS = 24;
const WALL_H = 3.2;
const EYE = 1.65;

const detectMobile = () =>
  typeof window !== "undefined" &&
  ("ontouchstart" in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768);

// Portfolio kiosks. (col,row) sit on the grid; one is the exit back to reality.
const STATIONS = [
  {
    id: "about",
    col: 6,
    row: 6,
    color: "#e0533c",
    tag: "ARCHIVE_01",
    title: "WHO IS DANI?",
    lines: [
      "Self-taught web developer & UI/UX",
      "designer from Purwakarta, Indonesia.",
      "Builds immersive, editorial web",
      "experiences. Fuses visual design with",
      "clean, performant engineering.",
    ],
  },
  {
    id: "skills",
    col: 17,
    row: 6,
    color: "#f59e0b",
    tag: "ARCHIVE_02",
    title: "THE STACK",
    lines: [
      "React 19 · Frontend architecture",
      "GSAP · Scroll storytelling",
      "Three.js / WebGL · Shaders",
      "Web Audio · Procedural sound",
      "Tailwind · Vite",
    ],
  },
  {
    id: "contact",
    col: 6,
    row: 17,
    color: "#f97316",
    tag: "SIGNAL_03",
    title: "ESTABLISH CONTACT",
    lines: [
      "github.com/danixbo",
      "Open to freelance & collaboration.",
      "Drop a signal — let's build",
      "something that shouldn't exist yet.",
    ],
  },
  {
    id: "exit",
    col: 17,
    row: 17,
    color: "#86efac",
    tag: "EXIT_DOOR",
    title: "EXIT > REALITY",
    isExit: true,
    lines: [
      "A No-Clip corridor back to the",
      "obsidian portfolio. Step through",
      "to leave Level 0.",
    ],
  },
];

// Spindly shadow wire/bacteria entity drawing with walk-cycle animation
const drawEntity = (g, walkPhase, speedFactor) => {
  g.clearRect(0, 0, 256, 512);

  // 1. Soft dark aura
  const aura = g.createRadialGradient(128, 230, 20, 128, 230, 210);
  aura.addColorStop(0, "rgba(5, 5, 3, 0.65)");
  aura.addColorStop(1, "rgba(5, 5, 3, 0)");
  g.fillStyle = aura;
  g.fillRect(0, 0, 256, 512);

  const cx = 128;
  const swing = Math.sin(walkPhase);
  const cosSwing = Math.cos(walkPhase);

  // Limb/joint coordinate calculations
  const headY = 112;
  const neckY = 142;
  const chestX = cx;
  const chestY = 175;
  const hipX = cx;
  const hipY = 300;

  const leftShoulderX = cx - 24;
  const leftShoulderY = 180;
  const rightShoulderX = cx + 24;
  const rightShoulderY = 180;

  const leftHipX = cx - 14;
  const leftHipY = 300;
  const rightHipX = cx + 14;
  const rightHipY = 300;

  // Let swinging scale with motion speed factor
  const swingScale = Math.min(speedFactor * 0.8, 1.0);
  const legSwing = swing * 26 * swingScale;
  const armSwing = swing * 22 * swingScale;
  const elbowSwing = cosSwing * 12 * swingScale;

  // Left Leg joints
  const leftKneeX = cx - 22 + legSwing * 0.4;
  const leftKneeY = 385;
  const leftFootX = cx - 18 + legSwing;
  const leftFootY = 480;

  // Right Leg joints
  const rightKneeX = cx + 22 - legSwing * 0.4;
  const rightKneeY = 385;
  const rightFootX = cx + 18 - legSwing;
  const rightFootY = 480;

  // Left Arm joints
  const leftElbowX = cx - 42 - elbowSwing;
  const leftElbowY = 270;
  const leftHandX = cx - 36 - armSwing;
  const leftHandY = 375;

  // Right Arm joints
  const rightElbowX = cx + 42 + elbowSwing;
  const rightElbowY = 270;
  const rightHandX = cx + 36 + armSwing;
  const rightHandY = 375;

  // Wire drawing helper
  const drawWireSegment = (x1, y1, x2, y2, wiresCount, baseWidth, color) => {
    g.strokeStyle = color;
    g.lineCap = "round";
    g.lineJoin = "round";
    for (let i = 0; i < wiresCount; i++) {
      const ox1 = (Math.random() - 0.5) * 5;
      const oy1 = (Math.random() - 0.5) * 5;
      const ox2 = (Math.random() - 0.5) * 5;
      const oy2 = (Math.random() - 0.5) * 5;
      g.lineWidth = baseWidth * (0.6 + Math.random() * 0.6);
      g.beginPath();
      g.moveTo(x1 + ox1, y1 + oy1);
      const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 8;
      const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 8;
      g.quadraticCurveTo(mx, my, x2 + ox2, y2 + oy2);
      g.stroke();
    }
  };

  const wireColor = "rgba(45, 43, 35, 0.95)";
  const wireCoreColor = "rgba(22, 21, 17, 0.98)";

  // Draw Legs
  // Left Leg
  drawWireSegment(leftHipX, leftHipY, leftKneeX, leftKneeY, 4, 3.5, wireColor);
  drawWireSegment(leftKneeX, leftKneeY, leftFootX, leftFootY, 4, 3.0, wireColor);
  drawWireSegment(leftFootX, leftFootY, leftFootX - 10, leftFootY + 5, 2, 2.0, wireCoreColor);
  drawWireSegment(leftFootX, leftFootY, leftFootX + 5, leftFootY + 5, 2, 2.0, wireCoreColor);

  // Right Leg
  drawWireSegment(rightHipX, rightHipY, rightKneeX, rightKneeY, 4, 3.5, wireColor);
  drawWireSegment(rightKneeX, rightKneeY, rightFootX, rightFootY, 4, 3.0, wireColor);
  drawWireSegment(rightFootX, rightFootY, rightFootX - 5, rightFootY + 5, 2, 2.0, wireCoreColor);
  drawWireSegment(rightFootX, rightFootY, rightFootX + 10, rightFootY + 5, 2, 2.0, wireCoreColor);

  // Torso / Core Spindles
  drawWireSegment(chestX, chestY, hipX, hipY, 6, 4.0, wireCoreColor);
  drawWireSegment(leftShoulderX, leftShoulderY, rightShoulderX, rightShoulderY, 4, 3.5, wireColor);
  drawWireSegment(leftShoulderX, leftShoulderY, hipX, hipY, 3, 2.5, wireColor);
  drawWireSegment(rightShoulderX, rightShoulderY, hipX, hipY, 3, 2.5, wireColor);

  // Neck
  drawWireSegment(chestX, chestY, chestX, neckY, 4, 3.0, wireCoreColor);

  // Left Arm
  drawWireSegment(leftShoulderX, leftShoulderY, leftElbowX, leftElbowY, 4, 3.0, wireColor);
  drawWireSegment(leftElbowX, leftElbowY, leftHandX, leftHandY, 4, 2.5, wireColor);
  drawWireSegment(leftHandX, leftHandY, leftHandX - 8 + swing * 3, leftHandY + 18, 2, 1.5, wireCoreColor);
  drawWireSegment(leftHandX, leftHandY, leftHandX + swing * 3, leftHandY + 20, 2, 1.5, wireCoreColor);
  drawWireSegment(leftHandX, leftHandY, leftHandX + 8 + swing * 3, leftHandY + 16, 2, 1.5, wireCoreColor);

  // Right Arm
  drawWireSegment(rightShoulderX, rightShoulderY, rightElbowX, rightElbowY, 4, 3.0, wireColor);
  drawWireSegment(rightElbowX, rightElbowY, rightHandX, rightHandY, 4, 2.5, wireColor);
  drawWireSegment(rightHandX, rightHandY, rightHandX - 8 - swing * 3, rightHandY + 16, 2, 1.5, wireCoreColor);
  drawWireSegment(rightHandX, rightHandY, rightHandX - swing * 3, rightHandY + 20, 2, 1.5, wireCoreColor);
  drawWireSegment(rightHandX, rightHandY, rightHandX + 8 - swing * 3, rightHandY + 18, 2, 1.5, wireCoreColor);

  // Head - distorted wire mass
  const headRadius = 24;
  g.fillStyle = wireCoreColor;
  g.beginPath();
  g.arc(cx, headY, headRadius, 0, Math.PI * 2);
  g.fill();
  
  for (let i = 0; i < 6; i++) {
    g.strokeStyle = wireColor;
    g.lineWidth = 2.0;
    g.beginPath();
    g.arc(cx + (Math.random() - 0.5) * 6, headY + (Math.random() - 0.5) * 6, headRadius - 2, 0, Math.PI * 2);
    g.stroke();
  }

  // Shadowed eye sockets (dark voids)
  g.fillStyle = "rgba(12, 10, 8, 0.95)";
  g.beginPath();
  g.arc(cx - 10, headY + 2, 9, 0, Math.PI * 2);
  g.arc(cx + 10, headY + 2, 9, 0, Math.PI * 2);
  g.fill();

  // Glowing Green bacteria eyes
  g.shadowColor = "#39ff14";
  g.shadowBlur = 15;
  g.fillStyle = "#ebffea";
  g.beginPath();
  g.arc(cx - 10, headY + 4, 3, 0, Math.PI * 2);
  g.arc(cx + 10, headY + 4, 3, 0, Math.PI * 2);
  g.fill();
  g.shadowBlur = 0;
};

// A* Pathfinding helper
const findPath = (startCol, startRow, targetCol, targetRow, grid) => {
  const openSet = [];
  const closedSet = new Set();
  
  const startKey = `${startCol},${startRow}`;
  const nodes = {};
  nodes[startKey] = {
    col: startCol,
    row: startRow,
    g: 0,
    h: Math.abs(startCol - targetCol) + Math.abs(startRow - targetRow),
    f: Math.abs(startCol - targetCol) + Math.abs(startRow - targetRow),
    parent: null
  };
  
  openSet.push(nodes[startKey]);
  
  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();
    const currentKey = `${current.col},${current.row}`;
    
    if (current.col === targetCol && current.row === targetRow) {
      const path = [];
      let curr = current;
      while (curr !== null) {
        path.push([curr.col, curr.row]);
        curr = curr.parent;
      }
      path.reverse();
      return path;
    }
    
    closedSet.add(currentKey);
    
    const dirs = [
      [0, -1], [0, 1], [-1, 0], [1, 0]
    ];
    for (const [dc, dr] of dirs) {
      const nc = current.col + dc;
      const nr = current.row + dr;
      
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS || grid[nr][nc] === 1) {
        continue;
      }
      
      const nKey = `${nc},${nr}`;
      if (closedSet.has(nKey)) continue;
      
      const tentG = current.g + 1;
      let neighbor = nodes[nKey];
      
      if (!neighbor) {
        neighbor = {
          col: nc,
          row: nr,
          g: Infinity,
          h: Math.abs(nc - targetCol) + Math.abs(nr - targetRow),
          f: Infinity,
          parent: null
        };
        nodes[nKey] = neighbor;
      }
      
      if (tentG < neighbor.g) {
        neighbor.g = tentG;
        neighbor.f = neighbor.g + neighbor.h;
        neighbor.parent = current;
        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor);
        }
      }
    }
  }
  return null;
};

// Raycast Line of Sight helper
const hasLineOfSight = (x1, z1, x2, z2, grid) => {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.1) return true;
  const steps = Math.ceil(dist / 0.5);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x1 + dx * t;
    const pz = z1 + dz * t;
    const col = Math.floor(px / CELL);
    const row = Math.floor(pz / CELL);
    if (row < 0 || col < 0 || row >= ROWS || col >= COLS || grid[row][col] === 1) {
      return false;
    }
  }
  return true;
};

const BackroomsWorkspace = ({ setConceptMode }) => {
  const [isMobile] = useState(detectMobile);
  const [started, setStarted] = useState(false); // pointer locked / experience live
  const [muted, setMuted] = useState(false);
  const [prompt, setPrompt] = useState(null); // station id the player can read
  const [activeStation, setActiveStation] = useState(null); // open reading card
  const [coords, setCoords] = useState({ x: 0, z: 0 });
  const [auditMode, setAuditMode] = useState(false);
  const auditModeRef = useRef(false);
  
  const showAuditFeature = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("audit");
  
  const aiStateRef = useRef({
    state: "PATROL", // PATROL, CHASE, SEARCH, AUDIT
    patrolPath: [],
    patrolNodeIndex: 0,
    patrolTargetCell: null,
    chasePath: [],
    chaseNodeIndex: 0,
    lastPlayerCell: null,
    recalcTimer: 0,
    spookySoundTimer: 0,
  });

  useEffect(() => {
    auditModeRef.current = auditMode;
  }, [auditMode]);

  const mountRef = useRef(null);

  // input + player state shared with the render loop (refs avoid re-renders)
  const keysRef = useRef({ f: 0, s: 0 }); // forward / strafe in [-1,1]
  const yawRef = useRef(Math.PI);
  const pitchRef = useRef(0);
  const nearRef = useRef(null); // nearest readable station id
  const startedRef = useRef(false);
  const audioRef = useRef({ ctx: null, hum: null, sting: null });
  const interactRef = useRef(() => {}); // bridge: React UI -> render loop
  const activeRef = useRef(false); // mirror of activeStation for the loop

  // ---- procedural audio (fluorescent hum + entity sting) ----
  const startAudio = useCallback(() => {
    try {
      if (audioRef.current.ctx) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();

      const master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);

      // 60Hz mains hum + 120Hz harmonic
      const hum = ctx.createGain();
      hum.gain.value = 0.08;
      hum.connect(master);
      [60, 120].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = i ? "triangle" : "sine";
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = i ? 0.4 : 1;
        o.connect(g);
        g.connect(hum);
        o.start();
      });

      // filtered white-noise hiss
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 7200;
      const ng = ctx.createGain();
      ng.gain.value = 0.012;
      noise.connect(bp);
      bp.connect(ng);
      ng.connect(master);
      noise.start();

      // flicker LFO on the hum
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.5;
      const lg = ctx.createGain();
      lg.gain.value = 0.03;
      lfo.connect(lg);
      lg.connect(master.gain);
      lfo.start();

      // entity proximity sting (silent until entity is near)
      const sting = ctx.createGain();
      sting.gain.value = 0;
      sting.connect(master);
      const so = ctx.createOscillator();
      so.type = "sawtooth";
      so.frequency.value = 42;
      const sf = ctx.createBiquadFilter();
      sf.type = "lowpass";
      sf.frequency.value = 200;
      so.connect(sf);
      sf.connect(sting);
      so.start();

      audioRef.current = { ctx, hum: master, sting };
    } catch {
      /* audio unavailable */
    }
  }, [muted]);

  useEffect(() => {
    const a = audioRef.current;
    if (a.hum && a.ctx) {
      a.hum.gain.setTargetAtTime(muted ? 0 : 0.5, a.ctx.currentTime, 0.1);
    }
  }, [muted]);

  // ---- build the world grid (perimeter + pillars + kiosks) ----
  const buildGrid = () => {
    const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
    const hash = (c, r) => {
      const n = Math.sin(c * 127.1 + r * 311.7) * 43758.5453;
      return n - Math.floor(n);
    };
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1) grid[r][c] = 1;
        else if (c % 3 === 0 && r % 3 === 0) grid[r][c] = 1; // regular pillar lattice
        else if (hash(c, r) > 0.86) grid[r][c] = 1; // sparse extra pillars
      }
    }
    // keep the spawn (center) and its neighbours clear
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) grid[12 + dr][12 + dc] = 0;
    // stamp kiosks as solid cells
    STATIONS.forEach((s) => {
      grid[s.row][s.col] = 1;
    });
    return grid;
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const grid = buildGrid();
    const isWallCell = (c, r) =>
      r < 0 || c < 0 || r >= ROWS || c >= COLS || grid[r][c] === 1;
    const collides = (x, z) => {
      const rad = 1.05;
      for (const ox of [-rad, rad])
        for (const oz of [-rad, rad])
          if (isWallCell(Math.floor((x + ox) / CELL), Math.floor((z + oz) / CELL)))
            return true;
      return false;
    };

    let width = mount.clientWidth;
    let height = mount.clientHeight;

    const scene = new THREE.Scene();
    const fogColor = new THREE.Color(0x9c8f4a); // hazy yellow, not black
    scene.fog = new THREE.FogExp2(fogColor, 0.022);
    scene.background = fogColor;

    const camera = new THREE.PerspectiveCamera(76, width / height, 0.1, 120);
    const player = new THREE.Vector3(12 * CELL + CELL / 2, EYE, 12 * CELL + CELL / 2);
    camera.position.copy(player);

    const randomOpenCell = () => {
      for (let i = 0; i < 60; i++) {
        const c = 1 + Math.floor(Math.random() * (COLS - 2));
        const r = 1 + Math.floor(Math.random() * (ROWS - 2));
        if (grid[r][c] === 0) {
          const wx = c * CELL + CELL / 2;
          const wz = r * CELL + CELL / 2;
          if (Math.hypot(wx - player.x, wz - player.z) > 16) return [wx, wz];
        }
      }
      return [2 * CELL, 2 * CELL];
    };

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    mount.appendChild(renderer.domElement);

    // --- post-processing: CRT / liminal pass ---
    const composer = new EffectComposer(renderer);
    composer.setSize(width, height);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    composer.addPass(new RenderPass(scene, camera));
    const crtPass = new ShaderPass(CRTShader);
    crtPass.uniforms.uResolution.value.set(height, height);
    crtPass.uniforms.uIntensity.value = isMobile ? 0.7 : 1;
    composer.addPass(crtPass);

    // --- procedural canvas textures (no external assets) ---
    const disposables = [];
    const makeTexture = (draw, repX, repY, size = 256) => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = size;
      draw(cv.getContext("2d"), size);
      const t = new THREE.CanvasTexture(cv);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repX, repY);
      t.anisotropy = isMobile ? 2 : 8;
      disposables.push(t);
      return t;
    };

    // Yellowed Navajo wallpaper with vertical water-staining
    const drawWallpaper = (g, S) => {
      g.fillStyle = "#c7b35a";
      g.fillRect(0, 0, S, S);
      // vertical streaks / damp stains
      for (let i = 0; i < 80; i++) {
        const x = Math.random() * S;
        const w = 2 + Math.random() * 10;
        g.fillStyle = `rgba(${90 + Math.random() * 40},${75 + Math.random() * 40},${30 + Math.random() * 20},${Math.random() * 0.12})`;
        g.fillRect(x, 0, w, S);
      }
      // navajo diamond lattice
      g.strokeStyle = "rgba(150,120,55,0.55)";
      g.lineWidth = 2;
      const step = S / 4;
      for (let gx = -step; gx <= S + step; gx += step) {
        g.beginPath();
        g.moveTo(gx, 0); g.lineTo(gx + step, S / 2); g.lineTo(gx, S);
        g.moveTo(gx, 0); g.lineTo(gx - step, S / 2); g.lineTo(gx, S);
        g.stroke();
      }
      g.strokeStyle = "rgba(120,95,40,0.25)";
      g.lineWidth = 1;
      for (let gx = -step; gx <= S + step; gx += step) {
        g.beginPath();
        g.moveTo(gx + step / 2, S / 4); g.lineTo(gx + step, S / 2);
        g.lineTo(gx + step / 2, (3 * S) / 4); g.lineTo(gx, S / 2); g.closePath();
        g.stroke();
      }
      // grain
      for (let i = 0; i < 2500; i++) {
        g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
        g.fillRect(Math.random() * S, Math.random() * S, 1.5, 1.5);
      }
    };

    // Damp musty carpet
    const drawCarpet = (g, S) => {
      g.fillStyle = "#7c6f33";
      g.fillRect(0, 0, S, S);
      for (let i = 0; i < 14000; i++) {
        const v = Math.random();
        g.fillStyle =
          v > 0.5
            ? `rgba(${110 + Math.random() * 30},${100 + Math.random() * 30},${50 + Math.random() * 20},${Math.random() * 0.3})`
            : `rgba(${40 + Math.random() * 20},${35 + Math.random() * 20},${15},${Math.random() * 0.35})`;
        g.fillRect(Math.random() * S, Math.random() * S, 1.4, 1.4);
      }
      // darker damp patches
      for (let i = 0; i < 10; i++) {
        const x = Math.random() * S, y = Math.random() * S, r = 20 + Math.random() * 40;
        const rad = g.createRadialGradient(x, y, 0, x, y, r);
        rad.addColorStop(0, "rgba(30,26,12,0.3)");
        rad.addColorStop(1, "rgba(30,26,12,0)");
        g.fillStyle = rad;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }
    };

    // Drop-ceiling tiles
    const drawCeiling = (g, S) => {
      g.fillStyle = "#b6a85c";
      g.fillRect(0, 0, S, S);
      g.strokeStyle = "rgba(60,52,28,0.7)";
      g.lineWidth = 6;
      g.strokeRect(0, 0, S, S);
      // perforation dots
      g.fillStyle = "rgba(80,70,40,0.4)";
      for (let y = 16; y < S; y += 14)
        for (let x = 16; x < S; x += 14) g.fillRect(x, y, 2, 2);
      // water damage
      const x = S * 0.6, y = S * 0.4, r = S * 0.35;
      const rad = g.createRadialGradient(x, y, 0, x, y, r);
      rad.addColorStop(0, "rgba(70,55,25,0.45)");
      rad.addColorStop(1, "rgba(70,55,25,0)");
      g.fillStyle = rad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    };

    const wallTex = makeTexture(drawWallpaper, 1, 1);
    const carpetTex = makeTexture(drawCarpet, COLS, ROWS, 256);
    const ceilTex = makeTexture(drawCeiling, COLS / 2, ROWS / 2, 128);

    // --- materials (mono-yellow liminal palette w/ bump relief) ---
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      bumpMap: wallTex,
      bumpScale: 0.04,
      color: 0xffffff,
      roughness: 0.95,
    });
    const floorMat = new THREE.MeshStandardMaterial({
      map: carpetTex,
      bumpMap: carpetTex,
      bumpScale: 0.06,
      roughness: 1,
    });

    // floor + ceiling
    const planeGeo = new THREE.PlaneGeometry(COLS * CELL, ROWS * CELL);
    const floor = new THREE.Mesh(planeGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((COLS * CELL) / 2, 0, (ROWS * CELL) / 2);
    scene.add(floor);

    const ceiling = new THREE.Mesh(
      planeGeo,
      new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 1 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set((COLS * CELL) / 2, WALL_H, (ROWS * CELL) / 2);
    scene.add(ceiling);

    // --- walls / pillars via instancing ---
    const wallCells = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (grid[r][c] === 1 && !STATIONS.some((s) => s.col === c && s.row === r))
          wallCells.push([c, r]);
    const boxGeo = new THREE.BoxGeometry(CELL, WALL_H, CELL);
    const walls = new THREE.InstancedMesh(boxGeo, wallMat, wallCells.length);
    const dummy = new THREE.Object3D();
    wallCells.forEach(([c, r], i) => {
      dummy.position.set(c * CELL + CELL / 2, WALL_H / 2, r * CELL + CELL / 2);
      dummy.updateMatrix();
      walls.setMatrixAt(i, dummy.matrix);
    });
    walls.instanceMatrix.needsUpdate = true;
    scene.add(walls);

    // --- ceiling light panels (emissive, purely visual) ---
    const panelGeo = new THREE.PlaneGeometry(CELL * 0.7, CELL * 0.7);
    const panelMat = new THREE.MeshBasicMaterial({ color: 0xfff4cf });
    for (let r = 2; r < ROWS - 1; r += 4)
      for (let c = 2; c < COLS - 1; c += 4) {
        const p = new THREE.Mesh(panelGeo, panelMat);
        p.rotation.x = Math.PI / 2;
        p.position.set(c * CELL + CELL / 2, WALL_H - 0.02, r * CELL + CELL / 2);
        scene.add(p);
      }

    // --- lighting: dim ambient + a buzzing tube that follows you ---
    scene.add(new THREE.AmbientLight(0xfff0c0, 1.15));
    const tube = new THREE.PointLight(0xfff2cc, 2.0, 30, 1.2);
    scene.add(tube);

    // --- portfolio kiosks ---
    const makeKioskTexture = (s) => {
      const cv = document.createElement("canvas");
      cv.width = 256;
      cv.height = 384;
      const g = cv.getContext("2d");
      g.fillStyle = "#0c0b07";
      g.fillRect(0, 0, 256, 384);
      g.strokeStyle = s.color;
      g.lineWidth = 8;
      g.strokeRect(12, 12, 232, 360);
      g.fillStyle = s.color;
      g.font = "bold 22px monospace";
      g.fillText(s.tag, 28, 56);
      g.fillStyle = "#f5f5f3";
      g.font = "bold 30px sans-serif";
      const words = s.title.split(" ");
      let yy = 110;
      words.forEach((w) => {
        g.fillText(w, 28, yy);
        yy += 34;
      });
      g.fillStyle = s.color;
      g.fillRect(28, yy + 6, 200, 3);
      g.fillStyle = "#cfc8b0";
      g.font = "15px monospace";
      let ly = yy + 44;
      s.lines.slice(0, 5).forEach((ln) => {
        g.fillText(ln.slice(0, 26), 28, ly);
        ly += 24;
      });
      g.fillStyle = s.color;
      g.font = "bold 16px monospace";
      g.fillText(s.isExit ? "> STEP THROUGH" : "> [E] / TAP READ", 28, 352);
      const tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 4;
      return tex;
    };

    STATIONS.forEach((s) => {
      const cx = s.col * CELL + CELL / 2;
      const cz = s.row * CELL + CELL / 2;
      // glowing pillar body
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(CELL * 0.9, WALL_H, CELL * 0.9),
        new THREE.MeshStandardMaterial({
          color: 0x1a1810,
          emissive: new THREE.Color(s.color),
          emissiveIntensity: 0.18,
          roughness: 0.6,
        })
      );
      body.position.set(cx, WALL_H / 2, cz);
      scene.add(body);
      // poster on all four faces so it's readable from any approach
      const posterGeo = new THREE.PlaneGeometry(CELL * 0.75, CELL * 0.9);
      const posterMat = new THREE.MeshBasicMaterial({ map: makeKioskTexture(s) });
      const faces = [
        [0, 0, CELL * 0.46, 0],
        [0, 0, -CELL * 0.46, Math.PI],
        [CELL * 0.46, 0, 0, Math.PI / 2],
        [-CELL * 0.46, 0, 0, -Math.PI / 2],
      ];
      faces.forEach(([dx, , dz, ry]) => {
        const poster = new THREE.Mesh(posterGeo, posterMat);
        poster.position.set(cx + dx, WALL_H / 2 + 0.1, cz + dz);
        poster.rotation.y = ry;
        scene.add(poster);
      });
    });

    // --- the entity: a pale, gaunt humanoid that stalks you ---
    const entCv = document.createElement("canvas");
    entCv.width = 256;
    entCv.height = 512;
    const eg = entCv.getContext("2d");
    if (eg) {
      drawEntity(eg, 0, 0);
    }

    const entityGroup = new THREE.Group();
    const spawnPos = randomOpenCell();
    entityGroup.position.set(spawnPos[0], 1.3, spawnPos[1]);
    scene.add(entityGroup);

    const entityTex = new THREE.CanvasTexture(entCv);
    entityTex.anisotropy = isMobile ? 2 : 8;
    disposables.push(entityTex);
    const entityHeight = 2.6;
    const entityWidth = 1.3;
    const placeholderMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(entityWidth, entityHeight),
      new THREE.MeshBasicMaterial({
        map: entityTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.96,
      })
    );
    placeholderMesh.position.set(0, 0, 0);
    entityGroup.add(placeholderMesh);

    // Keep reference for animate loop
    const entity = entityGroup;

    // Loader for the 3D entity model using Mixamo animations
    const gltfLoader = new GLTFLoader();
    let entityMixer = null;
    let entityModel = null;
    let walkAction = null;
    let idleAction = null;
    let runAction = null;
    let currentAction = null;

    const transitionTo = (newAction, duration = 0.25) => {
      if (!newAction || newAction === currentAction) return;
      if (currentAction) {
        newAction.reset();
        newAction.setEffectiveWeight(1);
        newAction.setEffectiveTimeScale(1);
        newAction.play();
        currentAction.crossFadeTo(newAction, duration, true);
      } else {
        newAction.play();
      }
      currentAction = newAction;
    };

    const entityLimbs = {
      leftLeg: [],
      rightLeg: [],
      leftArm: [],
      rightArm: [],
      head: [],
      spine: []
    };

    const loadGLTF = (url) => {
      return new Promise((resolve, reject) => {
        gltfLoader.load(url, resolve, undefined, reject);
      });
    };

    Promise.all([
      loadGLTF("/assets/entity/source/Walking.glb"),
      loadGLTF("/assets/entity/source/Neutral Idle.glb"),
      loadGLTF("/assets/entity/source/Injured Run.glb")
    ]).then(([walkGltf, idleGltf, runGltf]) => {
      entityModel = walkGltf.scene;

      // Color the entity meshes pitch black (using standard skinning support)
      entityModel.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x050505, // Pitch black / dark charcoal
            roughness: 0.95,
            metalness: 0.05,
            skinning: true
          });
        }
      });

      // Bounding box calculation of visible meshes only to prevent offset by helpers/bones
      let meshBox = new THREE.Box3();
      let hasMesh = false;
      entityModel.traverse((child) => {
        if (child.isMesh) {
          if (!hasMesh) {
            meshBox.setFromObject(child);
            hasMesh = true;
          } else {
            meshBox.expandByObject(child);
          }
        }
      });
      if (!hasMesh) {
        meshBox.setFromObject(entityModel);
      }

      const size = meshBox.getSize(new THREE.Vector3());
      const height = size.y || 2.0;

      const targetHeight = 2.6;
      const scale = targetHeight / height;
      entityModel.scale.set(scale, scale, scale);

      // Sketchfab/Mixamo glb model rotation offset (aligning the model to face the camera)
      entityModel.rotation.y = Math.PI;

      // Force matrix update to apply scaling before recalculating bounds
      entityModel.updateMatrixWorld(true);

      // Recalculate bounding box of scaled and rotated meshes to find correct Y offset
      meshBox = new THREE.Box3();
      hasMesh = false;
      entityModel.traverse((child) => {
        if (child.isMesh) {
          if (!hasMesh) {
            meshBox.setFromObject(child);
            hasMesh = true;
          } else {
            meshBox.expandByObject(child);
          }
        }
      });
      if (!hasMesh) {
        meshBox.setFromObject(entityModel);
      }

      // Center inside the group so its absolute lowest mesh point touches the floor (floor is local Y = -1.3 relative to group pivot Y=1.3)
      entityModel.position.set(0, -1.3, 0);

      // Traverse and identify limbs (only as a fallback)
      entityModel.traverse((child) => {
        const name = child.name.toLowerCase();
        if (name.includes("left") && (name.includes("leg") || name.includes("calf") || name.includes("thigh") || name.includes("shin") || name.includes("foot") || name.includes("knee") || name.includes("upleg") || name.includes("lowleg"))) {
          entityLimbs.leftLeg.push(child);
        } else if (name.includes("right") && (name.includes("leg") || name.includes("calf") || name.includes("thigh") || name.includes("shin") || name.includes("foot") || name.includes("knee") || name.includes("upleg") || name.includes("lowleg"))) {
          entityLimbs.rightLeg.push(child);
        } else if (name.includes("left") && (name.includes("arm") || name.includes("forearm") || name.includes("shoulder") || name.includes("hand") || name.includes("elbow") || name.includes("armup") || name.includes("armlow") || name.includes("hand"))) {
          entityLimbs.leftArm.push(child);
        } else if (name.includes("right") && (name.includes("arm") || name.includes("forearm") || name.includes("shoulder") || name.includes("hand") || name.includes("elbow") || name.includes("armup") || name.includes("armlow") || name.includes("hand"))) {
          entityLimbs.rightArm.push(child);
        } else if (name.includes("head") || name.includes("neck")) {
          entityLimbs.head.push(child);
        } else if (name.includes("spine") || name.includes("torso") || name.includes("chest") || name.includes("hips") || name.includes("pelvis") || name.includes("root")) {
          entityLimbs.spine.push(child);
        }
      });

      // Remove 2D placeholder and add 3D model
      entityGroup.remove(placeholderMesh);
      entityGroup.add(entityModel);

      // Setup Mixamo animations
      entityMixer = new THREE.AnimationMixer(entityModel);
      if (walkGltf.animations && walkGltf.animations.length > 0) {
        walkAction = entityMixer.clipAction(walkGltf.animations[0]);
      }
      if (idleGltf.animations && idleGltf.animations.length > 0) {
        idleAction = entityMixer.clipAction(idleGltf.animations[0]);
      }
      if (runGltf.animations && runGltf.animations.length > 0) {
        runAction = entityMixer.clipAction(runGltf.animations[0]);
      }

      // Play Idle by default
      if (idleAction) {
        currentAction = idleAction;
        idleAction.play();
      } else if (walkAction) {
        currentAction = walkAction;
        walkAction.play();
      }
    }).catch((err) => {
      console.warn("Failed to load Mixamo GLTF animations, falling back to static model loader:", err);
      // Revert loading behavior to backrooms entity.glb if the new files fail
      gltfLoader.load(
        "/assets/entity/source/backrooms entity.glb",
        (gltf) => {
          entityModel = gltf.scene;

          // Color the entity meshes pitch black
          entityModel.traverse((child) => {
            if (child.isMesh) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0x050505, // Pitch black / dark charcoal
                roughness: 0.95,
                metalness: 0.05,
                skinning: true
              });
            }
          });

          // Bounding box calculation of visible meshes only
          let meshBox = new THREE.Box3();
          let hasMesh = false;
          entityModel.traverse((child) => {
            if (child.isMesh) {
              if (!hasMesh) {
                meshBox.setFromObject(child);
                hasMesh = true;
              } else {
                meshBox.expandByObject(child);
              }
            }
          });
          if (!hasMesh) {
            meshBox.setFromObject(entityModel);
          }

          const size = meshBox.getSize(new THREE.Vector3());
          const height = size.y || 2.0;
          const targetHeight = 2.6;
          const scale = targetHeight / height;
          entityModel.scale.set(scale, scale, scale);
          entityModel.rotation.y = Math.PI;

          // Force matrix update
          entityModel.updateMatrixWorld(true);

          meshBox = new THREE.Box3();
          hasMesh = false;
          entityModel.traverse((child) => {
            if (child.isMesh) {
              if (!hasMesh) {
                meshBox.setFromObject(child);
                hasMesh = true;
              } else {
                meshBox.expandByObject(child);
              }
            }
          });
          if (!hasMesh) {
            meshBox.setFromObject(entityModel);
          }

          entityModel.position.set(0, -1.3, 0);

          entityModel.traverse((child) => {
            const name = child.name.toLowerCase();
            if (name.includes("left") && (name.includes("leg") || name.includes("calf") || name.includes("thigh") || name.includes("shin") || name.includes("foot") || name.includes("knee") || name.includes("upleg") || name.includes("lowleg"))) {
              entityLimbs.leftLeg.push(child);
            } else if (name.includes("right") && (name.includes("leg") || name.includes("calf") || name.includes("thigh") || name.includes("shin") || name.includes("foot") || name.includes("knee") || name.includes("upleg") || name.includes("lowleg"))) {
              entityLimbs.rightLeg.push(child);
            } else if (name.includes("left") && (name.includes("arm") || name.includes("forearm") || name.includes("shoulder") || name.includes("hand") || name.includes("elbow") || name.includes("armup") || name.includes("armlow") || name.includes("hand"))) {
              entityLimbs.leftArm.push(child);
            } else if (name.includes("right") && (name.includes("arm") || name.includes("forearm") || name.includes("shoulder") || name.includes("hand") || name.includes("elbow") || name.includes("armup") || name.includes("armlow") || name.includes("hand"))) {
              entityLimbs.rightArm.push(child);
            } else if (name.includes("head") || name.includes("neck")) {
              entityLimbs.head.push(child);
            } else if (name.includes("spine") || name.includes("torso") || name.includes("chest") || name.includes("hips") || name.includes("pelvis") || name.includes("root")) {
              entityLimbs.spine.push(child);
            }
          });
          entityGroup.remove(placeholderMesh);
          entityGroup.add(entityModel);
        }
      );
    });

    // --- input ---
    const onKey = (e, down) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "arrowup") keysRef.current.f = down ? 1 : 0;
      else if (k === "s" || k === "arrowdown") keysRef.current.f = down ? -1 : 0;
      else if (k === "a" || k === "arrowleft") keysRef.current.s = down ? -1 : 0;
      else if (k === "d" || k === "arrowright") keysRef.current.s = down ? 1 : 0;
      else if (k === "e" && down && nearRef.current) interactNow();
      else if (k === "v" && down && showAuditFeature) setAuditMode((prev) => !prev);
    };
    const kd = (e) => onKey(e, true);
    const ku = (e) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    const canvas = renderer.domElement;
    const lockSens = 0.0022;
    const onMouseMove = (e) => {
      if (document.pointerLockElement !== canvas) return;
      yawRef.current -= e.movementX * lockSens;
      pitchRef.current = THREE.MathUtils.clamp(
        pitchRef.current - e.movementY * lockSens,
        -1.2,
        1.2
      );
    };
    document.addEventListener("mousemove", onMouseMove);
    const onClick = () => {
      if (!isMobile && document.pointerLockElement !== canvas) canvas.requestPointerLock();
    };
    canvas.addEventListener("click", onClick);
    const onLockChange = () => {
      const locked = document.pointerLockElement === canvas;
      if (!isMobile) {
        startedRef.current = locked;
        setStarted(locked);
      }
    };
    document.addEventListener("pointerlockchange", onLockChange);

    // touch look (right half of screen)
    let lookId = null;
    let lastTouch = { x: 0, y: 0 };
    const onTouchStart = (e) => {
      for (const t of e.changedTouches) {
        if (t.clientX > window.innerWidth * 0.4 && lookId === null) {
          lookId = t.identifier;
          lastTouch = { x: t.clientX, y: t.clientY };
        }
      }
    };
    const onTouchMove = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === lookId) {
          yawRef.current -= (t.clientX - lastTouch.x) * 0.005;
          pitchRef.current = THREE.MathUtils.clamp(
            pitchRef.current - (t.clientY - lastTouch.y) * 0.005,
            -1.2,
            1.2
          );
          lastTouch = { x: t.clientX, y: t.clientY };
        }
      }
    };
    const onTouchEnd = (e) => {
      for (const t of e.changedTouches) if (t.identifier === lookId) lookId = null;
    };
    if (isMobile) {
      canvas.addEventListener("touchstart", onTouchStart, { passive: true });
      canvas.addEventListener("touchmove", onTouchMove, { passive: true });
      canvas.addEventListener("touchend", onTouchEnd, { passive: true });
    }

    // interaction handler kept on the instance so React buttons can call it
    const interactNow = () => {
      const s = STATIONS.find((st) => st.id === nearRef.current);
      if (!s) return;
      if (s.isExit) setConceptMode("main");
      else setActiveStation(s);
    };
    interactRef.current = interactNow;

    // --- procedural footstep: soft carpet thud + filtered noise scuff ---
    let stepFoot = 0;
    const playFootstep = () => {
      const a = audioRef.current;
      if (!a.ctx || !a.hum) return;
      const ctx = a.ctx;
      const t = ctx.currentTime;
      stepFoot ^= 1; // alternate feet → slight pitch variation
      const base = 92 + stepFoot * 8 + Math.random() * 10;

      // low thud (body weight on damp carpet)
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(base, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(og);
      og.connect(a.hum);
      o.start(t);
      o.stop(t + 0.18);

      // noise scuff (carpet fibers)
      const nb = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
      const nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++)
        nd[i] = (Math.random() * 2 - 1) * (1 - i / nd.length);
      const n = ctx.createBufferSource();
      n.buffer = nb;
      const nf = ctx.createBiquadFilter();
      nf.type = "bandpass";
      nf.frequency.value = 1100 + Math.random() * 400;
      nf.Q.value = 0.7;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.05, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      n.connect(nf);
      nf.connect(ng);
      ng.connect(a.hum);
      n.start(t);
      n.stop(t + 0.12);
    };

    // --- main loop ---
    const clock = new THREE.Clock();
    let raf;
    let bob = 0;
    let flick = 0;
    let promptShown = null;
    let coordTick = 0;
    let stepPhase = 0;
    let entityWalkPhase = 0;
    let wasAudit = false;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);

      // movement (only when live)
      const live = startedRef.current && !activeRef.current;
      if (live) {
        const yaw = yawRef.current;
        const fx = -Math.sin(yaw);
        const fz = -Math.cos(yaw);
        const rx = -fz;
        const rz = fx;
        const { f, s } = keysRef.current;
        let mx = fx * f + rx * s;
        let mz = fz * f + rz * s;
        const len = Math.hypot(mx, mz);
        if (len > 0) {
          mx /= len;
          mz /= len;
          const moveScale = Math.min(len, 1); // analog joystick magnitude
          const speed = 4.5 * dt * moveScale;
          const nx = player.x + mx * speed;
          const nz = player.z + mz * speed;
          if (!collides(nx, player.z)) player.x = nx;
          if (!collides(player.x, nz)) player.z = nz;
          bob += dt * 9 * moveScale;
          // footstep: fire on each bob half-cycle (left/right foot)
          stepPhase += dt * 9 * moveScale;
          if (stepPhase >= Math.PI) {
            stepPhase -= Math.PI;
            playFootstep();
          }
        } else {
          stepPhase = Math.PI; // arm an immediate step on next move
        }
      }

      // camera orientation + head bob
      camera.position.set(player.x, EYE + Math.sin(bob) * 0.06, player.z);
      const euler = new THREE.Euler(pitchRef.current, yawRef.current, 0, "YXZ");
      camera.quaternion.setFromEuler(euler);

      // buzzing tube light follows the player & flickers
      flick += dt;
      const buzz =
        1.7 +
        Math.sin(flick * 30) * 0.08 +
        (Math.random() < 0.03 ? -0.5 : 0) +
        Math.sin(flick * 2.3) * 0.2;
      tube.intensity = Math.max(1.1, buzz);
      tube.position.set(player.x, WALL_H - 0.3, player.z);

      // entity drifts toward the player, billboards, relocates when too close
      const toP = new THREE.Vector3(player.x - entity.position.x, 0, player.z - entity.position.z);
      const edist = toP.length();
      let entitySpeed = 0;
      
      const isAudit = auditModeRef.current;
      const ai = aiStateRef.current;
      
      // Update recalc timer
      if (ai.recalcTimer > 0) ai.recalcTimer -= dt;

      if (isAudit && !wasAudit) {
        // Just entered audit mode: Teleport directly in front of camera
        const yaw = yawRef.current;
        const fx = -Math.sin(yaw);
        const fz = -Math.cos(yaw);
        entity.position.set(
          player.x + fx * 4.2,
          1.3,
          player.z + fz * 4.2
        );
        ai.state = "AUDIT";
      }
      wasAudit = isAudit;

      if (isAudit) {
        // Keep it directly in front of the player, walking on the spot for audit inspection
        toP.normalize();
        const targetX = player.x - toP.x * 4.2;
        const targetZ = player.z - toP.z * 4.2;
        
        // Glide smoothly to front of camera
        entity.position.x += (targetX - entity.position.x) * 0.15;
        entity.position.z += (targetZ - entity.position.z) * 0.15;
        
        entitySpeed = 1.8; // simulate walking speed for limb swinging
        entityWalkPhase += dt * entitySpeed * 4.5;
        entity.position.y = 1.3 + Math.abs(Math.sin(entityWalkPhase)) * 0.06;
      } else {
        // Normal AI behavior with A* pathfinding and line-of-sight checking
        const entX = entity.position.x;
        const entZ = entity.position.z;
        const plX = player.x;
        const plZ = player.z;
        
        // Check if entity has direct Line of Sight to player
        const seePlayer = hasLineOfSight(entX, entZ, plX, plZ, grid);
        
        // State Transitions
        if (seePlayer) {
          if (ai.state !== "CHASE") {
            ai.state = "CHASE";
            // trigger fluorescent flicker warn
            flick = 0;
            tube.intensity = 0.1; 
          }
          
          const pCol = Math.floor(plX / CELL);
          const pRow = Math.floor(plZ / CELL);
          const eCol = Math.floor(entX / CELL);
          const eRow = Math.floor(entZ / CELL);
          
          // Recalculate chase path periodically or if player moves cell
          if (ai.recalcTimer <= 0 || !ai.chasePath || ai.chasePath.length === 0 || ai.lastPlayerCell?.col !== pCol || ai.lastPlayerCell?.row !== pRow) {
            ai.chasePath = findPath(eCol, eRow, pCol, pRow, grid);
            ai.chaseNodeIndex = 1;
            ai.lastPlayerCell = { col: pCol, row: pRow };
            ai.recalcTimer = 0.35;
          }
        } else {
          // If we lost sight during chase, go to SEARCH
          if (ai.state === "CHASE") {
            ai.state = "SEARCH";
            const pCol = Math.floor(plX / CELL);
            const pRow = Math.floor(plZ / CELL);
            const eCol = Math.floor(entX / CELL);
            const eRow = Math.floor(entZ / CELL);
            ai.chasePath = findPath(eCol, eRow, pCol, pRow, grid);
            ai.chaseNodeIndex = 1;
          }
        }
        
        // Move entity along path
        let activePath = null;
        let activeNodeIndex = 0;
        let speed = 1.1; // default patrol speed
        
        if (ai.state === "CHASE") {
          activePath = ai.chasePath;
          activeNodeIndex = ai.chaseNodeIndex;
          speed = 2.5;
        } else if (ai.state === "SEARCH") {
          activePath = ai.chasePath;
          activeNodeIndex = ai.chaseNodeIndex;
          speed = 1.9;
        } else {
          // PATROL
          activePath = ai.patrolPath;
          activeNodeIndex = ai.patrolNodeIndex;
          speed = 1.1;
        }
        
        let targetX = entX;
        let targetZ = entZ;
        let hasTarget = false;
        
        if (ai.state === "CHASE") {
          targetX = plX;
          targetZ = plZ;
          hasTarget = true;
        } else if (activePath && activeNodeIndex < activePath.length) {
          const node = activePath[activeNodeIndex];
          targetX = node[0] * CELL + CELL / 2;
          targetZ = node[1] * CELL + CELL / 2;
          hasTarget = true;
          
          const distToNode = Math.hypot(targetX - entX, targetZ - entZ);
          if (distToNode < 0.35) {
            if (ai.state === "SEARCH") {
              ai.chaseNodeIndex++;
            } else {
              ai.patrolNodeIndex++;
            }
          }
        } else {
          // No path / reached destination
          if (ai.state === "SEARCH") {
            ai.state = "PATROL";
            ai.patrolPath = [];
            ai.patrolTargetCell = null;
          } else if (ai.state === "PATROL" || ai.state === "AUDIT") {
            // Pick a new random patrol target
            ai.state = "PATROL";
            const target = randomOpenCell();
            const pCol = Math.floor(target[0] / CELL);
            const pRow = Math.floor(target[1] / CELL);
            const eCol = Math.floor(entX / CELL);
            const eRow = Math.floor(entZ / CELL);
            const path = findPath(eCol, eRow, pCol, pRow, grid);
            if (path && path.length > 1) {
              ai.patrolPath = path;
              ai.patrolNodeIndex = 1;
              ai.patrolTargetCell = { col: pCol, row: pRow };
            }
          }
        }
        
        if (hasTarget) {
          const toT = new THREE.Vector3(targetX - entX, 0, targetZ - entZ);
          const dist = toT.length();
          if (dist > 0.01) {
            toT.normalize();
            
            // Side-to-side slithering/wobble noise
            const wobbleFreq = ai.state === "CHASE" ? 7.5 : 4.5;
            const wobbleAmp = ai.state === "CHASE" ? 0.38 : 0.28;
            const time = clock.getElapsedTime();
            const wobbleAngle = Math.sin(time * wobbleFreq) * wobbleAmp;
            
            const cosW = Math.cos(wobbleAngle);
            const sinW = Math.sin(wobbleAngle);
            const moveX = toT.x * cosW - toT.z * sinW;
            const moveZ = toT.x * sinW + toT.z * cosW;
            
            const stepSize = speed * dt;
            let nx = entX + moveX * stepSize;
            let nz = entZ + moveZ * stepSize;
            
            // High frequency twitching jitter
            const twitchScale = ai.state === "CHASE" ? 0.045 : 0.015;
            nx += (Math.random() - 0.5) * twitchScale;
            nz += (Math.random() - 0.5) * twitchScale;
            
            if (!collides(nx, entZ)) entity.position.x = nx;
            if (!collides(entity.position.x, nz)) entity.position.z = nz;
            
            entitySpeed = speed;
            entityWalkPhase += dt * entitySpeed * (ai.state === "CHASE" ? 6.5 : 4.5);
            entity.position.y = 1.3 + Math.abs(Math.sin(entityWalkPhase)) * 0.06;
          }
        } else {
          entitySpeed = 0;
        }
        
        // Relocate entity when too close to player (caught!)
        if (edist < 2.5) {
          const [nx, nz] = randomOpenCell();
          entity.position.set(nx, 1.3, nz);
          
          ai.state = "PATROL";
          ai.patrolPath = [];
          ai.patrolTargetCell = null;
          
          // blackout flash trigger
          flick = 0;
          tube.intensity = 0.0;
        }
      }

      // Safe guards against NaN values (e.g. from dt=0 divisions or limits)
      if (isNaN(entitySpeed)) entitySpeed = 0;
      if (isNaN(entityWalkPhase)) entityWalkPhase = 0;
      if (isNaN(entity.position.y)) entity.position.y = 1.3;
      if (isNaN(entity.position.x) || isNaN(entity.position.z)) {
        const spawnPos = randomOpenCell();
        entity.position.set(spawnPos[0], 1.3, spawnPos[1]);
      }
      
      // Update canvas texture with walking poses (for 2D fallback fallback)
      if (eg) {
        drawEntity(eg, entityWalkPhase, entitySpeed);
        entityTex.needsUpdate = true;
      }

      // Mixamo Animation Blending & Fallback Procedural System
      const hasMixamo = !!(walkAction || idleAction || runAction);
      
      if (entityModel) {
        if (hasMixamo && entityMixer) {
          // 1. Mixamo Rig Active: Blend animations based on state and speed
          if (isAudit) {
            // In Audit mode: Play walking animation
            transitionTo(walkAction, 0.2);
            const duration = walkAction.getClip().duration;
            const walkStride = 1.4; // stride length in meters
            walkAction.setEffectiveTimeScale((entitySpeed * duration) / walkStride);
          } else if (entitySpeed <= 0.05) {
            // Stopped: Play breathing idle
            transitionTo(idleAction, 0.25);
            idleAction.setEffectiveTimeScale(1.0);
          } else if (ai.state === "CHASE" || ai.state === "SEARCH") {
            // Chasing or searching: Play sprinting run
            transitionTo(runAction, 0.2);
            // Sync playback speed with physical movement velocity
            const duration = runAction.getClip().duration;
            const runStride = 2.1; // stride length in meters for injured run
            runAction.setEffectiveTimeScale((entitySpeed * duration) / runStride);
          } else {
            // Patrolling: Play normal walk
            transitionTo(walkAction, 0.25);
            // Sync playback speed with physical movement velocity
            const duration = walkAction.getClip().duration;
            const walkStride = 1.4; // stride length in meters for walk
            walkAction.setEffectiveTimeScale((entitySpeed * duration) / walkStride);
          }
          
          // Reset model rotation tilts (controlled by Mixamo keyframes)
          entityModel.rotation.z = 0;
          entityModel.rotation.x = 0;
          
          // Update the mixer
          entityMixer.update(dt);
        } else {
          // 2. Procedural Fallback: Rig missing, apply manual bone swings
          const hasLimbs = entityLimbs.leftLeg.length > 0 || entityLimbs.rightLeg.length > 0;
          const walkScale = Math.min(entitySpeed * 0.5, 1.0);
          
          if (hasLimbs && entitySpeed > 0.05) {
            const swing = Math.sin(entityWalkPhase);
            const cosSwing = Math.cos(entityWalkPhase);
            
            entityLimbs.leftLeg.forEach((b) => {
              b.rotation.x = swing * 0.45 * walkScale;
            });
            entityLimbs.rightLeg.forEach((b) => {
              b.rotation.x = -swing * 0.45 * walkScale;
            });
            entityLimbs.leftArm.forEach((b) => {
              b.rotation.x = -swing * 0.5 * walkScale;
              b.rotation.z = (0.15 + Math.abs(cosSwing) * 0.1) * walkScale;
            });
            entityLimbs.rightArm.forEach((b) => {
              b.rotation.x = swing * 0.5 * walkScale;
              b.rotation.z = -(0.15 + Math.abs(cosSwing) * 0.1) * walkScale;
            });
            entityLimbs.spine.forEach((b) => {
              b.rotation.y = swing * 0.08 * walkScale;
              b.rotation.z = cosSwing * 0.04 * walkScale;
            });
            entityLimbs.head.forEach((b) => {
              b.rotation.x = Math.abs(cosSwing) * 0.08 * walkScale;
              b.rotation.y = swing * 0.05 * walkScale;
            });
          } else if (hasLimbs) {
            // Reset to default pose when standing still
            entityLimbs.leftLeg.forEach((b) => { b.rotation.x = 0; });
            entityLimbs.rightLeg.forEach((b) => { b.rotation.x = 0; });
            entityLimbs.leftArm.forEach((b) => { b.rotation.x = 0; b.rotation.z = 0; });
            entityLimbs.rightArm.forEach((b) => { b.rotation.x = 0; b.rotation.z = 0; });
            entityLimbs.spine.forEach((b) => { b.rotation.y = 0; b.rotation.z = 0; });
            entityLimbs.head.forEach((b) => { b.rotation.x = 0; b.rotation.y = 0; });
          }
          
          // Add global waddle to entityModel itself (yaw-offset model)
          if (entitySpeed > 0.05) {
            entityModel.rotation.z = Math.sin(entityWalkPhase) * 0.08 * walkScale;
            entityModel.rotation.x = Math.cos(entityWalkPhase * 2) * 0.04 * walkScale;
          } else {
            entityModel.rotation.z = 0;
            entityModel.rotation.x = 0;
          }
          
          // Fallback mixer update
          if (entityMixer) {
            const mixerSpeed = isAudit ? 1.0 : (entitySpeed > 0 ? entitySpeed / 2.0 : 0);
            entityMixer.update(dt * mixerSpeed);
          }
        }

        // Strip root motion to keep the animation in-place
        entityModel.traverse((child) => {
          const nameLower = child.name.toLowerCase();
          if (nameLower === "hips" || nameLower === "mixamorighips" || nameLower.includes("rootnode") || nameLower === "mixamorig:hips") {
            child.position.x = 0;
            child.position.z = 0;
          }
        });
      }
      
      // billboard toward player but keep upright
      entity.rotation.y = Math.atan2(
        camera.position.x - entity.position.x,
        camera.position.z - entity.position.z
      );

      // entity audio sting scales with proximity
      const a = audioRef.current;
      if (a.sting && a.ctx) {
        const maxDist = ai.state === "CHASE" ? 22 : 16;
        const near = THREE.MathUtils.clamp(1 - edist / maxDist, 0, 1);
        const baseGain = ai.state === "CHASE" ? 0.38 : 0.22;
        a.sting.gain.setTargetAtTime(near * baseGain, a.ctx.currentTime, 0.2);
      }

      // nearest readable kiosk → drive the React prompt
      let found = null;
      for (const st of STATIONS) {
        const sx = st.col * CELL + CELL / 2;
        const sz = st.row * CELL + CELL / 2;
        if (Math.hypot(sx - player.x, sz - player.z) < CELL * 1.7) {
          found = st.id;
          break;
        }
      }
      if (found !== promptShown) {
        promptShown = found;
        nearRef.current = found;
        setPrompt(found);
      }

      // throttle coord HUD updates
      coordTick += dt;
      if (coordTick > 0.25) {
        coordTick = 0;
        setCoords({
          x: +(player.x - 48).toFixed(1),
          z: +(player.z - 48).toFixed(1),
        });
      }

      // CRT post-processing: animate grain + flicker intensity with the tube
      crtPass.uniforms.uTime.value = clock.elapsedTime;
      crtPass.uniforms.uIntensity.value =
        (isMobile ? 0.7 : 1) * (0.9 + (1.1 - Math.min(tube.intensity, 1.1)) * 0.6);
      composer.render();
    };
    animate();

    const onResize = () => {
      width = mount.clientWidth;
      height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
      crtPass.uniforms.uResolution.value.set(height, height);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLockChange);
      canvas.removeEventListener("click", onClick);
      if (isMobile) {
        canvas.removeEventListener("touchstart", onTouchStart);
        canvas.removeEventListener("touchmove", onTouchMove);
        canvas.removeEventListener("touchend", onTouchEnd);
      }
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
      disposables.forEach((t) => t.dispose());
      composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount)
        mount.removeChild(renderer.domElement);
      const a = audioRef.current;
      if (a.ctx) a.ctx.close();
      audioRef.current = { ctx: null, hum: null, sting: null };
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // mirror activeStation into a ref so the render loop can read it
  useEffect(() => {
    activeRef.current = !!activeStation;
  }, [activeStation]);

  const beginDesktop = () => {
    startAudio();
    const cv = mountRef.current?.querySelector("canvas");
    cv?.requestPointerLock?.();
  };
  const beginMobile = () => {
    startAudio();
    startedRef.current = true;
    setStarted(true);
  };

  // --- mobile joystick ---
  const joyRef = useRef(null);
  const onJoy = (e) => {
    const touch = e.touches[0];
    if (!touch || !joyRef.current) return;
    const rect = joyRef.current.getBoundingClientRect();
    const dx = touch.clientX - (rect.left + rect.width / 2);
    const dy = touch.clientY - (rect.top + rect.height / 2);
    const max = rect.width / 2;
    keysRef.current.f = THREE.MathUtils.clamp(-dy / max, -1, 1);
    keysRef.current.s = THREE.MathUtils.clamp(dx / max, -1, 1);
  };
  const endJoy = () => {
    keysRef.current.f = 0;
    keysRef.current.s = 0;
  };

  const promptStation = STATIONS.find((s) => s.id === prompt);

  return (
    <div className="fixed inset-0 z-30 bg-black select-none overflow-hidden">
      {/* 3D viewport */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* liminal CRT / VHS flavor on top */}
      <div className="crt-overlay" />
      <div className="vhs-tracking-line" />

      {/* top HUD bar */}
      <div className="absolute top-0 left-0 w-full z-35 flex justify-between items-center px-4 md:px-8 py-3 pointer-events-none">
        <div className="font-mono text-[10px] md:text-xs text-amber-300/80 leading-relaxed drop-shadow">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            LEVEL 0 — THE LOBBY
          </div>
          <div>X:{coords.x} Z:{coords.z} · SIGNAL UNSTABLE</div>
        </div>
        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute ambient hum" : "Mute ambient hum"}
            className="font-mono text-[10px] md:text-xs px-3 py-1.5 bg-black/50 border border-amber-400/40 text-amber-300 rounded hover:bg-amber-400/10 backdrop-blur-sm cursor-pointer flex items-center gap-1.5"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M11 5 6 9H2v6h4l5 4V5z" />
              {muted ? (
                <>
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </>
              ) : (
                <>
                  <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                  <path d="M19 5a9 9 0 0 1 0 14" />
                </>
              )}
            </svg>
            {muted ? "FREQ_60HZ: MUTED" : "FREQ_60HZ: ACTIVE"}
          </button>
          {showAuditFeature && (
            <button
              onClick={() => setAuditMode((a) => !a)}
              className={`font-mono text-[10px] md:text-xs px-3 py-1.5 border rounded backdrop-blur-sm cursor-pointer flex items-center gap-1.5 transition-all ${
                auditMode 
                  ? "bg-green-600/80 border-green-400 text-white font-bold" 
                  : "bg-black/50 border-amber-400/40 text-amber-300 hover:bg-amber-400/10"
              }`}
            >
              {auditMode ? "[ AUDIT_MODE: ACTIVE ]" : "[ AUDIT_MODE: PREVIEW ]"}
            </button>
          )}
          <button
            onClick={() => setConceptMode("main")}
            className="font-mono text-[10px] md:text-xs px-3 py-1.5 bg-red-600/80 border border-red-400 text-white font-bold rounded hover:bg-red-500 backdrop-blur-sm cursor-pointer"
          >
            [ NOCLIP_OVERRIDE ]
          </button>
        </div>
      </div>

      {/* crosshair */}
      {started && !activeStation && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-200/70 shadow-[0_0_6px_rgba(255,240,180,0.8)]" />
        </div>
      )}

      {/* start overlay */}
      {!started && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center px-6 bg-black/70 backdrop-blur-sm">
          <span className="font-mono text-xs tracking-[0.4em] text-amber-400/80 mb-3">
            NO-CLIP SUCCESSFUL
          </span>
          <h1 className="font-display font-bold text-4xl md:text-6xl text-amber-200 mb-4 uppercase tracking-tight">
            You are in Level 0
          </h1>
          <p className="font-mono text-xs md:text-sm text-amber-100/60 max-w-md mb-8 leading-relaxed">
            Endless yellow rooms. Buzzing lights. Something else is here. Find the
            glowing kiosks to read the archives — and the EXIT door to escape.
            {showAuditFeature && (
              <span className="block mt-3 text-green-400 font-semibold border border-green-500/20 bg-green-500/5 px-2.5 py-1.5 rounded-sm">
                💡 AUDIT MODE: Press 'V' or click PREVIEW at the top to summon the entity directly in front of you.
              </span>
            )}
          </p>
          <button
            onClick={isMobile ? beginMobile : beginDesktop}
            className="font-mono text-sm px-8 py-3.5 bg-amber-400 text-black font-bold rounded hover:bg-amber-300 transition-colors cursor-pointer animate-pulse"
          >
            {isMobile ? "▸ TAP TO ENTER" : "▸ CLICK TO ENTER (WASD + MOUSE)"}
          </button>
          <p className="font-mono text-[10px] text-amber-100/40 mt-6">
            {isMobile
              ? "Left thumb = move · Drag right = look · Tap READ near a kiosk"
              : "WASD / arrows = move · Mouse = look · E = read · ESC = release cursor"}
          </p>
          <p className="font-mono text-[9px] text-amber-100/25 mt-2">
            3D Entity: "Backrooms Entity" by lol's studios (CC BY 4.0)
          </p>
        </div>
      )}

      {/* proximity prompt */}
      {started && prompt && !activeStation && promptStation && (
        <div className="absolute bottom-28 md:bottom-16 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={() => interactRef.current()}
            className="font-mono text-xs md:text-sm px-5 py-2.5 rounded border backdrop-blur-md cursor-pointer animate-pulse"
            style={{
              color: promptStation.color,
              borderColor: promptStation.color,
              background: "rgba(0,0,0,0.55)",
            }}
          >
            {promptStation.isExit
              ? "▸ STEP THROUGH THE EXIT"
              : `▸ ${isMobile ? "TAP" : "[E]"} READ · ${promptStation.tag}`}
          </button>
        </div>
      )}

      {/* reading card */}
      {activeStation && (
        <div className="absolute inset-0 z-40 flex items-center justify-center px-6 bg-black/70 backdrop-blur-sm">
          <div
            className="w-full max-w-md bg-[#0c0b07] border-2 p-6 md:p-8 font-mono relative"
            style={{ borderColor: activeStation.color }}
          >
            <div
              className="text-[10px] tracking-[0.3em] mb-2"
              style={{ color: activeStation.color }}
            >
              {activeStation.tag}
            </div>
            <h2 className="font-display font-bold text-2xl md:text-3xl text-amber-50 mb-4 uppercase">
              {activeStation.title}
            </h2>
            <div className="h-px w-full mb-4" style={{ background: activeStation.color }} />
            <div className="space-y-1.5 text-sm text-amber-100/70 leading-relaxed">
              {activeStation.lines.map((ln, i) => {
                if (ln.includes("Purwakarta")) {
                  const parts = ln.split("Purwakarta");
                  return (
                    <p key={i}>
                      {parts[0]}
                      <span className="relative inline-block select-none px-1 mx-0.5 align-middle">
                        <span className="blur-[1px] text-amber-100/20 font-semibold">Purwakarta</span>
                        <span className="absolute inset-y-1 left-0 right-0 z-10 bg-[repeating-linear-gradient(-45deg,#f59e0b,#f59e0b_4px,#0d0d0c_4px,#0d0d0c_8px)] border border-amber-500/10 select-none pointer-events-none opacity-90 origin-center" />
                      </span>
                      {parts[1]}
                    </p>
                  );
                }
                return <p key={i}>{ln}</p>;
              })}
            </div>
            <button
              onClick={() => setActiveStation(null)}
              className="mt-6 w-full py-2.5 text-xs font-bold uppercase tracking-widest cursor-pointer"
              style={{ background: activeStation.color, color: "#0c0b07" }}
            >
              ◂ Back to the rooms
            </button>
          </div>
        </div>
      )}

      {/* mobile joystick */}
      {isMobile && started && !activeStation && (
        <div
          ref={joyRef}
          onTouchStart={onJoy}
          onTouchMove={onJoy}
          onTouchEnd={endJoy}
          className="absolute bottom-8 left-8 z-20 w-32 h-32 rounded-full border-2 border-amber-400/40 bg-black/30 backdrop-blur-sm flex items-center justify-center"
        >
          <div className="w-12 h-12 rounded-full bg-amber-400/30 border border-amber-300/60" />
          <span className="absolute -top-6 font-mono text-[9px] text-amber-300/60">MOVE</span>
        </div>
      )}
    </div>
  );
};

export default BackroomsWorkspace;

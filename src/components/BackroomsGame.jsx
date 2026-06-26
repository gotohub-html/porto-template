import { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";

import {
  CELL,
  COLS,
  ROWS,
  WALL_H,
  EYE,
  parseMaze,
} from "./game/maze";
import { findPath, hasLineOfSight } from "./game/pathfinding";
import { drawEntity, ENTITY_W, ENTITY_H } from "./game/entity";
import { GameAudio } from "./game/audio";
import { getQuality, detectMobile } from "./game/quality";
import { makeWallpaper, makeCarpet, buildComposer } from "./game/render";

/**
 * BACK2ROOM — emergency upload protocol (first-person horror).
 *
 * Dark = safe, light = danger. Carry 4 data packets (ABOUT/SKILLS/PROJECTS/
 * CONTACT) to upload terminals while a light-seeking entity hunts you by A*.
 * Upload all 4, reach the exit, fade into the real portfolio.
 *
 * Desktop : click to lock pointer, WASD/arrows to move, mouse to look,
 *           E to upload (hold), F to toggle flashlight, ESC to release.
 * Mobile  : left thumb joystick to move, drag right to look, on-screen buttons.
 */

// Tuning (see BACK2ROOM_PLAN.md)
const BATTERY_MAX = 90; // seconds of light from a full charge
const BATTERY_PER_PICKUP = 30;
const UPLOAD_SECONDS = 5;
const ENTITY_BASE_SPEED = 1.7; // units/sec
const ENTITY_CATCH_DIST = 1.3;
const DARK_GRACE = 3.5; // seconds the entity loses you after going dark
const PLAYER_SPEED = 3.2;
const RADIUS = 0.45; // player collision radius

const BackroomsGame = ({ onWin, onQuit }) => {
  const [isMobile] = useState(detectMobile);
  const mountRef = useRef(null);

  // HUD state (updated throttled from the render loop + immediately on events)
  const [hud, setHud] = useState({
    battery: 1,
    lightOn: true,
    carried: null,
    uploaded: 0,
    prompt: null,
    uploadProgress: 0,
    proximity: 0,
    distress: 0,
  });
  const [revealDoc, setRevealDoc] = useState(null); // packet meta being shown
  const [status, setStatus] = useState("intro"); // intro | playing | dead | won
  const [muted, setMuted] = useState(false);

  // audit/debug mode: ?audit URL or backtick toggle. Floods light, kills fog,
  // invulnerable, shows minimap + stats. For tuning placement & pacing.
  const auditParam = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("audit");
  const [audit, setAudit] = useState(auditParam);
  const auditRef = useRef(auditParam);
  const minimapRef = useRef(null);
  useEffect(() => { auditRef.current = audit; }, [audit]);

  const statusRef = useRef("intro");
  const revealRef = useRef(false);
  const mutedRef = useRef(false);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { revealRef.current = !!revealDoc; }, [revealDoc]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // Input + player state shared with the loop (refs avoid re-renders)
  const keysRef = useRef({ f: 0, s: 0, e: false });
  const yawRef = useRef(Math.PI);
  const pitchRef = useRef(0);
  const audioRef = useRef(null);
  const gameRef = useRef(null); // mutable world/game state
  const touchLookRef = useRef({ id: null, x: 0, y: 0 });
  const joyRef = useRef({ id: null, ox: 0, oy: 0, dx: 0, dy: 0 });

  const quality = useRef(getQuality()).current;

  // ---------- HUD bridge ----------
  const pushHud = useCallback((patch) => {
    setHud((h) => ({ ...h, ...patch }));
  }, []);

  // ---------- main three.js setup ----------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const audio = new GameAudio();
    audioRef.current = audio;

    const world = parseMaze();
    const renderer = new THREE.WebGLRenderer({ antialias: quality.tier === "high", powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatioCap));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = quality.softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b0a06, quality.fogDensity);

    const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 60);
    camera.position.set(world.spawn.x, EYE, world.spawn.z);
    scene.add(camera);

    // dim-but-navigable ambient — you can find your way; the flashlight reveals
    // the entity and draws it (going dark is a real choice, not blindness)
    const ambient = new THREE.AmbientLight(0x6a6450, 0.35);
    scene.add(ambient);

    // flashlight: spotlight parented to the camera
    const flashlight = new THREE.SpotLight(0xf5e8b0, 9, 22, 0.55, 0.4, 1.2);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
    flashlight.shadow.camera.near = 0.2;
    flashlight.shadow.camera.far = 18;
    flashlight.shadow.bias = -0.0005;
    flashlight.position.set(0, 0, 0);
    const flashTarget = new THREE.Object3D();
    flashTarget.position.set(0, 0, -1);
    camera.add(flashlight);
    camera.add(flashTarget);
    flashlight.target = flashTarget;

    // volumetric-ish cone (cheap additive mesh that fakes light scatter)
    let cone = null;
    if (quality.volumetric) {
      const coneGeo = new THREE.ConeGeometry(2.6, 14, 24, 1, true);
      coneGeo.translate(0, -7, 0);
      coneGeo.rotateX(-Math.PI / 2);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0xf3e3a8,
        transparent: true,
        opacity: 0.05,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(0, 0, 0);
      camera.add(cone);
    }

    // ---------- materials ----------
    const wallTex = makeWallpaper(quality.textureScale);
    wallTex.map.repeat.set(1, WALL_H / CELL);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex.map,
      normalMap: wallTex.normalMap,
      roughness: 0.92,
      metalness: 0,
    });
    const carpetTex = makeCarpet(quality.textureScale);
    carpetTex.map.repeat.set(COLS, ROWS);
    const floorMat = new THREE.MeshStandardMaterial({ map: carpetTex.map, roughness: 1, metalness: 0 });
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0xb8a85a, roughness: 0.95 });

    // ---------- world geometry ----------
    const W = COLS * CELL;
    const D = ROWS * CELL;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(W / 2, 0, D / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(W / 2, WALL_H, D / 2);
    scene.add(ceil);

    // merge walls into instanced boxes for perf
    const wallGeo = new THREE.BoxGeometry(CELL, WALL_H, CELL);
    let wallCount = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) if (world.grid[r][c] === 1) wallCount++;
    const walls = new THREE.InstancedMesh(wallGeo, wallMat, wallCount);
    walls.castShadow = true;
    walls.receiveShadow = true;
    const dummy = new THREE.Object3D();
    let wi = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (world.grid[r][c] !== 1) continue;
        dummy.position.set(c * CELL + CELL / 2, WALL_H / 2, r * CELL + CELL / 2);
        dummy.updateMatrix();
        walls.setMatrixAt(wi++, dummy.matrix);
      }
    }
    walls.instanceMatrix.needsUpdate = true;
    scene.add(walls);

    // ceiling fluorescent tubes (emissive strips, sparse) + their glow
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0xfff4cf, emissive: 0xfff0c0, emissiveIntensity: 1.4 });
    for (let r = 2; r < ROWS; r += 5) {
      for (let c = 2; c < COLS; c += 6) {
        if (world.grid[r][c] === 1) continue;
        const tube = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.3), tubeMat);
        tube.position.set(c * CELL + CELL / 2, WALL_H - 0.06, r * CELL + CELL / 2);
        scene.add(tube);
      }
    }

    // ---------- interactive objects ----------
    const packetMeshes = [];
    world.packets.forEach((p) => {
      const g = new THREE.Group();
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.4, 0),
        new THREE.MeshStandardMaterial({ color: 0x4a90c4, emissive: 0x4a90c4, emissiveIntensity: 1.6 })
      );
      g.add(core);
      const light = new THREE.PointLight(0x4a90c4, 1.2, 4);
      g.add(light);
      g.position.set(p.x, 1.1, p.z);
      scene.add(g);
      packetMeshes.push({ rec: p, group: g, core });
    });

    const terminalMeshes = [];
    world.terminals.forEach((t) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.6, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x1a1a14, roughness: 0.6, metalness: 0.3 })
      );
      body.position.y = 0.8;
      body.castShadow = true;
      g.add(body);
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x123a2a, emissive: 0x39ff14, emissiveIntensity: 0.6 })
      );
      screen.position.set(0, 1.15, 0.26);
      g.add(screen);
      g.position.set(t.x, 0, t.z);
      scene.add(g);
      terminalMeshes.push({ rec: t, group: g, screen });
    });

    const batteryMeshes = [];
    world.batteries.forEach((b) => {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.5, 10),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.7 })
      );
      m.position.set(b.x, 0.9, b.z);
      scene.add(m);
      batteryMeshes.push({ rec: b, mesh: m, taken: false });
    });

    // exit door (locked until 4 uploaded)
    const exitMat = new THREE.MeshStandardMaterial({ color: 0x223322, emissive: 0x000000, emissiveIntensity: 0 });
    const exitDoor = new THREE.Mesh(new THREE.BoxGeometry(CELL * 0.9, WALL_H * 0.95, 0.3), exitMat);
    exitDoor.position.set(world.exit.x, WALL_H * 0.475, world.exit.z);
    scene.add(exitDoor);

    // ---------- entity ----------
    const entCanvas = document.createElement("canvas");
    entCanvas.width = ENTITY_W;
    entCanvas.height = ENTITY_H;
    const entCtx = entCanvas.getContext("2d");
    const entTex = new THREE.CanvasTexture(entCanvas);
    const entMat = new THREE.SpriteMaterial({ map: entTex, transparent: true, depthWrite: false });
    const entity = new THREE.Sprite(entMat);
    entity.scale.set(2.2, 4.4, 1);
    const eStart = world.entitySpawn || world.exit;
    entity.position.set(eStart.x, 2.2, eStart.z);
    entity.visible = false;
    scene.add(entity);

    // ---------- post-processing ----------
    const sizeObj = { w: mount.clientWidth, h: mount.clientHeight };
    const { composer, crt } = buildComposer(renderer, scene, camera, quality, sizeObj);

    // ---------- mutable game state ----------
    const G = {
      battery: BATTERY_MAX,
      lightOn: true,
      carried: null, // packet rec
      uploaded: 0,
      uploadHold: 0,
      lastTerminal: world.spawn, // respawn anchor
      // entity AI
      path: [],
      pathIndex: 0,
      repathTimer: 0,
      darkTimer: 0, // time since light went off
      lastKnownCell: null,
      walkPhase: 0,
      stepTimer: 0,
      proximity: 0,
      bobPhase: 0,
      time: 0,
      hudTimer: 0,
    };
    gameRef.current = G;

    // ---------- helpers ----------
    const cellFree = (x, z) => {
      const c = Math.floor(x / CELL);
      const r = Math.floor(z / CELL);
      if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return false;
      return world.grid[r][c] === 0;
    };
    const canStand = (x, z) =>
      cellFree(x + RADIUS, z) && cellFree(x - RADIUS, z) && cellFree(x, z + RADIUS) && cellFree(x, z - RADIUS);

    const respawn = () => {
      const a = G.lastTerminal;
      camera.position.set(a.x, EYE, a.z);
      G.battery = Math.max(G.battery, BATTERY_MAX * 0.5);
      G.lightOn = true;
      G.darkTimer = 0;
      entity.position.set(eStart.x, 2.2, eStart.z);
      entity.visible = false;
      G.path = [];
      setStatus("playing");
      statusRef.current = "playing";
    };

    const die = () => {
      if (statusRef.current !== "playing" || auditRef.current) return;
      statusRef.current = "dead";
      setStatus("dead");
      if (!mutedRef.current) audio.staticBurst(0.6);
      setTimeout(() => {
        if (statusRef.current === "dead") respawn();
      }, 1600);
    };

    const triggerUpload = (packet) => {
      G.uploaded += 1;
      G.carried = null;
      setRevealDoc(packet);
      revealRef.current = true;
      if (!mutedRef.current) audio.uploadChime();
      if (G.uploaded >= 4) {
        exitMat.emissive.setHex(0x39ff14);
        exitMat.emissiveIntensity = 0.8;
      }
      pushHud({ carried: null, uploaded: G.uploaded, uploadProgress: 0 });
    };

    // ---------- input ----------
    const onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "arrowup") keysRef.current.f = 1;
      else if (k === "s" || k === "arrowdown") keysRef.current.f = -1;
      else if (k === "a" || k === "arrowleft") keysRef.current.s = -1;
      else if (k === "d" || k === "arrowright") keysRef.current.s = 1;
      else if (k === "e") keysRef.current.e = true;
      else if (k === "f") {
        if (statusRef.current === "playing") {
          G.lightOn = !G.lightOn;
          if (!G.lightOn) G.darkTimer = 0;
        }
      } else if (k === "escape") {
        document.exitPointerLock?.();
      } else if (e.key === "`") {
        auditRef.current = !auditRef.current;
        setAudit(auditRef.current);
      }
    };
    const onKeyUp = (e) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "arrowup" || k === "s" || k === "arrowdown") keysRef.current.f = 0;
      else if (k === "a" || k === "arrowleft" || k === "d" || k === "arrowright") keysRef.current.s = 0;
      else if (k === "e") keysRef.current.e = false;
    };
    const onMouseMove = (e) => {
      if (document.pointerLockElement !== renderer.domElement) return;
      yawRef.current -= e.movementX * 0.0022;
      pitchRef.current = Math.max(-1.2, Math.min(1.2, pitchRef.current - e.movementY * 0.0022));
    };
    const onClick = () => {
      if (statusRef.current === "intro") {
        startGame();
        return;
      }
      if (!isMobile && statusRef.current === "playing" && !revealRef.current) {
        renderer.domElement.requestPointerLock?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("click", onClick);

    // mobile touch look + joystick
    const onTouchStart = (e) => {
      for (const t of e.changedTouches) {
        if (t.clientX < window.innerWidth / 2 && joyRef.current.id === null) {
          joyRef.current = { id: t.identifier, ox: t.clientX, oy: t.clientY, dx: 0, dy: 0 };
        } else if (touchLookRef.current.id === null) {
          touchLookRef.current = { id: t.identifier, x: t.clientX, y: t.clientY };
        }
      }
    };
    const onTouchMove = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyRef.current.id) {
          joyRef.current.dx = Math.max(-1, Math.min(1, (t.clientX - joyRef.current.ox) / 50));
          joyRef.current.dy = Math.max(-1, Math.min(1, (t.clientY - joyRef.current.oy) / 50));
        } else if (t.identifier === touchLookRef.current.id) {
          yawRef.current -= (t.clientX - touchLookRef.current.x) * 0.005;
          pitchRef.current = Math.max(-1.2, Math.min(1.2, pitchRef.current - (t.clientY - touchLookRef.current.y) * 0.005));
          touchLookRef.current.x = t.clientX;
          touchLookRef.current.y = t.clientY;
        }
      }
    };
    const onTouchEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyRef.current.id) joyRef.current = { id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
        if (t.identifier === touchLookRef.current.id) touchLookRef.current = { id: null, x: 0, y: 0 };
      }
    };
    if (isMobile) {
      renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: true });
      renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: true });
      renderer.domElement.addEventListener("touchend", onTouchEnd, { passive: true });
    }

    const startGame = () => {
      audio.start();
      audio.resume();
      setStatus("playing");
      statusRef.current = "playing";
      if (!isMobile) renderer.domElement.requestPointerLock?.();
    };
    gameRef.current.startGame = startGame;

    // expose interaction bridge for HUD buttons (mobile)
    gameRef.current.toggleLight = () => {
      if (statusRef.current === "playing") {
        G.lightOn = !G.lightOn;
        if (!G.lightOn) G.darkTimer = 0;
      }
    };
    gameRef.current.setHoldE = (v) => { keysRef.current.e = v; };

    // ---------- audit minimap ----------
    const drawMinimap = () => {
      const cv = minimapRef.current;
      if (!cv) return;
      const ctx = cv.getContext("2d");
      const s = 6; // px per cell
      if (cv.width !== COLS * s) { cv.width = COLS * s; cv.height = ROWS * s; }
      ctx.fillStyle = "#0d0d0c";
      ctx.fillRect(0, 0, cv.width, cv.height);
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          ctx.fillStyle = world.grid[r][c] === 1 ? "#2a2718" : "#5a5230";
          ctx.fillRect(c * s, r * s, s - 1, s - 1);
        }
      const dot = (x, z, col, rad = 2) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc((x / CELL) * s, (z / CELL) * s, rad, 0, Math.PI * 2);
        ctx.fill();
      };
      world.terminals.forEach((t) => dot(t.x, t.z, "#39ff14"));
      batteryMeshes.forEach((b) => { if (!b.taken) dot(b.rec.x, b.rec.z, "#f59e0b"); });
      packetMeshes.forEach((p) => { if (!p.rec.collected && !p.rec.uploaded) dot(p.rec.x, p.rec.z, "#4a90c4"); });
      dot(world.exit.x, world.exit.z, G.uploaded >= 4 ? "#ffffff" : "#445544", 3);
      dot(entity.position.x, entity.position.z, "#ef4444", 3);
      const pxs = (camera.position.x / CELL) * s;
      const pzs = (camera.position.z / CELL) * s;
      dot(camera.position.x, camera.position.z, "#ffffff", 2.5);
      ctx.strokeStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(pxs, pzs);
      ctx.lineTo(pxs - Math.sin(yawRef.current) * 9, pzs - Math.cos(yawRef.current) * 9);
      ctx.stroke();
    };

    // ---------- render loop ----------
    const clock = new THREE.Clock();
    let raf;
    const cellOf = (v) => Math.floor(v / CELL);

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      G.time += dt;
      crt.uniforms.uTime.value = G.time;
      G.fps = G.fps ? G.fps * 0.9 + (1 / Math.max(dt, 0.001)) * 0.1 : 1 / dt;

      // audit mode: flood light + drop fog so the whole layout is visible
      ambient.intensity = auditRef.current ? 1.6 : 0.35;
      scene.fog.density = auditRef.current ? 0.0 : quality.fogDensity;

      const playing = statusRef.current === "playing" && !revealRef.current;

      // camera orientation
      camera.rotation.order = "YXZ";
      camera.rotation.y = yawRef.current;
      camera.rotation.x = pitchRef.current;

      // ---- movement ----
      let moving = false;
      if (playing) {
        let mf = keysRef.current.f;
        let ms = keysRef.current.s;
        if (isMobile) {
          mf = -joyRef.current.dy;
          ms = joyRef.current.dx;
        }
        const len = Math.hypot(mf, ms);
        if (len > 0.05) {
          moving = true;
          const nf = mf / len;
          const ns = ms / len;
          const sinY = Math.sin(yawRef.current);
          const cosY = Math.cos(yawRef.current);
          // forward is -z in view space
          const dx = (-sinY * nf + cosY * ns) * PLAYER_SPEED * dt;
          const dz = (-cosY * nf - sinY * ns) * PLAYER_SPEED * dt;
          const nx = camera.position.x + dx;
          const nz = camera.position.z + dz;
          if (canStand(nx, camera.position.z)) camera.position.x = nx;
          if (canStand(camera.position.x, nz)) camera.position.z = nz;
        }
      }

      // head bob
      if (moving) {
        G.bobPhase += dt * 9;
        G.stepTimer += dt;
        if (G.stepTimer > 0.42) {
          G.stepTimer = 0;
          if (!mutedRef.current) audio.footstep(0, 0.08);
        }
      } else {
        G.bobPhase += dt * 1.5;
      }
      camera.position.y = EYE + Math.sin(G.bobPhase) * (moving ? 0.06 : 0.012);

      // ---- battery + flashlight ----
      if (playing && G.lightOn) {
        G.battery = Math.max(0, G.battery - dt);
        if (G.battery <= 0) {
          G.lightOn = false;
          die();
        }
      }
      const batFrac = G.battery / BATTERY_MAX;
      const targetIntensity = G.lightOn ? 9 * (0.5 + 0.5 * Math.min(1, batFrac * 2)) : 0;
      flashlight.intensity += (targetIntensity - flashlight.intensity) * Math.min(1, dt * 12);
      if (cone) cone.material.opacity = G.lightOn ? 0.05 * Math.min(1, batFrac * 2) : 0;
      const distress = G.lightOn && batFrac < 0.05 ? 1 - batFrac / 0.05 : 0;
      if (!mutedRef.current) audio.setDistress(distress);
      crt.uniforms.uIntensity.value = quality.grain * (1 + distress * 1.5 + G.proximity * 0.8);

      // ---- pickups ----
      const px = camera.position.x;
      const pz = camera.position.z;
      let prompt = null;
      if (playing) {
        // packets
        packetMeshes.forEach((pm) => {
          if (pm.rec.uploaded || pm.rec.collected) return;
          pm.group.rotation.y += dt * 1.5;
          pm.group.position.y = 1.1 + Math.sin(G.time * 2 + pm.rec.col) * 0.08;
          if (!G.carried && Math.hypot(px - pm.rec.x, pz - pm.rec.z) < 1.0) {
            pm.rec.collected = true;
            G.carried = pm.rec;
            pm.group.visible = false;
            if (!mutedRef.current) audio.pickup();
            pushHud({ carried: pm.rec.label });
          }
        });
        // batteries
        batteryMeshes.forEach((bm) => {
          if (bm.taken) return;
          bm.mesh.rotation.y += dt * 2;
          if (Math.hypot(px - bm.rec.x, pz - bm.rec.z) < 1.0) {
            bm.taken = true;
            bm.mesh.visible = false;
            G.battery = Math.min(BATTERY_MAX, G.battery + BATTERY_PER_PICKUP);
            if (!mutedRef.current) audio.pickup();
          }
        });
        // terminals — upload while carrying + holding E
        let nearTerminal = null;
        terminalMeshes.forEach((tm) => {
          const d = Math.hypot(px - tm.rec.x, pz - tm.rec.z);
          if (d < 1.6) nearTerminal = tm;
        });
        if (nearTerminal) {
          G.lastTerminal = nearTerminal.rec;
          if (G.carried) {
            prompt = `HOLD E TO UPLOAD ${G.carried.label}`;
            if (keysRef.current.e) {
              G.uploadHold += dt;
              if (G.uploadHold >= UPLOAD_SECONDS) {
                const packet = G.carried;
                G.uploadHold = 0;
                triggerUpload(packet);
              }
            } else {
              G.uploadHold = Math.max(0, G.uploadHold - dt * 2);
            }
          } else {
            prompt = "TERMINAL ONLINE — FIND A DATA PACKET";
            G.uploadHold = 0;
          }
        } else {
          G.uploadHold = Math.max(0, G.uploadHold - dt * 2);
          if (G.carried) prompt = `CARRYING ${G.carried.label} — REACH A TERMINAL`;
        }

        // exit
        if (G.uploaded >= 4 && Math.hypot(px - world.exit.x, pz - world.exit.z) < 1.6) {
          statusRef.current = "won";
          setStatus("won");
          if (!mutedRef.current) audio.uploadChime();
          setTimeout(() => { onWin?.(); }, 3200);
        }
      }

      // ---- entity AI ----
      if (playing) {
        const uploading = G.uploadHold > 0;
        // attraction: light + active upload
        const lit = G.lightOn ? 1 : 0;
        if (!G.lightOn) {
          G.darkTimer += dt;
        } else {
          G.darkTimer = 0;
        }
        const aware = lit || G.darkTimer < DARK_GRACE || uploading;

        G.repathTimer -= dt;
        const pCol = cellOf(px);
        const pRow = cellOf(pz);
        const eCol = cellOf(entity.position.x);
        const eRow = cellOf(entity.position.z);

        if (aware && G.repathTimer <= 0) {
          G.repathTimer = 0.5;
          const targetCell = [pCol, pRow];
          G.lastKnownCell = targetCell;
          const path = findPath(eCol, eRow, targetCell[0], targetCell[1], world.grid);
          if (path && path.length > 1) {
            G.path = path;
            G.pathIndex = 1;
          }
        }

        // move along path
        const speed = ENTITY_BASE_SPEED * (uploading ? 1.5 : 1) * (1 + (G.uploaded * 0.08));
        if (G.path && G.pathIndex < G.path.length) {
          const [tc, tr] = G.path[G.pathIndex];
          const tx = tc * CELL + CELL / 2;
          const tz = tr * CELL + CELL / 2;
          const ddx = tx - entity.position.x;
          const ddz = tz - entity.position.z;
          const dd = Math.hypot(ddx, ddz);
          if (dd < 0.2) {
            G.pathIndex++;
          } else {
            entity.position.x += (ddx / dd) * speed * dt;
            entity.position.z += (ddz / dd) * speed * dt;
            G.walkPhase += dt * 6;
          }
        }
        entity.position.y = 2.2 + Math.sin(G.time * 1.5) * 0.05;

        // proximity for audio/visual dread
        const edist = Math.hypot(px - entity.position.x, pz - entity.position.z);
        G.proximity = Math.max(0, Math.min(1, 1 - edist / 12));
        if (!mutedRef.current) {
          audio.setEntityProximity(G.proximity);
          // entity footsteps, spatialized
          G.entStep = (G.entStep || 0) + dt;
          const stepInterval = Math.max(0.25, 0.7 - G.proximity * 0.4);
          if (G.entStep > stepInterval && edist < 14) {
            G.entStep = 0;
            // pan by relative angle
            const ang = Math.atan2(entity.position.x - px, -(entity.position.z - pz)) - yawRef.current;
            const pan = Math.max(-1, Math.min(1, Math.sin(ang)));
            audio.footstep(pan, 0.05 + G.proximity * 0.18);
          }
        }

        // visible only when caught in the flashlight beam (lit + roughly in view + LOS)
        const toEnt = new THREE.Vector3(entity.position.x - px, 0, entity.position.z - pz).normalize();
        const fwd = new THREE.Vector3(-Math.sin(yawRef.current), 0, -Math.cos(yawRef.current));
        const facing = toEnt.dot(fwd);
        const los = hasLineOfSight(px, pz, entity.position.x, entity.position.z, world.grid);
        entity.visible = G.lightOn && batFrac > 0 && facing > 0.55 && edist < 15 && los;
        if (entity.visible || G.proximity > 0.3) {
          drawEntity(entCtx, G.walkPhase, 1 + G.proximity);
          entTex.needsUpdate = true;
        }

        // catch
        if (edist < ENTITY_CATCH_DIST) die();
      } else {
        entity.visible = false;
      }

      // ---- HUD throttle ----
      G.hudTimer += dt;
      if (G.hudTimer > 0.1) {
        G.hudTimer = 0;
        pushHud({
          battery: batFrac,
          lightOn: G.lightOn,
          uploaded: G.uploaded,
          prompt,
          uploadProgress: G.uploadHold / UPLOAD_SECONDS,
          proximity: G.proximity,
          distress,
          audit: auditRef.current
            ? {
                fps: Math.round(G.fps),
                pcell: `${cellOf(camera.position.x)},${cellOf(camera.position.z)}`,
                ecell: `${cellOf(entity.position.x)},${cellOf(entity.position.z)}`,
                batt: Math.ceil(G.battery),
                aware: G.darkTimer < DARK_GRACE || G.lightOn,
              }
            : null,
        });
        if (auditRef.current) drawMinimap();
      }

      composer.render();
    };
    animate();

    // ---------- resize ----------
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      crt.uniforms.uResolution.value.set(w, h);
    };
    window.addEventListener("resize", onResize);

    // ---------- cleanup ----------
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("click", onClick);
      if (isMobile) {
        renderer.domElement.removeEventListener("touchstart", onTouchStart);
        renderer.domElement.removeEventListener("touchmove", onTouchMove);
        renderer.domElement.removeEventListener("touchend", onTouchEnd);
      }
      document.exitPointerLock?.();
      audio.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => {
            Object.values(m).forEach((v) => v && v.isTexture && v.dispose());
            m.dispose();
          });
        }
      });
      composer.dispose?.();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- mute toggle ----------
  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    audioRef.current?.setMuted(m);
  };

  // ---------- reveal dismiss ----------
  const dismissReveal = () => {
    setRevealDoc(null);
    revealRef.current = false;
    if (!isMobile && statusRef.current === "playing") {
      mountRef.current?.querySelector("canvas")?.requestPointerLock?.();
    }
  };

  const batPct = Math.round(hud.battery * 100);
  const batColor = hud.battery > 0.4 ? "#f59e0b" : hud.battery > 0.2 ? "#f97316" : "#ef4444";

  return (
    <div className="fixed inset-0 z-50 bg-black select-none font-mono text-[#f5e8b0] overflow-hidden">
      <div ref={mountRef} className="absolute inset-0" />

      {/* low-battery red flicker */}
      {hud.battery < 0.2 && status === "playing" && (
        <div className="absolute inset-0 pointer-events-none animate-pulse" style={{ boxShadow: "inset 0 0 200px rgba(239,68,68,0.5)" }} />
      )}
      {/* proximity vignette — gentle base, darkens only as the entity nears */}
      <div className="absolute inset-0 pointer-events-none transition-opacity" style={{ boxShadow: `inset 0 0 ${100 + hud.proximity * 200}px rgba(0,0,0,${0.22 + hud.proximity * 0.5})` }} />

      {/* INTRO terminal */}
      {status === "intro" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-black/95 px-8 text-center">
          <pre className="text-[10px] sm:text-xs text-[#39ff14] leading-relaxed">{`> EMERGENCY UPLOAD PROTOCOL INITIATED
> BATTERY: 100%
> LOCATE UPLOAD TERMINALS: 4 PACKETS REMAINING
> WARNING: ENTITY DETECTED ON FLOOR
> DARKNESS IS SAFETY. LIGHT IS DANGER.`}</pre>
          <button onClick={() => gameRef.current?.startGame?.()} className="px-6 py-3 border border-[#39ff14]/60 text-[#39ff14] hover:bg-[#39ff14]/10 tracking-[0.3em] uppercase text-sm">
            [ {isMobile ? "TAP" : "CLICK"} TO BEGIN ]
          </button>
          {!isMobile && <div className="text-[8px] tracking-[0.3em] text-[#39ff14]/30 uppercase">press ` for audit mode</div>}
        </div>
      )}

      {/* HUD */}
      {status === "playing" && (
        <>
          {/* battery strip */}
          <div className="absolute top-5 left-5 z-10 w-44">
            <div className="text-[9px] tracking-[0.3em] mb-1 uppercase opacity-80">Battery {batPct}%</div>
            <div className="h-3 w-full border border-[#f5e8b0]/30 bg-black/60 p-[2px]">
              <div className="h-full transition-all" style={{ width: `${batPct}%`, background: batColor }} />
            </div>
            <button onClick={() => gameRef.current?.toggleLight?.()} className="mt-2 text-[9px] tracking-widest uppercase opacity-70 hover:opacity-100">
              [F] FLASHLIGHT: {hud.lightOn ? "ON" : "OFF"}
            </button>
          </div>

          {/* objectives */}
          <div className="absolute top-5 right-5 z-10 text-right text-[10px] tracking-widest uppercase">
            <div>UPLOADED {hud.uploaded}/4</div>
            {hud.carried && <div className="text-[#4a90c4] mt-1">CARRYING: {hud.carried}</div>}
            {hud.uploaded >= 4 && <div className="text-[#39ff14] mt-1 animate-pulse">EXIT UNLOCKED</div>}
          </div>

          {/* prompt + upload ring */}
          {hud.prompt && (
            <div className="absolute left-1/2 bottom-24 -translate-x-1/2 z-10 text-center">
              <div className="text-xs tracking-[0.25em] uppercase mb-2">{hud.prompt}</div>
              {hud.uploadProgress > 0 && (
                <div className="mx-auto h-1.5 w-48 bg-black/60 border border-[#39ff14]/40">
                  <div className="h-full bg-[#39ff14] transition-all" style={{ width: `${Math.min(100, hud.uploadProgress * 100)}%` }} />
                </div>
              )}
            </div>
          )}

          {/* crosshair */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-1 h-1 rounded-full bg-[#f5e8b0]/50" />

          {/* mobile controls */}
          {isMobile && (
            <>
              <button
                onTouchStart={() => gameRef.current?.setHoldE?.(true)}
                onTouchEnd={() => gameRef.current?.setHoldE?.(false)}
                className="absolute bottom-8 right-8 z-20 w-20 h-20 rounded-full border-2 border-[#39ff14]/50 bg-black/50 text-[#39ff14] text-xs tracking-widest"
              >
                HOLD E
              </button>
              <button
                onClick={() => gameRef.current?.toggleLight?.()}
                className="absolute bottom-32 right-8 z-20 w-16 h-16 rounded-full border-2 border-[#f5e8b0]/40 bg-black/50 text-[10px]"
              >
                LIGHT
              </button>
            </>
          )}
        </>
      )}

      {/* AUDIT / debug overlay — minimap + live stats (` to toggle, ?audit to start) */}
      {audit && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 bg-black/70 border border-[#39ff14]/40 p-2 font-mono text-[9px] text-[#39ff14]">
          <div className="tracking-[0.3em] uppercase">● AUDIT — invulnerable</div>
          <canvas ref={minimapRef} className="border border-[#39ff14]/30" style={{ width: 126, imageRendering: "pixelated" }} />
          {hud.audit && (
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 max-w-[160px] text-[#cfe8c0]">
              <span>fps {hud.audit.fps}</span>
              <span>batt {hud.audit.batt}s</span>
              <span>you {hud.audit.pcell}</span>
              <span>ent {hud.audit.ecell}</span>
              <span>{hud.audit.aware ? "HUNTING" : "lost you"}</span>
              <span>up {hud.uploaded}/4</span>
            </div>
          )}
          <div className="text-[#39ff14]/50">legend: ●you ●entity ●packet ●terminal ●battery</div>
        </div>
      )}

      {/* corrupted found-document reveal */}
      {revealDoc && <RevealDoc doc={revealDoc} onClose={dismissReveal} />}

      {/* death */}
      {status === "dead" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="text-2xl tracking-[0.3em] text-red-500 animate-pulse mb-3">SIGNAL LOST</div>
            <div className="text-[10px] tracking-widest opacity-60">RE-ESTABLISHING AT LAST TERMINAL…</div>
          </div>
        </div>
      )}

      {/* win */}
      {status === "won" && <WinScreen />}

      {/* top-corner controls */}
      <div className="absolute bottom-4 left-4 z-30 flex gap-3 text-[9px] tracking-widest uppercase opacity-60">
        <button onClick={toggleMute} className="hover:opacity-100">[ {muted ? "UNMUTE" : "MUTE"} ]</button>
        <button onClick={() => onQuit?.()} className="hover:opacity-100">[ ABANDON ]</button>
      </div>
    </div>
  );
};

// ----- corrupted government-document reveal screen -----
const RevealDoc = ({ doc, onClose }) => {
  const [shown, setShown] = useState("");
  const full = doc.lines.join("\n");
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setShown(full.slice(0, i));
      if (i >= full.length) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [full]);
  return (
    <div className="absolute inset-0 z-40 flex items-end sm:items-center justify-center bg-black/80 p-6" onClick={onClose}>
      <div className="w-full max-w-lg border border-[#39ff14]/40 bg-[#05080a]/95 p-6 relative overflow-hidden animate-[slideUp_0.4s_ease-out]">
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(57,255,20,0.06) 3px)" }} />
        <div className="text-[9px] tracking-[0.3em] text-[#39ff14]/70 uppercase mb-2">⚠ RECOVERED FRAGMENT</div>
        <div className="text-sm tracking-[0.2em] text-[#39ff14] uppercase mb-4">{doc.docTitle}</div>
        <pre className="text-xs text-[#cfe8c0] whitespace-pre-wrap leading-relaxed min-h-[7rem]">{shown}<span className="animate-pulse">█</span></pre>
        <div className="mt-5 text-[10px] tracking-widest text-[#39ff14]/60 uppercase">[ click to continue ]</div>
      </div>
    </div>
  );
};

const WinScreen = () => {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPct((p) => Math.min(100, p + Math.floor(Math.random() * 12) + 4)), 120);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black gap-6 px-8">
      <div className="text-xl sm:text-3xl tracking-[0.35em] text-[#39ff14] uppercase">UPLOAD COMPLETE</div>
      <div className="w-72 max-w-full">
        <div className="text-[10px] tracking-widest mb-2 opacity-70">TRANSMITTING… {pct}%</div>
        <div className="h-2 w-full bg-black border border-[#39ff14]/40">
          <div className="h-full bg-[#39ff14] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="text-[10px] tracking-[0.3em] opacity-50 uppercase animate-pulse">emerging…</div>
    </div>
  );
};

export default BackroomsGame;

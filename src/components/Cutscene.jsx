import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";

import { CELL, WALL_H, EYE } from "./game/maze";
import { GameAudio } from "./game/audio";
import { makeWallpaper, makeCarpet } from "./game/render";
import { getQuality } from "./game/quality";

/**
 * BACK2ROOM — ~45s opening cold-open (see BACK2ROOM_Cutscene_Design.md).
 *
 * Black → first-person walk → floor glitch → no-clip fall → impact flash →
 * wake on floor → stand up → find flashlight → flicker-on → brief explore →
 * VHS glitch. Ends by handing off to gameplay (onComplete), NOT a menu.
 * Skippable after the impact (ESC / triple-tap).
 */
const Cutscene = ({ onComplete }) => {
  const mountRef = useRef(null);
  const flashRef = useRef(null);
  const glitchRef = useRef(null);
  const blackoutRef = useRef(null);
  const canSkipRef = useRef(false);
  const [canSkip, setCanSkip] = useState(false);
  const finishedRef = useRef(false);
  const quality = useRef(getQuality()).current;
  useEffect(() => { canSkipRef.current = canSkip; }, [canSkip]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const audio = new GameAudio();
    const renderer = new THREE.WebGLRenderer({ antialias: quality.tier === "high" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatioCap));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b0a06, 0.04);
    const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 60);

    scene.add(new THREE.AmbientLight(0x6a6450, 0.3));

    // straight corridor (doc §5.5 — simple, not the maze)
    const len = 80;
    const wall = makeWallpaper(quality.textureScale);
    wall.map.repeat.set(len / CELL, WALL_H / CELL);
    wall.normalMap.repeat.set(len / CELL, WALL_H / CELL);
    const wallMat = new THREE.MeshStandardMaterial({ map: wall.map, normalMap: wall.normalMap, roughness: 0.92 });
    const carpet = makeCarpet(quality.textureScale);
    carpet.map.repeat.set(4, len / CELL);
    const floorMat = new THREE.MeshStandardMaterial({ map: carpet.map, roughness: 1 });
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0xb8a85a, roughness: 0.95 });

    const halfW = CELL * 1.5;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, len), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -len / 2 + 10;
    scene.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, len), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, WALL_H, -len / 2 + 10);
    scene.add(ceil);
    [-halfW, halfW].forEach((x) => {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(len, WALL_H), wallMat);
      w.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      w.position.set(x, WALL_H / 2, -len / 2 + 10);
      scene.add(w);
    });

    // flickering ceiling lights
    const lights = [];
    for (let i = 0; i < 8; i++) {
      const pl = new THREE.PointLight(0xc8b870, 1.5, 10);
      pl.position.set(0, WALL_H - 0.2, 6 - i * 8);
      scene.add(pl);
      const tube = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.08, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xfff4cf, emissive: 0xfff0c0, emissiveIntensity: 1.2 })
      );
      tube.position.copy(pl.position);
      scene.add(tube);
      lights.push(pl);
    }

    // the flashlight on the floor (found in scene 07)
    const torch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.5, 12),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.6 })
    );
    torch.rotation.z = Math.PI / 2;
    torch.position.set(0, 0.08, -0.8);
    scene.add(torch);
    const torchGlow = new THREE.PointLight(0xfff3c0, 0.15, 1.5);
    torchGlow.position.set(0, 0.15, -0.8);
    scene.add(torchGlow);

    // POV spotlight (off until scene 08)
    const spot = new THREE.SpotLight(0xf5e8b0, 0, 8, 0.35, 0.3, 1.2);
    const spotTarget = new THREE.Object3D();
    spotTarget.position.set(0, 0, -1);
    camera.add(spot);
    camera.add(spotTarget);
    spot.target = spotTarget;
    scene.add(camera);

    // camera proxy state driven by the GSAP timeline
    const cam = { z: 8, y: EYE, rotX: 0, rotZ: 0, bob: 0, walkBob: 0, lookY: 0 };

    let raf;
    const clock = new THREE.Clock();
    const render = () => {
      raf = requestAnimationFrame(render);
      const dt = clock.getDelta();
      cam.bob += dt;
      // random light flicker
      lights.forEach((pl, i) => {
        if (Math.random() > 0.95) pl.intensity = 0.6 + Math.random() * 0.9;
        else pl.intensity += (1.5 - pl.intensity) * 0.1;
        if (i === 3) pl.intensity *= 0.4 + Math.random() * 0.6;
      });
      camera.position.set(
        Math.sin(cam.bob * 1.8) * cam.walkBob * 0.5,
        cam.y + Math.sin(cam.bob * 3.6) * cam.walkBob,
        cam.z
      );
      camera.rotation.order = "YXZ";
      camera.rotation.x = cam.rotX;
      camera.rotation.z = cam.rotZ;
      camera.rotation.y = cam.lookY;
      renderer.render(scene, camera);
    };
    render();

    // ---- audio: ambient hum, ramps with the scenes ----
    audio.start();
    audio.resume();
    audio.setMuted(false);

    // ---- DOM helpers ----
    const flash = (dur) => {
      const el = flashRef.current;
      if (!el) return;
      el.style.opacity = "0";
      el.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: dur, easing: "ease-out" });
    };

    // ---- the timeline ----
    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      gsap.to(glitchRef.current, {
        opacity: 1,
        duration: 0.05,
        onComplete: () => {
          setTimeout(() => onComplete?.(), 250);
        },
      });
    };

    const tl = gsap.timeline({ onComplete: finish });

    // SCENE 01 — blackout (handled by overlay starting opaque), 0–3s silence
    tl.to({}, { duration: 3 });
    // SCENE 02 — walk forward (fade overlay out), bob on
    tl.add(() => {
      gsap.to(blackoutRef.current, { opacity: 0, duration: 1.2 });
      cam.walkBob = 0.04;
      audio.footstep(0, 0.1);
    });
    tl.to(cam, { z: 2, duration: 5, ease: "none", onUpdate: () => {
      if (Math.random() > 0.85) audio.footstep((Math.random() - 0.5) * 0.6, 0.08);
    } });
    // allow skipping after the hook
    tl.add(() => setCanSkip(true));
    // SCENE 03 — no-clip fall
    tl.add(() => { audio.staticBurst(0.3); cam.walkBob = 0; });
    tl.to(cam, { y: -8, duration: 0.4, ease: "power2.in", onUpdate: () => {
      cam.rotZ = (Math.random() - 0.5) * 0.3;
      cam.z += (Math.random() - 0.5) * 0.1;
    } });
    // SCENE 04 — impact flash
    tl.add(() => { flash(450); audio.staticBurst(0.15); });
    tl.to(blackoutRef.current, { opacity: 1, duration: 0.05 });
    tl.to({}, { duration: 2.4 }); // ringing/black
    // SCENE 05 — on the floor, looking up
    tl.add(() => {
      cam.z = 0; cam.y = 0.08; cam.rotX = 0.26; cam.rotZ = 0.08;
      gsap.to(blackoutRef.current, { opacity: 0, duration: 1.5 });
    });
    tl.to({}, { duration: 4 });
    // SCENE 06 — stand up
    tl.to(cam, { y: EYE, rotX: 0, rotZ: 0, duration: 1.9, ease: "power3.out" });
    // SCENE 07 — look down at the flashlight
    tl.to(cam, { rotX: -0.32, duration: 0.8, ease: "power2.inOut" });
    tl.to({}, { duration: 1.4 });
    // SCENE 08 — pick up + flashlight flickers on
    tl.add(() => {
      torch.visible = false;
      torchGlow.visible = false;
      // fluorescent-style flicker before stable
      const seq = [0, 4, 0, 4, 0, 4];
      seq.forEach((v, i) => gsap.to(spot, { intensity: v, duration: 0.06, delay: i * 0.06 }));
      audio.uploadChime();
    });
    tl.to(cam, { rotX: 0, duration: 0.6, ease: "power2.out" });
    // SCENE 09 — brief explore
    tl.add(() => { cam.walkBob = 0.03; });
    tl.to(cam, { z: -4, lookY: 0.0, duration: 6.5, ease: "none", onUpdate: () => {
      cam.lookY = Math.sin(cam.bob * 0.6) * 0.08;
      if (Math.random() > 0.9) audio.footstep((Math.random() - 0.5) * 0.5, 0.07);
    } });
    // SCENE 10 — glitch out
    tl.add(() => { cam.walkBob = 0; audio.staticBurst(0.6); });
    tl.to(glitchRef.current, { opacity: 1, duration: 0.1 });
    tl.to({}, { duration: 0.3 });

    // ---- skip handling ----
    const doSkip = () => {
      if (!canSkipRef.current || finishedRef.current) return;
      tl.kill();
      gsap.to(blackoutRef.current, { opacity: 1, duration: 0.3, onComplete: () => onComplete?.() });
      finishedRef.current = true;
    };
    const onKey = (e) => { if (e.key === "Escape") doSkip(); };
    let tapTimes = [];
    const onTap = () => {
      const now = performance.now();
      tapTimes = tapTimes.filter((t) => now - t < 600);
      tapTimes.push(now);
      if (tapTimes.length >= 3) doSkip();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTap);

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      tl.kill();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTap);
      window.removeEventListener("resize", onResize);
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
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      <div ref={mountRef} className="absolute inset-0" />
      {/* blackout overlay (starts opaque) */}
      <div ref={blackoutRef} className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: 1 }} />
      {/* white impact flash */}
      <div ref={flashRef} className="absolute inset-0 bg-white pointer-events-none" style={{ opacity: 0 }} />
      {/* VHS glitch-out */}
      <div ref={glitchRef} className="absolute inset-0 pointer-events-none" style={{ opacity: 0, background: "repeating-linear-gradient(0deg, rgba(255,0,0,0.1), rgba(0,255,255,0.1) 2px, transparent 4px)", mixBlendMode: "screen" }} />
      {canSkip && (
        <div className="absolute bottom-6 right-6 z-10 text-[10px] tracking-[0.3em] uppercase text-white/40 font-mono">
          {("ontouchstart" in window) ? "triple-tap to skip" : "esc to skip"}
        </div>
      )}
    </div>
  );
};

export default Cutscene;

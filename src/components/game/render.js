// Shared rendering helpers for BACK2ROOM: procedural PBR backrooms textures, the
// CRT/liminal post shader, and a quality-aware EffectComposer builder.

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

// --- CRT / liminal post-processing: scanlines, chromatic aberration, vignette,
//     animated film grain and a subtle barrel warp. One fullscreen pass. ---
export const CRTShader = {
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
      vec2 cc = uv - 0.5;
      float dist = dot(cc, cc);
      uv = uv + cc * dist * 0.10;
      float ca = (0.0015 + dist * 0.006) * uIntensity;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + vec2(ca, 0.0)).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - vec2(ca, 0.0)).b;
      float scan = sin(uv.y * uResolution.y * 1.4) * 0.02 * uIntensity;
      col -= scan;
      float roll = sin(uv.y * 3.0 + uTime * 0.6);
      col += smoothstep(0.985, 1.0, roll) * 0.04;
      float g = rand(uv + fract(uTime)) - 0.5;
      col += g * 0.05 * uIntensity;
      float vig = smoothstep(1.1, 0.15, dist * 1.6);
      col *= mix(1.0, vig, 0.28);
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) col = vec3(0.0);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

// Value-noise canvas helper used to bake albedo / normal / roughness maps.
const noiseCanvas = (size, draw) => {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  draw(ctx, size);
  return c;
};

// Classic backrooms mono-yellow wallpaper with faint vertical stripes + grime.
export const makeWallpaper = (scale = 1) => {
  const size = Math.max(128, Math.floor(512 * scale));
  const albedo = noiseCanvas(size, (ctx, s) => {
    ctx.fillStyle = "#c4ad5e";
    ctx.fillRect(0, 0, s, s);
    // vertical stripes
    for (let x = 0; x < s; x += Math.floor(s / 16)) {
      ctx.fillStyle = "rgba(150,128,60,0.18)";
      ctx.fillRect(x, 0, 2, s);
    }
    // grime / stains
    for (let i = 0; i < s * 1.5; i++) {
      const v = Math.random();
      ctx.fillStyle = `rgba(90,75,30,${0.04 + v * 0.06})`;
      const r = Math.random() * 3;
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  const tex = new THREE.CanvasTexture(albedo);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  // crude normal map from a second noise pass for surface relief
  const normal = noiseCanvas(size, (ctx, s) => {
    ctx.fillStyle = "#8080ff";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < s * 2; i++) {
      const a = Math.random() * 0.15;
      ctx.fillStyle = `rgba(${128 + (Math.random() - 0.5) * 60},${128 + (Math.random() - 0.5) * 60},255,${a})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
  });
  const normalTex = new THREE.CanvasTexture(normal);
  normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;
  return { map: tex, normalMap: normalTex };
};

// Dark, rough office carpet.
export const makeCarpet = (scale = 1) => {
  const size = Math.max(128, Math.floor(512 * scale));
  const albedo = noiseCanvas(size, (ctx, s) => {
    ctx.fillStyle = "#2a2722";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < s * 6; i++) {
      const v = Math.random();
      ctx.fillStyle = `rgba(${40 + v * 30},${38 + v * 26},${30 + v * 20},0.5)`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 1.5, 1.5);
    }
  });
  const tex = new THREE.CanvasTexture(albedo);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return { map: tex };
};

// Build a quality-aware composer. `quality` is from game/quality.js.
export const buildComposer = (renderer, scene, camera, quality, size) => {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  if (quality.ssao) {
    const ssao = new SSAOPass(scene, camera, size.w, size.h);
    ssao.kernelRadius = 8;
    ssao.minDistance = 0.002;
    ssao.maxDistance = 0.08;
    composer.addPass(ssao);
  }

  if (quality.bloom) {
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(size.w, size.h),
      quality.bloomStrength,
      0.6,
      0.85
    );
    composer.addPass(bloom);
  }

  const crt = new ShaderPass(CRTShader);
  crt.uniforms.uResolution.value = new THREE.Vector2(size.w, size.h);
  crt.uniforms.uIntensity.value = quality.grain;
  composer.addPass(crt);

  composer.addPass(new OutputPass());

  return { composer, crt };
};

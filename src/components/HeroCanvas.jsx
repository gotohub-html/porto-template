import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Molten Liquid / Interactive Fluid Ink Background.
 * Renders a full-screen WebGL Shader displaying organic domain-warped noise
 * blending Obsidian void, warm charcoal, burnt rust, and amber colors.
 * Mouse coordinates create elastic gravitational ripples in the fluid flow.
 */
const HeroCanvas = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isMobile = window.innerWidth < 768 || isTouchDevice;

    const currentMount = mountRef.current;
    if (!currentMount) return;

    let width = currentMount.clientWidth;
    let height = currentMount.clientHeight;

    const scene = new THREE.Scene();
    
    // Orthographic camera is perfect for 2D/Full-screen shader rendering
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    currentMount.appendChild(renderer.domElement);

    // ---- Custom Shader Material ----
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform vec2 uMouse;
      uniform vec2 uResolution;
      varying vec2 vUv;

      // Classic Perlin 2D Noise by Stefan Gustavson
      vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
      vec2 fade(vec2 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

      float cnoise(vec2 P){
        vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
        vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
        Pi = mod(Pi, 289.0);
        vec4 ix = Pi.xzxz;
        vec4 iy = Pi.yyww;
        vec4 fx = Pf.xzxz;
        vec4 fy = Pf.yyww;
        vec4 i = permute(permute(ix) + iy);
        vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0;
        vec4 gy = abs(gx) - 0.5;
        vec4 tx = floor(gx + 0.5);
        gx = gx - tx;
        vec2 g00 = vec2(gx.x,gy.x);
        vec2 g10 = vec2(gx.y,gy.y);
        vec2 g01 = vec2(gx.z,gy.z);
        vec2 g11 = vec2(gx.w,gy.w);
        vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g10, g10), dot(g01, g01), dot(g11, g11)));
        g00 *= norm.x;
        g10 *= norm.y;
        g01 *= norm.z;
        g11 *= norm.w;
        float n00 = dot(g00, vec2(fx.x, fy.x));
        float n10 = dot(g10, vec2(fx.y, fy.y));
        float n01 = dot(g01, vec2(fx.z, fy.z));
        float n11 = dot(g11, vec2(fx.w, fy.w));
        vec2 fade_xy = fade(Pf.xy);
        float n_x = mix(n00, n10, fade_xy.x);
        float n_y = mix(n01, n11, fade_xy.x);
        float val = mix(n_x, n_y, fade_xy.y);
        return 2.3 * val;
      }

      // Fractal Brownian Motion
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        for (int i = 0; i < 4; i++) {
          value += amplitude * cnoise(p * frequency);
          frequency *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }

      // Pseudo-random noise for subtle film grain
      float random(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        vec2 uv = vUv;
        float aspect = uResolution.x / uResolution.y;

        // Aspect ratio correction for circles and flow fields
        vec2 correctedUv = uv;
        vec2 correctedMouse = uMouse;
        correctedUv.x *= aspect;
        correctedMouse.x *= aspect;

        float dist = distance(correctedUv, correctedMouse);

        // Fluid displacement ripple around the cursor
        vec2 dir = vec2(0.0);
        if (dist > 0.0) {
          dir = normalize(correctedUv - correctedMouse);
        }
        float influence = smoothstep(0.3, 0.0, dist);

        // Scale coordinates for noise sampling
        vec2 p = uv * 3.5;
        p += dir * influence * 0.45;

        // Domain warping calculations for fluid motion
        vec2 q = vec2(0.0);
        q.x = fbm(p + vec2(0.0, 0.0) + uTime * 0.045);
        q.y = fbm(p + vec2(5.2, 1.3) + uTime * 0.025);

        vec2 r = vec2(0.0);
        r.x = fbm(p + 4.0 * q + vec2(1.7, 9.2) + uTime * 0.065);
        r.y = fbm(p + 4.0 * q + vec2(8.3, 2.8) + uTime * 0.045);

        float f = fbm(p + 4.0 * r);

        // Curated Editorial Theme Colors (Normalized RGB)
        vec3 col_base = vec3(0.051, 0.051, 0.047);       // Obsidian void (#0d0d0c)
        vec3 col_charcoal = vec3(0.086, 0.086, 0.082);   // Warm surface charcoal (#161615)
        vec3 col_rust = vec3(0.878, 0.325, 0.235);       // Burnt Rust-orange (#e0533c)
        vec3 col_amber = vec3(0.961, 0.620, 0.043);      // Warm Amber (#f59e0b)

        // Blend colors based on noise flow fields
        vec3 color = col_base;
        color = mix(color, col_charcoal, clamp(length(q) * 0.8, 0.0, 1.0));
        color = mix(color, col_rust, clamp(f * f * 2.5, 0.0, 1.0));
        color = mix(color, col_amber, clamp(length(r) * 0.35, 0.0, 1.0) * f);

        // Vignette
        float vignette = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
        vignette = clamp(pow(16.0 * vignette, 0.35), 0.0, 1.0);
        color *= mix(0.12, 1.0, vignette);

        // Subtle film grain
        float grain = random(uv + vec2(uTime * 0.01)) * 0.038;
        color += vec3(grain - 0.019);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const planeGeo = new THREE.PlaneGeometry(2, 2);
    const planeMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uResolution: { value: new THREE.Vector2(width, height) },
      },
      depthWrite: false,
      depthTest: false,
    });

    const mesh = new THREE.Mesh(planeGeo, planeMat);
    scene.add(mesh);

    // ---- Event Handlers & Lerping ----
    let mouseX = 0.5;
    let mouseY = 0.5;
    let targetX = 0.5;
    let targetY = 0.5;

    const handleMouseMove = (e) => {
      const rect = currentMount.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      mouseX = x;
      mouseY = y;
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        const rect = currentMount.getBoundingClientRect();
        const x = (e.touches[0].clientX - rect.left) / rect.width;
        const y = 1.0 - (e.touches[0].clientY - rect.top) / rect.height;
        mouseX = x;
        mouseY = y;
      }
    };

    if (!isMobile) {
      window.addEventListener("mousemove", handleMouseMove);
    } else {
      window.addEventListener("touchmove", handleTouchMove, { passive: true });
    }

    const clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();

      // Smooth interpolation for mouse movements
      if (prefersReduced) {
        targetX = 0.5;
        targetY = 0.5;
      } else {
        targetX += (mouseX - targetX) * 0.045;
        targetY += (mouseY - targetY) * 0.045;
      }

      planeMat.uniforms.uTime.value = time;
      planeMat.uniforms.uMouse.value.set(targetX, targetY);

      renderer.render(scene, camera);
    };

    if (prefersReduced) {
      renderer.render(scene, camera);
    } else {
      animate();
    }

    const handleResize = () => {
      if (!mountRef.current) return;
      width = mountRef.current.clientWidth;
      height = mountRef.current.clientHeight;
      renderer.setSize(width, height);
      planeMat.uniforms.uResolution.value.set(width, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      if (!isMobile) {
        window.removeEventListener("mousemove", handleMouseMove);
      } else {
        window.removeEventListener("touchmove", handleTouchMove);
      }
      planeGeo.dispose();
      planeMat.dispose();
      if (currentMount && renderer.domElement.parentNode === currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden"
    />
  );
};

export default HeroCanvas;

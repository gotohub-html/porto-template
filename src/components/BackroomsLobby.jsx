import { useState, useEffect, useRef, useCallback } from "react";
import { ScrollSmoother } from "gsap/all";
import BackroomsWorkspace from "./BackroomsWorkspace";

// Low-res film grain overlay component for performance and retro texture
const GrainOverlay = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationFrameId;

    const resize = () => {
      canvas.width = Math.max(1, Math.floor(window.innerWidth / 3)); // Low res for authentic grain
      canvas.height = Math.max(1, Math.floor(window.innerHeight / 3));
    };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      const w = Math.max(1, Math.floor(canvas.width));
      const h = Math.max(1, Math.floor(canvas.height));
      const imgData = ctx.createImageData(w, h);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const val = Math.random() * 255;
        data[i] = val;     // R
        data[i+1] = val;   // G
        data[i+2] = val;   // B
        data[i+3] = 12;    // Low opacity alpha for subtle grain
      }
      ctx.putImageData(imgData, 0, 0);
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full pointer-events-none z-[9990] mix-blend-overlay opacity-90"
    />
  );
};

// ===== PROCEDURAL AUDIO SYNTHESIZERS (WEB AUDIO API) =====

// Creaking door sound (modulated pitch friction pulses)
const playCreak = (ctx, duration, isOpening) => {
  const now = ctx.currentTime;
  const numClicks = isOpening ? 18 : 11;
  
  for (let i = 0; i < numClicks; i++) {
    const t = now + (isOpening 
      ? Math.pow(i / numClicks, 1.4) * duration 
      : Math.pow(i / numClicks, 1.15) * duration * 0.75
    );
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    const pitch = 85 + Math.random() * 50 + (isOpening ? i * 2.2 : (numClicks - i) * 3);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(pitch, t);
    
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.045, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.02);
  }
};

// Muffled door shutting thud
const playThud = (ctx, delay) => {
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = "sine";
  osc.frequency.setValueAtTime(52, t);
  osc.frequency.exponentialRampToValueAtTime(16, t + 0.18);
  
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.2, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(90, t);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.25);
};

// Detuned sub-bass noclip transition rumble
const playNoclipSound = (ctx) => {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.55, now);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
  master.connect(ctx.destination);
  
  // 1. Heavy noise drop
  const bufferSize = ctx.sampleRate * 1.5;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1900, now);
  filter.frequency.exponentialRampToValueAtTime(110, now + 0.85);
  
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.35, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
  
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(master);
  noise.start(now);
  
  // 2. Detuned drone chord sweeps (Institutional dread blast)
  const oscs = [55, 55.4, 110, 110.8, 165];
  oscs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    osc.type = idx % 2 === 0 ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.25, now + 1.15);
    
    const oscFilter = ctx.createBiquadFilter();
    oscFilter.type = "lowpass";
    oscFilter.frequency.setValueAtTime(260, now);
    oscFilter.frequency.exponentialRampToValueAtTime(45, now + 1.05);
    
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.12, now);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
    
    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(master);
    osc.start(now);
    osc.stop(now + 1.6);
  });
};

// Reality escape ascending whoosh
const playRealityExitSound = (ctx) => {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = "sine";
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(1000, now + 0.45);
  
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.5);
};

const BackroomsLobby = ({ setConceptMode }) => {
  // Main states
  const [showGame, setShowGame] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("INITIALIZING DEEP LINK TO LEVEL 0...");
  
  // Immersive states
  const [muted, setMuted] = useState(false);
  const [timecode, setTimecode] = useState(0);
  const [dotBlink, setDotBlink] = useState(true);
  const [entityVisible, setEntityVisible] = useState(false);
  const [noclipFlash, setNoclipFlash] = useState(false);
  const [glitchedTitle, setGlitchedTitle] = useState("DANI");
  const [activeRoomText, setActiveRoomText] = useState("> HOVER A DOOR TO DISCOVER DETAILS");

  // Wandering anomaly: a plain wooden door that relocates to random spots
  const [doorPos, setDoorPos] = useState({ top: 58, left: 78, rot: -4 });
  const [doorShown, setDoorShown] = useState(false);

  // Audio refs
  const audioCtxRef = useRef(null);
  const humNodeRef = useRef(null);
  const noiseNodeRef = useRef(null);
  const lobbyRef = useRef(null);
  const noclipDoorRef = useRef(null);

  // 5. Procedural sound synthesis (Relocated to top to avoid hoisting ReferenceError)
  const startAudio = useCallback(() => {
    try {
      if (audioCtxRef.current) return;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      
      const master = ctx.createGain();
      master.gain.value = 0.4;
      master.connect(ctx.destination);

      // Low 60Hz hum + 120Hz harmonic
      const humGain = ctx.createGain();
      humGain.gain.value = 0.07;
      humGain.connect(master);

      // 36Hz low-frequency institutional dread drone
      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.14;
      droneGain.connect(master);

      const drone = ctx.createOscillator();
      drone.type = "sine";
      drone.frequency.setValueAtTime(36, ctx.currentTime);
      drone.connect(droneGain);
      drone.start();

      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(60, ctx.currentTime);
      osc1.connect(humGain);

      const osc2 = ctx.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(120, ctx.currentTime);
      const osc2Gain = ctx.createGain();
      osc2Gain.gain.value = 0.4;
      osc2.connect(osc2Gain);
      osc2Gain.connect(humGain);

      osc1.start();
      osc2.start();

      // Filtered noise hiss (leaking fluorescent tube gas)
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(7000, ctx.currentTime);
      filter.Q.setValueAtTime(1.5, ctx.currentTime);

      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.009;

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(master);
      noiseSource.start();

      // Flicker LFO mapping to master volume
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.45;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.05;
      lfo.connect(lfoGain);
      lfoGain.connect(master.gain);
      lfo.start();

      audioCtxRef.current = ctx;
      humNodeRef.current = humGain;
      noiseNodeRef.current = noiseGain;
    } catch (e) {
      console.warn("Audio Context init failed:", e);
    }
  }, []);

  const toggleSound = () => {
    if (muted) {
      startAudio();
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
      setMuted(false);
    } else {
      if (audioCtxRef.current) {
        audioCtxRef.current.suspend();
      }
      setMuted(true);
    }
  };

  // 1. Loading sequence simulation
  useEffect(() => {
    if (!isLoading) return;
    let timer;
    let progress = 0;

    const tick = () => {
      const remaining = 100 - progress;
      const step = Math.min(remaining, Math.floor(Math.random() * 8) + 3);
      progress += step;

      // Simulate a glitch/hang at 84%
      if (progress >= 84 && progress < 90) {
        progress = 84;
        setLoadingText("WARNING: SECTOR DRIFT IN PROTOCOL (0x800424)...");
        // Pause longer
        timer = setTimeout(() => {
          setLoadingText("RE-ESTABLISHING COORD INTEGRITY...");
          progress = 90;
          tick();
        }, 1500);
      } else if (progress >= 100) {
        setLoadProgress(100);
        setLoadingText("Reality breach complete. Welcome to Level 0.");
        timer = setTimeout(() => {
          setIsLoading(false);
        }, 600);
      } else {
        setLoadProgress(progress);
        // Randomly update terminal subtext
        if (progress % 15 === 0) {
          const statusMsgs = [
            "De-compiling spatial boundaries...",
            "Overriding real-space coordinate matrices...",
            "Fluorescent mains synchronizing...",
            "No-clip integrity set at 98.4%..."
          ];
          setLoadingText(statusMsgs[Math.floor(Math.random() * statusMsgs.length)]);
        }
        timer = setTimeout(tick, Math.random() * 120 + 40);
      }
    };

    tick();
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Auto-play ambient hum once loading is finished and audio is unmuted
  useEffect(() => {
    if (!isLoading && !muted && !showGame) {
      startAudio();
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
    }
  }, [isLoading, muted, showGame, startAudio]);

  // 2. VHS Timecode and Blinking Dot
  useEffect(() => {
    if (isLoading || showGame) return;
    const interval = setInterval(() => {
      setTimecode((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLoading, showGame]);

  useEffect(() => {
    if (isLoading || showGame) return;
    const interval = setInterval(() => {
      setDotBlink((prev) => !prev);
    }, 600);
    return () => clearInterval(interval);
  }, [isLoading, showGame]);

  // 3. Glitched Title Effect
  useEffect(() => {
    if (isLoading || showGame) return;
    const chars = "DANI01_X█▒░🤖⚠️";
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.85) {
        // Glitch
        const glitched = "DANI".split("").map((c) => {
          return Math.random() > 0.5 ? chars[Math.floor(Math.random() * chars.length)] : c;
        }).join("");
        setGlitchedTitle(glitched);
        
        // Snap back after 120ms
        setTimeout(() => {
          setGlitchedTitle("DANI");
        }, 120);
      }
    }, 1200);

    return () => clearInterval(glitchInterval);
  }, [isLoading, showGame]);

  // 4. Random Entity Silhouette appearance and Noclip flashes
  useEffect(() => {
    if (isLoading || showGame) return;
    const entityTimer = setInterval(() => {
      if (Math.random() > 0.7) {
        setEntityVisible(true);
        setTimeout(() => setEntityVisible(false), 2000);
      }
    }, 15000);

    const flashTimer = setInterval(() => {
      if (Math.random() > 0.9) {
        setNoclipFlash(true);
        setTimeout(() => setNoclipFlash(false), 80);
      }
    }, 20000);

    return () => {
      clearInterval(entityTimer);
      clearInterval(flashTimer);
    };
  }, [isLoading, showGame]);

  // 4b. The wandering wooden door — fades out, teleports to a new random
  //     position, fades back in. It is the hidden entrance to the maze.
  useEffect(() => {
    if (isLoading || showGame) return;
    let hideTimer;
    const relocate = () => {
      setDoorShown(false);
      hideTimer = setTimeout(() => {
        setDoorPos({
          top: 18 + Math.random() * 54, // 18%–72% (clear of banners)
          left: 8 + Math.random() * 80, // 8%–88%
          rot: (Math.random() - 0.5) * 8,
        });
        setDoorShown(true);
        // a faint flash punches through reality as it materialises
        setNoclipFlash(true);
        setTimeout(() => setNoclipFlash(false), 90);
      }, 700);
    };
    const firstAppear = setTimeout(relocate, 2600);
    const wander = setInterval(relocate, 8000);
    return () => {
      clearTimeout(firstAppear);
      clearTimeout(hideTimer);
      clearInterval(wander);
    };
  }, [isLoading, showGame]);

  // Periodic distant mechanical thuds with feedback echo
  useEffect(() => {
    if (isLoading || showGame || muted) return;

    const triggerDistantThud = () => {
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === "suspended") return;

      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(45 + Math.random() * 10, t);
      osc.frequency.exponentialRampToValueAtTime(18, t + 1.5);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.07, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);

      const delay = ctx.createDelay();
      delay.delayTime.value = 0.35;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.4;

      gain.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(75, t);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      delay.connect(filter);
      filter.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 1.6);
    };

    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        triggerDistantThud();
      }
    }, 14000);

    return () => clearInterval(interval);
  }, [isLoading, showGame, muted]);

  // Audio handlers relocated to top of component to prevent TDZ ReferenceError

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Proximity glitch effect (distance from mouse/touch to noclip door)
  useEffect(() => {
    if (isLoading || showGame) return;

    const handlePointerMove = (x, y) => {
      const door = noclipDoorRef.current;
      const lobby = lobbyRef.current;
      if (!door || !lobby) return;

      const rect = door.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(x - cx, y - cy);

      // Distances: max distance = 550px, min distance = 40px
      const maxDist = 550;
      const minDist = 40;
      let intensity = 0;
      if (dist < maxDist) {
        intensity = 1 - (dist - minDist) / (maxDist - minDist);
        intensity = Math.max(0, Math.min(1, intensity));
      }

      // 1. Visual Glitches (Direct DOM updates)
      if (intensity > 0.02) {
        // Screen Shake
        const shake = intensity * 13;
        const rx = (Math.random() - 0.5) * shake;
        const ry = (Math.random() - 0.5) * shake;
        const rot = (Math.random() - 0.5) * intensity * 1.8;
        
        // CSS Filters
        const contrast = 1 + intensity * 0.45;
        const brightness = 1 - intensity * 0.18;
        const saturate = 1 + intensity * 0.6;
        
        lobby.style.transform = `translate(${rx}px, ${ry}px) rotate(${rot}deg)`;
        lobby.style.filter = `contrast(${contrast}) brightness(${brightness}) saturate(${saturate})`;
      } else {
        lobby.style.transform = "";
        lobby.style.filter = "";
      }

      // 2. Audio Distortion (Hum / Hiss Volume scaling)
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === "running") {
        const hum = humNodeRef.current;
        const noise = noiseNodeRef.current;
        if (hum) {
          hum.gain.setTargetAtTime(0.07 + intensity * 0.28, ctx.currentTime, 0.1);
        }
        if (noise) {
          noise.gain.setTargetAtTime(0.009 + intensity * 0.075, ctx.currentTime, 0.1);
        }
      }
    };

    const onMouseMove = (e) => {
      handlePointerMove(e.clientX, e.clientY);
    };

    const onTouchMove = (e) => {
      const touch = e.touches[0];
      if (touch) {
        handlePointerMove(touch.clientX, touch.clientY);
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchstart", onTouchMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchstart", onTouchMove);
      
      // Reset DOM styles on unmount
      const lobby = lobbyRef.current;
      if (lobby) {
        lobby.style.transform = "";
        lobby.style.filter = "";
      }
      // Reset audio volume on unmount
      const ctx = audioCtxRef.current;
      if (ctx) {
        const hum = humNodeRef.current;
        const noise = noiseNodeRef.current;
        if (hum) hum.gain.setValueAtTime(0.07, ctx.currentTime);
        if (noise) noise.gain.setValueAtTime(0.009, ctx.currentTime);
      }
    };
  }, [isLoading, showGame]);

  // Format VHS Timecode
  const formatTimecode = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // Navigations back to main site
  const handleNavToSection = (sectionId) => {
    setConceptMode("main");
    // Wait for App's mode-change effect to unpause ScrollSmoother, reset to the
    // top and refresh ScrollTrigger before we scroll to the requested section.
    setTimeout(() => {
      const smoother = ScrollSmoother.get();
      if (smoother) {
        smoother.scrollTo(sectionId, true);
      } else {
        document.querySelector(sectionId)?.scrollIntoView({ behavior: "smooth" });
      }
    }, 300);
  };

  // Play creaks & thuds on door hover state changes
  const handleDoorHover = (isOpen) => {
    if (muted) return;
    if (!audioCtxRef.current) {
      startAudio();
    }
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    playCreak(ctx, isOpen ? 0.75 : 0.45, isOpen);
    if (!isOpen) {
      playThud(ctx, 0.4);
    }
  };

  // Navigations back to main site with transition whoosh
  const handleExitToReality = (sectionId) => {
    if (!muted) {
      if (!audioCtxRef.current) startAudio();
      const ctx = audioCtxRef.current;
      if (ctx) {
        if (ctx.state === "suspended") ctx.resume();
        playRealityExitSound(ctx);
      }
    }
    setTimeout(() => {
      handleNavToSection(sectionId);
    }, 450);
  };

  // Click to trigger noclip portal transition sound
  const handleNoclipEnter = () => {
    if (!muted) {
      if (!audioCtxRef.current) startAudio();
      const ctx = audioCtxRef.current;
      if (ctx) {
        if (ctx.state === "suspended") ctx.resume();
        playNoclipSound(ctx);
      }
    }
    // Briefly delay the Three.js game mount to allow noclip sound blast to build
    setTimeout(() => {
      setShowGame(true);
    }, 600);
  };

  // Hover states details
  const doorInfos = {
    about: "> DECRYPTING ROOM 101: ABOUT DANI // FRONT-END ARCHITECT & DESIGN PORTAL",
    work: "> DECRYPTING ROOM 102: COMPLETED PROJECTS // DIGITAL VAULT INDEX",
    contact: "> DECRYPTING ROOM 103: SIGNAL BROADCAST TERMINAL // ESTABLISH CONNECTION",
    noclip: "> WARNING: ROOM 000 // EXTRADIMENSIONAL HOLE // STABILITY CODE: 0.0% // ENTER MAZE"
  };

  // If in easter egg game mode, mount the 3D walkthrough directly
  if (showGame) {
    return (
      <BackroomsWorkspace 
        setConceptMode={(mode) => {
          if (mode === "main") {
            setConceptMode("main");
          }
          setShowGame(false);
        }} 
      />
    );
  }

  return (
    <div ref={lobbyRef} className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#D4C27A] select-none text-[#F5F0D0] font-mono z-40 backrooms-lobby-container">
      {/* Dynamic grain & VHS filters */}
      <GrainOverlay />
      <div className="crt-overlay opacity-80" />
      <div className="vhs-tracking-line" />
      
      {/* Clip-through tear — reality momentarily phases, like the film's no-clips */}
      {noclipFlash && (
        <div className="fixed inset-0 z-[9995] pointer-events-none mix-blend-screen overflow-hidden">
          <div className="absolute inset-x-0 top-[18%] h-12 bg-[#d4c27a] translate-x-3" />
          <div className="absolute inset-x-0 top-[44%] h-20 bg-white/90 -translate-x-5" />
          <div className="absolute inset-x-0 top-[68%] h-8 bg-[#4A90C4]/70 translate-x-6" />
          <div className="absolute inset-0 bg-white/30" />
        </div>
      )}

      {/* THE WANDERING DOOR — plain wooden door that teleports to random spots.
          Hidden entrance to the maze easter egg. */}
      <div
        className="fixed z-30 cursor-pointer group"
        style={{
          top: `${doorPos.top}%`,
          left: `${doorPos.left}%`,
          transform: `translate(-50%, -50%) rotate(${doorPos.rot}deg) scale(${doorShown ? 1 : 0.82})`,
          opacity: doorShown ? 1 : 0,
          filter: doorShown ? "none" : "blur(6px)",
          transition: "opacity 0.6s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1), filter 0.6s ease",
          pointerEvents: doorShown ? "auto" : "none",
        }}
        onMouseEnter={() => {
          setActiveRoomText("> ??? // A DOOR THAT SHOULDN'T BE HERE // IT KEEPS MOVING");
          handleDoorHover(true);
        }}
        onMouseLeave={() => {
          setActiveRoomText("> HOVER A DOOR TO DISCOVER DETAILS");
          handleDoorHover(false);
        }}
        onClick={handleNoclipEnter}
      >
        <div
          ref={noclipDoorRef}
          className="relative w-24 md:w-28 h-44 md:h-52 border-4 border-[#5a4e28] rounded-t-sm shadow-[inset_0_0_12px_rgba(0,0,0,0.95),0_12px_30px_rgba(0,0,0,0.7)] door-frame bg-[#0d0d0c] overflow-visible animate-[vhs-flicker_0.4s_infinite]"
        >
          {/* Darkness / faint pull behind the leaf */}
          <div className="absolute inset-0 bg-[#0d0d0c] rounded-t-sm overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/25 to-stone-300/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute bottom-3 left-0 right-0 text-center font-mono text-[7px] text-amber-500/70 animate-pulse uppercase">[ enter? ]</div>
          </div>

          {/* Wooden leaf (swings ajar on hover) */}
          <div
            className="absolute inset-0 origin-left duration-[900ms] ease-in-out group-hover:[transform:rotateY(-62deg)_scale(0.98)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),3px_0_8px_rgba(0,0,0,0.4)] border-r-2 border-stone-900 rounded-t-sm select-none"
            style={{
              background:
                "linear-gradient(to right, #8a7b40 0%, #a89854 25%, #a89854 75%, #7b6d39 100%)",
            }}
          >
            {/* Recessed panels */}
            <div className="absolute inset-x-3 top-4 bottom-12 flex flex-col justify-between pointer-events-none gap-2 z-10 opacity-70">
              <div className="flex-1 border border-stone-950/70 bg-stone-900/10 shadow-[inset_0_3px_5px_rgba(0,0,0,0.85)] rounded-sm" />
              <div className="h-12 border border-stone-950/70 bg-stone-900/10 shadow-[inset_0_3px_5px_rgba(0,0,0,0.85)] rounded-sm" />
            </div>

            {/* Faded blue tape — a quiet nod to the film */}
            <div className="absolute top-[46%] left-1/2 -translate-x-1/2 w-[88%] h-4 bg-[#4A90C4]/70 -rotate-2 flex items-center justify-center text-[7px] text-white/90 font-mono font-bold uppercase shadow-[0_2px_4px_rgba(0,0,0,0.4)] z-20 border-y border-blue-400/20">
              000
            </div>

            {/* Brass lever handle */}
            <div className="absolute bottom-14 right-1.5 w-3 h-9 bg-gradient-to-r from-yellow-700 via-yellow-500 to-yellow-800 border border-yellow-900 rounded-[2px] shadow-sm z-20">
              <div className="absolute top-1.5 right-1 w-5 h-1.5 bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600 border border-yellow-700 rounded-full origin-right transform group-hover:rotate-12 transition-transform duration-300" />
            </div>

            {/* Brass kick plate */}
            <div className="absolute bottom-0 inset-x-0 h-3.5 bg-gradient-to-r from-yellow-700 via-yellow-500 to-yellow-700 border-t border-yellow-800 rounded-b-sm z-20" />
          </div>
        </div>
      </div>

      {/* 1. LOADING SCREEN */}
      {isLoading ? (
        <div className="fixed inset-0 bg-[#0d0d0c] z-[9999] flex flex-col justify-center items-center px-12 text-[#B5A642]">
          <div className="w-full max-w-xl flex flex-col gap-6">
            <div className="font-mono text-xs md:text-sm flex flex-col gap-2">
              <p className="font-bold text-red-600 tracking-wider">⚠️ REALITY FAILURE: NOCLIP INTERCEPTED</p>
              <p className="text-stone-400 mt-2">SYS_OFFSET: 0x98A1900F</p>
              <p className="text-stone-400 flex items-center flex-wrap gap-x-1.5">
                ANCHOR: 
                <span className="relative inline-block select-none px-1 align-middle">
                  <span className="blur-[1px] text-stone-600 font-mono">PURWAKARTA_GATEWAY</span>
                  <span className="absolute inset-y-0.5 left-0 right-0 z-10 bg-[repeating-linear-gradient(-45deg,#f59e0b,#f59e0b_4px,#0d0d0c_4px,#0d0d0c_8px)] border border-amber-500/20 select-none pointer-events-none transform -skew-y-0.5 rotate-0.5 opacity-90 origin-center" />
                </span>
              </p>
            </div>
            
            <div className="w-full h-4 bg-stone-900 border border-stone-800 p-[2px] rounded relative overflow-hidden">
              <div 
                className="h-full bg-[#B5A642] transition-all duration-300"
                style={{ width: `${loadProgress}%` }}
              />
            </div>

            <div className="flex justify-between items-center font-mono text-[10px]">
              <span className="animate-pulse">{loadingText}</span>
              <span>{loadProgress}%</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* 2. MAIN LOBBY INTERFACE */}
      {/* Vignette effect */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none" 
        style={{
          background: "radial-gradient(circle, transparent 20%, rgba(26, 26, 15, 0.75) 100%)"
        }}
      />

      {/* Top Banner Info */}
      <div className="absolute top-6 left-6 right-6 md:left-12 md:right-12 z-20 flex justify-between items-center text-[10px] sm:text-xs font-mono uppercase tracking-widest text-[#B5A642]">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full bg-red-600 ${dotBlink ? 'opacity-100' : 'opacity-20'}`} />
          <span>REC {formatTimecode(timecode)}</span>
        </div>
        <div>LEVEL 0 // SECTOR-B4</div>
      </div>

      {/* Main Wallpaper Layout with Corridor Perspective */}
      <div className="absolute inset-0 flex flex-col justify-between items-center py-20 px-6 bg-wallpaper-stripes">
        
        {/* Header Name Block */}
        <div className="w-full max-w-xl text-center flex flex-col items-center mt-6 z-20">
          <div className="px-6 py-4 bg-[#1A1A0F]/90 border-2 border-[#B5A642]/40 rounded-sm inline-block shadow-lg">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tighter uppercase text-[#eedaa2]">
              {glitchedTitle}
            </h1>
            <p className="text-[10px] tracking-[0.2em] text-[#B5A642] mt-1 uppercase">
              Lost in Transmission // Portals Index
            </p>
          </div>
        </div>

        {/* 2.5D Corridor Visual Wrapper */}
        <div className="relative w-full max-w-5xl h-[340px] md:h-[420px] flex items-center justify-center z-15 perspective-hallway mt-4">
          
          {/* Corridor depth (vanishing lines) */}
          <div className="absolute inset-0 pointer-events-none opacity-40 bg-hallway-perspective" />

          {/* Random Entity Hint */}
          {entityVisible && (
            <div 
              className="absolute left-1/2 top-[42%] -translate-x-1/2 w-16 h-48 bg-black pointer-events-none opacity-80 blur-sm scale-75 animate-pulse"
              style={{
                clipPath: "polygon(40% 0%, 60% 0%, 75% 20%, 70% 35%, 85% 60%, 55% 100%, 45% 100%, 15% 60%, 30% 35%, 25% 20%)"
              }}
            />
          )}

          {/* DOORS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8 w-full max-w-3xl relative z-20 px-4">
            
            {/* DOOR 1: ABOUT */}
            <div 
              className="group flex flex-col items-center cursor-pointer"
              onMouseEnter={() => {
                setActiveRoomText(doorInfos.about);
                handleDoorHover(true);
              }}
              onMouseLeave={() => {
                setActiveRoomText("> HOVER A DOOR TO DISCOVER DETAILS");
                handleDoorHover(false);
              }}
              onClick={() => handleExitToReality("#about")}
            >
              <div className="relative w-32 md:w-40 h-56 md:h-72 border-4 border-[#7A6A35] rounded-t-sm shadow-[inset_0_0_12px_rgba(0,0,0,0.95),0_10px_25px_rgba(0,0,0,0.6)] door-frame bg-[#0d0d0c] overflow-visible">
                {/* Glow behind the door leaf */}
                <div className="absolute inset-0 bg-[#0d0d0c] rounded-t-sm overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-t from-orange-600/35 to-amber-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute bottom-4 left-0 right-0 text-center font-mono text-[8px] text-amber-500/70 animate-pulse uppercase">[ ABOUT ME ]</div>
                </div>
                
                {/* Door Leaf (swings open) */}
                <div 
                  className="absolute inset-0 origin-left duration-700 ease-in-out group-hover:[transform:rotateY(-68deg)_scale(0.98)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),3px_0_8px_rgba(0,0,0,0.4)] border-r-2 border-stone-900 rounded-t-sm flex flex-col justify-between p-3 select-none"
                  style={{
                    background: "linear-gradient(to right, #928347 0%, #A89854 25%, #A89854 75%, #8A7B40 100%)"
                  }}
                >
                  {/* Recessed Panels */}
                  <div className="absolute inset-x-3 top-5 bottom-16 flex flex-col justify-between pointer-events-none gap-2 z-10 opacity-70">
                    <div className="flex-1 border border-stone-950/70 bg-stone-900/10 shadow-[inset_0_3px_5px_rgba(0,0,0,0.85),0_1px_1px_rgba(255,255,255,0.15)] rounded-sm" />
                    <div className="h-16 border border-stone-950/70 bg-stone-900/10 shadow-[inset_0_3px_5px_rgba(0,0,0,0.85),0_1px_1px_rgba(255,255,255,0.15)] rounded-sm" />
                  </div>

                  {/* Brass Room Number Plaque */}
                  <div className="absolute top-9 left-1/2 -translate-x-1/2 w-14 h-6 bg-gradient-to-r from-yellow-700 via-yellow-400 to-yellow-600 border border-yellow-800 text-stone-950 font-bold font-mono text-[9px] flex flex-col items-center justify-center rounded shadow-[0_2px_4px_rgba(0,0,0,0.6)] uppercase tracking-wider z-20">
                    <div className="text-[7px] leading-none text-stone-950/60 font-black">ROOM</div>
                    <div className="text-[10px] leading-tight font-black -mt-[1px]">101</div>
                  </div>

                  {/* Blue Tape marking */}
                  <div className="absolute top-[48%] left-1/2 -translate-x-1/2 w-[90%] h-6 bg-[#4A90C4]/90 rotate-3 flex items-center justify-center text-[9px] text-white font-mono font-bold uppercase shadow-[0_2px_4px_rgba(0,0,0,0.4)] py-1 border-y border-blue-400/20 z-20">
                    ABOUT
                  </div>

                  {/* Brass Lever Handle and Escutcheon Plate */}
                  <div className="absolute bottom-20 right-2 w-4 h-12 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-700 border border-yellow-800 rounded-[2px] shadow-sm flex flex-col items-center justify-center gap-1 z-20">
                    <div className="absolute top-2 right-1.5 w-7 h-2 bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600 border border-yellow-700 rounded-full shadow-[0_2px_3px_rgba(0,0,0,0.5)] origin-right transform group-hover:rotate-12 transition-transform duration-300" />
                    <div className="w-1.5 h-1.5 rounded-full bg-stone-950 mt-4 border-b border-yellow-300/30" />
                    <div className="w-0.5 h-1.5 bg-stone-950 -mt-0.5 rounded-b-[1px]" />
                  </div>

                  {/* Brass Kick Plate */}
                  <div className="absolute bottom-0 inset-x-0 h-4.5 bg-gradient-to-r from-yellow-700 via-yellow-400 to-yellow-600 border-t border-yellow-800 rounded-b-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] z-20" />
                </div>
              </div>
              <span className="mt-3 text-xs tracking-wider text-[#B5A642] group-hover:text-[#eedaa2] uppercase">
                [ Room 101 ]
              </span>
            </div>

            {/* DOOR 2: PROJECTS */}
            <div 
              className="group flex flex-col items-center cursor-pointer"
              onMouseEnter={() => {
                setActiveRoomText(doorInfos.work);
                handleDoorHover(true);
              }}
              onMouseLeave={() => {
                setActiveRoomText("> HOVER A DOOR TO DISCOVER DETAILS");
                handleDoorHover(false);
              }}
              onClick={() => handleExitToReality("#projects")}
            >
              <div className="relative w-32 md:w-40 h-56 md:h-72 border-4 border-[#7A6A35] rounded-t-sm shadow-[inset_0_0_12px_rgba(0,0,0,0.95),0_10px_25px_rgba(0,0,0,0.6)] door-frame bg-[#0d0d0c] overflow-visible">
                {/* Glow behind the door leaf */}
                <div className="absolute inset-0 bg-[#0d0d0c] rounded-t-sm overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-t from-cyan-600/35 to-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute bottom-4 left-0 right-0 text-center font-mono text-[8px] text-cyan-400/70 animate-pulse uppercase">[ PROJECTS ]</div>
                </div>
                
                {/* Door Leaf (swings open) */}
                <div 
                  className="absolute inset-0 origin-left duration-700 ease-in-out group-hover:[transform:rotateY(-68deg)_scale(0.98)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),3px_0_8px_rgba(0,0,0,0.4)] border-r-2 border-stone-900 rounded-t-sm flex flex-col justify-between p-3 select-none"
                  style={{
                    background: "linear-gradient(to right, #928347 0%, #A89854 25%, #A89854 75%, #8A7B40 100%)"
                  }}
                >
                  {/* Recessed Panels */}
                  <div className="absolute inset-x-3 top-5 bottom-16 flex flex-col justify-between pointer-events-none gap-2 z-10 opacity-70">
                    <div className="flex-1 border border-stone-950/70 bg-stone-900/10 shadow-[inset_0_3px_5px_rgba(0,0,0,0.85),0_1px_1px_rgba(255,255,255,0.15)] rounded-sm" />
                    <div className="h-16 border border-stone-950/70 bg-stone-900/10 shadow-[inset_0_3px_5px_rgba(0,0,0,0.85),0_1px_1px_rgba(255,255,255,0.15)] rounded-sm" />
                  </div>

                  {/* Brass Room Number Plaque */}
                  <div className="absolute top-9 left-1/2 -translate-x-1/2 w-14 h-6 bg-gradient-to-r from-yellow-700 via-yellow-400 to-yellow-600 border border-yellow-800 text-stone-950 font-bold font-mono text-[9px] flex flex-col items-center justify-center rounded shadow-[0_2px_4px_rgba(0,0,0,0.6)] uppercase tracking-wider z-20">
                    <div className="text-[7px] leading-none text-stone-950/60 font-black">ROOM</div>
                    <div className="text-[10px] leading-tight font-black -mt-[1px]">102</div>
                  </div>

                  {/* Blue Tape marking */}
                  <div className="absolute top-[48%] left-1/2 -translate-x-1/2 w-[90%] h-6 bg-[#4A90C4]/90 -rotate-3 flex items-center justify-center text-[9px] text-white font-mono font-bold uppercase shadow-[0_2px_4px_rgba(0,0,0,0.4)] py-1 border-y border-blue-400/20 z-20">
                    WORK
                  </div>

                  {/* Brass Lever Handle and Escutcheon Plate */}
                  <div className="absolute bottom-20 right-2 w-4 h-12 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-700 border border-yellow-800 rounded-[2px] shadow-sm flex flex-col items-center justify-center gap-1 z-20">
                    <div className="absolute top-2 right-1.5 w-7 h-2 bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600 border border-yellow-700 rounded-full shadow-[0_2px_3px_rgba(0,0,0,0.5)] origin-right transform group-hover:rotate-12 transition-transform duration-300" />
                    <div className="w-1.5 h-1.5 rounded-full bg-stone-950 mt-4 border-b border-yellow-300/30" />
                    <div className="w-0.5 h-1.5 bg-stone-950 -mt-0.5 rounded-b-[1px]" />
                  </div>

                  {/* Brass Kick Plate */}
                  <div className="absolute bottom-0 inset-x-0 h-4.5 bg-gradient-to-r from-yellow-700 via-yellow-400 to-yellow-600 border-t border-yellow-800 rounded-b-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] z-20" />
                </div>
              </div>
              <span className="mt-3 text-xs tracking-wider text-[#B5A642] group-hover:text-[#eedaa2] uppercase">
                [ Room 102 ]
              </span>
            </div>

            {/* DOOR 3: CONTACT */}
            <div 
              className="group flex flex-col items-center cursor-pointer"
              onMouseEnter={() => {
                setActiveRoomText(doorInfos.contact);
                handleDoorHover(true);
              }}
              onMouseLeave={() => {
                setActiveRoomText("> HOVER A DOOR TO DISCOVER DETAILS");
                handleDoorHover(false);
              }}
              onClick={() => handleExitToReality("#contact")}
            >
              <div className="relative w-32 md:w-40 h-56 md:h-72 border-4 border-[#7A6A35] rounded-t-sm shadow-[inset_0_0_12px_rgba(0,0,0,0.95),0_10px_25px_rgba(0,0,0,0.6)] door-frame bg-[#0d0d0c] overflow-visible">
                {/* Glow behind the door leaf */}
                <div className="absolute inset-0 bg-[#0d0d0c] rounded-t-sm overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-600/35 to-green-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute bottom-4 left-0 right-0 text-center font-mono text-[8px] text-green-400/70 animate-pulse uppercase">[ SAY HELLO ]</div>
                </div>
                
                {/* Door Leaf (swings open) */}
                <div 
                  className="absolute inset-0 origin-left duration-700 ease-in-out group-hover:[transform:rotateY(-68deg)_scale(0.98)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),3px_0_8px_rgba(0,0,0,0.4)] border-r-2 border-stone-900 rounded-t-sm flex flex-col justify-between p-3 select-none"
                  style={{
                    background: "linear-gradient(to right, #928347 0%, #A89854 25%, #A89854 75%, #8A7B40 100%)"
                  }}
                >
                  {/* Recessed Panels */}
                  <div className="absolute inset-x-3 top-5 bottom-16 flex flex-col justify-between pointer-events-none gap-2 z-10 opacity-70">
                    <div className="flex-1 border border-stone-950/70 bg-stone-900/10 shadow-[inset_0_3px_5px_rgba(0,0,0,0.85),0_1px_1px_rgba(255,255,255,0.15)] rounded-sm" />
                    <div className="h-16 border border-stone-950/70 bg-stone-900/10 shadow-[inset_0_3px_5px_rgba(0,0,0,0.85),0_1px_1px_rgba(255,255,255,0.15)] rounded-sm" />
                  </div>

                  {/* Brass Room Number Plaque */}
                  <div className="absolute top-9 left-1/2 -translate-x-1/2 w-14 h-6 bg-gradient-to-r from-yellow-700 via-yellow-400 to-yellow-600 border border-yellow-800 text-stone-950 font-bold font-mono text-[9px] flex flex-col items-center justify-center rounded shadow-[0_2px_4px_rgba(0,0,0,0.6)] uppercase tracking-wider z-20">
                    <div className="text-[7px] leading-none text-stone-950/60 font-black">ROOM</div>
                    <div className="text-[10px] leading-tight font-black -mt-[1px]">103</div>
                  </div>

                  {/* Blue Tape marking */}
                  <div className="absolute top-[48%] left-1/2 -translate-x-1/2 w-[90%] h-6 bg-[#4A90C4]/90 rotate-2 flex items-center justify-center text-[9px] text-white font-mono font-bold uppercase shadow-[0_2px_4px_rgba(0,0,0,0.4)] py-1 border-y border-blue-400/20 z-20">
                    CONTACT
                  </div>

                  {/* Brass Lever Handle and Escutcheon Plate */}
                  <div className="absolute bottom-20 right-2 w-4 h-12 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-700 border border-yellow-800 rounded-[2px] shadow-sm flex flex-col items-center justify-center gap-1 z-20">
                    <div className="absolute top-2 right-1.5 w-7 h-2 bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600 border border-yellow-700 rounded-full shadow-[0_2px_3px_rgba(0,0,0,0.5)] origin-right transform group-hover:rotate-12 transition-transform duration-300" />
                    <div className="w-1.5 h-1.5 rounded-full bg-stone-950 mt-4 border-b border-yellow-300/30" />
                    <div className="w-0.5 h-1.5 bg-stone-950 -mt-0.5 rounded-b-[1px]" />
                  </div>

                  {/* Brass Kick Plate */}
                  <div className="absolute bottom-0 inset-x-0 h-4.5 bg-gradient-to-r from-yellow-700 via-yellow-400 to-yellow-600 border-t border-yellow-800 rounded-b-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] z-20" />
                </div>
              </div>
              <span className="mt-3 text-xs tracking-wider text-[#B5A642] group-hover:text-[#eedaa2] uppercase">
                [ Room 103 ]
              </span>
            </div>

          </div>
        </div>

        {/* Console / Status Readout Block */}
        <div className="w-full max-w-2xl px-6 py-4 bg-[#1A1A0F]/90 border border-[#B5A642]/20 rounded-sm shadow-md text-center z-20 mt-4 mb-2">
          <p className="font-mono text-xs tracking-wide text-[#eedaa2] select-text">
            {activeRoomText}
          </p>
        </div>

        {/* Footer Actions (Reality exit & Sound controls) */}
        <div className="w-full max-w-xl flex flex-col sm:flex-row justify-center gap-4 sm:gap-8 z-20 text-xs text-[#B5A642]">
          <button 
            onClick={() => handleExitToReality("#about")}
            className="px-4 py-2 border border-[#B5A642]/30 hover:border-[#eedaa2] hover:text-[#eedaa2] hover:bg-[#1A1A0F]/60 transition-all rounded-sm cursor-pointer text-center"
          >
            [ NOCLIP_OVERRIDE.EXE ]
          </button>
          
          <button 
            onClick={toggleSound}
            className={`px-4 py-2 border transition-all rounded-sm cursor-pointer text-center ${
              !muted 
                ? "bg-amber-600/20 text-[#eedaa2] border-amber-500/50 hover:bg-amber-600/30" 
                : "border-[#B5A642]/30 text-[#B5A642] hover:border-[#eedaa2] hover:text-[#eedaa2]"
            }`}
          >
            {muted ? "[ FREQ_HUM_MONITOR: MUTED ]" : "[ FREQ_HUM_MONITOR: ACTIVE ]"}
          </button>
        </div>
      </div>
      
      {/* Warning tape marquee banner at the very bottom */}
      <div className="absolute bottom-0 left-0 w-full bg-[#1a1a0f] border-t border-[#B5A642]/30 py-1.5 z-20 text-[9px] tracking-widest text-[#B5A642] uppercase text-center overflow-hidden whitespace-nowrap">
        <div className="inline-block animate-[ticker_25s_linear_infinite]">
          <span>⚠ WARNING: REALITY COHESION IS UNSTABLE — DO NOT DEVIATE FROM DESIGNATED CORRIDORS ⚠&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          <span>⚠ WARNING: REALITY COHESION IS UNSTABLE — DO NOT DEVIATE FROM DESIGNATED CORRIDORS ⚠&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
        </div>
      </div>
    </div>
  );
};

export default BackroomsLobby;

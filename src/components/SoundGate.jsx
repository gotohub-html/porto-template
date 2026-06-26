import { useState, useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Volume2, VolumeX } from "lucide-react";

/**
 * Entry gate (Pacome Pertant DNA): "enter with / without sound".
 * On choice -> terminal-style 0->100 counter (Armory) -> split-text "DANI"
 * reveal -> fades the whole overlay out and signals the app to start.
 *
 * Ambient audio is generated procedurally with the WebAudio API (no asset
 * file needed) and can be muted at any time via the floating toggle.
 */
const SoundGate = ({ onEnter, conceptMode = "main" }) => {
  const [phase, setPhase] = useState("choice"); // choice -> loading -> done
  const [count, setCount] = useState(0);
  const [muted, setMuted] = useState(true);
  const [showWarning, setShowWarning] = useState(false);

  const overlayRef = useRef(null);
  const counterRef = useRef(null);
  const nameRef = useRef(null);
  const choiceRef = useRef(null);

  // WebAudio refs
  const audioCtxRef = useRef(null);
  const gainRef = useRef(null);
  const audioRef = useRef(null);
  const filterNodeRef = useRef(null);
  const wetGainRef = useRef(null);
  const droneOscsRef = useRef([]);

  const startAmbient = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const now = ctx.currentTime;

      const master = ctx.createGain();
      // Swell to reduced base volume (0.05) instead of the loud 0.14
      master.gain.value = 0;
      master.connect(ctx.destination);

      // Create Audio Element for MP3
      const audio = new Audio("/music/soundgate.mp3");
      audio.loop = true;
      audio.crossOrigin = "anonymous";
      
      const source = ctx.createMediaElementSource(audio);

      // Distancing filter (lowpass)
      const distFilter = ctx.createBiquadFilter();
      distFilter.type = "lowpass";
      distFilter.frequency.value = 20000;
      distFilter.Q.value = 1;

      source.connect(distFilter);

      // gentle reverb-ish tail via feedback delay
      const delay = ctx.createDelay();
      delay.delayTime.value = 0.45;
      const fb = ctx.createGain();
      fb.gain.value = 0.38;
      const wet = ctx.createGain();
      wet.gain.value = 0.25;

      delay.connect(fb);
      fb.connect(delay);
      delay.connect(wet);

      distFilter.connect(master);
      distFilter.connect(delay);
      wet.connect(master);

      // Low-pitched ambient drone (55Hz / 82.4Hz oscillators)
      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.value = 55; // low A1
      const og1 = ctx.createGain();
      og1.gain.value = 0.22;
      osc1.connect(og1);
      og1.connect(distFilter);
      osc1.start();

      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = 82.4; // low E2
      const og2 = ctx.createGain();
      og2.gain.value = 0.12;
      osc2.connect(og2);
      og2.connect(distFilter);
      osc2.start();

      droneOscsRef.current = [osc1, osc2];

      audio.play().catch((err) => console.log("Audio play blocked:", err));

      master.gain.linearRampToValueAtTime(0.06, now + 3.2);

      audioCtxRef.current = ctx;
      gainRef.current = master;
      audioRef.current = audio;
      filterNodeRef.current = distFilter;
      wetGainRef.current = wet;
    } catch (err) {
      console.error("Failed to start audio:", err);
    }
  };

  const handleEnter = (withSound) => {
    if (withSound) {
      setMuted(false);
      startAmbient();
    }
    setPhase("loading");
  };

  const toggleMute = () => {
    const ctx = audioCtxRef.current;
    const audio = audioRef.current;
    if (!ctx) {
      startAmbient();
      setMuted(false);
      return;
    }
    if (muted) {
      ctx.resume?.();
      audio?.play().catch(() => {});
      gainRef.current.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.6);
      setMuted(false);
    } else {
      gainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      setTimeout(() => {
        if (gainRef.current && gainRef.current.gain.value === 0) {
          audio?.pause();
        }
      }, 400);
      setMuted(true);
    }
  };

  // Mute main ambient audio when switching to Backrooms
  useEffect(() => {
    if (!audioCtxRef.current || !gainRef.current) return;
    const ctx = audioCtxRef.current;
    const audio = audioRef.current;
    if (conceptMode === "backrooms") {
      gainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
      setTimeout(() => {
        audio?.pause();
      }, 200);
    } else {
      if (!muted) {
        ctx.resume?.();
        audio?.play().catch(() => {});
        gainRef.current.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.4);
      }
    }
  }, [conceptMode, muted]);

  // Handle scroll-based spatial distancing
  useEffect(() => {
    const handleScroll = () => {
      if (!audioCtxRef.current || !filterNodeRef.current || !gainRef.current || muted || conceptMode === "backrooms") return;

      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;

      // Scroll progress from 0 (top) to 1 (bottom)
      const progress = Math.min(Math.max(scrollTop / docHeight, 0), 1);
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;

      // 1. Roll off high frequencies (lowpass filter sweep)
      const maxFreq = 20000;
      const minFreq = 220; // very muffled/distant at bottom
      const currentFreq = maxFreq * Math.pow(minFreq / maxFreq, progress);
      filterNodeRef.current.frequency.setTargetAtTime(currentFreq, now, 0.1);

      // 2. Reduce dry volume (gets quieter)
      const maxVol = 0.06;
      const minVol = 0.008;
      const currentVol = maxVol - progress * (maxVol - minVol);
      gainRef.current.gain.setTargetAtTime(currentVol, now, 0.1);

      // 3. Increase relative wet reverb ratio
      const minWet = 0.25;
      const maxWet = 0.65;
      const currentWet = minWet + progress * (maxWet - minWet);
      if (wetGainRef.current) {
        wetGainRef.current.gain.setTargetAtTime(currentWet, now, 0.1);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [muted, conceptMode]);

  // Show visual/perf warning pop-up only on mobile or tablet devices
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setShowWarning(true);
    }
  }, []);

  // Counter + reveal sequence once we enter "loading"
  useGSAP(
    () => {
      if (phase !== "loading") return;

      const counterObj = { v: 0 };
      const tl = gsap.timeline();

      tl.to(choiceRef.current, {
        opacity: 0,
        y: -20,
        duration: 0.5,
        ease: "power2.in",
      })
        .to(
          counterObj,
          {
            v: 100,
            duration: 2.2,
            ease: "power2.inOut",
            onUpdate: () => setCount(Math.floor(counterObj.v)),
          },
          "<"
        )
        .to(counterRef.current, {
          opacity: 0,
          duration: 0.4,
          ease: "power2.in",
        })
        .fromTo(
          nameRef.current.querySelectorAll(".gate-char"),
          { yPercent: 120, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            stagger: 0.06,
            duration: 0.8,
            ease: "power4.out",
          },
          "-=0.1"
        )
        .to(nameRef.current, {
          opacity: 0,
          duration: 0.6,
          delay: 0.5,
          ease: "power2.in",
        })
        .to(
          overlayRef.current,
          {
            yPercent: -100,
            duration: 0.9,
            ease: "power4.inOut",
            onStart: () => setPhase("done"),
            onComplete: () => onEnter?.(),
          },
          "-=0.2"
        );
    },
    { dependencies: [phase] }
  );

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (droneOscsRef.current) {
        droneOscsRef.current.forEach((o) => {
          try {
            o.stop();
          } catch { /* already stopped */ }
        });
      }
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.src = "";
        } catch { /* element gone */ }
      }
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch { /* already closed */ }
      }
    };
  }, []);

  return (
    <>
      {/* Persistent mute toggle (stays after gate closes - hidden in Backrooms mode) */}
      {conceptMode === "main" && (
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute ambient sound" : "Mute ambient sound"}
          className="fixed bottom-6 right-6 z-[10000] w-11 h-11 rounded-full flex items-center justify-center border border-white/10 bg-[#161615]/70 backdrop-blur-md text-text-muted hover:text-ember hover:border-ember/40 transition-all duration-300"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      )}

      {phase !== "done" && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[9990] flex flex-col items-center justify-center bg-void overflow-hidden"
        >
          {/* faint grid backdrop */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(224, 83, 60, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(224, 83, 60, 0.15) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          {/* CHOICE */}
          {phase === "choice" && (
            <div
              ref={choiceRef}
              className="relative z-10 flex flex-col items-center gap-10 px-6 text-center"
            >
              <div className="flex flex-col items-center gap-3">
                <span className="font-display text-[10px] uppercase tracking-[0.4em] text-text-muted">
                  Dani — Portfolio
                </span>
                <h1 className="font-display font-bold text-4xl md:text-6xl iridescent-text">
                  NOCLIP DIRECTORY
                </h1>
                <p className="font-sans text-xs md:text-sm text-text-muted max-w-xs">
                  Interactive experience. Bagusan buka pake earphone/audio aktif.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={() => handleEnter(true)}
                  className="group px-8 py-3.5 rounded-full font-display font-semibold text-xs tracking-widest uppercase bg-ember text-void hover:bg-amber hover:text-text-primary transition-colors duration-300 flex items-center gap-2 cursor-pointer"
                >
                  <Volume2 size={14} />
                  Masuk pake audio
                </button>
                <button
                  onClick={() => handleEnter(false)}
                  className="px-8 py-3.5 rounded-full font-display font-semibold text-xs tracking-widest uppercase border border-white/15 text-text-primary hover:border-ember/40 hover:bg-ember/5 transition-all duration-300 flex items-center gap-2 cursor-pointer"
                >
                  <VolumeX size={14} />
                  Masuk tanpa audio
                </button>
              </div>
            </div>
          )}

          {/* LOADING: counter + name */}
          {phase === "loading" && (
            <div className="relative z-10 flex flex-col items-center justify-center">
              <div
                ref={counterRef}
                className="absolute font-display font-bold text-7xl md:text-9xl text-text-primary tabular-nums tracking-tighter flex items-baseline gap-2"
              >
                <span className="text-ember text-2xl md:text-4xl font-mono">
                  //
                </span>
                {String(count).padStart(3, "0")}
              </div>

              <h2
                ref={nameRef}
                className="font-display font-bold text-6xl md:text-8xl uppercase tracking-tighter overflow-hidden flex"
              >
                {"DANI".split("").map((c, i) => (
                  <span
                    key={i}
                    className="gate-char inline-block iridescent-text"
                  >
                    {c}
                  </span>
                ))}
              </h2>
            </div>
          )}
        </div>
      )}

      {/* Visual & Performance Recommendation Popup */}
      {showWarning && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center px-4 bg-void/95 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]">
          <div className="editorial-panel relative z-[10002] w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-white/5 bg-[#161615] flex flex-col gap-6 text-center animate-[modalIntro_0.4s_cubic-bezier(0.16,1,0.3,1)]">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes modalIntro {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
            `}} />
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber/10 border border-amber/20 flex items-center justify-center text-amber text-lg animate-pulse">
                ⚠️
              </div>
              <h2 className="font-display font-bold text-lg text-text-primary uppercase tracking-wider">
                Rekomendasi
              </h2>
              <p className="font-sans text-xs text-text-muted leading-relaxed">
                Biar lancar dan visualnya mantap, mending buka pake laptop atau PC.
              </p>
            </div>
            <button
              onClick={() => setShowWarning(false)}
              className="w-full py-3 rounded bg-ember text-void font-display font-semibold uppercase tracking-wider text-[10px] hover:bg-white hover:text-black transition-colors duration-300 cursor-pointer"
            >
              Oke
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SoundGate;

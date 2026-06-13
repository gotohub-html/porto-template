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
  const oscRefs = useRef([]);

  const startAmbient = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const now = ctx.currentTime;

      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      // gentle reverb-ish tail via a feedback delay (no asset needed)
      const delay = ctx.createDelay();
      delay.delayTime.value = 0.33;
      const fb = ctx.createGain();
      fb.gain.value = 0.32;
      const wet = ctx.createGain();
      wet.gain.value = 0.25;
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(wet);
      wet.connect(master);

      // evolving lowpass shaped by a slow LFO → "breathing" pad
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 520;
      filter.Q.value = 4;
      filter.connect(master);
      filter.connect(delay);

      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.07;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 320;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();

      // Cmin9-ish cinematic pad: detuned layers for width
      const voices = [
        { f: 65.41, type: "sine", g: 0.5, det: 0 },     // C2 sub
        { f: 130.81, type: "triangle", g: 0.22, det: -6 }, // C3
        { f: 155.56, type: "sine", g: 0.18, det: 5 },    // Eb3
        { f: 196.0, type: "sine", g: 0.18, det: -4 },    // G3
        { f: 233.08, type: "triangle", g: 0.12, det: 7 }, // Bb3
        { f: 392.0, type: "sine", g: 0.07, det: 9 },     // G4 shimmer
      ];
      voices.forEach((v) => {
        const osc = ctx.createOscillator();
        osc.type = v.type;
        osc.frequency.value = v.f;
        osc.detune.value = v.det;
        const og = ctx.createGain();
        og.gain.value = v.g;
        osc.connect(og);
        og.connect(filter);
        osc.start();
        oscRefs.current.push(osc);
      });

      // airy noise bed (very soft) for liminal texture
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      const nf = ctx.createBiquadFilter();
      nf.type = "bandpass";
      nf.frequency.value = 1800;
      nf.Q.value = 0.6;
      const ng = ctx.createGain();
      ng.gain.value = 0.012;
      noise.connect(nf);
      nf.connect(ng);
      ng.connect(master);
      noise.start();

      // cinematic entry swell
      master.gain.linearRampToValueAtTime(0.14, now + 3.2);

      audioCtxRef.current = ctx;
      gainRef.current = master;
    } catch {
      /* audio unavailable — silently continue */
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
    if (!ctx) {
      // not started yet -> start it now
      startAmbient();
      setMuted(false);
      return;
    }
    if (muted) {
      ctx.resume?.();
      gainRef.current.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.6);
      setMuted(false);
    } else {
      gainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      setMuted(true);
    }
  };

  // Mute main ambient audio when switching to Backrooms
  useEffect(() => {
    if (!audioCtxRef.current || !gainRef.current) return;
    const ctx = audioCtxRef.current;
    if (conceptMode === "backrooms") {
      gainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
    } else {
      if (!muted) {
        ctx.resume?.();
        gainRef.current.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.4);
      }
    }
  }, [conceptMode, muted]);

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
    const oscillators = oscRefs.current;
    const ctxRef = audioCtxRef;
    return () => {
      oscillators.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* already stopped */
        }
      });
      ctxRef.current?.close?.();
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
                  Pengalaman interaktif. Lebih seru dinikmati dengan suara aktif.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={() => handleEnter(true)}
                  className="group px-8 py-3.5 rounded-full font-display font-semibold text-xs tracking-widest uppercase bg-ember text-void hover:bg-amber hover:text-text-primary transition-colors duration-300 flex items-center gap-2 cursor-pointer"
                >
                  <Volume2 size={14} />
                  Masuk pakai suara
                </button>
                <button
                  onClick={() => handleEnter(false)}
                  className="px-8 py-3.5 rounded-full font-display font-semibold text-xs tracking-widest uppercase border border-white/15 text-text-primary hover:border-ember/40 hover:bg-ember/5 transition-all duration-300 flex items-center gap-2 cursor-pointer"
                >
                  <VolumeX size={14} />
                  Masuk tanpa suara
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
                Rekomendasi Visual
              </h2>
              <p className="font-sans text-xs text-text-muted leading-relaxed">
                Biar dapet pengalaman visual interaktif dan performa paling maksimal, direkomendasikan buat buka website ini pake <span className="text-text-primary font-semibold font-sans">laptop atau PC</span> ya!
              </p>
            </div>
            <button
              onClick={() => setShowWarning(false)}
              className="w-full py-3 rounded bg-ember text-void font-display font-semibold uppercase tracking-wider text-[10px] hover:bg-white hover:text-black transition-colors duration-300 cursor-pointer"
            >
              Oke, Paham
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SoundGate;

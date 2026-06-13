import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";

gsap.registerPlugin(ScrollTrigger);

/**
 * Showreel highlight band (Pacome Pertant DNA): a kinetic interlude between
 * the Hero and About. Dual scrolling marquees, a rotating spiral motif, and
 * a scrub-driven "REEL" wordmark reveal.
 */
const ShowreelSection = () => {
  const sectionRef = useRef(null);
  const spiralRef = useRef(null);

  useGSAP(() => {
    // Marquee rows drift in opposite directions as you scroll through
    gsap.fromTo(
      ".reel-row-a",
      { xPercent: 5 },
      {
        xPercent: -15,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    );
    gsap.fromTo(
      ".reel-row-b",
      { xPercent: -15 },
      {
        xPercent: 5,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    );

    // Spiral scrubs its rotation with scroll
    gsap.to(spiralRef.current, {
      rotation: 220,
      ease: "none",
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });

    // Center stat block fades up
    gsap.fromTo(
      ".reel-center",
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 65%" },
      }
    );
  }, []);

  const big = "SHOWREEL · 2025 · ";
  const small = "MOTION · INTERFACE · INTERACTION · CODE · ";

  return (
    <section
      ref={sectionRef}
      className="relative w-full py-28 md:py-40 overflow-hidden bg-void border-y border-white/5"
    >
      {/* Rotating spiral motif (Pacome) */}
      <div
        ref={spiralRef}
        className="absolute -right-24 top-1/2 -translate-y-1/2 w-[420px] h-[420px] opacity-20 pointer-events-none"
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <linearGradient id="spiralGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#eadeca" />
              <stop offset="50%" stopColor="#d8b4fe" />
              <stop offset="100%" stopColor="#a7f3d0" />
            </linearGradient>
          </defs>
          {[...Array(7)].map((_, i) => (
            <circle
              key={i}
              cx="100"
              cy="100"
              r={14 + i * 12}
              fill="none"
              stroke="url(#spiralGrad)"
              strokeWidth="1"
              strokeDasharray={`${6 + i * 4} ${10 + i * 2}`}
            />
          ))}
        </svg>
      </div>

      {/* Big marquee row A */}
      <div className="reel-row-a w-full whitespace-nowrap select-none pointer-events-none">
        <span className="font-display font-bold uppercase text-[12vw] md:text-[9vw] leading-none tracking-tighter iridescent-text">
          {big.repeat(4)}
        </span>
      </div>

      {/* Center stat / label block */}
      <div className="reel-center relative z-10 my-10 md:my-14 flex flex-col items-center text-center gap-4 px-6">
        <span className="font-display text-[10px] uppercase tracking-[0.4em] text-text-muted">
          — Sorotan Pilihan
        </span>
        <p className="font-sans text-sm md:text-base text-text-muted max-w-xl leading-relaxed">
          Kumpulan cuplikan UI, animasi, sama eksperimen iseng tengah malam.
        </p>
        <div className="flex items-center gap-8 mt-2 font-display">
          <div className="flex flex-col items-center">
            <span className="text-2xl md:text-3xl font-bold iridescent-text">
              30+
            </span>
            <span className="text-[10px] uppercase tracking-wider text-text-muted">
              Repo
            </span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-2xl md:text-3xl font-bold iridescent-text">
              7+
            </span>
            <span className="text-[10px] uppercase tracking-wider text-text-muted">
              Rilisan
            </span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-2xl md:text-3xl font-bold iridescent-text">
              ∞
            </span>
            <span className="text-[10px] uppercase tracking-wider text-text-muted">
              Ide
            </span>
          </div>
        </div>
      </div>

      {/* Small marquee row B */}
      <div className="reel-row-b w-full whitespace-nowrap select-none pointer-events-none">
        <span className="font-display font-medium uppercase text-[5vw] md:text-[3vw] leading-none tracking-[0.1em] text-text-primary/35">
          {small.repeat(4)}
        </span>
      </div>
    </section>
  );
};

export default ShowreelSection;

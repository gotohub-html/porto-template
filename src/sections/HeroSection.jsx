import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollSmoother } from "gsap/all";
import HeroCanvas from "../components/HeroCanvas";

gsap.registerPlugin(ScrollSmoother);

const HeroSection = () => {
  const titleRef = useRef(null);
  const cardRef = useRef(null);
  const scrollIndicatorRef = useRef(null);

  useGSAP(() => {
    const chars = titleRef.current.querySelectorAll(".char-span");
    const subhead = cardRef.current.querySelector(".hero-subhead");
    const details = cardRef.current.querySelector(".hero-details");
    const ctas = cardRef.current.querySelector(".hero-ctas");

    gsap.set(chars, { y: 120, opacity: 0 });
    gsap.set([subhead, details, ctas], { opacity: 0, y: 20 });
    gsap.set(scrollIndicatorRef.current, { opacity: 0, y: 15 });

    // Signature moment: variable-weight sweep. The headline starts hairline-thin
    // and gains weight as the characters rise, then thins back out on scroll.
    const wght = { v: 220 };
    const applyWeight = () => {
      if (titleRef.current)
        titleRef.current.style.fontVariationSettings = `"wght" ${wght.v}`;
    };
    applyWeight();

    // Slight delay so it cascades in after the SoundGate lifts away
    const tl = gsap.timeline({ delay: 0.3 });

    tl.to(chars, {
      y: 0,
      opacity: 1,
      stagger: 0.03,
      duration: 1.0,
      ease: "power4.out",
    })
      .to(
        wght,
        { v: 700, duration: 1.3, ease: "power2.out", onUpdate: applyWeight },
        0
      )
      .to(
        [subhead, details, ctas],
        {
          opacity: 1,
          y: 0,
          stagger: 0.1,
          duration: 0.8,
          ease: "power3.out",
        },
        "-=0.6"
      )
      .to(
        scrollIndicatorRef.current,
        { opacity: 1, y: 0, duration: 1, ease: "power2.out" },
        "-=0.5"
      );

    // Headline weight thins out as you scroll away — keeps the type alive
    const wghtScroll = { v: 700 };
    gsap.to(wghtScroll, {
      scrollTrigger: {
        trigger: "#home",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
      v: 240,
      ease: "none",
      onUpdate: () => {
        if (titleRef.current)
          titleRef.current.style.fontVariationSettings = `"wght" ${wghtScroll.v}`;
      },
    });

    // Parallax background drift
    gsap.to(".hero-parallax-bg", {
      scrollTrigger: {
        trigger: "#home",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
      yPercent: 20,
      ease: "none",
    });

    // Giant marquee drifts opposite for depth
    gsap.to(".hero-marquee", {
      scrollTrigger: {
        trigger: "#home",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
      xPercent: -12,
      ease: "none",
    });

    gsap.fromTo(
      cardRef.current,
      { opacity: 1, yPercent: 0 },
      {
        scrollTrigger: {
          trigger: "#home",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
        yPercent: -15,
        opacity: 0.4,
        ease: "none",
      }
    );
  }, []);

  const handleScrollToWork = (e) => {
    e.preventDefault();
    const smoother = ScrollSmoother.get();
    if (smoother) {
      smoother.scrollTo("#projects", true);
    } else {
      document.querySelector("#projects")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const marqueeText = "WEB DEVELOPER · UI/UX DESIGNER · PURWAKARTA · ";

  return (
    <section
      id="home"
      className="relative w-screen h-screen overflow-hidden flex flex-col justify-center items-center px-6 md:px-12 bg-void"
    >
      {/* Background canvas */}
      <div className="hero-parallax-bg absolute inset-0 z-0">
        <HeroCanvas />
        {/* radial vignette to focus center and blend edges */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, transparent 15%, #0d0d0c 80%)",
          }}
        />
      </div>

      {/* Giant marquee band (Pacome DNA) behind the headline */}
      <div className="hero-marquee absolute top-1/2 left-0 -translate-y-1/2 w-full z-[1] pointer-events-none select-none opacity-[0.05]">
        <div className="marquee-track font-display font-bold uppercase tracking-tighter text-[14vw] leading-none text-text-primary flex items-center whitespace-nowrap gap-x-[1vw]">
          {/* Loop part 1 */}
          <div className="flex items-center gap-x-[1vw]">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="flex items-center gap-x-[1vw]">
                <span>WEB DEVELOPER</span>
                <span>·</span>
                <span>UI/UX DESIGNER</span>
                <span>·</span>
                <span className="relative inline-block px-2 align-middle">
                  <span className="blur-[2px] text-text-primary/10">PURWAKARTA</span>
                  <span className="absolute inset-y-2 left-0 right-0 z-10 bg-[repeating-linear-gradient(-45deg,#f59e0b,#f59e0b_12px,#0d0d0c_12px,#0d0d0c_24px)] border border-amber-500/20 select-none pointer-events-none transform -skew-y-1 rotate-1 origin-center" />
                </span>
                <span>·</span>
              </div>
            ))}
          </div>
          {/* Loop part 2 (exact duplicate for seamless CSS animation marquee looping) */}
          <div className="flex items-center gap-x-[1vw]">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="flex items-center gap-x-[1vw]">
                <span>WEB DEVELOPER</span>
                <span>·</span>
                <span>UI/UX DESIGNER</span>
                <span>·</span>
                <span className="relative inline-block px-2 align-middle">
                  <span className="blur-[2px] text-text-primary/10">PURWAKARTA</span>
                  <span className="absolute inset-y-2 left-0 right-0 z-10 bg-[repeating-linear-gradient(-45deg,#f59e0b,#f59e0b_12px,#0d0d0c_12px,#0d0d0c_24px)] border border-amber-500/20 select-none pointer-events-none transform -skew-y-1 rotate-1 origin-center" />
                </span>
                <span>·</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main floating editorial layout */}
      <div
        ref={cardRef}
        className="relative z-10 w-full max-w-6xl flex flex-col items-start text-left gap-8 md:gap-12"
      >
        <div className="hero-subhead flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-ember glow-pulse" />
          <span className="font-display text-xs uppercase tracking-widest font-semibold text-text-muted">
            Dani &mdash; Portfolio
          </span>
        </div>

        <h1
          ref={titleRef}
          className="font-display font-bold text-[8vw] sm:text-[8.5vw] md:text-[9vw] leading-[0.85] tracking-tighter uppercase flex flex-col w-full gap-2"
        >
          <span className="inline-block overflow-hidden py-3 -my-3">
            {"CREATIVE".split("").map((char, ci) => (
              <span
                key={ci}
                className="char-span inline-block select-none text-text-primary"
              >
                {char}
              </span>
            ))}
          </span>
          <span className="inline-block overflow-hidden py-3 -my-3 md:self-end md:mr-16">
            {"DEVELOPER".split("").map((char, ci) => (
              <span
                key={ci}
                className="char-span inline-block select-none iridescent-text"
              >
                {char}
              </span>
            ))}
          </span>
        </h1>

        <div className="hero-details grid grid-cols-1 md:grid-cols-12 gap-8 w-full items-end mt-4 border-t border-white/5 pt-8">
          <div className="md:col-span-6">
            <p className="font-sans text-sm sm:text-base text-text-muted leading-relaxed max-w-xl">
              Developer &amp; designer otodidak asal Indonesia yang bikin website interaktif
              dan fungsional. Gabungin estetika visual dengan performa kode yang optimal.
            </p>
          </div>
          <div className="md:col-span-3 flex flex-col gap-1 text-text-muted font-display text-xs uppercase tracking-wider font-semibold md:pl-8">
            <span className="text-text-primary/70">Ketersediaan</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber glow-pulse" />
              Lagi mager tapi ya mau-mau aja
            </span>
            <span className="normal-case tracking-normal">Sebenarnya pengen ambil kerjaan tapi belum siap wkwk</span>
          </div>
          <div className="hero-ctas md:col-span-3 flex flex-col sm:flex-row md:flex-col gap-4 justify-end md:items-end w-full">
            <a
              href="#projects"
              onClick={handleScrollToWork}
              className="focus-ring w-full md:w-auto text-center px-8 py-3.5 rounded-full font-display font-semibold text-xs tracking-widest uppercase bg-ember text-void hover:bg-amber hover:text-text-primary transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            >
              Lihat Project
            </a>
            <a
              href="https://github.com/danixbo"
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring w-full md:w-auto text-center px-8 py-3.5 rounded-full font-display font-semibold text-xs tracking-widest uppercase border border-white/10 text-text-primary hover:border-ember hover:bg-ember/5 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              GitHub &rarr;
            </a>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        ref={scrollIndicatorRef}
        className="absolute bottom-8 z-10 flex items-center gap-3"
      >
        <span className="text-[10px] uppercase font-display font-medium tracking-widest text-text-muted">
          Scroll ke bawah
        </span>
        <div className="w-12 h-px bg-white/10 relative overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full w-1/3 bg-ember"
            style={{ animation: "scrollLine 2s linear infinite" }}
          />
        </div>
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes scrollLine { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`,
          }}
        />
      </div>
    </section>
  );
};

export default HeroSection;

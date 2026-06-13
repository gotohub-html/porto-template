import { useRef } from "react";
import gsap from "gsap";
import { ScrollSmoother } from "gsap/all";

gsap.registerPlugin(ScrollSmoother);

const FooterSection = () => {
  const containerRef = useRef(null);

  const triggerConfetti = (e) => {
    // Console log Easter egg
    console.log(
      "%c🌌 DANI // PORTFOLIO — node link established. Purwakarta coordinates mapped.",
      "color: #eadeca; font-weight: bold; font-size: 14px;"
    );

    const rect = e.target.getBoundingClientRect();
    const clickX = e.clientX || (rect.left + rect.width / 2);
    const clickY = e.clientY || (rect.top + rect.height / 2);

    const colors = ["#eadeca", "#d8b4fe", "#a7f3d0", "#f3f3f0"];
    const count = 35;

    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "fixed pointer-events-none z-[9999] rounded-full";
      
      const size = gsap.utils.random(4, 9);
      const color = gsap.utils.random(colors);
      
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.backgroundColor = color;
      p.style.left = `${clickX}px`;
      p.style.top = `${clickY}px`;
      p.style.border = `1px solid rgba(255,255,255,0.05)`;

      document.body.appendChild(p);

      const angle = gsap.utils.random(0, Math.PI * 2);
      const velocity = gsap.utils.random(80, 250);
      const targetX = Math.cos(angle) * velocity;
      const targetY = Math.sin(angle) * velocity;

      gsap.to(p, {
        x: targetX,
        y: targetY - gsap.utils.random(30, 100),
        opacity: 0,
        scale: 0.1,
        rotation: gsap.utils.random(-180, 180),
        duration: gsap.utils.random(0.8, 1.5),
        ease: "power3.out",
        onComplete: () => {
          p.remove();
        },
      });
    }
  };

  return (
    <footer
      ref={containerRef}
      className="relative w-full py-12 px-6 md:px-12 bg-void border-t border-white/5 z-10 overflow-hidden"
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Left Side */}
        <div className="font-sans text-xs text-text-muted text-center md:text-left">
          <p>
            Dibuat oleh Dani &middot;{" "}
            <span
              onClick={triggerConfetti}
              className="text-ember cursor-pointer hover:text-white transition-colors duration-300 font-semibold select-none inline-block px-1"
              title="Aktifkan detail node"
            >
              2025
            </span>{" "}
            &middot;{" "}
            <span className="censor-reveal relative inline-block px-1.5 cursor-none group select-none">
              <span className="blur-sm group-hover:blur-none transition-all duration-300 text-text-muted group-hover:text-text-primary">
                Purwakarta
              </span>
              <span className="absolute inset-y-0.5 left-0 right-0 z-10 bg-[repeating-linear-gradient(-45deg,#f59e0b,#f59e0b_5px,#0d0d0c_5px,#0d0d0c_10px)] border border-amber-500/20 select-none pointer-events-none transform -skew-y-0.5 rotate-0.5 opacity-100 group-hover:opacity-0 group-hover:scale-y-0 transition-all duration-300 origin-center" />
            </span>
            , Indonesia
          </p>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-6 font-display text-[10px] text-text-muted uppercase tracking-wider font-semibold">
          <a
            href="https://github.com/danixbo"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors duration-300"
          >
            GitHub
          </a>
          <span>&middot;</span>
          <a
            href="https://guns.lol/noblondzzz"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors duration-300"
          >
            Guns.lol
          </a>
          <span>&middot;</span>
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              ScrollSmoother.get()?.scrollTo("#home", true);
            }}
            className="hover:text-text-primary transition-colors duration-300"
          >
            Ke Atas
          </a>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;

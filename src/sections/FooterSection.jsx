import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollSmoother } from "gsap/all";
import { useLanguage } from "../context/LanguageContext";

gsap.registerPlugin(ScrollSmoother);

const FooterSection = () => {
  const containerRef = useRef(null);
  const { language } = useLanguage();
  const [showA11y, setShowA11y] = useState(false);

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
            {language === 'id' ? 'Dibuat oleh Dani' : 'Built by Dani'} &middot;{" "}
            <span
              onClick={triggerConfetti}
              className="text-ember cursor-pointer hover:text-white transition-colors duration-300 font-semibold select-none inline-block px-1"
              title={language === 'id' ? 'Aktifkan detail node' : 'Activate node details'}
            >
              2026
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
        <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 font-display text-[10px] text-text-muted uppercase tracking-wider font-semibold">
          <button
            onClick={() => setShowA11y(true)}
            className="hover:text-text-primary transition-colors duration-300 focus-ring"
          >
            {language === 'id' ? 'Aksesibilitas' : 'Accessibility'}
          </button>
          <span>&middot;</span>
          <a
            href="https://github.com/danixbo"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors duration-300 focus-ring"
          >
            GitHub
          </a>
          <span>&middot;</span>
          <a
            href="https://guns.lol/noblondzzz"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors duration-300 focus-ring"
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
            className="hover:text-text-primary transition-colors duration-300 focus-ring"
          >
            {language === 'id' ? 'Ke Atas' : 'Back to Top'}
          </a>
        </div>
      </div>

      {/* Accessibility Modal */}
      {showA11y && (
        <div className="fixed inset-0 z-[1000] flex justify-center items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowA11y(false)}>
          <div 
            className="bg-[#161615] border border-white/10 rounded-2xl p-8 max-w-lg w-full shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display font-bold text-2xl text-text-primary mb-4">
              {language === 'id' ? 'Komitmen Aksesibilitas' : 'Accessibility Commitment'}
            </h3>
            <div className="font-sans text-sm text-text-muted flex flex-col gap-3">
              <p>
                {language === 'id' 
                  ? 'Gua berusaha bikin web yang bisa diakses sama siapa aja. Portfolio ini udah nerapin:' 
                  : 'I strive to build an accessible web for everyone. This portfolio implements:'}
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{language === 'id' ? 'Dukungan navigasi keyboard (focus rings)' : 'Keyboard navigation support (focus rings)'}</li>
                <li>{language === 'id' ? 'Kontras warna yang aman' : 'Safe color contrast'}</li>
                <li>{language === 'id' ? 'Pengaturan prefers-reduced-motion untuk animasi' : 'Respects prefers-reduced-motion for animations'}</li>
                <li>{language === 'id' ? 'Aria-labels untuk icon dan link' : 'Aria-labels for icons and links'}</li>
              </ul>
              <p className="mt-2 text-xs opacity-70">
                {language === 'id' 
                  ? '*Kecuali mode Backrooms yang emang didesain susah dan nyeremin.' 
                  : '*Except the Backrooms mode, which is intentionally designed to be disorienting.'}
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShowA11y(false)}
                className="px-6 py-2 rounded-lg bg-ember text-void font-display font-semibold uppercase text-xs tracking-widest hover:bg-amber hover:text-black transition-colors focus-ring"
              >
                {language === 'id' ? 'Tutup' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};

export default FooterSection;

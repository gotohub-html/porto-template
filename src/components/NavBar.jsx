import { useState, useEffect } from "react";
import gsap from "gsap";
import { useLanguage } from "../context/LanguageContext";
import { ScrollSmoother } from "gsap/all";

gsap.registerPlugin(ScrollSmoother);

const NavBar = ({ conceptMode = "main", setConceptMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { language, toggleLanguage } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    setIsOpen(false);
    const smoother = ScrollSmoother.get();
    if (smoother) {
      smoother.scrollTo(targetId, true);
    } else {
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const isBackrooms = conceptMode === "backrooms";

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 md:px-12 px-6 py-4 flex justify-between items-center ${
        isBackrooms
          ? "bg-[#eedaa2]/90 backdrop-blur-md border-b-2 border-[#808080] py-3 text-black font-mono shadow-[0_4px_10px_rgba(0,0,0,0.15)]"
          : scrolled
          ? "bg-void/85 backdrop-blur-md border-b border-white/5 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
          : "bg-transparent"
      }`}
    >
      {/* Logo */}
      <a
        href="#home"
        onClick={(e) => !isBackrooms && handleNavClick(e, "#home")}
        className="font-display font-bold text-lg md:text-xl tracking-wider text-text-primary flex items-center gap-1.5"
      >
        {isBackrooms ? (
          <span className="text-black font-mono text-base tracking-tighter">
            C:\USER\DANI&gt;_
          </span>
        ) : (
          <>
            <span className="iridescent-text">DANI</span>
            <span className="text-text-muted font-normal font-sans text-xs">/ DEV</span>
          </>
        )}
      </a>

      {/* Desktop Navigation Links */}
      <div className="hidden md:flex items-center gap-10">
        {!isBackrooms && (
          <>
            <a
              href="#about"
              onClick={(e) => handleNavClick(e, "#about")}
              className="font-sans text-xs uppercase tracking-widest font-semibold text-text-muted hover:text-text-primary transition-colors draw-underline weight-hover focus-ring"
            >
              {language === 'id' ? 'Tentang' : 'About'}
            </a>
            <a
              href="#projects"
              onClick={(e) => handleNavClick(e, "#projects")}
              className="font-sans text-xs uppercase tracking-widest font-semibold text-text-muted hover:text-text-primary transition-colors draw-underline weight-hover focus-ring"
            >
              {language === 'id' ? 'Project' : 'Projects'}
            </a>
            <a
              href="#vault"
              onClick={(e) => handleNavClick(e, "#vault")}
              className="font-sans text-xs uppercase tracking-widest font-semibold text-text-muted hover:text-text-primary transition-colors draw-underline weight-hover focus-ring"
            >
              {language === 'id' ? 'Arsip' : 'Vault'}
            </a>
            <a
              href="#contact"
              onClick={(e) => handleNavClick(e, "#contact")}
              className="font-sans text-xs uppercase tracking-widest font-semibold text-text-muted hover:text-text-primary transition-colors draw-underline weight-hover focus-ring"
            >
              {language === 'id' ? 'Kontak' : 'Contact'}
            </a>
            <button
              onClick={toggleLanguage}
              className="font-sans text-xs uppercase tracking-widest font-bold text-text-muted hover:text-text-primary transition-colors focus-ring px-2 py-1 rounded bg-white/5"
            >
              {language === 'id' ? 'ID' : 'EN'}
            </button>
          </>
        )}

        {/* Concept Toggle Button */}
        <button
          onClick={() => setConceptMode(isBackrooms ? "main" : "backrooms")}
          className={`focus-ring font-mono text-xs px-3.5 py-1.5 rounded transition-all duration-300 cursor-pointer ${
            isBackrooms
              ? "bg-red-600 text-white font-bold border-2 border-red-800 hover:bg-black hover:text-red-500 win95-border win95-button"
              : "bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500 hover:text-void hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]"
          }`}
        >
          {isBackrooms ? "[ BALIK KE REALITAS ]" : "[ BACK2ROOM ]"}
        </button>
      </div>

      {/* Mobile Actions Container */}
      <div className="flex md:hidden items-center gap-4">
        {/* Concept Toggle Button Mobile */}
        <button
          onClick={() => setConceptMode(isBackrooms ? "main" : "backrooms")}
          className={`focus-ring font-mono text-[10px] px-2.5 py-1 rounded transition-all duration-300 cursor-pointer ${
            isBackrooms
              ? "bg-red-600 text-white font-bold border-2 border-red-800 win95-border win95-button"
              : "bg-amber-500/10 text-amber-500 border border-amber-500/30"
          }`}
        >
          {isBackrooms ? "[ KELUAR ]" : "[ BACK2ROOM ]"}
        </button>

        {/* Mobile Menu Button (Only shown in main mode) */}
        {!isBackrooms && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex flex-col justify-center items-center w-8 h-8 gap-1.5 focus-ring"
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            <span
              className={`h-px w-5 bg-text-primary transition-all duration-300 ${
                isOpen ? "rotate-45 translate-y-1.5" : ""
              }`}
            ></span>
            <span
              className={`h-px w-5 bg-text-primary transition-all duration-300 ${
                isOpen ? "opacity-0" : ""
              }`}
            ></span>
            <span
              className={`h-px w-5 bg-text-primary transition-all duration-300 ${
                isOpen ? "-rotate-45 -translate-y-1.5" : ""
              }`}
            ></span>
          </button>
        )}
      </div>

      {/* Mobile Drawer (Only for main mode) */}
      {!isBackrooms && (
        <div
          className={`md:hidden fixed top-0 left-0 w-full h-screen bg-void/98 backdrop-blur-xl flex flex-col justify-center items-center gap-8 z-40 transition-transform duration-500 ease-in-out ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <a
            href="#about"
            onClick={(e) => handleNavClick(e, "#about")}
            className="font-display text-xl uppercase tracking-widest font-bold text-text-primary hover:text-ember transition-colors focus-ring"
          >
            {language === 'id' ? 'Tentang' : 'About'}
          </a>
          <a
            href="#projects"
            onClick={(e) => handleNavClick(e, "#projects")}
            className="font-display text-xl uppercase tracking-widest font-bold text-text-primary hover:text-ember transition-colors focus-ring"
          >
            {language === 'id' ? 'Project' : 'Projects'}
          </a>
          <a
            href="#vault"
            onClick={(e) => handleNavClick(e, "#vault")}
            className="font-display text-xl uppercase tracking-widest font-bold text-text-primary hover:text-ember transition-colors focus-ring"
          >
            {language === 'id' ? 'Arsip' : 'Vault'}
          </a>
          <a
            href="#contact"
            onClick={(e) => handleNavClick(e, "#contact")}
            className="font-display text-xl uppercase tracking-widest font-bold text-text-primary hover:text-ember transition-colors focus-ring"
          >
            {language === 'id' ? 'Kontak' : 'Contact'}
          </a>
          <button
            onClick={() => { toggleLanguage(); setIsOpen(false); }}
            className="font-display text-xl uppercase tracking-widest font-bold text-amber-500 hover:text-amber-400 transition-colors focus-ring mt-4"
          >
            {language === 'id' ? 'Switch to English' : 'Ganti Bahasa'}
          </button>
        </div>
      )}
    </nav>
  );
};

export default NavBar;
